"""IA UC-04 / RF-33..36 — Vercel AI Gateway (meta/muse-spark-1.2-contributor) function calling. Regras 5 (soft delete), 9 (opcional), sem pré-validação MVP."""
from __future__ import annotations

import json
import logging
import re
from datetime import datetime, timedelta, timezone
from typing import Any

from sqlalchemy.orm import Session

from app.core.config import settings
from app.models.course import Course
from app.models.enums import ItemStatus
from app.models.item import Item
from app.models.item_type import ItemType
from app.schemas.item import ItemCreate, ItemUpdate
from app.services import item_service

log = logging.getLogger(__name__)

SYSTEM_PROMPT = """Você é o assistente do College Management App (single-user).
Hierarquia: Período -> Cadeira -> Item. Ação executada direto, sem confirmação (MVP).
Regras: Cronograma é view agregadora. Se sem confiança p/ cadeira/item, NÃO chame função — responda pedindo esclarecimento.
Datas: sempre retorne due_date/from_date/to_date em ISO-8601 UTC (ex: 2026-08-27T00:00:00Z). Resolva datas relativas ("hoje", "amanhã", "próxima segunda", "27/08") para data absoluta usando Hoje como referência.
Hoje é {today} (UTC).
Responda PT-BR quando não chamar função.
Cadeiras: {courses}
Tipos: {item_types}
Itens ativos recentes (id, título, cadeira, data, tipo): {items}
"""

# OpenAI-compatible tool definitions for Vercel AI Gateway
TOOLS = [
    {
        "type": "function",
        "function": {
            "name": "criar_item",
            "description": "RF-33 — cria um item (prova, trabalho, deadline, etc). Use quando o usuário quer registrar algo novo.",
            "parameters": {
                "type": "object",
                "properties": {
                    "title": {"type": "string", "description": "Título do item"},
                    "course_id": {"type": "integer", "description": "ID da cadeira"},
                    "item_type_id": {"type": "integer", "description": "ID do tipo de item"},
                    "due_date": {"type": "string", "description": "Data ISO-8601 UTC ou null se sem data"},
                    "parent_id": {"type": "integer", "description": "ID do item pai para sub-item"},
                },
                "required": ["title", "course_id", "item_type_id"],
            },
        },
    },
    {
        "type": "function",
        "function": {
            "name": "editar_item",
            "description": "RF-34 — edita um item existente (título, tipo, data, parent).",
            "parameters": {
                "type": "object",
                "properties": {
                    "item_id": {"type": "integer", "description": "ID do item a editar"},
                    "title": {"type": "string"},
                    "item_type_id": {"type": "integer"},
                    "due_date": {"type": "string", "description": "Nova data ISO-8601 ou null para remover"},
                    "parent_id": {"type": "integer", "description": "Novo parent_id ou null para topo"},
                },
                "required": ["item_id"],
            },
        },
    },
    {
        "type": "function",
        "function": {
            "name": "excluir_itens",
            "description": "RF-35 — soft delete (lixeira). Pode receber lista de IDs ou filtro por cadeira/intervalo de datas.",
            "parameters": {
                "type": "object",
                "properties": {
                    "item_ids": {"type": "array", "items": {"type": "integer"}, "description": "IDs explícitos"},
                    "course_id": {"type": "integer"},
                    "from_date": {"type": "string", "description": "ISO-8601 início intervalo"},
                    "to_date": {"type": "string", "description": "ISO-8601 fim intervalo"},
                },
                "required": [],
            },
        },
    },
]

MODEL = "meta/muse-spark-1.2-contributor"
# aliases mantidos para compatibilidade com código que importava as constantes antigas
PRIMARY_MODEL = MODEL
FALLBACK_MODEL = MODEL
VERCEL_AI_GATEWAY_URL = "https://ai-gateway.vercel.sh/v1/chat/completions"

# ---------- context ----------

