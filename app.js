// Sarvam Artha - Personal Financial AI Client Logic

let currentTab = 'tab-profile';
let bucketDonutChart = null;
let sipGrowthChart = null;
let expensePieChart = null;
let chatHistory = [];
let mediaRecorder = null;
let audioChunks = [];
let isRecording = false;

// Default representative expenses for immediate test & visualization
const DEFAULT_EXPENSES = [
  { id: '1', category: 'Rent & Housing', amount: 22000, description: 'Monthly Apartment Rent', date: '2026-11-01' },
  { id: '2', category: 'Groceries & Food', amount: 8500, description: 'Blinkit & Nature Basket essentials', date: '2026-11-01' },
  { id: '3', category: 'Dining Out & Delivery', amount: 4800, description: 'Swiggy & weekend dinners', date: '2026-10-30' },
  { id: '4', category: 'Subscriptions & OTT', amount: 2100, description: 'Netflix, Spotify, Prime, Gym App', date: '2026-10-28' },
  { id: '5', category: 'Utilities & Bills', amount: 3500, description: 'Electricity, High-speed Wifi, Water', date: '2026-10-27' },
  { id: '6', category: 'Commute & Fuel', amount: 4200, description: 'Metro pass & fuel', date: '2026-10-25' },
  { id: '7', category: 'Shopping & Lifestyle', amount: 5900, description: 'Clothing & electronic accessories', date: '2026-10-22' },
  { id: '8', category: 'Healthcare', amount: 2000, description: 'Pharmacy & health supplements', date: '2026-10-20' },
];

let expenses = JSON.parse(localStorage.getItem('sarvam_expenses') || 'null') || [...DEFAULT_EXPENSES];

// --- Initialization ---
document.addEventListener('DOMContentLoaded', () => {
  // Set default date in expense form
  const dateInput = document.getElementById('exp-date');
  if (dateInput) {
    dateInput.value = new Date().toISOString().split('T')[0];
  }

  // Load saved profile if available
  loadSavedProfile();

  // Initial calculations & charts
  recalculatePlan();
  renderExpensesList();
  renderExpensePieChart();
});

// --- Tab Switching ---
function switchTab(tabId) {
  currentTab = tabId;
  document.querySelectorAll('.tab-content').forEach(el => el.classList.add('hidden'));
  const activeSection = document.getElementById(tabId);
  if (activeSection) activeSection.classList.remove('hidden');

  // Update navigation button active state
  document.querySelectorAll('.nav-btn').forEach(btn => {
    btn.classList.remove('text-brand-400', 'bg-slate-800/80');
    btn.classList.add('text-slate-400');
  });

  const activeBtn = document.getElementById(`btn-${tabId}`);
  if (activeBtn) {
    activeBtn.classList.remove('text-slate-400');
    activeBtn.classList.add('text-brand-400', 'bg-slate-800/80');
  }

  // If opening buckets tab, resize charts
  if (tabId === 'tab-buckets') {
    setTimeout(() => {
      if (bucketDonutChart) bucketDonutChart.resize();
      if (sipGrowthChart) sipGrowthChart.resize();
    }, 100);
  } else if (tabId === 'tab-tracker') {
    setTimeout(() => {
      if (expensePieChart) expensePieChart.resize();
    }, 100);
  }
}

// --- Profile & Financial Blueprint Calculations ---
function getProfileData() {
  return {
    age: parseInt(document.getElementById('inp-age').value) || 28,
    target_freedom_age: parseInt(document.getElementById('inp-freedom-age').value) || 50,
    monthly_income: parseFloat(document.getElementById('inp-income').value) || 85000,
    fixed_expenses: parseFloat(document.getElementById('inp-fixed-expense').value) || 35000,
    discretionary_expenses: parseFloat(document.getElementById('inp-discretionary-expense').value) || 18000,
    current_savings: parseFloat(document.getElementById('inp-savings').value) || 150000,
    monthly_sip: parseFloat(document.getElementById('inp-sip').value) || 25000,
    has_dependents: document.getElementById('inp-dependents').value === 'true',
    income_stability: document.getElementById('inp-stability').value || 'stable',
    risk_profile: document.getElementById('inp-risk').value || 'moderate',
  };
}

