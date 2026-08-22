# Cash-Inflow Portfolio Rebalancer (Long-Only / No-Sale)

A lightweight web application (HTML5 + Vanilla JavaScript) that solves the **cash-inflow portfolio rebalancing problem** under a strict **no-sale (long-only buy) constraint** with zero transaction costs.

---

## 📌 Problem Overview

When contributing new cash into an investment portfolio, investors often want to rebalance without selling existing overweight assets (to avoid capital gains taxes, transaction fees, or market friction).

### Inputs
1. **Cash Inflow ($C \ge 0$)**: The new cash amount available to invest.
2. **Securities List**:
   - Security Symbol / Name ($i = 1, \dots, N$)
   - Current Holding Value ($v_i \ge 0$)
   - Target Weight Percentage ($w_i \ge 0$, where $\sum w_i = 100\%$)
   - *(Optional)* Share Price ($p_i > 0$) to compute shares to buy.

### Outputs
- **Buy Allocation ($x_i \ge 0$)**: Amount of new cash to allocate to each security.
- **Future Value ($v'_i = v_i + x_i$)**: Value of each security post-rebalancing.
- **Future Weight (%)**: New portfolio percentage for each security.
- **Rebalancing Status**: Categorized as *On Target*, *Partially Rebalanced*, *Overweight (No Buy)*, or *Zero Target*.

---

## 🧮 Mathematical Formulation & Algorithm

### 1. The Optimization Objective
Given total current value $V_{\text{curr}} = \sum v_i$ and total future value $V_{\text{future}} = V_{\text{curr}} + C$:
- We seek buy amounts $x_i \ge 0$ such that $\sum_{i=1}^N x_i = C$.
- The goal is to bring each security's future value $v'_i = v_i + x_i$ as close to target proportions $w_i$ as possible.
- If $C$ is sufficiently large, every security reaches $v'_i = w_i \cdot V_{\text{future}}$.
- If $C$ is limited, overweight assets ($v_i > w_i \cdot V_{\text{future}}$) receive $x_i = 0$, while all cash is allocated among underweight assets to equalize their relative proportions.

### 2. Water-Filling Threshold Algorithm ($O(N \log N)$)
For each security $i$ with $w_i > 0$, define its implied portfolio scale:
$$r_i = \frac{v_i}{w_i}$$

Sort the securities in ascending order of $r_i$: $r_{(1)} \le r_{(2)} \le \dots \le r_{(K)}$.

Let $W_k = \sum_{j=1}^k w_{(j)}$ and $V_k = \sum_{j=1}^k v_{(j)}$ be prefix sums of weights and current values.

The cash required to bring the first $k$ securities up to the level of security $k+1$ is:
$$C_{\text{needed}}(k) = W_k \cdot r_{(k+1)} - V_k$$

Iterating through the breakpoints finds the exact target level $T^*$:
$$T^* = \frac{C + V_{k^*}}{W_{k^*}}$$

The optimal buy allocation for each security is:
$$x_i = \max(0, w_i \cdot T^* - v_i)$$
$$v'_i = v_i + x_i$$

### 3. Key Invariant
For any two securities $i$ and $j$ that receive new cash ($x_i > 0, x_j > 0$), their post-rebalance value ratio matches their target weight ratio exactly:
$$\frac{v'_i}{v'_j} = \frac{w_i}{w_j}$$

---

## 🚀 Running the Web App

From the repository root:
```bash
./serve.sh
```
Or specify a custom port:
```bash
./serve.sh 8080
```
Open your browser at: **`http://localhost:8000/portfolio-rebalance/`**

**DO NOT** run the app by opening the file directly in a browser. Due to CORS rule, the JS assets cannot be loaded in that case.


---

## 🧪 Unit Tests

The core algorithm is tested across 12 comprehensive test cases covering:
- Two-asset partial rebalance (underweight vs overweight).
- Multi-asset breakpoint transitions (Bogleheads 3-fund, Ray Dalio All-Weather).
- Full rebalancing with large cash inflow.
- Zero cash inflow ($C = 0$).
- Empty initial portfolio (allocation from scratch).
- Single security portfolio.
- Zero target weight handling ($w_i = 0 \implies x_i = 0$).
- Non-negativity constraints ($x_i \ge 0$).
- Cash conservation invariant ($\sum x_i = C$).
- Relative proportionality among receiving assets.
- Input validation and weight normalization.

### Run Tests with Node.js
```bash
node --test portfolio-rebalance/rebalance.test.js
```

### Run Tests with Bun
```bash
bun test portfolio-rebalance/rebalance.test.js
```

---

## 📂 File Structure

```
portfolio-rebalance/
├── rebalance.js       # Core algorithm, validation, drift calculation, and weight normalization
├── rebalance.test.js  # Test suite runnable via node --test and bun test
├── index.html         # Responsive, zero-dependency HTML5 UI
├── app.js             # UI controller, reactive bindings, charts, and storage
├── serve.sh           # Local Python HTTP server launcher
└── README.md          # Project documentation & algorithm reference
```

---

## 💡 Web App Features

- **Reactive Live Calculations**: Automatically updates future values, percentages, and KPIs as you type.
- **Presets**: 1-click loading for Bogleheads 3-Fund, Classic 60/40, Ray Dalio All-Weather, and Tech Growth Tilt.
- **Target % Auto-Normalize**: One-click scaling to ensure weights sum to 100.0%.
- **Share Price Mode**: Optional toggle to input unit prices and calculate fractional/integer shares to buy.
- **Visual Analytics**:
  - Comparison bar chart showing **Current % vs Future % vs Target %** for every security.
  - Color-coded segmented bar for cash inflow deployment.
- **CSV Export**: Download full rebalancing breakdown as a CSV spreadsheet.
- **Persistence**: Automatically preserves portfolio inputs in `localStorage`.
