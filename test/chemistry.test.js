import test from 'node:test';
import assert from 'node:assert/strict';
import { GRID_SOUL_ELEMENTS } from '../public/components/periodic_table.js';
import {
  GRID_SOUL_IDENTITY_VERSION,
  GRID_SOUL_MAX_MICROCUBES,
  gridSoulAtomicNumberForCube,
  gridSoulBuildIdentityMap,
  gridSoulColorForAtomicNumber,
  gridSoulCountForElement,
  gridSoulElementByAtomicNumber
} from '../public/components/chemistry.js';

test('catálogo contém exatamente os 118 números atômicos e símbolos únicos', () => {
  assert.equal(GRID_SOUL_ELEMENTS.length, 118);
  assert.deepEqual(GRID_SOUL_ELEMENTS.map(element => element.z), Array.from({ length: 118 }, (_, i) => i + 1));
  assert.equal(new Set(GRID_SOUL_ELEMENTS.map(element => element.symbol)).size, 118);
  assert.equal(new Set(GRID_SOUL_ELEMENTS.map(element => element.name)).size, 118);
  assert.equal(GRID_SOUL_IDENTITY_VERSION, 'cube-slot-modulo-118-v1');
  assert.equal(gridSoulElementByAtomicNumber(1).symbol, 'H');
  assert.equal(gridSoulElementByAtomicNumber(118).symbol, 'Og');
  assert.equal(gridSoulElementByAtomicNumber(0), null);
  assert.equal(gridSoulElementByAtomicNumber(119), null);
});

test('slot físico mantém o mesmo elemento após reduzir, ampliar e reconstruir a população', () => {
  const firstBuild = gridSoulBuildIdentityMap(6000);
  const restoredBuild = gridSoulBuildIdentityMap(6000);
  const enlargedBuild = gridSoulBuildIdentityMap(25000);

  assert.deepEqual(firstBuild, restoredBuild);
  assert.deepEqual(firstBuild, enlargedBuild.slice(0, firstBuild.length));
  assert.deepEqual([...firstBuild.slice(0, 8)], [1, 2, 3, 4, 5, 6, 7, 8]);
  assert.equal(gridSoulAtomicNumberForCube(117), 118);
  assert.equal(gridSoulAtomicNumberForCube(118), 1);
  assert.equal(gridSoulAtomicNumberForCube(499999), 34);
  assert.throws(() => gridSoulAtomicNumberForCube(-1), RangeError);
  assert.throws(() => gridSoulAtomicNumberForCube(GRID_SOUL_MAX_MICROCUBES), RangeError);
});

test('cada elemento tem uma cor hexadecimal própria, determinística e estável', () => {
  const firstPalette = GRID_SOUL_ELEMENTS.map(element => gridSoulColorForAtomicNumber(element.z));
  const secondPalette = GRID_SOUL_ELEMENTS.map(element => gridSoulColorForAtomicNumber(element.z));
  assert.deepEqual(firstPalette, secondPalette);
  assert.equal(new Set(firstPalette).size, 118);
  assert.ok(firstPalette.every(color => /^#[0-9a-f]{6}$/i.test(color)));
  assert.equal(gridSoulColorForAtomicNumber(6), gridSoulColorForAtomicNumber(6));
  assert.throws(() => gridSoulColorForAtomicNumber(0), RangeError);
  assert.throws(() => gridSoulColorForAtomicNumber(119), RangeError);
});

test('a população mínima representa todos os elementos e a contagem fecha com a população', () => {
  for (const population of [0, 1, 117, 118, 1000, 6000, GRID_SOUL_MAX_MICROCUBES]) {
    const total = GRID_SOUL_ELEMENTS.reduce(
      (sum, element) => sum + gridSoulCountForElement(population, element.z),
      0
    );
    assert.equal(total, population, `contagem divergente para população ${population}`);
    if (population >= 118) {
      assert.ok(GRID_SOUL_ELEMENTS.every(element => gridSoulCountForElement(population, element.z) > 0));
    }
  }
  assert.equal(gridSoulCountForElement(1000, 1), 9);
  assert.equal(gridSoulCountForElement(1000, 118), 8);
  assert.throws(() => gridSoulCountForElement(-1, 1), RangeError);
  assert.equal(gridSoulCountForElement(100, 119), 0);
});
