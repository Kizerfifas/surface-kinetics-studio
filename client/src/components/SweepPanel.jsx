import { useEffect, useMemo, useState } from 'react';
import { Link } from 'react-router-dom';
import { api } from '../api';
import SelectWrap from './SelectWrap';

const defaultRange = { min: 300, max: 800, count: 3, scale: 'linear' };
const defaultPhi = { min: 1e14, max: 8e14, count: 3, scale: 'log' };

function RangeFields({ label, range, onChange, unit }) {
  return (
    <fieldset className="sweep-range">
      <legend>{label}</legend>
      <div className="grid-3">
        <div className="field field-compact">
          <label>min{unit ? `, ${unit}` : ''}</label>
          <input
            type="number"
            className="ui-input mono"
            value={range.min}
            onChange={(e) => onChange({ ...range, min: Number(e.target.value) })}
          />
        </div>
        <div className="field field-compact">
          <label>max</label>
          <input
            type="number"
            className="ui-input mono"
            value={range.max}
            onChange={(e) => onChange({ ...range, max: Number(e.target.value) })}
          />
        </div>
        <div className="field field-compact">
          <label>точек</label>
          <input
            type="number"
            className="ui-input mono"
            min={1}
            max={12}
            value={range.count}
            onChange={(e) => onChange({ ...range, count: Number(e.target.value) })}
          />
        </div>
        <div className="field field-compact">
          <label>шкала</label>
          <SelectWrap>
            <select
              className="ui-select"
              value={range.scale}
              onChange={(e) => onChange({ ...range, scale: e.target.value })}
            >
              <option value="linear">linear</option>
              <option value="log">log</option>
            </select>
          </SelectWrap>
        </div>
      </div>
    </fieldset>
  );
}

export default function SweepPanel({ elements, simulationTime, onLog, onDone }) {
  const [enabled, setEnabled] = useState(false);
  const [elementName, setElementName] = useState('N');
  const [temperatures, setTemperatures] = useState(defaultRange);
  const [agDensities, setAgDensities] = useState(defaultPhi);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState(null);
  const [lastManifest, setLastManifest] = useState(null);

  useEffect(() => {
    if (elements?.length) setElementName(elements[0].name);
  }, [elements]);

  const gridSize = useMemo(
    () => (enabled ? temperatures.count * agDensities.count : 0),
    [enabled, temperatures.count, agDensities.count],
  );

  const el = elements?.find((e) => e.name === elementName);

  const previewFlux = useMemo(() => {
    if (!el) return null;
    const Tmid = (temperatures.min + temperatures.max) / 2;
    const nMid = Math.sqrt(agDensities.min * agDensities.max);
    return { T: Tmid, n: nMid };
  }, [el, temperatures, agDensities]);

  const [fluxMid, setFluxMid] = useState(null);
  useEffect(() => {
    if (!previewFlux || !el) return;
    api
      .atomFlux(el.mass, previewFlux.n, previewFlux.T)
      .then((r) => setFluxMid(r.atomFlux))
      .catch(() => setFluxMid(null));
  }, [el, previewFlux]);

  const handleSweep = async () => {
    setBusy(true);
    setError(null);
    const t = parseFloat(String(simulationTime).replace(/_/g, ''));
    if (!Number.isFinite(t)) {
      setError('Некорректное время симуляции');
      setBusy(false);
      return;
    }
    try {
      onLog?.(`=== Пакетный sweep: ${gridSize} прогонов ===\n`);
      const r = await api.goSweep({
        elementName,
        simulationTime: t,
        temperatures,
        agDensities,
        restoreConfig: true,
      });
      setLastManifest(r);
      onLog?.(
        `Sweep завершён: ${r.successCount}/${r.total} успешно\nmanifest: ${r.manifestPath}\n`,
      );
      onDone?.(r);
      if (r.successCount < r.total) setError('Часть прогонов завершилась с ошибкой');
    } catch (e) {
      setError(e.message);
      onLog?.(`Sweep error: ${e.message}\n`);
    } finally {
      setBusy(false);
    }
  };

  return (
    <section className="card sweep-card">
      <div className="section-head">
        <h3>Пакетный sweep T × Φ</h3>
        <label className="checkbox-row">
          <input type="checkbox" checked={enabled} onChange={(e) => setEnabled(e.target.checked)} />
          Включить сетку прогонов
        </label>
      </div>

      <p className="hint">
        Φ (поток атомов) задаётся через <code>agDensity</code> в config: Φ = ¼·v(T)·n<sub>g</sub>.
        Для каждой пары (T, n<sub>g</sub>) временно перезаписывается config, затем восстанавливается.
        Максимум 36 точек сетки.
      </p>

      {enabled && (
        <>
          <div className="field">
            <label>Элемент (чей agDensity меняется)</label>
            <SelectWrap>
              <select
                className="ui-select"
                value={elementName}
                onChange={(e) => setElementName(e.target.value)}
              >
                {(elements || []).map((e) => (
                  <option key={e.name} value={e.name}>
                    {e.name} (mass={e.mass})
                  </option>
                ))}
              </select>
            </SelectWrap>
          </div>

          <RangeFields
            label="Температура T"
            unit="K"
            range={temperatures}
            onChange={setTemperatures}
          />
          <RangeFields
            label="Концентрация в газе n_g (agDensity)"
            unit="см⁻³"
            range={agDensities}
            onChange={setAgDensities}
          />

          <p className="hint">
            Сетка: <strong>{gridSize}</strong> прогонов
            {fluxMid != null && previewFlux && (
              <>
                {' '}
                · пример Φ при T≈{Math.round(previewFlux.T)} K, n≈{previewFlux.n.toExponential(1)}:{' '}
                <code>{fluxMid.toExponential(3)}</code> (атом/(см²·с))
              </>
            )}
          </p>

          {error && <div className="alert alert-error">{error}</div>}

          <button
            type="button"
            className="btn btn-primary"
            onClick={handleSweep}
            disabled={busy || gridSize < 1}
          >
            {busy ? `Прогон ${gridSize} точек…` : `Запустить sweep (${gridSize})`}
          </button>

          {lastManifest?.runs?.length > 0 && (
            <div className="sweep-table-wrap">
              <table className="sweep-table">
                <thead>
                  <tr>
                    <th>#</th>
                    <th>T, K</th>
                    <th>agDensity</th>
                    <th>Φ</th>
                    <th>Статус</th>
                    <th>Результат</th>
                  </tr>
                </thead>
                <tbody>
                  {lastManifest.runs.map((row) => (
                    <tr key={row.step} className={row.success ? '' : 'sweep-fail'}>
                      <td>{row.step}</td>
                      <td>{row.temperature}</td>
                      <td className="mono">{row.agDensity.toExponential(2)}</td>
                      <td className="mono">{row.atomFlux?.toExponential(2)}</td>
                      <td>{row.success ? 'OK' : `exit ${row.code}`}</td>
                      <td>
                        {row.latestRun ? (
                          <Link to={`/results/${encodeURIComponent(row.latestRun.id)}`}>
                            {row.latestRun.name}
                          </Link>
                        ) : (
                          '—'
                        )}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </>
      )}
    </section>
  );
}
