import os
import base64
from pathlib import Path
from typing import List, Optional, Dict, Any
from fastapi import FastAPI, UploadFile, File, Form, HTTPException, Body
from fastapi.middleware.cors import CORSMiddleware
from fastapi.staticfiles import StaticFiles
from fastapi.responses import FileResponse, JSONResponse
from pydantic import BaseModel, Field

from api.services.finance_calc import (
    calculate_cashflow_health,
    calculate_net_worth,
    simulate_growth,
    evaluate_custom_goals
)
from api.services.sarvam_service import (
    generate_chat_response,
    generate_open_ended_strategy,
    audit_spending_leaks,
    transcribe_audio,
    synthesize_speech,
    get_sarvam_api_key
)

app = FastAPI(
    title="Sarvam Artha - Personal Finance Manager",
    description="Intelligent, open-ended personal financial planning, cash flow tracking, and multilingual voice advisory powered by Sarvam AI.",
    version="2.0.0"
)

app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

BASE_DIR = Path(__file__).resolve().parent.parent
PUBLIC_DIR = BASE_DIR / "public"

# --- Models ---

class GoalItem(BaseModel):
    id: Optional[str] = None
    title: str = "Emergency Safety Reserve"
    target_amount: float = 200000.0
    current_amount: float = 80000.0
    target_years: float = 2.0
    expected_roi_pct: float = 6.5
    category: Optional[str] = "Safety"

class AssetItem(BaseModel):
    id: Optional[str] = None
    title: str = "Savings & Liquid Funds"
    value: float = 120000.0
    category: str = "Cash / Liquid"

class LiabilityItem(BaseModel):
    id: Optional[str] = None
    title: str = "Vehicle / Personal Loan"
    amount: float = 0.0
    interest_rate: Optional[float] = 9.5
    monthly_emi: Optional[float] = 0.0

class UserProfileInput(BaseModel):
    age: Optional[int] = None
    monthly_income: float = 0.0
    mandatory_expenses: float = 0.0
    discretionary_expenses: float = 0.0
    monthly_debt_emi: float = 0.0
    liquid_savings: float = 0.0
    has_dependents: bool = False
    income_stability: str = "stable"  # "stable" | "variable"
    risk_profile: str = "moderate"     # "conservative" | "moderate" | "growth"
    goals: List[GoalItem] = Field(default_factory=list)
    assets: List[AssetItem] = Field(default_factory=list)
    liabilities: List[LiabilityItem] = Field(default_factory=list)

class GrowthSimulationRequest(BaseModel):
    initial_amount: float = 50000.0
    monthly_contribution: float = 15000.0
    annual_growth_pct: float = 10.0
    years: int = 15

class ChatMessage(BaseModel):
    role: str
    content: str

class ChatRequest(BaseModel):
    messages: List[ChatMessage]
    context: Optional[str] = None
    enable_voice: bool = False
    voice_language: str = "en-IN"

class ExpenseItem(BaseModel):
    id: Optional[str] = None
    category: str
    amount: float
    description: str
    date: Optional[str] = None

class ExpenseAuditRequest(BaseModel):
    expenses: List[ExpenseItem]
    monthly_income: float

class StrategyRequest(BaseModel):
    profile: UserProfileInput

class TTSRequest(BaseModel):
    text: str
    language_code: str = "en-IN"
    speaker: Optional[str] = None

class TranscribeJsonRequest(BaseModel):
    audio_base64: str
    language_code: str = "unknown"
    filename: Optional[str] = "recording.webm"

# --- Endpoints ---

@app.get("/api/health")
def health_check():
    key = get_sarvam_api_key()
    return {
        "status": "healthy",
        "sarvam_api_configured": bool(key),
        "app_name": "Sarvam Artha - Personal Finance Manager"
    }

@app.post("/api/profile/calculate")
def calculate_financial_health(data: UserProfileInput):
    # 1. Cash flow & Runway Analysis
    cashflow = calculate_cashflow_health(
        monthly_income=data.monthly_income,
        mandatory_expenses=data.mandatory_expenses,
        discretionary_expenses=data.discretionary_expenses,
        debt_obligations=data.monthly_debt_emi,
        liquid_savings=data.liquid_savings
    )

    # 2. Net Worth Calculation
    net_worth = calculate_net_worth(
        assets=[a.model_dump() for a in data.assets],
        liabilities=[l.model_dump() for l in data.liabilities]
    )

    # 3. Custom Goals Feasibility
    goals_eval = evaluate_custom_goals(
        goals=[g.model_dump() for g in data.goals],
        available_monthly_surplus=cashflow["net_monthly_surplus"]
    )

    return {
        "profile": data.model_dump(),
        "cashflow": cashflow,
        "net_worth": net_worth,
        "goals_evaluation": goals_eval
    }

