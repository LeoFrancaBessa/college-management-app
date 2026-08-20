"""Domain-level errors raised by the service layer.

Routers don't need to catch these individually — they're translated to HTTP
responses by the exception handlers registered in `app.main`.
"""


class DomainError(Exception):
    """Base class for business-rule violations raised by the service layer."""


class NotFoundError(DomainError):
    """Raised when a referenced entity does not exist."""


class ConflictError(DomainError):
    """Raised when an action conflicts with existing data (e.g. duplicate name)."""


class ValidationError(DomainError):
    """Raised when input violates a business rule beyond basic schema validation."""
