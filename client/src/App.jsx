import { Routes, Route, NavLink } from 'react-router-dom';
import SchemeEditor from './pages/SchemeEditor';
import ConfigEditor from './pages/ConfigEditor';
import RunPanel from './pages/RunPanel';
import Results from './pages/Results';
import './App.css';

export default function App() {
  return (
    <div className="app">
      <aside className="sidebar">
        <div className="brand">
          <span className="brand-icon">◇</span>
          <div>
            <strong>Surface Kinetics</strong>
            <span className="brand-sub">Studio</span>
          </div>
        </div>
        <nav>
          <NavLink to="/" end className={({ isActive }) => (isActive ? 'active' : '')}>
            Схема
          </NavLink>
          <NavLink to="/config" className={({ isActive }) => (isActive ? 'active' : '')}>
            Конфигурация
          </NavLink>
          <NavLink to="/run" className={({ isActive }) => (isActive ? 'active' : '')}>
            Запуск
          </NavLink>
          <NavLink to="/results" className={({ isActive }) => (isActive ? 'active' : '')}>
            Результаты
          </NavLink>
        </nav>
      </aside>
      <main className="main">
        <Routes>
          <Route path="/" element={<SchemeEditor />} />
          <Route path="/config" element={<ConfigEditor />} />
          <Route path="/run" element={<RunPanel />} />
          <Route path="/results" element={<Results />} />
          <Route path="/results/:runId" element={<Results />} />
        </Routes>
      </main>
    </div>
  );
}
