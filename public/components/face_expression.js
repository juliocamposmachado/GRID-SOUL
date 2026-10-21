import { gridSoulReferenceFaceUvForCube } from './reference_face_voxels.js';

export const GRID_SOUL_EYE_BLINK_PERIOD_MS = 10000;
export const GRID_SOUL_EYE_BLINK_START_MS = 9700;
export const GRID_SOUL_EYE_BLINK_DURATION_MS = 300;
export const GRID_SOUL_FACE_EYE_CENTER_V = 0.435;
export const GRID_SOUL_FACE_MOUTH_CENTER_V = 0.7;

function clamp01(value) {
  return Math.max(0, Math.min(1, value));
}

function softEllipseWeight(u, v, centerU, centerV, radiusU, radiusV) {
  const distance = Math.sqrt(
    ((u - centerU) / radiusU) ** 2 + ((v - centerV) / radiusV) ** 2
  );
  if (distance >= 1) return 0;
  const edge = clamp01((1 - distance) / 0.32);
  return edge * edge * (3 - 2 * edge);
}

/** Um único piscar breve no fim de cada ciclo de 10 segundos. */
export function gridSoulEyeBlinkAmount(elapsedMs) {
  if (!Number.isFinite(elapsedMs)) return 0;
  const phase = ((elapsedMs % GRID_SOUL_EYE_BLINK_PERIOD_MS)
    + GRID_SOUL_EYE_BLINK_PERIOD_MS) % GRID_SOUL_EYE_BLINK_PERIOD_MS;
  const progress = (phase - GRID_SOUL_EYE_BLINK_START_MS) / GRID_SOUL_EYE_BLINK_DURATION_MS;
  if (progress < 0 || progress > 1) return 0;
  return Math.sin(Math.PI * progress);
}

/** Pulso irregular entre 0 e 1 para manter movimento labial contínuo, sem áudio. */
export function gridSoulTalkAmount(elapsedMs) {
  if (!Number.isFinite(elapsedMs)) return 0;
  const seconds = elapsedMs / 1000;
  const pulse = 0.52
    + 0.22 * Math.sin(seconds * Math.PI * 2 * 2.15)
    + 0.16 * Math.sin(seconds * Math.PI * 2 * 3.35 + 1.1)
    + 0.1 * Math.sin(seconds * Math.PI * 2 * 0.73 + 0.4);
  return clamp01(pulse);
}

/** Pré-calcula pesos dos olhos/boca por slot; o renderer só lê estes vetores por quadro. */
export function gridSoulBuildFacialRegions(population, atlas) {
  if (!Number.isSafeInteger(population) || population < 1 || !atlas) {
    throw new TypeError('População ou atlas inválido para animação facial.');
  }
  const eyeWeights = new Float32Array(population);
  const mouthWeights = new Float32Array(population);
  const mouthSides = new Int8Array(population);
  for (let i = 0; i < population; i++) {
    const [u, v] = gridSoulReferenceFaceUvForCube(i, population, atlas);
    const leftEye = softEllipseWeight(u, v, 0.365, GRID_SOUL_FACE_EYE_CENTER_V, 0.078, 0.041);
    const rightEye = softEllipseWeight(u, v, 0.635, GRID_SOUL_FACE_EYE_CENTER_V, 0.078, 0.041);
    eyeWeights[i] = Math.max(leftEye, rightEye);
    mouthWeights[i] = softEllipseWeight(u, v, 0.5, GRID_SOUL_FACE_MOUTH_CENTER_V, 0.115, 0.052);
    mouthSides[i] = v <= GRID_SOUL_FACE_MOUTH_CENTER_V ? 1 : -1;
  }
  return { population, eyeWeights, mouthWeights, mouthSides };
}
