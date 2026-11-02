"""
Financial Calculations and Rules Engine for Sarvam Artha
Covers:
- Emergency Fund Health
- 50/30/20 Rule Analysis
- Bucket-by-Bucket Asset Allocation (Liquid, Debt/SGB, Growth Equity)
- SIP Compounding & Year-by-Year Growth
- Financial Independence / FIRE (Living off ROI)
"""

from typing import Dict, Any, List

def calculate_emergency_fund(monthly_fixed_expenses: float, existing_emergency_savings: float, has_dependents: bool = False, income_stability: str = "stable") -> Dict[str, Any]:
    # 3-6 months for stable salaried, 6-12 months if volatile or high dependents
    multiplier = 6
    if income_stability == "volatile" or has_dependents:
        multiplier = 9 if not (income_stability == "volatile" and has_dependents) else 12
    elif income_stability == "stable" and not has_dependents:
        multiplier = 6

    target_amount = monthly_fixed_expenses * multiplier
    current_months = (existing_emergency_savings / monthly_fixed_expenses) if monthly_fixed_expenses > 0 else 0
    shortfall = max(0.0, target_amount - existing_emergency_savings)
    status = "Adequate" if current_months >= multiplier else "Building" if current_months >= 3 else "Critical Attention Needed"

    return {
        "target_amount": round(target_amount, 2),
        "target_months": multiplier,
        "current_savings": round(existing_emergency_savings, 2),
        "current_coverage_months": round(current_months, 1),
        "shortfall": round(shortfall, 2),
        "status": status,
        "is_adequate": current_months >= multiplier
    }

def analyze_budget_rule(monthly_income: float, fixed_needs: float, discretionary_wants: float, monthly_savings: float) -> Dict[str, Any]:
    if monthly_income <= 0:
        return {}

    needs_pct = (fixed_needs / monthly_income) * 100
    wants_pct = (discretionary_wants / monthly_income) * 100
    savings_pct = (monthly_savings / monthly_income) * 100

    ideal_needs_pct = 50.0
    ideal_wants_pct = 30.0
    ideal_savings_pct = 20.0

    return {
        "needs": {
            "amount": round(fixed_needs, 2),
            "percentage": round(needs_pct, 1),
            "ideal_pct": ideal_needs_pct,
            "status": "Healthy" if needs_pct <= 50 else "High"
        },
        "wants": {
            "amount": round(discretionary_wants, 2),
            "percentage": round(wants_pct, 1),
            "ideal_pct": ideal_wants_pct,
            "status": "Balanced" if wants_pct <= 30 else "Excessive - Room to cut"
        },
        "savings": {
            "amount": round(monthly_savings, 2),
            "percentage": round(savings_pct, 1),
            "ideal_pct": ideal_savings_pct,
            "status": "Strong" if savings_pct >= 20 else "Below Benchmark"
        }
    }

def calculate_bucket_allocation(age: int, risk_profile: str = "moderate", monthly_investible: float = 0.0) -> Dict[str, Any]:
    # Rule of thumb modified by risk tolerance
    # Base equity = max(20, min(80, 110 - age))
    base_equity = max(20, min(80, 110 - age))

    if risk_profile == "conservative":
        equity_pct = max(20, base_equity - 15)
        gold_sgb_pct = 10
        debt_pct = 100 - equity_pct - gold_sgb_pct
    elif risk_profile == "aggressive":
        equity_pct = min(85, base_equity + 10)
        gold_sgb_pct = 5
        debt_pct = 100 - equity_pct - gold_sgb_pct
    else:  # moderate
        equity_pct = base_equity
        gold_sgb_pct = 10
        debt_pct = 100 - equity_pct - gold_sgb_pct

    # Ensure valid percentages
    liquid_cash_pct = 5  # tactical liquid component within portfolio
    debt_pct = max(10, debt_pct - liquid_cash_pct)

    buckets = [
        {
            "name": "Bucket 1: Liquid & Safety",
            "category": "liquid",
            "percentage": liquid_cash_pct,
            "monthly_amount": round((liquid_cash_pct / 100.0) * monthly_investible, 2),
            "suggested_instruments": ["High-Yield Savings", "Liquid Mutual Funds", "Overnight / Ultra Short Duration Funds"],
            "purpose": "Immediate liquidity, emergency refills, zero capital risk",
            "color": "#10b981"
        },
        {
            "name": "Bucket 2: Stability & Preservation",
            "category": "debt_gold",
            "percentage": debt_pct + gold_sgb_pct,
            "monthly_amount": round(((debt_pct + gold_sgb_pct) / 100.0) * monthly_investible, 2),
            "breakdown": {
                "fixed_income_ppf_debt": debt_pct,
                "gold_sgb": gold_sgb_pct
            },
            "suggested_instruments": ["Sovereign Gold Bonds (SGBs) / Gold ETFs", "Public Provident Fund (PPF)", "Corporate Bond / Target Maturity Debt Funds"],
            "purpose": "Capital protection, hedge against rupee inflation, steady compounding",
            "color": "#f59e0b"
        },
        {
            "name": "Bucket 3: Wealth Growth & Equity",
            "category": "equity",
            "percentage": equity_pct,
            "monthly_amount": round((equity_pct / 100.0) * monthly_investible, 2),
            "suggested_instruments": ["Broad Index Funds (Nifty 50, Nifty Next 50)", "Diversified Flexi-cap Mutual Funds", "ELSS (for Old Tax Regime 80C)"],
            "purpose": "Beat long-term inflation, participate in India's macroeconomic growth, compound wealth",
            "color": "#6366f1"
        }
    ]

    return {
        "buckets": buckets,
        "summary": {
            "equity_percentage": equity_pct,
            "debt_percentage": debt_pct,
            "gold_sgb_percentage": gold_sgb_pct,
            "liquid_percentage": liquid_cash_pct
        }
    }