function saveProfile(data) {
  localStorage.setItem('sarvam_profile', JSON.stringify(data));
}

function loadSavedProfile() {
  const saved = localStorage.getItem('sarvam_profile');
  if (saved) {
    try {
      const p = JSON.parse(saved);
      if (p.age) document.getElementById('inp-age').value = p.age;
      if (p.target_freedom_age) document.getElementById('inp-freedom-age').value = p.target_freedom_age;
      if (p.monthly_income) document.getElementById('inp-income').value = p.monthly_income;
      if (p.fixed_expenses) document.getElementById('inp-fixed-expense').value = p.fixed_expenses;
      if (p.discretionary_expenses) document.getElementById('inp-discretionary-expense').value = p.discretionary_expenses;
      if (p.current_savings) document.getElementById('inp-savings').value = p.current_savings;
      if (p.monthly_sip) document.getElementById('inp-sip').value = p.monthly_sip;
      if (p.has_dependents !== undefined) document.getElementById('inp-dependents').value = String(p.has_dependents);
      if (p.income_stability) document.getElementById('inp-stability').value = p.income_stability;
      if (p.risk_profile) document.getElementById('inp-risk').value = p.risk_profile;
    } catch (e) {
      console.warn("Could not parse saved profile", e);
    }
  }
}

async function recalculatePlan() {
  const profile = getProfileData();
  saveProfile(profile);

  try {
    const res = await fetch('/api/profile/calculate', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(profile)
    });
    const data = await res.json();
    updateUIWithPlan(data);
  } catch (err) {
    console.error("Calculation failed:", err);
  }
}

