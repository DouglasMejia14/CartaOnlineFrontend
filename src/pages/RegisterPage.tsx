import { useState } from 'react';
import { useNavigate, Link } from 'react-router-dom';
import { authApi } from '../services/authApi';
import { saveSession } from '../lib/auth';

export default function RegisterPage() {
  const navigate = useNavigate();
  const [form, setForm] = useState({ nombre: '', apellido: '', email: '', password: '', confirm: '' });
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  function set(key: keyof typeof form, value: string) {
    setForm((prev) => ({ ...prev, [key]: value }));
  }

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    if (form.password.length < 6) {
      setError('La contraseña debe tener al menos 6 caracteres.');
      return;
    }
    if (form.password !== form.confirm) {
      setError('Las contraseñas no coinciden.');
      return;
    }
    setLoading(true);
    setError(null);
    try {
      const { token, usuario } = await authApi.register(
        form.nombre.trim(),
        form.apellido.trim(),
        form.email.trim(),
        form.password,
      );
      saveSession(token, usuario);
      navigate('/');
    } catch (err) {
      setError((err as Error).message);
    } finally {
      setLoading(false);
    }
  }

  const isValid =
    form.nombre.trim() &&
    form.apellido.trim() &&
    form.email.trim() &&
    form.password.length >= 6 &&
    form.password === form.confirm;

  return (
    <div className="min-h-screen bg-gradient-to-br from-slate-900 via-purple-900 to-slate-900 flex items-center justify-center px-4 py-12">
      <div className="w-full max-w-sm">
        {/* Logo / título */}
        <div className="text-center mb-8">
          <h1 className="text-3xl font-black text-white mb-1">
            Cartas
            <span className="text-transparent bg-clip-text bg-gradient-to-r from-purple-400 to-pink-400">
              Online
            </span>
          </h1>
          <p className="text-slate-400 text-sm">Crea tu cuenta gratis</p>
        </div>

        <form
          onSubmit={handleSubmit}
          className="bg-slate-800/60 backdrop-blur border border-slate-700 rounded-2xl p-6 space-y-4"
        >
          {error && (
            <div className="bg-red-500/10 border border-red-500/30 rounded-xl px-4 py-3 text-red-300 text-sm">
              {error}
            </div>
          )}

          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="block text-slate-300 text-sm mb-1.5">Nombre</label>
              <input
                type="text"
                autoComplete="given-name"
                value={form.nombre}
                onChange={(e) => set('nombre', e.target.value)}
                placeholder="Juan"
                required
                className="w-full bg-slate-700 border border-slate-600 rounded-xl px-3 py-3 text-white placeholder-slate-400 outline-none focus:border-purple-500 transition-colors"
              />
            </div>
            <div>
              <label className="block text-slate-300 text-sm mb-1.5">Apellido</label>
              <input
                type="text"
                autoComplete="family-name"
                value={form.apellido}
                onChange={(e) => set('apellido', e.target.value)}
                placeholder="García"
                required
                className="w-full bg-slate-700 border border-slate-600 rounded-xl px-3 py-3 text-white placeholder-slate-400 outline-none focus:border-purple-500 transition-colors"
              />
            </div>
          </div>

          <div>
            <label className="block text-slate-300 text-sm mb-1.5">Email</label>
            <input
              type="email"
              autoComplete="email"
              value={form.email}
              onChange={(e) => set('email', e.target.value)}
              placeholder="tu@email.com"
              required
              className="w-full bg-slate-700 border border-slate-600 rounded-xl px-4 py-3 text-white placeholder-slate-400 outline-none focus:border-purple-500 transition-colors"
            />
          </div>

          <div>
            <label className="block text-slate-300 text-sm mb-1.5">Contraseña</label>
            <input
              type="password"
              autoComplete="new-password"
              value={form.password}
              onChange={(e) => set('password', e.target.value)}
              placeholder="Mínimo 6 caracteres"
              required
              className="w-full bg-slate-700 border border-slate-600 rounded-xl px-4 py-3 text-white placeholder-slate-400 outline-none focus:border-purple-500 transition-colors"
            />
          </div>

          <div>
            <label className="block text-slate-300 text-sm mb-1.5">Confirmar contraseña</label>
            <input
              type="password"
              autoComplete="new-password"
              value={form.confirm}
              onChange={(e) => set('confirm', e.target.value)}
              placeholder="Repite la contraseña"
              required
              className={`w-full bg-slate-700 border rounded-xl px-4 py-3 text-white placeholder-slate-400 outline-none transition-colors ${
                form.confirm && form.password !== form.confirm
                  ? 'border-red-500'
                  : 'border-slate-600 focus:border-purple-500'
              }`}
            />
          </div>

          <button
            type="submit"
            disabled={loading || !isValid}
            className="w-full bg-gradient-to-r from-purple-500 to-pink-500 hover:from-purple-600 hover:to-pink-600 disabled:opacity-40 disabled:cursor-not-allowed text-white font-semibold py-3 rounded-xl transition-all hover:scale-[1.02] active:scale-95 mt-2"
          >
            {loading ? 'Creando cuenta...' : 'Crear cuenta'}
          </button>
        </form>

        <p className="text-center text-slate-400 text-sm mt-5">
          ¿Ya tienes cuenta?{' '}
          <Link to="/login" className="text-purple-400 hover:text-purple-300 font-medium transition-colors">
            Inicia sesión
          </Link>
        </p>

        {/* Footer */}
        <footer className="mt-10 flex flex-col items-center gap-3">
          <div className="flex items-center gap-4">
            <a
              href="https://www.facebook.com"
              target="_blank"
              rel="noopener noreferrer"
              aria-label="Facebook"
              className="text-slate-500 hover:text-blue-400 transition-colors"
            >
              <svg className="w-5 h-5" fill="currentColor" viewBox="0 0 24 24">
                <path d="M22 12c0-5.522-4.477-10-10-10S2 6.478 2 12c0 4.991 3.657 9.128 8.438 9.878v-6.987H7.898V12h2.54V9.797c0-2.506 1.492-3.89 3.777-3.89 1.094 0 2.238.195 2.238.195v2.46h-1.26c-1.243 0-1.63.771-1.63 1.562V12h2.773l-.443 2.89h-2.33v6.988C18.343 21.128 22 16.991 22 12z" />
              </svg>
            </a>
            <a
              href="https://www.instagram.com"
              target="_blank"
              rel="noopener noreferrer"
              aria-label="Instagram"
              className="text-slate-500 hover:text-pink-400 transition-colors"
            >
              <svg className="w-5 h-5" fill="currentColor" viewBox="0 0 24 24">
                <path d="M12 2.163c3.204 0 3.584.012 4.85.07 1.366.062 2.633.334 3.608 1.308.975.975 1.246 2.242 1.308 3.608.058 1.266.07 1.646.07 4.85s-.012 3.584-.07 4.85c-.062 1.366-.334 2.633-1.308 3.608-.975.975-2.242 1.246-3.608 1.308-1.266.058-1.646.07-4.85.07s-3.584-.012-4.85-.07c-1.366-.062-2.633-.334-3.608-1.308-.975-.975-1.246-2.242-1.308-3.608C2.175 15.584 2.163 15.204 2.163 12s.012-3.584.07-4.85c.062-1.366.334-2.633 1.308-3.608C4.516 2.497 5.783 2.226 7.15 2.163 8.416 2.105 8.796 2.163 12 2.163zm0-2.163C8.741 0 8.333.014 7.053.072 5.773.131 4.548.425 3.465 1.508 2.381 2.592 2.087 3.817 2.028 5.097 1.97 6.377 1.956 6.785 1.956 12c0 5.215.014 5.623.072 6.903.059 1.28.353 2.505 1.436 3.588 1.084 1.084 2.309 1.378 3.589 1.436C8.333 23.986 8.741 24 12 24s3.667-.014 4.947-.073c1.28-.058 2.505-.352 3.588-1.436 1.084-1.083 1.378-2.308 1.436-3.588.059-1.28.073-1.688.073-6.903 0-5.215-.014-5.623-.073-6.903-.058-1.28-.352-2.505-1.436-3.588C19.452.425 18.227.131 16.947.072 15.667.014 15.259 0 12 0zm0 5.838a6.162 6.162 0 1 0 0 12.324 6.162 6.162 0 0 0 0-12.324zM12 16a4 4 0 1 1 0-8 4 4 0 0 1 0 8zm6.406-11.845a1.44 1.44 0 1 0 0 2.881 1.44 1.44 0 0 0 0-2.881z" />
              </svg>
            </a>
          </div>
          <p className="text-slate-600 text-xs">
            © 2026 ByteWise. Todos los derechos reservados.
          </p>
        </footer>
      </div>
    </div>
  );
}