def _context(db: Session) -> dict:
    courses = db.query(Course).all()
    c_list = [{"id": c.id, "name": c.name, "period_id": c.period_id} for c in courses]
    types = db.query(ItemType).all()
    t_list = [{"id": t.id, "name": t.name} for t in types]
    items = (
        db.query(Item)
        .filter(Item.status == ItemStatus.ACTIVE)
        .order_by(Item.created_at.desc())
        .limit(60)
        .all()
    )
    i_list = [
        {
            "id": i.id,
            "title": i.title,
            "course_id": i.course_id,
            "due_date": i.due_date.isoformat() if i.due_date else None,
            "type_id": i.item_type_id,
        }
        for i in items
    ]
    return {"courses": c_list, "item_types": t_list, "items": i_list}


# ---------- robust date parsing (PT-BR) ----------

_PT_MONTHS = {
    "janeiro": 1,
    "fevereiro": 2,
    "março": 3,
    "marco": 3,
    "abril": 4,
    "maio": 5,
    "junho": 6,
    "julho": 7,
    "agosto": 8,
    "setembro": 9,
    "outubro": 10,
    "novembro": 11,
    "dezembro": 12,
}


_WEEKDAYS_PT = {
    "segunda": 0,
    "terça": 1,
    "terca": 1,
    "quarta": 2,
    "quinta": 3,
    "sexta": 4,
    "sábado": 5,
    "sabado": 5,
    "domingo": 6,
}


def _parse_dt(s: str | None, *, now: datetime | None = None) -> datetime | None:
    """Parser tolerante para datas vindas da IA ou fallback manual.

    Suporta:
    - ISO-8601 (2026-08-27T00:00:00Z)
    - dd/mm/yyyy, dd-mm-yyyy, dd.mm.yyyy, dd/mm/yy
    - dd/mm (sem ano → infere ano atual/próximo)
    - '27 de agosto de 2026' / '27 de agosto'
    - relativos: hoje, amanhã, depois de amanhã, próxima segunda, etc.
    Retorna datetime com tzinfo=UTC sempre em 00:00 UTC (ou hora original se ISO com hora).
    """
    if s is None:
        return None
    if isinstance(s, str) and s.strip().lower() in ("", "null", "none", "nil"):
        return None
    s = str(s).strip()
    if not s:
        return None

    now = now or datetime.now(timezone.utc)
    today_midnight = now.replace(hour=0, minute=0, second=0, microsecond=0)
    low = s.lower().strip()

    # — relativos simples —
    if low in ("hoje", "today"):
        return today_midnight
    if low in ("amanhã", "amanha", "tomorrow"):
        return today_midnight + timedelta(days=1)
    if low in ("depois de amanhã", "depois de amanha", "after tomorrow"):
        return today_midnight + timedelta(days=2)

    # "próxima segunda" / "segunda" → próximo dia da semana
    for name, wd in _WEEKDAYS_PT.items():
        if name in low:
            # encontra próximo wd (se hoje for o mesmo wd, pega próxima semana)
            days_ahead = (wd - today_midnight.weekday()) % 7
            if days_ahead == 0:
                days_ahead = 7
            # se disse "próxima", e days_ahead já é próxima ocorrência, mantém;
            # se já passou longe, não há segunda ocorrência — mantém simples.
            return today_midnight + timedelta(days=days_ahead)

    # "27 de agosto de 2026" ou "27 de agosto"
    m = re.match(r"(\d{1,2})\s+de\s+(\w+)(?:\s+de\s+(\d{4}))?", low)
    if m:
        try:
            day = int(m.group(1))
            mon_name = m.group(2).lower()
            mon = _PT_MONTHS.get(mon_name)
            if mon:
                year = int(m.group(3)) if m.group(3) else today_midnight.year
                dt = datetime(year, mon, day, tzinfo=timezone.utc)
                # se sem ano e data já passou, assume próximo ano
                if not m.group(3) and dt < today_midnight:
                    dt = dt.replace(year=year + 1)
                return dt
        except Exception:
            pass

    # ISO-8601 tentativa direta primeiro
    # IA deve mandar ISO, então tente antes dos formatos BR
    try:
        # aceita "2026-08-27" sem hora
        if re.match(r"^\d{4}-\d{2}-\d{2}$", s):
            return datetime.strptime(s, "%Y-%m-%d").replace(tzinfo=timezone.utc)
        parsed = datetime.fromisoformat(s.replace("Z", "+00:00"))
        if parsed.tzinfo is None:
            parsed = parsed.replace(tzinfo=timezone.utc)
        return parsed.astimezone(timezone.utc)
    except Exception:
        pass

    # dd/mm/yyyy com separadores variados (inclui yy)
    for fmt in ("%d/%m/%Y", "%d-%m-%Y", "%d.%m.%Y", "%d/%m/%y", "%d-%m-%y", "%d.%m.%y"):
        try:
            dt = datetime.strptime(s, fmt).replace(tzinfo=timezone.utc)
            # %y vira 20yy automaticamente — corrige para 2000+
            if dt.year < 100:
                dt = dt.replace(year=2000 + dt.year)
            return dt
        except Exception:
            continue

    # dd/mm sem ano (ex: "27/08", "27-08")
    m2 = re.match(r"^(\d{1,2})[/\-.](\d{1,2})$", s)
    if m2:
        try:
            day, mon = int(m2.group(1)), int(m2.group(2))
            dt = datetime(today_midnight.year, mon, day, tzinfo=timezone.utc)
            if dt < today_midnight:
                dt = dt.replace(year=dt.year + 1)
            return dt
        except Exception:
            pass

    # dd/mm com texto em volta: "dia 27/08/2026" → extrai
    m3 = re.search(r"(\d{1,2})[/\-.](\d{1,2})[/\-.](\d{2,4})", s)
    if m3:
        try:
            d, mo, y = m3.group(1), m3.group(2), m3.group(3)
            # normaliza
            cand = f"{d}/{mo}/{y}"
            for fmt in ("%d/%m/%Y", "%d/%m/%y"):
                try:
                    dt = datetime.strptime(cand, fmt).replace(tzinfo=timezone.utc)
                    if dt.year < 100:
                        dt = dt.replace(year=2000 + dt.year)
                    return dt
                except Exception:
                    continue
        except Exception:
            pass

    # último fallback: tenta dateutil se instalado (opcional)
    try:
        from dateutil import parser as _du  # type: ignore

        dt = _du.parse(s, dayfirst=True)
        if dt.tzinfo is None:
            dt = dt.replace(tzinfo=timezone.utc)
        return dt.astimezone(timezone.utc)
    except Exception:
        pass

    return None