function updateUIWithPlan(plan) {
  const ef = plan.emergency_fund;
  const budget = plan.budget_analysis;
  const buckets = plan.bucket_plan;
  const fire = plan.fire_plan;
  const sip = plan.sip_projections;

  // 1. Emergency Fund
  const efMonthsEl = document.getElementById('metric-emergency-months');
  const efTargetMonthsEl = document.getElementById('metric-emergency-target-months');
  const efBadgeEl = document.getElementById('badge-emergency');
  const efBarEl = document.getElementById('bar-emergency');
  const efStatusTxt = document.getElementById('txt-emergency-status');

  if (efMonthsEl) efMonthsEl.textContent = ef.current_coverage_months;
  if (efTargetMonthsEl) efTargetMonthsEl.textContent = ef.target_months;
  if (efBadgeEl) {
    efBadgeEl.textContent = ef.status;
    efBadgeEl.className = ef.is_adequate
      ? 'text-[10px] px-2 py-0.5 rounded-full bg-emerald-500/20 text-emerald-400 font-bold border border-emerald-500/30'
      : 'text-[10px] px-2 py-0.5 rounded-full bg-amber-500/20 text-amber-400 font-bold border border-amber-500/30';
  }
  if (efBarEl) {
    const pct = Math.min(100, Math.round((ef.current_savings / ef.target_amount) * 100));
    efBarEl.style.width = `${pct}%`;
  }
  if (efStatusTxt) {
    efStatusTxt.textContent = `Target: ₹${formatCurrency(ef.target_amount)} in liquid instruments. (Shortfall: ₹${formatCurrency(ef.shortfall)})`;
  }

  // 2. Savings Rate & 50/30/20
  const savingsPct = budget.savings ? budget.savings.percentage : 0;
  const savingsRateEl = document.getElementById('metric-savings-rate');
  const savingsBarEl = document.getElementById('bar-savings-rate');
  const savingsAmtTxt = document.getElementById('txt-savings-amount');

  if (savingsRateEl) savingsRateEl.textContent = `${savingsPct}%`;
  if (savingsBarEl) savingsBarEl.style.width = `${Math.min(100, savingsPct * 2)}%`;
  if (savingsAmtTxt) savingsAmtTxt.textContent = `Monthly Surplus: ₹${formatCurrency(plan.calculated_monthly_savings)}`;

  // 50/30/20 bars
  if (budget.needs) {
    document.getElementById('txt-needs-pct').textContent = `${budget.needs.percentage}% (₹${formatCurrency(budget.needs.amount)})`;
    document.getElementById('bar-needs').style.width = `${Math.min(100, budget.needs.percentage)}%`;
  }
  if (budget.wants) {
    document.getElementById('txt-wants-pct').textContent = `${budget.wants.percentage}% (₹${formatCurrency(budget.wants.amount)})`;
    document.getElementById('bar-wants').style.width = `${Math.min(100, budget.wants.percentage)}%`;
  }
  if (budget.savings) {
    document.getElementById('txt-savings-pct').textContent = `${budget.savings.percentage}% (₹${formatCurrency(budget.savings.amount)})`;
    document.getElementById('bar-savings').style.width = `${Math.min(100, budget.savings.percentage)}%`;
  }

  // 3. FIRE & Living off ROI
  const fireProgEl = document.getElementById('metric-fire-progress');
  const fireBarEl = document.getElementById('bar-fire-progress');
  const fireTargetTxt = document.getElementById('txt-fire-target');
  const fireExplTxt = document.getElementById('txt-fire-explanation');
  const fireReqSipTxt = document.getElementById('txt-fire-required-sip');

  if (fireProgEl) fireProgEl.textContent = `${fire.progress_percentage}%`;
  if (fireBarEl) fireBarEl.style.width = `${fire.progress_percentage}%`;
  if (fireTargetTxt) fireTargetTxt.textContent = `Target Corpus: ₹${formatCr(fire.target_corpus)}`;
  if (fireExplTxt) {
    fireExplTxt.innerHTML = `At age ${fire.target_freedom_age}, a target corpus of <span class="font-bold text-gold-400">₹${formatCr(fire.target_corpus)}</span> provides <span class="font-bold text-emerald-400">₹${formatCurrency(fire.monthly_passive_income_potential)}/mo</span> perpetual passive income at 7.5% post-tax yield!`;
  }
  if (fireReqSipTxt) fireReqSipTxt.textContent = `₹${formatCurrency(fire.required_monthly_sip)}/mo`;

  // 4. Update Bucket Donut & Text
  const summary = buckets.summary;
  document.getElementById('badge-risk-mode').textContent = plan.profile.risk_profile.toUpperCase();
  document.getElementById('txt-b1-pct').textContent = `${summary.liquid_percentage}% (₹${formatCurrency(buckets.buckets[0].monthly_amount)}/mo)`;
  document.getElementById('txt-b2-pct').textContent = `${summary.debt_percentage + summary.gold_sgb_percentage}% (₹${formatCurrency(buckets.buckets[1].monthly_amount)}/mo)`;
  document.getElementById('txt-b3-pct').textContent = `${summary.equity_percentage}% (₹${formatCurrency(buckets.buckets[2].monthly_amount)}/mo)`;

  renderBucketDonutChart([
    summary.liquid_percentage,
    summary.debt_percentage + summary.gold_sgb_percentage,
    summary.equity_percentage
  ]);

  // 5. Update SIP Compounding Chart
  const trajectory = sip.yearly_trajectory;
  const yr20 = trajectory.find(t => t.year === 20) || trajectory[trajectory.length - 1];
  if (yr20) {
    document.getElementById('metric-20yr-corpus').textContent = `₹${formatCr(yr20.future_value)}`;
  }
  renderSipGrowthChart(trajectory);
}

// --- Chart.js Renderers ---

