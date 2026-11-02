# Sarvam Artha (सर्वम् अर्थ)
### Open-Ended Personal Finance Manager & AI Strategist

Built with **Sarvam AI** for the Sarvam Buildathon.

Sarvam Artha is an open-ended, general-purpose personal financial manager. It does not mandate or promote any pre-packaged strategy by default. Instead, its recommendations are driven dynamically by the built-in AI reasoning about each individual user's financial profile, obligations, and unique personal goals.

---

## 🌟 Key Capabilities & Features

### 1. Cash Flow & Overview
- **Real-Time Cash Flow Diagnostic**: Tracks monthly net income, mandatory living expenses, discretionary spending, and debt obligations/EMIs.
- **Liquidity & Safety Runway**: Calculates available liquid months of runway without assuming any rigid emergency fund rules.
- **Visual Cashflow Distribution**: Chart.js visualization of inflow allocation and savings rate.

### 2. Goals & Net Worth Tracker
- **Custom Goal Architect**: Define and track any personal financial goal (home down payment, skill education, business launch, retirement, sabbatical, debt clearance).
- **Net Worth Aggregator**: Track customizable assets (Cash, Equities, Fixed Income, Gold/Metals, Real Estate) against liabilities.
- **Growth & Compounding Simulator**: Neutral compounding calculator with user-defined growth rate and horizon.

### 3. Expense Ledger & AI Audit
- **Interactive Expense Ledger**: Log and categorize daily transactions.
- **Spending Distribution Chart**: Dynamic category breakdown.
- **AI Cash Flow Review**: Sarvam AI evaluates outflows from first principles and highlights realistic optimization opportunities.

### 4. Open-Ended AI Strategist & Multilingual Voice
- **Dynamic First-Principles Strategy**: Sarvam AI (`sarvam-105b-conversations`) analyzes the user's specific age, debts, cash flow, and goals, and dynamically suggests whatever frameworks or plans make sense for that user (e.g., envelope budgeting, debt avalanche/snowball, goal-based asset allocation, bucket diversification, barbell allocation, core-satellite, FIRE/safe withdrawal, or custom hybrids) with explicit reasoning.
- **Sarvam Saaras STT (`saaras:v4`)**: Multilingual voice recognition with full support for Marathi (मराठी), Hindi (हिंदी), English, Gujarati, Tamil, Telugu, Bengali, etc.
- **Sarvam Bulbul TTS (`bulbul:v4-flash`)**: Audio voice answers in natural Indian accents and regional languages.

---

## 🏗️ Project Architecture

```
Personal-Finance-Manager/
├── .env                  # SARVAM_API_KEY (git-ignored)
├── .gitignore            # Protects credentials
├── requirements.txt      # Dependencies (FastAPI, Uvicorn, Mangum, Sarvam SDK)
├── netlify.toml          # Netlify serverless routing configuration
├── run.py                # 1-click local development launcher
├── netlify/
│   └── functions/
│       └── api.py        # Netlify serverless function entrypoint (Mangum)
├── api/
│   ├── index.py          # FastAPI application & REST endpoints
│   └── services/
│       ├── __init__.py
│       ├── sarvam_service.py  # Sarvam 105B Chat, Saaras STT & Bulbul TTS
│       └── finance_calc.py    # General-purpose math engine (Cashflow, Net Worth, Goals)
└── public/
    ├── index.html        # Responsive Single Page Application
    └── app.js            # Reactive state, charts, voice recording & playback
```

---

## 🚀 Running Locally

1. Install dependencies:
   ```bash
   pip install -r requirements.txt
   ```
2. Start the local server:
   ```bash
   python run.py
   ```
3. Open:
   ```
   http://127.0.0.1:8000
   ```

---

## 🌐 Deploying to Netlify

1. Push to GitHub:
   ```bash
   git push origin main
   ```
2. In Netlify ([app.netlify.com](https://app.netlify.com)), import `Personal-Finance-Manager`.
3. Add Environment Variable:
   - `SARVAM_API_KEY` = *your Sarvam key*
4. Deploy!
