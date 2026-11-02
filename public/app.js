// Sarvam Artha - Open-Ended Personal Finance Manager & AI Strategist

let currentTab = 'tab-cashflow';
let cashflowSplitChart = null;
let assetsSplitChart = null;
let expensePieChart = null;
let chatHistory = [];
let mediaRecorder = null;
let audioChunks = [];
let isRecording = false;

// Default custom personal goals
const DEFAULT_GOALS = [
  { id: '1', title: 'Emergency Safety Reserve', target_amount: 250000, current_amount: 150000, target_years: 1.5, expected_roi_pct: 6.5, category: 'Safety' },
  { id: '2', title: 'Higher Education / Skill Fund', target_amount: 500000, current_amount: 80000, target_years: 3.0, expected_roi_pct: 8.0, category: 'Growth' },
  { id: '3', title: 'Long-Term Financial Independence', target_amount: 20000000, current_amount: 350000, target_years: 20.0, expected_roi_pct: 11.0, category: 'Independence' }
];

// Default asset / liability items
const DEFAULT_ASSETS = [
  { id: 'a1', title: 'Savings Accounts & Sweep FDs', value: 150000, category: 'Cash / Liquid' },
  { id: 'a2', title: 'Broad Index & Flexi-Cap Funds', value: 250000, category: 'Equities / Funds' },
  { id: 'a3', title: 'Public Provident Fund (PPF)', value: 100000, category: 'Fixed Income / Debt' }
];

const DEFAULT_LIABILITIES = [
  { id: 'l1', title: 'Education Loan', amount: 80000, monthly_emi: 4500, interest_rate: 8.5 }
];

const DEFAULT_EXPENSES = [
  { id: '1', category: 'Rent & Housing', amount: 22000, description: 'Monthly Apartment Rent', date: '2026-11-01' },
  { id: '2', category: 'Groceries & Food', amount: 8500, description: 'Blinkit & essentials', date: '2026-11-01' },
  { id: '3', category: 'Dining Out & Delivery', amount: 4800, description: 'Food delivery & weekend dining', date: '2026-10-30' },
  { id: '4', category: 'Subscriptions & OTT', amount: 2100, description: 'Streaming & gym memberships', date: '2026-10-28' },
  { id: '5', category: 'Utilities & Bills', amount: 3500, description: 'Electricity & Internet', date: '2026-10-27' },
  { id: '6', category: 'Commute & Fuel', amount: 4200, description: 'Fuel & Metro transit', date: '2026-10-25' },
  { id: '7', category: 'Shopping & Lifestyle', amount: 5900, description: 'Apparel & gadgets', date: '2026-10-22' },
  { id: '8', category: 'Healthcare', amount: 2000, description: 'Health supplements & pharmacy', date: '2026-10-20' },
];

let goals = JSON.parse(localStorage.getItem('sarvam_goals') || 'null') || [...DEFAULT_GOALS];
let assets = JSON.parse(localStorage.getItem('sarvam_assets') || 'null') || [...DEFAULT_ASSETS];
let liabilities = JSON.parse(localStorage.getItem('sarvam_liabilities') || 'null') || [...DEFAULT_LIABILITIES];
let expenses = JSON.parse(localStorage.getItem('sarvam_expenses') || 'null') || [...DEFAULT_EXPENSES];

// --- API Base URL Helper ---
function getApiUrl(path) {
  const customHost = (document.getElementById('inp-api-host')?.value || '').trim();
  if (customHost) {
    const cleanHost = customHost.replace(/\/+$/, '');
    const cleanPath = path.replace(/^\/+/, '');
    return `${cleanHost}/${cleanPath}`;
  }
  return path;
}

// --- Initialization ---
document.addEventListener('DOMContentLoaded', () => {
  const dateInput = document.getElementById('exp-date');
  if (dateInput) {
    dateInput.value = new Date().toISOString().split('T')[0];
  }

  const savedApiHost = localStorage.getItem('sarvam_api_host');
  if (savedApiHost && document.getElementById('inp-api-host')) {
    document.getElementById('inp-api-host').value = savedApiHost;
  }

  loadSavedProfile();
  recalculateAll();
  renderGoalsList();
  renderExpensesList();
  renderExpensePieChart();
  runSim();
});

