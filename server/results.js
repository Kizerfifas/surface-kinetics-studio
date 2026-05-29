import fs from 'fs/promises';
import path from 'path';
import readXlsxFile from 'read-excel-file/node';
import { SURFACE_ATOMS_PATH } from './config.js';

/** List result directories: "result YYYY-MM-DD HH_MM_SS T300K" */
export async function listResultRuns() {
  const entries = await fs.readdir(SURFACE_ATOMS_PATH, { withFileTypes: true });
  const runs = [];
  for (const ent of entries) {
    if (!ent.isDirectory() || !ent.name.startsWith('result ')) continue;
    const dirPath = path.join(SURFACE_ATOMS_PATH, ent.name);
    const files = await fs.readdir(dirPath);
    const html = files.find((f) => f.endsWith('.html'));
    const xlsx = files.find((f) => f.endsWith('.xlsx'));
    const tempMatch = ent.name.match(/T(\d+)K/);
    runs.push({
      id: ent.name,
      name: ent.name,
      temperature: tempMatch ? Number(tempMatch[1]) : null,
      htmlFile: html || null,
      xlsxFile: xlsx || null,
      mtime: (await fs.stat(dirPath)).mtime.toISOString(),
    });
  }
  runs.sort((a, b) => (a.mtime < b.mtime ? 1 : -1));
  return runs;
}

export function resultDirPath(runId) {
  const safe = path.basename(runId);
  if (!safe.startsWith('result ')) {
    throw new Error('Invalid result run id');
  }
  return path.join(SURFACE_ATOMS_PATH, safe);
}

export async function getResultHtmlPath(runId) {
  const dir = resultDirPath(runId);
  const files = await fs.readdir(dir);
  const html = files.find((f) => f.endsWith('.html'));
  if (!html) return null;
  return path.join(dir, html);
}

export async function parseResultXlsx(runId) {
  const dir = resultDirPath(runId);
  const files = await fs.readdir(dir);
  const xlsxName = files.find((f) => f.endsWith('.xlsx'));
  if (!xlsxName) return null;

  const buf = await fs.readFile(path.join(dir, xlsxName));
  const rows = await readXlsxFile(buf);
  if (rows.length < 2) return { headers: [], data: [], sheetName: 'Sheet1' };

  const headers = rows[0].map((h) => (h == null ? '' : String(h)));
  const data = rows.slice(1).map((row) => {
    const obj = {};
    headers.forEach((h, i) => {
      const v = row[i];
      obj[h] = v === null || v === undefined ? null : v;
    });
    return obj;
  });

  return { headers, data, sheetName: 'Sheet1' };
}

const PREFERRED_CHART_KEYS = [
  'Surface coverage',
  'Density F',
  'Density S',
  'Qty atoms on surface',
  'Recomb Er',
];

/** Build chart series from xlsx for React ECharts (1- and 2-component). */
export function buildChartSeries(xlsxData) {
  if (!xlsxData?.data?.length) return [];
  const timeKey = 'Simulation time';
  const headers = xlsxData.headers.filter((h) => h !== timeKey);

  const totals = PREFERRED_CHART_KEYS.filter((k) => headers.includes(k)).map((yKey) => ({
    title: yKey,
    yKey,
  }));

  const perElement = headers
    .filter((h) => h.includes(' - '))
    .map((h) => {
      const [el, metric] = h.split(' - ', 2);
      return { title: h, yKey: h, element: el, metric };
    })
    .filter((c) =>
      ['Surface coverage', 'Density F', 'Density S', 'Qty atoms on surface'].includes(c.metric),
    );

  const series = [...totals, ...perElement];
  const seen = new Set();

  return series
    .filter((c) => {
      if (seen.has(c.yKey)) return false;
      seen.add(c.yKey);
      return true;
    })
    .map((c) => ({
      title: c.title,
      x: xlsxData.data.map((r) => Number(r[timeKey]) ?? 0),
      y: xlsxData.data.map((r) => Number(r[c.yKey]) ?? 0),
    }));
}
