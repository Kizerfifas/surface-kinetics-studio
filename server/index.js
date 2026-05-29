import express from 'express';
import cors from 'cors';
import fs from 'fs/promises';
import path from 'path';
import { fileURLToPath } from 'url';
import { PORT, SURFACE_ATOMS_PATH, DEFAULT_SCHEME_FILE } from './config.js';
import { goBuild, goTest, runSimulation, runResultsCombiner } from './goRunner.js';
import {
  listSchemeFiles,
  readScheme,
  writeScheme,
  createScheme,
  emptyScheme,
  schemeToYaml,
  yamlToScheme,
  EVENT_TYPES,
  BUILTIN_FORMULA_PRESETS,
  expandFormula,
  listPresetsForUI,
  mergeRegistries,
  validateSchemeExpressions,
} from './schemes.js';
import {
  listResultRuns,
  getResultHtmlPath,
  parseResultXlsx,
  buildChartSeries,
} from './results.js';
import {
  readSimConfig,
  writeSimConfig,
  writeSimConfigYaml,
  parseConfigYaml,
  configToYamlText,
  normalizeConfig,
  validateConfig,
  presetSingleComponent,
  presetTwoComponent,
  CHECK_PARAM_NAMES,
} from './simConfig.js';
import {
  listDatabaseEntries,
  getDatabaseEntry,
  applyDatabaseEntry,
} from './databases.js';
import { runParameterSweep, computeAtomFlux } from './sweep.js';

const __dirname = path.dirname(fileURLToPath(import.meta.url));

const app = express();
app.use(cors());
app.use(express.json({ limit: '2mb' }));

// --- Health & config ---
app.get('/api/health', (_req, res) => {
  res.json({ ok: true, surfaceAtomsPath: SURFACE_ATOMS_PATH });
});

// --- Schemes ---
function isSchemeYamlFilename(name) {
  const base = path.basename(String(name || ''));
  return base.endsWith('.yaml') || base.endsWith('.yml');
}

app.get('/api/schemes', async (_req, res) => {
  try {
    const files = await listSchemeFiles();
    res.json({ files, defaultFile: DEFAULT_SCHEME_FILE, eventTypes: EVENT_TYPES });
  } catch (e) {
    res.status(500).json({ error: e.message });
  }
});

// Literal paths first (before /:filename) so "create" is not treated as a filename.
app.post('/api/schemes/new-file', async (req, res) => {
  try {
    const { filename, template, source } = req.body || {};
    if (!filename) return res.status(400).json({ error: 'filename required' });
    const out = await createScheme(filename, { template: template || 'empty', source });
    res.json(out);
  } catch (e) {
    res.status(400).json({ error: e.message });
  }
});

app.post('/api/schemes/create', async (req, res) => {
  try {
    const { filename, template, source } = req.body || {};
    if (!filename) return res.status(400).json({ error: 'filename required' });
    const out = await createScheme(filename, { template: template || 'empty', source });
    res.json(out);
  } catch (e) {
    res.status(400).json({ error: e.message });
  }
});

app.post('/api/schemes/validate', (req, res) => {
  try {
    const { yaml: rawYaml, scheme } = req.body;
    if (rawYaml != null) yamlToScheme(rawYaml);
    else if (scheme) validateSchemeExpressions(scheme);
    else throw new Error('Provide yaml or scheme');
    res.json({ valid: true });
  } catch (e) {
    res.status(400).json({ valid: false, error: e.message });
  }
});

app.get('/api/schemes/formula-presets', (req, res) => {
  const context = req.query.context || '';
  res.json({
    builtins: BUILTIN_FORMULA_PRESETS,
    presets: listPresetsForUI({}, context || undefined),
  });
});

app.post('/api/schemes/parse', (req, res) => {
  try {
    const { yaml: raw } = req.body || {};
    if (raw == null) return res.status(400).json({ error: 'yaml required' });
    const scheme = yamlToScheme(raw);
    res.json({ scheme, text: schemeToYaml(scheme) });
  } catch (e) {
    res.status(400).json({ error: e.message });
  }
});

app.post('/api/schemes/expand-expr', (req, res) => {
  try {
    const { expr, functions } = req.body || {};
    if (!expr) return res.status(400).json({ error: 'expr required' });
    const reg = mergeRegistries(functions || {});
    const expanded = expandFormula(expr, reg);
    res.json({ expr, expanded, unchanged: expanded === expr });
  } catch (e) {
    res.status(400).json({ error: e.message });
  }
});

app.get('/api/schemes/template/empty', (_req, res) => {
  res.json({ scheme: emptyScheme(), yaml: schemeToYaml(emptyScheme()) });
});

