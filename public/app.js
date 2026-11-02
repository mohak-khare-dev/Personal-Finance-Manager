// Sarvam Artha - Personal Finance Manager & AI Advisor Client Logic

let currentTab = 'tab-cashflow';
let cashflowSplitChart = null;
let assetsSplitChart = null;
let expensePieChart = null;
let chatHistory = [];
let mediaRecorder = null;
let audioChunks = [];
let isRecording = false;

// User data starting empty unless loaded from localStorage
let goals = JSON.parse(localStorage.getItem('sarvam_goals') || '[]');
let assets = JSON.parse(localStorage.getItem('sarvam_assets') || '[]');
let liabilities = JSON.parse(localStorage.getItem('sarvam_liabilities') || '[]');
let expenses = JSON.parse(localStorage.getItem('sarvam_expenses') || '[]');
let latestSpendingAudit = localStorage.getItem('sarvam_audit_analysis') || '';
let latestStrategyRoadmap = localStorage.getItem('sarvam_latest_strategy') || '';

// --- API Endpoint Helper ---
function getApiUrl(path) {
  return path;
}

// --- Initialization ---
document.addEventListener('DOMContentLoaded', () => {
  const dateInput = document.getElementById('exp-date');
  if (dateInput) {
    dateInput.value = new Date().toISOString().split('T')[0];
  }

  loadSavedProfile();
  renderAssetsList();
  recalculateAll();
  renderGoalsList();
  renderExpensesList();
  renderExpensePieChart();
  runSim();

  // Attach reactive listeners to all cashflow inputs for instant auto-calculation
  ['inp-age', 'inp-income', 'inp-mandatory-expense', 'inp-discretionary-expense', 'inp-debt-emi', 'inp-liquid-savings', 'inp-dependents', 'inp-stability', 'inp-risk'].forEach(id => {
    const el = document.getElementById(id);
    if (el) {
      el.addEventListener('input', () => recalculateAll());
      el.addEventListener('change', () => recalculateAll());
    }
  });
});

// --- Tab Switching ---
function switchTab(tabId) {
  currentTab = tabId;
  document.querySelectorAll('.tab-content').forEach(el => el.classList.add('hidden'));
  const activeSection = document.getElementById(tabId);
  if (activeSection) activeSection.classList.remove('hidden');

  document.querySelectorAll('.nav-btn').forEach(btn => {
    btn.classList.remove('text-brand-400', 'bg-slate-800/80');
    btn.classList.add('text-slate-400');
  });

  const activeBtn = document.getElementById(`btn-${tabId}`);
  if (activeBtn) {
    activeBtn.classList.remove('text-slate-400');
    activeBtn.classList.add('text-brand-400', 'bg-slate-800/80');
  }

  if (tabId === 'tab-cashflow' && cashflowSplitChart) {
    setTimeout(() => cashflowSplitChart.resize(), 100);
  } else if (tabId === 'tab-goals' && assetsSplitChart) {
    setTimeout(() => assetsSplitChart.resize(), 100);
  } else if (tabId === 'tab-tracker' && expensePieChart) {
    setTimeout(() => expensePieChart.resize(), 100);
  }
}

// --- Profile & Context Data Management ---
function getProfileData() {
  const ageVal = document.getElementById('inp-age')?.value;
  const incomeVal = document.getElementById('inp-income')?.value;
  const mandatoryVal = document.getElementById('inp-mandatory-expense')?.value;
  const discretionaryVal = document.getElementById('inp-discretionary-expense')?.value;
  const debtVal = document.getElementById('inp-debt-emi')?.value;
  const savingsVal = document.getElementById('inp-liquid-savings')?.value;

  return {
    age: ageVal ? parseInt(ageVal) : null,
    monthly_income: incomeVal ? parseFloat(incomeVal) : 0,
    mandatory_expenses: mandatoryVal ? parseFloat(mandatoryVal) : 0,
    discretionary_expenses: discretionaryVal ? parseFloat(discretionaryVal) : 0,
    monthly_debt_emi: debtVal ? parseFloat(debtVal) : 0,
    liquid_savings: savingsVal ? parseFloat(savingsVal) : 0,
    has_dependents: document.getElementById('inp-dependents')?.value === 'true',
    income_stability: document.getElementById('inp-stability')?.value || 'stable',
    risk_profile: document.getElementById('inp-risk')?.value || 'moderate',
    goals: goals,
    assets: assets,
    liabilities: liabilities
  };
}

