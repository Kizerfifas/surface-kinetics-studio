import { useCallback, useEffect, useState } from 'react';
import { api } from '../api';
import SelectWrap from '../components/SelectWrap';
import DatabasePanel from '../components/DatabasePanel';

const CHECK_PARAM_NAMES = ['densityF', 'densityS', 'density', 'atomsOnSurface'];

const EMPTY_ELEMENT = {
  name: 'X',
  mass: 14,
  edes: 50000,
  edif: 25000,
  vdes: 1e15,
  vdif: 1e13,
  er: 14000,
  erlh: 0,
  agDensity: 8e14,
  sort: 1,
};

function NumInput({ label, value, onChange, step = 'any' }) {
  return (
    <div className="field field-compact">
      <label>{label}</label>
      <input
        type="number"
        step={step}
        value={value ?? ''}
        onChange={(e) => onChange(e.target.value === '' ? '' : Number(e.target.value))}
        className="ui-input mono"
      />
    </div>
  );
}

function ElementsSection({ elements, onChange }) {
  const updateEl = (idx, field, val) => {
    const next = elements.map((el, i) => (i === idx ? { ...el, [field]: val } : el));
    onChange(next);
  };

  const addElement = () => {
    const n = elements.length + 1;
    onChange([
      ...elements,
      {
        ...EMPTY_ELEMENT,
        name: `E${n}`,
        sort: n,
        agDensity: 1e14,
      },
    ]);
  };

  const removeElement = (idx) => {
    if (elements.length <= 1) return;
    const next = elements.filter((_, i) => i !== idx).map((el, i) => ({ ...el, sort: i + 1 }));
    onChange(next);
  };

  return (
    <section className="card">
      <div className="section-head">
        <h3>Элементы поверхности</h3>
        <span className="badge">
          {elements.length === 1
            ? '1 компонент'
            : `${elements.length} компонента · объединённый: ${elements.map((e) => e.name).join('+')}`}
        </span>
      </div>
      <p className="hint">
        Одна кинетическая схема (rates) применяется к каждому элементу; в формулах подставляются Edes,
        Edif, Er, Erlh, agDensity и T этого элемента. При двух и более элементах симулятор пишет
        колонки «N - …», «O - …» и суммарный «N+O - Formed count».
      </p>

      {elements.map((el, idx) => (
        <div key={idx} className="element-card">
          <div className="element-card-head">
            <strong>{el.name || `Элемент ${idx + 1}`}</strong>
            <span className="run-meta">sort: {el.sort ?? idx + 1}</span>
            {elements.length > 1 && (
              <button type="button" className="btn" onClick={() => removeElement(idx)}>
                Удалить
              </button>
            )}
          </div>
          <div className="grid-3">
            <div className="field field-compact">
              <label>Имя</label>
              <input
                className="ui-input"
                value={el.name}
                onChange={(e) => updateEl(idx, 'name', e.target.value)}
              />
            </div>
            <NumInput label="sort" value={el.sort} onChange={(v) => updateEl(idx, 'sort', v)} step="1" />
            <NumInput label="mass" value={el.mass} onChange={(v) => updateEl(idx, 'mass', v)} />
            <NumInput label="edes" value={el.edes} onChange={(v) => updateEl(idx, 'edes', v)} />
            <NumInput label="edif" value={el.edif} onChange={(v) => updateEl(idx, 'edif', v)} />
            <NumInput label="vdes" value={el.vdes} onChange={(v) => updateEl(idx, 'vdes', v)} />
            <NumInput label="vdif" value={el.vdif} onChange={(v) => updateEl(idx, 'vdif', v)} />
            <NumInput label="er" value={el.er} onChange={(v) => updateEl(idx, 'er', v)} />
            <NumInput label="erlh" value={el.erlh} onChange={(v) => updateEl(idx, 'erlh', v)} />
            <NumInput
              label="agDensity"
              value={el.agDensity}
              onChange={(v) => updateEl(idx, 'agDensity', v)}
            />
          </div>
        </div>
      ))}

      <button type="button" className="btn" onClick={addElement}>
        + Элемент
      </button>
    </section>
  );
}

