export const GRID_SOUL_REFERENCE_FACE_VERSION = 'reference-cube-atlas-v1';
export const GRID_SOUL_REFERENCE_FACE_URL = '/assets/humanoid_face_88000.bin';
export const GRID_SOUL_REFERENCE_FACE_COUNT = 88000;
export const GRID_SOUL_REFERENCE_FACE_FRAME = 3.36;
const HEADER_BYTES = 12;
const RECORD_BYTES = 7;

export function gridSoulParseReferenceFaceAtlas(input) {
  const bytes = input instanceof Uint8Array
    ? input
    : input instanceof ArrayBuffer
      ? new Uint8Array(input)
      : ArrayBuffer.isView(input)
        ? new Uint8Array(input.buffer, input.byteOffset, input.byteLength)
        : null;
  if (!bytes || bytes.byteLength < HEADER_BYTES) throw new TypeError('Atlas voxel facial inválido.');
  const view = new DataView(bytes.buffer, bytes.byteOffset, bytes.byteLength);
  const magic = String.fromCharCode(...bytes.subarray(0, 4));
  const width = view.getUint16(4, true);
  const height = view.getUint16(6, true);
  const count = view.getUint32(8, true);
  if (magic !== 'GSF1' || width < 2 || height < 2 || count < 1
      || bytes.byteLength !== HEADER_BYTES + count * RECORD_BYTES) {
    throw new Error('Cabeçalho ou tamanho do atlas voxel facial não confere.');
  }
  return { version: GRID_SOUL_REFERENCE_FACE_VERSION, width, height, count,
    records: bytes.subarray(HEADER_BYTES) };
}

export async function gridSoulLoadReferenceFaceAtlas(url = GRID_SOUL_REFERENCE_FACE_URL) {
  const response = await fetch(url, { cache: 'force-cache' });
  if (!response.ok) throw new Error(`Não foi possível carregar o atlas de cubos (${response.status}).`);
  return gridSoulParseReferenceFaceAtlas(await response.arrayBuffer());
}

function recordOffset(slot, population, atlas) {
  if (!atlas || !Number.isSafeInteger(atlas.count) || atlas.count < 1
      || !Number.isSafeInteger(population) || population < 1
      || !Number.isSafeInteger(slot) || slot < 0 || slot >= population) {
    throw new RangeError('Slot, população ou atlas voxel inválido.');
  }
  const sample = population <= atlas.count
    ? Math.floor(slot * atlas.count / population)
    : slot % atlas.count;
  return sample * RECORD_BYTES;
}

export function gridSoulReferenceFaceColorForCube(slot, population, atlas) {
  const offset = recordOffset(slot, population, atlas);
  const { records } = atlas;
  return '#' + [records[offset + 4], records[offset + 5], records[offset + 6]]
    .map(channel => channel.toString(16).padStart(2, '0')).join('').toUpperCase();
}

/** Retorna a posição 2D normalizada da amostra dentro da imagem de referência. */
export function gridSoulReferenceFaceUvForCube(slot, population, atlas) {
  const offset = recordOffset(slot, population, atlas);
  const view = new DataView(atlas.records.buffer, atlas.records.byteOffset, atlas.records.byteLength);
  const sample = offset / RECORD_BYTES;
  const xPixel = view.getUint16(sample * RECORD_BYTES, true);
  const yPixel = view.getUint16(sample * RECORD_BYTES + 2, true);
  return [xPixel / (atlas.width - 1), yPixel / (atlas.height - 1)];
}

/** Retorna o centro de um cubo na face em coordenadas-base; scale é aplicado pelo renderer. */
export function gridSoulReferenceFacePointForCube(slot, population, atlas, orientation = 'frontal') {
  const offset = recordOffset(slot, population, atlas);
  const view = new DataView(atlas.records.buffer, atlas.records.byteOffset, atlas.records.byteLength);
  const sample = offset / RECORD_BYTES;
  const xPixel = view.getUint16(sample * RECORD_BYTES, true);
  const yPixel = view.getUint16(sample * RECORD_BYTES + 2, true);
  const r = atlas.records[offset + 4];
  const g = atlas.records[offset + 5];
  const b = atlas.records[offset + 6];
  const x = (xPixel / (atlas.width - 1) - 0.5) * GRID_SOUL_REFERENCE_FACE_FRAME;
  const y = (0.5 - yPixel / (atlas.height - 1)) * GRID_SOUL_REFERENCE_FACE_FRAME;
  const luminance = (0.2126 * r + 0.7152 * g + 0.0722 * b) / 255;
  const z = (luminance - 0.28) * 0.12;
  const angle = orientation === 'profile' ? Math.PI / 2
    : orientation === 'three_quarter' ? Math.PI / 4 : 0;
  if (!angle) return [x, y, z];
  return [x * Math.cos(angle) + z * Math.sin(angle), y,
    -x * Math.sin(angle) + z * Math.cos(angle)];
}