function buildFullFinancialContext() {
  const ageVal = document.getElementById('inp-age')?.value;
  const incomeVal = document.getElementById('inp-income')?.value;
  const mandatoryVal = document.getElementById('inp-mandatory-expense')?.value;
  const discretionaryVal = document.getElementById('inp-discretionary-expense')?.value;
  const debtVal = document.getElementById('inp-debt-emi')?.value;
  const savingsVal = document.getElementById('inp-liquid-savings')?.value;
  const hasDependents = document.getElementById('inp-dependents')?.value === 'true';
  const stability = document.getElementById('inp-stability')?.value || 'stable';
  const risk = document.getElementById('inp-risk')?.value || 'moderate';

  const income = parseFloat(incomeVal) || 0;
  const mandatory = parseFloat(mandatoryVal) || 0;
  const discretionary = parseFloat(discretionaryVal) || 0;
  const debt = parseFloat(debtVal) || 0;
  const liquidSavings = parseFloat(savingsVal) || 0;

  const totalOutflows = mandatory + discretionary + debt;
  const surplus = income - totalOutflows;
  const savingsRate = income > 0 ? (surplus / income) * 100 : 0;
  const dti = income > 0 ? (debt / income) * 100 : 0;
  const runwayMonths = mandatory > 0 ? (liquidSavings / mandatory) : 0;

  // Assets & Liabilities Calculations
  const totalAssets = assets.reduce((sum, a) => sum + (parseFloat(a.value) || 0), 0);
  const totalLiabilities = liabilities.reduce((sum, l) => sum + (parseFloat(l.amount) || 0), 0);
  const netWorth = totalAssets - totalLiabilities;
  const debtToAssetPct = totalAssets > 0 ? (totalLiabilities / totalAssets) * 100 : 0;

  const assetCats = {};
  assets.forEach(a => {
    assetCats[a.category] = (assetCats[a.category] || 0) + (parseFloat(a.value) || 0);
  });
  const assetCatSummary = Object.keys(assetCats).map(cat => `${cat}: ₹${formatCurrency(assetCats[cat])}`).join(', ') || 'No assets categorized';

  const assetDetails = assets.map(a => `- Asset: ${a.title} (Category: ${a.category}, Value: ₹${formatCurrency(a.value)})`).join('\n');
  const liabilityDetails = liabilities.map(l => `- Debt: ${l.title} (Amount: ₹${formatCurrency(l.amount)})`).join('\n');

  // Goals Feasibility & Compound Savings Calculations
  let totalGoalMonthlyNeeded = 0;
  const goalsSummary = goals.map(g => {
    const target = parseFloat(g.target_amount) || 0;
    const current = parseFloat(g.current_amount) || 0;
    const years = parseFloat(g.target_years) || 1;
    const roi = parseFloat(g.expected_roi_pct) || 6.0;
    const shortfall = Math.max(0, target - current);
    const months = years * 12;
    const r = (roi / 100) / 12;
    let reqMonthly = 0;
    if (shortfall > 0) {
      if (r > 0) {
        reqMonthly = (shortfall * r) / (((1 + r) ** months - 1) * (1 + r));
      } else {
        reqMonthly = shortfall / months;
      }
    }
    totalGoalMonthlyNeeded += reqMonthly;
    const pct = target > 0 ? Math.min(100, Math.round((current / target) * 100)) : 0;
    return `- Goal "${g.title}": Target ₹${formatCurrency(target)} in ${years} yrs | Current Saved: ₹${formatCurrency(current)} (${pct}%) | Required Monthly SIP: ₹${formatCurrency(reqMonthly)}`;
  }).join('\n');

  // Website Goal Feasibility Analysis
  let goalFeasibility = "No goals added yet.";
  if (goals.length > 0) {
    if (income === 0) {
      goalFeasibility = `Total monthly investment needed across all goals is ₹${formatCurrency(totalGoalMonthlyNeeded)}/mo. (Income/surplus not yet entered to evaluate affordability).`;
    } else if (surplus <= 0) {
      goalFeasibility = `Deficit Alert: Goals require ₹${formatCurrency(totalGoalMonthlyNeeded)}/mo, but current monthly cash flow is in deficit by ₹${formatCurrency(Math.abs(surplus))}/mo. Website recommendation: focus first on stabilizing cash flow and reducing non-essential expenses before committing to goals.`;
    } else if (surplus < totalGoalMonthlyNeeded) {
      const gap = totalGoalMonthlyNeeded - surplus;
      goalFeasibility = `Funding Shortfall Warning: Goals require ₹${formatCurrency(totalGoalMonthlyNeeded)}/mo, but available monthly surplus is only ₹${formatCurrency(surplus)}/mo (funding shortfall of ₹${formatCurrency(gap)}/mo). Website recommendation: prioritize high-urgency safety goals first or extend target timelines on secondary goals.`;
    } else {
      const excess = surplus - totalGoalMonthlyNeeded;
      goalFeasibility = `Fully Fundable: Available surplus of ₹${formatCurrency(surplus)}/mo comfortably covers the required ₹${formatCurrency(totalGoalMonthlyNeeded)}/mo across all goals, with ₹${formatCurrency(excess)}/mo unallocated cash flow remaining.`;
    }
  }

  // Website Emergency Runway Assessment
  let runwayDiagnostic = "Not established (liquid savings or mandatory living costs not entered).";
  if (mandatory > 0) {
    if (runwayMonths < 3) {
      runwayDiagnostic = `Critical (Only ${runwayMonths.toFixed(1)} months): Emergency reserves of ₹${formatCurrency(liquidSavings)} fall short of the recommended 6-month buffer (₹${formatCurrency(mandatory * 6)}). Website recommendation: prioritize building liquid reserves before committing to illiquid investments.`;
    } else if (runwayMonths < 6) {
      runwayDiagnostic = `Moderate (${runwayMonths.toFixed(1)} months): Emergency reserve covers living costs for ${runwayMonths.toFixed(1)} months, below the optimal 6-month target of ₹${formatCurrency(mandatory * 6)}.`;
    } else {
      runwayDiagnostic = `Healthy (${runwayMonths.toFixed(1)} months): Ample liquid cushion covering ₹${formatCurrency(liquidSavings)} against ₹${formatCurrency(mandatory)}/mo mandatory costs.`;
    }
  }

  // Website Debt Stress Assessment
  let debtDiagnostic = "Low / None entered.";
  if (income > 0) {
    if (dti > 40) {
      debtDiagnostic = `High Debt Stress Warning (${dti.toFixed(1)}% DTI): Monthly EMIs of ₹${formatCurrency(debt)} exceed the healthy 40% income threshold. Website recommendation: accelerate high-interest debt paydown before aggressive investing.`;
    } else if (dti > 20) {
      debtDiagnostic = `Moderate (${dti.toFixed(1)}% DTI): Manageable debt level consuming ₹${formatCurrency(debt)}/mo.`;
    } else if (debt > 0) {
      debtDiagnostic = `Low (${dti.toFixed(1)}% DTI): Well within safe bounds.`;
    }
  }

  // User Tracked Expenses Breakdown
  let expenseLogSummary = "No expenses logged in tracker.";
  if (expenses.length > 0) {
    const totalSpent = expenses.reduce((s, e) => s + (parseFloat(e.amount) || 0), 0);
    const expCats = {};
    expenses.forEach(e => {
      expCats[e.category] = (expCats[e.category] || 0) + (parseFloat(e.amount) || 0);
    });
    const expCatText = Object.keys(expCats).map(c => `${c}: ₹${formatCurrency(expCats[c])}`).join(', ');
    expenseLogSummary = `Total logged spending: ₹${formatCurrency(totalSpent)} across ${expenses.length} entries. Category breakdown: ${expCatText}.`;
  }

  // Compounding Simulator Settings & Output
  const simMonthly = parseFloat(document.getElementById('sim-monthly')?.value) || 0;
  const simRate = parseFloat(document.getElementById('sim-rate')?.value) || 0;
  const simYears = parseInt(document.getElementById('sim-years')?.value) || 0;
  const simResult = document.getElementById('sim-result-value')?.textContent || '₹0';
  let simSummary = `SIP ₹${formatCurrency(simMonthly)}/mo at ${simRate}% for ${simYears} years -> Projected Corpus: ${simResult}`;

  // Unified, comprehensive financial context string
  return `
[USER-ENTERED FINANCIAL INFORMATION & WEBSITE-GENERATED DIAGNOSTICS]

1. USER PROFILE:
- Age: ${ageVal ? ageVal : 'Not specified by user'}
- Dependents: ${hasDependents ? 'Yes' : 'No'}
- Income Stability: ${stability}
- Risk Appetite: ${risk}

2. USER CASH FLOW (USER-ENTERED):
- Monthly In-Hand Net Income: ₹${formatCurrency(income)} ${income === 0 ? '(Not yet entered by user)' : ''}
- Mandatory Living Expenses: ₹${formatCurrency(mandatory)}
- Discretionary Lifestyle Expenses: ₹${formatCurrency(discretionary)}
- Monthly Debt / Loan EMIs: ₹${formatCurrency(debt)}
- Total Monthly Outflows: ₹${formatCurrency(totalOutflows)}
- Liquid Emergency Savings: ₹${formatCurrency(liquidSavings)}

3. WEBSITE-GENERATED CASH FLOW DIAGNOSTICS & ALERTS:
- Net Monthly Surplus: ₹${formatCurrency(surplus)} ${income > 0 ? `(Savings Rate: ${savingsRate.toFixed(1)}%)` : ''}
- Emergency Runway: ${runwayDiagnostic}
- Debt-to-Income (DTI): ${debtDiagnostic}

4. USER BALANCE SHEET & WEBSITE-GENERATED NET WORTH:
- Total Assets (${assets.length} items): ₹${formatCurrency(totalAssets)}
  Breakdown by Category: ${assetCatSummary}
${assetDetails || '  (No individual asset items entered)'}
- Total Liabilities (${liabilities.length} items): ₹${formatCurrency(totalLiabilities)}
${liabilityDetails || '  (No individual debt items entered)'}
- Net Worth: ₹${formatCurrency(netWorth)} (Debt-to-Asset Ratio: ${debtToAssetPct.toFixed(1)}%)

5. USER FINANCIAL GOALS & WEBSITE FEASIBILITY ANALYSIS:
${goalsSummary || 'No custom goals added yet by user.'}
- Total Monthly Investment Needed Across All Goals: ₹${formatCurrency(totalGoalMonthlyNeeded)}/mo
- Website Feasibility Assessment: ${goalFeasibility}

6. EXPENSE TRACKER & RECENT AUDIT FINDINGS:
- Logged Tracker: ${expenseLogSummary}
- Website Expense Doctor / Spending Leak Audit: ${latestSpendingAudit ? latestSpendingAudit : 'Not run yet.'}

7. COMPOUNDING SIMULATOR SETTINGS:
- ${simSummary}

8. WEBSITE-GENERATED STRATEGY ROADMAP:
- ${latestStrategyRoadmap ? latestStrategyRoadmap : 'Not formulated yet by user.'}
`.trim();
}

