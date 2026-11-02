import os
import json
from pathlib import Path
from typing import List, Optional, Dict, Any
from fastapi import FastAPI, UploadFile, File, Form, HTTPException
from fastapi.middleware.cors import CORSMiddleware
from fastapi.staticfiles import StaticFiles
from fastapi.responses import FileResponse, JSONResponse
from pydantic import BaseModel

from api.services.finance_calc import (
    calculate_emergency_fund,
    analyze_budget_rule,
    calculate_bucket_allocation,
    calculate_sip_projections,
    calculate_fire_freedom
)
from api.services.sarvam_service import (
    generate_chat_response,
    audit_spending_leaks,
    transcribe_audio,
    synthesize_speech,
    get_sarvam_api_key
)

app = FastAPI(
    title="Sarvam Artha - Personal Financial Well-Being & Sovereign Wealth",
    description="Intelligent personal financial planning, bucket diversification, and multilingual voice advisory powered by Sarvam AI.",
    version="1.0.0"
)

# CORS middleware for open deployment
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
class FinancialProfileInput(BaseModel):
    age: int = 28
    monthly_income: float = 80000.0
    fixed_expenses: float = 30000.0
    discretionary_expenses: float = 18000.0
    current_savings: float = 120000.0
    has_dependents: bool = False
    income_stability: str = "stable"  # "stable" | "volatile"
    risk_profile: str = "moderate"     # "conservative" | "moderate" | "aggressive"
    monthly_sip: float = 20000.0
    target_freedom_age: int = 50

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

class TTSRequest(BaseModel):
    text: str
    language_code: str = "en-IN"
    speaker: Optional[str] = None

# --- API Endpoints ---

@app.get("/api/health")
def health_check():
    key = get_sarvam_api_key()
    return {
        "status": "healthy",
        "sarvam_api_configured": bool(key),
        "app_name": "Sarvam Artha"
    }

@app.post("/api/profile/calculate")
def calculate_financial_plan(data: FinancialProfileInput):
    monthly_savings = max(0.0, data.monthly_income - data.fixed_expenses - data.discretionary_expenses)
    
    # 1. Emergency Fund Health
    emergency_fund = calculate_emergency_fund(
        monthly_fixed_expenses=data.fixed_expenses,
        existing_emergency_savings=data.current_savings,
        has_dependents=data.has_dependents,
        income_stability=data.income_stability
    )
    
    # 2. 50/30/20 Budgeting Analysis
    budget_analysis = analyze_budget_rule(
        monthly_income=data.monthly_income,
        fixed_needs=data.fixed_expenses,
        discretionary_wants=data.discretionary_expenses,
        monthly_savings=monthly_savings
    )
    
    # 3. Bucket Portfolio Allocation
    monthly_investible = max(data.monthly_sip, monthly_savings)
    bucket_plan = calculate_bucket_allocation(
        age=data.age,
        risk_profile=data.risk_profile,
        monthly_investible=monthly_investible
    )
    
    # 4. SIP Growth Trajectory
    sip_projections = calculate_sip_projections(
        monthly_sip=monthly_investible,
        expected_cagr=12.0,
        years=25
    )
    
    # 5. Financial Freedom & Living on ROI (FIRE)
    total_monthly_expense = data.fixed_expenses + data.discretionary_expenses
    fire_plan = calculate_fire_freedom(
        current_age=data.age,
        current_monthly_expense=total_monthly_expense,
        current_savings=data.current_savings,
        monthly_sip=monthly_investible,
        expected_inflation=6.0,
        expected_post_retire_roi=8.0,
        target_freedom_age=data.target_freedom_age
    )
    
    return {
        "profile": data.model_dump(),
        "calculated_monthly_savings": round(monthly_savings, 2),
        "emergency_fund": emergency_fund,
        "budget_analysis": budget_analysis,
        "bucket_plan": bucket_plan,
        "sip_projections": sip_projections,
        "fire_plan": fire_plan
    }

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

@app.post("/api/voice/transcribe")
async def handle_voice_transcribe(
    file: UploadFile = File(...),
    language_code: str = Form("unknown")
):
    try:
        audio_bytes = await file.read()
        filename = file.filename or "recording.wav"
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

