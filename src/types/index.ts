export type CatalogType = 'restaurant' | 'products';

export interface Subcategory {
  id: string;
  name: string;
}

export interface Category {
  id: string;
  name: string;
  subcategories: Subcategory[];
}

export interface CatalogItem {
  id: string;
  name: string;
  description: string;
  price?: number;
  images?: string[];   // array de URLs (primera = portada)
  category: string;   // categoryId (UUID) para datos nuevos, nombre para datos viejos
  subcategoryId?: string | null;
  available?: boolean;
  /** Products specific */
  sizes?: string[];
  colors?: string[];
  brand?: string;
}

export interface CatalogTheme {
  bgType: 'solid' | 'gradient' | 'image';
  bgValue: string; // color hex, CSS gradient, or image URL
  primaryColor: string;
  secondaryColor: string;
  fontFamily: string;
  borderRadius: 'none' | 'sm' | 'md' | 'lg' | 'full';
  layout?: 'list' | 'grid' | 'editorial' | 'minimal';
  categoryLayout?: '1' | '2' | '3';
  showTitle?: boolean;
  showDescription?: boolean;
  headerAlign?: 'left' | 'center' | 'right';
}

export interface Catalog {
  id: string;
  slug: string;
  type: CatalogType;
  title: string;
  description: string;
  logo?: string;
  instagram?: string;
  facebook?: string;
  tiktok?: string;
  theme: CatalogTheme;
  items: CatalogItem[];
  categories: (string | Category)[];
  createdAt: string;
  updatedAt: string;
}
