from fastapi import APIRouter, Depends
from sqlalchemy.orm import Session
from app.db.session import get_db
from app.schemas.ai import AIInterpretRequest, AIInterpretResponse
from app.services import ai_service
router = APIRouter(prefix="/ai", tags=["ai"])
@router.post("/interpret", response_model=AIInterpretResponse)
def interpret(req: AIInterpretRequest, db: Session = Depends(get_db)):
    return ai_service.interpret_and_execute(db, req.text)
