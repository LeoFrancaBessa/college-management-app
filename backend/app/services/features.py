"""RF-16 / RF-17 / RF-18 — Features plugáveis Nota, Checklist, Anotações.

Armazenado em `Item.features` (JSONB) — ver `specs/05-modelo-de-dominio.md:66`.
Cada feature é opt-in por item (Regra 3). Este módulo concentra validação e
normalização, no mesmo padrão de `services/recurrence.py:validate_recurrence`
(mutação in-place para forma canônica, ValidationError → 400).

Contratos canônicos (normalizados):
  grade:     {"score": float, "max_score": float=10, "weight": float=1}
             alias legado "nota": {"nota_obtida"/"obtida"/"score", "nota_max"/"max"/"max_score", "peso"/"weight"}
  checklist: [{"text": str 1..500, "done": bool}]
             alias "texto"/"concluido", "check_list"
  notes:     str markdown 0..50000
             alias "anotacoes"/"anotacao"/"notes_md"

Regras:
- Ausência da chave = feature desativada (não valida).
- `None` como valor = desativada (mantém None para compatibilidade com PATCH).
- `features: {}` desativa todas (tratado pelo caller).
- Normalização migra alias PT-BR → canônico e remove chave legada.
"""

from __future__ import annotations

from app.services.errors import ValidationError

MAX_CHECKLIST_ITEMS = 100
MAX_CHECKLIST_TEXT = 500
MAX_NOTES_LEN = 50_000
MAX_SCORE_LIMIT = 1000
MAX_MAX_SCORE = 1000


def _to_float(value, field: str) -> float:
    try:
        return float(value)
    except Exception:
        raise ValidationError(f"{field} deve ser numérico") from None


def validate_grade(features: dict | None) -> dict | None:
    """Valida `features["grade"]` (ou alias "nota") se presente.

    Normaliza para `features["grade"] = {"score","max_score","weight"}` e remove
    `features["nota"]` se existia. Levanta ValidationError se inválido.
    """
    if not features:
        return None
    # detect presence — need to know if either key exists
    has_grade = "grade" in features
    has_nota = "nota" in features
    if not has_grade and not has_nota:
        return None

    # prefer "grade" if both present; raw is whatever key exists
    if has_grade:
        raw = features["grade"]
        legacy_key = "nota" if has_nota else None
    else:
        raw = features["nota"]
        legacy_key = None  # will migrate nota -> grade

    if raw is None:
        # desativada — normaliza para grade=None e remove alias
        features["grade"] = None
        if "nota" in features:
            del features["nota"]
        return None
    if not isinstance(raw, dict):
        raise ValidationError("grade/nota deve ser um objeto {score, max_score?, weight?}")

    # extract with aliases
    raw_score = raw.get("score")
    if raw_score is None:
        raw_score = raw.get("nota_obtida")
    if raw_score is None:
        raw_score = raw.get("obtida")
    if raw_score is None:
        raise ValidationError("grade.score (ou nota.nota_obtida) é obrigatório")

    score = _to_float(raw_score, "grade.score")
    # NaN/inf guard
    if score != score or score in (float("inf"), float("-inf")):
        raise ValidationError("grade.score deve ser um número finito")

    raw_max = raw.get("max_score")
    if raw_max is None:
        raw_max = raw.get("nota_max")
    if raw_max is None:
        raw_max = raw.get("max")
    if raw_max is None:
        raw_max = raw.get("nota_maxima")
    if raw_max is None:
        max_score = 10.0
    else:
        max_score = _to_float(raw_max, "grade.max_score")
        if max_score != max_score or max_score in (float("inf"), float("-inf")):
            raise ValidationError("grade.max_score deve ser um número finito")

    if max_score <= 0:
        raise ValidationError("grade.max_score deve ser > 0")
    if max_score > MAX_MAX_SCORE:
        raise ValidationError(f"grade.max_score muito grande (max {MAX_MAX_SCORE})")
    if score < 0 or score > max_score:
        raise ValidationError("grade.score deve estar entre 0 e max_score")

    raw_weight = raw.get("weight")
    if raw_weight is None:
        raw_weight = raw.get("peso")
    if raw_weight is None:
        weight = 1.0
    else:
        weight = _to_float(raw_weight, "grade.weight")
        if weight != weight or weight in (float("inf"), float("-inf")):
            raise ValidationError("grade.weight deve ser um número finito")
        if weight <= 0:
            weight = 1.0  # fallback como course_service._grade_weighted (evita div0)

    normalized = {"score": float(score), "max_score": float(max_score), "weight": float(weight)}
    features["grade"] = normalized
    if "nota" in features:
        del features["nota"]
    return normalized


