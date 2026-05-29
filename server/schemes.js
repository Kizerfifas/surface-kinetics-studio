import fs from 'fs/promises';
import path from 'path';
import yaml from 'js-yaml';
import { SCHEMES_DIR, DEFAULT_SCHEME_FILE } from './config.js';
import {
  BUILTIN_FORMULA_PRESETS,
  expandFormula,
  listPresetsForUI,
  mergeRegistries,
  validateSchemeExpressions,
} from './formulaPresets.js';

export {
  BUILTIN_FORMULA_PRESETS,
  expandFormula,
  listPresetsForUI,
  mergeRegistries,
  validateSchemeExpressions,
};

const EVENT_TYPES = [
  'adsorption_F',
  'adsorption_S',
  'desorption_F',
  'recomb_ER',
  'diffusion',
];

/** Starter scheme (Marinov-style presets, valid events). */
export function emptyScheme() {
  return {
    rates: [
      { id: 'r1', expr: 'adsorption_flux()' },
      { id: 'r2', expr: 'arrhenius(Vdes, Edes)' },
      { id: 'r3', expr: 'adsorption_flux()' },
      { id: 'r4', expr: 'er_with_r3(Er)' },
      { id: 'r5', expr: 'arrhenius(Vdif, Edif)' },
    ],
    probabilities: [
      { id: 'recomb_S', expr: 'per(Er)' },
      { id: 'recomb_F', expr: 'plh(Erlh)' },
    ],
    events: [
      { event_type: 'adsorption_F', rate_id: 'r1', lambda_expr: 'bkl_sites_rate(free_F_sites, r1)' },
      { event_type: 'adsorption_S', rate_id: 'r3', lambda_expr: 'bkl_sites_rate(free_S_sites, r3)' },
      { event_type: 'desorption_F', rate_id: 'r2', lambda_expr: 'bkl_atoms_rate(atoms_on_F, r2)' },
      { event_type: 'recomb_ER', rate_id: 'r4', lambda_expr: 'bkl_atoms_rate(atoms_on_S, r4)' },
      { event_type: 'diffusion', rate_id: 'r5', lambda_expr: 'bkl_atoms_rate(atoms_on_F, r5)' },
    ],
  };
}

function sanitizeSchemeFilename(name) {
  const base = path.basename(String(name || '').trim());
  if (!base) throw new Error('Укажите имя файла');
  if (!/^[a-zA-Z0-9_.-]+\.(yaml|yml)$/.test(base)) {
    throw new Error('Имя: латиница, цифры, _, -, расширение .yaml или .yml');
  }
  return base;
}

/**
 * Create a new scheme file (fails if exists).
 * @param {'empty'|'marinov'|'copy'} template
 */
export async function createScheme(filename, { template = 'empty', source } = {}) {
  const trimmed = String(filename || '').trim();
  const withExt =
    trimmed.endsWith('.yaml') || trimmed.endsWith('.yml') ? trimmed : `${trimmed}.yaml`;
  const safe = sanitizeSchemeFilename(withExt);
  const full = path.join(SCHEMES_DIR, safe);
  try {
    await fs.access(full);
    throw new Error(`Файл уже существует: ${safe}`);
  } catch (e) {
    if (e.code !== 'ENOENT') throw e;
  }

  let scheme;
  if (template === 'marinov') {
    scheme = (await readScheme(DEFAULT_SCHEME_FILE)).scheme;
  } else if (template === 'copy') {
    if (!source) throw new Error('Для копии укажите source');
    scheme = (await readScheme(source)).scheme;
  } else {
    scheme = emptyScheme();
  }
  return writeScheme(safe, scheme);
}

export function schemeToYaml(scheme) {
  return yaml.dump(scheme, { lineWidth: 120, noRefs: true });
}

export function yamlToScheme(text) {
  const parsed = yaml.load(text);
  if (!parsed || typeof parsed !== 'object') {
    throw new Error('Invalid scheme YAML');
  }
  validateSchemeExpressions(parsed);
  return parsed;
}

export async function listSchemeFiles() {
  const files = await fs.readdir(SCHEMES_DIR);
  return files.filter((f) => f.endsWith('.yaml') || f.endsWith('.yml'));
}

export async function readScheme(filename = DEFAULT_SCHEME_FILE) {
  const safe = path.basename(filename);
  const full = path.join(SCHEMES_DIR, safe);
  const text = await fs.readFile(full, 'utf8');
  const scheme = yamlToScheme(text);
  return { filename: safe, text, scheme };
}

export async function writeScheme(filename, schemeOrText, asRawYaml = false) {
  const safe = path.basename(filename);
  if (!safe.endsWith('.yaml') && !safe.endsWith('.yml')) {
    throw new Error('Scheme file must be .yaml or .yml');
  }
  const full = path.join(SCHEMES_DIR, safe);
  const text = asRawYaml ? schemeOrText : schemeToYaml(schemeOrText);
  yamlToScheme(text); // validate
  await fs.writeFile(full, text, 'utf8');
  return { filename: safe, text, scheme: yamlToScheme(text) };
}

export { EVENT_TYPES, DEFAULT_SCHEME_FILE };
