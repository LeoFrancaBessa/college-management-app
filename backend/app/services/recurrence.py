"""RF-20 — Recorrência (Feature plugável).

Armazenado em `Item.features["recurrence"]` (JSONB) — ver
`specs/05-modelo-de-dominio.md:87`. Este módulo concentra validação e
expansão de ocorrências para o cronograma (Regra 2 / RF-30..32).

Contrato armazenado (normalizado):
  {
    "frequency": "daily" | "weekly" | "monthly" | "yearly",
    "interval": int >=1 (default 1),
    "weekdays": [0..6] | null  # só p/ weekly, 0=Mon
    "until": "ISO-8601 datetime" | null,
    "count": int | null
  }
- Exige exatamente um de `until` / `count` (data-limite OU nº de ocorrências).
- `due_date` do Item é a ocorrência 0 (âncora) e preserva o horário.
- `until` é inclusivo.
- Validação é chamada por `item_service` em create/update; expansão é usada
  por `schedule_service`.
"""

from __future__ import annotations

import calendar
from datetime import datetime, timezone

from app.services.errors import ValidationError

FREQUENCIES = {"daily", "weekly", "monthly", "yearly"}
MAX_COUNT = 500
MAX_ITER = 1000  # safety guard contra loop infinito


def _parse_dt(value) -> datetime | None:
    if value is None:
        return None
    if isinstance(value, datetime):
        dt = value
    elif isinstance(value, str):
        iso = value.replace("Z", "+00:00")
        try:
            dt = datetime.fromisoformat(iso)
        except Exception as exc:
            raise ValidationError(f"recurrence: datetime inválido {value!r}: {exc}") from exc
    else:
        raise ValidationError(f"recurrence: datetime inválido {value!r}")
    # Normaliza naive como UTC (mantém armazenado como UTC)
    if dt.tzinfo is None:
        dt = dt.replace(tzinfo=timezone.utc)
    return dt


def _ensure_aware(dt: datetime | None) -> datetime | None:
    if dt is None:
        return None
    if dt.tzinfo is None:
        return dt.replace(tzinfo=timezone.utc)
    return dt


def _iso(dt: datetime) -> str:
    return dt.isoformat()


def _add_months(dt: datetime, months: int) -> datetime:
    year = dt.year + (dt.month - 1 + months) // 12
    month = (dt.month - 1 + months) % 12 + 1
    max_day = calendar.monthrange(year, month)[1]
    day = min(dt.day, max_day)
    return dt.replace(year=year, month=month, day=day)


def validate_recurrence(features: dict | None, due_date: datetime | None) -> dict | None:
    """Valida `features["recurrence"]` se presente e retorna a forma normalizada.

    - Se ausente ou `None`, retorna None (feature desativada).
    - Se presente mas inválida, levanta ValidationError.
    - Se válida, normaliza e escreve de volta em `features["recurrence"]`
      (mutação) para persistir forma canônica.
    """
    if not features or "recurrence" not in features:
        return None
    rec = features["recurrence"]
    if rec is None:
        return None
    if not isinstance(rec, dict):
        raise ValidationError("recurrence deve ser um objeto")

    freq = rec.get("frequency")
    if not freq or not isinstance(freq, str):
        raise ValidationError("recurrence.frequency é obrigatório (daily|weekly|monthly|yearly)")
    freq = freq.strip().lower()
    if freq not in FREQUENCIES:
        raise ValidationError("recurrence.frequency deve ser daily, weekly, monthly ou yearly")

    raw_interval = rec.get("interval", 1)
    try:
        interval = int(raw_interval)
    except Exception:
        raise ValidationError("recurrence.interval deve ser inteiro >= 1")
    if interval < 1:
        raise ValidationError("recurrence.interval deve ser >= 1")
    if interval > 366:
        raise ValidationError("recurrence.interval muito grande (max 366)")

    weekdays = rec.get("weekdays")
    if weekdays is not None:
        if not isinstance(weekdays, list):
            raise ValidationError("recurrence.weekdays deve ser lista de 0..6 (0=seg)")
        norm_wd: list[int] = []
        for w in weekdays:
            try:
                wi = int(w)
            except Exception:
                raise ValidationError(f"recurrence.weekdays valor inválido: {w!r}") from None
            if wi < 0 or wi > 6:
                raise ValidationError("recurrence.weekdays valores devem estar entre 0 e 6")
            if wi not in norm_wd:
                norm_wd.append(wi)
        weekdays = sorted(norm_wd)
        if not weekdays:
            weekdays = None
        if freq != "weekly":
            raise ValidationError("recurrence.weekdays só é permitido quando frequency=weekly")

    until_raw = rec.get("until")
    count_raw = rec.get("count")
    has_until = until_raw is not None
    has_count = count_raw is not None

    if has_until and has_count:
        raise ValidationError("recurrence deve ter apenas um de until ou count (data-limite OU nº de ocorrências)")
    if not has_until and not has_count:
        raise ValidationError("recurrence requer until (data-limite) ou count (nº de ocorrências)")

    if due_date is None:
        raise ValidationError("recurrence requer due_date preenchida no item")
    due_date = _ensure_aware(due_date)  # type: ignore[assignment]

    normalized: dict = {"frequency": freq, "interval": interval}
    if weekdays is not None:
        normalized["weekdays"] = weekdays

    if has_until:
        until_dt = _parse_dt(until_raw)
        assert until_dt is not None
        if until_dt < due_date:  # type: ignore[operator]
            raise ValidationError("recurrence.until deve ser >= due_date")
        normalized["until"] = _iso(until_dt)
        # count fica ausente
    else:
        try:
            count = int(count_raw)  # type: ignore[arg-type]
        except Exception:
            raise ValidationError("recurrence.count deve ser inteiro >= 1") from None
        if count < 1:
            raise ValidationError("recurrence.count deve ser >= 1")
        if count > MAX_COUNT:
            raise ValidationError(f"recurrence.count muito grande (max {MAX_COUNT})")
        normalized["count"] = count

    # Escreve forma normalizada de volta (persistência canônica)
    features["recurrence"] = normalized
    return normalized


