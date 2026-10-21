import { GRID_SOUL_ELEMENTS } from './periodic_table.js';

export const GRID_SOUL_IDENTITY_VERSION = 'cube-slot-modulo-118-v1';
export const GRID_SOUL_MAX_MICROCUBES = 500000;

export function gridSoulElementByAtomicNumber(atomicNumber) {
  if (!Number.isInteger(atomicNumber) || atomicNumber < 1 || atomicNumber > GRID_SOUL_ELEMENTS.length) {
    return null;
  }
  return GRID_SOUL_ELEMENTS[atomicNumber - 1] || null;
}

/**
 * Cada posição/slot da InstancedMesh é um ID estável: Z = (slot mod 118) + 1.
 * A mesma população reconstruída em outra sessão recebe os mesmos elementos.
 */
export function gridSoulAtomicNumberForCube(slot) {
  if (!Number.isSafeInteger(slot) || slot < 0 || slot >= GRID_SOUL_MAX_MICROCUBES) {
    throw new RangeError(`Índice de microcubo inválido: ${slot}`);
  }
  return (slot % GRID_SOUL_ELEMENTS.length) + 1;
}

export function gridSoulBuildIdentityMap(count) {
  if (!Number.isSafeInteger(count) || count < 0 || count > GRID_SOUL_MAX_MICROCUBES) {
    throw new RangeError(`População inválida: ${count}`);
  }
  const identities = new Uint8Array(count);
  for (let slot = 0; slot < count; slot++) {
    identities[slot] = gridSoulAtomicNumberForCube(slot);
  }
  return identities;
}

export function gridSoulCountForElement(population, atomicNumber) {
  if (!Number.isSafeInteger(population) || population < 0 || population > GRID_SOUL_MAX_MICROCUBES) {
    throw new RangeError(`População inválida: ${population}`);
  }
  if (!gridSoulElementByAtomicNumber(atomicNumber)) return 0;
  if (population < atomicNumber) return 0;
  return 1 + Math.floor((population - atomicNumber) / GRID_SOUL_ELEMENTS.length);
}

function hslToHex(h, s, l) {
  const hueToRgb = (p, q, t) => {
    let value = t;
    if (value < 0) value += 1;
    if (value > 1) value -= 1;
    if (value < 1 / 6) return p + (q - p) * 6 * value;
    if (value < 1 / 2) return q;
    if (value < 2 / 3) return p + (q - p) * (2 / 3 - value) * 6;
    return p;
  };

  let r, g, b;
  if (s === 0) {
    r = g = b = l;
  } else {
    const q = l < 0.5 ? l * (1 + s) : l + s - l * s;
    const p = 2 * l - q;
    r = hueToRgb(p, q, h + 1 / 3);
    g = hueToRgb(p, q, h);
    b = hueToRgb(p, q, h - 1 / 3);
  }
  return `#${[r, g, b].map(channel => Math.round(channel * 255).toString(16).padStart(2, '0')).join('')}`;
}

/** Cor química própria, estável e distinta para cada número atômico. */
export function gridSoulColorForAtomicNumber(atomicNumber) {
  const element = gridSoulElementByAtomicNumber(atomicNumber);
  if (!element) throw new RangeError(`Número atômico inválido: ${atomicNumber}`);
  const goldenAngle = 0.6180339887498949;
  const hue = ((atomicNumber - 1) * goldenAngle) % 1;
  return hslToHex(hue, 0.78, 0.55);
}
