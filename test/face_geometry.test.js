import test from 'node:test';
import assert from 'node:assert/strict';
import {
  GRID_SOUL_FACE_VERSION,
  gridSoulFaceColorForCube,
  gridSoulFacePointForCube
} from '../public/components/face_geometry.js';
import { gridSoulBuildIdentityMap } from '../public/components/chemistry.js';

function summarize(population) {
  let minX = Infinity, maxX = -Infinity;
  let minY = Infinity, maxY = -Infinity;
  let minZ = Infinity, maxZ = -Infinity;
  let minRadius = Infinity, maxRadius = -Infinity;
  for (let slot = 0; slot < population; slot++) {
    const [x, y, z] = gridSoulFacePointForCube(slot, population);
    assert.ok([x, y, z].every(Number.isFinite), `coordenada não finita no slot ${slot}`);
    minX = Math.min(minX, x); maxX = Math.max(maxX, x);
    minY = Math.min(minY, y); maxY = Math.max(maxY, y);
    minZ = Math.min(minZ, z); maxZ = Math.max(maxZ, z);
    const radius = Math.hypot(x, y);
    minRadius = Math.min(minRadius, radius); maxRadius = Math.max(maxRadius, radius);
  }
  return { minX, maxX, minY, maxY, minZ, maxZ, minRadius, maxRadius };
}

test('geometria facial é determinística, limitada e possui frente, concha posterior e órbitas', () => {
  assert.equal(GRID_SOUL_FACE_VERSION, 'procedural-cube-face-v2');
  const first = gridSoulFacePointForCube(37, 2000);
  const second = gridSoulFacePointForCube(37, 2000);
  assert.deepEqual(first, second);
  const small = summarize(2000);
  assert.ok(small.minZ < -0.65, 'deve existir uma concha posterior com profundidade');
  assert.ok(small.maxZ > 0.55, 'a face deve projetar regiões frontais');
  assert.ok(small.maxRadius > 2.0, 'devem existir cubos orbitais ao redor do rosto');
  assert.ok(small.minX < -1.4 && small.maxX > 1.4);
  assert.ok(small.minY < -1.8 && small.maxY > 1.8);
  assert.throws(() => gridSoulFacePointForCube(-1, 2000), RangeError);
  assert.throws(() => gridSoulFacePointForCube(2000, 2000), RangeError);
  assert.throws(() => gridSoulFacePointForCube(0, 0), RangeError);
});

test('com 17 mil slots, o nariz tem relevo e todos os destinos continuam finitos', () => {
  const population = 17000;
  const geometry = summarize(population);
  assert.ok(geometry.maxZ > 0.55 && geometry.minZ < -0.65);
  const frontCount = population - Math.max(1, Math.round(population * 0.12)) - Math.round(population * 0.035);
  let nose = -Infinity;
  let cheek = -Infinity;
  for (let slot = 0; slot < frontCount; slot++) {
    const [x, y, z] = gridSoulFacePointForCube(slot, population);
    if (Math.abs(x) < 0.10 && Math.abs(y + 0.24) < 0.13) nose = Math.max(nose, z);
    if (x > 0.66 && x < 0.86 && Math.abs(y + 0.24) < 0.13) cheek = Math.max(cheek, z);
  }
  assert.ok(Number.isFinite(nose) && Number.isFinite(cheek));
  assert.ok(nose > cheek + 0.08, `relevo do nariz (${nose}) deve exceder a bochecha (${cheek})`);
});

test('paleta holográfica é determinística, predominantemente azul/ciano e não muda identidades', () => {
  const before = gridSoulBuildIdentityMap(17000);
  const colors = new Map();
  for (let slot = 0; slot < 17000; slot++) {
    const [x, y] = gridSoulFacePointForCube(slot, 17000);
    const color = gridSoulFaceColorForCube(slot, x, y);
    assert.match(color, /^#[0-9a-f]{6}$/i);
    colors.set(color, (colors.get(color) || 0) + 1);
  }
  const blueCyan = (colors.get('#00dfff') || 0) + (colors.get('#147cff') || 0)
    + (colors.get('#0750d5') || 0) + (colors.get('#0b63eb') || 0);
  assert.ok(blueCyan / 17000 > 0.75, `azuis/cianos representam ${(blueCyan / 17000 * 100).toFixed(1)}%`);
  assert.ok((colors.get('#ffd34f') || 0) > 0, 'deve haver acentos dourados');
  assert.ok((colors.get('#ee35ff') || 0) > 0 || (colors.get('#8b4dff') || 0) > 0);
  assert.equal(gridSoulFaceColorForCube(14, 0, 0), gridSoulFaceColorForCube(14, 0, 0));
  assert.deepEqual(gridSoulBuildIdentityMap(17000), before);
  assert.throws(() => gridSoulFaceColorForCube(-1, 0, 0), RangeError);
});

test('perfil de 88 mil cubos aplica 1.800 orbitais, materiais e coordenadas faciais adaptativas', () => {
  const population = 88000;
  const profile = {
    geometry: { density: 0.92, distribution: 'surface_adaptive', grid: { adaptiveResolution: true } },
    face: { symmetry: 0.92, eyeDetail: 1, noseDetail: 0.95, mouthDetail: 0.95,
      surfaceDisplacement: 0.035, orientation: 'frontal' },
    particles: { enabled: true, count: 1800, dispersion: 0.35,
      colors: ['#00E5FF', '#126BFF', '#A52CFF', '#FF38D1', '#FFD34D'] },
    materials: { base: '#005BFF', primary: '#00E5FF', secondary: '#7B2CFF',
      accent: '#FF38D1', highlight: '#FFD34D' }
  };
  const orbitStart = population - profile.particles.count;
  const firstOrbit = gridSoulFacePointForCube(orbitStart, population, profile);
  const lastNonOrbit = gridSoulFacePointForCube(orbitStart - 1, population, profile);
  const orbitColor = gridSoulFaceColorForCube(orbitStart, firstOrbit[0], firstOrbit[1], profile);
  assert.ok(firstOrbit.every(Number.isFinite));
  assert.ok(Math.abs(firstOrbit[0]) > 1.45, 'o slot 86.200 deve iniciar a faixa orbital declarada');
  assert.ok(Math.abs(lastNonOrbit[0]) < 1.3, 'o slot anterior não pode cair na faixa orbital');
  assert.ok(profile.particles.colors.includes(orbitColor), 'os orbitais devem usar a paleta configurada');
  assert.deepEqual(
    gridSoulFacePointForCube(population - 1, population, profile),
    gridSoulFacePointForCube(population - 1, population, profile),
    'o extremo de 88 mil slots deve ser determinístico'
  );
  const turned = gridSoulFacePointForCube(12000, population, {
    ...profile, face: { ...profile.face, orientation: 'three_quarter' }
  });
  const frontal = gridSoulFacePointForCube(12000, population, profile);
  assert.notDeepEqual(turned, frontal, 'a orientação três-quartos deve rotacionar os destinos');
  const before = gridSoulBuildIdentityMap(population);
  assert.equal(before.length, population);
  assert.equal(before[0], 1);
  assert.equal(before.at(-1), ((population - 1) % 118) + 1);
});
