/**
 * Cash-Inflow Portfolio Rebalancing with No-Sale (Long-Only Buy) Constraint.
 * Assumes zero transaction cost.
 *
 * Algorithm:
 * Continuous water-filling algorithm to find threshold T* in O(N log N).
 * T* is the target scale where sum(max(0, w_i * T* - v_i)) = Cash.
 * Future value v_i' = v_i + max(0, w_i * T* - v_i).
 */

export function validatePortfolio(cash, securities) {
  const errors = [];
  if (typeof cash !== "number" || isNaN(cash) || cash < 0) {
    errors.push("Cash inflow must be a non-negative number.");
  }
  if (!Array.isArray(securities) || securities.length === 0) {
    errors.push("Portfolio must contain at least one security.");
    return { valid: errors.length === 0, errors, totalWeight: 0 };
  }
  let totalWeight = 0;
  securities.forEach((s, idx) => {
    const label = s.name ? `"${s.name}" (row ${idx + 1})` : `Row ${idx + 1}`;
    if (typeof s.currentValue !== "number" || isNaN(s.currentValue) || s.currentValue < 0) {
      errors.push(`${label}: Current value must be a non-negative number.`);
    }
    if (typeof s.targetWeight !== "number" || isNaN(s.targetWeight) || s.targetWeight < 0) {
      errors.push(`${label}: Target percentage must be a non-negative number.`);
    } else {
      totalWeight += s.targetWeight;
    }
  });
  if (totalWeight <= 0) {
    errors.push("Total target weight must be greater than 0%.");
  }
  return { valid: errors.length === 0, errors, totalWeight };
}

export function normalizeWeights(securities) {
  const sum = securities.reduce((acc, s) => acc + Math.max(0, Number(s.targetWeight) || 0), 0);
  if (sum === 0) return securities.map(s => ({ ...s }));
  return securities.map(s => ({
    ...s,
    targetWeight: Number(((Math.max(0, Number(s.targetWeight) || 0) / sum) * 100).toFixed(4))
  }));
}

export function calculateDrift(items, totalValue) {
  if (!totalValue || totalValue <= 0 || !items || items.length === 0) return 0;
  const sumAbsDiff = items.reduce((sum, item) => {
    const actualFraction = (item.value || 0) / totalValue;
    return sum + Math.abs(actualFraction - (item.targetFraction || 0));
  }, 0);
  return (sumAbsDiff / 2) * 100;
}

