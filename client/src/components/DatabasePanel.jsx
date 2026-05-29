import { useCallback, useEffect, useState } from 'react';
import { api } from '../api';
import SelectWrap from './SelectWrap';

export default function DatabasePanel({ elements, onApplied }) {
  const [entries, setEntries] = useState([]);
  const [selectedId, setSelectedId] = useState('');
  const [elementName, setElementName] = useState('');
  const [busy, setBusy] = useState(false);
  const [message, setMessage] = useState(null);
  const [error, setError] = useState(null);
  const [preview, setPreview] = useState(null);

  const load = useCallback(async () => {
    const { entries: list } = await api.listDatabases();
    setEntries(list);
    setSelectedId((prev) => prev || list[0]?.id || '');
  }, []);

  useEffect(() => {
    load().catch((e) => setError(e.message));
  }, [load]);

  useEffect(() => {
    if (!selectedId) return;
    api
      .getDatabase(selectedId)
      .then((r) => setPreview(r.data))
      .catch(() => setPreview(null));
  }, [selectedId]);

  useEffect(() => {
    if (elements?.length && !elementName) {
      setElementName(elements[0].name);
    }
  }, [elements, elementName]);

  const selected = entries.find((e) => e.id === selectedId);

  const handleApply = async () => {
    setBusy(true);
    setError(null);
    setMessage(null);
    try {
      const body =
        selected?.kind === 'element' && elementName ? { elementName } : {};
      const out = await api.applyDatabase(selectedId, body);
      setMessage(`Применено: ${out.applied} (${out.kind})`);
      onApplied?.(out.config);
    } catch (e) {
      setError(e.message);
    } finally {
      setBusy(false);
    }
  };

  return (
    <section className="card">
      <h3>База параметров</h3>
      <p className="hint">
        Готовые наборы из литературы (Marinov и др.). Файлы в{' '}
        <code className="mono">surface-kinetics-studio/databases/</code> — можно дополнять своими
        YAML и строкой в <code>index.json</code>.
      </p>

      {error && <div className="alert alert-error">{error}</div>}
      {message && <div className="alert alert-success">{message}</div>}

      <div className="grid-2">
        <div className="field">
          <label>Запись</label>
          <SelectWrap>
            <select
              className="ui-select"
              value={selectedId}
              onChange={(e) => setSelectedId(e.target.value)}
            >
              {entries.map((e) => (
                <option key={e.id} value={e.id}>
                  [{e.kind}] {e.label}
                </option>
              ))}
            </select>
          </SelectWrap>
          {selected?.description && <p className="hint">{selected.description}</p>}
        </div>

        {selected?.kind === 'element' && (
          <div className="field">
            <label>Подставить в элемент</label>
            <SelectWrap>
              <select
                className="ui-select"
                value={elementName}
                onChange={(e) => setElementName(e.target.value)}
              >
                {(elements || []).map((el) => (
                  <option key={el.name} value={el.name}>
                    {el.name}
                  </option>
                ))}
              </select>
            </SelectWrap>
          </div>
        )}
      </div>

      {preview && (
        <pre className="db-preview mono">{JSON.stringify(preview, null, 2)}</pre>
      )}

      <button type="button" className="btn btn-primary" onClick={handleApply} disabled={busy || !selectedId}>
        {busy ? 'Применение…' : 'Применить к config.yaml'}
      </button>
    </section>
  );
}
