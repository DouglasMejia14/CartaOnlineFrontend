import { useEffect, useRef, useState } from "react";
import { useParams } from "react-router-dom";
import { catalogApi } from "../services/catalogApi";
import type { Catalog } from "../types";
import CatalogPreview from "../components/catalog/CatalogPreview";

export default function PublicCatalogPage() {
  const { slug } = useParams<{ slug: string }>();
  const [catalog, setCatalog] = useState<Catalog | null | undefined>(undefined);
  const [error, setError] = useState<string | null>(null);
  const visitTrackedRef = useRef(false);

  useEffect(() => {
    if (!slug) { setCatalog(null); return; }
    let active = true;
    visitTrackedRef.current = false;
    catalogApi
      .getBySlug(slug)
      .then((data) => {
        if (!active) return;
        setCatalog(data);
        if (visitTrackedRef.current) return;
        visitTrackedRef.current = true;
        // No bloquea la vista pública si falla el tracking de visitas.
        catalogApi
          .registerVisitBySlug(data.slug)
          .then((visitResult) => {
            if (!active || typeof visitResult?.visits !== "number") return;
            setCatalog((prev) => (prev ? { ...prev, visits: visitResult.visits } : prev));
          })
          .catch(() => null);
      })
      .catch((e: Error) => {
        if (!active) return;
        setError(e.message);
        setCatalog(null);
      });

    return () => {
      active = false;
    };
  }, [slug]);

  if (catalog === undefined) {
    return (
      <div className="min-h-screen bg-slate-900 flex items-center justify-center text-slate-400 animate-pulse">
        Cargando...
      </div>
    );
  }

  if (catalog === null) {
    return (
      <div className="min-h-screen bg-slate-900 flex items-center justify-center text-center px-4">
        <div>
          <div className="text-5xl mb-4">🔍</div>
          <h1 className="text-2xl font-bold text-white mb-2">Catalogo no encontrado</h1>
          <p className="text-slate-400 text-sm">{error ?? "El enlace puede haber expirado o ser incorrecto."}</p>
          <a href="/" className="mt-6 inline-block text-purple-400 hover:text-purple-300 transition-colors">
            Crear mi catalogo
          </a>
        </div>
      </div>
    );
  }

  return <CatalogPreview catalog={catalog} fullPage />;
}