def validate_checklist(features: dict | None) -> list | None:
    """Valida `features["checklist"]` (alias "check_list", itens com alias PT-BR).

    Normaliza para lista de {"text": str, "done": bool}. Remove alias.
    """
    if not features:
        return None
    has_cl = "checklist" in features
    has_alias = "check_list" in features
    if not has_cl and not has_alias:
        return None

    raw = features["checklist"] if has_cl else features["check_list"]

    if raw is None:
        features["checklist"] = None
        if "check_list" in features:
            del features["check_list"]
        return None
    if not isinstance(raw, list):
        raise ValidationError("checklist deve ser uma lista de {text, done}")

    if len(raw) > MAX_CHECKLIST_ITEMS:
        raise ValidationError(f"checklist muito grande (max {MAX_CHECKLIST_ITEMS} itens)")

    normalized: list[dict] = []
    for idx, item in enumerate(raw):
        if not isinstance(item, dict):
            raise ValidationError(f"checklist[{idx}] deve ser um objeto {{text, done}}")
        txt = item.get("text")
        if txt is None:
            txt = item.get("texto")
        if txt is None:
            txt = item.get("title")
        if txt is None or not isinstance(txt, str):
            raise ValidationError(f"checklist[{idx}].text é obrigatório (string)")
        txt = txt.strip()
        if not txt:
            raise ValidationError(f"checklist[{idx}].text não pode ser vazio")
        if len(txt) > MAX_CHECKLIST_TEXT:
            raise ValidationError(f"checklist[{idx}].text muito longo (max {MAX_CHECKLIST_TEXT})")

        done = item.get("done")
        if done is None:
            done = item.get("concluido")
        if done is None:
            done = item.get("checked")
        if done is None:
            done = False
        # coerce to bool (accept 0/1, "true"/"false" via bool? keep strict: only bool or 0/1)
        if isinstance(done, bool):
            pass
        elif isinstance(done, int) and done in (0, 1):
            done = bool(done)
        else:
            raise ValidationError(f"checklist[{idx}].done deve ser booleano")

        normalized.append({"text": txt, "done": bool(done)})

    features["checklist"] = normalized
    if "check_list" in features:
        del features["check_list"]
    return normalized


def validate_notes(features: dict | None) -> str | None:
    """Valida `features["notes"]` (alias "anotacoes", "anotacao", "notes_md").

    Normaliza para `features["notes"] = str`.
    """
    if not features:
        return None
    # find which key is present (prefer "notes")
    present_key = None
    for k in ("notes", "anotacoes", "anotacao", "notes_md"):
        if k in features:
            present_key = k
            break
    if present_key is None:
        return None

    raw = features[present_key]

    if raw is None:
        features["notes"] = None
        for k in ("anotacoes", "anotacao", "notes_md"):
            if k in features:
                del features[k]
        return None
    if not isinstance(raw, str):
        raise ValidationError("notes/anotacoes deve ser string (markdown)")

    if len(raw) > MAX_NOTES_LEN:
        raise ValidationError(f"notes muito longo (max {MAX_NOTES_LEN} caracteres)")

    # trim trailing? keep as-is but strip leading/trailing whitespace for canonical
    # Preserve internal markdown; just ensure not only whitespace.
    # We don't reject whitespace-only — store as "" for consistency.
    normalized = raw
    features["notes"] = normalized
    for k in ("anotacoes", "anotacao", "notes_md"):
        if k in features:
            del features[k]
    return normalized


def validate_features(features: dict | None) -> dict | None:
    """Valida todas as features plugáveis de `features` se presentes.

    Chama os validators específicos para grade/checklist/notes.
    Recorrência é tratada separadamente por `validate_recurrence` (precisa due_date).
    Retorna features normalizado (mutado in-place).
    """
    if not features:
        return features
    # order doesn't matter, but grade first for early fail
    # Each validator checks presence before acting, so safe to call all.
    # We snapshot keys to avoid mutation during iteration issues — but validators
    # handle mutation themselves.
    if "grade" in features or "nota" in features:
        validate_grade(features)
    if "checklist" in features or "check_list" in features:
        validate_checklist(features)
    # notes aliases: check any alias
    if any(k in features for k in ("notes", "anotacoes", "anotacao", "notes_md")):
        validate_notes(features)
    return features