@app.post("/api/profile/simulate-growth")
def run_growth_simulation(req: GrowthSimulationRequest):
    return simulate_growth(
        initial_amount=req.initial_amount,
        monthly_contribution=req.monthly_contribution,
        annual_growth_pct=req.annual_growth_pct,
        years=req.years
    )

@app.post("/api/advisor/strategy")
def generate_strategy(req: StrategyRequest):
    try:
        profile_dict = req.profile.model_dump()
        cashflow = calculate_cashflow_health(
            monthly_income=req.profile.monthly_income,
            mandatory_expenses=req.profile.mandatory_expenses,
            discretionary_expenses=req.profile.discretionary_expenses,
            debt_obligations=req.profile.monthly_debt_emi,
            liquid_savings=req.profile.liquid_savings
        )
        goals = [g.model_dump() for g in req.profile.goals]
        
        strategy_analysis = generate_open_ended_strategy(
            profile=profile_dict,
            goals=goals,
            cashflow=cashflow
        )
        return {"strategy": strategy_analysis}
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))

@app.post("/api/advisor/chat")
def chat_with_advisor(req: ChatRequest):
    try:
        messages_dicts = [m.model_dump() for m in req.messages]
        reply_text = generate_chat_response(messages=messages_dicts, context=req.context)
        
        audio_base64 = None
        if req.enable_voice:
            audio_base64 = synthesize_speech(
                text=reply_text,
                language_code=req.voice_language
            )
            
        return {
            "reply": reply_text,
            "audio_base64": audio_base64,
            "language_code": req.voice_language
        }
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))

@app.post("/api/advisor/audit-expenses")
def audit_expenses(req: ExpenseAuditRequest):
    try:
        expenses_dicts = [e.model_dump() for e in req.expenses]
        audit_reply = audit_spending_leaks(expenses_dicts, req.monthly_income)
        return {"audit_analysis": audit_reply}
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))

@app.post("/api/voice/transcribe-json")
def handle_voice_transcribe_json(req: TranscribeJsonRequest):
    try:
        raw_b64 = req.audio_base64
        if "," in raw_b64:
            raw_b64 = raw_b64.split(",", 1)[1]
        audio_bytes = base64.b64decode(raw_b64)
        result = transcribe_audio(
            audio_bytes=audio_bytes,
            filename=req.filename or "recording.webm",
            language_code=req.language_code
        )
        return result
    except Exception as e:
        raise HTTPException(status_code=500, detail=f"Transcription failed: {str(e)}")

@app.post("/api/voice/transcribe")
async def handle_voice_transcribe(
    file: UploadFile = File(...),
    language_code: str = Form("unknown")
):
    try:
        audio_bytes = await file.read()
        filename = file.filename or "recording.webm"
        result = transcribe_audio(audio_bytes=audio_bytes, filename=filename, language_code=language_code)
        return result
    except Exception as e:
        raise HTTPException(status_code=500, detail=f"Transcription failed: {str(e)}")

@app.post("/api/voice/synthesize")
def handle_voice_synthesize(req: TTSRequest):
    try:
        audio_b64 = synthesize_speech(text=req.text, language_code=req.language_code, speaker=req.speaker)
        if not audio_b64:
            raise HTTPException(status_code=500, detail="TTS synthesis returned no audio")
        return {"audio_base64": audio_b64, "language_code": req.language_code}
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))

# --- Static File Serving for Local & Direct Access ---

@app.get("/")
async def serve_index():
    index_file = BASE_DIR / "index.html"
    if not index_file.exists():
        index_file = PUBLIC_DIR / "index.html"
    if index_file.exists():
        return FileResponse(index_file)
    return JSONResponse({"message": "Sarvam Artha API is running."})

@app.get("/app.js")
async def serve_js():
    js_file = BASE_DIR / "app.js"
    if not js_file.exists():
        js_file = PUBLIC_DIR / "app.js"
    if js_file.exists():
        return FileResponse(js_file, media_type="application/javascript")
    raise HTTPException(status_code=404, detail="File not found")

if PUBLIC_DIR.exists():
    app.mount("/public", StaticFiles(directory=str(PUBLIC_DIR)), name="public")
