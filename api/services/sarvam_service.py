import os
from pathlib import Path
from typing import List, Dict, Any, Optional
from sarvamai import SarvamAI

def get_sarvam_api_key() -> str:
    key = os.getenv("SARVAM_API_KEY")
    if key and key.strip():
        return key.strip()
    
    # Try local .env file
    env_file = Path(__file__).resolve().parent.parent.parent / ".env"
    if env_file.exists():
        with open(env_file, "r", encoding="utf-8") as f:
            for line in f:
                line = line.strip()
                if line and not line.startswith("#") and "=" in line:
                    k, _, v = line.partition("=")
                    if k.strip() == "SARVAM_API_KEY":
                        val = v.strip().strip("'\"")
                        if val:
                            os.environ["SARVAM_API_KEY"] = val
                            return val
    return ""

def get_sarvam_client() -> SarvamAI:
    api_key = get_sarvam_api_key()
    if not api_key:
        raise ValueError("SARVAM_API_KEY is not configured. Please set it in environment or .env file.")
    return SarvamAI(api_subscription_key=api_key)

SYSTEM_ADVISOR_PROMPT = """You are "Sarvam Artha", an intelligent, empathetic, and prudent Personal Financial Well-Being Advisor created for Indian investors and global citizens.

Your Mission:
Help individuals achieve financial well-being, peace of mind, and financial independence (living off the ROI of investments/FIRE) through sound, disciplined personal finance principles.

Core Rules & Guardrails:
1. Prudence First:
   - Emphasize building an Emergency Fund (3-6 months for salaried, 6-12 months for volatile income/dependents) in safe, liquid instruments before taking speculative risks.
   - Mandate basic insurance hygiene (Pure Term Life Insurance + adequate Health Insurance) before investing heavily in risk assets.
   - Champion high-interest debt elimination (credit card dues, personal loans) first.
   - Advocate the 50/30/20 budget principle (Needs / Wants / Investments).

2. General Asset Classes & Bucket Diversification:
   - Bucket 1 (Liquid & Safety): Liquid Mutual Funds, High-Yield Savings, Sweep FDs.
   - Bucket 2 (Stability & Fixed Income): Sovereign Gold Bonds (SGBs) / Gold ETFs, Public Provident Fund (PPF), National Pension System (NPS), Corporate Debt Funds.
   - Bucket 3 (Wealth Growth & Equity): Broad Market Index Funds (Nifty 50, Nifty Next 50), Diversified Flexi-cap Mutual Funds, ELSS.
   - NEVER endorse specific individual stocks, speculative options, or get-rich-quick schemes. You must adhere to fiduciary standards.

3. Research & Education Recommendations:
   - When asked where to go for deep research, recommend trusted platforms:
     * Zerodha Varsity (Free, world-class personal finance and market education)
     * Value Research & Morningstar India (Mutual fund and portfolio research)
     * AMFI India (Mutual fund facts and regulatory investor education)
     * RBI Portal (Sovereign Gold Bond issuance and details)
     * SEBI Registered Investment Advisors (RIA) for personalized fiduciary advisory.

4. Platform Navigator:
   - You have full awareness of the Sarvam Artha platform features:
     * Interactive 3-Bucket Portfolio Allocator
     * SIP Compounding Calculator & Compounding Charts
     * Financial Freedom / Living on ROI (FIRE) Target Engine
     * Personal Expense Tracker & AI Expense Doctor
     * Multilingual Voice Support powered by Sarvam AI (Saaras STT & Bulbul TTS).
   - Answer any user questions about the platform, its plans, features, calculations, and services thoroughly and clearly.

5. Tone & Language:
   - Warm, empowering, structured, and practical. Use formatting (bullet points, bold text).
   - If the user writes or speaks in Hindi, Hinglish, Tamil, Telugu, Bengali, Marathi, or English, reply naturally in the same language or bilingual style!
"""

