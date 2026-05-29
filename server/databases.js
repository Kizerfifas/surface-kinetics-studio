import fs from 'fs/promises';
import path from 'path';
import yaml from 'js-yaml';
import { fileURLToPath } from 'url';
import { normalizeConfig, readSimConfig, writeSimConfig } from './simConfig.js';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
export const DATABASES_DIR = path.join(__dirname, '../databases');

async function readIndex() {
  const raw = await fs.readFile(path.join(DATABASES_DIR, 'index.json'), 'utf8');
  const { entries } = JSON.parse(raw);
  return entries;
}

async function loadEntryFile(relFile) {
  const text = await fs.readFile(path.join(DATABASES_DIR, relFile), 'utf8');
  return yaml.load(text);
}

/** @returns {Promise<Array<{ id, kind, label, description? }>>} */
export async function listDatabaseEntries() {
  const entries = await readIndex();
  const out = [];
  for (const meta of entries) {
    let description = '';
    try {
      const doc = await loadEntryFile(meta.file);
      description = doc.description || doc.label || '';
    } catch {
      /* ignore */
    }
    out.push({
      id: meta.id,
      kind: meta.kind,
      label: meta.label,
      description,
      file: meta.file,
    });
  }
  return out;
}

export async function getDatabaseEntry(id) {
  const entries = await readIndex();
  const meta = entries.find((e) => e.id === id);
  if (!meta) throw new Error(`Database entry not found: ${id}`);
  const data = await loadEntryFile(meta.file);
  return { ...meta, data };
}

/**
 * Merge database entry into config.
 * @param {object} config
 * @param {object} data - parsed YAML
 * @param {'full'|'consts'|'element'} kind
 * @param {string} [elementName] - target element for kind=element
 */
export function mergeDatabaseIntoConfig(config, data, kind, elementName) {
  const base = normalizeConfig(config);

  if (kind === 'full') {
    return normalizeConfig({
      ...base,
      consts: { ...base.consts, ...(data.consts || {}) },
      elements: data.elements?.length ? data.elements : base.elements,
      schemePath: data.schemePath ?? base.schemePath,
    });
  }

  if (kind === 'consts') {
    return normalizeConfig({
      ...base,
      consts: { ...base.consts, ...(data.consts || {}) },
    });
  }

  if (kind === 'element') {
    const el = data.element;
    if (!el?.name) throw new Error('Database file must contain element.name');
    const targetName = elementName || el.name;
    const idx = base.elements.findIndex(
      (e) => e.name.toLowerCase() === targetName.toLowerCase(),
    );
    const merged = { ...el, name: targetName };
    if (idx >= 0) {
      const elements = base.elements.map((e, i) =>
        i === idx ? { ...e, ...merged, sort: e.sort ?? i + 1 } : e,
      );
      return normalizeConfig({ ...base, elements });
    }
    return normalizeConfig({
      ...base,
      elements: [...base.elements, { ...merged, sort: base.elements.length + 1 }],
    });
  }

  throw new Error(`Unknown database kind: ${kind}`);
}

export async function applyDatabaseEntry(id, { elementName } = {}) {
  const { kind, data } = await getDatabaseEntry(id);
  const { config } = await readSimConfig();
  const next = mergeDatabaseIntoConfig(config, data, kind, elementName);
  const out = await writeSimConfig(next);
  return { config: out.config, applied: id, kind };
}
