"""Rate limiter — slowapi (docs/architecture.md:34).

Single-user but publicly exposed → limit login to 5/min.
Falls back to no-op if slowapi not installed (tests/ci offline).
"""
from __future__ import annotations

try:
    from slowapi import Limiter
    from slowapi.util import get_remote_address

    limiter = Limiter(key_func=get_remote_address, default_limits=["200/minute"])
except Exception:  # slowapi not available
    class _NoopLimiter:
        def limit(self, *args, **kwargs):
            def decorator(fn):
                return fn
            return decorator

    limiter = _NoopLimiter()  # type: ignore
