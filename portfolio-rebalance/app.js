import {
  rebalancePortfolio,
  validatePortfolio,
  normalizeWeights
} from "./rebalance.js";

// Presets
const PRESETS = {
  boglehead3: [
    { name: "VTI (US Total Stock)", currentValue: 22000, targetWeight: 60, unitPrice: 260 },
    { name: "VXUS (Intl Stock)", currentValue: 4500, targetWeight: 20, unitPrice: 65 },
    { name: "BND (Total Bond)", currentValue: 3500, targetWeight: 20, unitPrice: 73 }
  ],
  classic6040: [
    { name: "VTI (US Equities)", currentValue: 35000, targetWeight: 60, unitPrice: 260 },
    { name: "BND (Fixed Income)", currentValue: 15000, targetWeight: 40, unitPrice: 73 }
  ],
  allweather: [
    { name: "VTI (Total US Stock)", currentValue: 12000, targetWeight: 30, unitPrice: 260 },
    { name: "TLT (Long-Term Treasury)", currentValue: 14000, targetWeight: 40, unitPrice: 92 },
    { name: "IEF (Intermediate Treasury)", currentValue: 5000, targetWeight: 15, unitPrice: 95 },
    { name: "GLD (Gold)", currentValue: 2000, targetWeight: 7.5, unitPrice: 215 },
    { name: "DBC (Commodities)", currentValue: 2000, targetWeight: 7.5, unitPrice: 22 }
  ],
  techgrowth: [
    { name: "VTI (Core US)", currentValue: 20000, targetWeight: 50, unitPrice: 260 },
    { name: "QQQ (Tech Growth)", currentValue: 15000, targetWeight: 30, unitPrice: 480 },
    { name: "VXUS (International)", currentValue: 3000, targetWeight: 10, unitPrice: 65 },
    { name: "BND (Bonds)", currentValue: 2000, targetWeight: 10, unitPrice: 73 }
  ],
  custom: [
    { name: "Security A", currentValue: 1000, targetWeight: 50, unitPrice: 100 },
    { name: "Security B", currentValue: 500, targetWeight: 50, unitPrice: 50 }
  ]
};

// Color palette for charts
const COLORS = [
  "#3b82f6", "#10b981", "#8b5cf6", "#f59e0b", "#06b6d4",
  "#ec4899", "#14b8a6", "#f97316", "#6366f1", "#84cc16"
];

// State
let securities = [];
let showPrices = false;

// Elements
const cashInput = document.getElementById("cashInflow");
const presetSelect = document.getElementById("presetSelect");
const tableBody = document.getElementById("securitiesTableBody");
const resultsBody = document.getElementById("resultsTableBody");
const addRowBtn = document.getElementById("addRowBtn");
const normalizeBtn = document.getElementById("normalizeBtn");
const equalWeightBtn = document.getElementById("equalWeightBtn");
const clearAllBtn = document.getElementById("clearAllBtn");
const toggleSharePrices = document.getElementById("toggleSharePrices");
const targetWeightBadge = document.getElementById("targetWeightBadge");
const securitiesTotalValue = document.getElementById("securitiesTotalValue");
const validationWarning = document.getElementById("validationWarning");
const chartBars = document.getElementById("chartBars");
const inflowBar = document.getElementById("inflowBar");
const inflowBreakdownSummary = document.getElementById("inflowBreakdownSummary");
const exportCsvBtn = document.getElementById("exportCsvBtn");
const toast = document.getElementById("toast");

// KPI Elements
const kpiCashDeployed = document.getElementById("kpiCashDeployed");
const kpiCashSub = document.getElementById("kpiCashSub");
const kpiCurrentTotal = document.getElementById("kpiCurrentTotal");
const kpiFutureTotal = document.getElementById("kpiFutureTotal");
const kpiDrift = document.getElementById("kpiDrift");
const kpiDriftReduction = document.getElementById("kpiDriftReduction");

function init() {
  const saved = localStorage.getItem("portfolio_rebalance_state");
  if (saved) {
    try {
      const parsed = JSON.parse(saved);
      if (parsed.cash !== undefined) cashInput.value = parsed.cash;
      if (Array.isArray(parsed.securities) && parsed.securities.length > 0) {
        securities = parsed.securities;
        presetSelect.value = "custom";
      } else {
        loadPreset("boglehead3");
      }
    } catch {
      loadPreset("boglehead3");
    }
  } else {
    loadPreset("boglehead3");
  }

  renderTable();
  recalculate();
  setupEventListeners();
}

function loadPreset(key) {
  const preset = PRESETS[key] || PRESETS.boglehead3;
  securities = JSON.parse(JSON.stringify(preset));
}