function saveProfile(data) {
  localStorage.setItem('sarvam_profile_clean', JSON.stringify(data));
}

function loadSavedProfile() {
  const saved = localStorage.getItem('sarvam_profile_clean');
  if (saved) {
    try {
      const p = JSON.parse(saved);
      if (p.age) document.getElementById('inp-age').value = p.age;
      if (p.monthly_income) document.getElementById('inp-income').value = p.monthly_income;
      if (p.mandatory_expenses) document.getElementById('inp-mandatory-expense').value = p.mandatory_expenses;
      if (p.discretionary_expenses) document.getElementById('inp-discretionary-expense').value = p.discretionary_expenses;
      if (p.monthly_debt_emi !== undefined && p.monthly_debt_emi !== null) document.getElementById('inp-debt-emi').value = p.monthly_debt_emi;
      if (p.liquid_savings !== undefined && p.liquid_savings !== null) document.getElementById('inp-liquid-savings').value = p.liquid_savings;
      if (p.has_dependents !== undefined) document.getElementById('inp-dependents').value = String(p.has_dependents);
      if (p.income_stability) document.getElementById('inp-stability').value = p.income_stability;
      if (p.risk_profile) document.getElementById('inp-risk').value = p.risk_profile;
    } catch (e) {
      console.warn("Could not parse saved profile", e);
    }
  }
}

async function recalculateAll() {
  const profile = getProfileData();
  saveProfile(profile);

  // If user hasn't entered income or expenses, show blank state
  if (profile.monthly_income <= 0 && profile.mandatory_expenses <= 0) {
    renderEmptyMetrics();
    return;
  }

  try {
    const res = await fetch(getApiUrl('/api/profile/calculate'), {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(profile)
    });
    
    if (!res.ok) {
      calculateLocallyFallback(profile);
      return;
    }

    const data = await res.json();
    updateUIWithCalculations(data);
  } catch (err) {
    calculateLocallyFallback(profile);
  }
}

function renderEmptyMetrics() {
  document.getElementById('metric-surplus').textContent = '--';
  document.getElementById('metric-savings-rate').textContent = '--';
  document.getElementById('metric-runway').textContent = '--';
  document.getElementById('badge-debt-ratio').textContent = 'DTI: --';

  const totalAssets = assets.reduce((sum, a) => sum + (parseFloat(a.value) || 0), 0);
  const totalDebts = liabilities.reduce((sum, l) => sum + (parseFloat(l.amount) || 0), 0);

  document.getElementById('networth-assets').textContent = `₹${formatCr(totalAssets)}`;
  document.getElementById('networth-debts').textContent = `₹${formatCr(totalDebts)}`;
  document.getElementById('networth-total').textContent = `₹${formatCr(totalAssets - totalDebts)}`;

  renderCashflowSplitChart({ mandatory_expenses: 0, discretionary_expenses: 0, debt_obligations: 0, net_monthly_surplus: 0 });
  renderAssetsSplitChart({ total_assets: totalAssets });
  renderAssetsList();
}

function calculateLocallyFallback(profile) {
  const totalOutflows = profile.mandatory_expenses + profile.discretionary_expenses + profile.monthly_debt_emi;
  const surplus = profile.monthly_income - totalOutflows;
  const savingsRate = profile.monthly_income > 0 ? (surplus / profile.monthly_income * 100) : 0;
  const dti = profile.monthly_income > 0 ? (profile.monthly_debt_emi / profile.monthly_income * 100) : 0;
  const runway = profile.mandatory_expenses > 0 ? (profile.liquid_savings / profile.mandatory_expenses) : 0;

  const totalAssets = assets.reduce((sum, a) => sum + (parseFloat(a.value) || 0), 0);
  const totalDebts = liabilities.reduce((sum, l) => sum + (parseFloat(l.amount) || 0), 0);

  updateUIWithCalculations({
    cashflow: {
      net_monthly_surplus: surplus,
      savings_rate_pct: Math.round(savingsRate * 10) / 10,
      debt_to_income_pct: Math.round(dti * 10) / 10,
      liquid_runway_months: Math.round(runway * 10) / 10,
      mandatory_expenses: profile.mandatory_expenses,
      discretionary_expenses: profile.discretionary_expenses,
      debt_obligations: profile.monthly_debt_emi
    },
    net_worth: {
      total_assets: totalAssets,
      total_liabilities: totalDebts,
      net_worth: totalAssets - totalDebts,
      asset_breakdown: {}
    }
  });
}

