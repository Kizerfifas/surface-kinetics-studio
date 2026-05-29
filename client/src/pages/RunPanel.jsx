import { useEffect, useState } from 'react';
import { Link } from 'react-router-dom';
import { api } from '../api';

function configSummary(config) {
  if (!config) return null;
  const names = (config.elements || []).map((e) => e.name).join(' + ');
  const n = config.elements?.length || 0;
  const qs = config.simulating?.stopOnQuasiSteady ? 'вкл' : 'выкл';
  const scheme = config.schemePath || 'legacy Fill()';
  return { names, n, qs, scheme };
}

export default function RunPanel() {
  const [health, setHealth] = useState(null);
  const [simConfig, setSimConfig] = useState(null);
  const [temperature, setTemperature] = useState(300);
  const [simulationTime, setSimulationTime] = useState('1e-6');
  const [busy, setBusy] = useState(null);
  const [log, setLog] = useState('');
  const [lastRun, setLastRun] = useState(null);
  const [error, setError] = useState(null);

  useEffect(() => {
    Promise.all([api.health(), api.getConfig()])
      .then(([h, cfg]) => {
        setHealth(h);
        setSimConfig(cfg.config);
      })
      .catch((e) => setError(e.message));
  }, []);

  const appendLog = (label, result) => {
    const block = `=== ${label} (exit ${result.code}) ===\n${result.stdout || ''}\n${result.stderr || ''}\n`;
    setLog((prev) => prev + block);
    return result;
  };

  const handleBuild = async () => {
    setBusy('build');
    setError(null);
    try {
      const r = await api.goBuild();
      appendLog('go build', r);
      if (!r.success) setError('Сборка завершилась с ошибкой');
    } catch (e) {
      setError(e.message);
    } finally {
      setBusy(null);
    }
  };

  const handleTest = async () => {
    setBusy('test');
    setError(null);
    try {
      const r = await api.goTest();
      appendLog('go test', r);
      if (!r.success) setError('Тесты не прошли');
    } catch (e) {
      setError(e.message);
    } finally {
      setBusy(null);
    }
  };

  const handleRun = async () => {
    setBusy('run');
    setError(null);
    const t = parseFloat(String(simulationTime).replace(/_/g, ''));
    if (!Number.isFinite(t)) {
      setError('Некорректное время симуляции');
      setBusy(null);
      return;
    }
    try {
      const r = await api.goRun(temperature, t);
      appendLog('go run', r);
      if (r.latestRun) setLastRun(r.latestRun);
      if (!r.success) setError('Симуляция завершилась с ошибкой');
    } catch (e) {
      setError(e.message);
    } finally {
      setBusy(null);
    }
  };

  return (
    <>
      <h1 className="page-title">Запуск симуляции</h1>
      <p className="page-desc">
        Сборка и тесты Go-проекта surface-atoms, затем KMC-симуляция. Рабочая директория:{' '}
        <code className="mono">{health?.surfaceAtomsPath || '…'}</code>
        {' · '}
        <Link to="/config">Настроить config.yaml →</Link>
      </p>

      {simConfig && (
        <div className="card config-summary">
          <strong>Текущая конфигурация</strong>
          <ul>
            <li>
              Компоненты:{' '}
              {configSummary(simConfig).n === 1
                ? simConfig.elements[0].name
                : `${configSummary(simConfig).names} (${configSummary(simConfig).n} шт., в Excel — колонки по элементам)`}
            </li>
            <li>
              Схема: <code>{configSummary(simConfig).scheme}</code>
            </li>
            <li>Квази-стационар: {configSummary(simConfig).qs}</li>
          </ul>
        </div>
      )}

      {error && <div className="alert alert-error">{error}</div>}
      {lastRun && (
        <div className="alert alert-success">
          Последний прогон: <strong>{lastRun.name}</strong>{' '}
          <Link to={`/results/${encodeURIComponent(lastRun.id)}`}>Открыть результаты →</Link>
        </div>
      )}

      <div className="grid-2">
        <div className="card">
          <h3>Параметры</h3>
          <div className="field">
            <label>Температура, K</label>
            <input
              type="number"
              className="ui-input"
              value={temperature}
              onChange={(e) => setTemperature(Number(e.target.value))}
            />
          </div>
          <div className="field">
            <label>Время симуляции, с (например 1e-6)</label>
            <input
              value={simulationTime}
              onChange={(e) => setSimulationTime(e.target.value)}
              className="ui-input mono"
            />
          </div>
          <div className="btn-row">
            <button type="button" className="btn" onClick={handleBuild} disabled={!!busy}>
              {busy === 'build' ? 'Сборка…' : 'go build'}
            </button>
            <button type="button" className="btn" onClick={handleTest} disabled={!!busy}>
              {busy === 'test' ? 'Тесты…' : 'go test'}
            </button>
            <button
              type="button"
              className="btn btn-primary"
              onClick={handleRun}
              disabled={!!busy}
            >
              {busy === 'run' ? 'Симуляция…' : 'Запустить симуляцию'}
            </button>
          </div>
        </div>

        <div className="card">
          <h3>Лог</h3>
          <button type="button" className="btn" onClick={() => setLog('')} style={{ marginBottom: '0.5rem' }}>
            Очистить
          </button>
          <div className="log-box">{log || 'Вывод команд появится здесь…'}</div>
        </div>
      </div>
    </>
  );
}