function setupEventListeners() {
  cashInput.addEventListener("input", () => {
    saveState();
    recalculate();
  });

  presetSelect.addEventListener("change", (e) => {
    if (e.target.value !== "custom") {
      loadPreset(e.target.value);
      renderTable();
      saveState();
      recalculate();
    }
  });

  addRowBtn.addEventListener("click", () => {
    presetSelect.value = "custom";
    const letter = String.fromCharCode(65 + (securities.length % 26));
    securities.push({
      name: "Security " + letter,
      currentValue: 0,
      targetWeight: 0,
      unitPrice: null
    });
    renderTable();
    saveState();
    recalculate();
  });

  normalizeBtn.addEventListener("click", () => {
    securities = normalizeWeights(securities);
    renderTable();
    saveState();
    recalculate();
    showToast("Target weights normalized to 100%");
  });

  equalWeightBtn.addEventListener("click", () => {
    if (securities.length > 0) {
      const eq = Number((100 / securities.length).toFixed(2));
      securities.forEach((s, idx) => {
        s.targetWeight = idx === securities.length - 1
          ? Number((100 - eq * (securities.length - 1)).toFixed(2))
          : eq;
      });
      renderTable();
      saveState();
      recalculate();
      showToast("Target weights set to equal split");
    }
  });

  clearAllBtn.addEventListener("click", () => {
    presetSelect.value = "custom";
    securities = [
      { name: "Security A", currentValue: 0, targetWeight: 50, unitPrice: null },
      { name: "Security B", currentValue: 0, targetWeight: 50, unitPrice: null }
    ];
    renderTable();
    saveState();
    recalculate();
  });

  document.querySelectorAll("[data-add-cash]").forEach(btn => {
    btn.addEventListener("click", () => {
      const add = parseFloat(btn.dataset.addCash) || 0;
      const current = parseFloat(cashInput.value) || 0;
      cashInput.value = (current + add).toFixed(2);
      saveState();
      recalculate();
    });
  });

  document.getElementById("clearCashBtn").addEventListener("click", () => {
    cashInput.value = "0";
    saveState();
    recalculate();
  });

  toggleSharePrices.addEventListener("change", (e) => {
    showPrices = e.target.checked;
    document.querySelectorAll(".price-col").forEach(el => {
      el.style.display = showPrices ? "" : "none";
    });
    recalculate();
  });

  exportCsvBtn.addEventListener("click", exportCsv);
}

function renderTable() {
  tableBody.innerHTML = "";
  securities.forEach((sec, idx) => {
    const tr = document.createElement("tr");

    tr.innerHTML = `
      <td>
        <input type="text" class="table-input sec-name" value="${escapeHtml(sec.name)}" placeholder="Symbol/Name" data-idx="${idx}">
      </td>
      <td>
        <input type="number" class="table-input sec-value font-mono" min="0" step="any" value="${sec.currentValue}" placeholder="0.00" data-idx="${idx}">
      </td>
      <td class="price-col" style="${showPrices ? "" : "display:none;"}">
        <input type="number" class="table-input sec-price font-mono" min="0" step="any" value="${sec.unitPrice || ""}" placeholder="Optional" data-idx="${idx}">
      </td>
      <td>
        <input type="number" class="table-input sec-weight font-mono" min="0" max="100" step="any" value="${sec.targetWeight}" placeholder="0.0" data-idx="${idx}">
      </td>
      <td class="text-center">
        <button type="button" class="btn-icon delete-row" data-idx="${idx}" title="Delete row" aria-label="Delete ${escapeHtml(sec.name)}">
          ✕
        </button>
      </td>
    `;

    tableBody.appendChild(tr);
  });

  tableBody.querySelectorAll(".sec-name").forEach(inp => {
    inp.addEventListener("input", (e) => {
      const idx = parseInt(e.target.dataset.idx);
      securities[idx].name = e.target.value;
      presetSelect.value = "custom";
      saveState();
      recalculate();
    });
  });

  tableBody.querySelectorAll(".sec-value").forEach(inp => {
    inp.addEventListener("input", (e) => {
      const idx = parseInt(e.target.dataset.idx);
      securities[idx].currentValue = parseFloat(e.target.value) || 0;
      presetSelect.value = "custom";
      saveState();
      recalculate();
    });
  });

  tableBody.querySelectorAll(".sec-price").forEach(inp => {
    inp.addEventListener("input", (e) => {
      const idx = parseInt(e.target.dataset.idx);
      securities[idx].unitPrice = parseFloat(e.target.value) || null;
      presetSelect.value = "custom";
      saveState();
      recalculate();
    });
  });

  tableBody.querySelectorAll(".sec-weight").forEach(inp => {
    inp.addEventListener("input", (e) => {
      const idx = parseInt(e.target.dataset.idx);
      securities[idx].targetWeight = parseFloat(e.target.value) || 0;
      presetSelect.value = "custom";
      saveState();
      recalculate();
    });
  });

  tableBody.querySelectorAll(".delete-row").forEach(btn => {
    btn.addEventListener("click", (e) => {
      const idx = parseInt(e.target.dataset.idx);
      if (securities.length > 1) {
        securities.splice(idx, 1);
        presetSelect.value = "custom";
        renderTable();
        saveState();
        recalculate();
      } else {
        showToast("Portfolio must have at least one security.");
      }
    });
  });
}

