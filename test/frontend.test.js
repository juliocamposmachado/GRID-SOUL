import test from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import { spawnSync } from 'node:child_process';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const ROOT = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');
const html = readFileSync(path.join(ROOT, 'public/index.html'), 'utf8');

test('módulo embutido da interface tem sintaxe válida e mantém os contratos químico e facial', () => {
  const moduleMatch = html.match(/<script type="module">([\s\S]*?)<\/script>/i);
  assert.ok(moduleMatch, 'interface deve conter o módulo principal');
  const check = spawnSync(process.execPath, ['--check', '--input-type=module'], {
    input: moduleMatch[1],
    encoding: 'utf8'
  });
  assert.equal(check.status, 0, check.stderr || 'sintaxe inválida no módulo principal');
  assert.match(html, /gridSoulBuildIdentityMap\(CAPACITY\)/);
  assert.match(html, /gridSoulReferenceFacePointForCube\(i,n,referenceFaceAtlas,faceProfile\?\.face\?\.orientation\)/);
  assert.match(html, /gridSoulReferenceFaceColorForCube\(i,active,referenceFaceAtlas\)/);
  assert.match(html, /new THREE\.MeshBasicMaterial\(\{color:'#ffffff',toneMapped:false\}\)/);
  assert.match(html, /await ensureReferenceFaceAtlas\(\)/);
  assert.match(html, /gridSoulBuildFacialRegions\(population,referenceFaceAtlas\)/);
  assert.match(html, /gridSoulEyeBlinkAmount\(faceElapsedMs\)/);
  assert.match(html, /gridSoulTalkAmount\(faceElapsedMs\)/);
  assert.match(html, /eyeScaleY=1-eyeWeight\*\.9/);
  assert.match(html, /mouthSides\[i\]\*opening/);
  assert.ok(html.includes("faceProfile.face.orientation='frontal'"));
  assert.match(html, /if\(shape==='face'\)return/);
  assert.match(html, /somente com cubos instanciados e cores da referência/);
  assert.doesNotMatch(html, /gridSoulFace(?:Point|Color)ForCube/);
  assert.match(html, /faceProfile\?\.geometry\?\.grid\?\.size\|\|\.025/);
  assert.match(html, /if\(referenceFaceAtlas\)return 0/);
  assert.match(html, /applyFaceProfileAppearance\(/);
  assert.match(html, /cubeAtomicNumbers\[i\] - 1/);
  assert.match(html, /gridSoulColorForAtomicNumber\(atomicNumber\)/);
  assert.match(html, /repeat\(18,minmax\(0,1fr\)\)/);
  assert.match(html, /<details open>/);
  assert.match(html, /value="2000"/);
  assert.match(html, /function openShowcase\(/);
  assert.match(html, /value="face">Rosto — cores da referência/);
  assert.match(html, /JSON\.stringify\(\{message,population:active\}\)/);
  assert.match(html, /get\('demo'\)==='1'/);
  assert.equal((html.match(/addEventListener\('pointerdown', function\(event\)/g) || []).length, 1);
  assert.doesNotMatch(html, /GRID_SOUL_CLICK_WAKE_GUARD_V1/);
});
