import { useCallback, useEffect, useState } from 'react';
import { Link } from 'react-router-dom';
import { api } from '../api';
import ExpressionField from '../components/ExpressionField';

const EVENT_TYPES = [
  'adsorption_F',
  'adsorption_S',
  'desorption_F',
  'recomb_ER',
  'diffusion',
];

function SchemeForm({ scheme, onChange }) {
  const updateRates = (idx, field, value) => {
    const rates = [...(scheme.rates || [])];
    rates[idx] = { ...rates[idx], [field]: value };
    onChange({ ...scheme, rates });
  };
  const addRate = () => {
    const n = (scheme.rates?.length || 0) + 1;
    onChange({
      ...scheme,
      rates: [...(scheme.rates || []), { id: `r${n}`, expr: '' }],
    });
  };
  const removeRate = (idx) => {
    onChange({ ...scheme, rates: scheme.rates.filter((_, i) => i !== idx) });
  };

  const updateProbs = (idx, field, value) => {
    const probabilities = [...(scheme.probabilities || [])];
    probabilities[idx] = { ...probabilities[idx], [field]: value };
    onChange({ ...scheme, probabilities });
  };
  const addProb = () => {
    onChange({
      ...scheme,
      probabilities: [...(scheme.probabilities || []), { id: 'recomb_S', expr: '' }],
    });
  };
  const removeProb = (idx) => {
    onChange({ ...scheme, probabilities: scheme.probabilities.filter((_, i) => i !== idx) });
  };

  const updateEvents = (idx, field, value) => {
    const events = [...(scheme.events || [])];
    events[idx] = { ...events[idx], [field]: value };
    onChange({ ...scheme, events });
  };
  const addEvent = () => {
    onChange({
      ...scheme,
      events: [...(scheme.events || []), { event_type: 'adsorption_F', rate_id: 'r1' }],
    });
  };
  const removeEvent = (idx) => {
    onChange({ ...scheme, events: scheme.events.filter((_, i) => i !== idx) });
  };

  const rateIds = (scheme.rates || []).map((r) => r.id).filter(Boolean);

  return (
    <div className="scheme-form">
      <section className="card">
        <h3>Скорости (rates)</h3>
        {(scheme.rates || []).map((r, i) => (
          <div key={i} className="expr-row-block">
            <div className="scheme-row expr-row-head">
              <input
                className="ui-input mono"
                value={r.id}
                onChange={(e) => updateRates(i, 'id', e.target.value)}
                placeholder="id"
                style={{ width: '4rem' }}
              />
              <button type="button" className="btn" onClick={() => removeRate(i)} title="Удалить">
                ×
              </button>
            </div>
            <ExpressionField
              value={r.expr || ''}
              onChange={(expr) => updateRates(i, 'expr', expr)}
              context="rate"
              rateIds={rateIds.slice(0, i)}
              placeholder="например atomFlux / (F_density + S_density)"
            />
          </div>
        ))}
        <button type="button" className="btn" onClick={addRate}>
          + Скорость
        </button>
      </section>

      <section className="card">
        <h3>Вероятности (probabilities)</h3>
        {(scheme.probabilities || []).map((p, i) => (
          <div key={i} className="expr-row-block">
            <div className="scheme-row expr-row-head">
              <input
                className="ui-input mono"
                value={p.id}
                onChange={(e) => updateProbs(i, 'id', e.target.value)}
                style={{ width: '6rem' }}
              />
              <button type="button" className="btn" onClick={() => removeProb(i)}>
                ×
              </button>
            </div>
            <ExpressionField
              value={p.expr || ''}
              onChange={(expr) => updateProbs(i, 'expr', expr)}
              context="probability"
              rateIds={rateIds}
              placeholder="например exp(-Er / (8.31 * T))"
            />
          </div>
        ))}
        <button type="button" className="btn" onClick={addProb}>
          + Вероятность
        </button>
      </section>

      <section className="card">
        <h3>События BKL (events)</h3>
        <p className="hint" style={{ marginTop: 0 }}>
          <code>lambda_expr</code> — формула λ BKL. Пусто — значение по умолчанию для{' '}
          <code>event_type</code>.
        </p>
        {(scheme.events || []).map((e, i) => (
          <div key={i} className="event-block">
            <div className="scheme-row">
              <select
                className="ui-select"
                value={e.event_type}
                onChange={(ev) => updateEvents(i, 'event_type', ev.target.value)}
              >
                {EVENT_TYPES.map((t) => (
                  <option key={t} value={t}>
                    {t}
                  </option>
                ))}
              </select>
              <select
                className="ui-select"
                value={e.rate_id}
                onChange={(ev) => updateEvents(i, 'rate_id', ev.target.value)}
              >
                {rateIds.map((id) => (
                  <option key={id} value={id}>
                    {id}
                  </option>
                ))}
              </select>
              <button type="button" className="btn" onClick={() => removeEvent(i)}>
                ×
              </button>
            </div>
            <ExpressionField
              value={e.lambda_expr || ''}
              onChange={(expr) => updateEvents(i, 'lambda_expr', expr)}
              context="lambda"
              rateIds={rateIds}
              placeholder="например free_F_sites * r1"
              rows={1}
            />
          </div>
        ))}
        <button type="button" className="btn" onClick={addEvent}>
          + Событие
        </button>
      </section>
    </div>
  );
}

