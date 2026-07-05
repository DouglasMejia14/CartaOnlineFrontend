import type { Category, CatalogTheme } from '../types';

/** Theme por defecto — se usa también como fallback en el backend al crear */
export const DEFAULT_THEME: CatalogTheme = {
  bgType: 'gradient',
  bgValue: 'linear-gradient(135deg, #667eea 0%, #764ba2 100%)',
  primaryColor: '#764ba2',
  secondaryColor: '#667eea',
  fontFamily: 'Inter, sans-serif',
  borderRadius: 'md',
};

/** Retorna el nombre legible de una entrada de categoría (string legacy u objeto nuevo) */
export function getCategoryName(cat: string | Category): string {
  return typeof cat === 'string' ? cat : cat.name;
}

/** Retorna el identificador de una entrada de categoría */
export function getCategoryId(cat: string | Category): string {
  return typeof cat === 'string' ? cat : cat.id;
}

/** Comprueba si el campo `category` de un item pertenece a una entrada de categoría */
export function isItemInCategory(itemCategory: string, cat: string | Category): boolean {
  if (typeof cat === 'string') return itemCategory === cat;
  // Nuevo formato: comparar por ID o nombre (soporte a migración parcial)
  return itemCategory === cat.id || itemCategory === cat.name;
}

/** Formatea un precio al estilo colombiano: sin centavos, punto como separador de miles (95000 → 95.000) */
export function formatPrice(price: number): string {
  return price.toLocaleString('es-CO', { minimumFractionDigits: 0, maximumFractionDigits: 0 });
}