def generate_chat_response(messages: List[Dict[str, str]], context: Optional[str] = None) -> str:
    client = get_sarvam_client()
    
    formatted_messages = []
    
    # Inject system prompt
    system_text = SYSTEM_ADVISOR_PROMPT
    if context:
        system_text += f"\n\n[Active User Financial Context & Profile]:\n{context}"
        
    formatted_messages.append({
        "role": "system",
        "content": system_text
    })
    
    for m in messages:
        formatted_messages.append({
            "role": m.get("role", "user"),
            "content": m.get("content", "")
        })

    response = client.chat.completions(
        model="sarvam-105b-conversations",
        messages=formatted_messages,
        temperature=0.3
    )
    
    if response.choices and len(response.choices) > 0:
        return response.choices[0].message.content
    return "I apologize, but I could not generate a response at this moment. Please try again."

def audit_spending_leaks(expenses: List[Dict[str, Any]], monthly_income: float) -> str:
    client = get_sarvam_client()
    
    expense_summary = "\n".join([
        f"- {e.get('category', 'General')}: ₹{e.get('amount', 0)} ({e.get('description', 'Expense')})"
        for e in expenses
    ])
    
    prompt = f"""You are the Expense Doctor at Sarvam Artha.
User's Monthly Income: ₹{monthly_income}

Logged Expenses:
{expense_summary if expense_summary else 'No specific expenses logged yet.'}

Task:
1. Identify any potential spending leaks or lifestyle creep (e.g. food delivery, duplicate subscriptions, discretionary shopping).
2. Provide 3 specific, painless ways to cut costs without degrading happiness.
3. Show the "Compounding Magic": Calculate what saving that cut amount and investing it in a monthly SIP at 12% CAGR would grow to over 5 years and 10 years!
4. Keep the tone encouraging, empathetic, and actionable.
"""

    response = client.chat.completions(
        model="sarvam-105b-conversations",
        messages=[
            {"role": "system", "content": SYSTEM_ADVISOR_PROMPT},
            {"role": "user", "content": prompt}
        ],
        temperature=0.3
    )

    if response.choices and len(response.choices) > 0:
        return response.choices[0].message.content
    return "Unable to analyze expenses at this time."

def transcribe_audio(audio_bytes: bytes, filename: str = "recording.wav", language_code: str = "unknown") -> Dict[str, Any]:
    client = get_sarvam_client()
    
    response = client.speech_to_text.transcribe(
        file=(filename, audio_bytes),
        model="saaras:v4",
        language_code=language_code
    )
    
    return {
        "transcript": getattr(response, "transcript", "") or "",
        "language_code": getattr(response, "language_code", "unknown") or "unknown"
    }

def synthesize_speech(text: str, language_code: str = "en-IN", speaker: Optional[str] = None) -> Optional[str]:
    client = get_sarvam_client()
    
    # Select appropriate speaker based on language
    speaker_map = {
        "en-IN": "aditi_en_stories",
        "hi-IN": "kavya_hi_conversational",
        "bn-IN": "roopa_bn_conversational",
        "gu-IN": "pooja_gu_conversational",
        "kn-IN": "chaitra_kn_conversation",
        "mr-IN": "ishita_mr_conversational",
        "pa-IN": "anand_pa_conversation",
        "ta-IN": "gokul_ta_narration",
        "te-IN": "kavitha_te_conversation"
    }
    
    chosen_speaker = speaker or speaker_map.get(language_code, "aditi_en_stories")
    
    # Truncate text if excessively long for TTS audio snippet
    clean_text = text[:800].strip()
    if not clean_text:
        return None
        
    try:
        response = client.text_to_speech.convert(
            text=clean_text,
            language_code=language_code if language_code in speaker_map else "en-IN",
            speaker=chosen_speaker,
            model="bulbul:v4-flash"
        )
        if response.audios and len(response.audios) > 0:
            return response.audios[0]
    except Exception as e:
        print(f"TTS conversion warning: {e}")
        return None
    return None
