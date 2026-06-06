import { useState, useEffect } from "react";
import { useNavigate, Link } from "react-router-dom";
import { catalogApi } from "../services/catalogApi";
import { getUser, clearSession, isAuthenticated, hasSeenOnboarding } from "../lib/auth";
import type { Catalog, CatalogType } from "../types";
import OnboardingTour from "../components/onboarding/OnboardingTour";

export default function HomePage() {
  const authenticated = isAuthenticated();
  if (!authenticated) return <LandingView />;
  return <DashboardView />;
}

// Landing (no autenticado)
function LandingView() {
  return (
    <div className="min-h-screen bg-gradient-to-br from-slate-900 via-purple-900 to-slate-900 flex flex-col items-center justify-center px-4 py-16">
      <div className="text-center max-w-2xl mb-10">
        <div className="inline-flex items-center gap-2 bg-white/10 backdrop-blur border border-white/20 rounded-full px-4 py-1.5 text-sm text-purple-200 mb-6">
          <span className="w-2 h-2 bg-purple-400 rounded-full animate-pulse" />
          Crea tu carta o catálogo en minutos y fácil
        </div>
        <h1 className="text-5xl md:text-6xl font-black text-white mb-4 leading-tight">
          Cartas y Catálogos
          <br />
          <span className="text-transparent bg-clip-text bg-gradient-to-r from-purple-400 to-pink-400">
            digitales
          </span>
        </h1>
        <p className="text-lg text-slate-300 max-w-md mx-auto">
          Diseña cartas de restaurante o catálogos de productos con URL única y código QR para compartir al instante.
        </p>
      </div>
      <div className="flex flex-col sm:flex-row gap-3 mb-16">
        <Link
          to="/register"
          className="bg-gradient-to-r from-purple-500 to-pink-500 hover:from-purple-600 hover:to-pink-600 text-white font-bold text-lg px-8 py-4 rounded-2xl shadow-2xl shadow-purple-500/30 transition-all hover:scale-105 active:scale-95 text-center"
        >
          Crear cuenta gratis
        </Link>
        <Link
          to="/login"
          className="bg-white/10 hover:bg-white/15 backdrop-blur border border-white/20 text-white font-semibold text-lg px-8 py-4 rounded-2xl transition-all hover:scale-105 active:scale-95 text-center"
        >
          Iniciar sesión
        </Link>
      </div>
      <div className="grid grid-cols-1 md:grid-cols-3 gap-4 max-w-2xl w-full">
        {[
          { icon: "🎨", title: "Personalizable", desc: "Degradados, colores sólidos, imágenes o GIFs de fondo" },
          { icon: "🔗", title: "URL única", desc: "Comparte tu catálogo con un link propio" },
          { icon: "📱", title: "Código QR", desc: "Genera un QR para tus clientes al instante" },
        ].map((f) => (
          <div key={f.title} className="bg-white/5 backdrop-blur border border-white/10 rounded-2xl p-5 text-center">
            <div className="text-3xl mb-2">{f.icon}</div>
            <div className="text-white font-semibold mb-1">{f.title}</div>
            <div className="text-slate-400 text-sm">{f.desc}</div>
          </div>
        ))}
      </div>
    </div>
  );
}

