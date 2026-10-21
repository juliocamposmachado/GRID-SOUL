import test from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import {
  GRID_SOUL_REFERENCE_FACE_COUNT,
  GRID_SOUL_REFERENCE_FACE_VERSION,
  gridSoulParseReferenceFaceAtlas,
  gridSoulReferenceFaceColorForCube,
  gridSoulReferenceFacePointForCube,
  gridSoulReferenceFaceUvForCube
} from '../public/components/reference_face_voxels.js';

const ROOT = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');
const atlas = gridSoulParseReferenceFaceAtlas(
  readFileSync(path.join(ROOT, 'public/assets/humanoid_face_88000.bin'))
);

test('atlas de referência contém exatamente 88.000 amostras RGB para instâncias cúbicas', () => {
  assert.equal(atlas.version, GRID_SOUL_REFERENCE_FACE_VERSION);
  assert.equal(atlas.count, GRID_SOUL_REFERENCE_FACE_COUNT);
  assert.equal(atlas.width, 384);
  assert.equal(atlas.height, 384);
  assert.equal(atlas.records.byteLength, 88000 * 7);
  assert.equal(gridSoulReferenceFaceColorForCube(0, 88000, atlas).length, 7);
  const [u, v] = gridSoulReferenceFaceUvForCube(40000, 88000, atlas);
  assert.ok(u >= 0 && u <= 1 && v >= 0 && v <= 1);
  assert.deepEqual([u, v], gridSoulReferenceFaceUvForCube(40000, 88000, atlas));
  assert.throws(() => gridSoulParseReferenceFaceAtlas(new Uint8Array([0, 1, 2])), /inválido/);
});

test('as amostras preservam cor/posição, cobrem a moldura e giram somente por orientação explícita', () => {
  const a = gridSoulReferenceFacePointForCube(0, 88000, atlas, 'frontal');
  const b = gridSoulReferenceFacePointForCube(0, 88000, atlas, 'frontal');
  assert.deepEqual(a, b);
  assert.ok(a.every(Number.isFinite));
  const last = gridSoulReferenceFacePointForCube(87999, 88000, atlas, 'frontal');
  assert.ok(a[0] >= -1.68 && a[0] <= 1.68 && a[1] >= -1.68 && a[1] <= 1.68);
  assert.ok(last[0] >= -1.68 && last[0] <= 1.68 && last[1] >= -1.68 && last[1] <= 1.68);
  assert.notDeepEqual(gridSoulReferenceFacePointForCube(100, 88000, atlas, 'three_quarter'),
    gridSoulReferenceFacePointForCube(100, 88000, atlas, 'frontal'));
  assert.equal(gridSoulReferenceFaceColorForCube(9, 88000, atlas),
    gridSoulReferenceFaceColorForCube(9, 88000, atlas));
  assert.throws(() => gridSoulReferenceFacePointForCube(88000, 88000, atlas), RangeError);
});

test('a população reduzida amostra o quadro inteiro em vez de recortar uma região da referência', () => {
  const population = 1100;
  const first = gridSoulReferenceFacePointForCube(0, population, atlas);
  const last = gridSoulReferenceFacePointForCube(population - 1, population, atlas);
  assert.ok(first.every(Number.isFinite) && last.every(Number.isFinite));
  assert.notDeepEqual(first, last);
  assert.match(gridSoulReferenceFaceColorForCube(0, population, atlas), /^#[0-9A-F]{6}$/);
});