function updateUIWithCalculations(data) {
  const cf = data.cashflow;
  const nw = data.net_worth;

  const surplusEl = document.getElementById('metric-surplus');
  const srEl = document.getElementById('metric-savings-rate');
  const runwayEl = document.getElementById('metric-runway');
  const dtiBadge = document.getElementById('badge-debt-ratio');

  if (surplusEl) {
    surplusEl.textContent = `₹${formatCurrency(cf.net_monthly_surplus)}`;
    surplusEl.className = cf.net_monthly_surplus >= 0 ? 'text-2xl font-extrabold text-emerald-400' : 'text-2xl font-extrabold text-rose-400';
  }
  if (srEl) srEl.textContent = `${cf.savings_rate_pct}%`;
  if (runwayEl) runwayEl.textContent = `${cf.liquid_runway_months} Mo`;
  if (dtiBadge) dtiBadge.textContent = `DTI: ${cf.debt_to_income_pct}%`;

  const nwAssetsEl = document.getElementById('networth-assets');
  const nwDebtsEl = document.getElementById('networth-debts');
  const nwTotalEl = document.getElementById('networth-total');

  if (nwAssetsEl) nwAssetsEl.textContent = `₹${formatCr(nw.total_assets)}`;
  if (nwDebtsEl) nwDebtsEl.textContent = `₹${formatCr(nw.total_liabilities)}`;
  if (nwTotalEl) {
    nwTotalEl.textContent = `₹${formatCr(nw.net_worth)}`;
    nwTotalEl.className = nw.net_worth >= 0 ? 'text-sm font-extrabold text-white' : 'text-sm font-extrabold text-rose-400';
  }

  renderCashflowSplitChart(cf);
  renderAssetsSplitChart(nw);
  renderAssetsList();
}

// --- Chart Renderers ---

function renderCashflowSplitChart(cf) {
  const ctx = document.getElementById('chart-cashflow-split');
  if (!ctx) return;

  if (cashflowSplitChart) cashflowSplitChart.destroy();

  const surplus = Math.max(0, cf.net_monthly_surplus || 0);
  const mandatory = cf.mandatory_expenses || 0;
  const discretionary = cf.discretionary_expenses || 0;
  const debt = cf.debt_obligations || 0;

  const total = surplus + mandatory + discretionary + debt;
  const dataValues = total > 0 ? [mandatory, discretionary, debt, surplus] : [1];
  const labels = total > 0 ? ['Mandatory Living', 'Discretionary', 'Debt EMIs', 'Surplus'] : ['No Data Entered'];
  const colors = total > 0 ? ['#3b82f6', '#f59e0b', '#ef4444', '#10b981'] : ['#334155'];

  cashflowSplitChart = new Chart(ctx, {
    type: 'doughnut',
    data: {
      labels: labels,
      datasets: [{
        data: dataValues,
        backgroundColor: colors,
        borderWidth: 2,
        borderColor: '#0b1120',
        hoverOffset: 6
      }]
    },
    options: {
      responsive: true,
      maintainAspectRatio: false,
      plugins: {
        legend: {
          position: 'right',
          labels: { color: '#cbd5e1', font: { size: 11, family: 'Plus Jakarta Sans' } }
        },
        tooltip: {
          callbacks: {
            label: function(c) {
              return total > 0 ? ` ${c.label}: ₹${formatCurrency(c.raw)}` : ' Enter your profile numbers';
            }
          }
        }
      },
      cutout: '65%'
    }
  });
}

function renderAssetsSplitChart(nw) {
  const ctx = document.getElementById('chart-assets-split');
  if (!ctx) return;

  if (assetsSplitChart) assetsSplitChart.destroy();

  const cats = {};
  assets.forEach(a => {
    cats[a.category] = (cats[a.category] || 0) + (parseFloat(a.value) || 0);
  });

  const labels = Object.keys(cats).length > 0 ? Object.keys(cats) : ['No Assets Added'];
  const data = Object.keys(cats).length > 0 ? Object.values(cats) : [1];

  assetsSplitChart = new Chart(ctx, {
    type: 'pie',
    data: {
      labels: labels,
      datasets: [{
        data: data,
        backgroundColor: ['#10b981', '#6366f1', '#f59e0b', '#ec4899', '#06b6d4', '#64748b'],
        borderWidth: 2,
        borderColor: '#0b1120'
      }]
    },
    options: {
      responsive: true,
      maintainAspectRatio: false,
      plugins: {
        legend: { display: false },
        tooltip: {
          callbacks: {
            label: function(c) {
              return ` ${c.label}: ₹${formatCurrency(c.raw)}`;
            }
          }
        }
      }
    }
  });
}

function renderExpensePieChart() {
  const ctx = document.getElementById('chart-expense-pie');
  if (!ctx) return;

  if (expensePieChart) expensePieChart.destroy();

  const categories = {};
  let total = 0;
  expenses.forEach(e => {
    categories[e.category] = (categories[e.category] || 0) + e.amount;
    total += e.amount;
  });

  const labels = Object.keys(categories);
  const data = Object.values(categories);

  const colors = [
    '#3b82f6', '#10b981', '#f59e0b', '#ef4444', 
    '#8b5cf6', '#06b6d4', '#ec4899', '#14b8a6', '#64748b'
  ];

  expensePieChart = new Chart(ctx, {
    type: 'pie',
    data: {
      labels: labels.length > 0 ? labels : ['No Expenses Logged'],
      datasets: [{
        data: data.length > 0 ? data : [1],
        backgroundColor: data.length > 0 ? colors.slice(0, labels.length) : ['#334155'],
        borderWidth: 2,
        borderColor: '#0b1120'
      }]
    },
    options: {
      responsive: true,
      maintainAspectRatio: false,
      plugins: {
        legend: { display: false },
        tooltip: {
          callbacks: {
            label: function(c) {
              const pct = total > 0 ? Math.round((c.raw / total) * 100) : 0;
              return total > 0 ? ` ${c.label}: ₹${formatCurrency(c.raw)} (${pct}%)` : ' No items';
            }
          }
        }
      }
    }
  });

  const totalDisplay = document.getElementById('expense-total-display');
  if (totalDisplay) {
    totalDisplay.innerHTML = `Total Logged: <span class="font-bold text-white text-sm">₹${formatCurrency(total)}</span>`;
  }
}

