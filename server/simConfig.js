import fs from 'fs/promises';
import path from 'path';
import yaml from 'js-yaml';
import { SURFACE_ATOMS_PATH } from './config.js';

export const CONFIG_PATH = path.join(SURFACE_ATOMS_PATH, 'config.yaml');

export const CHECK_PARAM_NAMES = ['densityF', 'densityS', 'density', 'atomsOnSurface'];

const ELEMENT_FIELDS = [
  'name',
  'mass',
  'edes',
  'edif',
  'vdes',
  'vdif',
  'er',
  'erlh',
  'agDensity',
  'sort',
];

/** Default matching surface-atoms feat-quasi-steady-with-mean (N + O). */
export function defaultConfig() {
  return {
    simulating: {
      logPercent: 0.1,
      matrixLenX: 1000,
      matrixLenY: 1000,
      floatPrecision: 8,
      graphicsToPlot: [
        { xAxis: 'Simulation time', yAxis: 'Surface coverage' },
        { xAxis: 'Simulation time', yAxis: 'Density F' },
        { xAxis: 'Simulation time', yAxis: 'Density S' },
      ],
      stopOnQuasiSteady: true,
      requiredStableChecks: 10,
      checkParameters: [
        { name: 'densityF', tolerance: 2, valuesWindowSize: 100 },
      ],
    },
    schemePath: 'configs/scheme_marinov.yaml',
    consts: {
      fDensity: 1.5e15,
      fi: 0.002,
      sDensity: 3e12,
    },
    elements: [
      {
        name: 'N',
        mass: 14,
        edes: 51000,
        edif: 25500,
        vdes: 1e15,
        vdif: 1e13,
        er: 14000,
        erlh: 0,
        agDensity: 8e14,
        sort: 1,
      },
      {
        name: 'O',
        mass: 16,
        edes: 55000,
        edif: 27500,
        vdes: 1e13,
        vdif: 1e11,
        er: 16000,
        erlh: 2000,
        agDensity: 2e14,
        sort: 2,
      },
    ],
  };
}

export function presetSingleComponent() {
  const c = defaultConfig();
  c.elements = [defaultConfig().elements[0]];
  c.elements[0].sort = 1;
  return c;
}

export function presetTwoComponent() {
  return defaultConfig();
}

function normalizeElement(el, index) {
  const out = {};
  for (const key of ELEMENT_FIELDS) {
    if (el[key] !== undefined && el[key] !== null) out[key] = el[key];
  }
  if (!out.name) out.name = `E${index + 1}`;
  if (out.sort == null) out.sort = index + 1;
  return out;
}

export function normalizeConfig(raw) {
  const base = defaultConfig();
  const cfg = {
    simulating: { ...base.simulating, ...(raw.simulating || {}) },
    schemePath: raw.schemePath ?? base.schemePath,
    consts: { ...base.consts, ...(raw.consts || {}) },
    elements: Array.isArray(raw.elements) ? raw.elements.map(normalizeElement) : base.elements,
  };

  if (!Array.isArray(cfg.simulating.graphicsToPlot)) {
    cfg.simulating.graphicsToPlot = base.simulating.graphicsToPlot;
  }
  if (!Array.isArray(cfg.simulating.checkParameters)) {
    cfg.simulating.checkParameters = base.simulating.checkParameters;
  }

  cfg.elements.sort((a, b) => (a.sort ?? 0) - (b.sort ?? 0));
  cfg.elements.forEach((el, i) => {
    el.sort = i + 1;
  });

  return cfg;
}

export function validateConfig(cfg) {
  if (!cfg.elements?.length) {
    throw new Error('Нужен хотя бы один элемент (elements)');
  }
  const names = new Set();
  for (const el of cfg.elements) {
    if (!el.name?.trim()) throw new Error('У каждого элемента должно быть имя');
    if (names.has(el.name)) throw new Error(`Дублирующееся имя элемента: ${el.name}`);
    names.add(el.name);
  }
  for (const p of cfg.simulating?.checkParameters || []) {
    if (!CHECK_PARAM_NAMES.includes(p.name)) {
      throw new Error(`Неизвестный checkParameter.name: ${p.name}`);
    }
    if (!(p.valuesWindowSize > 0)) {
      throw new Error(`valuesWindowSize должен быть > 0 для ${p.name}`);
    }
  }
}

/** Map UI config to YAML keys expected by Go koanf (json tags). */
export function configToYamlObject(cfg) {
  const c = normalizeConfig(cfg);
  return {
    simulating: {
      logPercent: c.simulating.logPercent,
      matrixLenX: c.simulating.matrixLenX,
      matrixLenY: c.simulating.matrixLenY,
      floatPrecision: c.simulating.floatPrecision,
      graphicsToPlot: c.simulating.graphicsToPlot,
      stopOnQuasiSteady: c.simulating.stopOnQuasiSteady,
      requiredStableChecks: c.simulating.requiredStableChecks,
      checkParameters: c.simulating.checkParameters.map((p) => ({
        name: p.name,
        tolerance: p.tolerance,
        valuesWindowSize: p.valuesWindowSize,
      })),
    },
    ...(c.schemePath ? { schemePath: c.schemePath } : {}),
    consts: {
      fDensity: c.consts.fDensity,
      fi: c.consts.fi,
      sDensity: c.consts.sDensity,
    },
    elements: c.elements.map((el) => ({
      name: el.name,
      mass: el.mass,
      edes: el.edes,
      edif: el.edif,
      vdes: el.vdes,
      vdif: el.vdif,
      er: el.er,
      erlh: el.erlh,
      agDensity: el.agDensity,
      sort: el.sort,
    })),
  };
}

export function configToYamlText(cfg) {
  return yaml.dump(configToYamlObject(cfg), { lineWidth: 100, noRefs: true, quotingType: '"' });
}

export async function readSimConfig() {
  try {
    const text = await fs.readFile(CONFIG_PATH, 'utf8');
    const parsed = yaml.load(text) || {};
    const config = normalizeConfig(parsed);
    return { config, text, path: CONFIG_PATH };
  } catch (e) {
    if (e.code === 'ENOENT') {
      const config = defaultConfig();
      return { config, text: configToYamlText(config), path: CONFIG_PATH };
    }
    throw e;
  }
}

export async function writeSimConfig(cfg) {
  const normalized = normalizeConfig(cfg);
  validateConfig(normalized);
  const text = configToYamlText(normalized);
  yaml.load(text);
  await fs.writeFile(CONFIG_PATH, text, 'utf8');
  return { config: normalized, text };
}

export async function writeSimConfigYaml(rawText) {
  const parsed = yaml.load(rawText);
  if (!parsed || typeof parsed !== 'object') throw new Error('Некорректный YAML');
  const config = normalizeConfig(parsed);
  validateConfig(config);
  const text = configToYamlText(config);
  await fs.writeFile(CONFIG_PATH, text, 'utf8');
  return { config, text };
}
