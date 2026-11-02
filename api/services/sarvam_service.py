import os
import base64
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

SYSTEM_ADVISOR_PROMPT = """You are "Sarvam Artha", an intelligent, open-ended Personal Finance Strategist and Advisor.

Core Operating Principles:
1. General-Purpose & First-Principles Reasoning:
   - You are a general-purpose personal finance manager. Do NOT promote or favor any particular strategy by default (do not default to FIRE, 3-bucket, 50/30/20, or any single methodology).
   - Your advice must come from dynamically researching and reasoning about the individual user's financial profile, numbers, life stage, risk appetite, debts, cash flow, and specific personal goals.
   - You may draw on ANY relevant strategy, plan, concept, or framework that fits their unique situation—including envelope budgeting, zero-based budgeting, debt snowball/avalanche, cash buffers, goal-based asset allocation, bucket diversification, life-cycle investing, barbell strategy, core-satellite portfolios, FIRE/safe withdrawal rates, or hybrid models.
   - When you recommend a plan or strategy, always provide the explicit reasoning for WHY this approach fits that user over alternatives.

2. Unbiased & Fiduciary Standards:
   - Give conflict-free, objective advice. Never endorse specific individual speculative stocks, micro-caps, or get-rich-quick schemes.
   - Point to reliable, respected research sources when appropriate (e.g., Zerodha Varsity, Value Research, Morningstar, AMFI, RBI, SEBI Registered Investment Advisors).

3. Multilingual Support:
   - Fluently understand and converse in Marathi (मराठी), Hindi (हिंदी), English, Gujarati, Tamil, Telugu, Bengali, Kannada, Punjabi, etc.
   - When a user asks or speaks in Marathi, reply in clean, natural Marathi. If they speak in English or Hindi, reply in that language.

4. Platform Features Awareness:
   - You can answer any questions about the features available in this app:
     * Cashflow & Budget Health Tracker
     * Net Worth & Asset-Liability Ledger
     * Customizable Goals & Compounding Simulator
     * Transaction & Expense Ledger with AI Spending Review
     * Multilingual Voice & Speech-to-Text / Text-to-Speech powered by Sarvam AI.
"""

def generate_chat_response(messages: List[Dict[str, str]], context: Optional[str] = None) -> str:
    client = get_sarvam_client()
    
    formatted_messages = []
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

def generate_open_ended_strategy(profile: Dict[str, Any], goals: List[Dict[str, Any]], cashflow: Dict[str, Any]) -> str:
    client = get_sarvam_client()
    
    goals_text = "\n".join([
        f"- {g.get('title', 'Goal')}: Target ₹{g.get('target_amount', 0):,} in {g.get('target_years', 1)} years (Currently saved: ₹{g.get('current_amount', 0):,})"
        for g in goals
    ]) if goals else "No specific goals added yet."

    prompt = f"""Evaluate this user's financial profile from first principles:
- Age: {profile.get('age', 'Not specified')}
- Monthly In-Hand Income: ₹{cashflow.get('monthly_income', 0):,}
- Mandatory Living Outflows: ₹{cashflow.get('mandatory_expenses', 0):,}
- Discretionary Outflows: ₹{cashflow.get('discretionary_expenses', 0):,}
- Debt / EMI Obligations: ₹{cashflow.get('debt_obligations', 0):,}
- Net Monthly Cashflow Surplus: ₹{cashflow.get('net_monthly_surplus', 0):,} (Savings Rate: {cashflow.get('savings_rate_pct', 0)}%)
- Liquid Savings: ₹{profile.get('liquid_savings', 0):,} (Runway: {cashflow.get('liquid_runway_months', 0)} months)
- Dependents: {'Yes' if profile.get('has_dependents') else 'No'}
- Risk Appetite: {profile.get('risk_profile', 'Moderate')}
- Financial Horizon & Stability: {profile.get('income_stability', 'Stable')}

User's Stated Goals:
{goals_text}

Instructions:
1. Analyze their current financial health (cashflow, safety buffer, debt load, capacity to save).
2. Propose a personalized financial strategy or combination of frameworks uniquely suited to them. (Do not limit yourself to any pre-fixed strategy; consider what best addresses their specific goals, debts, and life stage, and explain your reasoning).
3. Provide a phased, actionable roadmap:
   - Immediate Priorities (Next 1–3 months)
   - Medium-Term Actions (1–3 years)
   - Long-Term Wealth & Goal Execution (3+ years)
4. Highlight any blind spots or trade-offs they should be aware of.
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
    return "Unable to generate personalized strategy at this moment."

def audit_spending_leaks(expenses: List[Dict[str, Any]], monthly_income: float) -> str:
    client = get_sarvam_client()
    
    expense_summary = "\n".join([
        f"- {e.get('category', 'General')}: ₹{e.get('amount', 0):,} ({e.get('description', 'Expense')})"
        for e in expenses
    ])
    
    prompt = f"""You are the Financial Expense Strategist at Sarvam Artha.
User's Monthly Income: ₹{monthly_income:,}

Logged Expense Items:
{expense_summary if expense_summary else 'No specific expenses logged yet.'}

Task:
1. Examine spending patterns and identify potential optimization opportunities or lifestyle creep without being punitive.
2. Provide practical, painless ways to optimize cash flow based on their specific entries.
3. Show the impact: Calculate what redirecting that saved amount into a prudent monthly investment could grow to over 5 years.
4. Keep the tone constructive, empathetic, and actionable.
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
    
    # Clean language code for Sarvam Saaras
    valid_langs = [
        "unknown", "hi-IN", "bn-IN", "kn-IN", "ml-IN", "mr-IN", "od-IN",
        "pa-IN", "ta-IN", "te-IN", "en-IN", "gu-IN", "as-IN", "ur-IN"
    ]
    code = language_code if language_code in valid_langs else "unknown"

    response = client.speech_to_text.transcribe(
        file=(filename, audio_bytes),
        model="saaras:v4",
        language_code=code
    )
    
    return {
        "transcript": getattr(response, "transcript", "") or "",
        "language_code": getattr(response, "language_code", code) or code
    }

def synthesize_speech(text: str, language_code: str = "en-IN", speaker: Optional[str] = None) -> Optional[str]:
    client = get_sarvam_client()
    
    speaker_map = {
        "en-IN": "aditi_en_stories",
        "hi-IN": "kavya_hi_conversational",
        "mr-IN": "ishita_mr_conversational",
        "bn-IN": "roopa_bn_conversational",
        "gu-IN": "pooja_gu_conversational",
        "kn-IN": "chaitra_kn_conversation",
        "pa-IN": "anand_pa_conversation",
        "ta-IN": "gokul_ta_narration",
        "te-IN": "kavitha_te_conversation"
    }
    
    chosen_speaker = speaker or speaker_map.get(language_code, "aditi_en_stories")
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
