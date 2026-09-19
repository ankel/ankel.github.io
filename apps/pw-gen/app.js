/**
 * Client-side Password Generator
 * Generates 10 cryptographically secure passwords matching user-defined criteria.
 */

(function () {
  'use strict';

  // Character pool definitions
  const CHARSETS = {
    upper: 'ABCDEFGHIJKLMNOPQRSTUVWXYZ',
    lower: 'abcdefghijklmnopqrstuvwxyz',
    number: '0123456789',
    special: '!@#$%^&*'
  };

  // DOM Elements
  const lengthSlider = document.getElementById('lengthSlider');
  const lengthInput = document.getElementById('lengthInput');
  const charsetUpper = document.getElementById('charsetUpper');
  const charsetLower = document.getElementById('charsetLower');
  const charsetNumber = document.getElementById('charsetNumber');
  const charsetSpecial = document.getElementById('charsetSpecial');
  const passwordOutput = document.getElementById('passwordOutput');
  const copyBtn = document.getElementById('copyBtn');
  const copyBtnText = document.getElementById('copyBtnText');
  const regenBtn = document.getElementById('regenBtn');
  const regenIcon = document.getElementById('regenIcon');
  const toast = document.getElementById('toast');
  const warningBox = document.getElementById('warningBox');
  const entropyBitsSpan = document.getElementById('entropyBits');
  const strengthBadge = document.getElementById('strengthBadge');
  const presetPills = document.querySelectorAll('.preset-pill');

  /**
   * Generates a cryptographically secure random integer in [0, max)
   * using rejection sampling to eliminate modulo bias.
   */
  function secureRandomInt(max) {
    if (max <= 1) return 0;
    const limit = Math.floor(0x100000000 / max) * max;
    const array = new Uint32Array(1);
    let rand;
    do {
      window.crypto.getRandomValues(array);
      rand = array[0];
    } while (rand >= limit);
    return rand % max;
  }

  /**
   * Fisher-Yates cryptographic shuffle
   */
  function secureShuffle(array) {
    for (let i = array.length - 1; i > 0; i--) {
      const j = secureRandomInt(i + 1);
      const temp = array[i];
      array[i] = array[j];
      array[j] = temp;
    }
    return array;
  }

  /**
   * Generates a single password of given length guaranteeing at least
   * one character from each active charset (if length permits).
   */
  function generateSinglePassword(length, activeSets) {
    if (activeSets.length === 0 || length <= 0) {
      return '';
    }

    const chars = [];
    let combinedPool = '';

    // Guarantee at least one character from each selected charset
    activeSets.forEach(setChars => {
      combinedPool += setChars;
      if (chars.length < length) {
        chars.push(setChars[secureRandomInt(setChars.length)]);
      }
    });

    // Fill remaining length from combined pool
    while (chars.length < length) {
      chars.push(combinedPool[secureRandomInt(combinedPool.length)]);
    }

    // Cryptographically shuffle to prevent predictable positions
    return secureShuffle(chars).join('');
  }

  /**
   * Updates password strength & entropy display
   */
  function updateStrength(length, poolSize) {
    if (!entropyBitsSpan || !strengthBadge) return;

    if (poolSize === 0 || length === 0) {
      entropyBitsSpan.textContent = '0 bits';
      strengthBadge.textContent = 'Invalid';
      strengthBadge.className = 'strength-badge very-weak';
      return;
    }

    const entropy = Math.round(length * (Math.log2(poolSize) * 10)) / 10;
    entropyBitsSpan.textContent = `~${entropy} bits`;

    let label = 'Weak';
    let badgeClass = 'weak';

    if (entropy < 40) {
      label = 'Very Weak';
      badgeClass = 'very-weak';
    } else if (entropy < 60) {
      label = 'Moderate';
      badgeClass = 'good';
    } else if (entropy < 90) {
      label = 'Strong';
      badgeClass = 'strong';
    } else {
      label = 'Very Strong';
      badgeClass = 'very-strong';
    }

    strengthBadge.textContent = label;
    strengthBadge.className = `strength-badge ${badgeClass}`;
  }

  /**
   * Update active state of preset pills
   */
  function updatePresetPills(currentVal) {
    presetPills.forEach(pill => {
      const len = parseInt(pill.getAttribute('data-len'), 10);
      if (len === currentVal) {
        pill.classList.add('active');
      } else {
        pill.classList.remove('active');
      }
    });
  }

  /**
   * Generates 10 passwords and updates the UI
   */
  function generatePasswords() {
    const length = parseInt(lengthSlider.value, 10) || 16;
    const activeSets = [];
    let poolSize = 0;

    if (charsetUpper.checked) {
      activeSets.push(CHARSETS.upper);
      poolSize += CHARSETS.upper.length;
    }
    if (charsetLower.checked) {
      activeSets.push(CHARSETS.lower);
      poolSize += CHARSETS.lower.length;
    }
    if (charsetNumber.checked) {
      activeSets.push(CHARSETS.number);
      poolSize += CHARSETS.number.length;
    }
    if (charsetSpecial.checked) {
      activeSets.push(CHARSETS.special);
      poolSize += CHARSETS.special.length;
    }

    if (activeSets.length === 0) {
      if (warningBox) warningBox.classList.add('active');
      passwordOutput.value = '';
      passwordOutput.placeholder = 'Please select at least one character set above.';
      updateStrength(0, 0);
      return;
    }

    if (warningBox) warningBox.classList.remove('active');
    passwordOutput.placeholder = '';

    const passwords = [];
    for (let i = 0; i < 10; i++) {
      passwords.push(generateSinglePassword(length, activeSets));
    }

    passwordOutput.value = passwords.join('\n');
    updateStrength(length, poolSize);
    updatePresetPills(length);
  }

  /**
   * Synchronizes slider and number input
   */
  function syncLength(source) {
    let val = parseInt(source.value, 10);
    const min = parseInt(lengthSlider.min, 10) || 4;
    const max = parseInt(lengthSlider.max, 10) || 64;

    if (isNaN(val)) val = 16;
    if (val < min) val = min;
    if (val > max) val = max;

    lengthSlider.value = val;
    lengthInput.value = val;
    generatePasswords();
  }

  /**
   * Show toast notification
   */
  let toastTimer = null;
  function showToast(message) {
    if (!toast) return;
    toast.textContent = message;
    toast.classList.add('show');
    clearTimeout(toastTimer);
    toastTimer = setTimeout(() => {
      toast.classList.remove('show');
    }, 2000);
  }

  /**
   * Copy all passwords to clipboard with visual button state
   */
  let copyFeedbackTimer = null;
  async function copyAllPasswords() {
    if (!passwordOutput.value.trim()) return;

    try {
      if (navigator.clipboard && navigator.clipboard.writeText) {
        await navigator.clipboard.writeText(passwordOutput.value);
      } else {
        passwordOutput.select();
        document.execCommand('copy');
      }

      if (copyBtnText && copyBtn) {
        copyBtnText.textContent = 'Copied!';
        copyBtn.classList.add('success');
        clearTimeout(copyFeedbackTimer);
        copyFeedbackTimer = setTimeout(() => {
          copyBtnText.textContent = 'Copy All';
          copyBtn.classList.remove('success');
        }, 1800);
      }

      showToast('All 10 passwords copied to clipboard!');
    } catch (err) {
      passwordOutput.select();
      showToast('Selected all passwords (press Ctrl+C / Cmd+C)');
    }
  }

  // --- Strict Read-Only Input Blocking for Password Text Box ---
  // Guarantees user can select and copy passwords, but prevents any typing or modifications
  passwordOutput.addEventListener('beforeinput', function (e) {
    e.preventDefault();
  });

  passwordOutput.addEventListener('keydown', function (e) {
    const allowedKeys = [
      'ArrowUp', 'ArrowDown', 'ArrowLeft', 'ArrowRight',
      'Home', 'End', 'PageUp', 'PageDown', 'Tab'
    ];
    const isCopy = (e.ctrlKey || e.metaKey) && (e.key === 'c' || e.key === 'C');
    const isSelectAll = (e.ctrlKey || e.metaKey) && (e.key === 'a' || e.key === 'A');

    if (allowedKeys.includes(e.key) || isCopy || isSelectAll) {
      return; // allow navigation and copying
    }

    // Disallow all text modifications (typing, backspace, delete, enter, etc.)
    e.preventDefault();
  });

  passwordOutput.addEventListener('paste', e => e.preventDefault());
  passwordOutput.addEventListener('cut', e => {
    // Copy selection instead of cutting
    const selection = window.getSelection().toString() || 
      passwordOutput.value.substring(passwordOutput.selectionStart, passwordOutput.selectionEnd);
    if (selection && navigator.clipboard) {
      navigator.clipboard.writeText(selection);
      showToast('Copied selection to clipboard');
    }
    e.preventDefault();
  });
  passwordOutput.addEventListener('drop', e => e.preventDefault());

  // Convenience: double clicking a line selects that specific password
  passwordOutput.addEventListener('dblclick', function () {
    const text = passwordOutput.value;
    const start = passwordOutput.selectionStart;
    const lineStart = text.lastIndexOf('\n', start - 1) + 1;
    let lineEnd = text.indexOf('\n', start);
    if (lineEnd === -1) lineEnd = text.length;

    passwordOutput.setSelectionRange(lineStart, lineEnd);
  });

  // --- Event Listeners for Automatic Regeneration ---

  lengthSlider.addEventListener('input', function () {
    lengthInput.value = this.value;
    generatePasswords();
  });

  lengthInput.addEventListener('input', function () {
    syncLength(this);
  });

  lengthInput.addEventListener('change', function () {
    syncLength(this);
  });

  presetPills.forEach(pill => {
    pill.addEventListener('click', function () {
      const len = parseInt(this.getAttribute('data-len'), 10);
      lengthSlider.value = len;
      lengthInput.value = len;
      generatePasswords();
    });
  });

  [charsetUpper, charsetLower, charsetNumber, charsetSpecial].forEach(checkbox => {
    checkbox.addEventListener('change', generatePasswords);
  });

  if (copyBtn) {
    copyBtn.addEventListener('click', copyAllPasswords);
  }

  if (regenBtn) {
    let rotation = 0;
    regenBtn.addEventListener('click', function () {
      rotation += 360;
      if (regenIcon) {
        regenIcon.style.transform = `rotate(${rotation}deg)`;
      }
      generatePasswords();
      showToast('Generated 10 new passwords');
    });
  }

  // Initial generation on load
  generatePasswords();
})();