function QuasiSteadySection({ simulating, onSimulatingChange }) {
  const params = simulating.checkParameters || [];

  const setSim = (patch) => onSimulatingChange({ ...simulating, ...patch });

  const updateParam = (idx, field, value) => {
    const checkParameters = params.map((p, i) => (i === idx ? { ...p, [field]: value } : p));
    setSim({ checkParameters });
  };

  const addParam = () => {
    setSim({
      checkParameters: [
        ...params,
        { name: 'densityS', tolerance: 1, valuesWindowSize: 100 },
      ],
    });
  };

  const removeParam = (idx) => {
    setSim({ checkParameters: params.filter((_, i) => i !== idx) });
  };

  return (
    <section className="card">
      <h3>Квази-стационарная остановка</h3>
      <label className="checkbox-row">
        <input
          type="checkbox"
          checked={!!simulating.stopOnQuasiSteady}
          onChange={(e) => setSim({ stopOnQuasiSteady: e.target.checked })}
        />
        stopOnQuasiSteady — останавливать симуляцию при стабилизации
      </label>
      <div className="grid-2" style={{ marginTop: '0.75rem' }}>
        <NumInput
          label="requiredStableChecks"
          value={simulating.requiredStableChecks}
          onChange={(v) => setSim({ requiredStableChecks: v })}
          step="1"
        />
      </div>

      <h4>checkParameters</h4>
      <p className="hint">
        Скользящее среднее по последним <code>valuesWindowSize</code> точкам; остановка, если
        отклонение &lt; tolerance (%). Для двухкомпонентной системы обычно смотрят суммарный{' '}
        <code>densityF</code>.
      </p>
      {params.map((p, i) => (
        <div key={i} className="param-card">
          <div className="param-card-fields">
            <label className="param-field">
              <span>Параметр</span>
              <SelectWrap>
                <select
                  className="ui-select"
                  value={p.name}
                  onChange={(e) => updateParam(i, 'name', e.target.value)}
                >
                  {CHECK_PARAM_NAMES.map((n) => (
                    <option key={n} value={n}>
                      {n}
                    </option>
                  ))}
                </select>
              </SelectWrap>
            </label>
            <label className="param-field">
              <span>tolerance, %</span>
              <input
                type="number"
                className="ui-input mono"
                value={p.tolerance}
                onChange={(e) => updateParam(i, 'tolerance', Number(e.target.value))}
              />
            </label>
            <label className="param-field">
              <span>valuesWindowSize</span>
              <input
                type="number"
                className="ui-input mono"
                value={p.valuesWindowSize}
                onChange={(e) => updateParam(i, 'valuesWindowSize', Number(e.target.value))}
              />
            </label>
          </div>
          <button
            type="button"
            className="btn btn-icon"
            onClick={() => removeParam(i)}
            title="Удалить"
            aria-label="Удалить параметр"
          >
            ×
          </button>
        </div>
      ))}
      <button type="button" className="btn" onClick={addParam}>
        + Параметр проверки
      </button>
    </section>
  );
}