// --- Compounding Simulator ---
function runSim() {
  const monthly = parseFloat(document.getElementById('sim-monthly')?.value) || 0;
  const rate = parseFloat(document.getElementById('sim-rate')?.value) || 0;
  const years = parseInt(document.getElementById('sim-years')?.value) || 0;

  if (monthly <= 0 || rate <= 0 || years <= 0) {
    document.getElementById('sim-result-value').textContent = '₹0';
    return;
  }

  const monthlyRate = (rate / 100) / 12;
  const months = years * 12;
  let fv = 0;
  if (monthlyRate > 0) {
    fv = monthly * (((1 + monthlyRate) ** months - 1) / monthlyRate) * (1 + monthlyRate);
  } else {
    fv = monthly * months;
  }

  const resEl = document.getElementById('sim-result-value');
  if (resEl) {
    resEl.textContent = `₹${formatCr(fv)}`;
  }
}

// --- Goals Management ---
function renderGoalsList() {
  const container = document.getElementById('goals-container');
  if (!container) return;

  container.innerHTML = '';
  if (goals.length === 0) {
    container.innerHTML = `<div class="p-6 text-center text-slate-500 text-xs">No personal goals added yet. Click "Add Goal" above to create one.</div>`;
    document.getElementById('txt-goals-total-needed').textContent = '₹0/mo';
    return;
  }

  let totalNeeded = 0;

  goals.forEach(g => {
    const shortfall = Math.max(0, g.target_amount - g.current_amount);
    const months = (g.target_years || 1) * 12;
    const r = ((g.expected_roi_pct || 6) / 100) / 12;
    let reqMonthly = 0;
    if (shortfall > 0) {
      if (r > 0) {
        reqMonthly = (shortfall * r) / (((1 + r) ** months - 1) * (1 + r));
      } else {
        reqMonthly = shortfall / months;
      }
    }
    totalNeeded += reqMonthly;

    const pct = g.target_amount > 0 ? Math.min(100, Math.round((g.current_amount / g.target_amount) * 100)) : 0;

    const card = document.createElement('div');
    card.className = 'p-4 rounded-xl bg-slate-900 border border-slate-800 space-y-2';
    card.innerHTML = `
      <div class="flex items-center justify-between">
        <div>
          <span class="font-bold text-white text-xs">${escapeHtml(g.title)}</span>
          <span class="text-[10px] text-slate-400 ml-2">(${g.target_years} Yrs Timeline)</span>
        </div>
        <div class="flex items-center space-x-2">
          <span class="text-xs font-bold text-emerald-400">₹${formatCurrency(reqMonthly)}/mo</span>
          <button onclick="deleteGoal('${g.id}')" class="text-slate-500 hover:text-red-400 transition" title="Delete">
            <i class="ph ph-trash"></i>
          </button>
        </div>
      </div>
      <div class="flex justify-between text-[11px] text-slate-400">
        <span>Saved: ₹${formatCurrency(g.current_amount)}</span>
        <span>Target: ₹${formatCurrency(g.target_amount)}</span>
      </div>
      <div class="w-full bg-slate-800 h-1.5 rounded-full overflow-hidden">
        <div class="bg-brand-500 h-full rounded-full" style="width: ${pct}%"></div>
      </div>
    `;
    container.appendChild(card);
  });

  const totalEl = document.getElementById('txt-goals-total-needed');
  if (totalEl) totalEl.textContent = `₹${formatCurrency(totalNeeded)}/mo`;
}

function handleAddGoal() {
  const title = document.getElementById('modal-goal-title').value.trim();
  const target = parseFloat(document.getElementById('modal-goal-target').value);
  const current = parseFloat(document.getElementById('modal-goal-current').value) || 0;
  const years = parseFloat(document.getElementById('modal-goal-years').value) || 3;
  const roi = parseFloat(document.getElementById('modal-goal-roi').value) || 7.0;

  if (!title || !target) return;

  goals.push({
    id: Date.now().toString(),
    title,
    target_amount: target,
    current_amount: current,
    target_years: years,
    expected_roi_pct: roi,
    category: 'Custom'
  });

  localStorage.setItem('sarvam_goals', JSON.stringify(goals));
  closeAddGoalModal();
  renderGoalsList();
  recalculateAll();
}

function deleteGoal(id) {
  goals = goals.filter(g => g.id !== id);
  localStorage.setItem('sarvam_goals', JSON.stringify(goals));
  renderGoalsList();
  recalculateAll();
}

function showAddGoalModal() {
  document.getElementById('modal-add-goal').classList.remove('hidden');
}
function closeAddGoalModal() {
  document.getElementById('modal-add-goal').classList.add('hidden');
}

// --- Asset / Liability Management ---
function showAssetModal() {
  document.getElementById('modal-add-asset').classList.remove('hidden');
}
function closeAssetModal() {
  document.getElementById('modal-add-asset').classList.add('hidden');
}

function renderAssetsList() {
  const container = document.getElementById('assets-list-container');
  if (!container) return;

  container.innerHTML = '';
  if (assets.length === 0 && liabilities.length === 0) {
    container.innerHTML = `<div class="text-center text-slate-500 py-2 text-[11px]">No individual assets or debts logged yet. Click "+ Add Asset/Debt" above.</div>`;
    return;
  }

  assets.forEach(a => {
    const row = document.createElement('div');
    row.className = 'flex items-center justify-between p-1.5 rounded-lg bg-slate-900/60 border border-slate-800/80';
    row.innerHTML = `
      <div class="truncate pr-2">
        <span class="text-emerald-400 font-semibold">[Asset]</span>
        <span class="text-slate-200 ml-1 font-medium">${escapeHtml(a.title)}</span>
        <span class="text-[10px] text-slate-500 ml-1">(${escapeHtml(a.category || 'Asset')})</span>
      </div>
      <div class="flex items-center space-x-2 flex-shrink-0">
        <span class="font-bold text-emerald-400 text-xs">₹${formatCurrency(a.value)}</span>
        <button onclick="deleteAsset('${a.id}')" class="text-slate-500 hover:text-red-400 transition" title="Delete">
          <i class="ph ph-trash"></i>
        </button>
      </div>
    `;
    container.appendChild(row);
  });

  liabilities.forEach(l => {
    const row = document.createElement('div');
    row.className = 'flex items-center justify-between p-1.5 rounded-lg bg-slate-900/60 border border-slate-800/80';
    row.innerHTML = `
      <div class="truncate pr-2">
        <span class="text-rose-400 font-semibold">[Debt]</span>
        <span class="text-slate-200 ml-1 font-medium">${escapeHtml(l.title)}</span>
      </div>
      <div class="flex items-center space-x-2 flex-shrink-0">
        <span class="font-bold text-rose-400 text-xs">₹${formatCurrency(l.amount)}</span>
        <button onclick="deleteLiability('${l.id}')" class="text-slate-500 hover:text-red-400 transition" title="Delete">
          <i class="ph ph-trash"></i>
        </button>
      </div>
    `;
    container.appendChild(row);
  });
}