app.post('/api/schemes/serialize', (req, res) => {
  try {
    const { scheme } = req.body;
    if (!scheme) return res.status(400).json({ error: 'scheme required' });
    res.json({ yaml: schemeToYaml(scheme) });
  } catch (e) {
    res.status(400).json({ error: e.message });
  }
});

app.get('/api/schemes/:filename', async (req, res) => {
  try {
    if (!isSchemeYamlFilename(req.params.filename)) {
      return res.status(404).json({
        error: 'Ожидается имя файла .yaml/.yml. Перезапустите API (npm run dev:server).',
      });
    }
    const data = await readScheme(req.params.filename);
    res.json(data);
  } catch (e) {
    res.status(404).json({ error: e.message });
  }
});

app.post('/api/schemes/:filename', async (req, res) => {
  try {
    if (!isSchemeYamlFilename(req.params.filename)) {
      return res.status(400).json({
        error:
          'Имя файла должно оканчиваться на .yaml или .yml. Если создаёте схему — перезапустите сервер Studio (npm run dev).',
      });
    }
    const { scheme, yaml: rawYaml } = req.body;
    const out = rawYaml != null
      ? await writeScheme(req.params.filename, rawYaml, true)
      : await writeScheme(req.params.filename, scheme ?? emptyScheme(), false);
    res.json(out);
  } catch (e) {
    res.status(400).json({ error: e.message });
  }
});

// --- Simulation config (config.yaml) ---
app.get('/api/config', async (_req, res) => {
  try {
    const data = await readSimConfig();
    res.json({
      config: data.config,
      text: data.text,
      checkParamNames: CHECK_PARAM_NAMES,
    });
  } catch (e) {
    res.status(500).json({ error: e.message });
  }
});

app.post('/api/config', async (req, res) => {
  try {
    const { config } = req.body;
    if (!config) return res.status(400).json({ error: 'config required' });
    const out = await writeSimConfig(config);
    res.json(out);
  } catch (e) {
    res.status(400).json({ error: e.message });
  }
});

app.post('/api/config/yaml', async (req, res) => {
  try {
    const { yaml: raw } = req.body;
    if (raw == null) return res.status(400).json({ error: 'yaml required' });
    const out = await writeSimConfigYaml(raw);
    res.json(out);
  } catch (e) {
    res.status(400).json({ error: e.message });
  }
});

app.post('/api/config/parse-yaml', (req, res) => {
  try {
    const { yaml: raw } = req.body || {};
    if (raw == null) return res.status(400).json({ error: 'yaml required' });
    res.json(parseConfigYaml(raw));
  } catch (e) {
    res.status(400).json({ error: e.message });
  }
});

app.post('/api/config/serialize', (req, res) => {
  try {
    const { config } = req.body || {};
    if (!config) return res.status(400).json({ error: 'config required' });
    const normalized = normalizeConfig(config);
    validateConfig(normalized);
    res.json({ config: normalized, text: configToYamlText(normalized) });
  } catch (e) {
    res.status(400).json({ error: e.message });
  }
});

app.post('/api/config/preset/:name', async (req, res) => {
  try {
    const preset =
      req.params.name === 'single'
        ? presetSingleComponent()
        : req.params.name === 'two'
          ? presetTwoComponent()
          : null;
    if (!preset) return res.status(400).json({ error: 'Unknown preset (single | two)' });
    const out = await writeSimConfig(preset);
    res.json(out);
  } catch (e) {
    res.status(400).json({ error: e.message });
  }
});

// --- Parameter databases ---
app.get('/api/databases', async (_req, res) => {
  try {
    res.json({ entries: await listDatabaseEntries() });
  } catch (e) {
    res.status(500).json({ error: e.message });
  }
});

app.get('/api/databases/:id', async (req, res) => {
  try {
    res.json(await getDatabaseEntry(req.params.id));
  } catch (e) {
    res.status(404).json({ error: e.message });
  }
});

app.post('/api/databases/:id/apply', async (req, res) => {
  try {
    const { elementName } = req.body || {};
    res.json(await applyDatabaseEntry(req.params.id, { elementName }));
  } catch (e) {
    res.status(400).json({ error: e.message });
  }
});

app.post('/api/physics/atom-flux', (req, res) => {
  try {
    const { mass, agDensity, temperature } = req.body || {};
    const T = Number(temperature);
    const m = Number(mass);
    const n = Number(agDensity);
    if (![T, m, n].every(Number.isFinite)) {
      return res.status(400).json({ error: 'mass, agDensity, temperature required' });
    }
    res.json({ atomFlux: computeAtomFlux(m, n, T) });
  } catch (e) {
    res.status(400).json({ error: e.message });
  }
});

