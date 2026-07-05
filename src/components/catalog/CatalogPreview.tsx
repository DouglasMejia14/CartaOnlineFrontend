import { useState, useRef, useEffect } from "react";
import type { Catalog, CatalogItem, CatalogTheme } from "../../types";
import { getCategoryId, getCategoryName, isItemInCategory, formatPrice } from "../../utils/catalog";

// Canvas reference dimensions (must match CanvasEditor)
const CANVAS_CW = 800;
const CANVAS_CH = 450;

interface Props {
  catalog: Catalog;
  fullPage?: boolean;
}

const RADIUS_MAP: Record<CatalogTheme["borderRadius"], string> = {
  none: "rounded-none",
  sm: "rounded",
  md: "rounded-xl",
  lg: "rounded-2xl",
  full: "rounded-3xl",
};

function getBackground(theme: CatalogTheme): React.CSSProperties {
  if (theme.bgType === "solid") return { backgroundColor: theme.bgValue };
  if (theme.bgType === "gradient") return { background: theme.bgValue };
  // image or gif
  return {
    backgroundImage: `url(${theme.bgValue})`,
    backgroundSize: "cover",
    backgroundPosition: "center",
    backgroundRepeat: "no-repeat",
  };
}

function isDarkBackground(theme: CatalogTheme): boolean {
  if (theme.bgType === "image") return true; // asumir oscuro para imagen/gif
  if (theme.bgType === "gradient") {
    const dark = ["#0f", "#1a", "#16", "#24", "#0c", "#1b", "#2d", "#00", "#10", "#20"];
    return dark.some((d) => theme.bgValue.toLowerCase().includes(d));
  }
  if (theme.bgValue.startsWith("#")) {
    const hex = theme.bgValue.slice(1);
    const r = parseInt(hex.slice(0, 2), 16);
    const g = parseInt(hex.slice(2, 4), 16);
    const b = parseInt(hex.slice(4, 6), 16);
    return (0.299 * r + 0.587 * g + 0.114 * b) / 255 < 0.5;
  }
  return true;
}

