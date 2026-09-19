# Developer & Agent Guidelines for `apps/`

This document defines architecture standards, tech stack rules, testing requirements, local hosting guidelines, and design system themes for all applications built under the `apps/` directory.

---

## 🛠️ Technology Stack & Architecture Guidelines

### 1. Pure HTML & Vanilla JavaScript
- **Default Requirement**: Unless the user explicitly specifies otherwise, all apps in `apps/` must be written using **pure HTML and JavaScript**.
- Keep apps lightweight, self-contained, and runnable directly without required compilation or bundling pipelines.
- **Tailwind CSS**: Optional use of Tailwind CSS (via CDN `<script src="https://cdn.tailwindcss.com"></script>`) is permitted **if layout or styling complexity warrants it**. Otherwise, clean vanilla CSS (in a `style.css` file or embedded `<style>`) is preferred.

### 2. Multi-File Code Organization & Local Server
- **File Splitting**: If application complexity warrants it, split the scripts into one or more modular JS files (e.g. `app.js`, domain logic in `rebalance.js` or `pw-gen.js`, etc.) alongside `index.html` and the optional `style.css`.
- **Local Server Instruction**: When splitting into separate files (or using ES modules / fetch / workers), instruct the user to run the centralized server script rather than opening via `file://` to prevent CORS issues.
- **Centralized Server Script**:
  All local development uses the single shared launcher directly under `apps/serve.sh`. Do **not** create individual `serve.sh` copies inside individual app directories.
  ```bash
  # From inside an app folder (e.g. apps/pw-gen):
  ../serve.sh [PORT]

  # From apps/ directory:
  ./serve.sh [APP_NAME] [PORT]

  # Or from repository root:
  ./apps/serve.sh [APP_NAME] [PORT]
  ```

### 3. Unit Tests & CI/CD Isolation
- **Unit Testing**: If complexity warrants it (e.g. algorithms, mathematical models, state machines, cryptographics), create unit test JS files (e.g. `*.test.js`).
- **Runtime Compatibility**: All unit test files must be directly runnable with **Node.js** (`node <file>.test.js` or `node --test`) or **Bun** (`bun test`). Do not require heavy test harnesses or transpilation.
- **Exclude from gh-pages**: Unit tests, test suites, and internal scripts must **never be deployed to GitHub Pages**. In the app's `.github/workflows/deploy-site-<app-name>.yaml`, always ensure test files and server scripts are excluded:
  ```yaml
  - name: Deploy
    uses: peaceiris/actions-gh-pages@v4
    with:
      github_token: ${{ secrets.GITHUB_TOKEN }}
      publish_branch: gh-pages
      publish_dir: ./apps/<app-name>
      destination_dir: apps/<app-name>
      exclude: |
        **/*.test.js
        **/tests/**
        serve.sh
      commit_message: "deploy <app-name> from: ${{ github.event.head_commit.message }}"
  ```

### 4. UI Layout & Micro-Interactions
- **Centered Card Architecture**: The main viewport should typically feature a centered, rounded rectangular card (`rounded-2xl` / `rounded-3xl` or `border-radius: 16px - 24px`), soft elevation shadows, and clean margins.
- **Responsive**: Fully responsive and mobile-friendly with touch-friendly tap targets and adaptive typography.
- **Tactile Feedback**: Add micro-interactions such as active click compression (`.interactive-scale:active { transform: scale(0.96); }` or `active:scale-95`), clean accessible focus outlines, and responsive action feedback (such as copy confirmations, toasts, or rotational animations on refresh).

### 5. Repository Integration
When creating a new app:
1. Directory: `apps/<app-name>/` with `index.html`.
2. Documentation: `apps/<app-name>/README.md` describing problem overview, algorithms, and usage.
3. Workflow: `.github/workflows/deploy-site-<app-name>.yaml` with concurrency group `deploy-pages`.
4. Catalog: Add link and description to `blog/content/page/apps/index.md`.

---

## 🎨 Color Palettes & Theming

Both light and dark themes leverage modern glassmorphism (frosted glass surface over an ambient gradient background) to ensure visual consistency across applications.

### 1. Light Theme (from Client-Side Password Generator)
A modern, crisp light glassmorphic theme with slate typography, translucent frosted card, and vibrant cobalt blue accents.

