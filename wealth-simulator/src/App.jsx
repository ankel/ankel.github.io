import React, { useState, useEffect, useMemo, useCallback } from 'react';
import { LineChart, Line, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, ReferenceArea, AreaChart, Area, BarChart, Bar, Legend, ComposedChart } from 'recharts';
import { Settings, Info, TrendingUp, AlertTriangle, CheckCircle, RefreshCw, ChevronDown, ChevronUp, Wallet, PieChart, ShieldCheck, Clock, ShoppingBag, Landmark, Layers } from 'lucide-react';

/**
 * UTILITIES
 */

// Box-Muller transform for normal distribution
const generateGaussian = (mean, stdDev) => {
  let u = 0, v = 0;
  while (u === 0) u = Math.random();
  while (v === 0) v = Math.random();
  const z = Math.sqrt(-2.0 * Math.log(u)) * Math.cos(2.0 * Math.PI * v);
  return mean + z * stdDev;
};

// Currency formatter
const formatCurrency = (value) => {
  return new Intl.NumberFormat('en-US', {
    style: 'currency',
    currency: 'USD',
    maximumFractionDigits: 0,
    notation: value > 1000000 ? 'compact' : 'standard'
  }).format(value);
};

// Axis formatter for millions
const formatAxis = (value) => {
  if (value >= 1000000) return `$${(value / 1000000).toFixed(1)}m`;
  return `$${(value / 1000).toFixed(0)}k`;
};

// Percentage formatter
const formatPercent = (value) => `${value}%`;

/**
 * COMPONENTS
 */

const InputGroup = ({ label, value, onChange, min, max, step, unit = '', tooltip }) => {
  const isCurrency = unit === '$';
  const [isFocused, setIsFocused] = useState(false);

  const handleChange = (e) => {
    // Remove commas for processing
    const rawValue = e.target.value.replace(/,/g, '');

    // Handle empty or invalid input gracefully
    if (rawValue === '' || rawValue === '-') {
       onChange(0);
       return;
    }

    const parsed = Number(rawValue);
    if (!isNaN(parsed)) {
      onChange(parsed);
    }
  };

  return (
    <div className="mb-2 flex items-center justify-between">
      <label className="text-xs font-medium text-slate-700 flex items-center gap-1 shrink-0 mr-2">
        {label}
        {tooltip && (
          <div className="group relative">
            <Info size={12} className="text-slate-400 cursor-help" />
            <div className="absolute left-0 bottom-full mb-2 w-48 bg-slate-800 text-white text-xs rounded p-2 hidden group-hover:block z-10 shadow-lg">
              {tooltip}
            </div>
          </div>
        )}
      </label>
      <div className="relative rounded-md shadow-sm w-32 shrink-0">
        {isCurrency && (
          <div className="pointer-events-none absolute inset-y-0 left-0 flex items-center pl-2">
            <span className="text-slate-500 text-xs">$</span>
          </div>
        )}
        <input
          type={isCurrency ? "text" : "number"}
          min={min}
          max={max}
          step={step}
          // Show formatted with commas when not focused, otherwise show raw number for editing
          value={isCurrency && !isFocused ? value.toLocaleString('en-US') : value}
          onFocus={() => setIsFocused(true)}
          onBlur={() => setIsFocused(false)}
          onChange={handleChange}
          className={`block w-full rounded-md border border-slate-300 py-1 focus:border-indigo-500 focus:ring-indigo-500 text-xs bg-white text-slate-900 shadow-sm transition-colors text-right font-medium
            ${isCurrency ? 'pl-5' : 'pl-2'}
            ${!isCurrency && unit ? 'pr-7' : 'pr-2'}`}
        />
        {!isCurrency && unit && (
          <div className="pointer-events-none absolute inset-y-0 right-0 flex items-center pr-2">
            <span className="text-slate-500 text-xs">{unit.trim()}</span>
          </div>
        )}
      </div>
    </div>
  );
};

const KPICard = ({ title, value, subtext, icon: Icon, colorClass }) => (
  <div className="bg-white p-4 rounded-xl shadow-sm border border-slate-100 flex items-start gap-4">
    <div className={`p-3 rounded-lg ${colorClass} bg-opacity-10`}>
      <Icon size={24} className={colorClass.replace('bg-', 'text-')} />
    </div>
    <div>
      <h3 className="text-sm font-medium text-slate-500">{title}</h3>
      <div className="text-2xl font-bold text-slate-800 mt-1">{value}</div>
      {subtext && <div className="text-xs text-slate-400 mt-1">{subtext}</div>}
    </div>
  </div>
);

