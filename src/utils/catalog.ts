import type { CatalogTheme } from '../types';

/** Theme por defecto — se usa también como fallback en el backend al crear */
export const DEFAULT_THEME: CatalogTheme = {
  bgType: 'gradient',
  bgValue: 'linear-gradient(135deg, #667eea 0%, #764ba2 100%)',
  primaryColor: '#764ba2',
  secondaryColor: '#667eea',
  fontFamily: 'Inter, sans-serif',
  borderRadius: 'md',
};
