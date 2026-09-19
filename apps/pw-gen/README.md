# Client-side Password Generator

A clean, responsive, pure HTML5/CSS/JavaScript web application that generates batches of cryptographically secure passwords locally inside the browser.

---

## 🔒 Security & Privacy

- **100% Client-Side**: No network requests, zero telemetry, no backend server. Passwords never leave your device.
- **Web Crypto API**: Generates random numbers using `window.crypto.getRandomValues()`.
- **Zero Modulo Bias**: Uses rejection sampling to ensure every character has an equal probability of being picked.
- **Guaranteed Diversity**: If a character set is active, every generated password is guaranteed to contain at least one character from that set (when password length allows).
- **Fisher-Yates Cryptographic Shuffle**: Ensures character positions cannot be predicted.

---

## ✨ Features

- **Light Modern Theme**: Clean centered rounded card layout, subtle elevation, and responsive design for desktop and mobile.
- **Configurable Length**: Synced slider, numeric input, and quick presets (12, 16, 24, 32). Defaults to 16.
- **Character Sets**:
  - Upper case (`A-Z`) - *Checked by default*
  - Lower case (`a-z`) - *Checked by default*
  - Number (`0-9`) - *Checked by default*
  - Special char (`!@#$%^&*`) - *Unchecked by default*
- **Selection-Only Output Box**:
  - Displays 10 generated passwords.
  - Users can highlight, select, and copy any line or all passwords.
  - Direct typing, deletion, and pasting are strictly disabled.
  - Double-click any line to select that single password.
- **Live Auto-Regeneration**: Instantly recalculates passwords whenever length or character sets are adjusted.
- **Entropy & Strength Estimation**: Computes Shannon entropy ($\approx L \cdot \log_2(|\Sigma|)$) with real-time rating indicators.

---

## 🚀 Running Locally

You can simply open `index.html` directly in any web browser, or serve it locally:

```bash
cd apps/pw-gen
../serve.sh
```

Then visit [http://127.0.0.1:8080/](http://127.0.0.1:8080/).