function deleteAsset(id) {
  assets = assets.filter(a => a.id !== id);
  localStorage.setItem('sarvam_assets', JSON.stringify(assets));
  renderAssetsList();
  recalculateAll();
}

function deleteLiability(id) {
  liabilities = liabilities.filter(l => l.id !== id);
  localStorage.setItem('sarvam_liabilities', JSON.stringify(liabilities));
  renderAssetsList();
  recalculateAll();
}

function handleAddAsset() {
  const type = document.getElementById('modal-asset-type').value;
  const title = document.getElementById('modal-asset-title').value.trim();
  const category = document.getElementById('modal-asset-category').value;
  const val = parseFloat(document.getElementById('modal-asset-value').value);

  if (!title || isNaN(val)) return;

  if (type === 'asset') {
    assets.push({ id: Date.now().toString(), title, category, value: val });
    localStorage.setItem('sarvam_assets', JSON.stringify(assets));
  } else {
    liabilities.push({ id: Date.now().toString(), title, amount: val, monthly_emi: 0 });
    localStorage.setItem('sarvam_liabilities', JSON.stringify(liabilities));
  }

  closeAssetModal();
  renderAssetsList();
  recalculateAll();
}

// --- Expense Management ---
function renderExpensesList() {
  const tbody = document.getElementById('expense-table-body');
  const countEl = document.getElementById('count-expenses');
  if (!tbody) return;

  tbody.innerHTML = '';
  if (countEl) countEl.textContent = expenses.length;

  if (expenses.length === 0) {
    tbody.innerHTML = `<tr><td colspan="5" class="py-6 text-center text-slate-500">No transactions logged yet. Add your first entry above.</td></tr>`;
    return;
  }

  expenses.forEach(e => {
    const tr = document.createElement('tr');
    tr.className = 'hover:bg-slate-900/40 transition';
    tr.innerHTML = `
      <td class="py-2.5 px-3 text-slate-400 whitespace-nowrap">${e.date || '-'}</td>
      <td class="py-2.5 px-3 font-medium text-slate-200">${escapeHtml(e.category)}</td>
      <td class="py-2.5 px-3 text-slate-400 max-w-xs truncate">${escapeHtml(e.description || '-')}</td>
      <td class="py-2.5 px-3 text-right font-bold text-emerald-400 whitespace-nowrap">₹${formatCurrency(e.amount)}</td>
      <td class="py-2.5 px-3 text-center">
        <button onclick="deleteExpense('${e.id}')" class="text-slate-500 hover:text-red-400 transition" title="Delete">
          <i class="ph ph-trash"></i>
        </button>
      </td>
    `;
    tbody.appendChild(tr);
  });
}

function handleAddExpense() {
  const category = document.getElementById('exp-category').value;
  const amount = parseFloat(document.getElementById('exp-amount').value);
  const date = document.getElementById('exp-date').value;
  const desc = document.getElementById('exp-desc').value;

  if (!amount || amount <= 0) return;

  const newExpense = {
    id: Date.now().toString(),
    category,
    amount,
    date,
    description: desc
  };

  expenses.unshift(newExpense);
  localStorage.setItem('sarvam_expenses', JSON.stringify(expenses));

  document.getElementById('exp-amount').value = '';
  document.getElementById('exp-desc').value = '';

  renderExpensesList();
  renderExpensePieChart();
}

function deleteExpense(id) {
  expenses = expenses.filter(e => e.id !== id);
  localStorage.setItem('sarvam_expenses', JSON.stringify(expenses));
  renderExpensesList();
  renderExpensePieChart();
}

// --- AI Expense Audit ---
async function auditExpensesWithAI() {
  const resultBox = document.getElementById('ai-doctor-result');
  const btn = document.getElementById('btn-audit-expenses');
  const income = parseFloat(document.getElementById('inp-income')?.value) || 0;

  if (!resultBox) return;

  btn.disabled = true;
  btn.innerHTML = `<i class="ph ph-spinner animate-spin"></i><span>Reviewing...</span>`;
  resultBox.textContent = "Analyzing spending patterns...";

  try {
    const res = await fetch(getApiUrl('/api/advisor/audit-expenses'), {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ expenses, monthly_income: income })
    });
    
    if (!res.ok) {
      const text = await res.text();
      resultBox.textContent = parseResponseError(res.status, text);
      return;
    }

    const data = await res.json();
    const auditText = data.audit_analysis || "No recommendations generated.";
    resultBox.textContent = auditText;
    latestSpendingAudit = auditText;
    localStorage.setItem('sarvam_audit_analysis', latestSpendingAudit);
  } catch (err) {
    resultBox.textContent = `Error: ${err.message}`;
  } finally {
    btn.disabled = false;
    btn.innerHTML = `<i class="ph ph-sparkle text-sm"></i><span>Audit My Expenses</span>`;
  }
}

// --- Dynamic AI Strategy Generator ---
async function triggerAiStrategy() {
  switchTab('tab-advisor');
  const btn = document.getElementById('btn-generate-strat');
  if (btn) {
    btn.disabled = true;
    btn.innerHTML = `<i class="ph ph-spinner animate-spin"></i><span>Formulating Plan...</span>`;
  }

  const profile = getProfileData();
  appendChatMessage('user', 'Please formulate a personalized financial plan based on my current profile, cash flow, and goals.');

  const loadingDiv = document.createElement('div');
  loadingDiv.id = 'chat-loading-indicator';
  loadingDiv.className = 'flex items-center space-x-2 text-xs text-slate-400 pl-11';
  loadingDiv.innerHTML = `<span class="w-2 h-2 rounded-full bg-brand-400 animate-ping"></span><span>Evaluating profile & goals...</span>`;
  document.getElementById('chat-messages').appendChild(loadingDiv);
  document.getElementById('chat-messages').scrollTop = document.getElementById('chat-messages').scrollHeight;

  try {
    const res = await fetch(getApiUrl('/api/advisor/strategy'), {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ profile })
    });

    loadingDiv.remove();

    if (!res.ok) {
      const text = await res.text();
      appendChatMessage('assistant', parseResponseError(res.status, text));
      return;
    }

    const data = await res.json();
    if (data.strategy) {
      appendChatMessage('assistant', data.strategy);
      chatHistory.push({ role: 'assistant', content: data.strategy });
      latestStrategyRoadmap = data.strategy;
      localStorage.setItem('sarvam_latest_strategy', latestStrategyRoadmap);
    }
  } catch (err) {
    loadingDiv.remove();
    appendChatMessage('assistant', `Could not reach advisor: ${err.message}`);
  } finally {
    if (btn) {
      btn.disabled = false;
      btn.innerHTML = `<i class="ph ph-brain text-sm"></i><span>Formulate My Strategy</span>`;
    }
  }
}

