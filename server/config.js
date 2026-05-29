import path from 'path';
import { fileURLToPath } from 'url';

const __dirname = path.dirname(fileURLToPath(import.meta.url));

/** Path to surface-atoms Go project */
export const SURFACE_ATOMS_PATH =
  process.env.SURFACE_ATOMS_PATH ||
  path.resolve(__dirname, '../../surface-atoms');

export const SCHEMES_DIR = path.join(SURFACE_ATOMS_PATH, 'configs');
export const DEFAULT_SCHEME_FILE = 'scheme_marinov.yaml';

export const PORT = Number(process.env.PORT) || 3847;
