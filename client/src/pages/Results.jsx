import { useEffect, useState } from 'react';
import { useParams, Link } from 'react-router-dom';
import ReactECharts from 'echarts-for-react';
import { api } from '../api';

function ChartBlock({ chart }) {
  const option = {
    title: { text: chart.title, left: 'center', textStyle: { color: '#e8edf4', fontSize: 14 } },
    grid: { left: 56, right: 24, top: 48, bottom: 40 },
    tooltip: { trigger: 'axis' },
    xAxis: {
      type: 'value',
      name: 'Simulation time',
      nameTextStyle: { color: '#8b9cb3' },
      axisLine: { lineStyle: { color: '#2d3a4f' } },
      axisLabel: { color: '#8b9cb3' },
    },
    yAxis: {
      type: 'value',
      name: chart.title,
      scale: true,
      nameTextStyle: { color: '#8b9cb3' },
      axisLine: { lineStyle: { color: '#2d3a4f' } },
      axisLabel: { color: '#8b9cb3' },
      splitLine: { lineStyle: { color: '#2d3a4f' } },
    },
    series: [
      {
        type: 'line',
        smooth: true,
        data: chart.x.map((x, i) => [x, chart.y[i]]),
        lineStyle: { color: '#3d9cf5', width: 2 },
        itemStyle: { color: '#3d9cf5' },
        showSymbol: false,
      },
    ],
    backgroundColor: 'transparent',
  };
  return (
    <div className="card chart-card">
      <ReactECharts option={option} style={{ height: 320 }} opts={{ renderer: 'canvas' }} />
    </div>
  );
}

export default function Results() {
  const { runId } = useParams();
  const [runs, setRuns] = useState([]);
  const [detail, setDetail] = useState(null);
  const [error, setError] = useState(null);
  const [loading, setLoading] = useState(false);
  const [combining, setCombining] = useState(false);
  const [combineLog, setCombineLog] = useState(null);

  useEffect(() => {
    api.listResults().then(setRuns).catch((e) => setError(e.message));
  }, []);

  useEffect(() => {
    if (!runId) {
      setDetail(null);
      return;
    }
    setLoading(true);
    setError(null);
    api
      .getResult(runId)
      .then(setDetail)
      .catch((e) => setError(e.message))
      .finally(() => setLoading(false));
  }, [runId]);

  return (
    <>
      <h1 className="page-title">Результаты</h1>
      <p className="page-desc">
        Каталоги <code>result … T*K</code> в surface-atoms с HTML-графиками и Excel. При двух
        компонентах в таблице есть суммарные колонки и «N - …», «O - …».
      </p>

      <div className="card">
        <button
          type="button"
          className="btn"
          disabled={combining}
          onClick={async () => {
            setCombining(true);
            setCombineLog(null);
            try {
              const r = await api.combineResults();
              setCombineLog(
                (r.success ? 'OK' : 'Ошибка') +
                  `\n${r.stdout || ''}\n${r.stderr || ''}`,
              );
            } catch (e) {
              setCombineLog(e.message);
            } finally {
              setCombining(false);
            }
          }}
        >
          {combining ? 'Объединение…' : 'Объединить HTML-графики (results_combiner)'}
        </button>
        {combineLog && <pre className="log-box" style={{ marginTop: '0.5rem' }}>{combineLog}</pre>}
      </div>

      {error && <div className="alert alert-error">{error}</div>}

      <div className="grid-2">
        <div className="card">
          <h3>Прогоны</h3>
          {runs.length === 0 ? (
            <p style={{ color: 'var(--text-muted)' }}>Пока нет результатов. Запустите симуляцию.</p>
          ) : (
            <ul className="run-list">
              {runs.map((r) => (
                <li key={r.id}>
                  <Link
                    to={`/results/${encodeURIComponent(r.id)}`}
                    className={runId === r.id ? 'active' : ''}
                  >
                    <span className="run-name">{r.name}</span>
                    {r.temperature != null && (
                      <span className="run-meta">{r.temperature} K</span>
                    )}
                  </Link>
                </li>
              ))}
            </ul>
          )}
        </div>

        <div className="card">
          <h3>Детали</h3>
          {!runId && <p style={{ color: 'var(--text-muted)' }}>Выберите прогон слева.</p>}
          {loading && <p>Загрузка…</p>}
          {detail && (
            <>
              <p>
                <strong>{detail.name}</strong>
                {detail.htmlFile && (
                  <>
                    {' · '}
                    <a href={api.resultHtmlUrl(detail.id)} target="_blank" rel="noreferrer">
                      Открыть HTML в новой вкладке
                    </a>
                  </>
                )}
              </p>
            </>
          )}
        </div>
      </div>

      {detail?.charts?.length > 0 && (
        <section style={{ marginTop: '1rem' }}>
          <h2 style={{ fontSize: '1.1rem', marginBottom: '1rem' }}>Графики (из Excel)</h2>
          <div className="charts-grid">
            {detail.charts.map((c) => (
              <ChartBlock key={c.title} chart={c} />
            ))}
          </div>
        </section>
      )}

      {detail?.htmlFile && (
        <section className="card" style={{ marginTop: '1rem' }}>
          <h3>Отчёт Go (ECharts)</h3>
          <iframe
            title="Simulation HTML report"
            src={api.resultHtmlUrl(detail.id)}
            className="result-iframe"
          />
        </section>
      )}

      {detail?.xlsx?.data?.length > 0 && (
        <section className="card" style={{ marginTop: '1rem' }}>
          <h3>Таблица Excel</h3>
          <div className="table-wrap">
            <table className="data">
              <thead>
                <tr>
                  {detail.xlsx.headers.map((h) => (
                    <th key={h}>{h}</th>
                  ))}
                </tr>
              </thead>
              <tbody>
                {detail.xlsx.data.slice(0, 200).map((row, i) => (
                  <tr key={i}>
                    {detail.xlsx.headers.map((h) => (
                      <td key={h}>{row[h] != null ? String(row[h]) : '—'}</td>
                    ))}
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
          {detail.xlsx.data.length > 200 && (
            <p style={{ color: 'var(--text-muted)', fontSize: '0.85rem' }}>
              Показаны первые 200 строк из {detail.xlsx.data.length}.
            </p>
          )}
        </section>
      )}
    </>
  );
}
