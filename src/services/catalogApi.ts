import type { Catalog, CatalogItem } from '../types';
import { authHeaders, clearSession } from '../lib/auth';

const BASE: string = import.meta.env.VITE_API_URL ?? 'http://localhost:3000';

// Rutas protegidas — redirige a /login si recibe 401
async function req<T>(path: string, options?: RequestInit): Promise<T> {
  const res = await fetch(`${BASE}${path}`, {
    ...options,
    headers: {
      ...authHeaders(),
      ...(options?.headers as Record<string, string> | undefined),
    },
  });
  if (res.status === 401) {
    clearSession();
    window.location.replace('/login');
    // Lanzamos para cortar el flujo; la navegación ya ocurrió
    throw new Error('Sesión expirada. Vuelve a iniciar sesión.');
  }
  if (!res.ok) {
    const data = await res.json().catch(() => null);
    throw new Error(data?.error ?? data?.message ?? `Error ${res.status}`);
  }
  if (res.status === 204) return undefined as T;
  return res.json();
}

// Rutas públicas (ej: ver carta por slug) — NO redirige en 401
async function reqPublic<T>(path: string): Promise<T> {
  const token = authHeaders().Authorization;
  const res = await fetch(`${BASE}${path}`, {
    headers: {
      'Content-Type': 'application/json',
      ...(token ? { Authorization: token } : {}),
    },
  });
  if (!res.ok) {
    const data = await res.json().catch(() => null);
    throw new Error(data?.error ?? data?.message ?? `Error ${res.status}`);
  }
  return res.json();
}

// ── Item field mapping ────────────────────────────────────────────────────────
// El backend ahora usa campos en inglés; se mantienen fallbacks para items viejos (español)

function toBackendItem(item: Partial<CatalogItem>): Record<string, unknown> {
  const out: Record<string, unknown> = {};
  if (item.name !== undefined)        out.name        = item.name;
  if (item.price !== undefined)       out.price       = item.price;
  if (item.description !== undefined) out.description = item.description;
  if ('category' in item)             out.categoryId    = item.category || null;
  if ('subcategoryId' in item)         out.subcategoryId = item.subcategoryId ?? null;
  if (item.images !== undefined)      out.images      = item.images;
  if (item.available !== undefined)   out.available   = item.available;
  if (item.sizes !== undefined)       out.sizes       = item.sizes;
  if (item.brand !== undefined)       out.brand       = item.brand;
  return out;
}

function fromBackendItem(data: Record<string, unknown>): CatalogItem {
  return {
    id:          data.id as string,
    name:        ((data.name        ?? data.nombre)      as string)  ?? '',
    description: ((data.description ?? data.descripcion) as string)  ?? '',
    price:        (data.price       ?? data.precio)      as number   | undefined,
    images:       Array.isArray(data.images)     ? (data.images as string[])
                    : data.imagen                ? [data.imagen as string]
                    : [],
    category:    ((data.categoryId  ?? data.categoriaId ?? data.category) as string) ?? '',
    subcategoryId: (data.subcategoryId ?? data.subcategoriaId ?? null) as string | null | undefined,
    available:    (data.available   ?? data.disponible) as boolean | undefined,
    sizes:        (data.sizes       ?? data.tallas)     as string[] | undefined,
    brand:        (data.brand       ?? data.marca)      as string   | undefined,
  };
}

/** Normaliza los items de un catálogo recibido del backend (maneja campos en español o inglés) */
function normalizeItems(catalog: Catalog): Catalog {
  if (!Array.isArray(catalog.items) || catalog.items.length === 0) return catalog;
  return {
    ...catalog,
    items: (catalog.items as unknown as Record<string, unknown>[]).map(fromBackendItem),
  };
}

function normalizeCatalogMeta(raw: Catalog | Record<string, unknown>): Catalog {
  const catalog = raw as Catalog & Record<string, unknown>;
  return {
    ...catalog,
    googleMaps: (catalog.googleMaps ?? catalog.google_maps ?? catalog.ubicacion ?? catalog.locationUrl ?? catalog.mapsUrl) as string | undefined,
  };
}

export const catalogApi = {
  /** GET /api/catalogs → Catalog[] */
  list: (): Promise<Catalog[]> =>
    req<Catalog[]>('/api/catalogs').then((cs) => cs.map((c) => normalizeItems(normalizeCatalogMeta(c)))),

  /** GET /api/catalogs/:id → Catalog */
  getById: (id: string): Promise<Catalog> =>
    req<Catalog>(`/api/catalogs/${id}`).then((c) => normalizeItems(normalizeCatalogMeta(c))),

  /** GET /api/catalogs/slug/:slug → Catalog (vista pública, sin redirigir en 401) */
  getBySlug: (slug: string): Promise<Catalog> =>
    reqPublic<Catalog>(`/api/catalogs/slug/${slug}`).then((c) => normalizeItems(normalizeCatalogMeta(c))),

  /**
   * POST /api/catalogs
   * Body: { type: 'restaurant' | 'products', title: string }
   * → Catalog (con id, slug, theme por defecto y categorías base generadas por el backend)
   */
  create: (data: { type: Catalog['type']; title: string }): Promise<Catalog> =>
    req('/api/catalogs', {
      method: 'POST',
      body: JSON.stringify(data),
    }),

  /**
   * PUT /api/catalogs/:id
   * Body: Partial<Catalog> (theme, items, categories, title, description, logo…)
   * → Catalog actualizado
   */
  update: (id: string, data: Partial<Omit<Catalog, 'id' | 'slug' | 'createdAt'>>): Promise<Catalog> =>
    req(`/api/catalogs/${id}`, {
      method: 'PUT',
      body: JSON.stringify({
        ...data,
        ...(data.googleMaps !== undefined ? { google_maps: data.googleMaps } : {}),
      }),
    }),

  /** DELETE /api/catalogs/:id → 204 No Content */
  remove: (id: string): Promise<void> =>
    req(`/api/catalogs/${id}`, { method: 'DELETE' }),

  // ── Item endpoints ────────────────────────────────────────────────────────

  /** POST /api/catalogs/:catalogId/items → CatalogItem */
  createItem: (catalogId: string, item: Omit<CatalogItem, 'id'>): Promise<CatalogItem> =>
    req<Record<string, unknown>>(`/api/catalogs/${catalogId}/items`, {
      method: 'POST',
      body: JSON.stringify(toBackendItem(item as Partial<CatalogItem>)),
    }).then(fromBackendItem),

  /** PUT /api/catalogs/:catalogId/items/:itemId → CatalogItem */
  updateItem: (catalogId: string, itemId: string, updates: Partial<CatalogItem>): Promise<CatalogItem> =>
    req<Record<string, unknown>>(`/api/catalogs/${catalogId}/items/${itemId}`, {
      method: 'PUT',
      body: JSON.stringify(toBackendItem(updates)),
    }).then(fromBackendItem),

  /** DELETE /api/catalogs/:catalogId/items/:itemId → 204 No Content */
  deleteItem: (catalogId: string, itemId: string): Promise<void> =>
    req(`/api/catalogs/${catalogId}/items/${itemId}`, { method: 'DELETE' }),
};
