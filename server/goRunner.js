import { spawn } from 'child_process';
import path from 'path';
import { SURFACE_ATOMS_PATH } from './config.js';

/**
 * Run a command in surface-atoms directory.
 * @returns {Promise<{ stdout: string, stderr: string, code: number }>}
 */
export function runInSurfaceAtoms(args, options = {}) {
  const { timeoutMs = 600_000 } = options;
  return new Promise((resolve, reject) => {
    const proc = spawn(args[0], args.slice(1), {
      cwd: SURFACE_ATOMS_PATH,
      env: { ...process.env, PATH: process.env.PATH },
      shell: false,
    });
    let stdout = '';
    let stderr = '';
    const timer = setTimeout(() => {
      proc.kill('SIGTERM');
      reject(new Error(`Command timed out after ${timeoutMs}ms`));
    }, timeoutMs);

    proc.stdout.on('data', (d) => { stdout += d.toString(); });
    proc.stderr.on('data', (d) => { stderr += d.toString(); });
    proc.on('error', (err) => {
      clearTimeout(timer);
      reject(err);
    });
    proc.on('close', (code) => {
      clearTimeout(timer);
      resolve({ stdout, stderr, code: code ?? 1 });
    });
  });
}

export async function goBuild() {
  return runInSurfaceAtoms(['go', 'build', '-o', 'surface-atoms', '.'], { timeoutMs: 120_000 });
}

export async function goTest() {
  return runInSurfaceAtoms(['go', 'test', './internal/scheme/...', './internal/simulator/...'], {
    timeoutMs: 120_000,
  });
}

/** Run simulation: go run . <temperature> <simulationTime> */
export async function runSimulation(temperature, simulationTime) {
  const timeStr = String(simulationTime);
  return runInSurfaceAtoms(['go', 'run', '.', String(temperature), timeStr], {
    timeoutMs: 600_000,
  });
}

/** Merge HTML charts from multiple result folders (two-component runs). */
export async function runResultsCombiner() {
  return runInSurfaceAtoms(['go', 'run', './scripts/results_combiner/main.go'], {
    timeoutMs: 120_000,
  });
}