export default function CatalogPreview({ catalog, fullPage = false }: Props) {
  const { theme } = catalog;
  const bg = getBackground(theme);
  const radius = RADIUS_MAP[theme.borderRadius];
  const isDark = isDarkBackground(theme);
  const layout = theme.layout ?? 'list';
  const align = theme.headerAlign ?? 'center';

  const [selectedCategory, setSelectedCategory] = useState<string | null>(null);
  const [selectedSubcategory, setSelectedSubcategory] = useState<string | null>(null);
  const [selectedBrand, setSelectedBrand] = useState<string | null>(null);
  const [openItem, setOpenItem] = useState<CatalogItem | null>(null);

  // Canvas scaling (used only when layout === 'canvas')
  const canvasContainerRef = useRef<HTMLDivElement>(null);
  const [canvasScale, setCanvasScale] = useState(1);
  useEffect(() => {
    if (layout !== 'canvas') return;
    const el = canvasContainerRef.current;
    if (!el) return;
    const update = () => setCanvasScale(el.clientWidth / CANVAS_CW);
    update();
    const ro = new ResizeObserver(update);
    ro.observe(el);
    return () => ro.disconnect();
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [layout]);

  function selectCategory(catId: string | null) {
    setSelectedCategory(catId);
    setSelectedSubcategory(null);
  }

  const textColor = isDark ? "#ffffff" : "#111827";
  const subColor = isDark ? "rgba(255,255,255,0.65)" : "rgba(0,0,0,0.55)";
  const headerBg = isDark ? "rgba(0,0,0,0.40)" : "rgba(255,255,255,0.40)";
  const alignClass = align === 'left' ? 'items-start' : align === 'right' ? 'items-end' : 'items-center';
  const textAlign = align as React.CSSProperties['textAlign'];

  // -- EDITOR PREVIEW: muestra todos los items agrupados (sin portada) ---------
  if (!fullPage) {
    return (
      <>
      <div style={{ ...bg, fontFamily: theme.fontFamily }} className="h-[620px] overflow-y-auto">
        {/* Mini header */}
        <div
          style={{ backgroundColor: headerBg, backdropFilter: "blur(12px)", WebkitBackdropFilter: "blur(12px)" }}
          className="sticky top-0 z-20 border-b border-white/10 px-4 py-3 flex items-center gap-3"
        >
          {catalog.logo && (
            <img src={catalog.logo} alt="logo" className="w-7 h-7 object-contain rounded flex-shrink-0" />
          )}
          <div style={{ color: textColor }} className="font-bold text-sm truncate flex-1">
            {catalog.title || "Mi carta"}
          </div>
          <span style={{ color: theme.primaryColor }} className="text-xs font-semibold opacity-70 capitalize">
            {layout}
          </span>
        </div>

        {/* Items agrupados */}
        <div className="px-4 py-5 space-y-7">
          {catalog.items.length === 0 ? (
            <p style={{ color: isDark ? "rgba(255,255,255,0.35)" : "rgba(0,0,0,0.3)" }} className="text-sm text-center py-16">
              Agrega productos desde el panel de edicion
            </p>
          ) : catalog.categories.length > 0 ? (
            catalog.categories.map((cat) => {
              const catId = getCategoryId(cat);
              const catName = getCategoryName(cat);
              const catItems = catalog.items.filter((i) => isItemInCategory(i.category, cat));
              if (catItems.length === 0) return null;
              const subcategories = typeof cat !== 'string' ? cat.subcategories : [];
              const hasSubcategories = subcategories.some((s) => catItems.some((i) => i.subcategoryId === s.id));
              return (
                <section key={catId}>
                  <h2
                    style={{ color: theme.primaryColor, borderColor: theme.primaryColor + "40" }}
                    className="text-xs font-bold uppercase tracking-widest mb-3 pb-1.5 border-b"
                  >
                    {catName}{" "}
                    <span style={{ color: isDark ? "rgba(255,255,255,0.3)" : "rgba(0,0,0,0.25)" }} className="font-normal normal-case tracking-normal">
                      ({catItems.length})
                    </span>
                  </h2>
                  {hasSubcategories ? (
                    <>
                      {subcategories.map((sub) => {
                        const subItems = catItems.filter((i) => i.subcategoryId === sub.id);
                        if (subItems.length === 0) return null;
                        return (
                          <div key={sub.id} className="mb-4">
                            <h3 style={{ color: isDark ? "rgba(255,255,255,0.5)" : "rgba(0,0,0,0.45)" }} className="text-[11px] font-semibold uppercase tracking-widest mb-2 pl-0.5">
                              {sub.name}
                            </h3>
                            <LayoutItems layout={layout} items={subItems} theme={theme} isDark={isDark} radius={radius} fullPage={false} onOpen={setOpenItem} />
                          </div>
                        );
                      })}
                      {(() => {
                        const noSub = catItems.filter((i) => !i.subcategoryId);
                        if (noSub.length === 0) return null;
                        return <LayoutItems layout={layout} items={noSub} theme={theme} isDark={isDark} radius={radius} fullPage={false} onOpen={setOpenItem} />;
                      })()}
                    </>
                  ) : (
                    <LayoutItems layout={layout} items={catItems} theme={theme} isDark={isDark} radius={radius} fullPage={false} onOpen={setOpenItem} />
                  )}
                </section>
              );
            })
          ) : (
            <LayoutItems layout={layout} items={catalog.items} theme={theme} isDark={isDark} radius={radius} fullPage={false} onOpen={setOpenItem} />
          )}
        </div>
      </div>
      {openItem && <ProductModal item={openItem} theme={theme} isDark={isDark} onClose={() => setOpenItem(null)} />}
      </>
    );
  }

  // -- VISTA PÚBLICA: Canvas libre multi-página --------------------------------
  if (layout === 'canvas') {
    // Obtener páginas (con migración desde canvasElements)
    const rawPages = theme.canvasPages;
    const pages = rawPages && rawPages.length > 0
      ? rawPages
      : [{
          id: 'legacy',
          bgType: theme.bgType,
          bgValue: theme.bgValue,
          elements: theme.canvasElements ?? [],
        }];

    // Colectar todos los productIds que aparecen en alguna página
    const allPlacedIds = new Set(
      pages.flatMap((p) => p.elements.filter((e) => e.type === 'product').map((e) => e.productId))
    );
    const unplacedItems = catalog.items.filter((i) => !allPlacedIds.has(i.id));

    function getPageBg(page: { bgType: string; bgValue: string }): React.CSSProperties {
      if (page.bgType === 'image' && page.bgValue)
        return { backgroundImage: `url(${page.bgValue})`, backgroundSize: 'cover', backgroundPosition: 'center', backgroundRepeat: 'no-repeat' };
      if (page.bgType === 'gradient')
        return { background: page.bgValue || '#1a1a2e' };
      return { backgroundColor: page.bgValue || '#1a1a2e' };
    }

    function renderElement(el: NonNullable<typeof pages[0]['elements'][0]>, idx: number) {
      const s: React.CSSProperties = {
        position: 'absolute', left: el.x, top: el.y, width: el.w, height: el.h,
        opacity: el.opacity ?? 1, borderRadius: el.borderRadius ?? 0,
        overflow: 'hidden', zIndex: idx + 1,
      };
      if (el.type === 'text') return (
        <div key={el.id} style={s}>
          <div style={{ width: '100%', height: '100%', backgroundColor: el.bgColor || 'transparent',
            borderRadius: el.borderRadius ?? 0, display: 'flex', alignItems: 'center',
            padding: '6px 10px', boxSizing: 'border-box' }}>
            <span style={{ width: '100%', fontSize: el.fontSize ?? 24, color: el.color ?? '#fff',
              fontFamily: el.fontFamily ?? theme.fontFamily, fontWeight: el.fontWeight ?? 'bold',
              fontStyle: el.fontStyle ?? 'normal', textAlign: el.textAlign ?? 'center',
              wordBreak: 'break-word', whiteSpace: 'pre-wrap', lineHeight: 1.25 }}>
              {el.text ?? ''}
            </span>
          </div>
        </div>
      );
      if (el.type === 'image') return (
        <div key={el.id} style={s}>
          <img src={el.imageUrl} alt="" draggable={false}
            style={{ width: '100%', height: '100%', objectFit: el.objectFit ?? 'cover', display: 'block' }} />
        </div>
      );
      if (el.type === 'product') {
        const product = catalog.items.find((i) => i.id === el.productId);
        if (!product) return null;
        return (
          <div key={el.id} style={{ ...s, cursor: 'pointer' }} onClick={() => setOpenItem(product)}>
            {el.productStyle === 'minimal' ? (
              <div style={{ width: '100%', height: '100%', backgroundColor: 'rgba(0,0,0,0.62)',
                backdropFilter: 'blur(6px)', display: 'flex', flexDirection: 'column',
                alignItems: 'center', justifyContent: 'center', padding: 10, gap: 4, boxSizing: 'border-box' }}>
                <span style={{ color: '#fff', fontWeight: 700, fontSize: 14, textAlign: 'center',
                  lineHeight: 1.2, wordBreak: 'break-word', width: '100%' }}>{product.name}</span>
                {product.price !== undefined && (
                  <span style={{ color: theme.primaryColor, fontWeight: 800, fontSize: 16 }}>
                    ${formatPrice(product.price)}
                  </span>
                )}
              </div>
            ) : (
              <div style={{ width: '100%', height: '100%', display: 'flex', flexDirection: 'column',
                backgroundColor: 'rgba(0,0,0,0.65)', backdropFilter: 'blur(4px)' }}>
                {product.images?.[0] && (
                  <div style={{ flex: 1, minHeight: 0, overflow: 'hidden' }}>
                    <img src={product.images[0]} alt={product.name} draggable={false}
                      style={{ width: '100%', height: '100%', objectFit: 'cover', display: 'block' }} />
                  </div>
                )}
                <div style={{ flexShrink: 0, padding: '6px 8px', backgroundColor: 'rgba(0,0,0,0.55)' }}>
                  <div style={{ color: '#fff', fontWeight: 700, fontSize: 12,
                    overflow: 'hidden', whiteSpace: 'nowrap', textOverflow: 'ellipsis' }}>{product.name}</div>
                  {product.price !== undefined && (
                    <div style={{ color: theme.primaryColor, fontWeight: 800, fontSize: 11, marginTop: 2 }}>
                      ${formatPrice(product.price)}
                    </div>
                  )}
                </div>
              </div>
            )}
          </div>
        );
      }
      return null;
    }

    return (
      <>
      <div style={{ fontFamily: theme.fontFamily, backgroundColor: '#0a0a0f' }} className="min-h-screen">
        {/* Sticky header */}
        <div style={{ backgroundColor: 'rgba(0,0,0,0.55)', backdropFilter: 'blur(12px)', WebkitBackdropFilter: 'blur(12px)' }}
          className="sticky top-0 z-20 border-b border-white/10 px-4 py-3 flex items-center gap-3">
          {catalog.logo && (
            <img src={catalog.logo} alt="logo" className="w-8 h-8 object-contain rounded flex-shrink-0" />
          )}
          <div style={{ color: '#ffffff' }} className="font-bold text-sm truncate flex-1">
            {catalog.title || 'Mi carta'}
          </div>
          {pages.length > 1 && (
            <span style={{ color: 'rgba(255,255,255,0.4)' }} className="text-xs flex-shrink-0">
              {pages.length} páginas
            </span>
          )}
        </div>

        {/* All pages stacked — ref on outer wrapper for scale */}
        <div ref={canvasContainerRef} className="w-full">
          {pages.map((page, pidx) => (
            <div key={page.id} className="relative w-full" style={{ height: `${CANVAS_CH * canvasScale}px` }}>
              <div className="absolute top-0 left-0"
                style={{ width: CANVAS_CW, height: CANVAS_CH,
                  transform: `scale(${canvasScale})`, transformOrigin: 'top left',
                  ...getPageBg(page) }}>
                {page.elements.map((el, idx) => renderElement(el, idx))}
                {page.elements.length === 0 && pidx === 0 && (
                  <div style={{ position: 'absolute', inset: 0, display: 'flex', alignItems: 'center',
                    justifyContent: 'center', color: 'rgba(255,255,255,0.15)', fontSize: 14 }}>
                    Diseño vacío
                  </div>
                )}
              </div>
              {/* Page separator */}
              {pidx < pages.length - 1 && (
                <div className="absolute bottom-0 left-0 right-0 h-1 bg-black/40 z-10" />
              )}
            </div>
          ))}
        </div>

        {/* Unplaced products (fallback list) */}
        {unplacedItems.length > 0 && (
          <div className="max-w-2xl mx-auto px-4 py-6">
            <p style={{ color: 'rgba(255,255,255,0.3)' }} className="text-xs uppercase tracking-wider font-semibold mb-4">
              Ver también
            </p>
            <LayoutItems layout="list" items={unplacedItems} theme={theme}
              isDark={true} radius={radius} fullPage={true} onOpen={setOpenItem} />
          </div>
        )}
      </div>
      {openItem && <ProductModal item={openItem} theme={theme} isDark={true} onClose={() => setOpenItem(null)} />}
      </>
    );
  }

  // -- VISTA PÚBLICA: portada de categorías → items de la categoría ------------
  const categoriesWithItems = catalog.categories.filter((cat) =>
    catalog.items.some((i) => isItemInCategory(i.category, cat))
  );

  const availableBrands = [...new Set(
    catalog.items.map((i) => i.brand).filter((b): b is string => !!b)
  )].sort();

  // -- Vista de marca: todos los productos de una marca (cross-categoría) ------
  if (selectedBrand !== null) {
    const brandItems = catalog.items.filter((i) => i.brand === selectedBrand);
    const brandGrouped: Record<string, CatalogItem[]> = {};
    for (const item of brandItems) {
      // Resolve category name for display
      const matchedCat = catalog.categories.find((c) => isItemInCategory(item.category, c));
      const catLabel = matchedCat ? getCategoryName(matchedCat) : (item.category || 'Sin categoría');
      if (!brandGrouped[catLabel]) brandGrouped[catLabel] = [];
      brandGrouped[catLabel].push(item);
    }
    const brandCats = Object.keys(brandGrouped);

    return (
      <>
      <div style={{ ...bg, fontFamily: theme.fontFamily }} className="min-h-screen">
        {/* Sticky header */}
        <div
          style={{ backgroundColor: headerBg, backdropFilter: "blur(12px)", WebkitBackdropFilter: "blur(12px)" }}
          className="sticky top-0 z-20 border-b border-white/10 px-4 py-3 flex items-center gap-3"
        >
          <button
            onClick={() => setSelectedBrand(null)}
            style={{ color: textColor }}
            className="text-sm font-medium flex items-center gap-1 flex-shrink-0 opacity-75 hover:opacity-100 transition-opacity"
          >
            &larr;&nbsp;<span className="hidden sm:inline">Volver</span>
          </button>
          <div className="flex-1 min-w-0 flex items-center gap-2">
            <span
              style={{ backgroundColor: theme.primaryColor + '25', color: theme.primaryColor }}
              className="text-xs font-bold uppercase tracking-widest px-2.5 py-1 rounded-full"
            >
              {selectedBrand}
            </span>
            <span style={{ color: isDark ? 'rgba(255,255,255,0.4)' : 'rgba(0,0,0,0.35)' }} className="text-xs">
              {brandItems.length} producto{brandItems.length !== 1 ? 's' : ''}
            </span>
          </div>
          {catalog.logo && (
            <img src={catalog.logo} alt="logo" className="w-8 h-8 object-contain rounded flex-shrink-0 opacity-90" />
          )}
        </div>

        {/* Items agrupados por categoría */}
        <div className="max-w-2xl mx-auto px-4 py-5 space-y-7">
          {brandItems.length === 0 ? (
            <p style={{ color: isDark ? 'rgba(255,255,255,0.35)' : 'rgba(0,0,0,0.3)' }} className="text-sm text-center py-16">
              Sin productos de esta marca
            </p>
          ) : (
            <>
              {brandCats.map((cat) => (
                <section key={cat}>
                  <h2
                    style={{ color: theme.primaryColor, borderColor: theme.primaryColor + '40' }}
                    className="text-xs font-bold uppercase tracking-widest mb-3 pb-1.5 border-b"
                  >
                    {cat}{' '}
                    <span style={{ color: isDark ? 'rgba(255,255,255,0.3)' : 'rgba(0,0,0,0.25)' }} className="font-normal normal-case tracking-normal">
                      ({brandGrouped[cat].length})
                    </span>
                  </h2>
                  <LayoutItems
                    layout={layout}
                    items={brandGrouped[cat]}
                    theme={theme}
                    isDark={isDark}
                    radius={radius}
                    fullPage={true}
                    onOpen={setOpenItem}
                  />
                </section>
              ))}
            </>
          )}
        </div>
      </div>
      {openItem && <ProductModal item={openItem} theme={theme} isDark={isDark} onClose={() => setOpenItem(null)} />}
      </>
    );
  }

  if (selectedCategory === null) {
    const btnBg = isDark ? 'rgba(255,255,255,0.05)' : 'rgba(0,0,0,0.03)';
    const hasSocial = catalog.instagram || catalog.facebook || catalog.tiktok;

    return (
      <>
      <div
        style={{ ...bg, fontFamily: theme.fontFamily }}
        className="min-h-screen flex items-center justify-center px-6 py-12"
      >
        <div className={`flex flex-col ${alignClass} gap-5 w-full max-w-xs`}>
          {/* Logo */}
          {catalog.logo && (
            <img
              src={catalog.logo}
              alt="logo"
              className="w-40 h-40 object-contain"
              style={{
                filter: isDark
                  ? "drop-shadow(0 4px 24px rgba(0,0,0,0.8))"
                  : "drop-shadow(0 4px 16px rgba(0,0,0,0.25))",
              }}
            />
          )}

          {/* Title + description */}
          {((theme.showTitle !== false) || ((theme.showDescription !== false) && catalog.description)) && (
            <div className={`flex flex-col ${alignClass} gap-1`}>
              {(theme.showTitle !== false) && (
                <h1 style={{ color: textColor, textAlign }} className="text-2xl font-black leading-tight">
                  {catalog.title || "Mi carta"}
                </h1>
              )}
              {(theme.showDescription !== false) && catalog.description && (
                <p style={{ color: subColor, textAlign }} className="text-sm leading-relaxed">
                  {catalog.description}
                </p>
              )}
            </div>
          )}

          {/* Categories or direct items */}
          {categoriesWithItems.length > 0 ? (
            <div className="w-full flex flex-col gap-3">
              {categoriesWithItems.map((cat) => {
                const catId = getCategoryId(cat);
                const catName = getCategoryName(cat);
                return (
                  <button
                    key={catId}
                    onClick={() => selectCategory(catId)}
                    className="w-full py-4 px-6 rounded-full font-semibold text-base border-2 active:opacity-60 transition-opacity"
                    style={{
                      borderColor: theme.primaryColor,
                      color: textColor,
                      backgroundColor: btnBg,
                    }}
                  >
                    {catName}
                  </button>
                );
              })}
            </div>
          ) : catalog.items.length > 0 ? (
            <div className="w-full">
              <LayoutItems
                layout={layout}
                items={catalog.items}
                theme={theme}
                isDark={isDark}
                radius={radius}
                fullPage={true}
                onOpen={setOpenItem}
              />
            </div>
          ) : (
            <p style={{ color: isDark ? "rgba(255,255,255,0.35)" : "rgba(0,0,0,0.3)" }} className="text-sm text-center py-8">
              Agrega categorias y productos desde el editor
            </p>
          )}

          {/* Brand filter */}
          {availableBrands.length > 0 && (
            <div className="w-full">
              <p style={{ color: subColor }} className="text-xs font-semibold uppercase tracking-widest mb-3 text-center">
                Filtrar por marca
              </p>
              <div className="flex flex-wrap justify-center gap-2">
                {availableBrands.map((brand) => (
                  <button
                    key={brand}
                    onClick={() => setSelectedBrand(brand)}
                    className="px-4 py-1.5 rounded-full text-sm font-semibold border transition-all active:opacity-60"
                    style={{
                      borderColor: theme.primaryColor + '60',
                      color: textColor,
                      backgroundColor: theme.primaryColor + '15',
                    }}
                  >
                    {brand}
                  </button>
                ))}
              </div>
            </div>
          )}

          {/* Social links */}
          {hasSocial && (
            <div className="flex flex-col items-center gap-3 mt-2">
              <p style={{ color: subColor }} className="text-xs font-semibold tracking-widest uppercase">
                Síguenos
              </p>
              <div className="flex gap-6">
                {catalog.instagram && (
                  <a href={catalog.instagram} target="_blank" rel="noopener noreferrer" style={{ color: theme.primaryColor }}>
                    <SvgInstagram />
                  </a>
                )}
                {catalog.facebook && (
                  <a href={catalog.facebook} target="_blank" rel="noopener noreferrer" style={{ color: theme.primaryColor }}>
                    <SvgFacebook />
                  </a>
                )}
                {catalog.tiktok && (
                  <a href={catalog.tiktok} target="_blank" rel="noopener noreferrer" style={{ color: theme.primaryColor }}>
                    <SvgTiktok />
                  </a>
                )}
              </div>
            </div>
          )}
        </div>
      </div>
      {openItem && <ProductModal item={openItem} theme={theme} isDark={isDark} onClose={() => setOpenItem(null)} />}
      </>
    );
  }

  // Categoría seleccionada → lista de items con tabs de subcategoría
  const currentCat = catalog.categories.find((c) => getCategoryId(c) === selectedCategory) ?? null;
  const currentCatName = currentCat ? getCategoryName(currentCat) : selectedCategory;
  const allCatItems = currentCat
    ? catalog.items.filter((i) => isItemInCategory(i.category, currentCat))
    : catalog.items.filter((i) => i.category === selectedCategory);

  const subcategories = (currentCat && typeof currentCat !== 'string') ? currentCat.subcategories : [];
  // Only show subcategories that actually have items
  const visibleSubs = subcategories.filter((s) => allCatItems.some((i) => i.subcategoryId === s.id));

  // Items shown depend on selected subcategory tab
  const items = selectedSubcategory
    ? allCatItems.filter((i) => i.subcategoryId === selectedSubcategory)
    : allCatItems;

  return (
    <>
    <div style={{ ...bg, fontFamily: theme.fontFamily }} className="min-h-screen">
      {/* Sticky header */}
      <div
        style={{ backgroundColor: headerBg, backdropFilter: "blur(12px)", WebkitBackdropFilter: "blur(12px)" }}
        className="sticky top-0 z-20 border-b border-white/10"
      >
        {/* Row 1: back + title + logo */}
        <div className="px-4 py-3 flex items-center gap-3">
          <button
            onClick={() => selectCategory(null)}
            style={{ color: textColor }}
            className="text-sm font-medium flex items-center gap-1 flex-shrink-0 opacity-75 hover:opacity-100 transition-opacity"
          >
            &larr;&nbsp;<span className="hidden sm:inline">Menu</span>
          </button>
          <div className="flex-1 min-w-0">
            <div style={{ color: textColor }} className="font-bold text-sm truncate">{currentCatName}</div>
          </div>
          {catalog.logo && (
            <img src={catalog.logo} alt="logo" className="w-8 h-8 object-contain rounded flex-shrink-0 opacity-90" />
          )}
        </div>

        {/* Row 2: subcategory tabs (only when category has subcategories with items) */}
        {visibleSubs.length > 0 && (
          <div className="flex gap-2 px-4 pb-3 overflow-x-auto scrollbar-hide">
            <button
              onClick={() => setSelectedSubcategory(null)}
              className="flex-shrink-0 px-4 py-1.5 rounded-full text-xs font-semibold transition-all"
              style={{
                backgroundColor: !selectedSubcategory ? theme.primaryColor : (isDark ? 'rgba(255,255,255,0.08)' : 'rgba(0,0,0,0.06)'),
                color: !selectedSubcategory ? '#fff' : (isDark ? 'rgba(255,255,255,0.7)' : 'rgba(0,0,0,0.6)'),
              }}
            >
              Todo
            </button>
            {visibleSubs.map((sub) => {
              const isActive = selectedSubcategory === sub.id;
              return (
                <button
                  key={sub.id}
                  onClick={() => setSelectedSubcategory(sub.id)}
                  className="flex-shrink-0 px-4 py-1.5 rounded-full text-xs font-semibold transition-all"
                  style={{
                    backgroundColor: isActive ? theme.primaryColor : (isDark ? 'rgba(255,255,255,0.08)' : 'rgba(0,0,0,0.06)'),
                    color: isActive ? '#fff' : (isDark ? 'rgba(255,255,255,0.7)' : 'rgba(0,0,0,0.6)'),
                  }}
                >
                  {sub.name}
                </button>
              );
            })}
          </div>
        )}
      </div>

      {/* Items */}
      <div className="max-w-2xl mx-auto px-4 py-5">
        {items.length === 0 ? (
          <p style={{ color: isDark ? "rgba(255,255,255,0.35)" : "rgba(0,0,0,0.3)" }} className="text-sm text-center py-16">
            Sin productos en esta categoria
          </p>
        ) : (
          <LayoutItems layout={layout} items={items} theme={theme} isDark={isDark} radius={radius} fullPage={true} onOpen={setOpenItem} />
        )}
      </div>
      {openItem && <ProductModal item={openItem} theme={theme} isDark={isDark} onClose={() => setOpenItem(null)} />}
    </div>
    </>
  );
}

function ItemCard({
  item, theme, isDark, radius, onOpen,
}: {
  item: CatalogItem;
  theme: CatalogTheme;
  isDark: boolean;
  radius: string;
  onOpen: (item: CatalogItem) => void;
}) {
  const images = item.images ?? [];
  const cardBg = isDark ? "rgba(255,255,255,0.08)" : "rgba(0,0,0,0.05)";
  const cardBorder = isDark ? "rgba(255,255,255,0.1)" : "rgba(0,0,0,0.08)";
  const textColor = isDark ? "#ffffff" : "#111827";
  const subColor = isDark ? "rgba(255,255,255,0.6)" : "rgba(0,0,0,0.55)";

  return (
    <div
      onClick={() => onOpen(item)}
      style={{ backgroundColor: cardBg, borderColor: cardBorder, backdropFilter: "blur(4px)" }}
      className={`flex gap-3 p-3 border ${radius} cursor-pointer active:scale-[0.98] transition-transform`}
    >
      {images.length > 0 && (
        <div className={`relative flex-shrink-0 w-16 h-16 ${radius} overflow-hidden bg-black/10`}>
          <img
            src={images[0]}
            alt={item.name}
            className="w-full h-full object-cover"
            loading="lazy"
            decoding="async"
            onError={(e) => { (e.target as HTMLImageElement).style.opacity = "0"; }}
          />
          {images.length > 1 && (
            <div className="absolute bottom-0.5 right-0.5 bg-black/60 text-white text-[10px] px-1 rounded-full leading-4">
              +{images.length - 1}
            </div>
          )}
        </div>
      )}
      <div className="flex-1 min-w-0">
        <div style={{ color: textColor }} className="font-semibold text-sm leading-tight">
          {item.name}
        </div>
        {item.brand && (
          <div style={{ color: theme.primaryColor, opacity: 0.8 }} className="text-[10px] font-semibold uppercase tracking-wider mt-0.5">
            {item.brand}
          </div>
        )}
        {item.description && (
          <p style={{ color: subColor }} className="text-xs mt-0.5 line-clamp-2">
            {item.description}
          </p>
        )}
        {item.sizes && item.sizes.length > 0 && (
          <div className="flex gap-1 mt-1.5 flex-wrap">
            {item.sizes.map((s) => (
              <span
                key={s}
                style={{ borderColor: theme.primaryColor + "60", color: theme.primaryColor }}
                className="text-xs border px-1.5 py-0.5 rounded font-mono"
              >
                {s}
              </span>
            ))}
          </div>
        )}
      </div>
      {item.price !== undefined && (
        <div style={{ color: theme.primaryColor }} className="text-sm font-bold flex-shrink-0 self-start mt-0.5">
          ${formatPrice(item.price)}
        </div>
      )}
    </div>
  );
}

// --- Layout dispatcher --------------------------------------------------------
function LayoutItems({
  layout, items, theme, isDark, radius, fullPage, onOpen,
}: {
  layout: string;
  items: CatalogItem[];
  theme: CatalogTheme;
  isDark: boolean;
  radius: string;
  fullPage: boolean;
  onOpen: (item: CatalogItem) => void;
}) {
  if (items.length === 0) return null;
  switch (layout) {
    case 'grid':
      return (
        <div className={`grid gap-3 ${fullPage ? "grid-cols-2 sm:grid-cols-3" : "grid-cols-2"}`}>
          {items.map((item) => (
            <GridCard key={item.id} item={item} theme={theme} isDark={isDark} radius={radius} onOpen={onOpen} />
          ))}
        </div>
      );
    case 'editorial':
      return <EditorialLayout items={items} theme={theme} isDark={isDark} radius={radius} fullPage={fullPage} onOpen={onOpen} />;
    case 'minimal':
      return (
        <div>
          {items.map((item) => (
            <MinimalItem key={item.id} item={item} theme={theme} isDark={isDark} onOpen={onOpen} />
          ))}
        </div>
      );
    default: // 'list'
      return (
        <div className={`grid gap-3 ${fullPage ? "grid-cols-1 sm:grid-cols-2" : "grid-cols-1"}`}>
          {items.map((item) => (
            <ItemCard key={item.id} item={item} theme={theme} isDark={isDark} radius={radius} onOpen={onOpen} />
          ))}
        </div>
      );
  }
}

// --- Grid card ----------------------------------------------------------------
function GridCard({
  item, theme, isDark, radius, onOpen,
}: {
  item: CatalogItem;
  theme: CatalogTheme;
  isDark: boolean;
  radius: string;
  onOpen: (item: CatalogItem) => void;
}) {
  const images = item.images ?? [];
  const cardBg = isDark ? "rgba(255,255,255,0.08)" : "rgba(0,0,0,0.05)";
  const cardBorder = isDark ? "rgba(255,255,255,0.1)" : "rgba(0,0,0,0.08)";
  const textColor = isDark ? "#ffffff" : "#111827";
  const subColor = isDark ? "rgba(255,255,255,0.6)" : "rgba(0,0,0,0.55)";

  return (
    <div
      onClick={() => onOpen(item)}
      style={{ backgroundColor: cardBg, borderColor: cardBorder }}
      className={`border ${radius} overflow-hidden flex flex-col cursor-pointer active:scale-[0.97] transition-transform`}
    >
      {images.length > 0 && (
        <div className="relative aspect-square overflow-hidden flex-shrink-0 bg-black/10">
          <img
            src={images[0]}
            alt={item.name}
            className="w-full h-full object-cover"
            loading="lazy"
            decoding="async"
            onError={(e) => { (e.target as HTMLImageElement).style.opacity = "0"; }}
          />
          {images.length > 1 && (
            <div className="absolute bottom-1.5 right-1.5 bg-black/60 text-white text-[10px] px-1.5 rounded-full leading-5">
              +{images.length - 1}
            </div>
          )}
        </div>
      )}
      <div className="p-2.5 flex flex-col flex-1">
        <div style={{ color: textColor }} className="font-semibold text-sm leading-tight">
          {item.name}
        </div>
        {item.brand && (
          <div style={{ color: theme.primaryColor, opacity: 0.8 }} className="text-[10px] font-semibold uppercase tracking-wider mt-0.5">
            {item.brand}
          </div>
        )}
        {item.description && (
          <p style={{ color: subColor }} className="text-xs mt-0.5 line-clamp-2 flex-1">
            {item.description}
          </p>
        )}
        {item.price !== undefined && (
          <div style={{ color: theme.primaryColor }} className="text-sm font-bold mt-1.5">
            ${formatPrice(item.price)}
          </div>
        )}
      </div>
    </div>
  );
}

// --- Editorial layout ---------------------------------------------------------
function EditorialLayout({
  items, theme, isDark, radius, fullPage, onOpen,
}: {
  items: CatalogItem[];
  theme: CatalogTheme;
  isDark: boolean;
  radius: string;
  fullPage: boolean;
  onOpen: (item: CatalogItem) => void;
}) {
  const [hero, ...rest] = items;
  const subColor = isDark ? "rgba(255,255,255,0.6)" : "rgba(0,0,0,0.55)";
  const cardBg = isDark ? "rgba(255,255,255,0.08)" : "rgba(0,0,0,0.05)";
  const cardBorder = isDark ? "rgba(255,255,255,0.1)" : "rgba(0,0,0,0.08)";
  const heroImages = hero.images ?? [];
  const textColor = isDark ? "#ffffff" : "#111827";

  return (
    <div className="space-y-3">
      {/* Hero item */}
      <div
        onClick={() => onOpen(hero)}
      style={{ backgroundColor: cardBg, borderColor: cardBorder }}
      className={`border ${radius} overflow-hidden cursor-pointer active:scale-[0.99] transition-transform`}
    >
        {heroImages.length > 0 ? (
          <>
            <div className="relative h-44 overflow-hidden bg-black/10">
              <img
                src={heroImages[0]}
                alt={hero.name}
                className="w-full h-full object-cover"
                loading="lazy"
                decoding="async"
                onError={(e) => { (e.target as HTMLImageElement).style.opacity = "0"; }}
              />
              <div className="absolute inset-0 bg-gradient-to-t from-black/75 to-transparent" />
              <div className="absolute bottom-3 left-3 right-3">
                <div className="text-white font-bold text-base leading-tight drop-shadow">{hero.name}</div>
                {hero.price !== undefined && (
                  <div style={{ color: theme.primaryColor }} className="font-bold text-sm mt-0.5 drop-shadow">
                    ${formatPrice(hero.price)}
                  </div>
                )}
              </div>
            </div>
            {hero.description && (
              <div className="px-3 py-2">
                <p style={{ color: subColor }} className="text-xs line-clamp-2">{hero.description}</p>
              </div>
            )}
          </>
        ) : (
          <div className="p-4">
            <div style={{ color: textColor }} className="font-bold text-base">{hero.name}</div>
            {hero.description && (
              <p style={{ color: subColor }} className="text-xs mt-1 line-clamp-2">{hero.description}</p>
            )}
            {hero.price !== undefined && (
              <div style={{ color: theme.primaryColor }} className="font-bold text-sm mt-2">
                ${formatPrice(hero.price)}
              </div>
            )}
          </div>
        )}
      </div>

      {/* Rest in 2-col grid */}
      {rest.length > 0 && (
        <div className={`grid gap-2 ${fullPage ? "grid-cols-2 sm:grid-cols-3" : "grid-cols-2"}`}>
          {rest.map((item) => (
            <GridCard key={item.id} item={item} theme={theme} isDark={isDark} radius={radius} onOpen={onOpen} />
          ))}
        </div>
      )}
    </div>
  );
}

// --- Minimal item -------------------------------------------------------------
function MinimalItem({
  item, theme, isDark, onOpen,
}: {
  item: CatalogItem;
  theme: CatalogTheme;
  isDark: boolean;
  onOpen: (item: CatalogItem) => void;
}) {
  const textColor = isDark ? "#ffffff" : "#111827";
  const subColor = isDark ? "rgba(255,255,255,0.5)" : "rgba(0,0,0,0.5)";
  const divColor = isDark ? "rgba(255,255,255,0.08)" : "rgba(0,0,0,0.1)";

  return (
    <div
      onClick={() => onOpen(item)}
      style={{ borderBottomColor: divColor }}
      className="flex items-start gap-3 py-3 border-b last:border-b-0 cursor-pointer active:opacity-70 transition-opacity"
    >
      <div className="flex-1 min-w-0">
        <div style={{ color: textColor }} className="font-semibold text-sm">{item.name}</div>
        {item.brand && (
          <div style={{ color: theme.primaryColor, opacity: 0.8 }} className="text-[10px] font-semibold uppercase tracking-wider mt-0.5">
            {item.brand}
          </div>
        )}
        {item.description && (
          <p style={{ color: subColor }} className="text-xs mt-0.5 leading-relaxed">{item.description}</p>
        )}
      </div>
      {item.price !== undefined && (
        <div style={{ color: theme.primaryColor }} className="font-bold text-sm flex-shrink-0 ml-2 pt-0.5">
          ${formatPrice(item.price)}
        </div>
      )}
    </div>
  );
}

// --- Product modal ------------------------------------------------------------
function ProductModal({
  item, theme, isDark, onClose,
}: {
  item: CatalogItem;
  theme: CatalogTheme;
  isDark: boolean;
  onClose: () => void;
}) {
  const [imgIdx, setImgIdx] = useState(0);
  const images = item.images ?? [];
  const hasMany = images.length > 1;
  const textColor = isDark ? "#ffffff" : "#111827";
  const subColor = isDark ? "rgba(255,255,255,0.65)" : "rgba(0,0,0,0.55)";
  const modalBg = isDark ? "#141418" : "#ffffff";

  function prev() { setImgIdx((i) => (i - 1 + images.length) % images.length); }
  function next() { setImgIdx((i) => (i + 1) % images.length); }

  return (
    <div
      className="fixed inset-0 z-50 flex items-end sm:items-center justify-center"
      style={{ backgroundColor: "rgba(0,0,0,0.72)", backdropFilter: "blur(6px)" }}
      onClick={onClose}
    >
      <div
        className="w-full sm:max-w-sm max-h-[92vh] overflow-y-auto rounded-t-3xl sm:rounded-3xl flex flex-col"
        style={{ backgroundColor: modalBg }}
        onClick={(e) => e.stopPropagation()}
      >
        {/* Close */}
        <div className="flex justify-end px-4 pt-4 pb-1">
          <button
            onClick={onClose}
            style={{ color: subColor }}
            className="w-8 h-8 flex items-center justify-center rounded-full hover:bg-black/10 text-xl font-light transition-colors"
          >
            <svg width="16" height="16" viewBox="0 0 16 16" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round"><line x1="2" y1="2" x2="14" y2="14"/><line x1="14" y1="2" x2="2" y2="14"/></svg>
          </button>
        </div>

        {/* Gallery */}
        {images.length > 0 && (
          <div className="relative mx-4 rounded-2xl overflow-hidden bg-black/10" style={{ aspectRatio: "4/3" }}>
            <img
              src={images[imgIdx]}
              alt={`${item.name} ${imgIdx + 1}`}
              className="w-full h-full object-contain"
              onError={(e) => { (e.target as HTMLImageElement).style.opacity = "0"; }}
            />
            {hasMany && (
              <>
                <button
                  onClick={prev}
                  className="absolute left-2 top-1/2 -translate-y-1/2 w-9 h-9 rounded-full bg-black/50 hover:bg-black/70 text-white text-xl flex items-center justify-center transition-colors"
                >
                  <svg width="16" height="16" viewBox="0 0 16 16" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round"><polyline points="10 12 6 8 10 4"/></svg>
                </button>
                <button
                  onClick={next}
                  className="absolute right-2 top-1/2 -translate-y-1/2 w-9 h-9 rounded-full bg-black/50 hover:bg-black/70 text-white text-xl flex items-center justify-center transition-colors"
                >
                  <svg width="16" height="16" viewBox="0 0 16 16" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round"><polyline points="6 12 10 8 6 4"/></svg>
                </button>
                <div className="absolute bottom-2 left-0 right-0 flex justify-center gap-1.5">
                  {images.map((_, i) => (
                    <button
                      key={i}
                      onClick={() => setImgIdx(i)}
                      className="rounded-full transition-all"
                      style={{
                        width: i === imgIdx ? 8 : 5,
                        height: i === imgIdx ? 8 : 5,
                        backgroundColor: i === imgIdx ? "#fff" : "rgba(255,255,255,0.5)",
                      }}
                    />
                  ))}
                </div>
              </>
            )}
          </div>
        )}

        {/* Thumbnails */}
        {hasMany && (
          <div className="flex gap-2 px-4 mt-3 overflow-x-auto pb-1">
            {images.map((url, i) => (
              <button
                key={i}
                onClick={() => setImgIdx(i)}
                className="flex-shrink-0 w-14 h-14 rounded-xl overflow-hidden border-2 transition-all"
                style={{
                  borderColor: i === imgIdx ? theme.primaryColor : "transparent",
                  opacity: i === imgIdx ? 1 : 0.5,
                }}
              >
                <img src={url} alt={`${i + 1}`} className="w-full h-full object-cover" />
              </button>
            ))}
          </div>
        )}

        {/* Info */}
        <div className="px-5 pt-4 pb-8">
          <h2 style={{ color: textColor }} className="text-xl font-bold leading-tight">
            {item.name}
          </h2>
          {item.brand && (
            <span
              style={{ backgroundColor: theme.primaryColor + '20', color: theme.primaryColor }}
              className="inline-block text-xs font-bold uppercase tracking-widest px-2.5 py-1 rounded-full mt-2"
            >
              {item.brand}
            </span>
          )}
          {item.price !== undefined && (
            <div style={{ color: theme.primaryColor }} className="text-2xl font-black mt-1">
              ${formatPrice(item.price)}
            </div>
          )}
          {item.description && (
            <p style={{ color: subColor }} className="text-sm mt-3 leading-relaxed">
              {item.description}
            </p>
          )}
          {item.sizes && item.sizes.length > 0 && (
            <div className="mt-4">
              <div style={{ color: subColor }} className="text-xs font-semibold uppercase tracking-wider mb-2">
                Tama�os / Tallas
              </div>
              <div className="flex gap-2 flex-wrap">
                {item.sizes.map((s) => (
                  <span
                    key={s}
                    style={{
                      borderColor: theme.primaryColor,
                      color: theme.primaryColor,
                      backgroundColor: theme.primaryColor + "15",
                    }}
                    className="text-sm border px-3 py-1 rounded-lg font-semibold"
                  >
                    {s}
                  </span>
                ))}
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}

// --- Social media SVG icons ---------------------------------------------------
function SvgInstagram() {
  return (
    <svg width="28" height="28" viewBox="0 0 24 24" fill="currentColor">
      <path d="M12 2.163c3.204 0 3.584.012 4.85.07 3.252.148 4.771 1.691 4.919 4.919.058 1.265.069 1.645.069 4.849 0 3.205-.012 3.584-.069 4.849-.149 3.225-1.664 4.771-4.919 4.919-1.266.058-1.644.07-4.85.07-3.204 0-3.584-.012-4.849-.07-3.26-.149-4.771-1.699-4.919-4.92-.058-1.265-.07-1.644-.07-4.849 0-3.204.013-3.583.07-4.849.149-3.227 1.664-4.771 4.919-4.919 1.266-.057 1.645-.069 4.849-.069zm0-2.163c-3.259 0-3.667.014-4.947.072-4.358.2-6.78 2.618-6.98 6.98-.059 1.281-.073 1.689-.073 4.948 0 3.259.014 3.668.072 4.948.2 4.358 2.618 6.78 6.98 6.98 1.281.058 1.689.072 4.948.072 3.259 0 3.668-.014 4.948-.072 4.354-.2 6.782-2.618 6.979-6.98.059-1.28.073-1.689.073-4.948 0-3.259-.014-3.667-.072-4.947-.196-4.354-2.617-6.78-6.979-6.98-1.281-.059-1.69-.073-4.949-.073zm0 5.838c-3.403 0-6.162 2.759-6.162 6.162s2.759 6.163 6.162 6.163 6.162-2.759 6.162-6.163c0-3.403-2.759-6.162-6.162-6.162zm0 10.162c-2.209 0-4-1.79-4-4 0-2.209 1.791-4 4-4s4 1.791 4 4c0 2.21-1.791 4-4 4zm6.406-11.845c-.796 0-1.441.645-1.441 1.44s.645 1.44 1.441 1.44c.795 0 1.439-.645 1.439-1.44s-.644-1.44-1.439-1.44z"/>
    </svg>
  );
}

function SvgFacebook() {
  return (
    <svg width="28" height="28" viewBox="0 0 24 24" fill="currentColor">
      <path d="M24 12.073c0-6.627-5.373-12-12-12s-12 5.373-12 12c0 5.99 4.388 10.954 10.125 11.854v-8.385H7.078v-3.47h3.047V9.43c0-3.007 1.792-4.669 4.533-4.669 1.312 0 2.686.235 2.686.235v2.953H15.83c-1.491 0-1.956.925-1.956 1.874v2.25h3.328l-.532 3.47h-2.796v8.385C19.612 23.027 24 18.062 24 12.073z"/>
    </svg>
  );
}

function SvgTiktok() {
  return (
    <svg width="28" height="28" viewBox="0 0 24 24" fill="currentColor">
      <path d="M19.59 6.69a4.83 4.83 0 01-3.77-4.25V2h-3.45v13.67a2.89 2.89 0 01-2.88 2.5 2.89 2.89 0 01-2.89-2.89 2.89 2.89 0 012.89-2.89c.28 0 .54.04.79.1V9.01a6.33 6.33 0 00-.79-.05 6.34 6.34 0 00-6.34 6.34 6.34 6.34 0 006.34 6.34 6.34 6.34 0 006.33-6.34V8.69a8.16 8.16 0 004.77 1.52V6.78a4.85 4.85 0 01-1-.09z"/>
    </svg>
  );
}