export default function SchemeEditor() {
  const [files, setFiles] = useState([]);
  const [filename, setFilename] = useState('scheme_marinov.yaml');
  const [scheme, setScheme] = useState({ rates: [], probabilities: [], events: [] });
  const [yamlText, setYamlText] = useState('');
  const [tab, setTab] = useState('form');
  const [message, setMessage] = useState(null);
  const [error, setError] = useState(null);
  const [loading, setLoading] = useState(false);

  const loadList = useCallback(async () => {
    const { files: f } = await api.listSchemes();
    setFiles(f);
  }, []);

  const loadScheme = useCallback(async (name) => {
    setLoading(true);
    setError(null);
    try {
      const data = await api.getScheme(name);
      setFilename(data.filename);
      setScheme(data.scheme);
      setYamlText(data.text);
    } catch (e) {
      setError(e.message);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    loadList();
    loadScheme('scheme_marinov.yaml');
  }, [loadList, loadScheme]);

  const saveFromForm = async () => {
    setError(null);
    setMessage(null);
    try {
      await api.validateScheme({ scheme });
      const { text } = await api.saveScheme(filename, { scheme });
      setYamlText(text);
      setMessage(`Схема сохранена: configs/${filename}`);
    } catch (e) {
      setError(e.message);
    }
  };

  const saveFromYaml = async () => {
    setError(null);
    setMessage(null);
    try {
      await api.validateScheme({ yaml: yamlText });
      const { text, scheme: s } = await api.saveScheme(filename, { yaml: yamlText });
      setYamlText(text);
      if (s) setScheme(s);
      setMessage(`YAML сохранён: configs/${filename}`);
    } catch (e) {
      setError(e.message);
    }
  };

  const activateInConfig = async () => {
    setError(null);
    try {
      const { schemePath } = await api.setSchemePath(filename);
      setMessage(`В config.yaml установлено: ${schemePath}`);
    } catch (e) {
      setError(e.message);
    }
  };

  const showYamlFromForm = async () => {
    try {
      const { yaml } = await api.serializeScheme(scheme);
      setYamlText(yaml);
      setTab('yaml');
    } catch (e) {
      setError(e.message);
    }
  };

  return (
    <>
      <h1 className="page-title">Редактор схемы</h1>
      <p className="page-desc">
        Кинетическая схема для surface-atoms. Сохраняется в{' '}
        <code>surface-atoms/configs/</code>. Одна схема для всех элементов из{' '}
        <Link to="/config">config.yaml</Link> — в формулах подставляются Edes, Er, agDensity, T.
        В полях выражений: автодополнение, шаблоны Marinov, кнопки <code>exp</code> и операторов.
      </p>

      {error && <div className="alert alert-error">{error}</div>}
      {message && <div className="alert alert-success">{message}</div>}

      <div className="card">
        <div className="field" style={{ maxWidth: 320 }}>
          <label>Файл схемы</label>
          <select
            className="ui-select"
            value={filename}
            onChange={(e) => {
              setFilename(e.target.value);
              loadScheme(e.target.value);
            }}
            disabled={loading}
          >
            {files.map((f) => (
              <option key={f} value={f}>
                {f}
              </option>
            ))}
          </select>
        </div>
        <div className="btn-row">
          <button type="button" className="btn btn-primary" onClick={saveFromForm}>
            Сохранить (форма)
          </button>
          <button type="button" className="btn btn-primary" onClick={saveFromYaml}>
            Сохранить (YAML)
          </button>
          <button type="button" className="btn" onClick={activateInConfig}>
            Подключить в config.yaml
          </button>
        </div>
      </div>

      <div className="tabs">
        <button type="button" className={tab === 'form' ? 'active' : ''} onClick={() => setTab('form')}>
          Форма
        </button>
        <button type="button" className={tab === 'yaml' ? 'active' : ''} onClick={() => setTab('yaml')}>
          YAML
        </button>
        {tab === 'form' && (
          <button type="button" className="btn" onClick={showYamlFromForm} style={{ marginLeft: 'auto' }}>
            Показать YAML из формы
          </button>
        )}
      </div>

      {tab === 'form' ? (
        <SchemeForm scheme={scheme} onChange={setScheme} />
      ) : (
        <div className="card">
          <div className="field">
            <label>scheme_marinov.yaml</label>
            <textarea
              className="ui-textarea mono"
              value={yamlText}
              onChange={(e) => setYamlText(e.target.value)}
              spellCheck={false}
            />
          </div>
        </div>
      )}
    </>
  );
}
