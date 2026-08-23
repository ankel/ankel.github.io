import { describe, it } from "node:test";
import assert from "node:assert/strict";
import {
  rebalancePortfolio,
  validatePortfolio,
  normalizeWeights,
  calculateDrift
} from "./rebalance.js";

const EPSILON = 1e-6;

function assertClose(actual, expected, message = "") {
  assert.ok(
    Math.abs(actual - expected) < EPSILON,
    `${message} - Expected ${actual} to be within ${EPSILON} of ${expected}`
  );
}

describe("Cash-Inflow Portfolio Rebalancing (Long-Only / No-Sale)", () => {
  it("solves 2-asset portfolio with 1 underweight and 1 overweight asset", () => {
    // A: current 80, target 50%
    // B: current 20, target 50%
    // Cash: 20 -> Total 120. Target for both is 60.
    // A is overweight (80 > 60), gets 0. B is underweight (20 < 60), gets 20.
    const result = rebalancePortfolio(20, [
      { id: "A", name: "Asset A", currentValue: 80, targetWeight: 50 },
      { id: "B", name: "Asset B", currentValue: 20, targetWeight: 50 }
    ]);

    assertClose(result.totalCurrentValue, 100);
    assertClose(result.totalFutureValue, 120);
    assertClose(result.allocatedCash, 20);

    const assetA = result.securities.find(s => s.id === "A");
    const assetB = result.securities.find(s => s.id === "B");

    assertClose(assetA.cashAllocated, 0, "Asset A gets no cash");
    assertClose(assetA.futureValue, 80, "Asset A future value is 80");
    assert.equal(assetA.status, "overweight");

    assertClose(assetB.cashAllocated, 20, "Asset B gets all 20 cash");
    assertClose(assetB.futureValue, 40, "Asset B future value is 40");
    assert.equal(assetB.status, "partially_rebalanced");
  });

  it("rebalances 3-fund portfolio across multiple breakpoints", () => {
    // A: 50, target 20% (r = 250)
    // B: 30, target 50% (r = 60)
    // C: 20, target 30% (r = 66.67)
    // Total current = 100. Cash = 50. Total future = 150.
    // T* is 125. A gets 0, B gets 32.5, C gets 17.5.
    const result = rebalancePortfolio(50, [
      { id: "A", name: "A", currentValue: 50, targetWeight: 20 },
      { id: "B", name: "B", currentValue: 30, targetWeight: 50 },
      { id: "C", name: "C", currentValue: 20, targetWeight: 30 }
    ]);

    assertClose(result.totalCurrentValue, 100);
    assertClose(result.totalFutureValue, 150);
    assertClose(result.allocatedCash, 50);

    const secA = result.securities.find(s => s.id === "A");
    const secB = result.securities.find(s => s.id === "B");
    const secC = result.securities.find(s => s.id === "C");

    assertClose(secA.cashAllocated, 0);
    assertClose(secA.futureValue, 50);

    assertClose(secB.cashAllocated, 32.5);
    assertClose(secB.futureValue, 62.5);

    assertClose(secC.cashAllocated, 17.5);
    assertClose(secC.futureValue, 37.5);

    // Verify exact proportionality between active receiving assets: B and C
    // Future value ratio B/C should be 62.5 / 37.5 = 5/3 = target ratio 50/30
    assertClose(secB.futureValue / secC.futureValue, 50 / 30, "Active assets match target ratio");
  });

  it("achieves exact target weights when cash is large enough", () => {
    // Current: VTI: 1000 (target 60%), VXUS: 200 (target 30%), BND: 100 (target 10%)
    // Total current = 1300. Cash = 1700. Total future = 3000.
    // Targets: VTI = 1800, VXUS = 900, BND = 300.
    const result = rebalancePortfolio(1700, [
      { name: "VTI", currentValue: 1000, targetWeight: 60 },
      { name: "VXUS", currentValue: 200, targetWeight: 30 },
      { name: "BND", currentValue: 100, targetWeight: 10 }
    ]);

    assertClose(result.totalFutureValue, 3000);
    const [vti, vxus, bnd] = result.securities;

    assertClose(vti.futureValue, 1800);
    assertClose(vxus.futureValue, 900);
    assertClose(bnd.futureValue, 300);

    assertClose(vti.futureWeightPct, 60);
    assertClose(vxus.futureWeightPct, 30);
    assertClose(bnd.futureWeightPct, 10);

    assert.equal(vti.status, "target_met");
    assert.equal(vxus.status, "target_met");
    assert.equal(bnd.status, "target_met");
    assertClose(result.driftAfter, 0, "Zero drift after full rebalance");
  });

  it("handles zero cash inflow without modifying values", () => {
    const result = rebalancePortfolio(0, [
      { name: "VTI", currentValue: 500, targetWeight: 70 },
      { name: "BND", currentValue: 500, targetWeight: 30 }
    ]);

    assertClose(result.allocatedCash, 0);
    assertClose(result.securities[0].cashAllocated, 0);
    assertClose(result.securities[0].futureValue, 500);
    assertClose(result.securities[1].cashAllocated, 0);
    assertClose(result.securities[1].futureValue, 500);
  });

  it("reports underweight status when cash inflow is zero", () => {
    // With cash = 0, an underweight asset receives no buy and sits 20
    // percentage points below target: it must not be labeled as on target.
    const result = rebalancePortfolio(0, [
      { name: "VTI", currentValue: 700, targetWeight: 50 },
      { name: "BND", currentValue: 300, targetWeight: 50 }
    ]);

    const vti = result.securities.find(s => s.name === "VTI");
    const bnd = result.securities.find(s => s.name === "BND");

    // Overweight asset is correctly flagged.
    assert.equal(vti.status, "overweight");

    // Underweight asset: 30% actual vs 50% target, zero allocation.
    assertClose(bnd.cashAllocated, 0);
    assertClose(bnd.futureWeightPct, 30, "BND stays at 30%");
    assertClose(bnd.targetWeightPct, 50, "BND target is 50%");
    assert.ok(bnd.futureWeightPct < bnd.targetWeightPct - 0.05, "BND is underweight");

    assert.equal(bnd.status, "underweight");
    assert.equal(bnd.statusLabel, "Underweight (No Cash)");
  });

  it("handles empty initial portfolio (all current values are 0)", () => {
    const result = rebalancePortfolio(1000, [
      { name: "Stock", currentValue: 0, targetWeight: 70 },
      { name: "Bond", currentValue: 0, targetWeight: 30 }
    ]);

    assertClose(result.totalFutureValue, 1000);
    assertClose(result.securities[0].futureValue, 700);
    assertClose(result.securities[1].futureValue, 300);
    assertClose(result.securities[0].futureWeightPct, 70);
    assertClose(result.securities[1].futureWeightPct, 30);
    assertClose(result.driftAfter, 0);
  });

  it("handles single security portfolio", () => {
    const result = rebalancePortfolio(250, [
      { name: "OnlyStock", currentValue: 750, targetWeight: 100 }
    ]);

    assertClose(result.totalFutureValue, 1000);
    assertClose(result.securities[0].cashAllocated, 250);
    assertClose(result.securities[0].futureValue, 1000);
    assertClose(result.securities[0].futureWeightPct, 100);
  });

  it("ignores assets with 0 target weight and never allocates cash to them", () => {
    const result = rebalancePortfolio(100, [
      { name: "LegacyAsset", currentValue: 50, targetWeight: 0 },
      { name: "TargetAsset", currentValue: 50, targetWeight: 100 }
    ]);

    assertClose(result.securities[0].cashAllocated, 0);
    assertClose(result.securities[0].futureValue, 50);
    assert.equal(result.securities[0].status, "zero_target");

    assertClose(result.securities[1].cashAllocated, 100);
    assertClose(result.securities[1].futureValue, 150);
  });

  it("enforces no-sale constraint (all allocations >= 0)", () => {
    const result = rebalancePortfolio(10, [
      { name: "Overweighted1", currentValue: 9000, targetWeight: 10 },
      { name: "Overweighted2", currentValue: 5000, targetWeight: 20 },
      { name: "Underweighted", currentValue: 100, targetWeight: 70 }
    ]);

    result.securities.forEach(s => {
      assert.ok(s.cashAllocated >= 0, `Allocation for ${s.name} must be >= 0`);
      assert.ok(s.futureValue >= s.currentValue, `Future value for ${s.name} must be >= current value`);
    });
    assertClose(result.allocatedCash, 10);
    assertClose(result.securities[2].cashAllocated, 10);
  });

  it("correctly reduces portfolio drift", () => {
    const result = rebalancePortfolio(300, [
      { name: "Asset1", currentValue: 700, targetWeight: 50 },
      { name: "Asset2", currentValue: 100, targetWeight: 50 }
    ]);

    assert.ok(result.driftAfter < result.driftBefore, "Drift after is strictly less than drift before");
    assert.ok(result.driftReduction > 0, "Drift reduction is positive");
  });

  it("calculates share purchases when unitPrice is provided", () => {
    const result = rebalancePortfolio(200, [
      { name: "Stock A", currentValue: 100, targetWeight: 50, unitPrice: 50 },
      { name: "Stock B", currentValue: 100, targetWeight: 50, unitPrice: 25 }
    ]);

    const a = result.securities[0];
    const b = result.securities[1];

    assertClose(a.cashAllocated, 100);
    assertClose(a.sharesToBuy, 2); // 100 / 50
    assertClose(a.shareCountAfter, 4); // (100 + 100) / 50

    assertClose(b.cashAllocated, 100);
    assertClose(b.sharesToBuy, 4); // 100 / 25
    assertClose(b.shareCountAfter, 8); // (100 + 100) / 25
  });
  it("conserves cash: allocations sum to inflow with nothing unallocated", () => {
    const cash = 1337;
    const result = rebalancePortfolio(cash, [
      { name: "A", currentValue: 400, targetWeight: 35 },
      { name: "B", currentValue: 250, targetWeight: 25 },
      { name: "C", currentValue: 90, targetWeight: 40 }
    ]);

    const sumAllocated = result.securities.reduce((acc, s) => acc + s.cashAllocated, 0);
    assertClose(sumAllocated, cash, "Sum of per-asset allocations equals inflow");
    assertClose(result.allocatedCash, cash, "allocatedCash equals inflow");
    assertClose(result.unallocatedCash, 0, "No cash left unallocated");
  });

  it("internally normalizes target weights that do not sum to 100", () => {
    // 60/30 sums to 90; effective fractions are 2/3 and 1/3.
    // V = 100, cash = 50 -> V' = 150. Normalized targets: A = 100, B = 50.
    // B is already at target; all cash goes to A.
    const result = rebalancePortfolio(50, [
      { name: "A", currentValue: 50, targetWeight: 60 },
      { name: "B", currentValue: 50, targetWeight: 30 }
    ]);

    assertClose(result.rawSumWeight, 90);
    assert.equal(result.isWeightSum100, false);
    assertClose(result.securities[0].targetWeightPct, 600 / 9, "60/90 normalized to 66.67%");
    assertClose(result.securities[1].targetWeightPct, 300 / 9, "30/90 normalized to 33.33%");
    assertClose(result.securities[0].cashAllocated, 50);
    assertClose(result.securities[1].cashAllocated, 0);
  });

  it("handles an empty securities array", () => {
    const result = rebalancePortfolio(250, []);

    assertClose(result.totalCurrentValue, 0);
    assertClose(result.totalFutureValue, 250);
    assertClose(result.allocatedCash, 0);
    assertClose(result.unallocatedCash, 250);
    assert.equal(result.securities.length, 0);
  });

  it("allocates no cash when every target weight is zero", () => {
    const result = rebalancePortfolio(100, [
      { name: "A", currentValue: 100, targetWeight: 0 },
      { name: "B", currentValue: 100, targetWeight: 0 }
    ]);

    result.securities.forEach(s => {
      assertClose(s.cashAllocated, 0);
      assertClose(s.futureValue, s.currentValue);
      assert.equal(s.status, "zero_target");
    });
    assertClose(result.allocatedCash, 0);
    assertClose(result.unallocatedCash, 100);
  });

  it("labels assets exactly on target at the breakpoint as target_met", () => {
    // A: 80 @ 50% (r = 160), B: 20 @ 50% (r = 40). Cash = 60 -> V' = 160.
    // B's buy lands exactly on A's breakpoint: both settle at 80/160 = 50%,
    // so both are on target despite B receiving all the cash.
    const result = rebalancePortfolio(60, [
      { name: "A", currentValue: 80, targetWeight: 50 },
      { name: "B", currentValue: 20, targetWeight: 50 }
    ]);

    const a = result.securities.find(s => s.name === "A");
    const b = result.securities.find(s => s.name === "B");

    assertClose(a.cashAllocated, 0);
    assertClose(b.cashAllocated, 60);
    assertClose(b.futureValue, 80);
    assert.equal(a.status, "target_met");
    assert.equal(b.status, "target_met");
    assertClose(result.driftAfter, 0, "Exactly on target after breakpoint rebalance");
  });

  it("coerces invalid cash inflow to zero and accepts numeric strings", () => {
    const sec = [{ name: "A", currentValue: 100, targetWeight: 100 }];

    const negative = rebalancePortfolio(-50, sec);
    assertClose(negative.cashInflow, 0);
    assertClose(negative.securities[0].cashAllocated, 0);

    const nan = rebalancePortfolio(NaN, sec);
    assertClose(nan.cashInflow, 0);

    const str = rebalancePortfolio("75", sec);
    assertClose(str.cashInflow, 75);
    assertClose(str.securities[0].cashAllocated, 75);
  });

  it("leaves share fields null when unitPrice is absent", () => {
    const result = rebalancePortfolio(50, [
      { name: "A", currentValue: 50, targetWeight: 100 }
    ]);

    const s = result.securities[0];
    assert.equal(s.unitPrice, null);
    assert.equal(s.shareCountBefore, null);
    assert.equal(s.sharesToBuy, null);
    assert.equal(s.shareCountAfter, null);
  });

});