// Save API Host on change
document.getElementById('inp-api-host')?.addEventListener('input', (e) => {
  localStorage.setItem('sarvam_api_host', e.target.value.trim());
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

// --- Profile Data Management ---
function getProfileData() {
  return {
    age: parseInt(document.getElementById('inp-age').value) || 28,
    monthly_income: parseFloat(document.getElementById('inp-income').value) || 85000,
    mandatory_expenses: parseFloat(document.getElementById('inp-mandatory-expense').value) || 35000,
    discretionary_expenses: parseFloat(document.getElementById('inp-discretionary-expense').value) || 18000,
    monthly_debt_emi: parseFloat(document.getElementById('inp-debt-emi').value) || 0,
    liquid_savings: parseFloat(document.getElementById('inp-liquid-savings').value) || 150000,
    has_dependents: document.getElementById('inp-dependents').value === 'true',
    income_stability: document.getElementById('inp-stability').value || 'stable',
    risk_profile: document.getElementById('inp-risk').value || 'moderate',
    goals: goals,
    assets: assets,
    liabilities: liabilities
  };
}

function saveProfile(data) {
  localStorage.setItem('sarvam_profile_v2', JSON.stringify(data));
}

function loadSavedProfile() {
  const saved = localStorage.getItem('sarvam_profile_v2');
  if (saved) {
    try {
      const p = JSON.parse(saved);
      if (p.age) document.getElementById('inp-age').value = p.age;
      if (p.monthly_income) document.getElementById('inp-income').value = p.monthly_income;
      if (p.mandatory_expenses) document.getElementById('inp-mandatory-expense').value = p.mandatory_expenses;
      if (p.discretionary_expenses) document.getElementById('inp-discretionary-expense').value = p.discretionary_expenses;
      if (p.monthly_debt_emi !== undefined) document.getElementById('inp-debt-emi').value = p.monthly_debt_emi;
      if (p.liquid_savings !== undefined) document.getElementById('inp-liquid-savings').value = p.liquid_savings;
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

  try {
    const res = await fetch(getApiUrl('/api/profile/calculate'), {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(profile)
    });
    
    if (!res.ok) {
      const text = await res.text();
      console.warn("Calculate non-200 response:", text);
      calculateLocallyFallback(profile);
      return;
    }

    const data = await res.json();
    updateUIWithCalculations(data);
  } catch (err) {
    console.warn("Calculation API unreachable, using local math fallback:", err);
    calculateLocallyFallback(profile);
  }
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
    },
    goals_evaluation: {
      total_required_monthly: 0
    }
  });
}

function updateUIWithCalculations(data) {
  const cf = data.cashflow;
  const nw = data.net_worth;

  // 1. Metric cards
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
  if (dtiBadge) dtiBadge.textContent = `Debt-to-Income: ${cf.debt_to_income_pct}%`;

  // 2. Net Worth Cards
  const nwAssetsEl = document.getElementById('networth-assets');
  const nwDebtsEl = document.getElementById('networth-debts');
  const nwTotalEl = document.getElementById('networth-total');

  if (nwAssetsEl) nwAssetsEl.textContent = `₹${formatCr(nw.total_assets)}`;
  if (nwDebtsEl) nwDebtsEl.textContent = `₹${formatCr(nw.total_liabilities)}`;
  if (nwTotalEl) {
    nwTotalEl.textContent = `₹${formatCr(nw.net_worth)}`;
    nwTotalEl.className = nw.net_worth >= 0 ? 'text-sm font-extrabold text-white' : 'text-sm font-extrabold text-rose-400';
  }

  // 3. Render charts
  renderCashflowSplitChart(cf);
  renderAssetsSplitChart(nw);
}

// --- Chart Renderers ---

function renderCashflowSplitChart(cf) {
  const ctx = document.getElementById('chart-cashflow-split');
  if (!ctx) return;

  if (cashflowSplitChart) cashflowSplitChart.destroy();

  const surplus = Math.max(0, cf.net_monthly_surplus);
  const mandatory = cf.mandatory_expenses;
  const discretionary = cf.discretionary_expenses;
  const debt = cf.debt_obligations;

  cashflowSplitChart = new Chart(ctx, {
    type: 'doughnut',
    data: {
      labels: ['Mandatory Living', 'Discretionary', 'Debt EMIs', 'Surplus / Available'],
      datasets: [{
        data: [mandatory, discretionary, debt, surplus],
        backgroundColor: ['#3b82f6', '#f59e0b', '#ef4444', '#10b981'],
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
              return ` ${c.label}: ₹${formatCurrency(c.raw)}`;
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
      labels: labels,
      datasets: [{
        data: data,
        backgroundColor: colors.slice(0, labels.length),
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
              return ` ${c.label}: ₹${formatCurrency(c.raw)} (${pct}%)`;
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
  const monthly = parseFloat(document.getElementById('sim-monthly')?.value) || 15000;
  const rate = parseFloat(document.getElementById('sim-rate')?.value) || 10;
  const years = parseInt(document.getElementById('sim-years')?.value) || 15;

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
    container.innerHTML = `<div class="p-6 text-center text-slate-500 text-xs">No personal goals added yet. Click "Add Goal" above to define one.</div>`;
    return;
  }

  let totalNeeded = 0;

  goals.forEach(g => {
    const shortfall = Math.max(0, g.target_amount - g.current_amount);
    const months = g.target_years * 12;
    const r = (g.expected_roi_pct / 100) / 12;
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
    tbody.innerHTML = `<tr><td colspan="5" class="py-6 text-center text-slate-500">No expenses logged yet. Add your first expense above.</td></tr>`;
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

function resetSampleExpenses() {
  expenses = [...DEFAULT_EXPENSES];
  localStorage.setItem('sarvam_expenses', JSON.stringify(expenses));
  renderExpensesList();
  renderExpensePieChart();
}

// --- AI Expense Audit ---
async function auditExpensesWithAI() {
  const resultBox = document.getElementById('ai-doctor-result');
  const btn = document.getElementById('btn-audit-expenses');
  const income = parseFloat(document.getElementById('inp-income').value) || 85000;

  if (!resultBox) return;

  btn.disabled = true;
  btn.innerHTML = `<i class="ph ph-spinner animate-spin"></i><span>Analyzing with Sarvam AI...</span>`;
  resultBox.textContent = "Sarvam AI is reviewing your outflows from first principles...";

  try {
    const res = await fetch(getApiUrl('/api/advisor/audit-expenses'), {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ expenses, monthly_income: income })
    });
    
    if (!res.ok) {
      const text = await res.text();
      handleApiError(resultBox, res.status, text);
      return;
    }

    const data = await res.json();
    resultBox.textContent = data.audit_analysis || "No recommendations generated.";
  } catch (err) {
    resultBox.textContent = `Backend error: ${err.message}. If running on static host, configure backend URL in AI Advisor tab.`;
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
    btn.innerHTML = `<i class="ph ph-spinner animate-spin"></i><span>Formulating Strategy...</span>`;
  }

  const profile = getProfileData();
  appendChatMessage('user', 'Please formulate a personalized financial strategy based on my current profile, cash flow, and goals.');

  // Loading indicator in chat
  const loadingDiv = document.createElement('div');
  loadingDiv.id = 'chat-loading-indicator';
  loadingDiv.className = 'flex items-center space-x-2 text-xs text-slate-400 pl-11';
  loadingDiv.innerHTML = `<span class="w-2 h-2 rounded-full bg-brand-400 animate-ping"></span><span>Sarvam 105B evaluating profile & goals...</span>`;
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
      const errMsg = parseHtmlError(res.status, text);
      appendChatMessage('assistant', errMsg);
      return;
    }

    const data = await res.json();
    if (data.strategy) {
      appendChatMessage('assistant', data.strategy);
      chatHistory.push({ role: 'assistant', content: data.strategy });
    }
  } catch (err) {
    loadingDiv.remove();
    appendChatMessage('assistant', `Could not reach backend API: ${err.message}. Please verify the Python server is running (python run.py) or check the backend host setting.`);
  } finally {
    if (btn) {
      btn.disabled = false;
      btn.innerHTML = `<i class="ph ph-brain text-sm"></i><span>Formulate My Strategy</span>`;
    }
  }
}

// --- Sarvam Conversational & Multilingual Voice AI ---

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
        <span>Play Spoken Voice (Bulbul TTS)</span>
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

async function handleSendMessage() {
  const input = document.getElementById('chat-input');
  const text = input.value.trim();
  if (!text) return;

  input.value = '';
  appendChatMessage('user', text);
  chatHistory.push({ role: 'user', content: text });

  const autoVoice = document.getElementById('chk-auto-voice').checked;
  const voiceLang = document.getElementById('sel-language').value || 'en-IN';
  const profile = getProfileData();

  const loadingDiv = document.createElement('div');
  loadingDiv.id = 'chat-loading-indicator';
  loadingDiv.className = 'flex items-center space-x-2 text-xs text-slate-400 pl-11';
  loadingDiv.innerHTML = `<span class="w-2 h-2 rounded-full bg-brand-400 animate-ping"></span><span>Sarvam 105B thinking...</span>`;
  document.getElementById('chat-messages').appendChild(loadingDiv);
  document.getElementById('chat-messages').scrollTop = document.getElementById('chat-messages').scrollHeight;

  try {
    const res = await fetch(getApiUrl('/api/advisor/chat'), {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        messages: chatHistory,
        context: JSON.stringify(profile),
        enable_voice: autoVoice,
        voice_language: voiceLang
      })
    });

    loadingDiv.remove();

    if (!res.ok) {
      const text = await res.text();
      appendChatMessage('assistant', parseHtmlError(res.status, text));
      return;
    }

    const data = await res.json();
    if (data.reply) {
      appendChatMessage('assistant', data.reply, data.audio_base64);
      chatHistory.push({ role: 'assistant', content: data.reply });

      if (autoVoice && data.audio_base64) {
        playTTSAudio(data.audio_base64);
      }
    } else {
      appendChatMessage('assistant', 'Sorry, could not generate a response.');
    }
  } catch (err) {
    loadingDiv.remove();
    appendChatMessage('assistant', `Connection error: ${err.message}. If deployed statically, ensure your Python server is running and configured.`);
  }
}

function sendQuickPrompt(promptText) {
  switchTab('tab-advisor');
  document.getElementById('chat-input').value = promptText;
  handleSendMessage();
}

function clearChat() {
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

// --- Voice Recording & Sarvam Saaras STT (Fixed & Hardened) ---

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
      await sendAudioToSarvamSTT(audioBlob);
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

async function sendAudioToSarvamSTT(audioBlob) {
  const input = document.getElementById('chat-input');
  input.placeholder = "Transcribing with Sarvam Saaras...";

  const langCode = document.getElementById('sel-language').value || 'mr-IN';

  try {
    // Convert blob to base64 for rock-solid serverless JSON transport
    const base64Audio = await blobToBase64(audioBlob);

    const res = await fetch(getApiUrl('/api/voice/transcribe-json'), {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        audio_base64: base64Audio,
        language_code: langCode,
        filename: 'speech.webm'
      })
    });

    // Check if server returned HTML (e.g. 404 or 502 from static server)
    if (!res.ok) {
      const errText = await res.text();
      const friendlyMsg = parseHtmlError(res.status, errText);
      input.placeholder = friendlyMsg;
      alert(`Transcription Backend Note:\n${friendlyMsg}`);
      return;
    }

    const contentType = res.headers.get('content-type') || '';
    if (!contentType.includes('application/json')) {
      const rawText = await res.text();
      const friendlyMsg = parseHtmlError(res.status, rawText);
      input.placeholder = friendlyMsg;
      alert(`Transcription Backend Note:\n${friendlyMsg}`);
      return;
    }

    const data = await res.json();
    if (data.transcript && data.transcript.trim()) {
      input.value = data.transcript;
      input.placeholder = "Ask anything about financial planning...";
      handleSendMessage();
    } else {
      input.placeholder = "No speech detected. Please speak clearly and try again.";
      setTimeout(() => {
        input.placeholder = "Ask anything about financial planning...";
      }, 4000);
    }
  } catch (err) {
    const errorMsg = `Transcription connection error: ${err.message}`;
    input.placeholder = errorMsg;
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

function parseHtmlError(statusCode, responseText) {
  if (responseText.includes('<!DOCTYPE') || responseText.includes('<html')) {
    return `Server returned HTTP ${statusCode} (HTML page instead of API response). If testing on GitHub Pages or static host, the Python AI backend requires a server. Run 'python run.py' locally or deploy with Netlify.`;
  }
  return `Server error (${statusCode}): ${responseText.substring(0, 200)}`;
}

function handleApiError(targetEl, status, responseText) {
  targetEl.textContent = parseHtmlError(status, responseText);
}

function playTTSAudio(base64Data) {
  try {
    const audioPlayer = document.getElementById('tts-audio-player');
    audioPlayer.src = `data:audio/wav;base64,${base64Data}`;
    audioPlayer.play().catch(e => console.warn("Audio playback error:", e));
  } catch (e) {
    console.error("Playback failed:", e);
  }
}

// --- Netlify Modal ---
function openNetlifyModal() {
  document.getElementById('modal-netlify').classList.remove('hidden');
}
function closeNetlifyModal() {
  document.getElementById('modal-netlify').classList.add('hidden');
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
