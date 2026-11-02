"""
General-Purpose Personal Finance Math Engine for Sarvam Artha
Neutral, foundational financial calculations without favoring any prescriptive strategy:
- Cash Flow & Savings Rate
- Debt-to-Income & Financial Runway
- Net Worth & Asset-Liability Aggregation
- Open-Ended Compounding Growth Simulator
- User Goal Feasibility Analysis
"""

from typing import Dict, Any, List

def calculate_cashflow_health(
    monthly_income: float,
    mandatory_expenses: float,
    discretionary_expenses: float,
    debt_obligations: float = 0.0,
    liquid_savings: float = 0.0
) -> Dict[str, Any]:
    total_expenses = mandatory_expenses + discretionary_expenses + debt_obligations
    net_surplus = monthly_income - total_expenses
    
    savings_rate = (net_surplus / monthly_income * 100.0) if monthly_income > 0 else 0.0
    debt_to_income = (debt_obligations / monthly_income * 100.0) if monthly_income > 0 else 0.0
    
    # Runway in months based on mandatory baseline expenses
    runway_months = (liquid_savings / mandatory_expenses) if mandatory_expenses > 0 else 0.0

    return {
        "monthly_income": round(monthly_income, 2),
        "mandatory_expenses": round(mandatory_expenses, 2),
        "discretionary_expenses": round(discretionary_expenses, 2),
        "debt_obligations": round(debt_obligations, 2),
        "total_monthly_outflow": round(total_expenses, 2),
        "net_monthly_surplus": round(net_surplus, 2),
        "savings_rate_pct": round(savings_rate, 1),
        "debt_to_income_pct": round(debt_to_income, 1),
        "liquid_runway_months": round(runway_months, 1),
        "has_surplus": net_surplus > 0
    }

def calculate_net_worth(
    assets: List[Dict[str, Any]],
    liabilities: List[Dict[str, Any]]
) -> Dict[str, Any]:
    total_assets = sum(float(a.get("value", 0.0)) for a in assets)
    total_liabilities = sum(float(l.get("amount", 0.0)) for l in liabilities)
    net_worth = total_assets - total_liabilities

    # Group assets by category for neutral overview
    asset_breakdown = {}
    for a in assets:
        cat = a.get("category", "Other")
        asset_breakdown[cat] = asset_breakdown.get(cat, 0.0) + float(a.get("value", 0.0))

    return {
        "total_assets": round(total_assets, 2),
        "total_liabilities": round(total_liabilities, 2),
        "net_worth": round(net_worth, 2),
        "asset_breakdown": {k: round(v, 2) for k, v in asset_breakdown.items()}
    }

def simulate_growth(
    initial_amount: float,
    monthly_contribution: float,
    annual_growth_pct: float,
    years: int
) -> Dict[str, Any]:
    monthly_rate = (annual_growth_pct / 100.0) / 12.0
    yearly_trajectory = []

    for yr in range(1, years + 1):
        months = yr * 12
        if monthly_rate > 0:
            fv_contributions = monthly_contribution * (((1 + monthly_rate) ** months - 1) / monthly_rate) * (1 + monthly_rate)
            fv_initial = initial_amount * ((1 + monthly_rate) ** months)
            fv_total = fv_initial + fv_contributions
        else:
            fv_total = initial_amount + (monthly_contribution * months)

        total_invested = initial_amount + (monthly_contribution * months)
        wealth_gain = max(0.0, fv_total - total_invested)

        yearly_trajectory.append({
            "year": yr,
            "total_invested": round(total_invested, 2),
            "projected_value": round(fv_total, 2),
            "growth_gain": round(wealth_gain, 2)
        })

    final = yearly_trajectory[-1] if yearly_trajectory else {"projected_value": 0, "total_invested": 0, "growth_gain": 0}
    return {
        "initial_amount": round(initial_amount, 2),
        "monthly_contribution": round(monthly_contribution, 2),
        "annual_growth_pct": annual_growth_pct,
        "years": years,
        "final_projected_value": final["projected_value"],
        "total_capital_contributed": final["total_invested"],
        "total_growth_gain": final["growth_gain"],
        "yearly_trajectory": yearly_trajectory
    }

def evaluate_custom_goals(
    goals: List[Dict[str, Any]],
    available_monthly_surplus: float
) -> Dict[str, Any]:
    processed_goals = []
    total_required_monthly = 0.0

    for g in goals:
        title = g.get("title", "Goal")
        target_amount = float(g.get("target_amount", 0.0))
        current_amount = float(g.get("current_amount", 0.0))
        target_years = max(0.5, float(g.get("target_years", 3.0)))
        expected_roi = float(g.get("expected_roi_pct", 7.0)) / 100.0

        shortfall = max(0.0, target_amount - current_amount)
        months = target_years * 12.0
        monthly_rate = expected_roi / 12.0

        if shortfall <= 0:
            required_monthly = 0.0
        elif monthly_rate > 0:
            required_monthly = (shortfall * monthly_rate) / (((1 + monthly_rate) ** months - 1) * (1 + monthly_rate))
        else:
            required_monthly = shortfall / months

        total_required_monthly += required_monthly
        progress_pct = min(100.0, (current_amount / target_amount * 100.0)) if target_amount > 0 else 0.0

        processed_goals.append({
            "id": g.get("id"),
            "title": title,
            "category": g.get("category", "General"),
            "target_amount": round(target_amount, 2),
            "current_amount": round(current_amount, 2),
            "target_years": target_years,
            "progress_pct": round(progress_pct, 1),
            "required_monthly_savings": round(required_monthly, 2)
        })

    surplus_coverage = (available_monthly_surplus / total_required_monthly * 100.0) if total_required_monthly > 0 else 100.0

    return {
        "goals": processed_goals,
        "total_required_monthly": round(total_required_monthly, 2),
        "available_monthly_surplus": round(available_monthly_surplus, 2),
        "surplus_coverage_pct": round(surplus_coverage, 1),
        "is_fully_funded": available_monthly_surplus >= total_required_monthly
    }
