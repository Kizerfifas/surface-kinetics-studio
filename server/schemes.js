import fs from 'fs/promises';
import path from 'path';
import yaml from 'js-yaml';
import { SCHEMES_DIR, DEFAULT_SCHEME_FILE } from './config.js';

const EVENT_TYPES = [
  'adsorption_F',
  'adsorption_S',
  'desorption_F',
  'recomb_ER',
  'diffusion',
];

export function emptyScheme() {
  return {
    rates: [
      { id: 'r1', expr: 'atomFlux / (F_density + S_density)' },
      { id: 'r2', expr: 'Vdes * exp(-Edes / (8.31 * T))' },
    ],
    probabilities: [
      { id: 'recomb_S', expr: 'exp(-Er / (8.31 * T))' },
      { id: 'recomb_F', expr: 'exp(-Erlh / (8.31 * T))' },
    ],
    events: [
      { event_type: 'adsorption_F', rate_id: 'r1' },
      { event_type: 'adsorption_S', rate_id: 'r3' },
      { event_type: 'desorption_F', rate_id: 'r2' },
      { event_type: 'recomb_ER', rate_id: 'r4' },
      { event_type: 'diffusion', rate_id: 'r5' },
    ],
  };
}

export function schemeToYaml(scheme) {
  return yaml.dump(scheme, { lineWidth: 120, noRefs: true });
}

export function yamlToScheme(text) {
  const parsed = yaml.load(text);
  if (!parsed || typeof parsed !== 'object') {
    throw new Error('Invalid scheme YAML');
  }
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
