# Sarvam Artha (सर्वम् अर्थ)
### AI Personal Financial Well-Being & Sovereign Wealth Navigator

Built with **Sarvam AI** for the Sarvam Buildathon.

Sarvam Artha is a full-featured, fiduciary-grounded personal financial advisory platform designed to help users achieve financial independence, live off investment ROI (FIRE), and build long-term generational wealth while following sound personal finance disciplines.

---

## 🌟 Key Capabilities & Features

### 1. Fiduciary Financial Health & Emergency Fortress
- **Emergency Fund Diagnostic**: Tailored emergency runway (3–6 months for salaried, 6–12 months for volatile income or high dependents) kept in liquid instruments.
- **50/30/20 Budgeting Rule**: Diagnostic breakdown of Needs (fixed expenses), Wants (discretionary spending), and Investments (compounding surplus).
- **Insurance Hygiene Checklist**: Highlights Term Life and Health cover before taking equity risk.

### 2. 3-Bucket Asset Allocation & Living on ROI (FIRE)
- **Bucket 1 (Liquid & Safety)**: High-yield savings, sweep FDs, and liquid mutual funds for immediate liquidity.
- **Bucket 2 (Stability & Sovereign Gold)**: Sovereign Gold Bonds (SGBs / Gold ETFs), PPF, and debt mutual funds for capital preservation and inflation hedging.
- **Bucket 3 (Long-Term Growth & Equity)**: Broad-market index funds (Nifty 50, Nifty Next 50) and flexi-cap mutual funds to compound wealth.
- **Living on ROI (FIRE Calculator)**: Computes the exact target corpus needed to sustain life purely on passive ROI/yield (30x annual expenses cushion).
- **25-Year SIP Compounding Trajectory**: Visualizes compounding curves (Total Invested vs. Future Wealth) using Chart.js.
- **Curated Educational Portals**: Pointers to *Zerodha Varsity*, *Value Research*, *RBI SGB Portal*, and *SEBI Registered Investment Advisors (RIA)*.

### 3. Personal Financial Tracker & AI Expense Doctor
- **Interactive Local Ledger**: Log income and categorized expenses (Housing, Groceries, Dining Out, Subscriptions, Utilities, Shopping, Healthcare).
- **Category Spending Pie Chart**: Real-time breakdown of spending habits.
- **Sarvam AI Expense Doctor**: Audits spending leaks (e.g. food delivery creep, ghost subscriptions), suggests painless cutbacks, and calculates 5-to-10 year compounding gains if redirected to a 12% SIP.

### 4. Multilingual Voice AI Advisor
- **Sarvam 105B Chat Completions (`sarvam-105b-conversations`)**: Conversational advisor answering questions about personal finance, taxes, budgeting, portfolio buckets, and all platform services.
- **Sarvam Saaras STT (`saaras:v4`)**: Multilingual voice recognition. Users can speak in Hindi, English, Bengali, Gujarati, Kannada, Marathi, Punjabi, Tamil, or Telugu.
- **Sarvam Bulbul TTS (`bulbul:v4-flash`)**: Generates natural spoken audio in Indian accents and languages.

---

## 🏗️ Project Architecture

```
Sarvam Buildathon/
├── .env                  # SARVAM_API_KEY
├── .gitignore            # Keeps .env secure
├── requirements.txt      # Python dependencies (FastAPI, Uvicorn, Sarvam SDK)
├── vercel.json           # Vercel serverless configuration
├── run.py                # One-click local runner
├── main.py               # Minimal SDK verification script
├── api/
│   ├── index.py          # FastAPI application & REST endpoints
│   └── services/
│       ├── __init__.py
│       ├── sarvam_service.py  # Sarvam Chat, STT (Saaras), and TTS (Bulbul) integration
│       └── finance_calc.py    # Deterministic financial math (FIRE, SIP, 50/30/20, Buckets)
└── public/
    ├── index.html        # Responsive Single Page Application (Tailwind + Chart.js)
    └── app.js            # Reactive state, charts, voice recording & playback
```

---

## 🚀 Running Locally

1. Ensure dependencies are installed:
   ```bash
   pip install -r requirements.txt
   ```
2. Start the local server:
   ```bash
   python run.py
   ```
3. Open your browser at:
   ```
   http://127.0.0.1:8000
   ```

---

## 🌐 Deploying to Vercel (When You Decide to Push)

The codebase is pre-configured for Vercel's Python serverless runtime:

1. **Initialize Git (if not already done)**:
   ```bash
   git init
   git add .
   git commit -m "Sarvam Artha Financial Platform"
   ```
2. **Push to GitHub / GitLab**.
3. **Import to Vercel**:
   - Go to [Vercel Dashboard](https://vercel.com/new).
   - Import your repository.
4. **Set Environment Variable in Vercel**:
   - Variable Name: `SARVAM_API_KEY`
   - Value: `YOUR_SARVAM_API_KEY`
5. **Deploy**:
   - Vercel automatically builds `api/index.py` using `@vercel/python` and serves the static frontend from `public/`.