describe("Helper Functions", () => {
  it("validates valid and invalid portfolios", () => {
    const valid = validatePortfolio(100, [
      { currentValue: 50, targetWeight: 50 },
      { currentValue: 50, targetWeight: 50 }
    ]);
    assert.equal(valid.valid, true);
    assert.equal(valid.errors.length, 0);

    const invalid = validatePortfolio(-10, [
      { currentValue: -5, targetWeight: 50 }
    ]);
    assert.equal(invalid.valid, false);
    assert.ok(invalid.errors.length >= 2);
  });

  it("normalizes weights correctly", () => {
    const normalized = normalizeWeights([
      { name: "A", targetWeight: 30 },
      { name: "B", targetWeight: 30 }
    ]);
    assertClose(normalized[0].targetWeight, 50);
    assertClose(normalized[1].targetWeight, 50);
  });
  it("calculates drift from known values", () => {
    // Exact 50/50 split vs 50/50 target -> zero drift.
    assertClose(
      calculateDrift(
        [{ value: 50, targetFraction: 0.5 }, { value: 50, targetFraction: 0.5 }],
        100
      ),
      0
    );

    // 70/30 split vs 50/50 target -> 20% drift.
    assertClose(
      calculateDrift(
        [{ value: 70, targetFraction: 0.5 }, { value: 30, targetFraction: 0.5 }],
        100
      ),
      20
    );

    // Degenerate inputs -> 0.
    assertClose(calculateDrift([], 100), 0);
    assertClose(calculateDrift([{ value: 50, targetFraction: 0.5 }], 0), 0);
  });

});