function recalculate() {
  const cash = parseFloat(cashInput.value) || 0;
  const validation = validatePortfolio(cash, securities);

  const sumWeight = securities.reduce((acc, s) => acc + (parseFloat(s.targetWeight) || 0), 0);
  const is100 = Math.abs(sumWeight - 100) < 0.01;

  targetWeightBadge.textContent = `Target: ${sumWeight.toFixed(1)}%`;
  if (is100) {
    targetWeightBadge.className = "badge badge-success";
  } else {
    targetWeightBadge.className = "badge badge-warning";
  }

  if (!validation.valid) {
    validationWarning.style.display = "block";
    validationWarning.innerHTML = validation.errors.join("<br>");
  } else {
    validationWarning.style.display = "none";
  }

  // Run core rebalancing algorithm
  const result = rebalancePortfolio(cash, securities);

  // Update KPIs and Running Total
  if (securitiesTotalValue) {
    securitiesTotalValue.textContent = `(Total: ${formatCurrency(result.totalCurrentValue)})`;
  }
  kpiCashDeployed.textContent = formatCurrency(result.allocatedCash);
  kpiCashSub.textContent = cash > 0
    ? `${((result.allocatedCash / cash) * 100).toFixed(0)}% of inflow deployed`
    : "No inflow";
  kpiCurrentTotal.textContent = formatCurrency(result.totalCurrentValue);
  kpiFutureTotal.textContent = formatCurrency(result.totalFutureValue);
  kpiDrift.textContent = `${result.driftAfter.toFixed(1)}%`;
  kpiDriftReduction.textContent = `${result.driftReduction.toFixed(1)}% reduction (from ${result.driftBefore.toFixed(1)}%)`;

  // Render Results Table
  renderResultsTable(result);

  // Render Charts
  renderVisualBars(result);
  renderInflowBar(result);
}

function renderResultsTable(result) {
  resultsBody.innerHTML = "";
  if (!result.securities || result.securities.length === 0) return;

  result.securities.forEach((sec) => {
    const tr = document.createElement("tr");

    let badgeClass = "badge-success";
    if (sec.status === "overweight") badgeClass = "badge-purple";
    else if (sec.status === "partially_rebalanced") badgeClass = "badge-blue";
    else if (sec.status === "zero_target") badgeClass = "badge-muted";

    const buyPct = result.allocatedCash > 0
      ? (sec.cashAllocated / result.allocatedCash) * 100
      : 0;
    const buyColor = sec.cashAllocated > 0 ? "text-success" : "text-muted";

    tr.innerHTML = `
      <td>
        <div style="font-weight:600;">${escapeHtml(sec.name)}</div>
      </td>
      <td class="text-right font-mono">
        <div>${formatCurrency(sec.currentValue)}</div>
        <div style="font-size:0.75rem; color:var(--text-muted);">${sec.currentWeightPct.toFixed(1)}%</div>
      </td>
      <td class="text-right font-mono ${buyColor}">
        <div style="font-weight:600;">+${formatCurrency(sec.cashAllocated)}</div>
        ${sec.cashAllocated > 0 ? `<div style="font-size:0.75rem; color:var(--accent-primary);">${buyPct.toFixed(1)}% of inflow</div>` : ""}
      </td>
      <td class="text-right font-mono price-col" style="${showPrices ? "" : "display:none;"}">
        ${sec.sharesToBuy !== null ? `+${sec.sharesToBuy.toFixed(2)}` : "-"}
      </td>
      <td class="text-right font-mono">
        <div>${formatCurrency(sec.futureValue)}</div>
        <div style="font-size:0.75rem; color:var(--text-muted);">${sec.futureWeightPct.toFixed(1)}%</div>
      </td>
      <td class="text-right font-mono" style="font-weight:600;">
        ${sec.targetWeightPct.toFixed(1)}%
      </td>
      <td class="text-center">
        <span class="badge ${badgeClass}">${sec.statusLabel}</span>
      </td>
    `;

    resultsBody.appendChild(tr);
  });
}