// --- Parameter sweep ---
app.get('/api/sweeps', async (_req, res) => {
  try {
    const dir = path.join(__dirname, '../data/sweeps');
    let files = [];
    try {
      files = (await fs.readdir(dir)).filter((f) => f.endsWith('.json')).sort().reverse();
    } catch {
      files = [];
    }
    res.json({ files });
  } catch (e) {
    res.status(500).json({ error: e.message });
  }
});

app.post('/api/go/sweep', async (req, res) => {
  try {
    const result = await runParameterSweep(req.body || {});
    res.json({
      success: result.successCount === result.runs.length,
      successCount: result.successCount,
      total: result.runs.length,
      manifestPath: result.manifestPath,
      runs: result.runs,
    });
  } catch (e) {
    res.status(400).json({ error: e.message });
  }
});

// Activate scheme in config.yaml (schemePath)
app.post('/api/config/scheme-path', async (req, res) => {
  try {
    const { filename } = req.body;
    const configPath = path.join(SURFACE_ATOMS_PATH, 'config.yaml');
    let text = await fs.readFile(configPath, 'utf8');
    const rel = `configs/${path.basename(filename || DEFAULT_SCHEME_FILE)}`;
    if (/^schemePath:\s*.*/m.test(text)) {
      text = text.replace(/^schemePath:\s*.*/m, `schemePath: "${rel}"`);
    } else {
      text = `schemePath: "${rel}"\n\n` + text;
    }
    await fs.writeFile(configPath, text, 'utf8');
    res.json({ schemePath: rel });
  } catch (e) {
    res.status(500).json({ error: e.message });
  }
});

// --- Go build / test / run ---
app.post('/api/go/build', async (_req, res) => {
  try {
    const result = await goBuild();
    res.json({
      success: result.code === 0,
      code: result.code,
      stdout: result.stdout,
      stderr: result.stderr,
    });
  } catch (e) {
    res.status(500).json({ error: e.message });
  }
});

app.post('/api/go/test', async (_req, res) => {
  try {
    const result = await goTest();
    res.json({
      success: result.code === 0,
      code: result.code,
      stdout: result.stdout,
      stderr: result.stderr,
    });
  } catch (e) {
    res.status(500).json({ error: e.message });
  }
});

app.post('/api/go/combine-results', async (_req, res) => {
  try {
    const result = await runResultsCombiner();
    res.json({
      success: result.code === 0,
      code: result.code,
      stdout: result.stdout,
      stderr: result.stderr,
    });
  } catch (e) {
    res.status(500).json({ error: e.message });
  }
});

app.post('/api/go/run', async (req, res) => {
  try {
    const temperature = Number(req.body.temperature ?? 300);
    const simulationTime = Number(req.body.simulationTime ?? 1e-6);
    if (!Number.isFinite(temperature) || !Number.isFinite(simulationTime)) {
      return res.status(400).json({ error: 'Invalid temperature or simulationTime' });
    }
    const result = await runSimulation(temperature, simulationTime);
    const runs = await listResultRuns();
    res.json({
      success: result.code === 0,
      code: result.code,
      stdout: result.stdout,
      stderr: result.stderr,
      latestRun: runs[0] ?? null,
    });
  } catch (e) {
    res.status(500).json({ error: e.message });
  }
});

// --- Results ---
app.get('/api/results', async (_req, res) => {
  try {
    res.json(await listResultRuns());
  } catch (e) {
    res.status(500).json({ error: e.message });
  }
});

app.get('/api/results/:runId', async (req, res) => {
  try {
    const runs = await listResultRuns();
    const run = runs.find((r) => r.id === req.params.runId);
    if (!run) return res.status(404).json({ error: 'Run not found' });
    const xlsx = await parseResultXlsx(req.params.runId);
    const charts = xlsx ? buildChartSeries(xlsx) : [];
    res.json({ ...run, xlsx, charts });
  } catch (e) {
    res.status(500).json({ error: e.message });
  }
});

/** Serve result HTML for iframe */
app.get('/api/results/:runId/html', async (req, res) => {
  try {
    const htmlPath = await getResultHtmlPath(req.params.runId);
    if (!htmlPath) return res.status(404).send('No HTML report');
    const html = await fs.readFile(htmlPath, 'utf8');
    res.type('html').send(html);
  } catch (e) {
    res.status(500).send(e.message);
  }
});

// Production: serve React build
const clientDist = path.join(__dirname, '../client/dist');
app.use(express.static(clientDist));
app.get('*', (req, res, next) => {
  if (req.path.startsWith('/api')) return next();
  res.sendFile(path.join(clientDist, 'index.html'), (err) => {
    if (err) next();
  });
});

app.listen(PORT, () => {
  console.log(`Surface Kinetics Studio: http://localhost:${PORT}`);
  console.log(`surface-atoms: ${SURFACE_ATOMS_PATH}`);
});
