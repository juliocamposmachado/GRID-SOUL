import 'dotenv/config';
import express from 'express';
import helmet from 'helmet';
import rateLimit from 'express-rate-limit';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import fs from 'node:fs';
import { randomUUID } from 'node:crypto';
import { chromium } from 'playwright';

const ROOT = path.dirname(fileURLToPath(import.meta.url));
const app = express();

// Memória persistente local do GRID SOUL.
const MEMORY_FILE = process.env.GRID_SOUL_MEMORY_FILE
  ? path.resolve(process.env.GRID_SOUL_MEMORY_FILE)
  : path.join(ROOT, 'data', 'gridsoul-memory.json');
const MEMORY_DIR = path.dirname(MEMORY_FILE);
const MEMORY_LIMIT = 100;
const PORT = Number(process.env.GRID_SOUL_PORT || 8765);
const BRIDGE_MODE = process.env.GRID_SOUL_CHATGPT_BRIDGE === 'extension'
  ? 'extension'
  : 'cdp';

function emptyMemory() {
  return { version: 1, updatedAt: null, lastCommand: '', lastPlan: null, history: [] };
}

function loadMemory() {
  try {
    const parsed = JSON.parse(fs.readFileSync(MEMORY_FILE, 'utf8'));
    if (!parsed || parsed.version !== 1 || !Array.isArray(parsed.history)) {
      return emptyMemory();
    }
    return {
      version: 1,
      updatedAt: typeof parsed.updatedAt === 'string' ? parsed.updatedAt : null,
      lastCommand: typeof parsed.lastCommand === 'string' ? parsed.lastCommand.slice(0, 1200) : '',
      lastPlan: parsed.lastPlan && typeof parsed.lastPlan === 'object' ? parsed.lastPlan : null,
      history: parsed.history.slice(-MEMORY_LIMIT)
    };
  } catch {
    return emptyMemory();
  }
}

let memory = loadMemory();

function safeMemoryText(value, limit = 1200) {
  return String(value ?? '')
    .replace(/\b(api[_ -]?key|token|password|senha|secret)\s*[:=]\s*\S+/gi, '$1=[REDACTED]')
    .replace(/\b(sk-[A-Za-z0-9_-]{12,})\b/g, '[REDACTED_KEY]')
    .slice(0, limit);
}

function saveMemory() {
  fs.mkdirSync(MEMORY_DIR, { recursive: true });
  const temporary = MEMORY_FILE + '.tmp';
  fs.writeFileSync(temporary, JSON.stringify(memory, null, 2) + '\n',
    { encoding: 'utf8', mode: 0o600 });
  fs.renameSync(temporary, MEMORY_FILE);
}

function rememberSuccessfulCommand(command, plan) {
  const timestamp = new Date().toISOString();
  const safeCommand = safeMemoryText(command);
  const safePlan = JSON.parse(JSON.stringify(plan));

  memory.lastCommand = safeCommand;
  memory.lastPlan = safePlan;
  memory.updatedAt = timestamp;
  memory.history.push({
    timestamp,
    command: safeCommand,
    status: 'success',
    shape: safePlan.shape,
    population: safePlan.population,
    energy: safePlan.energy,
    scale: safePlan.scale,
    color: safePlan.color,
    reply: safeMemoryText(safePlan.reply, 300)
  });
  memory.history = memory.history.slice(-MEMORY_LIMIT);
  saveMemory();
}

function rememberVisualState(command, plan) {
  memory.lastCommand = safeMemoryText(command);
  memory.lastPlan = JSON.parse(JSON.stringify(plan));
  memory.updatedAt = new Date().toISOString();
  saveMemory();
}

app.disable('x-powered-by');
app.use(helmet({ contentSecurityPolicy: false }));
app.use(express.json({ limit: '8kb' }));
app.use('/api/', rateLimit({
  windowMs: 60_000,
  limit: 60,
  skip: req => req.path.startsWith('/extension/')
}));

const shapes = ['sphere', 'torus', 'spiral', 'wave', 'cloud', 'face', 'terrain', 'custom'];
const partKinds = ['sphere', 'ellipsoid', 'torus', 'cylinder', 'cone', 'box'];

// GRID_SOUL_CDP_BRIDGE
let busy = false;
let cdpBrowser = null;
let extensionTask = null;