function renderVisualBars(result) {
  chartBars.innerHTML = "";
  if (!result.securities || result.securities.length === 0) return;

  result.securities.forEach((sec) => {
    const div = document.createElement("div");
    div.className = "bar-row";

    const currentPct = Math.min(100, sec.currentWeightPct);
    const futurePct = Math.min(100, sec.futureWeightPct);
    const targetPct = Math.min(100, sec.targetWeightPct);

    div.innerHTML = `
      <div class="bar-label-group">
        <span style="font-weight:600;">${escapeHtml(sec.name)}</span>
        <span class="font-mono" style="font-size:0.75rem; color:var(--text-secondary);">
          Current: ${currentPct.toFixed(1)}% → Future: <strong style="color:var(--accent-primary);">${futurePct.toFixed(1)}%</strong> (Target: ${targetPct.toFixed(1)}%)
        </span>
      </div>
      <div class="bar-track">
        <div class="bar-fill-future" style="width: ${futurePct}%;"></div>
        <div class="bar-target-line" style="left: ${targetPct}%;" title="Target: ${targetPct.toFixed(1)}%"></div>
      </div>
    `;

    chartBars.appendChild(div);
  });
}

function renderInflowBar(result) {
  inflowBar.innerHTML = "";
  const cash = result.allocatedCash;
  if (cash <= 0 || !result.securities) {
    inflowBar.innerHTML = `<div style="width:100%; height:100%; background:var(--bg-tertiary);"></div>`;
    if (inflowBreakdownSummary) inflowBreakdownSummary.textContent = "No cash allocated";
    return;
  }

  let allocatedCount = 0;
  result.securities.forEach((sec, idx) => {
    if (sec.cashAllocated > 0) {
      allocatedCount++;
      const pct = (sec.cashAllocated / cash) * 100;
      const seg = document.createElement("div");
      seg.className = "inflow-segment";
      seg.style.width = `${pct}%`;
      seg.style.backgroundColor = COLORS[idx % COLORS.length];
      seg.title = `${sec.name}: +${formatCurrency(sec.cashAllocated)} (${pct.toFixed(1)}%)`;
      inflowBar.appendChild(seg);
    }
  });

  if (inflowBreakdownSummary) {
    inflowBreakdownSummary.textContent = `Distributed across ${allocatedCount} ${allocatedCount === 1 ? "security" : "securities"}`;
  }
}


function exportCsv() {
  const cash = parseFloat(cashInput.value) || 0;
  const result = rebalancePortfolio(cash, securities);

  const headers = ["Security", "Current Value ($)", "Current %", "Cash to Buy ($)", "Future Value ($)", "Future %", "Target %", "Status"];
  const rows = result.securities.map(s => [
    `"${s.name.replace(/"/g,)}"`,
    s.currentValue.toFixed(2),
    s.currentWeightPct.toFixed(2),
    s.cashAllocated.toFixed(2),
    s.futureValue.toFixed(2),
    s.futureWeightPct.toFixed(2),
    s.targetWeightPct.toFixed(2),
    `"${s.statusLabel}"`
  ]);

  const csvContent = [headers.join(","), ...rows.map(r => r.join(","))].join("\n");
  const blob = new Blob([csvContent], { type: "text/csv;charset=utf-8;" });
  const url = URL.createObjectURL(blob);
  const link = document.createElement("a");
  link.setAttribute("href", url);
  link.setAttribute("download", `portfolio_rebalance_${new Date().toISOString().slice(0, 10)}.csv`);
  document.body.appendChild(link);
  link.click();
  document.body.removeChild(link);
  showToast("CSV exported successfully!");
}

function saveState() {
  const state = {
    cash: cashInput.value,
    securities
  };
  localStorage.setItem("portfolio_rebalance_state", JSON.stringify(state));
}

function formatCurrency(num) {
  return "$" + (Number(num) || 0).toLocaleString("en-US", { minimumFractionDigits: 2, maximumFractionDigits: 2 });
}

function escapeHtml(str) {
  return String(str || "").replace(/&/g, "&amp;").replace(/</g, "&lt;").replace(/>/g, "&gt;").replace(/"/g, "&quot;");
}

function showToast(msg) {
  toast.textContent = msg;
  toast.classList.add("show");
  setTimeout(() => toast.classList.remove("show"), 2500);
}

// Start
init();
