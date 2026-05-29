# Развёртывание экосистемы Surface Kinetics

Полная пошаговая инструкция (клонирование, Go, Studio, nginx, production, troubleshooting):

- **Локально** (оба репозитория рядом): [../surface-atoms/docs/DEPLOYMENT.md](../surface-atoms/docs/DEPLOYMENT.md)
- **На GitHub**: [surface-atoms/docs/DEPLOYMENT.md](https://github.com/Kizerfifas/surface-atoms/blob/dev/docs/DEPLOYMENT.md)

Краткий запуск Studio после установки:

```bash
export SURFACE_ATOMS_PATH="$HOME/projects/surface-atoms"
cd ~/projects/surface-kinetics-studio
npm install && cd client && npm install && cd ..
npm run dev
```

→ http://localhost:5173