function renderBucketDonutChart(dataValues) {
  const ctx = document.getElementById('chart-bucket-donut');
  if (!ctx) return;

  if (bucketDonutChart) {
    bucketDonutChart.destroy();
  }

  bucketDonutChart = new Chart(ctx, {
    type: 'doughnut',
    data: {
      labels: ['Bucket 1: Liquid & Safety', 'Bucket 2: Stability & SGB', 'Bucket 3: Equity Growth'],
      datasets: [{
        data: dataValues,
        backgroundColor: ['#10b981', '#f59e0b', '#6366f1'],
        borderWidth: 2,
        borderColor: '#0b1120',
        hoverOffset: 6
      }]
    },
    options: {
      responsive: true,
      maintainAspectRatio: false,
      plugins: {
        legend: { display: false },
        tooltip: {
          callbacks: {
            label: function(context) {
              return ` ${context.label}: ${context.raw}%`;
            }
          }
        }
      },
      cutout: '72%'
    }
  });
}

function renderSipGrowthChart(trajectory) {
  const ctx = document.getElementById('chart-sip-growth');
  if (!ctx) return;

  if (sipGrowthChart) {
    sipGrowthChart.destroy();
  }

  const labels = trajectory.map(t => `Yr ${t.year}`);
  const investedData = trajectory.map(t => t.total_invested);
  const futureValueData = trajectory.map(t => t.future_value);

  sipGrowthChart = new Chart(ctx, {
    type: 'line',
    data: {
      labels: labels,
      datasets: [
        {
          label: 'Total Corpus (Compounded at 12% CAGR)',
          data: futureValueData,
          borderColor: '#10b981',
          backgroundColor: 'rgba(16, 185, 129, 0.15)',
          fill: true,
          tension: 0.35,
          borderWidth: 2.5
        },
        {
          label: 'Your Capital Invested',
          data: investedData,
          borderColor: '#94a3b8',
          borderDash: [5, 5],
          borderWidth: 1.5,
          fill: false,
          tension: 0.1
        }
      ]
    },
    options: {
      responsive: true,
      maintainAspectRatio: false,
      interaction: { mode: 'index', intersect: false },
      plugins: {
        legend: {
          position: 'top',
          labels: { color: '#cbd5e1', font: { size: 11, family: 'Plus Jakarta Sans' } }
        },
        tooltip: {
          callbacks: {
            label: function(c) {
              return ` ${c.dataset.label}: ₹${formatCurrency(c.raw)}`;
            }
          }
        }
      },
      scales: {
        x: {
          grid: { color: 'rgba(255, 255, 255, 0.05)' },
          ticks: { color: '#94a3b8', font: { size: 10 } }
        },
        y: {
          grid: { color: 'rgba(255, 255, 255, 0.05)' },
          ticks: {
            color: '#94a3b8',
            font: { size: 10 },
            callback: function(v) { return `₹${formatCr(v)}`; }
          }
        }
      }
    }
  });
}

function renderExpensePieChart() {
  const ctx = document.getElementById('chart-expense-pie');
  if (!ctx) return;

  if (expensePieChart) {
    expensePieChart.destroy();
  }

  // Group expenses by category
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
    category: category,
    amount: amount,
    date: date,
    description: desc
  };

  expenses.unshift(newExpense);
  localStorage.setItem('sarvam_expenses', JSON.stringify(expenses));

  // Reset input fields
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

