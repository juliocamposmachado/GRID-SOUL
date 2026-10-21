import test from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import {
  GRID_SOUL_EYE_BLINK_PERIOD_MS,
  GRID_SOUL_FACE_EYE_CENTER_V,
  GRID_SOUL_FACE_MOUTH_CENTER_V,
  gridSoulBuildFacialRegions,
  gridSoulEyeBlinkAmount,
  gridSoulTalkAmount
} from '../public/components/face_expression.js';
import { gridSoulParseReferenceFaceAtlas } from '../public/components/reference_face_voxels.js';

const ROOT = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');
const atlas = gridSoulParseReferenceFaceAtlas(
  readFileSync(path.join(ROOT, 'public/assets/humanoid_face_88000.bin'))
);

test('os olhos piscam brevemente a cada 10 segundos, começando após o primeiro ciclo', () => {
  assert.equal(GRID_SOUL_EYE_BLINK_PERIOD_MS, 10000);
  assert.equal(gridSoulEyeBlinkAmount(0), 0);
  assert.equal(gridSoulEyeBlinkAmount(9699), 0);
  assert.ok(gridSoulEyeBlinkAmount(9700) < 0.01);
  assert.ok(gridSoulEyeBlinkAmount(9850) > 0.99);
  assert.ok(gridSoulEyeBlinkAmount(10000) < 0.01);
  assert.ok(gridSoulEyeBlinkAmount(19850) > 0.99);
  assert.equal(gridSoulEyeBlinkAmount(Number.NaN), 0);
});

test('o movimento da boca pulsa continuamente, limitado e determinístico', () => {
  const samples = [0, 100, 250, 500, 750, 1000].map(gridSoulTalkAmount);
  assert.ok(samples.every(value => value >= 0 && value <= 1));
  assert.ok(new Set(samples).size > 3);
  assert.equal(gridSoulTalkAmount(1234), gridSoulTalkAmount(1234));
  assert.equal(gridSoulTalkAmount(Number.NaN), 0);
});

test('as máscaras de animação selecionam cubos nos dois olhos e nos lados superior/inferior da boca', () => {
  const regions = gridSoulBuildFacialRegions(atlas.count, atlas);
  assert.equal(regions.population, 88000);
  assert.equal(regions.eyeWeights.length, 88000);
  assert.equal(regions.mouthWeights.length, 88000);
  let eyeCount = 0;
  let mouthCount = 0;
  let upperMouth = 0;
  let lowerMouth = 0;
  for (let i = 0; i < regions.population; i++) {
    if (regions.eyeWeights[i] > 0.1) eyeCount++;
    if (regions.mouthWeights[i] > 0.1) {
      mouthCount++;
      if (regions.mouthSides[i] > 0) upperMouth++;
      else lowerMouth++;
    }
  }
  assert.ok(eyeCount > 100 && eyeCount < 15000);
  assert.ok(mouthCount > 100 && mouthCount < 15000);
  assert.ok(upperMouth > 0 && lowerMouth > 0);
  assert.ok(GRID_SOUL_FACE_EYE_CENTER_V < GRID_SOUL_FACE_MOUTH_CENTER_V);
  assert.throws(() => gridSoulBuildFacialRegions(0, atlas), /inválido/);
});
