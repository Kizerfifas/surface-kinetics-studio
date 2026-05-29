# Surface Kinetics Studio

**Развёртывание экосистемы (surface-atoms + Studio):** [docs/DEPLOYMENT.md](docs/DEPLOYMENT.md) → [полная инструкция в surface-atoms](https://github.com/Kizerfifas/surface-atoms/blob/dev/docs/DEPLOYMENT.md)

Веб-интерфейс для проекта [surface-atoms](../surface-atoms):

- редактирование кинетических схем (YAML);
- сборка и тесты Go (`go build`, `go test`);
- запуск KMC-симуляции;
- просмотр результатов из каталогов `result … T*K` (HTML + Excel + графики).

## Зависимости

- **Node.js 18+**
- **Go 1.23+** (для запуска симулятора)
- Проект **surface-atoms** рядом или путь через переменную окружения

## Установка

```bash
cd surface-kinetics-studio
npm install
cd client && npm install && cd ..
```

## Запуск (разработка)

Терминал 1 — API (порт 3847):

```bash
npm run dev:server
```

Терминал 2 — React (порт 5173, прокси на API):

```bash
npm run dev:client
```

Или одной командой:

```bash
npm run dev
```

Откройте http://localhost:5173

## Переменные окружения

| Переменная | По умолчанию | Описание |
|------------|--------------|----------|
| `SURFACE_ATOMS_PATH` | `../surface-atoms` | Путь к Go-проекту |
| `PORT` | `3847` | Порт API |

Пример:

```bash
export SURFACE_ATOMS_PATH=/home/mranderson/projects/surface-atoms
npm run dev
```

## Production

```bash
cd client && npm run build && cd ..
NODE_ENV=production npm start
```

Приложение: http://localhost:3847 (статика + API).

## Разделы UI

1. **Схема** — форма rates / probabilities / events или YAML; одна схема на все элементы (N, O…).
2. **Конфигурация** — `config.yaml`: элементы (1 или 2 компонента), `agDensity`, `sort`, константы плазмы, квази-стационар (`valuesWindowSize`, `checkParameters`), `schemePath`; пресеты «только N» и «N + O».
3. **Запуск** — краткая сводка config, `go build`, `go test`, симуляция.
4. **Результаты** — прогоны, графики (суммарные и по элементам), объединение HTML через `results_combiner`.

## API (кратко)

- `GET /api/health` — путь к surface-atoms
- `GET/POST /api/schemes/:filename` — чтение/запись схемы
- `GET/POST /api/config` — чтение/запись `config.yaml` (элементы, квази-стационар)
- `POST /api/config/preset/single|two` — пресет 1 или 2 компонента
- `POST /api/config/scheme-path` — только `schemePath`
- `POST /api/go/combine-results` — `scripts/results_combiner`
- `POST /api/go/build`, `/api/go/test`, `/api/go/run`
- `GET /api/results`, `GET /api/results/:id`, `GET /api/results/:id/html`
