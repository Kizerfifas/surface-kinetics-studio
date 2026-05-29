import { useCallback } from 'react';

/**
 * Switch form/yaml tabs with server-side sync so views stay consistent.
 */
export function useSyncedEditorTabs({ tab, setTab, setError, syncFormToYaml, syncYamlToForm }) {
  const switchTab = useCallback(
    async (next) => {
      if (next === tab) return;
      setError(null);
      try {
        if (tab === 'form' && next === 'yaml') {
          await syncFormToYaml();
        } else if (tab === 'yaml' && next === 'form') {
          await syncYamlToForm();
        }
        setTab(next);
      } catch (e) {
        setError(
          next === 'yaml'
            ? `Не удалось обновить YAML: ${e.message}`
            : `Не удалось обновить форму: ${e.message}`,
        );
      }
    },
    [tab, setTab, setError, syncFormToYaml, syncYamlToForm],
  );

  return switchTab;
}
