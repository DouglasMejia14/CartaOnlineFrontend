import { BrowserRouter, Routes, Route, Navigate } from 'react-router-dom';
import HomePage from './pages/HomePage';
import EditorPage from './pages/EditorPage';
import PublicCatalogPage from './pages/PublicCatalogPage';
import LoginPage from './pages/LoginPage';
import RegisterPage from './pages/RegisterPage';
import { isAuthenticated } from './lib/auth';

function ProtectedRoute({ children }: { children: React.ReactNode }) {
  if (!isAuthenticated()) return <Navigate to="/login" replace />;
  return <>{children}</>;
}

export default function App() {
  return (
    <BrowserRouter>
      <div className="flex flex-col">
        <Routes>
          {/* Públicas */}
          <Route path="/login" element={<LoginPage />} />
          <Route path="/register" element={<RegisterPage />} />
          <Route path="/c/:slug" element={<PublicCatalogPage />} />

          {/* "/" es pública pero muestra contenido diferente según auth state */}
          <Route path="/" element={<HomePage />} />

          {/* Protegidas */}
          <Route path="/editor/:id" element={<ProtectedRoute><EditorPage /></ProtectedRoute>} />

          {/* Fallback */}
          <Route path="*" element={<Navigate to="/" replace />} />
        </Routes>

        {/* Marca de agua — estática al final de la página */}
        <div className="flex justify-center px-4 py-3 bg-black">
          <a
            href="https://misnegociosapp.com"
            target="_blank"
            rel="noopener noreferrer"
            className="text-slate-500 hover:text-slate-300 text-[11px] font-medium transition-colors"
          >
            powered by <span className="font-bold">MISNEGOCIOSAPP.COM</span>
          </a>
        </div>
      </div>
    </BrowserRouter>
  );
}