// --- Conversational & Multilingual Voice AI ---

function appendChatMessage(role, content, audioBase64 = null) {
  const container = document.getElementById('chat-messages');
  if (!container) return;

  const isUser = role === 'user';
  const msgDiv = document.createElement('div');
  msgDiv.className = `flex items-start space-x-3 ${isUser ? 'justify-end' : ''}`;

  let audioButtonHtml = '';
  if (audioBase64) {
    audioButtonHtml = `
      <button onclick="playTTSAudio('${audioBase64}')" class="mt-2 inline-flex items-center space-x-1.5 px-2.5 py-1 rounded-lg bg-brand-500/10 hover:bg-brand-500/20 text-brand-400 border border-brand-500/30 text-xs transition">
        <i class="ph ph-speaker-high text-sm"></i>
        <span>Listen to Answer</span>
      </button>
    `;
  }

  if (isUser) {
    msgDiv.innerHTML = `
      <div class="max-w-[85%] rounded-2xl rounded-tr-none p-3.5 bg-brand-600 text-white text-xs sm:text-sm shadow-sm">
        ${escapeHtml(content)}
      </div>
      <div class="w-8 h-8 rounded-lg bg-brand-700 text-white flex items-center justify-center font-bold flex-shrink-0 text-xs">
        ME
      </div>
    `;
  } else {
    msgDiv.innerHTML = `
      <div class="w-8 h-8 rounded-lg bg-brand-500/20 text-brand-400 flex items-center justify-center font-bold flex-shrink-0 text-xs">
        SA
      </div>
      <div class="max-w-[85%] rounded-2xl rounded-tl-none p-4 bg-slate-900 border border-slate-800 text-xs sm:text-sm text-slate-200 space-y-1 shadow-sm leading-relaxed whitespace-pre-line">
        ${formatMarkdown(content)}
        ${audioButtonHtml}
      </div>
    `;
  }

  container.appendChild(msgDiv);
  container.scrollTop = container.scrollHeight;
}

async function handleSendMessage(isVoiceInput = false, detectedLang = 'en-IN') {
  const input = document.getElementById('chat-input');
  const text = input.value.trim();
  if (!text) return;

  input.value = '';
  appendChatMessage('user', text);
  chatHistory.push({ role: 'user', content: text });

  // Gather complete user data and website-generated suggestions across all tabs
  const fullContext = buildFullFinancialContext();

  const loadingDiv = document.createElement('div');
  loadingDiv.id = 'chat-loading-indicator';
  loadingDiv.className = 'flex items-center space-x-2 text-xs text-slate-400 pl-11';
  loadingDiv.innerHTML = `<span class="w-2 h-2 rounded-full bg-brand-400 animate-ping"></span><span>Thinking...</span>`;
  document.getElementById('chat-messages').appendChild(loadingDiv);
  document.getElementById('chat-messages').scrollTop = document.getElementById('chat-messages').scrollHeight;

  try {
    const res = await fetch(getApiUrl('/api/advisor/chat'), {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        messages: chatHistory,
        context: fullContext,
        enable_voice: isVoiceInput, // Only request TTS if voice input was used
        voice_language: detectedLang
      })
    });

    loadingDiv.remove();

    if (!res.ok) {
      const text = await res.text();
      appendChatMessage('assistant', parseResponseError(res.status, text));
      return;
    }

    const data = await res.json();
    if (data.reply) {
      appendChatMessage('assistant', data.reply, data.audio_base64, data.language_code || detectedLang);
      chatHistory.push({ role: 'assistant', content: data.reply });

      // Automatically play audio ONLY if the user used voice input
      if (isVoiceInput && data.audio_base64) {
        playTTSAudio(data.audio_base64, data.language_code || detectedLang);
      }
    } else {
      appendChatMessage('assistant', 'Sorry, could not generate a response.');
    }
  } catch (err) {
    loadingDiv.remove();
    appendChatMessage('assistant', `Connection error: ${err.message}`);
  }
}

function sendQuickPrompt(promptText) {
  switchTab('tab-advisor');
  document.getElementById('chat-input').value = promptText;
  handleSendMessage(false);
}

function clearChat() {
  stopAudio();
  chatHistory = [];
  const container = document.getElementById('chat-messages');
  container.innerHTML = `
    <div class="flex items-start space-x-3">
      <div class="w-8 h-8 rounded-lg bg-brand-500/20 text-brand-400 flex items-center justify-center font-bold flex-shrink-0 text-sm">
        SA
      </div>
      <div class="max-w-[85%] rounded-2xl rounded-tl-none p-4 bg-slate-900 border border-slate-800 text-xs sm:text-sm text-slate-200 space-y-2 shadow-sm">
        <p>Chat cleared. Ask anything regarding your financial situation, goals, or budgeting!</p>
      </div>
    </div>
  `;
}

// --- Voice Recording & Speech-to-Text ---

async function toggleVoiceRecording() {
  if (isRecording) {
    stopVoiceRecording();
  } else {
    startVoiceRecording();
  }
}

async function startVoiceRecording() {
  try {
    const stream = await navigator.mediaDevices.getUserMedia({ audio: true });
    audioChunks = [];
    mediaRecorder = new MediaRecorder(stream);

    mediaRecorder.ondataavailable = (event) => {
      if (event.data.size > 0) audioChunks.push(event.data);
    };

    mediaRecorder.onstop = async () => {
      const audioBlob = new Blob(audioChunks, { type: 'audio/webm' });
      await sendAudioToSTT(audioBlob);
    };

    mediaRecorder.start();
    isRecording = true;

    document.getElementById('recording-indicator').classList.remove('hidden');
    const micBtn = document.getElementById('btn-mic');
    micBtn.classList.remove('bg-slate-800', 'text-brand-400');
    micBtn.classList.add('bg-red-600', 'text-white', 'animate-pulse');
  } catch (err) {
    alert("Microphone access error: " + err.message + "\nPlease grant microphone permissions in your browser.");
  }
}

