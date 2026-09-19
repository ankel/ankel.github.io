/**
 * Core cryptographic password generation module.
 * Works in both browser (window.crypto) and Node.js / Bun (crypto.webcrypto).
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

  /**
   * Resolve crypto instance (Browser or Node.js / Bun)
   */
  function getCrypto() {
    if (typeof window !== 'undefined' && window.crypto) {
      return window.crypto;
    }
    if (typeof globalThis !== 'undefined' && globalThis.crypto) {
      return globalThis.crypto;
    }
    try {
      const nodeCrypto = require('crypto');
      return nodeCrypto.webcrypto || nodeCrypto;
    } catch {
      throw new Error('No cryptographic PRNG available');
    }
  }

  /**
   * Generates a cryptographically secure random integer in [0, max)
   * using rejection sampling to eliminate modulo bias.
   */
  function secureRandomInt(max) {
    if (max <= 1) return 0;
    const limit = Math.floor(0x100000000 / max) * max;
    const array = new Uint32Array(1);
    const cryptoInstance = getCrypto();
    let rand;
    do {
      cryptoInstance.getRandomValues(array);
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
    if (!activeSets || activeSets.length === 0 || length <= 0) {
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
   * Generates multiple passwords
   */
  function generatePasswords(count, length, activeSets) {
    const passwords = [];
    for (let i = 0; i < count; i++) {
      passwords.push(generateSinglePassword(length, activeSets));
    }
    return passwords;
  }

  /**
   * Calculates Shannon entropy in bits for given length and pool size
   */
  function calculateEntropy(length, poolSize) {
    if (poolSize <= 0 || length <= 0) return 0;
    return Math.round(length * (Math.log2(poolSize) * 10)) / 10;
  }

  const PwGen = {
    CHARSETS,
    secureRandomInt,
    secureShuffle,
    generateSinglePassword,
    generatePasswords,
    calculateEntropy
  };

  if (typeof window !== 'undefined') {
    window.PwGen = PwGen;
  }
  if (typeof module !== 'undefined' && module.exports) {
    module.exports = PwGen;
  }
})();
