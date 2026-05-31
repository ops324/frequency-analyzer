import { test } from 'node:test';
import assert from 'node:assert/strict';
import { freqToNote, centsFromNearest, detectPitch, NOTE_NAMES } from '../src/pitch.js';

test('freqToNote: A4 = 440 Hz', () => {
  assert.equal(freqToNote(440), 'A4');
});

test('freqToNote: middle C ~261.63 Hz', () => {
  assert.equal(freqToNote(261.63), 'C4');
});

test('freqToNote: returns dash below hearing range', () => {
  assert.equal(freqToNote(10), '—');
  assert.equal(freqToNote(0), '—');
});

test('freqToNote: octave wraps correctly (A2, A3, A5)', () => {
  assert.equal(freqToNote(110), 'A2');
  assert.equal(freqToNote(220), 'A3');
  assert.equal(freqToNote(880), 'A5');
});

test('NOTE_NAMES has 12 chromatic entries', () => {
  assert.equal(NOTE_NAMES.length, 12);
});

test('centsFromNearest: exactly in tune at 440 Hz', () => {
  assert.ok(Math.abs(centsFromNearest(440)) < 1e-6);
});

test('centsFromNearest: sharp note yields positive cents', () => {
  // ~+30 cents above A4
  const f = 440 * Math.pow(2, 30 / 1200);
  assert.ok(centsFromNearest(f) > 25 && centsFromNearest(f) < 35);
});

test('centsFromNearest: flat note yields negative cents', () => {
  const f = 440 * Math.pow(2, -20 / 1200);
  assert.ok(centsFromNearest(f) < -15 && centsFromNearest(f) > -25);
});

function sineBuffer(freq, sr, size) {
  const buf = new Float32Array(size);
  for (let i = 0; i < size; i++) buf[i] = Math.sin((2 * Math.PI * freq * i) / sr);
  return buf;
}

test('detectPitch: recovers a 220 Hz sine within 2 Hz', () => {
  const sr = 44100;
  const est = detectPitch(sineBuffer(220, sr, 4096), sr);
  assert.ok(Math.abs(est - 220) < 2, `expected ~220, got ${est}`);
});

test('detectPitch: recovers a 440 Hz sine within 3 Hz', () => {
  const sr = 44100;
  const est = detectPitch(sineBuffer(440, sr, 4096), sr);
  assert.ok(Math.abs(est - 440) < 3, `expected ~440, got ${est}`);
});

test('detectPitch: returns -1 on silence', () => {
  assert.equal(detectPitch(new Float32Array(4096), 44100), -1);
});

test('detectPitch: returns -1 on sub-threshold noise', () => {
  const buf = new Float32Array(4096);
  for (let i = 0; i < buf.length; i++) buf[i] = (Math.random() - 0.5) * 0.002;
  assert.equal(detectPitch(buf, 44100), -1);
});
