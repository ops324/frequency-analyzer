// Pure pitch / music-theory helpers. No DOM, no Web Audio — unit-testable.

export const NOTE_NAMES = ['C', 'C#', 'D', 'D#', 'E', 'F', 'F#', 'G', 'G#', 'A', 'A#', 'B'];

// Nearest note name + octave for a frequency in Hz (A4 = 440). Returns '—' below hearing range.
export function freqToNote(f) {
  if (f < 20) return '—';
  const n = Math.round(12 * Math.log2(f / 440) + 69);
  return NOTE_NAMES[((n % 12) + 12) % 12] + (Math.floor(n / 12) - 1);
}

// Signed cents deviation from the nearest equal-tempered note (A4 = 440).
export function centsFromNearest(f) {
  const m = 12 * Math.log2(f / 440) + 69;
  return (m - Math.round(m)) * 100;
}

// NSDF (McLeod Pitch Method) autocorrelation with parabolic peak interpolation.
// buf: Float32Array time-domain samples in [-1, 1]. sr: sample rate (Hz).
// Returns fundamental frequency in Hz, or -1 when no confident pitch is found.
export function detectPitch(buf, sr) {
  const SIZE = buf.length;
  const rms = Math.sqrt(buf.reduce((s, v) => s + v * v, 0) / SIZE);
  if (rms < 0.003) return -1;
  const maxLag = Math.floor(sr / 60), minLag = Math.floor(sr / 1400);
  const nsdf = new Float32Array(maxLag);
  for (let lag = minLag; lag < maxLag; lag++) {
    let num = 0, denom = 0;
    for (let j = 0; j < SIZE - lag; j++) {
      num += buf[j] * buf[j + lag];
      denom += buf[j] * buf[j] + buf[j + lag] * buf[j + lag];
    }
    nsdf[lag] = denom > 0 ? (2 * num) / denom : 0;
  }
  let inValley = false, bestLag = -1, bestVal = -1;
  for (let lag = minLag + 1; lag < maxLag - 1; lag++) {
    if (!inValley && nsdf[lag] < 0) inValley = true;
    if (inValley && nsdf[lag] > 0.5 && nsdf[lag] > nsdf[lag - 1] && nsdf[lag] >= nsdf[lag + 1]) {
      bestVal = nsdf[lag];
      bestLag = lag;
      break;
    }
  }
  if (bestLag < 1 || bestVal < 0.5) return -1;
  const y1 = nsdf[bestLag - 1], y2 = nsdf[bestLag], y3 = nsdf[bestLag + 1];
  const dn = 2 * (2 * y2 - y1 - y3);
  return sr / (dn > 1e-10 ? bestLag + (y3 - y1) / dn : bestLag);
}