// Simplified Header for Accordions
const SectionHeader = ({ icon: Icon, title, colorClass = "bg-indigo-500" }) => (
  <div className="flex items-center gap-2">
    <span className="text-xs font-bold text-slate-400 uppercase tracking-wider flex items-center gap-1">
      {Icon && <Icon size={12} />} {title}
    </span>
  </div>
);

/**
 * MAIN APP
 */

export default function App() {
  // --- STATE ---
  const [params, setParams] = useState({
    // Timeline
    currentAge: 35,
    retirementAge: 65,
    lifeExpectancy: 90,

    // Portfolio Splits
    taxableBalance: 50000,
    taxableContribution: 5000,

    preTaxBalance: 40000, // 401k
    preTaxContribution: 10000,

    rothBalance: 10000,
    rothContribution: 6000,

    // Spending (Dynamic)
    minSpending: 40000,          // Non-negotiable
    discretionarySpending: 20000, // Travels, etc.
    spendingCutFlexibility: 50,   // % of discretionary that can be cut

    // Fixed Income (New)
    fixedIncomeAnnual: 0,        // Pension, CPP, OAS, etc.
    fixedIncomeStartAge: 65,     // Age it begins

    // Market
    expectedReturn: 4.5, // Changed default to reflect Real Return
    volatility: 15.0,
    // Inflation removed from state

    // Taxes
    incomeTaxRate: 30,
    capitalGainsInclusion: 50,
  });

  const [results, setResults] = useState(null);
  const [isSimulating, setIsSimulating] = useState(false);

  // Accordion States
  const [showTimeline, setShowTimeline] = useState(true);
  const [showPortfolio, setShowPortfolio] = useState(true);
  const [showSpending, setShowSpending] = useState(true);
  const [showAdvanced, setShowAdvanced] = useState(false);

  const [activeTab, setActiveTab] = useState('taxable'); // 'taxable', 'pretax', 'roth'

  // --- LOGIC ---

  const runSimulation = useCallback(() => {
    setIsSimulating(true);

    setTimeout(() => {
      const SIMULATIONS = 1000;

      const yearsToSimulate = params.lifeExpectancy - params.currentAge;
      // Store full breakdown for every run: [{ taxable: [], pretax: [], roth: [], total: [] }]
      const allRuns = [];
      const startTotalNetWorth = params.taxableBalance + params.preTaxBalance + params.rothBalance;

      for (let sim = 0; sim < SIMULATIONS; sim++) {
        // Track balances for this single run
        const runTaxable = [];
        const runPreTax = [];
        const runRoth = [];
        const runTotal = [];

        // Initialize Balances
        let bTaxable = params.taxableBalance;
        let bPreTax = params.preTaxBalance;
        let bRoth = params.rothBalance;

        for (let year = 0; year <= yearsToSimulate; year++) {
          const age = params.currentAge + year;
          const isRetired = age >= params.retirementAge;

          // Snapshot previous balance (for Dynamic Spending logic)
          const startTotal = bTaxable + bPreTax + bRoth;

          // 1. Calculate Real Return (Simplified: Input IS Real Return)
          const meanRealReturn = params.expectedReturn / 100;
          const vol = params.volatility / 100;
          const realReturn = generateGaussian(meanRealReturn, vol);

          // 2. Apply Growth (Simultaneous to all accounts)
          if (year > 0) {
             bTaxable *= (1 + realReturn);
             bPreTax  *= (1 + realReturn);
             bRoth    *= (1 + realReturn);
          }

          // 3. Cashflows
          if (year > 0) {
            if (!isRetired) {
              // --- ACCUMULATION ---
              bTaxable += params.taxableContribution;
              bPreTax += params.preTaxContribution;
              bRoth += params.rothContribution;

            } else {
              // --- DECUMULATION (Dynamic Spending Logic) ---

              const currentTotal = bTaxable + bPreTax + bRoth;
              const gain = currentTotal - startTotal; // Real Dollar Gain

              // Base Requirements
              const baseTarget = params.minSpending + params.discretionarySpending;

              // Fixed Income Logic
              const currentFixedIncome = (age >= params.fixedIncomeStartAge) ? params.fixedIncomeAnnual : 0;

              // The amount we MUST cover from portfolio (can be negative if pension > spending)
              const portfolioNeed = baseTarget - currentFixedIncome;

              let actualPortfolioWithdrawal = portfolioNeed;

              // Check if "Bad Year" ONLY if we actually need to withdraw from portfolio
              if (portfolioNeed > 0) {
                 if (gain < portfolioNeed) {
                    // We rely on portfolio, but it didn't grow enough.
                    // Calculate shortfall relative to the portfolio need
                    const shortfall = portfolioNeed - gain;

                    const maxCutAmount = params.discretionarySpending * (params.spendingCutFlexibility / 100);

                    // We can only cut discretionary spending, even if pension covers essentials
                    const actualCut = Math.min(shortfall, maxCutAmount);

                    actualPortfolioWithdrawal = portfolioNeed - actualCut;
                 }
              }

              // --- EXECUTE CASH FLOW ---

              if (actualPortfolioWithdrawal < 0) {
                 // SURPLUS: Pension > Spending. Reinvest surplus into Taxable Account.
                 bTaxable += Math.abs(actualPortfolioWithdrawal);
              } else {
                  // WITHDRAWAL: Order = Taxable -> PreTax -> Roth
                  let remainingNetNeed = actualPortfolioWithdrawal;

                  // A. TAXABLE ACCOUNT
                  if (remainingNetNeed > 0 && bTaxable > 0) {
                    const inclusionRate = params.capitalGainsInclusion / 100;
                    const taxRate = params.incomeTaxRate / 100;
                    const effectiveTaxFactor = 1 - (inclusionRate * taxRate);
                    const divisor = effectiveTaxFactor <= 0 ? 0.01 : effectiveTaxFactor;
                    const grossNeeded = remainingNetNeed / divisor;

                    if (bTaxable >= grossNeeded) {
                      bTaxable -= grossNeeded;
                      remainingNetNeed = 0;
                    } else {
                      const netFromTaxable = bTaxable * divisor;
                      remainingNetNeed -= netFromTaxable;
                      bTaxable = 0;
                    }
                  }

                  // B. PRE-TAX (401k)
                  if (remainingNetNeed > 0 && bPreTax > 0) {
                    const taxRate = params.incomeTaxRate / 100;
                    const effectiveTaxFactor = 1 - taxRate;
                    const divisor = effectiveTaxFactor <= 0 ? 0.01 : effectiveTaxFactor;
                    const grossNeeded = remainingNetNeed / divisor;

                    if (bPreTax >= grossNeeded) {
                      bPreTax -= grossNeeded;
                      remainingNetNeed = 0;
                    } else {
                      const netFromPreTax = bPreTax * divisor;
                      remainingNetNeed -= netFromPreTax;
                      bPreTax = 0;
                    }
                  }

                  // C. ROTH
                  if (remainingNetNeed > 0 && bRoth > 0) {
                    if (bRoth >= remainingNetNeed) {
                      bRoth -= remainingNetNeed;
                      remainingNetNeed = 0;
                    } else {
                      remainingNetNeed -= bRoth;
                      bRoth = 0;
                    }
                  }
              }
            }
          }

          // Floor at 0 (should be handled by logic above, but safety check)
          if (bTaxable < 0) bTaxable = 0;
          if (bPreTax < 0) bPreTax = 0;
          if (bRoth < 0) bRoth = 0;

          // Store for path
          runTaxable.push(bTaxable);
          runPreTax.push(bPreTax);
          runRoth.push(bRoth);
          runTotal.push(bTaxable + bPreTax + bRoth);
        }
        allRuns.push({
          taxable: runTaxable,
          pretax: runPreTax,
          roth: runRoth,
          total: runTotal
        });
      }

      // --- 1. Calculate Aggregates (Probability Cone) ---
      const probabilityData = [];
      for (let i = 0; i <= yearsToSimulate; i++) {
         const yearValues = allRuns.map(r => r.total[i]).sort((a,b) => a-b);
         probabilityData.push({
            age: params.currentAge + i,
            p20: yearValues[Math.floor(SIMULATIONS * 0.2)],
            p50: yearValues[Math.floor(SIMULATIONS * 0.5)],
            p80: yearValues[Math.floor(SIMULATIONS * 0.8)],
         });
      }

      // --- 2. Find the Median Run (for Breakdown Chart) ---
      // Sort all runs by their FINAL total wealth to find a representative "Median Scenario"
      allRuns.sort((a, b) => {
         const lastA = a.total[a.total.length - 1];
         const lastB = b.total[b.total.length - 1];
         return lastA - lastB;
      });

      const medianRunIndex = Math.floor(SIMULATIONS * 0.5);
      const medianRun = allRuns[medianRunIndex];

      // Build Stacked Data from Median Run
      const medianData = [];
      for (let i = 0; i <= yearsToSimulate; i++) {
         medianData.push({
            age: params.currentAge + i,
            taxable: medianRun.taxable[i],
            pretax: medianRun.pretax[i],
            roth: medianRun.roth[i],
            total: medianRun.total[i]
         });
      }

      // --- 3. Success Criteria & KPIs ---
      // We calculate success rate based on the P20 line staying above 0 (or original principal if requested, but logic below uses > startTotalNetWorth for success rate, and p20 for survival age)

      const successCount = allRuns.filter(run => run.total[run.total.length - 1] >= startTotalNetWorth).length;
      const successRate = (successCount / SIMULATIONS) * 100;

      let survivalAge = params.lifeExpectancy;
      // Using Probability Data P20 for safe age
      const failYearIndex = probabilityData.findIndex(d => d.p20 <= 0);
      if (failYearIndex !== -1) {
        survivalAge = probabilityData[failYearIndex].age;
      } else {
        survivalAge = `${params.lifeExpectancy}+`;
      }

      setResults({
        probabilityData,
        medianData,
        successRate,
        medianEndWealth: probabilityData[probabilityData.length - 1].p50,
        survivalAge
      });
      setIsSimulating(false);
    }, 100);
  }, [params]);

  useEffect(() => {
    runSimulation();
  }, [runSimulation]);

  const updateParam = (key, value) => {
    setParams(prev => ({ ...prev, [key]: value }));
  };

  const totalAssets = params.taxableBalance + params.preTaxBalance + params.rothBalance;
  const targetSpending = params.minSpending + params.discretionarySpending;
  const floorSpending = params.minSpending + (params.discretionarySpending * (1 - params.spendingCutFlexibility / 100));

  return (
    <div className="flex flex-col md:flex-row h-screen bg-slate-50 font-sans text-slate-800 overflow-hidden">

      {/* SIDEBAR - INPUTS */}
      <div className="w-full md:w-96 bg-white border-r border-slate-200 flex flex-col h-full overflow-hidden shadow-lg z-10">
        <div className="p-6 border-b border-slate-100 bg-indigo-600 text-white">
          <h1 className="text-xl font-bold flex items-center gap-2">
            <TrendingUp size={24} className="text-indigo-200" />
            Wealth Simulator
          </h1>
          <p className="text-indigo-100 text-xs mt-1">Multi-Account Monte Carlo (Real $)</p>
        </div>

        <div className="flex-1 overflow-y-auto p-6 custom-scrollbar">

          {/* Timeline Section */}
          <section className="mb-6 border-b border-slate-100 pb-2">
            <div
               className="flex items-center justify-between cursor-pointer mb-3 group"
               onClick={() => setShowTimeline(!showTimeline)}
             >
                <SectionHeader title="Timeline" colorClass="bg-slate-400" icon={Clock} />
                {showTimeline ? <ChevronUp size={16} className="text-slate-400"/> : <ChevronDown size={16} className="text-slate-400"/>}
             </div>

            {showTimeline ? (
                <div className="animate-in fade-in slide-in-from-top-2 duration-200">
                    <InputGroup
                    label="Current Age"
                    value={params.currentAge}
                    min={18} max={90} step={1} unit=" yrs"
                    onChange={(v) => updateParam('currentAge', v)}
                    />
                    <InputGroup
                    label="Retirement Age"
                    value={params.retirementAge}
                    min={params.currentAge + 1} max={100} step={1} unit=" yrs"
                    onChange={(v) => updateParam('retirementAge', v)}
                    />
                    <InputGroup
                    label="Life Expectancy"
                    value={params.lifeExpectancy}
                    min={params.retirementAge + 1} max={110} step={1} unit=" yrs"
                    onChange={(v) => updateParam('lifeExpectancy', v)}
                    />
                </div>
            ) : (
                <div className="text-xs text-slate-500 pl-4 mb-2">
                   <span className="font-mono bg-slate-100 px-1 rounded">{params.currentAge}</span>
                   <span className="mx-1 text-slate-300">→</span>
                   <span className="font-mono bg-slate-100 px-1 rounded text-indigo-600 font-bold">{params.retirementAge}</span>
                   <span className="mx-1 text-slate-300">→</span>
                   <span className="font-mono bg-slate-100 px-1 rounded">{params.lifeExpectancy}</span>
                </div>
            )}
          </section>

          {/* Portfolio Section with Tabs */}
          <section className="mb-6 border-b border-slate-100 pb-2">
             <div
               className="flex items-center justify-between cursor-pointer mb-3 group"
               onClick={() => setShowPortfolio(!showPortfolio)}
             >
                <SectionHeader title="Portfolio Assets" colorClass="bg-emerald-500" icon={PieChart} />
                {showPortfolio ? <ChevronUp size={16} className="text-slate-400"/> : <ChevronDown size={16} className="text-slate-400"/>}
             </div>

            {showPortfolio ? (
                <div className="animate-in fade-in slide-in-from-top-2 duration-200">
                    {/* Account Tabs */}
                    <div className="flex p-1 bg-slate-100 rounded-lg mb-4">
                    {['taxable', 'pretax', 'roth'].map((tab) => (
                        <button
                        key={tab}
                        onClick={() => setActiveTab(tab)}
                        className={`flex-1 text-xs font-semibold py-2 rounded-md transition-all ${
                            activeTab === tab
                            ? 'bg-white text-indigo-600 shadow-sm'
                            : 'text-slate-500 hover:text-slate-700'
                        }`}
                        >
                        {tab === 'taxable' && 'Taxable'}
                        {tab === 'pretax' && 'Pre-Tax'}
                        {tab === 'roth' && 'Post-Tax'}
                        </button>
                    ))}
                    </div>

                    <div className="bg-slate-50 rounded-lg p-3 border border-slate-100">
                    {activeTab === 'taxable' && (
                        <div className="animate-in fade-in slide-in-from-left-1 duration-200">
                        <div className="text-xs text-slate-400 mb-3 flex gap-2 items-center">
                            <Wallet size={12} /> Taxed at Inc Rate × Inclusion
                        </div>
                        <InputGroup
                            label="Current Balance"
                            value={params.taxableBalance}
                            min={0} max={2000000} step={1000} unit="$"
                            onChange={(v) => updateParam('taxableBalance', v)}
                        />
                        <InputGroup
                            label="Annual Contrib."
                            value={params.taxableContribution}
                            min={0} max={100000} step={500} unit="$"
                            onChange={(v) => updateParam('taxableContribution', v)}
                        />
                        </div>
                    )}

                    {activeTab === 'pretax' && (
                        <div className="animate-in fade-in slide-in-from-left-1 duration-200">
                        <div className="text-xs text-slate-400 mb-3 flex gap-2 items-center">
                            <ShieldCheck size={12} /> Taxed as Income (401k, IRA...)
                        </div>
                        <InputGroup
                            label="Current Balance"
                            value={params.preTaxBalance}
                            min={0} max={2000000} step={1000} unit="$"
                            onChange={(v) => updateParam('preTaxBalance', v)}
                        />
                        <InputGroup
                            label="Annual Contrib."
                            value={params.preTaxContribution}
                            min={0} max={100000} step={500} unit="$"
                            onChange={(v) => updateParam('preTaxContribution', v)}
                        />
                        </div>
                    )}

                    {activeTab === 'roth' && (
                        <div className="animate-in fade-in slide-in-from-left-1 duration-200">
                        <div className="text-xs text-slate-400 mb-3 flex gap-2 items-center">
                            <CheckCircle size={12} /> Tax-free (Roth IRA...)
                        </div>
                        <InputGroup
                            label="Current Balance"
                            value={params.rothBalance}
                            min={0} max={2000000} step={1000} unit="$"
                            onChange={(v) => updateParam('rothBalance', v)}
                        />
                        <InputGroup
                            label="Annual Contrib."
                            value={params.rothContribution}
                            min={0} max={100000} step={500} unit="$"
                            onChange={(v) => updateParam('rothContribution', v)}
                        />
                        </div>
                    )}
                    </div>
                </div>
            ) : (
                <div className="text-xs text-slate-500 pl-4 mb-2 flex flex-col gap-1">
                    <div>Net Worth: <span className="font-bold text-slate-700">{formatCurrency(totalAssets)}</span></div>
                </div>
            )}
          </section>

          {/* Retirement Plan Section (Renamed) */}
           <section className="mb-6 border-b border-slate-100 pb-2">
             <div
               className="flex items-center justify-between cursor-pointer mb-3 group"
               onClick={() => setShowSpending(!showSpending)}
             >
                <SectionHeader title="Retirement Plan" colorClass="bg-rose-500" icon={Landmark} />
                {showSpending ? <ChevronUp size={16} className="text-slate-400"/> : <ChevronDown size={16} className="text-slate-400"/>}
             </div>

             {showSpending ? (
                <div className="animate-in fade-in slide-in-from-top-2 duration-200">
                   <h3 className="text-xs font-semibold text-slate-400 mb-2 uppercase tracking-wide">Needs</h3>
                   <InputGroup
                    label="Min Spending"
                    tooltip="Non-negotiable annual base needs"
                    value={params.minSpending}
                    min={20000} max={300000} step={1000} unit="$"
                    onChange={(v) => updateParam('minSpending', v)}
                  />
                  <InputGroup
                    label="Discretionary"
                    tooltip="Travel, luxury, etc."
                    value={params.discretionarySpending}
                    min={0} max={200000} step={1000} unit="$"
                    onChange={(v) => updateParam('discretionarySpending', v)}
                  />
                  <InputGroup
                    label="Flexibility"
                    tooltip="Max % of Discretionary to cut in bad years"
                    value={params.spendingCutFlexibility}
                    min={0} max={100} step={5} unit="%"
                    onChange={(v) => updateParam('spendingCutFlexibility', v)}
                  />

                  <div className="h-px bg-slate-100 my-3"></div>

                  <h3 className="text-xs font-semibold text-slate-400 mb-2 uppercase tracking-wide flex items-center gap-1">
                      <Wallet size={12} /> Fixed Income
                  </h3>
                  <InputGroup
                    label="Annual Amount"
                    tooltip="Pension, Annuity, Govt Income (Real $)"
                    value={params.fixedIncomeAnnual}
                    min={0} max={100000} step={1000} unit="$"
                    onChange={(v) => updateParam('fixedIncomeAnnual', v)}
                  />
                   <InputGroup
                    label="Start Age"
                    value={params.fixedIncomeStartAge}
                    min={50} max={80} step={1} unit=" yrs"
                    onChange={(v) => updateParam('fixedIncomeStartAge', v)}
                  />

                  <div className="text-xs text-slate-500 bg-slate-50 p-2 rounded border border-slate-100 mt-2">
                     Net Portfolio Need: <span className="font-semibold">{formatCurrency(Math.max(0, floorSpending - params.fixedIncomeAnnual))} – {formatCurrency(Math.max(0, targetSpending - params.fixedIncomeAnnual))}</span> <br/>
                     <span className="text-[10px] text-slate-400">(Assuming fixed income is active)</span>
                  </div>
                </div>
             ) : (
                 <div className="text-xs text-slate-500 pl-4 mb-2">
                    Target Spend: {formatCurrency(floorSpending)} – {formatCurrency(targetSpending)}
                 </div>
             )}
           </section>

          {/* Economics Section */}
          <section className="mb-6">
             <div
               className="flex items-center justify-between cursor-pointer mb-3 group"
               onClick={() => setShowAdvanced(!showAdvanced)}
             >
                <SectionHeader title="Market & Taxes" colorClass="bg-amber-500" icon={Settings} />
                {showAdvanced ? <ChevronUp size={16} className="text-slate-400"/> : <ChevronDown size={16} className="text-slate-400"/>}
             </div>

            {showAdvanced && (
              <div className="bg-slate-50 p-4 rounded-lg border border-slate-100 mb-4 animate-in fade-in slide-in-from-top-2 duration-200">
                <InputGroup
                  label="Expected Return"
                  tooltip="Real annual return (after inflation) in real dollars."
                  value={params.expectedReturn}
                  min={1} max={15} step={0.1} unit="%"
                  onChange={(v) => updateParam('expectedReturn', v)}
                />
                <InputGroup
                  label="Volatility"
                  tooltip="Standard Deviation. Higher volatility means wider swings in annual returns, increasing both the upside potential and downside risk."
                  value={params.volatility}
                  min={1} max={30} step={0.5} unit="%"
                  onChange={(v) => updateParam('volatility', v)}
                />
                {/* Inflation Input Removed */}
                <div className="h-px bg-slate-200 my-4"></div>
                <h3 className="text-xs font-semibold text-slate-500 mb-3">Tax Rates</h3>
                 <InputGroup
                  label="Income Tax Rate"
                  value={params.incomeTaxRate}
                  min={0} max={60} step={1} unit="%"
                  onChange={(v) => updateParam('incomeTaxRate', v)}
                />
                <InputGroup
                  label="Inclusion Rate"
                  value={params.capitalGainsInclusion}
                  min={0} max={100} step={1} unit="%"
                  onChange={(v) => updateParam('capitalGainsInclusion', v)}
                />
              </div>
            )}
             {!showAdvanced && (
               <div className="text-xs text-slate-500 pl-4 mb-2">
                 Return: {params.expectedReturn}% | Tax: {((params.incomeTaxRate * params.capitalGainsInclusion)/100).toFixed(1)}%
               </div>
            )}
          </section>
        </div>
      </div>

      {/* MAIN CONTENT - CHART & RESULTS */}
      <div className="flex-1 flex flex-col bg-slate-50 h-full overflow-hidden">

        {/* KPI Header */}
        <div className="flex-none p-6 md:p-8 grid grid-cols-1 md:grid-cols-3 gap-4 border-b border-slate-100 bg-white">
          <KPICard
            title="Success Probability"
            value={results ? `${results.successRate.toFixed(1)}%` : '-'}
            subtext="Chance to preserve capital"
            icon={results?.successRate > 80 ? CheckCircle : AlertTriangle}
            colorClass={results?.successRate > 80 ? 'text-emerald-600 bg-emerald-500' : (results?.successRate > 50 ? 'text-amber-600 bg-amber-500' : 'text-red-600 bg-red-500')}
          />
          <KPICard
            title="Median Legacy"
            value={results ? formatCurrency(results.medianEndWealth) : '-'}
            subtext="Total wealth at life expectancy"
            icon={TrendingUp}
            colorClass="text-indigo-600 bg-indigo-500"
          />
          <KPICard
            title="Safe Until Age"
            value={results ? results.survivalAge : '-'}
            subtext="In worst 20% of cases"
            icon={ShieldCheck}
            colorClass="text-blue-600 bg-blue-500"
          />
        </div>

        {/* Scrollable Charts Container */}
        <div className="flex-1 overflow-y-auto bg-slate-50 p-6 md:p-8 space-y-6">

          {/* Chart 1: Total Wealth Probability */}
          <div className="bg-white rounded-2xl shadow-sm border border-slate-200 p-4 flex flex-col h-[400px]">
             <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4 mb-6">
              <div>
                <h2 className="text-lg font-bold text-slate-800 flex items-center gap-2">
                   <TrendingUp size={20} className="text-indigo-600" />
                   Wealth Probability
                </h2>
                <p className="text-sm text-slate-500">
                  Range of outcomes (Real $)
                </p>
              </div>
              <div className="flex flex-wrap items-center gap-3 sm:gap-4 text-xs font-medium">
                 <div className="flex items-center gap-1 whitespace-nowrap">
                    <span className="w-3 h-3 rounded-full bg-red-100 border border-red-400"></span> 20th %
                 </div>
                 <div className="flex items-center gap-1 whitespace-nowrap">
                    <span className="w-3 h-3 rounded-full bg-indigo-500"></span> Median
                 </div>
                 <div className="flex items-center gap-1 whitespace-nowrap">
                    <span className="w-3 h-3 rounded-full bg-emerald-100 border border-emerald-400"></span> 80th %
                 </div>
              </div>
            </div>

            <div className="flex-1 w-full min-h-0">
               {results && (
                  <ResponsiveContainer width="100%" height="100%">
                    <AreaChart data={results.probabilityData} margin={{ top: 10, right: 30, left: 0, bottom: 0 }}>
                      <defs>
                        <linearGradient id="colorP90" x1="0" y1="0" x2="0" y2="1">
                          <stop offset="5%" stopColor="#10b981" stopOpacity={0.1}/>
                          <stop offset="95%" stopColor="#10b981" stopOpacity={0}/>
                        </linearGradient>
                        <linearGradient id="colorP10" x1="0" y1="0" x2="0" y2="1">
                          <stop offset="5%" stopColor="#ef4444" stopOpacity={0.1}/>
                          <stop offset="95%" stopColor="#ef4444" stopOpacity={0}/>
                        </linearGradient>
                      </defs>
                      <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#f1f5f9" />
                      <XAxis
                        dataKey="age"
                        stroke="#94a3b8"
                        tick={{fontSize: 12}}
                        label={{ value: 'Age', position: 'insideBottomRight', offset: -5 }}
                      />
                      <YAxis
                        stroke="#94a3b8"
                        tick={{fontSize: 12}}
                        tickFormatter={formatAxis}
                      />
                      <Tooltip
                        formatter={(value) => formatCurrency(value)}
                        labelFormatter={(label) => `Age ${label}`}
                        contentStyle={{ borderRadius: '8px', border: 'none', boxShadow: '0 4px 6px -1px rgb(0 0 0 / 0.1)' }}
                      />
                      <ReferenceArea x1={params.retirementAge} x2={params.retirementAge + 0.5} stroke="none" fill="#6366f1" fillOpacity={0.2} />
                      <Area type="monotone" dataKey="p80" stroke="#34d399" fill="url(#colorP90)" strokeWidth={1} strokeDasharray="4 4" name="Optimistic (80th)"/>
                      <Area type="monotone" dataKey="p20" stroke="#f87171" fill="url(#colorP10)" strokeWidth={1} strokeDasharray="4 4" name="Pessimistic (20th)"/>
                      <Area type="monotone" dataKey="p50" stroke="#4f46e5" fill="none" strokeWidth={3} name="Median"/>
                    </AreaChart>
                  </ResponsiveContainer>
               )}
            </div>
          </div>

          {/* Chart 2: Median Breakdown */}
          <div className="bg-white rounded-2xl shadow-sm border border-slate-200 p-4 flex flex-col h-[400px]">
            <div className="flex justify-between items-center mb-6">
              <div>
                <h2 className="text-lg font-bold text-slate-800 flex items-center gap-2">
                   <Layers size={20} className="text-indigo-600" />
                   Median Portfolio Composition
                </h2>
                <p className="text-sm text-slate-500">
                  Account breakdown in the Median (50th percentile) scenario
                </p>
              </div>
              <div className="flex items-center gap-4 text-xs font-medium">
                  <div className="flex items-center gap-1">
                      <span className="w-3 h-3 rounded-sm bg-indigo-500"></span> Taxable
                  </div>
                  <div className="flex items-center gap-1">
                      <span className="w-3 h-3 rounded-sm bg-emerald-500"></span> Pre-Tax
                  </div>
                  <div className="flex items-center gap-1">
                      <span className="w-3 h-3 rounded-sm bg-orange-400"></span> Post-Tax
                  </div>
              </div>
            </div>

            <div className="flex-1 w-full min-h-0">
               {results && (
                  <ResponsiveContainer width="100%" height="100%">
                    <AreaChart data={results.medianData} margin={{ top: 10, right: 30, left: 0, bottom: 0 }}>
                      <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#f1f5f9" />
                      <XAxis
                        dataKey="age"
                        stroke="#94a3b8"
                        tick={{fontSize: 12}}
                        label={{ value: 'Age', position: 'insideBottomRight', offset: -5 }}
                      />
                      <YAxis
                        stroke="#94a3b8"
                        tick={{fontSize: 12}}
                        tickFormatter={formatAxis}
                      />
                      <Tooltip
                        formatter={(value) => formatCurrency(value)}
                        labelFormatter={(label) => `Age ${label}`}
                        contentStyle={{ borderRadius: '8px', border: 'none', boxShadow: '0 4px 6px -1px rgb(0 0 0 / 0.1)' }}
                      />
                      <ReferenceArea x1={params.retirementAge} x2={params.retirementAge + 0.5} stroke="none" fill="#6366f1" fillOpacity={0.2} />

                      <Area type="monotone" dataKey="taxable" stackId="1" stroke="#6366f1" fill="#6366f1" fillOpacity={0.8} name="Taxable" />
                      <Area type="monotone" dataKey="pretax" stackId="1" stroke="#10b981" fill="#10b981" fillOpacity={0.8} name="Pre-Tax" />
                      <Area type="monotone" dataKey="roth" stackId="1" stroke="#fb923c" fill="#fb923c" fillOpacity={0.8} name="Post-Tax" />
                    </AreaChart>
                  </ResponsiveContainer>
               )}
            </div>
          </div>

        </div>
      </div>
    </div>
  );
}