def calculate_sip_projections(monthly_sip: float, expected_cagr: float = 12.0, years: int = 20) -> Dict[str, Any]:
    monthly_rate = (expected_cagr / 100.0) / 12.0
    yearly_data = []

    current_value = 0.0
    total_invested = 0.0

    for year in range(1, years + 1):
        months = year * 12
        if monthly_rate > 0:
            fv = monthly_sip * (((1 + monthly_rate) ** months - 1) / monthly_rate) * (1 + monthly_rate)
        else:
            fv = monthly_sip * months

        total_invested = monthly_sip * months
        wealth_gain = fv - total_invested

        yearly_data.append({
            "year": year,
            "total_invested": round(total_invested, 2),
            "future_value": round(fv, 2),
            "wealth_gain": round(wealth_gain, 2)
        })

    final = yearly_data[-1] if yearly_data else {"future_value": 0, "total_invested": 0, "wealth_gain": 0}
    return {
        "monthly_sip": round(monthly_sip, 2),
        "expected_cagr": expected_cagr,
        "years": years,
        "total_invested": final["total_invested"],
        "future_value": final["future_value"],
        "wealth_gain": final["wealth_gain"],
        "yearly_trajectory": yearly_data
    }

def calculate_fire_freedom(current_age: int, current_monthly_expense: float, current_savings: float = 0.0, monthly_sip: float = 0.0, expected_inflation: float = 6.0, expected_post_retire_roi: float = 8.0, target_freedom_age: int = 50) -> Dict[str, Any]:
    years_to_freedom = max(1, target_freedom_age - current_age)
    
    # Future monthly expenses at target age with inflation
    future_monthly_expense = current_monthly_expense * ((1 + (expected_inflation / 100.0)) ** years_to_freedom)
    future_annual_expense = future_monthly_expense * 12

    # Safe withdrawal rate in India: 3.5% to 4.0% (Corpus = 25x to 30x annual expenses)
    # Using 30x annual expense multiplier for longevity & inflation cushion
    target_corpus = future_annual_expense * 30.0

    # Compounding existing savings to freedom age (assuming 10% balanced portfolio growth)
    future_existing_savings = current_savings * ((1 + 0.10) ** years_to_freedom)

    corpus_shortfall = max(0.0, target_corpus - future_existing_savings)

    # Required monthly SIP to bridge the shortfall
    monthly_rate = 0.12 / 12.0  # 12% equity-led SIP accumulation
    total_months = years_to_freedom * 12

    if corpus_shortfall > 0 and total_months > 0:
        required_monthly_sip = (corpus_shortfall * monthly_rate) / (((1 + monthly_rate) ** total_months - 1) * (1 + monthly_rate))
    else:
        required_monthly_sip = 0.0

    # Current projected corpus with user's current SIP
    if monthly_sip > 0:
        projected_sip_corpus = monthly_sip * (((1 + monthly_rate) ** total_months - 1) / monthly_rate) * (1 + monthly_rate)
    else:
        projected_sip_corpus = 0.0

    total_projected_corpus = future_existing_savings + projected_sip_corpus
    progress_pct = min(100.0, (total_projected_corpus / target_corpus) * 100.0) if target_corpus > 0 else 0.0

    # Monthly passive ROI income generated by target corpus at 7.5% post-tax return
    monthly_passive_income_potential = (target_corpus * 0.075) / 12.0

    return {
        "current_age": current_age,
        "target_freedom_age": target_freedom_age,
        "years_to_freedom": years_to_freedom,
        "future_monthly_expense": round(future_monthly_expense, 2),
        "target_corpus": round(target_corpus, 2),
        "required_monthly_sip": round(required_monthly_sip, 2),
        "current_projected_corpus": round(total_projected_corpus, 2),
        "progress_percentage": round(progress_pct, 1),
        "monthly_passive_income_potential": round(monthly_passive_income_potential, 2),
        "safe_withdrawal_rate": "3.33% (30x annual expenses)"
    }
