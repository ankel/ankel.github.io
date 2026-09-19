import { describe, it } from 'node:test';
import assert from 'node:assert/strict';
import PwGen from './pw-gen.js';

const {
  CHARSETS,
  secureRandomInt,
  secureShuffle,
  generateSinglePassword,
  generatePasswords,
  calculateEntropy
} = PwGen;

describe('Cryptographic Password Generator (PwGen)', () => {
  it('defines correct character pools', () => {
    assert.equal(CHARSETS.upper, 'ABCDEFGHIJKLMNOPQRSTUVWXYZ');
    assert.equal(CHARSETS.lower, 'abcdefghijklmnopqrstuvwxyz');
    assert.equal(CHARSETS.number, '0123456789');
    assert.equal(CHARSETS.special, '!@#$%^&*');
  });

  it('generates passwords of exact requested lengths', () => {
    const activeSets = [CHARSETS.upper, CHARSETS.lower, CHARSETS.number];
    for (const len of [4, 8, 16, 24, 32, 64]) {
      const pw = generateSinglePassword(len, activeSets);
      assert.equal(pw.length, len, `Expected password length ${len}`);
    }
  });

  it('guarantees inclusion of every active character set', () => {
    const allSets = [CHARSETS.upper, CHARSETS.lower, CHARSETS.number, CHARSETS.special];
    for (let i = 0; i < 50; i++) {
      const pw = generateSinglePassword(16, allSets);
      assert.ok(/[A-Z]/.test(pw), 'Must contain uppercase');
      assert.ok(/[a-z]/.test(pw), 'Must contain lowercase');
      assert.ok(/[0-9]/.test(pw), 'Must contain number');
      assert.ok(/[!@#$%^&*]/.test(pw), 'Must contain special char');
    }
  });

  it('strictly excludes characters from unchecked sets', () => {
    const withoutSpecial = [CHARSETS.upper, CHARSETS.lower, CHARSETS.number];
    for (let i = 0; i < 50; i++) {
      const pw = generateSinglePassword(20, withoutSpecial);
      assert.ok(!/[!@#$%^&*]/.test(pw), 'Must not contain special characters when unchecked');
    }

    const numbersOnly = [CHARSETS.number];
    for (let i = 0; i < 20; i++) {
      const pw = generateSinglePassword(10, numbersOnly);
      assert.match(pw, /^[0-9]+$/, 'Must only contain digits');
    }
  });

  it('generates requested batch count (10 passwords)', () => {
    const activeSets = [CHARSETS.upper, CHARSETS.lower, CHARSETS.number];
    const batch = generatePasswords(10, 16, activeSets);
    assert.equal(batch.length, 10);
    for (const pw of batch) {
      assert.equal(pw.length, 16);
    }
  });

  it('handles empty active sets or zero length safely', () => {
    assert.equal(generateSinglePassword(16, []), '');
    assert.equal(generateSinglePassword(0, [CHARSETS.upper]), '');
    assert.equal(generateSinglePassword(-5, [CHARSETS.upper]), '');
  });

  it('secureRandomInt generates values strictly in range [0, max)', () => {
    for (let i = 0; i < 200; i++) {
      const val = secureRandomInt(10);
      assert.ok(val >= 0 && val < 10, 'Value out of bounds');
    }
    assert.equal(secureRandomInt(1), 0);
    assert.equal(secureRandomInt(0), 0);
  });

  it('secureShuffle permutes elements while preserving all items', () => {
    const original = ['A', 'B', 'C', 'D', 'E', 'F', 'G', 'H'];
    const copy = [...original];
    secureShuffle(copy);
    assert.equal(copy.length, original.length);
    assert.deepEqual([...copy].sort(), [...original].sort());
  });

  it('calculates Shannon entropy accurately', () => {
    // 16 chars with 62 pool (upper + lower + number)
    // 16 * log2(62) = 16 * 5.954196 = 95.267 -> ~95.3 bits
    const entropy = calculateEntropy(16, 62);
    assert.ok(entropy >= 95.0 && entropy <= 95.5);

    assert.equal(calculateEntropy(0, 62), 0);
    assert.equal(calculateEntropy(16, 0), 0);
  });
});