// Dashboard (autenticado)
function DashboardView() {
  const navigate = useNavigate();
  const user = getUser();
  const initials = user ? `${user.nombre[0]}${user.apellido[0]}`.toUpperCase() : "??";

  const [showModal, setShowModal] = useState(false);
  const [selectedType, setSelectedType] = useState<CatalogType>("restaurant");
  const [title, setTitle] = useState("");
  const [creating, setCreating] = useState(false);
  const [catalogs, setCatalogs] = useState<Catalog[]>([]);
  const [loadingList, setLoadingList] = useState(true);
  const [listError, setListError] = useState<string | null>(null);
  const [showTour, setShowTour] = useState(() => !hasSeenOnboarding());

  function logout() {
    clearSession();
    navigate("/login");
  }

  useEffect(() => {
    catalogApi
      .list()
      .then(setCatalogs)
      .catch((e: Error) => setListError(e.message))
      .finally(() => setLoadingList(false));
  }, []);

  async function handleCreate() {
    if (!title.trim() || creating) return;
    setCreating(true);
    try {
      const catalog = await catalogApi.create({ type: selectedType, title: title.trim() });
      navigate(`/editor/${catalog.id}`);
    } catch (e) {
      alert(`Error al crear catálogo: ${(e as Error).message}`);
    } finally {
      setCreating(false);
    }
  }

  async function handleDelete(id: string) {
    if (!confirm("¿Eliminar este catálogo?")) return;
    await catalogApi.remove(id).catch(() => null);
    setCatalogs((prev) => prev.filter((c) => c.id !== id));
  }

  return (
    <div className="min-h-screen bg-gradient-to-br from-slate-900 via-purple-900 to-slate-900 flex flex-col items-center px-4 py-10">
      <div className="w-full max-w-2xl flex items-center justify-between mb-10">
        <h2 className="text-white font-black text-xl">
          Cartas<span className="text-transparent bg-clip-text bg-gradient-to-r from-purple-400 to-pink-400">Online</span>
        </h2>
        <div className="flex items-center gap-3">
          {user && (
            <span className="text-slate-400 text-sm hidden sm:block">
              {user.nombre} {user.apellido}
            </span>
          )}
          <div
            title={user ? `${user.nombre} ${user.apellido}` : ""}
            className="w-9 h-9 rounded-full bg-gradient-to-br from-purple-500 to-pink-500 flex items-center justify-center text-white font-bold text-sm shadow-lg ring-2 ring-purple-500/40 cursor-default select-none"
          >
            {initials}
          </div>
          <button
            onClick={logout}
            className="text-xs bg-slate-800 hover:bg-slate-700 border border-slate-700 text-slate-300 px-3 py-1.5 rounded-lg transition-colors"
          >
            Salir
          </button>
        </div>
      </div>

      <div className="text-center mb-8 max-w-xl">
        <h1 className="text-4xl font-black text-white mb-2">Mis catálogos</h1>
        <p className="text-slate-400 text-sm">
          Bienvenido, {user?.nombre}. Crea y gestiona tus cartas de restaurante o catálogos de productos.
        </p>
      </div>

      <button
        onClick={() => setShowModal(true)}
        className="bg-gradient-to-r from-purple-500 to-pink-500 hover:from-purple-600 hover:to-pink-600 text-white font-bold text-lg px-8 py-4 rounded-2xl shadow-2xl shadow-purple-500/30 transition-all duration-200 hover:scale-105 active:scale-95 mb-10"
      >
        + Crear nueva carta o catálogo
      </button>

      <div className="w-full max-w-2xl">
        {loadingList && (
          <div className="text-slate-400 text-sm text-center py-8 animate-pulse">Cargando...</div>
        )}
        {listError && (
          <div className="bg-red-500/10 border border-red-500/30 rounded-xl p-4 text-red-300 text-sm text-center">
            No se pudo cargar los catálogos.
            <br />
            <span className="text-red-400/60 text-xs">{listError}</span>
            <br />
            <button
              onClick={() => { clearSession(); navigate("/login"); }}
              className="mt-2 text-purple-400 hover:text-purple-300 text-xs underline"
            >
              Volver a iniciar sesión
            </button>
          </div>
        )}
        {!loadingList && !listError && catalogs.length === 0 && (
          <div className="text-slate-500 text-sm text-center py-12 border border-dashed border-slate-700 rounded-2xl">
            Aún no tienes catálogos. ¡Crea el primero!
          </div>
        )}
        <div className="grid gap-3">
          {catalogs.map((c) => (
            <div key={c.id} className="bg-white/5 backdrop-blur border border-white/10 rounded-2xl p-4 flex items-center gap-3 flex-wrap sm:flex-nowrap">
              <div
                className="w-10 h-10 sm:w-12 sm:h-12 rounded-xl flex-shrink-0 border border-white/10"
                style={{ background: c.theme?.bgValue ?? "#1a1a2e" }}
              />
              <div className="flex-1 min-w-0">
                <div className="text-white font-semibold truncate">{c.title}</div>
                <div className="text-slate-400 text-xs mt-0.5 flex items-center gap-2">
                  <span>{c.type === "restaurant" ? "🍽️ Restaurante" : "📦 Productos"}</span>
                  <span>·</span>
                  <span>{c.items?.length ?? 0} items</span>
                </div>
              </div>
              <div className="flex gap-2 flex-shrink-0 w-full sm:w-auto justify-end">
                <a
                  href={`/c/${c.slug}`}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="text-xs bg-slate-700 hover:bg-slate-600 text-slate-200 px-3 py-1.5 rounded-lg transition-colors"
                >
                  Ver
                </a>
                <button
                  onClick={() => navigate(`/editor/${c.id}`)}
                  className="text-xs bg-purple-500/20 hover:bg-purple-500/30 text-purple-300 border border-purple-500/30 px-3 py-1.5 rounded-lg transition-colors"
                >
                  Editar
                </button>
                <button
                  onClick={() => handleDelete(c.id)}
                  className="text-xs bg-red-500/10 hover:bg-red-500/20 text-red-400 px-2 py-1.5 rounded-lg transition-colors"
                >
                  🗑️
                </button>
              </div>
            </div>
          ))}
        </div>
      </div>

      {showTour && <OnboardingTour onDone={() => setShowTour(false)} />}

      {showModal && (
        <div className="fixed inset-0 bg-black/60 backdrop-blur-sm flex items-end sm:items-center justify-center z-50 px-4 pb-4 sm:pb-0">
          <div className="bg-slate-800 border border-slate-700 rounded-3xl p-6 sm:p-8 w-full max-w-md shadow-2xl max-h-[90dvh] overflow-y-auto">
            <h2 className="text-2xl font-bold text-white mb-6">Nuevo catálogo</h2>
            <div className="grid grid-cols-2 gap-3 mb-6">
              {(["restaurant", "products"] as CatalogType[]).map((type) => (
                <button
                  key={type}
                  onClick={() => setSelectedType(type)}
                  className={`flex flex-col items-center gap-2 p-4 rounded-2xl border-2 transition-all ${
                    selectedType === type
                      ? "border-purple-500 bg-purple-500/20 text-white"
                      : "border-slate-600 text-slate-400 hover:border-slate-500"
                  }`}
                >
                  <span className="text-2xl">{type === "restaurant" ? "🍽️" : "📦"}</span>
                  <span className="font-semibold text-sm">
                    {type === "restaurant" ? "Restaurante" : "Productos"}
                  </span>
                </button>
              ))}
            </div>
            <input
              type="text"
              placeholder={selectedType === "restaurant" ? "Ej: Restaurante La Paloma" : "Ej: Tienda Productos XYZ"}
              value={title}
              onChange={(e) => setTitle(e.target.value)}
              onKeyDown={(e) => e.key === "Enter" && handleCreate()}
              autoFocus
              className="w-full bg-slate-700 border border-slate-600 rounded-xl px-4 py-3 text-white placeholder-slate-400 outline-none focus:border-purple-500 transition-colors mb-6"
            />
            <div className="flex gap-3">
              <button
                onClick={() => { setShowModal(false); setTitle(""); }}
                className="flex-1 bg-slate-700 hover:bg-slate-600 text-white font-semibold py-3 rounded-xl transition-colors"
              >
                Cancelar
              </button>
              <button
                onClick={handleCreate}
                disabled={!title.trim() || creating}
                className="flex-1 bg-gradient-to-r from-purple-500 to-pink-500 disabled:opacity-40 disabled:cursor-not-allowed text-white font-semibold py-3 rounded-xl transition-all hover:scale-105 active:scale-95"
              >
                {creating ? "Creando..." : "Crear"}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
