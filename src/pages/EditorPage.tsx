import { useState, useEffect, useCallback } from "react";
import { useParams, useNavigate } from "react-router-dom";
import { catalogApi } from "../services/catalogApi";
import { clearSession } from "../lib/auth";
import type { Catalog } from "../types";
import ThemePanel from "../components/editor/ThemePanel";
import ItemsPanel from "../components/editor/ItemsPanel";
import CatalogPreview from "../components/catalog/CatalogPreview";
import SharePanel from "../components/editor/SharePanel";

type Tab = "theme" | "items" | "share";
type MobileTab = Tab | "preview";

export default function EditorPage() {
  const { id } = useParams<{ id: string }>();
  const navigate = useNavigate();
  const [catalog, setCatalog] = useState<Catalog | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [saving, setSaving] = useState(false);
  const [activeTab, setActiveTab] = useState<Tab>("theme");
  const [mobileTab, setMobileTab] = useState<MobileTab>("theme");

  useEffect(() => {
    if (!id) return;
    catalogApi
      .getById(id)
      .then(setCatalog)
      .catch((e: Error) => setError(e.message))
      .finally(() => setLoading(false));
  }, [id]);

  // Debounced auto-save (items se guardan por sus propios endpoints)
  const save = useCallback(
    (updated: Catalog) => {
      setSaving(true);
      const { items: _items, ...catalogUpdate } = updated;
      const timer = setTimeout(() => {
        catalogApi
          .update(updated.id, catalogUpdate)
          .catch((e: Error) => console.error("Auto-save error:", e.message))
          .finally(() => setSaving(false));
      }, 800);
      return () => clearTimeout(timer);
    },
    []
  );

  function updateCatalog(updates: Partial<Catalog>) {
    if (!catalog) return;
    const updated: Catalog = { ...catalog, ...updates, updatedAt: new Date().toISOString() };
    setCatalog(updated);
    save(updated);
  }

  if (loading) {
    return (
      <div className="min-h-screen bg-slate-950 flex items-center justify-center text-slate-400 animate-pulse">
        Cargando editor...
      </div>
    );
  }

  if (error || !catalog) {
    return (
      <div className="min-h-screen bg-slate-950 flex items-center justify-center text-center px-4">
        <div>
          <div className="text-4xl mb-4">⚠️</div>
          <p className="text-white font-bold mb-2">No se pudo cargar el catalogo</p>
          <p className="text-slate-400 text-sm mb-4">{error}</p>
          <button onClick={() => navigate("/")} className="text-purple-400 hover:text-purple-300 transition-colors">
            Volver al inicio
          </button>
        </div>
      </div>
    );
  }

  const desktopTabs: { key: Tab; label: string; icon: string }[] = [
    { key: "theme", label: "Diseno", icon: "🎨" },
    { key: "items", label: catalog.type === "restaurant" ? "Platos" : "Productos", icon: catalog.type === "restaurant" ? "🍽️" : "📦" },
    { key: "share", label: "Compartir", icon: "🔗" },
  ];

  const mobileTabs: { key: MobileTab; label: string; icon: string }[] = [
    { key: "theme", label: "Diseño", icon: "🎨" },
    { key: "items", label: catalog.type === "restaurant" ? "Platos" : "Prods.", icon: catalog.type === "restaurant" ? "🍽️" : "📦" },
    { key: "share", label: "Compartir", icon: "🔗" },
    { key: "preview", label: "Preview", icon: "👁️" },
  ];

  return (
    <div className="h-[100dvh] bg-slate-950 flex flex-col overflow-hidden">
      {/* ─── Header ─── */}
      <header className="bg-slate-900 border-b border-slate-800 px-3 sm:px-4 py-2.5 sm:py-3 flex items-center gap-2 sm:gap-4 flex-shrink-0">
        <button
          onClick={() => navigate("/")}
          className="text-slate-400 hover:text-white transition-colors text-sm flex items-center gap-1 flex-shrink-0"
        >
          ←<span className="hidden sm:inline ml-1">Inicio</span>
        </button>
        <div className="h-4 w-px bg-slate-700 hidden sm:block" />
        <span className="text-white font-semibold truncate min-w-0 flex-1 text-sm">{catalog.title}</span>
        <span
          className={`text-xs px-2 py-0.5 rounded-full flex-shrink-0 hidden sm:inline-block ${
            catalog.type === "restaurant" ? "bg-orange-500/20 text-orange-300" : "bg-pink-500/20 text-pink-300"
          }`}
        >
          {catalog.type === "restaurant" ? "Restaurante" : "Productos"}
        </span>
        <div className="flex items-center gap-2 flex-shrink-0">
          {saving && <span className="text-slate-500 text-xs animate-pulse hidden sm:inline">Guardando...</span>}
          <a
            href={`/c/${catalog.slug}`}
            target="_blank"
            rel="noopener noreferrer"
            className="text-xs bg-purple-500/20 hover:bg-purple-500/30 text-purple-300 border border-purple-500/30 px-2.5 py-1.5 rounded-lg transition-colors whitespace-nowrap"
          >
            <span className="hidden sm:inline">Ver carta</span>
            <span className="sm:hidden">↗</span>
          </a>
          <button
            onClick={() => { clearSession(); navigate('/login'); }}
            className="text-xs text-slate-500 hover:text-slate-300 transition-colors hidden sm:block"
            title="Cerrar sesión"
          >
            Salir
          </button>
        </div>
      </header>

      {/* ─── Desktop layout (lg+): sidebar + preview side by side ─── */}
      <div className="hidden lg:flex flex-1 overflow-hidden">
        <aside className="w-80 bg-slate-900 border-r border-slate-800 flex flex-col overflow-hidden">
          <div className="flex border-b border-slate-800">
            {desktopTabs.map((tab) => (
              <button
                key={tab.key}
                onClick={() => setActiveTab(tab.key)}
                className={`flex-1 flex flex-col items-center gap-0.5 py-3 text-xs font-medium transition-colors ${
                  activeTab === tab.key
                    ? "text-purple-400 border-b-2 border-purple-500 bg-purple-500/5"
                    : "text-slate-400 hover:text-slate-200"
                }`}
              >
                <span className="text-base">{tab.icon}</span>
                {tab.label}
              </button>
            ))}
          </div>
          <div className="flex-1 overflow-y-auto p-4">
            {activeTab === "theme" && <ThemePanel catalog={catalog} onChange={updateCatalog} />}
            {activeTab === "items" && <ItemsPanel catalog={catalog} onChange={updateCatalog} />}
            {activeTab === "share" && <SharePanel catalog={catalog} />}
          </div>
        </aside>

        <main className="flex-1 overflow-auto bg-slate-950 flex items-start justify-center p-6">
          <div className="w-full max-w-lg">
            <div className="text-center text-slate-500 text-xs mb-3">Vista previa</div>
            <div className="rounded-2xl overflow-hidden shadow-2xl shadow-black/50 border border-slate-800">
              <CatalogPreview catalog={catalog} />
            </div>
          </div>
        </main>
      </div>

      {/* ─── Mobile / Tablet layout (< lg): single pane + bottom tabs ─── */}
      <div className="lg:hidden flex-1 flex flex-col overflow-hidden">
        {/* Content area */}
        <div className="flex-1 overflow-y-auto">
          {mobileTab === "preview" ? (
            <CatalogPreview catalog={catalog} fullPage />
          ) : (
            <div className="p-4">
              {mobileTab === "theme" && <ThemePanel catalog={catalog} onChange={updateCatalog} />}
              {mobileTab === "items" && <ItemsPanel catalog={catalog} onChange={updateCatalog} />}
              {mobileTab === "share" && <SharePanel catalog={catalog} />}
            </div>
          )}
        </div>

        {/* Saving indicator for mobile */}
        {saving && (
          <div className="bg-slate-900 border-t border-slate-800 px-4 py-1 text-center">
            <span className="text-slate-500 text-xs animate-pulse">Guardando...</span>
          </div>
        )}

        {/* Bottom tab bar */}
        <div className="flex border-t border-slate-800 bg-slate-900 flex-shrink-0 safe-area-bottom">
          {mobileTabs.map((tab) => (
            <button
              key={tab.key}
              onClick={() => setMobileTab(tab.key)}
              className={`flex-1 flex flex-col items-center gap-0.5 py-2.5 text-xs font-medium transition-colors ${
                mobileTab === tab.key
                  ? "text-purple-400 border-t-2 border-purple-500 bg-purple-500/5"
                  : "text-slate-400 hover:text-slate-200"
              }`}
            >
              <span className="text-base leading-none">{tab.icon}</span>
              <span className="text-[10px] leading-tight">{tab.label}</span>
            </button>
          ))}
        </div>
      </div>
    </div>
  );
}
