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
});