export default function ConfigEditor() {
  const [config, setConfig] = useState(null);
  const [yamlText, setYamlText] = useState('');
  const [schemeFiles, setSchemeFiles] = useState([]);
  const [tab, setTab] = useState('form');
  const [message, setMessage] = useState(null);
  const [error, setError] = useState(null);
  const [loading, setLoading] = useState(true);

  const load = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      const [{ config: c, text }, { files }] = await Promise.all([api.getConfig(), api.listSchemes()]);
      setConfig(c);
      setYamlText(text);
      setSchemeFiles(files);
    } catch (e) {
      setError(e.message);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    load();
  }, [load]);

  const setSimulating = (simulating) => setConfig((c) => ({ ...c, simulating }));

  const applyPreset = async (preset) => {
    setError(null);
    try {
      const { config: c, text } = await api.applyConfigPreset(preset);
      setConfig(c);
      setYamlText(text);
      setMessage(preset === 'two' ? 'Пресет: N + O (двухкомпонентная)' : 'Пресет: только N');
    } catch (e) {
      setError(e.message);
    }
  };

  const saveForm = async () => {
    setError(null);
    setMessage(null);
    try {
      const { config: c, text } = await api.saveConfig(config);
      setConfig(c);
      setYamlText(text);
      setMessage('config.yaml сохранён');
    } catch (e) {
      setError(e.message);
    }
  };

  const saveYaml = async () => {
    setError(null);
    setMessage(null);
    try {
      const { config: c, text } = await api.saveConfigYaml(yamlText);
      setConfig(c);
      setYamlText(text);
      setMessage('config.yaml сохранён из YAML');
    } catch (e) {
      setError(e.message);
    }
  };

  if (loading || !config) {
    return <p>Загрузка конфигурации…</p>;
  }

  const schemeBasename = (config.schemePath || '').replace(/^configs\//, '');

  return (
    <>
      <h1 className="page-title">Конфигурация симуляции</h1>
      <p className="page-desc">
        <code>surface-atoms/config.yaml</code> — матрица, константы плазмы, элементы N/O, квази-стационар,
        путь к схеме. Редактируйте здесь перед запуском на вкладке «Запуск».
      </p>

      {error && <div className="alert alert-error">{error}</div>}
      {message && <div className="alert alert-success">{message}</div>}

      <div className="card">
        <h3>Пресеты</h3>
        <div className="btn-row">
          <button type="button" className="btn" onClick={() => applyPreset('single')}>
            1 компонент (N)
          </button>
          <button type="button" className="btn btn-primary" onClick={() => applyPreset('two')}>
            2 компонента (N + O)
          </button>
        </div>
      </div>

      <DatabasePanel
        elements={config.elements}
        onApplied={async (c) => {
          if (c) setConfig(c);
          const { config: fresh, text } = await api.getConfig();
          setConfig(fresh);
          setYamlText(text);
          setMessage('База параметров записана в config.yaml');
        }}
      />

      <div className="tabs">
        <button type="button" className={tab === 'form' ? 'active' : ''} onClick={() => setTab('form')}>
          Форма
        </button>
        <button type="button" className={tab === 'yaml' ? 'active' : ''} onClick={() => setTab('yaml')}>
          YAML
        </button>
        <button type="button" className="btn btn-primary" style={{ marginLeft: 'auto' }} onClick={saveForm}>
          Сохранить
        </button>
      </div>

      {tab === 'form' ? (
        <>
          <section className="card">
            <h3>Кинетическая схема</h3>
            <div className="field" style={{ maxWidth: 360 }}>
              <label>schemePath</label>
              <SelectWrap>
                <select
                  className="ui-select"
                  value={schemeBasename}
                  onChange={(e) =>
                    setConfig((c) => ({
                      ...c,
                      schemePath: e.target.value ? `configs/${e.target.value}` : '',
                    }))
                  }
                >
                  <option value="">— без схемы (legacy Fill) —</option>
                  {schemeFiles.map((f) => (
                    <option key={f} value={f}>
                      configs/{f}
                    </option>
                  ))}
                </select>
              </SelectWrap>
            </div>
          </section>

          <section className="card">
            <h3>Константы плазмы (consts)</h3>
            <div className="grid-3">
              <NumInput
                label="fDensity"
                value={config.consts.fDensity}
                onChange={(v) => setConfig((c) => ({ ...c, consts: { ...c.consts, fDensity: v } }))}
              />
              <NumInput
                label="fi"
                value={config.consts.fi}
                onChange={(v) => setConfig((c) => ({ ...c, consts: { ...c.consts, fi: v } }))}
              />
              <NumInput
                label="sDensity"
                value={config.consts.sDensity}
                onChange={(v) => setConfig((c) => ({ ...c, consts: { ...c.consts, sDensity: v } }))}
              />
            </div>
          </section>

          <ElementsSection
            elements={config.elements}
            onChange={(elements) => setConfig((c) => ({ ...c, elements }))}
          />

          <section className="card">
            <h3>Сетка и логирование</h3>
            <div className="grid-3">
              <NumInput
                label="matrixLenX"
                value={config.simulating.matrixLenX}
                onChange={(v) => setSimulating({ ...config.simulating, matrixLenX: v })}
                step="1"
              />
              <NumInput
                label="matrixLenY"
                value={config.simulating.matrixLenY}
                onChange={(v) => setSimulating({ ...config.simulating, matrixLenY: v })}
                step="1"
              />
              <NumInput
                label="logPercent"
                value={config.simulating.logPercent}
                onChange={(v) => setSimulating({ ...config.simulating, logPercent: v })}
              />
              <NumInput
                label="floatPrecision"
                value={config.simulating.floatPrecision}
                onChange={(v) => setSimulating({ ...config.simulating, floatPrecision: v })}
                step="1"
              />
            </div>
          </section>

          <QuasiSteadySection simulating={config.simulating} onSimulatingChange={setSimulating} />
        </>
      ) : (
        <div className="card">
          <div className="field">
            <label>config.yaml</label>
            <textarea
              className="ui-textarea mono"
              value={yamlText}
              onChange={(e) => setYamlText(e.target.value)}
              spellCheck={false}
            />
          </div>
          <button type="button" className="btn btn-primary" onClick={saveYaml}>
            Сохранить YAML
          </button>
        </div>
      )}
    </>
  );
}