export function rebalancePortfolio(cashInflow, securities, options = {}) {
  const { tolerance = 1e-9 } = options;
  const cash = Math.max(0, Number(cashInflow) || 0);
  const items = Array.isArray(securities) ? securities : [];

  if (items.length === 0) {
    return {
      cashInflow: cash,
      totalCurrentValue: 0,
      totalFutureValue: cash,
      allocatedCash: 0,
      unallocatedCash: cash,
      driftBefore: 0,
      driftAfter: 0,
      driftReduction: 0,
      securities: []
    };
  }

  const rawSumWeight = items.reduce((acc, s) => acc + Math.max(0, Number(s.targetWeight) || 0), 0);

  const normalized = items.map((s, index) => {
    const currentValue = Math.max(0, Number(s.currentValue) || 0);
    const rawWeight = Math.max(0, Number(s.targetWeight) || 0);
    const targetFraction = rawSumWeight > 0 ? rawWeight / rawSumWeight : 0;
    const unitPrice = s.unitPrice && Number(s.unitPrice) > 0 ? Number(s.unitPrice) : null;

    return {
      id: s.id ?? index,
      name: s.name ? String(s.name).trim() : `Security ${index + 1}`,
      currentValue,
      targetWeight: rawWeight,
      targetFraction,
      unitPrice,
      originalIndex: index
    };
  });

  const totalCurrentValue = normalized.reduce((acc, s) => acc + s.currentValue, 0);
  const totalFutureValue = totalCurrentValue + cash;
  const eligible = normalized.filter(s => s.targetFraction > 0);

  let allocatedCash = 0;
  let targetScaleT = 0;
  const allocations = new Map();

  if (eligible.length > 0 && cash > 0) {
    const sorted = [...eligible].sort((a, b) => {
      const rA = a.currentValue / a.targetFraction;
      const rB = b.currentValue / b.targetFraction;
      return rA - rB;
    });

    let cumW = 0;
    let cumV = 0;
    let found = false;

    for (let k = 0; k < sorted.length; k++) {
      cumW += sorted[k].targetFraction;
      cumV += sorted[k].currentValue;

      if (k < sorted.length - 1) {
        const nextR = sorted[k + 1].currentValue / sorted[k + 1].targetFraction;
        const cashNeeded = cumW * nextR - cumV;

        if (cash <= cashNeeded + tolerance) {
          targetScaleT = (cash + cumV) / cumW;
          found = true;
          break;
        }
      }
    }

    if (!found) {
      targetScaleT = (cash + cumV) / cumW;
    }

    let sumAllocated = 0;
    sorted.forEach(s => {
      const needed = Math.max(0, s.targetFraction * targetScaleT - s.currentValue);
      allocations.set(s.id, needed);
      sumAllocated += needed;
    });

    allocatedCash = sumAllocated;
  } else {
    normalized.forEach(s => allocations.set(s.id, 0));
    allocatedCash = 0;
  }

  const unallocatedCash = Math.max(0, cash - allocatedCash);

  const resultSecurities = normalized.map(s => {
    const cashAlloc = allocations.get(s.id) || 0;
    const futureValue = s.currentValue + cashAlloc;

    const currentWeightPct = totalCurrentValue > 0
      ? (s.currentValue / totalCurrentValue) * 100
      : 0;
    const futureWeightPct = totalFutureValue > 0
      ? (futureValue / totalFutureValue) * 100
      : 0;
    const targetWeightPct = s.targetFraction * 100;

    const shareCountBefore = s.unitPrice ? s.currentValue / s.unitPrice : null;
    const sharesToBuy = s.unitPrice ? cashAlloc / s.unitPrice : null;
    const shareCountAfter = s.unitPrice ? futureValue / s.unitPrice : null;

    let status = "target_met";
    let statusLabel = "On Target";
    if (s.targetFraction === 0) {
      status = "zero_target";
      statusLabel = "Zero Target";
    } else if (cashAlloc === 0 && futureWeightPct > targetWeightPct + 0.05) {
      status = "overweight";
      statusLabel = "Overweight (No Buy)";
    } else if (cashAlloc === 0 && futureWeightPct < targetWeightPct - 0.05) {
      status = "underweight";
      statusLabel = "Underweight (No Cash)";
    } else if (cashAlloc > 0 && futureWeightPct < targetWeightPct - 0.05) {
      status = "partially_rebalanced";
      statusLabel = "Partially Rebalanced";
    }

    return {
      id: s.id,
      name: s.name,
      currentValue: s.currentValue,
      currentWeightPct,
      targetWeightPct,
      targetFraction: s.targetFraction,
      cashAllocated: cashAlloc,
      futureValue,
      futureWeightPct,
      deltaWeightPct: futureWeightPct - currentWeightPct,
      unitPrice: s.unitPrice,
      shareCountBefore,
      sharesToBuy,
      shareCountAfter,
      status,
      statusLabel
    };
  });

  const driftBefore = calculateDrift(
    resultSecurities.map(s => ({ value: s.currentValue, targetFraction: s.targetFraction })),
    totalCurrentValue
  );

  const driftAfter = calculateDrift(
    resultSecurities.map(s => ({ value: s.futureValue, targetFraction: s.targetFraction })),
    totalFutureValue
  );

  const driftReduction = Math.max(0, driftBefore - driftAfter);

  return {
    cashInflow: cash,
    totalCurrentValue,
    totalFutureValue,
    allocatedCash,
    unallocatedCash,
    targetScaleT,
    driftBefore,
    driftAfter,
    driftReduction,
    rawSumWeight,
    isWeightSum100: Math.abs(rawSumWeight - 100) < 0.01,
    securities: resultSecurities
  };
}

if (typeof window !== "undefined") {
  window.PortfolioRebalance = {
    rebalancePortfolio,
    validatePortfolio,
    normalizeWeights,
    calculateDrift
  };
}