def _soft_delete(db: Session, item: Item):
    item.status = ItemStatus.TRASH
    item.deleted_at = datetime.now(timezone.utc)
    # cascata soft delete nos filhos ativos para consistência de lixeira
    for child in item.children:
        if child.status == ItemStatus.ACTIVE:
            _soft_delete(db, child)
    db.add(item)


def _call_gemini(text: str, ctx: dict):
    """Chama o Vercel AI Gateway (mantido nome _call_gemini para compat com mocks nos testes).

    Usa o modelo meta/muse-spark-1.2-contributor via endpoint OpenAI-compatível
    https://ai-gateway.vercel.sh/v1/chat/completions com Bearer VERCEL_AI_GATEWAY_API_KEY.
    Retorna o JSON da resposta (dict com choices) ou None em falha/indisponível.
    """
    api_key = getattr(settings, "VERCEL_AI_GATEWAY_API_KEY", "") or getattr(settings, "GEMINI_API_KEY", "")
    if not api_key:
        log.warning("VERCEL_AI_GATEWAY_API_KEY vazio — IA indisponível")
        return None
    try:
        import httpx

        today = datetime.now(timezone.utc).isoformat()
        prompt = SYSTEM_PROMPT.format(
            today=today, courses=ctx["courses"], item_types=ctx["item_types"], items=ctx["items"]
        )
        payload = {
            "model": MODEL,
            "messages": [
                {"role": "system", "content": prompt},
                {"role": "user", "content": text},
            ],
            "tools": TOOLS,
            "tool_choice": "auto",
        }
        headers = {
            "Authorization": f"Bearer {api_key}",
            "Content-Type": "application/json",
        }
        with httpx.Client(timeout=30.0) as client:
            resp = client.post(VERCEL_AI_GATEWAY_URL, json=payload, headers=headers)
            resp.raise_for_status()
            data = resp.json()
            log.info("Vercel AI Gateway %s chamado para comando: %r", MODEL, text[:120])
            return data
    except Exception as e:
        log.exception("Vercel AI Gateway falhou: %s", e)
        return None


