/**
 * Client-side Password Generator - UI Controller
 */

(function () {
  'use strict';

  const { CHARSETS, generatePasswords, calculateEntropy } = window.PwGen;

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

    const entropy = calculateEntropy(length, poolSize);
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
   * Adjusts output textarea height dynamically so all lines fit without vertical scrollbars
   */
  function adjustTextareaHeight() {
    if (!passwordOutput) return;
    passwordOutput.style.height = 'auto';
    passwordOutput.style.height = `${passwordOutput.scrollHeight + 2}px`;
  }

  /**
   * Generates 10 passwords and updates the UI
   */
  function renderPasswords() {
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
      adjustTextareaHeight();
      return;
    }

    if (warningBox) warningBox.classList.remove('active');
    passwordOutput.placeholder = '';

    const passwords = generatePasswords(10, length, activeSets);
    passwordOutput.value = passwords.join('\n');
    updateStrength(length, poolSize);
    updatePresetPills(length);
    adjustTextareaHeight();
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
    renderPasswords();
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
    renderPasswords();
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
      renderPasswords();
    });
  });

  [charsetUpper, charsetLower, charsetNumber, charsetSpecial].forEach(checkbox => {
    checkbox.addEventListener('change', renderPasswords);
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
      renderPasswords();
      showToast('Generated 10 new passwords');
    });
  }

  // Initial generation on load
  renderPasswords();
  window.addEventListener('resize', adjustTextareaHeight);
  if (document.fonts && document.fonts.ready) {
    document.fonts.ready.then(adjustTextareaHeight);
  }
})();