async function getChatGPTPage() {
  if (!cdpBrowser || !cdpBrowser.isConnected()) {
    cdpBrowser = await chromium.connectOverCDP("http://127.0.0.1:9222");
  }

  const contexts = cdpBrowser.contexts();
  if (!contexts.length) throw new Error("Nenhum contexto Chrome disponível.");

  const context = contexts[0];
  let pages = context.pages();
  let page = pages.find(p => /chatgpt\.com|chat\.openai\.com/.test(p.url()));

  if (!page) {
    page = pages[0] || await context.newPage();
    await page.goto("https://chatgpt.com/", { waitUntil: "domcontentloaded", timeout: 30000 });
  }

  await page.bringToFront();
  return page;
}

async function firstVisible(page, selectors) {
  for (const selector of selectors) {
    const locator = page.locator(selector).first();
    if (await locator.count().catch(() => 0)) {
      if (await locator.isVisible().catch(() => false)) return locator;
    }
  }
  return null;
}


function extractJSON(raw) {
  if (raw && typeof raw === "object") return raw;
  if (typeof raw !== "string") {
    throw new Error("A resposta do ChatGPT não é texto.");
  }

  const text = raw.replace(/```(?:json)?/gi, "");

  for (let i = 0; i < text.length; i++) {
    if (text[i] !== "{") continue;

    let depth = 0;
    let quoted = false;
    let escaped = false;

    for (let j = i; j < text.length; j++) {
      const c = text[j];

      if (quoted) {
        if (escaped) escaped = false;
        else if (c === "\\") escaped = true;
        else if (c === '"') quoted = false;
        continue;
      }

      if (c === '"') quoted = true;
      else if (c === "{") depth++;
      else if (c === "}" && --depth === 0) {
        try {
          const parsed = JSON.parse(text.slice(i, j + 1));
          if (parsed && typeof parsed === "object" && !Array.isArray(parsed)) {
            return parsed;
          }
        } catch {}
        break;
      }
    }
  }

  throw new Error("O ChatGPT não retornou um JSON válido.");
}

function sanitizePlan(input) {
  if (!input || typeof input !== "object" || Array.isArray(input)) {
    throw new Error("O plano visual recebido é inválido.");
  }

  const number = (value, fallback, min, max) => {
    const n = Number(value);
    return Number.isFinite(n) ? Math.max(min, Math.min(max, n)) : fallback;
  };
  const boolean = (value, fallback) => typeof value === 'boolean' ? value : fallback;
  const safeColor = (value, fallback) => typeof value === 'string' && /^#[0-9a-fA-F]{6}$/.test(value)
    ? value.toUpperCase() : fallback;

  const allowedShapes = new Set(shapes);
  const geometryInput = input.geometry && typeof input.geometry === 'object' && !Array.isArray(input.geometry)
    ? input.geometry : {};
  const isHumanoidObject = input.object === 'grid_soul_humanoid' && geometryInput.type === 'human_face';
  const shape = isHumanoidObject ? 'face' : allowedShapes.has(input.shape) ? input.shape : 'sphere';
  const color = safeColor(input.color, '#00DFFF');
  const rawFaceProfile = input.faceProfile && typeof input.faceProfile === 'object'
    ? input.faceProfile : input;
  const profileGeometry = rawFaceProfile.geometry && typeof rawFaceProfile.geometry === 'object'
    ? rawFaceProfile.geometry : geometryInput;
  const profileGrid = profileGeometry.grid && typeof profileGeometry.grid === 'object' ? profileGeometry.grid : {};
  const profileFace = rawFaceProfile.face && typeof rawFaceProfile.face === 'object' ? rawFaceProfile.face : {};
  const profileMaterials = rawFaceProfile.materials && typeof rawFaceProfile.materials === 'object' ? rawFaceProfile.materials : {};
  const profileMesh = rawFaceProfile.mesh && typeof rawFaceProfile.mesh === 'object' ? rawFaceProfile.mesh : {};
  const profileParticles = rawFaceProfile.particles && typeof rawFaceProfile.particles === 'object' ? rawFaceProfile.particles : {};
  const profileLighting = rawFaceProfile.lighting && typeof rawFaceProfile.lighting === 'object' ? rawFaceProfile.lighting : {};
  const profileRender = rawFaceProfile.render && typeof rawFaceProfile.render === 'object' ? rawFaceProfile.render : {};
  const particleColors = Array.isArray(profileParticles.colors)
    ? profileParticles.colors.slice(0, 8).map(c => safeColor(c, null)).filter(Boolean)
    : [];
  const faceProfile = shape === 'face' ? {
    geometry: {
      type: 'human_face',
      representation: profileGeometry.representation === 'voxel_mesh' ? 'voxel_mesh' : 'voxel_mesh',
      referenceMode: 'cube_atlas',
      density: number(profileGeometry.density, 0.92, 0.1, 1),
      distribution: ['surface_adaptive', 'uniform_lattice'].includes(profileGeometry.distribution)
        ? profileGeometry.distribution : 'surface_adaptive',
      grid: {
        type: '3d_cubic_lattice',
        cellShape: 'cube',
        size: number(profileGrid.size, 0.025, 0.005, 0.15),
        spacing: number(profileGrid.spacing, 0.004, 0, 0.08),
        adaptiveResolution: boolean(profileGrid.adaptiveResolution, true),
        surfaceConforming: boolean(profileGrid.surfaceConforming, true),
        preserveFacialFeatures: boolean(profileGrid.preserveFacialFeatures, true)
      }
    },
    materials: {
      base: safeColor(profileMaterials.base, '#005BFF'),
      primary: safeColor(profileMaterials.primary, '#00E5FF'),
      secondary: safeColor(profileMaterials.secondary, '#7B2CFF'),
      accent: safeColor(profileMaterials.accent, '#FF38D1'),
      highlight: safeColor(profileMaterials.highlight, '#FFD34D'),
      metallic: number(profileMaterials.metallic, 0.65, 0, 1),
      roughness: number(profileMaterials.roughness, 0.22, 0.02, 1),
      emissiveIntensity: number(profileMaterials.emissiveIntensity, 1.5, 0, 3)
    },
    face: {
      symmetry: number(profileFace.symmetry, 0.92, 0, 1),
      eyeDetail: number(profileFace.eyeDetail, 1, 0, 1.5),
      noseDetail: number(profileFace.noseDetail, 0.95, 0, 1.5),
      mouthDetail: number(profileFace.mouthDetail, 0.95, 0, 1.5),
      surfaceDisplacement: number(profileFace.surfaceDisplacement, 0.035, 0, 0.2),
      expression: ['neutral', 'smile', 'frown'].includes(profileFace.expression) ? profileFace.expression : 'neutral',
      orientation: ['frontal', 'three_quarter', 'profile'].includes(profileFace.orientation) ? profileFace.orientation : 'frontal'
    },
    mesh: {
      connectivity: 'neighbor_lattice',
      renderCubesIndividually: true,
      mergeAdjacentFaces: false,
      edgeDefinition: number(profileMesh.edgeDefinition, 0, 0, 0.5),
      surfaceContinuity: number(profileMesh.surfaceContinuity, 1, 0, 1),
      lod: boolean(profileMesh.lod, false)
    },
    particles: {
      enabled: boolean(profileParticles.enabled, true),
      count: Math.round(number(profileParticles.count, 0, 0, 10000)),
      distribution: profileParticles.distribution === 'orbiting_surface' ? 'orbiting_surface' : 'orbiting_surface',
      dispersion: number(profileParticles.dispersion, 0.35, 0, 2),
      sizeVariation: number(profileParticles.sizeVariation, 0.8, 0, 1),
      colors: particleColors.length ? particleColors : ['#00E5FF', '#126BFF', '#A52CFF', '#FF38D1', '#FFD34D']
    },
    lighting: {
      bloom: number(profileLighting.bloom, 0, 0, 3),
      contrast: number(profileLighting.contrast, 1, 0.5, 2),
      ambient: number(profileLighting.ambient, 0.12, 0, 1),
      keyLight: safeColor(profileLighting.keyLight, '#00CFFF'),
      rimLight: safeColor(profileLighting.rimLight, '#A52CFF'),
      background: safeColor(profileLighting.background, '#020617')
    },
    render: {
      quality: ['standard', 'high', 'ultra'].includes(profileRender.quality) ? profileRender.quality : 'high',
      antialiasing: boolean(profileRender.antialiasing, true),
      shadows: boolean(profileRender.shadows, false),
      depthOfField: number(profileRender.depthOfField, 0, 0, 1),
      transparentBackground: boolean(profileRender.transparentBackground, false)
    }
  } : null;

  const allowedKinds = new Set(partKinds);
  const parts = shape === "custom" && Array.isArray(input.parts)
    ? input.parts.slice(0, 24).filter(p => p && typeof p === "object").map(p => ({
        kind: allowedKinds.has(p.kind) ? p.kind : "box",
        x: number(p.x, 0, -4, 4),
        y: number(p.y, 0, -4, 4),
        z: number(p.z, 0, -4, 4),
        sx: number(p.sx, 0.5, 0.05, 3),
        sy: number(p.sy, 0.5, 0.05, 3),
        sz: number(p.sz, 0.5, 0.05, 3),
        rx: number(p.rx, 0, -6.28, 6.28),
        ry: number(p.ry, 0, -6.28, 6.28),
        rz: number(p.rz, 0, -6.28, 6.28)
      }))
    : [];

  return {
    object: shape === 'face' ? 'grid_soul_humanoid' : undefined,
    geometry: faceProfile ? { ...faceProfile.geometry, population: Math.round(number(isHumanoidObject ? geometryInput.population : input.population, 85000, 1000, 500000)), scale: number(isHumanoidObject ? geometryInput.scale : input.scale, 2.5, 0.5, 8) } : undefined,
    materials: faceProfile?.materials,
    face: faceProfile?.face,
    mesh: faceProfile?.mesh,
    particles: faceProfile?.particles,
    lighting: faceProfile?.lighting,
    render: faceProfile?.render,
    reply: typeof input.reply === "string"
      ? input.reply.slice(0, 1000)
      : "Plano visual recebido pelo GRID SOUL.",
    shape,
    population: Math.round(number(isHumanoidObject ? geometryInput.population : input.population, 85000, 1000, 500000)),
    energy: number(input.energy, 0.7, 0, 1),
    scale: number(isHumanoidObject ? geometryInput.scale : input.scale, 2.5, 0.5, 8),
    rotationX: number(input.rotationX, 0, -6.28, 6.28),
    rotationY: number(input.rotationY, 0, -6.28, 6.28),
    rotationZ: number(input.rotationZ, 0, -6.28, 6.28),
    moveX: number(input.moveX, 0, -10, 10),
    moveY: number(input.moveY, 0, -10, 10),
    moveZ: number(input.moveZ, 0, -10, 10),
    color,
    paletteMode: isHumanoidObject ? 'face' : ['chemical', 'single', 'rainbow', 'plasma', 'fire', 'green', 'cyan', 'face'].includes(input.paletteMode)
      ? input.paletteMode
      : 'chemical',
    focusedAtomicNumber: Number.isInteger(Number(input.focusedAtomicNumber)) && Number(input.focusedAtomicNumber) >= 1 && Number(input.focusedAtomicNumber) <= 118
      ? Number(input.focusedAtomicNumber)
      : null,
    identityVersion: 'cube-slot-modulo-118-v1',
    faceProfile,
    parts
  };
}

async function askChatGPT(prompt) {
  const page = await getChatGPTPage();
  const composer = await firstVisible(page, [
    '[data-chatgpt-composer] [role="textbox"][contenteditable="true"]',
    '[role="textbox"][contenteditable="true"]',
    '[aria-label="Ask ChatGPT"]',
    "textarea"
  ]);

  if (!composer) throw new Error("Campo de mensagem não encontrado no ChatGPT.");

  const stopSelectors = [
    'button[data-testid="stop-button"]',
    'button[aria-label*="Stop generating"]',
    'button[aria-label*="Parar"]'
  ];

  if (await firstVisible(page, stopSelectors)) {
    throw new Error("O ChatGPT ainda está gerando uma resposta anterior.");
  }

  const body = page.locator("body");
  const before = await body.innerText().catch(() => "");
  const beforeAssistantCount = await page.locator(
    '[data-message-author-role="assistant"]'
  ).count().catch(() => 0);

  await composer.fill(prompt);

  // O botão de envio da interface atual pode não ter rótulo acessível.
  // Após preencher, o último botão do formulário do compositor é o enviar.
  const form = composer.locator("xpath=ancestor::form[1]");
  const send = form.locator("button").last();

  if (await send.count()) {
    const sendInfo = await send.evaluate(b => ({
      visible: (() => {
        const r = b.getBoundingClientRect();
        return r.width > 0 && r.height > 0;
      })(),
      disabled: b.disabled,
      aria: b.getAttribute("aria-label"),
      svg: b.querySelector("svg use")?.getAttribute("href") || ""
    }));

    if (sendInfo.visible && !sendInfo.disabled &&
        !/voice|microphone|microfone/i.test(
          (sendInfo.aria || "") + " " + sendInfo.svg
        )) {
      await send.click();
    } else {
      await composer.press("Enter");
    }
  } else {
    await composer.press("Enter");
  }

  const deadline = Date.now() + 180000;
  let lastCandidate = "";
  let stableSince = Date.now();

  while (Date.now() < deadline) {
    await page.waitForTimeout(500);

    const generating = await firstVisible(page, stopSelectors);
    const currentText = await body.innerText().catch(() => "");

    let candidate = "";
    let newResponse = false;

    // Preferir a última mensagem real do assistente quando disponível.
    const messages = page.locator('[data-message-author-role="assistant"]');
    const count = await messages.count().catch(() => 0);

    if (count > beforeAssistantCount && count > 0) {
      candidate = (await messages.nth(count - 1).innerText().catch(() => "")).trim();
      newResponse = candidate.length > 0;
    }

    // Compatibilidade com interfaces que usam marcadores textuais.
    if (!newResponse) {
      const markers = ["ChatGPT said:", "ChatGPT disse:"];
      let markerIndex = -1;
      let markerLength = 0;

      for (const marker of markers) {
        const i = currentText.lastIndexOf(marker);
        if (i > markerIndex) {
          markerIndex = i;
          markerLength = marker.length;
        }
      }

      if (markerIndex >= 0) {
        const tail = currentText.slice(markerIndex + markerLength).trim();
        if (tail && tail !== before.trim()) {
          candidate = tail;
          newResponse = true;
        }
      }
    }

    // Último recurso: considerar apenas o texto acrescentado após o envio.
    if (!newResponse && currentText.startsWith(before)) {
      const appended = currentText.slice(before.length).trim();
      if (appended.length > 10) {
        candidate = appended;
        newResponse = true;
      }
    }

    let validJSON = false;
    if (newResponse && candidate) {
      try {
        extractJSON(candidate);
        validJSON = true;
      } catch {}
    }

    if (candidate !== lastCandidate) {
      lastCandidate = candidate;
      stableSince = Date.now();
    }

    if (generating) stableSince = Date.now();

    if (newResponse && validJSON && !generating &&
        Date.now() - stableSince >= 1800) {
      return candidate;
    }
  }

  const tail = (await body.innerText().catch(() => "")).slice(-1600);
  console.error("GRID SOUL: timeout aguardando JSON. Final da página:", tail);
  throw new Error("Tempo esgotado aguardando JSON novo do ChatGPT.");
}

function askChatGPTWithExtension(prompt) {
  if (extensionTask) {
    return Promise.reject(new Error('A ponte da extensão já tem um comando pendente.'));
  }

  return new Promise((resolve, reject) => {
    const task = { id: randomUUID(), message: prompt, delivered: false, resolve, reject, timeout: null };
    task.timeout = setTimeout(() => {
      if (extensionTask === task) extensionTask = null;
      reject(new Error('Tempo esgotado aguardando a extensão do Chrome.'));
    }, 180_000);
    extensionTask = task;
  });
}

function requestChatGPT(prompt) {
  return BRIDGE_MODE === 'extension' ? askChatGPTWithExtension(prompt) : askChatGPT(prompt);
}

app.get('/api/memory', (_req, res) => {
  res.json({
    ok: true,
    updatedAt: memory.updatedAt,
    lastCommand: memory.lastCommand,
    lastPlan: memory.lastPlan,
    historyCount: memory.history.length
  });
});

app.post('/api/memory/state', (req, res) => {
  try {
    const command = typeof req.body?.command === 'string' ? req.body.command : '';
    const plan = sanitizePlan(req.body?.plan);
    rememberVisualState(command, plan);
    res.json({ ok: true, updatedAt: memory.updatedAt });
  } catch (err) {
    console.error('GRID SOUL memory:', String(err.message || err).slice(0, 200));
    res.status(400).json({ error: 'Estado de memória inválido.' });
  }
});

app.get('/api/extension/next', (_req, res) => {
  res.set('Cache-Control', 'no-store');
  if (!extensionTask || extensionTask.delivered) return res.json({});
  extensionTask.delivered = true;
  res.json({ id: extensionTask.id, message: extensionTask.message });
});

app.post('/api/extension/result', (req, res) => {
  const task = extensionTask;
  if (!task || req.body?.id !== task.id) {
    return res.status(404).json({ error: 'Tarefa da extensão não encontrada.' });
  }
  const result = typeof req.body?.result === 'string' ? req.body.result : '';
  const error = typeof req.body?.error === 'string' ? req.body.error.slice(0, 300) : '';
  if (result.length > 7000) {
    return res.status(413).json({ error: 'Resposta da extensão excede o limite permitido.' });
  }
  extensionTask = null;
  clearTimeout(task.timeout);
  if (error) task.reject(new Error(error));
  else task.resolve(result);
  res.json({ ok: true });
});

app.get("/api/health", (_req, res) => {
  res.json({
    ok: true,
    service: "GRID SOUL",
    brain: BRIDGE_MODE === 'extension'
      ? 'ChatGPT via extensão do Chrome'
      : 'ChatGPT via Playwright/CDP no Chrome',
    bridge: BRIDGE_MODE,
    port: PORT,
    browserReady: Boolean(cdpBrowser && cdpBrowser.isConnected()),
    busy
  });
});

app.post("/api/command", async (req, res) => {
  const message = req.body?.message;
  const currentPopulation = Number(req.body?.population);

  if (typeof message !== "string" || !message.trim() || message.length > 1200) {
    return res.status(400).json({ error: "Informe um comando de até 1200 caracteres." });
  }
  if (busy) {
    return res.status(429).json({ error: "O GRID SOUL já está aguardando outra resposta do ChatGPT." });
  }

  busy = true;
  try {
    const prompt = [
      "Você é o cérebro do GRID SOUL: um único enxame visual coordenado de microcubos 3D.",
      "Responda SOMENTE com um objeto JSON válido, sem markdown ou texto externo.",
      "Campos legados aceitos: reply, shape, population, energy, scale, rotationX, rotationY, rotationZ, moveX, moveY, moveZ, color, parts, paletteMode, focusedAtomicNumber.",
      "Para uma face humanoide, também pode retornar o perfil aninhado: object=grid_soul_humanoid; geometry.type=human_face; geometry.representation=voxel_mesh; geometry.population/scale/density/distribution/grid; materials; face; mesh; particles; lighting; render. O servidor normaliza, limita e valida os parâmetros e mantém os campos legados shape=face, population, scale e paletteMode=face.",
      "Perfil facial: reconstrua o rosto frontal usando somente os cubos instanciados do mapa de amostras da referência; não crie textura, sprite, fotografia como plano nem malha facial. As coordenadas e RGB das amostras já vêm da referência e prevalecem sobre a paleta/material/iluminação artificiais. Mantenha a face frontal. Perfil: geometry.representation=voxel_mesh, grid size=0.025, density=0.92, scale=2.5, face symmetry=0.92, eyeDetail=1, noseDetail/mouthDetail=0.95, neutral/frontal; fundo #020617. Ao usuário pedir rosto exatamente igual/fiel ao anexo ou à referência e não especificar outra população, use 88000 slots para corresponder ao mapa. Para pedidos comuns, conserve a população atual; respeite sempre uma população que o usuário especificar explicitamente. Cubos orbitais já estão contidos no mapa de referência: não acrescente outra faixa de partículas.",
      "A geometria.grid contém type=3d_cubic_lattice, cellShape=cube, size, spacing, adaptiveResolution, surfaceConforming e preserveFacialFeatures. A face aceita symmetry, eyeDetail, noseDetail, mouthDetail, surfaceDisplacement, expression e orientation. materials aceita base/primary/secondary/accent/highlight, metallic, roughness e emissiveIntensity.",
      "mesh preserva cubos individuais e topologia de vizinhos; particles controla enabled/count/distribution/dispersion/sizeVariation/colors. lighting e render são configurações declarativas: não afirme ativar bloom, sombras reais, profundidade de campo ou LOD se não forem suportados pelo renderer.",
      "shape permitido: sphere, torus, spiral, wave, cloud, face, terrain, custom.",
      "population inteiro entre 1000 e 500000; preserve a população atual informada pelo GRID SOUL, salvo se o usuário pedir explicitamente outra população; energy entre 0 e 1; scale entre 0.5 e 8.",
      "Rotações entre -6.28 e 6.28; moveX, moveY e moveZ entre -10 e 10; color hexadecimal #RRGGBB.",
      "parts deve ser [] exceto para shape custom. Para custom, no máximo 24 partes.",
      "Cada parte: kind, x, y, z, sx, sy, sz, rx, ry, rz. kind: sphere, ellipsoid, torus, cylinder, cone ou box.",
      "Posições entre -4 e 4; dimensões entre 0.05 e 3; rotações entre -6.28 e 6.28.",
      "Os IDs dos microcubos e seus elementos químicos são persistentes e determinísticos; não reatribua elementos. Use paletteMode=chemical por padrão; paletteMode pode ser face para rosto holográfico, single, rainbow, plasma, fire, green ou cyan quando solicitado. Para shape=face ou object=grid_soul_humanoid, os destinos de cada cubo são calculados localmente usando os slots existentes e o atlas de amostras. focusedAtomicNumber deve ser null, salvo seleção explícita.",
      `População atual do enxame: ${Number.isInteger(currentPopulation) && currentPopulation >= 1000 && currentPopulation <= 500000 ? currentPopulation : 85000}.`,
      "Não produza código executável nem comandos de sistema.",
      "Pedido do usuário: " + message.trim()
    ].join("\n");

    const raw = await requestChatGPT(prompt);
    const plan = sanitizePlan(extractJSON(raw));
    const structuredHumanoidPopulation = /["']object["']\s*:\s*["']grid_soul_humanoid["'][\s\S]*?["']population["']\s*:\s*\d+/i.test(message);
    const requestedPopulationChange = structuredHumanoidPopulation || /\b(popula(?:ção|cao)|microcubos?|cubos?)\b.{0,45}\b(\d{3,}|aument|reduz|mais|menos|metade|dobro)\b|\b(aumente|reduza|amplie|diminua)\b.{0,35}\b(popula(?:ção|cao)|microcubos?|cubos?)\b/i.test(message);
    const asksReferenceMatch = /\b(exatamente|id[eê]ntic[oa]|igual|fiel)\b/i.test(message)
      && /\b(rosto|face|humanoide|refer[eê]ncia|anexo|imagem)\b/i.test(message);
    if (!requestedPopulationChange && asksReferenceMatch && plan.shape === 'face') {
      plan.population = 88000;
      if (plan.geometry && typeof plan.geometry === 'object') plan.geometry.population = 88000;
    } else if (!requestedPopulationChange && Number.isInteger(currentPopulation) && currentPopulation >= 1000 && currentPopulation <= 500000) {
      plan.population = currentPopulation;
      if (plan.geometry && typeof plan.geometry === 'object') plan.geometry.population = currentPopulation;
    }
    try {
      rememberSuccessfulCommand(message.trim(), plan);
    } catch (memoryError) {
      console.error("GRID SOUL memory write:", String(memoryError.message || memoryError).slice(0, 200));
    }
    res.json(plan);
  } catch (err) {
    console.error("ChatGPT CDP bridge:", String(err.message || err).slice(0, 500));
    res.status(502).json({
      error: String(err.message || "Não foi possível obter um plano válido do ChatGPT.").slice(0, 300)
    });
  } finally {
    busy = false;
  }
});

app.use(express.static(path.join(ROOT, 'public')));

app.listen(PORT, '127.0.0.1', () => {
  console.log(`GRID SOUL: http://127.0.0.1:${PORT}`);
  console.log(BRIDGE_MODE === 'extension'
    ? 'Cérebro: ChatGPT via extensão carregada no navegador.'
    : 'Cérebro: ChatGPT via Playwright/CDP em 127.0.0.1:9222.');
});