// --- AI Expense Doctor ---
async function auditExpensesWithAI() {
  const resultBox = document.getElementById('ai-doctor-result');
  const btn = document.getElementById('btn-audit-expenses');
  const income = parseFloat(document.getElementById('inp-income').value) || 85000;

  if (!resultBox) return;

  btn.disabled = true;
  btn.innerHTML = `<i class="ph ph-spinner animate-spin"></i><span>Auditing with Sarvam AI...</span>`;
  resultBox.textContent = "Sarvam AI is analyzing your spending patterns and calculating compounding opportunities...";

  try {
    const res = await fetch('/api/advisor/audit-expenses', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        expenses: expenses,
        monthly_income: income
      })
    });
    const data = await res.json();
    resultBox.textContent = data.audit_analysis || "No recommendations generated.";
  } catch (err) {
    resultBox.textContent = `Error during expense audit: ${err.message}`;
  } finally {
    btn.disabled = false;
    btn.innerHTML = `<i class="ph ph-sparkle text-sm"></i><span>Audit My Expenses</span>`;
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
        <span>Play Audio (Bulbul TTS)</span>
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

  // Create loading indicator message
  const loadingDiv = document.createElement('div');
  loadingDiv.id = 'chat-loading-indicator';
  loadingDiv.className = 'flex items-center space-x-2 text-xs text-slate-400 pl-11';
  loadingDiv.innerHTML = `<span class="w-2 h-2 rounded-full bg-brand-400 animate-ping"></span><span>Sarvam 105B thinking...</span>`;
  document.getElementById('chat-messages').appendChild(loadingDiv);
  document.getElementById('chat-messages').scrollTop = document.getElementById('chat-messages').scrollHeight;

  try {
    const res = await fetch('/api/advisor/chat', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        messages: chatHistory,
        context: JSON.stringify(profile),
        enable_voice: autoVoice,
        voice_language: voiceLang
      })
    });

    const data = await res.json();
    loadingDiv.remove();

    if (data.reply) {
      appendChatMessage('assistant', data.reply, data.audio_base64);
      chatHistory.push({ role: 'assistant', content: data.reply });

      if (autoVoice && data.audio_base64) {
        playTTSAudio(data.audio_base64);
      }
    } else {
      appendChatMessage('assistant', 'Sorry, I could not generate a response. Please try again.');
    }
  } catch (err) {
    loadingDiv.remove();
    appendChatMessage('assistant', `Encountered an error: ${err.message}`);
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
        <p>Chat cleared. Ask anything regarding your financial health, bucket allocation, or expense optimization!</p>
      </div>
    </div>
  `;
}

// --- Voice Recording & Sarvam Saaras STT ---

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

    // Update UI
    document.getElementById('recording-indicator').classList.remove('hidden');
    const micBtn = document.getElementById('btn-mic');
    micBtn.classList.remove('bg-slate-800', 'text-brand-400');
    micBtn.classList.add('bg-red-600', 'text-white', 'animate-pulse');
  } catch (err) {
    alert("Microphone access error: " + err.message + "\nPlease grant microphone permission in your browser.");
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
  input.placeholder = "Transcribing speech with Sarvam Saaras...";

  const formData = new FormData();
  formData.append('file', audioBlob, 'recording.webm');
  formData.append('language_code', document.getElementById('sel-language').value || 'unknown');

  try {
    const res = await fetch('/api/voice/transcribe', {
      method: 'POST',
      body: formData
    });
    const data = await res.json();

    if (data.transcript && data.transcript.trim()) {
      input.value = data.transcript;
      input.placeholder = "Ask anything about financial plans...";
      // Automatically send message upon transcription
      handleSendMessage();
    } else {
      input.placeholder = "No speech detected. Please try speaking again.";
      setTimeout(() => {
        input.placeholder = "Ask anything about financial plans...";
      }, 3000);
    }
  } catch (err) {
    input.placeholder = "Transcription failed: " + err.message;
    console.error("STT Error:", err);
  }
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

function updateVoiceLanguage() {
  const lang = document.getElementById('sel-language').value;
  console.log("Voice language switched to:", lang);
}

// --- Vercel Modal ---
function openVercelModal() {
  document.getElementById('modal-vercel').classList.remove('hidden');
}

function closeVercelModal() {
  document.getElementById('modal-vercel').classList.add('hidden');
}

// --- Helpers ---
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
  // Simple bold and bullet parser
  let formatted = escapeHtml(text)
    .replace(/\*\*(.*?)\*\*/g, '<strong>$1</strong>')
    .replace(/\*(.*?)\*/g, '<em>$1</em>')
    .replace(/`(.*?)`/g, '<code class="bg-slate-800 text-brand-400 px-1 py-0.5 rounded text-xs">$1</code>');
  return formatted;
}
