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

export type CanvasElementType = 'text' | 'image' | 'product';

/** Un elemento libre en el canvas (texto, imagen o producto) */
export interface CanvasElement {
  id: string;
  type: CanvasElementType;
  /** Posición y tamaño en el espacio de referencia 800×450 px */
  x: number;
  y: number;
  w: number;
  h: number;
  /** Texto */
  text?: string;
  fontSize?: number;        // px en espacio 800×450
  color?: string;           // hex
  fontFamily?: string;
  fontWeight?: string;      // 'normal' | 'bold'
  fontStyle?: string;       // 'normal' | 'italic'
  textAlign?: 'left' | 'center' | 'right';
  bgColor?: string;         // '' = transparente
  borderRadius?: number;    // px
  opacity?: number;         // 0-1
  /** Imagen independiente */
  imageUrl?: string;
  objectFit?: 'cover' | 'contain' | 'fill';
  /** Producto del catálogo */
  productId?: string;
  productStyle?: 'card' | 'minimal';
}

/** Una página del canvas libre — tiene su propio fondo y elementos */
export interface CanvasPage {
  id: string;
  bgType: 'solid' | 'gradient' | 'image';
  bgValue: string;
  elements: CanvasElement[];
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
  layout?: 'list' | 'grid' | 'editorial' | 'minimal' | 'canvas';
  categoryLayout?: '1' | '2' | '3';
  showTitle?: boolean;
  showDescription?: boolean;
  headerAlign?: 'left' | 'center' | 'right';
  /** Canvas libre: páginas del lienzo (cada una con su fondo y elementos) */
  canvasPages?: CanvasPage[];
  /** @deprecated reemplazado por canvasPages — se usa solo para migración */
  canvasElements?: CanvasElement[];
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
  googleMaps?: string;
  theme: CatalogTheme;
  items: CatalogItem[];
  categories: (string | Category)[];
  createdAt: string;
  updatedAt: string;
}
