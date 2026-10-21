export const GRID_SOUL_FACE_VERSION = 'procedural-cube-face-v2';

const MAX_MICROCUBES = 500000;
const GOLDEN_ANGLE = Math.PI * (3 - Math.sqrt(5));

function deterministicNoise(index, salt = 0) {
  const value = Math.sin((index + 1) * 127.1 + (salt + 1) * 311.7) * 43758.5453;
  return value - Math.floor(value);
}

function gaussian(value, variance) {
  return Math.exp(-(value * value) / variance);
}

/**
 * Calcula um destino 3D para o slot existente indicado, sem alterar sua identidade.
 * A maior parte da população constrói a face frontal; os demais slots formam a
 * concha posterior e duas órbitas esparsas, sempre dentro do mesmo enxame.
 */
export function gridSoulFacePointForCube(slot, population, profile = null) {
  if (!Number.isSafeInteger(population) || population < 1 || population > MAX_MICROCUBES) {
    throw new RangeError(`População facial inválida: ${population}`);
  }
  if (!Number.isSafeInteger(slot) || slot < 0 || slot >= population) {
    throw new RangeError(`Slot facial inválido: ${slot}`);
  }

  const orient = point => {
    const orientation = profile?.face?.orientation;
    const angle = orientation === 'profile' ? Math.PI / 2 : orientation === 'three_quarter' ? Math.PI / 4 : 0;
    if (!angle) return point;
    const [x, y, z] = point;
    return [x * Math.cos(angle) + z * Math.sin(angle), y, -x * Math.sin(angle) + z * Math.cos(angle)];
  };

  const configuredOrbitCount = profile?.particles?.enabled && Number.isSafeInteger(profile.particles.count)
    ? profile.particles.count : 0;
  const orbitCount = population < 100 ? 0
    : profile?.particles && !profile.particles.enabled ? 0
      : Math.min(population - 1, configuredOrbitCount > 0 ? configuredOrbitCount : Math.max(1, Math.round(population * 0.035)));
  const rearCount = Math.max(1, Math.round(population * 0.12));
  const frontCount = population - orbitCount - rearCount;

  if (slot >= frontCount + rearCount) {
    const orbitIndex = slot - frontCount - rearCount;
    const ring = orbitIndex % 3;
    const angle = orbitIndex * GOLDEN_ANGLE;
    const dispersion = Number.isFinite(profile?.particles?.dispersion) ? profile.particles.dispersion : 0;
    const radiusX = 1.48 + dispersion + ring * 0.13;
    const radiusY = 1.91 + dispersion + ring * 0.12;
    return orient([
      radiusX * Math.cos(angle),
      radiusY * Math.sin(angle),
      0.08 + 0.18 * Math.sin(angle * 2.7 + ring)
    ]);
  }

  if (slot >= frontCount) {
    const rearIndex = slot - frontCount;
    const t = (rearIndex + 0.5) / rearCount;
    const vertical = 1 - 2 * t;
    const ring = Math.sqrt(Math.max(0, 1 - vertical * vertical));
    const angle = Math.PI + (rearIndex * GOLDEN_ANGLE) % Math.PI;
    return orient([
      1.23 * ring * Math.cos(angle),
      1.66 * vertical,
      -0.08 + 0.78 * ring * Math.sin(angle)
    ]);
  }

  const rows = Math.max(1, Math.round(Math.sqrt(frontCount * 1.18)));
  const baseColumns = Math.floor(frontCount / rows);
  const widerRows = frontCount % rows;
  const widerSlots = widerRows * (baseColumns + 1);
  let row, column, columns;
  if (slot < widerSlots) {
    columns = baseColumns + 1;
    row = Math.floor(slot / columns);
    column = slot % columns;
  } else {
    columns = baseColumns;
    const remaining = slot - widerSlots;
    row = widerRows + Math.floor(remaining / columns);
    column = remaining % columns;
  }
  let gx = 2 * (column + 0.5) / columns - 1;
  const gy = 1 - 2 * (row + 0.5) / rows;
  if (profile?.geometry?.distribution === 'surface_adaptive' && profile.geometry.grid?.adaptiveResolution) {
    const density = Number.isFinite(profile.geometry.density) ? profile.geometry.density : 0.92;
    const exponent = 1 + (1 - density) * 0.75;
    gx = Math.sign(gx) * Math.pow(Math.abs(gx), exponent);
  }
  const y = gy * 1.66;

  // Silhueta craniana ampla, com têmporas e mandíbula gradualmente afunilada.
  const lowerFace = Math.max(0, Math.min(1, (-gy - 0.08) / 0.92));
  const width = gy < -0.08
    ? 1 - 0.39 * lowerFace
    : 0.92 + 0.08 * Math.cos(Math.min(1, gy) * Math.PI / 2);
  let x = gx * 1.31 * width;
  const normalizedX = x / 1.43;
  const normalizedY = y / 1.84;
  const skullDepth = Math.sqrt(Math.max(0.035, 1 - normalizedX ** 2 * 0.88 - normalizedY ** 2 * 0.84));
  let z = -0.09 + 0.78 * skullDepth;

  // Bochechas e testa dão volume contínuo à superfície frontal.
  const preserveFeatures = profile?.geometry?.grid?.preserveFacialFeatures === false ? 0.25 : 1;
  const eyeDetail = (Number.isFinite(profile?.face?.eyeDetail) ? profile.face.eyeDetail : 1) * preserveFeatures;
  const noseDetail = (Number.isFinite(profile?.face?.noseDetail) ? profile.face.noseDetail : 1) * preserveFeatures;
  const mouthDetail = (Number.isFinite(profile?.face?.mouthDetail) ? profile.face.mouthDetail : 1) * preserveFeatures;
  const symmetry = Number.isFinite(profile?.face?.symmetry) ? profile.face.symmetry : 1;
  const displacement = Number.isFinite(profile?.face?.surfaceDisplacement) ? profile.face.surfaceDisplacement : 0.018;

  z += 0.075 * gaussian(Math.abs(x) - 0.64, 0.11) * gaussian(y - 0.01, 0.22);
  z += 0.17 * gaussian(Math.abs(x) - 1.12, 0.018) * gaussian(y - 0.02, 0.10);
  z += 0.07 * gaussian(Math.abs(x) - 1.18, 0.035) * gaussian(y - 0.02, 0.25);
  z += 0.035 * gaussian(x, 0.57) * gaussian(y - 1.08, 0.22);
  z += 0.055 * gaussian(x, 0.20) * gaussian(y + 1.18, 0.16);

  // Cavidades, globos oculares e sobrancelhas são esculpidos na superfície.
  for (const centerX of [-0.46, 0.46]) {
    const dx = x - centerX;
    z -= 0.29 * eyeDetail * gaussian(dx, 0.12) * gaussian(y - 0.43, 0.060);
    z += 0.12 * eyeDetail * gaussian(dx, 0.075) * gaussian(y - 0.42, 0.028);
    z += 0.21 * eyeDetail * gaussian(dx, 0.012) * gaussian(y - 0.42, 0.012);
    z += 0.17 * eyeDetail * gaussian(dx, 0.16) * gaussian(y - 0.67, 0.030);
    // Pálpebras superiores e inferiores definem a forma amendoada dos olhos.
    z += 0.045 * gaussian(dx, 0.18) * gaussian(y - 0.51, 0.008);
    z += 0.035 * gaussian(dx, 0.18) * gaussian(y - 0.34, 0.010);
  }

  // Ponte, ponta, asas e narinas do nariz formam um relevo central contínuo.
  z += 0.36 * noseDetail * gaussian(x, 0.025) * gaussian(y - 0.02, 0.25);
  z += 0.44 * noseDetail * gaussian(x, 0.040) * gaussian(y + 0.24, 0.055);
  z += 0.19 * noseDetail * (gaussian(x - 0.15, 0.022) + gaussian(x + 0.15, 0.022)) * gaussian(y + 0.27, 0.060);
  z -= 0.28 * noseDetail * (gaussian(x - 0.105, 0.012) + gaussian(x + 0.105, 0.012)) * gaussian(y + 0.34, 0.016);

  // Filtro, sulco e dois volumes labiais com cantos suavemente definidos.
  z += 0.045 * gaussian(x, 0.026) * gaussian(y + 0.48, 0.070);
  const mouthWidth = 0.20 + 0.05 * gaussian(y + 0.74, 0.020);
  const mouthMask = gaussian(Math.max(0, Math.abs(x) - mouthWidth), 0.012);
  const cornerFactor = Math.min(1, (Math.abs(x) / Math.max(0.01, mouthWidth)) ** 2);
  const expression = profile?.face?.expression;
  const expressionLift = expression === 'smile' ? 0.07 * cornerFactor
    : expression === 'frown' ? -0.055 * cornerFactor : 0;
  const mouthY = y + expressionLift;
  z += 0.13 * mouthDetail * mouthMask * gaussian(mouthY + 0.68, 0.016);
  z -= 0.11 * mouthDetail * gaussian(x, 0.15) * gaussian(mouthY + 0.735, 0.007);
  z += 0.15 * mouthDetail * gaussian(x, 0.16) * gaussian(mouthY + 0.80, 0.024);

  x += (deterministicNoise(slot, 31) - 0.5) * 0.009 * (1 - symmetry);
  z += (deterministicNoise(slot, 33) - 0.5) * displacement;
  return orient([x, y, z]);
}