function stopVoiceRecording() {
  if (mediaRecorder && mediaRecorder.state !== 'inactive') {
    mediaRecorder.stop();
    mediaRecorder.stream.getTracks().forEach(track => track.stop());
  }
  isRecording = false;

  document.getElementById('recording-indicator').classList.add('hidden');
  const micBtn = document.getElementById('btn-mic');
  micBtn.classList.add('bg-slate-800', 'text-brand-400');
  micBtn.classList.remove('bg-red-600', 'text-white', 'animate-pulse');
}

async function sendAudioToSTT(audioBlob) {
  const input = document.getElementById('chat-input');
  input.placeholder = "Transcribing speech and detecting language...";

  try {
    const base64Audio = await blobToBase64(audioBlob);

    // Language code is 'unknown' so Sarvam Saaras automatically detects the spoken language
    const res = await fetch(getApiUrl('/api/voice/transcribe-json'), {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        audio_base64: base64Audio,
        language_code: 'unknown',
        filename: 'speech.webm'
      })
    });

    if (!res.ok) {
      const errText = await res.text();
      const friendlyMsg = parseResponseError(res.status, errText);
      input.placeholder = friendlyMsg;
      alert(`Transcription Note:\n${friendlyMsg}`);
      return;
    }

    const contentType = res.headers.get('content-type') || '';
    if (!contentType.includes('application/json')) {
      const rawText = await res.text();
      const friendlyMsg = parseResponseError(res.status, rawText);
      input.placeholder = friendlyMsg;
      alert(`Transcription Note:\n${friendlyMsg}`);
      return;
    }

    const data = await res.json();
    if (data.transcript && data.transcript.trim()) {
      input.value = data.transcript;
      input.placeholder = "Ask anything about financial planning...";
      const detectedLang = data.language_code || 'unknown';
      // Automatically send message with voice input flag set to TRUE and detected language passed
      handleSendMessage(true, detectedLang);
    } else {
      input.placeholder = "No speech detected. Please speak clearly and try again.";
      setTimeout(() => {
        input.placeholder = "Ask anything about financial planning...";
      }, 4000);
    }
  } catch (err) {
    input.placeholder = `Transcription error: ${err.message}`;
    console.error("STT Error:", err);
  }
}

function blobToBase64(blob) {
  return new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.onloadend = () => resolve(reader.result);
    reader.onerror = reject;
    reader.readAsDataURL(blob);
  });
}

function parseResponseError(statusCode, responseText) {
  if (responseText.includes('<!DOCTYPE') || responseText.includes('<html')) {
    return `Server returned HTTP ${statusCode}. If running on Netlify, please check that functions are deployed.`;
  }
  return `Error (${statusCode}): ${responseText.substring(0, 200)}`;
}

// --- Audio Player Controller (Play / Pause / Stop) ---

function playTTSAudio(base64Data, langCode = 'Auto') {
  try {
    const audioPlayer = document.getElementById('tts-audio-player');
    audioPlayer.src = `data:audio/wav;base64,${base64Data}`;
    audioPlayer.play().catch(e => console.warn("Audio playback error:", e));

    const panel = document.getElementById('audio-control-panel');
    if (panel) panel.classList.remove('hidden');

    const langNames = {
      'mr-IN': 'Marathi (मराठी)',
      'bn-IN': 'Bengali (বাংলা)',
      'hi-IN': 'Hindi (हिंदी)',
      'en-IN': 'English',
      'gu-IN': 'Gujarati (ગુજરાતી)',
      'ta-IN': 'Tamil (தமிழ்)',
      'te-IN': 'Telugu (తెలుగు)',
      'kn-IN': 'Kannada (ಕನ್ನಡ)',
      'pa-IN': 'Punjabi (ਪੰਜਾਬੀ)'
    };

    const badge = document.getElementById('audio-detected-lang-badge');
    if (badge) badge.textContent = langNames[langCode] || langCode || 'Auto';

    const statusText = document.getElementById('audio-playback-status');
    if (statusText) statusText.textContent = 'Playing spoken reply...';

    const pauseIcon = document.getElementById('btn-pause-icon');
    const pauseLabel = document.getElementById('btn-pause-label');
    if (pauseIcon) pauseIcon.className = 'ph ph-pause';
    if (pauseLabel) pauseLabel.textContent = 'Pause';

    const pulse = document.getElementById('audio-pulse-indicator');
    if (pulse) pulse.classList.remove('hidden');

    audioPlayer.onended = () => {
      if (panel) panel.classList.add('hidden');
    };

    audioPlayer.onpause = () => {
      if (pauseIcon) pauseIcon.className = 'ph ph-play';
      if (pauseLabel) pauseLabel.textContent = 'Resume';
      if (statusText) statusText.textContent = 'Audio paused';
      if (pulse) pulse.classList.add('hidden');
    };

    audioPlayer.onplay = () => {
      if (pauseIcon) pauseIcon.className = 'ph ph-pause';
      if (pauseLabel) pauseLabel.textContent = 'Pause';
      if (statusText) statusText.textContent = 'Playing spoken reply...';
      if (pulse) pulse.classList.remove('hidden');
    };
  } catch (e) {
    console.error("Playback failed:", e);
  }
}

function togglePauseAudio() {
  const audioPlayer = document.getElementById('tts-audio-player');
  if (!audioPlayer) return;

  if (audioPlayer.paused) {
    audioPlayer.play().catch(e => console.warn("Audio resume error:", e));
  } else {
    audioPlayer.pause();
  }
}

function stopAudio() {
  const audioPlayer = document.getElementById('tts-audio-player');
  if (!audioPlayer) return;
  audioPlayer.pause();
  audioPlayer.currentTime = 0;
  const panel = document.getElementById('audio-control-panel');
  if (panel) panel.classList.add('hidden');
}

// --- Formatting Helpers ---
function formatCurrency(num) {
  if (!num) return '0';
  return Math.round(num).toLocaleString('en-IN');
}

function formatCr(num) {
  if (!num) return '0';
  if (num >= 10000000) {
    return (num / 10000000).toFixed(2) + ' Cr';
  } else if (num >= 100000) {
    return (num / 100000).toFixed(2) + ' L';
  }
  return formatCurrency(num);
}

function escapeHtml(text) {
  const div = document.createElement('div');
  div.textContent = text;
  return div.innerHTML;
}

function formatMarkdown(text) {
  let formatted = escapeHtml(text)
    .replace(/\*\*(.*?)\*\*/g, '<strong>$1</strong>')
    .replace(/\*(.*?)\*/g, '<em>$1</em>')
    .replace(/`(.*?)`/g, '<code class="bg-slate-800 text-brand-400 px-1 py-0.5 rounded text-xs">$1</code>');
  return formatted;
}
