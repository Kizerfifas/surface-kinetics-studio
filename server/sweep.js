import fs from 'fs/promises';
import path from 'path';
import { fileURLToPath } from 'url';
import { readSimConfig, writeSimConfig } from './simConfig.js';
import { runSimulation } from './goRunner.js';
import { listResultRuns } from './results.js';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const SWEEPS_DIR = path.join(__dirname, '../data/sweeps');

const MAX_SWEEP_POINTS = 36;

/** Thermal atom flux Φ = 0.25·v·n_g (same as surface-atoms calculateAtomFlux). */
export function computeAtomFlux(mass, agDensity, temperatureK) {
  const atomMass = 1.66035e-27;
  const v =
    Math.sqrt((8 * 1.38e-23 * temperatureK) / (Math.PI * mass * atomMass)) * 100;
  return 0.25 * v * agDensity;
}

export function linspace(min, max, count) {
  const n = Math.max(1, Math.floor(count));
  if (n === 1) return [min];
  const out = [];
  for (let i = 0; i < n; i++) {
    out.push(min + ((max - min) * i) / (n - 1));
  }
  return out;
}

export function logspace(min, max, count) {
  if (min <= 0 || max <= 0) throw new Error('logspace requires positive min and max');
  return linspace(Math.log10(min), Math.log10(max), count).map((x) => 10 ** x);
}

/**
 * @param {{ min, max, count, scale?: 'linear'|'log' }} spec
 * @returns {number[]}
 */
export function rangeFromSpec(spec) {
  if (Array.isArray(spec?.values) && spec.values.length) {
    return spec.values.map(Number).filter((x) => Number.isFinite(x));
  }
  const { min, max, count = 5, scale = 'linear' } = spec || {};
  if (!Number.isFinite(min) || !Number.isFinite(max)) {
    throw new Error('Range requires min and max (or explicit values[])');
  }
  return scale === 'log' ? logspace(min, max, count) : linspace(min, max, count);
}

function roundT(t) {
  return Math.round(t);
}

function setElementAgDensity(config, elementName, agDensity) {
  const elements = config.elements.map((el) =>
    el.name === elementName ? { ...el, agDensity } : el,
  );
  const found = elements.some((el) => el.name === elementName);
  if (!found) throw new Error(`Element not found in config: ${elementName}`);
  return { ...config, elements };
}

/**
 * Run grid over T and agDensity (Φ via thermal flux formula).
 */
export async function runParameterSweep({
  temperatures,
  agDensities,
  elementName,
  simulationTime,
  restoreConfig = true,
}) {
  const Tvals = rangeFromSpec(temperatures);
  const PhiVals = rangeFromSpec(agDensities);
  const total = Tvals.length * PhiVals.length;
  if (total > MAX_SWEEP_POINTS) {
    throw new Error(
      `Слишком много точек (${total}). Максимум ${MAX_SWEEP_POINTS}. Уменьшите count.`,
    );
  }
  if (!elementName) throw new Error('elementName required (e.g. N)');

  const { config: originalConfig } = await readSimConfig();
  const el = originalConfig.elements.find((e) => e.name === elementName);
  if (!el) throw new Error(`Element "${elementName}" not in config.yaml`);

  const time = Number(simulationTime);
  if (!Number.isFinite(time) || time <= 0) throw new Error('Invalid simulationTime');

  const runs = [];
  let step = 0;

  try {
    for (const T of Tvals) {
      for (const agDensity of PhiVals) {
        step += 1;
        const patched = setElementAgDensity(originalConfig, elementName, agDensity);
        await writeSimConfig(patched);

        const atomFlux = computeAtomFlux(el.mass, agDensity, T);
        const result = await runSimulation(roundT(T), time);
        const listed = await listResultRuns();
        const latestRun = listed[0] ?? null;

        runs.push({
          step,
          total,
          temperature: roundT(T),
          agDensity,
          atomFlux,
          success: result.code === 0,
          code: result.code,
          latestRun,
          stderr: result.stderr?.slice(-500) || '',
        });
      }
    }
  } finally {
    if (restoreConfig) {
      await writeSimConfig(originalConfig);
    }
  }

  await fs.mkdir(SWEEPS_DIR, { recursive: true });
  const stamp = new Date().toISOString().replace(/[:.]/g, '-');
  const manifestPath = path.join(SWEEPS_DIR, `sweep_${stamp}.json`);
  const manifest = {
    createdAt: new Date().toISOString(),
    elementName,
    simulationTime: time,
    temperatures: Tvals,
    agDensities: PhiVals,
    restoreConfig,
    runs,
  };
  await fs.writeFile(manifestPath, JSON.stringify(manifest, null, 2), 'utf8');

  return { manifest, manifestPath, runs, successCount: runs.filter((r) => r.success).length };
}