/** Paleta de apresentação holográfica; não modifica Z, símbolo ou cor química catalogada. */
export function gridSoulFaceColorForCube(slot, x, y, profile = null) {
  if (!Number.isSafeInteger(slot) || slot < 0 || !Number.isFinite(x) || !Number.isFinite(y)) {
    throw new RangeError('Coordenadas ou identidade inválidas para a paleta facial.');
  }

  const accent = deterministicNoise(slot, 91);
  const materials = profile?.materials || {};
  const base = typeof materials.base === 'string' ? materials.base : '#061b49';
  const primary = typeof materials.primary === 'string' ? materials.primary : '#00eaff';
  const secondary = typeof materials.secondary === 'string' ? materials.secondary : '#8b4dff';
  const accentColor = typeof materials.accent === 'string' ? materials.accent : '#ee35ff';
  const highlight = typeof materials.highlight === 'string' ? materials.highlight : '#ffd34f';
  if (profile?.particles?.enabled && (Math.abs(x) > 1.45 || Math.abs(y) > 1.85)) {
    const colors = profile.particles.colors;
    if (Array.isArray(colors) && colors.length) return colors[Math.floor(deterministicNoise(slot, 123) * colors.length)];
  }
  const eyeDx = Math.min(Math.abs(x - 0.46), Math.abs(x + 0.46));
  const eyeRadius = Math.hypot(eyeDx / 0.19, (y - 0.43) / 0.105);
  if (eyeRadius < 0.20) return base;
  if (eyeRadius < 0.62) return primary;
  if (eyeRadius < 0.95) return '#45F4FF';
  if (eyeRadius < 1.25) return secondary;
  if (y > 0.60 && y < 0.74 && Math.abs(Math.abs(x) - 0.46) < 0.18) return secondary;
  if (y > -0.39 && y < -0.30 && Math.abs(Math.abs(x) - 0.105) < 0.035) return base;
  if (Math.abs(x) < 0.14 && y > -0.42 && y < 0.34) return primary;
  if (Math.abs(x) < 0.29 && y > -0.86 && y < -0.61) {
    return Math.abs(y + 0.735) < 0.025 ? base : accentColor;
  }
  const nearFeature = (Math.abs(Math.abs(x) - 0.70) < 0.12 && y > -0.20 && y < 0.24)
    || (Math.abs(x) < 0.20 && y > -0.37 && y < -0.22);

  if (nearFeature && accent > 0.88) return highlight;
  if (accent > 0.94 && Math.abs(x) > 0.72) return accentColor;
  if (accent > 0.89 && Math.abs(x) > 0.82) return secondary;
  if (Math.abs(x) < 0.24 && y > 0.72 && accent > 0.40) return primary;
  if (accent > 0.56) return '#147cff';
  return y < -1.05 ? '#0750d5' : '#0b63eb';
}