# alias para quem importar o novo nome
_call_vercel = _call_gemini
_call_ai_gateway = _call_gemini


def interpret_and_execute(db: Session, text: str) -> dict:
    text = (text or "").strip()
    if not text:
        return {
            "understood": False,
            "message": "Comando vazio.",
            "created_items": [],
            "updated_items": [],
            "deleted_item_ids": [],
        }
    log.info("IA comando recebido: %r", text)
    ctx = _context(db)
    resp = _call_gemini(text, ctx)
    if resp is None:
        return {
            "understood": False,
            "message": "IA indisponível (sem chave) ou falhou. Tente novamente mais tarde.",
            "created_items": [],
            "updated_items": [],
            "deleted_item_ids": [],
        }
    calls: list[tuple[str, dict]] = []
    try:
        # Formato Vercel AI Gateway / OpenAI (dict com choices -> message.tool_calls)
        if isinstance(resp, dict) and "choices" in resp:
            choices = resp.get("choices") or []
            if choices:
                msg = choices[0].get("message") or {}
                tool_calls = msg.get("tool_calls") or []
                for tc in tool_calls:
                    fn = (tc or {}).get("function") or {}
                    name = fn.get("name")
                    args_raw = fn.get("arguments")
                    if name:
                        if isinstance(args_raw, str):
                            try:
                                args = json.loads(args_raw) if args_raw.strip() else {}
                            except Exception:
                                args = {}
                        elif isinstance(args_raw, dict):
                            args = dict(args_raw)
                        elif args_raw is None:
                            args = {}
                        else:
                            args = {}
                        calls.append((name, args))
        else:
            # Compat: formato legado Gemini (candidates -> content.parts -> function_call)
            cand = resp.candidates[0] if getattr(resp, "candidates", None) else None
            parts = getattr(getattr(cand, "content", None), "parts", []) if cand else []
            for p in parts:
                fc = getattr(p, "function_call", None)
                if fc and getattr(fc, "name", None):
                    calls.append((fc.name, dict(getattr(fc, "args", {}) or {})))
    except Exception:
        calls = []

    if not calls:
        try:
            txt = ""
            if isinstance(resp, dict) and "choices" in resp:
                choices = resp.get("choices") or []
                if choices:
                    txt = (choices[0].get("message", {}).get("content") or "").strip()
            else:
                maybe_text = getattr(resp, "text", "")
                if isinstance(maybe_text, str):
                    txt = maybe_text.strip()
                elif maybe_text is not None:
                    # MagicMock ou outro objeto — tenta converter com cuidado
                    try:
                        txt = str(maybe_text).strip()
                        # MagicMock str is like "<MagicMock ...>" — ignora
                        if txt.startswith("<MagicMock"):
                            txt = ""
                    except Exception:
                        txt = ""
        except Exception:
            txt = ""
        msg = txt or "Não entendi. Ex: 'Prova de Cálculo 3 dia 27/08' ou 'mude a prova de Cálculo para 28/08'."
        log.info("IA sem function_call — resposta: %r", msg[:200])
        return {
            "understood": False,
            "message": msg,
            "created_items": [],
            "updated_items": [],
            "deleted_item_ids": [],
        }

    log.info("IA function_calls: %s", calls)
    created, updated, deleted_ids = [], [], []

    for name, args in calls:
        try:
            if name == "criar_item":
                due = _parse_dt(args.get("due_date"))
                item = item_service.create_item(
                    db,
                    ItemCreate(
                        title=args["title"],
                        course_id=int(args["course_id"]),
                        item_type_id=int(args["item_type_id"]),
                        due_date=due,
                        parent_id=args.get("parent_id"),
                    ),
                )
                created.append(item)

            elif name == "editar_item":
                item = item_service.get_item(db, int(args["item_id"]))
                upd: dict[str, Any] = {}
                if args.get("title"):
                    upd["title"] = args["title"]
                if args.get("item_type_id"):
                    upd["item_type_id"] = int(args["item_type_id"])
                if "due_date" in args:
                    upd["due_date"] = _parse_dt(args["due_date"])
                # parent_id move via service de move (mantém course cascade)
                if "parent_id" in args and args.get("parent_id") is not None:
                    from app.schemas.item import ItemMove

                    try:
                        item_service.move_item(db, item, ItemMove(parent_id=int(args["parent_id"])))
                    except Exception as e:
                        log.warning("editar_item move falhou %s: %s", args, e)
                    # recarrega após move
                    item = item_service.get_item(db, int(args["item_id"]))
                elif "parent_id" in args and args.get("parent_id") is None:
                    # mover para topo — só se tinha parent
                    if item.parent_id is not None:
                        from app.schemas.item import ItemMove

                        try:
                            item_service.move_item(db, item, ItemMove(parent_id=None))
                        except Exception as e:
                            log.warning("editar_item move topo falhou %s: %s", args, e)
                        item = item_service.get_item(db, int(args["item_id"]))

                if upd:
                    updated.append(item_service.update_item(db, item, ItemUpdate(**upd)))
                else:
                    # só moveu, conta como atualizado
                    updated.append(item)

            elif name == "excluir_itens":
                ids = list(args.get("item_ids") or [])
                if not ids and (args.get("course_id") or args.get("from_date") or args.get("to_date")):
                    q = db.query(Item).filter(Item.status == ItemStatus.ACTIVE)
                    if args.get("course_id"):
                        q = q.filter(Item.course_id == int(args["course_id"]))
                    fd, td = _parse_dt(args.get("from_date")), _parse_dt(args.get("to_date"))
                    if fd:
                        q = q.filter(Item.due_date >= fd)
                    if td:
                        q = q.filter(Item.due_date <= td)
                    if fd or td:
                        q = q.filter(Item.due_date.is_not(None))
                    ids = [i.id for i in q.all()]
                for iid in ids:
                    try:
                        it = item_service.get_item(db, int(iid))
                        if it.status != ItemStatus.TRASH:
                            _soft_delete(db, it)
                            deleted_ids.append(int(iid))
                    except Exception:
                        continue
                if deleted_ids:
                    db.commit()
                    # refresh para garantir deleted_at
                    for iid in deleted_ids:
                        try:
                            db.refresh(db.get(Item, iid))
                        except Exception:
                            pass

        except Exception as e:
            log.exception("Falha %s %s: %s", name, args, e)

    if not created and not updated and not deleted_ids:
        return {
            "understood": False,
            "message": "Não consegui aplicar (cadeira/tipo não encontrado ou item inexistente). Tente ser mais específico: ex 'Prova de Cálculo 3 dia 27/08'.",
            "created_items": [],
            "updated_items": [],
            "deleted_item_ids": [],
        }

    parts = []
    if created:
        parts.append(f"{len(created)} criado(s)")
    if updated:
        parts.append(f"{len(updated)} atualizado(s)")
    if deleted_ids:
        parts.append(f"{len(deleted_ids)} movido(s) para lixeira")

    msg = "Feito: " + ", ".join(parts) + "."
    log.info("IA interpret_and_execute resultado: %s — %s", msg, {"created": len(created), "updated": len(updated), "deleted": len(deleted_ids)})
    return {
        "understood": True,
        "message": msg,
        "created_items": created,
        "updated_items": updated,
        "deleted_item_ids": deleted_ids,
    }