def _next_occurrence(current: datetime, anchor: datetime, rec: dict) -> datetime | None:
    """Calcula a próxima ocorrência após `current`."""
    freq = rec["frequency"]
    interval = int(rec.get("interval", 1))
    if freq == "daily":
        return current + _timedelta_days(interval)
    if freq == "weekly":
        weekdays = rec.get("weekdays")
        if not weekdays:
            return current + _timedelta_days(7 * interval)
        # weekly + weekdays: busca próximo dia após current que satisfaça
        # weekdays e que esteja num bloco de `interval` semanas a partir de anchor.
        candidate = current + _timedelta_days(1)
        # Guard: no máximo interval*7 + 7*interval dias (duas janelas)
        for _ in range(7 * interval * 8):
            days_diff = (candidate.date() - anchor.date()).days
            # anchor como referência de blocos semanais; semanas completas
            # (floor) — ocorrências só nos blocos onde weeks%interval==0
            weeks = days_diff // 7
            if weeks % interval == 0 and candidate.weekday() in weekdays:
                # preserva horário de anchor/current (já vem de +1 dia, mas
                # garante mesmo horário do anchor)
                return candidate.replace(
                    hour=anchor.hour,
                    minute=anchor.minute,
                    second=anchor.second,
                    microsecond=anchor.microsecond,
                )
            candidate += _timedelta_days(1)
        return None
    if freq == "monthly":
        return _add_months(current, interval)
    if freq == "yearly":
        return _add_months(current, 12 * interval)
    return None


def _timedelta_days(n: int):
    from datetime import timedelta

    return timedelta(days=n)


def expand_recurrence(
    start: datetime,
    rec: dict,
    from_date: datetime | None = None,
    to_date: datetime | None = None,
) -> list[datetime]:
    """Gera ocorrências de `start` segundo `rec`, filtradas por janela.

    - `start` é a ocorrência 0 (Item.due_date).
    - `rec` é o dict normalizado (validate_recurrence).
    - `from_date`/`to_date` inclusivos; None = sem limite da janela.
    - Retorna lista ordenada cronologicamente (pode ser vazia se janela não
      intersecta). Inclui `start` quando dentro da janela.
    - Limitada por `until`/`count` + guard MAX_ITER/MAX_COUNT.
    """
    start = _ensure_aware(start)  # type: ignore[assignment]
    from_date = _ensure_aware(from_date)
    to_date = _ensure_aware(to_date)
    freq = rec.get("frequency")
    if freq not in FREQUENCIES:
        return []

    until_dt = _parse_dt(rec.get("until")) if rec.get("until") else None
    count = rec.get("count")
    if count is not None:
        try:
            count = int(count)
        except Exception:
            count = None

    results: list[datetime] = []
    current = start
    iters = 0
    generated = 0  # total ocorrências já consideradas (para count)

    while iters < MAX_ITER:
        iters += 1

        # Terminação por count (total de ocorrências, incluindo as fora da janela)
        if count is not None and generated >= count:
            break
        # Terminação por until (inclusivo): se current já passou de until, para
        if until_dt is not None and current > until_dt:
            break
        # Otimização: como datas são monótonas crescentes, se já passamos de
        # to_date podemos parar (todas as próximas serão > to_date)
        if to_date is not None and current > to_date:
            # Só podemos parar se o critério de término não for count com
            # janela furada? Mas como é monótono, se current > to_date,
            # qualquer próximo será ainda maior, então nunca voltará para
            # dentro da janela.
            break

        # Decide se current entra no resultado (dentro da janela)
        if (from_date is None or current >= from_date) and (to_date is None or current <= to_date):
            results.append(current)

        generated += 1

        # Se já atingimos count total (inclui a que acabamos de contar), não
        # precisa gerar próxima — o topo do loop vai quebrar
        if count is not None and generated >= count:
            break
        if until_dt is not None and current >= until_dt:
            # próxima seria > until
            break

        nxt = _next_occurrence(current, start, rec)
        if nxt is None or nxt <= current:
            break
        current = nxt

    return results
