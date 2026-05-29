const API = '/api';

async function request(path, options = {}) {
  const res = await fetch(`${API}${path}`, {
    headers: { 'Content-Type': 'application/json', ...options.headers },
    ...options,
  });
  const data = await res.json().catch(() => ({}));
  if (!res.ok) throw new Error(data.error || res.statusText);
  return data;
}

export const api = {
  health: () => request('/health'),
  listSchemes: () => request('/schemes'),
  getScheme: (filename) => request(`/schemes/${encodeURIComponent(filename)}`),
  saveScheme: (filename, body) =>
    request(`/schemes/${encodeURIComponent(filename)}`, {
      method: 'POST',
      body: JSON.stringify(body),
    }),
  validateScheme: (body) =>
    request('/schemes/validate', { method: 'POST', body: JSON.stringify(body) }),
  expandExpr: (expr, functions) =>
    request('/schemes/expand-expr', {
      method: 'POST',
      body: JSON.stringify({ expr, functions }),
    }),
  listFormulaPresets: (context) =>
    request(`/schemes/formula-presets${context ? `?context=${context}` : ''}`),
  emptyTemplate: () => request('/schemes/template/empty'),
  serializeScheme: (scheme) =>
    request('/schemes/serialize', { method: 'POST', body: JSON.stringify({ scheme }) }),
  setSchemePath: (filename) =>
    request('/config/scheme-path', { method: 'POST', body: JSON.stringify({ filename }) }),
  getConfig: () => request('/config'),
  saveConfig: (config) =>
    request('/config', { method: 'POST', body: JSON.stringify({ config }) }),
  saveConfigYaml: (yaml) =>
    request('/config/yaml', { method: 'POST', body: JSON.stringify({ yaml }) }),
  applyConfigPreset: (preset) =>
    request(`/config/preset/${preset}`, { method: 'POST' }),
  listDatabases: () => request('/databases'),
  getDatabase: (id) => request(`/databases/${encodeURIComponent(id)}`),
  applyDatabase: (id, body = {}) =>
    request(`/databases/${encodeURIComponent(id)}/apply`, {
      method: 'POST',
      body: JSON.stringify(body),
    }),
  atomFlux: (mass, agDensity, temperature) =>
    request('/physics/atom-flux', {
      method: 'POST',
      body: JSON.stringify({ mass, agDensity, temperature }),
    }),
  listSweeps: () => request('/sweeps'),
  goSweep: (body) =>
    request('/go/sweep', { method: 'POST', body: JSON.stringify(body) }),
  combineResults: () => request('/go/combine-results', { method: 'POST' }),
  goBuild: () => request('/go/build', { method: 'POST' }),
  goTest: () => request('/go/test', { method: 'POST' }),
  goRun: (temperature, simulationTime) =>
    request('/go/run', {
      method: 'POST',
      body: JSON.stringify({ temperature, simulationTime }),
    }),
  listResults: () => request('/results'),
  getResult: (runId) => request(`/results/${encodeURIComponent(runId)}`),
  resultHtmlUrl: (runId) => `${API}/results/${encodeURIComponent(runId)}/html`,
};