#### CSS Variables
```css
:root {
  /* Ambient Page Colors */
  --bg-page: #f8fafc; /* Slate 50 */

  /* Glassmorphism Card */
  --card-glass-bg: rgba(255, 255, 255, 0.82);
  --card-glass-border: rgba(255, 255, 255, 0.90);
  --card-shadow: 0 20px 35px -10px rgba(15, 23, 42, 0.08), 0 8px 16px -6px rgba(15, 23, 42, 0.04), inset 0 1px 1px 0 rgba(255, 255, 255, 0.95);
  --radius-card: 24px;

  /* Typography */
  --text-main: #0f172a; /* Slate 900 */
  --text-muted: #475569; /* Slate 600 */
  --text-dim: #94a3b8; /* Slate 400 */

  /* Primary Action */
  --primary: #2563eb; /* Blue 600 */
  --primary-hover: #1d4ed8; /* Blue 700 */
  --primary-light: rgba(239, 246, 255, 0.85); /* Blue 50 */
  --primary-border: #bfdbfe; /* Blue 200 */
  --primary-text: #1e40af; /* Blue 800 */

  /* Form Inputs & Controls */
  --input-bg: rgba(248, 250, 252, 0.75);
  --input-border: #cbd5e1; /* Slate 300 */
  --input-focus: #3b82f6; /* Blue 500 */
  --slider-track: rgba(226, 232, 240, 0.85);

  /* Status Colors */
  --success: #059669;
  --success-light: #ecfdf5;
  --success-border: #a7f3d0;
  --warning: #d97706;
  --warning-light: #fffbeb;
  --danger: #dc2626;
  --danger-light: #fef2f2;
}

/* Atmospheric ambient mesh background to give frosted glass depth */
body {
  background-color: var(--bg-page);
  background-image: 
    radial-gradient(at 10% 10%, rgba(219, 234, 254, 0.8) 0px, transparent 55%),
    radial-gradient(at 90% 90%, rgba(224, 231, 255, 0.75) 0px, transparent 55%),
    radial-gradient(at 50% 50%, #f8fafc 0px, #f1f5f9 100%);
  background-attachment: fixed;
}
```

#### Tailwind Classes Reference
- **Page Background**: `bg-slate-50 bg-[radial-gradient(at_10%_10%,_rgba(219,234,254,0.8)_0px,_transparent_55%),radial-gradient(at_90%_90%,_rgba(224,231,255,0.75)_0px,_transparent_55%)]`
- **Glass Card**: `bg-white/80 backdrop-blur-xl border border-white/90 rounded-3xl shadow-xl shadow-slate-900/5`
- **Headings & Body**: `text-slate-900 font-bold` / `text-slate-600` / `text-slate-400`
- **Primary Buttons**: `bg-blue-600 hover:bg-blue-700 text-white font-semibold rounded-xl transition`
- **Secondary Buttons**: `bg-white/75 backdrop-blur-sm hover:bg-blue-50 text-slate-600 hover:text-blue-600 border border-slate-200`
- **Inputs & Selects**: `bg-slate-50/80 backdrop-blur-sm border border-slate-300 rounded-lg text-slate-900 focus:ring-2 focus:ring-blue-500`

---

### 2. Dark Theme (from Noise Generator / Sleep Sound)
An ambient, immersive dark theme featuring deep midnight tones, dark glassmorphism frosted glass, and glowing blue accents.

#### CSS Variables
```css
:root {
  /* Page Background */
  --bg-page: radial-gradient(circle at center, #1e293b 0%, #020617 100%); /* Slate 800 to Slate 950 */
  --bg-oled: #000000;
  
  /* Glassmorphic Card */
  --card-glass-bg: rgba(255, 255, 255, 0.10); /* white/10 with backdrop-blur-xl */
  --card-glass-border: rgba(255, 255, 255, 0.20); /* white/20 */
  --card-glass-shadow: 0 8px 32px 0 rgba(0, 0, 0, 0.30);
  --radius-card: 24px;

  /* Typography */
  --text-main: #ffffff;
  --text-muted: #94a3b8; /* Slate 400 */
  --text-label: #cbd5e1; /* Slate 300 */

  /* Dark Controls & Surfaces */
  --surface-dark: #0f172a; /* Slate 900 */
  --surface-border: #475569; /* Slate 600 */
  --control-track: #334155; /* Slate 700 */
  --slider-track: #cbd5e1; /* Idle */
  --slider-thumb: #ffffff;
  --slider-track-active: #475569;
  --slider-thumb-active: #64748b;

  /* Accent & Focus */
  --primary: #2563eb; /* Blue 600 */
  --primary-glow: #3b82f6; /* Blue 500 */
  --accent-focus: #60a5fa; /* Blue 400 */
}
```

#### Tailwind Classes Reference
- **Page Background**: `bg-[radial-gradient(circle_at_center,_#1e293b_0%,_#020617_100%)]`
- **Glass Card**: `bg-white/10 backdrop-blur-xl border border-white/20 rounded-3xl shadow-[0_8px_32px_0_rgba(0,0,0,0.3)]`
- **Headings & Body**: `text-white font-bold` / `text-slate-400` / `text-slate-300`
- **Inputs & Dropdowns**: `bg-slate-900 border border-slate-600 rounded-lg text-white focus:ring-2 focus:ring-blue-500`
- **Sliders & Toggles**: `bg-slate-700 checked:bg-blue-600`
- **Accent & Focus**: `ring-blue-500 text-blue-400`
