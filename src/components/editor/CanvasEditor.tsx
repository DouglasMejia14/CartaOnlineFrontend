import { useRef, useState, useEffect } from 'react';
import { ref as storageRef, uploadBytesResumable, getDownloadURL } from 'firebase/storage';
import { storage } from '../../lib/firebase';
import type { Catalog, CanvasElement, CanvasElementType, CanvasPage } from '../../types';
import { formatPrice } from '../../utils/catalog';

// ── Canvas reference space (800 × 450 = 16:9) ────────────────────────────────
const CW = 800;
const CH = 450;
// Thumbnail size for the page strip
const TW = 144;
const TH = Math.round(TW * CH / CW); // 81px

const DEFAULTS: Record<CanvasElementType, { w: number; h: number }> = {
  text:    { w: 220, h: 70  },
  image:   { w: 200, h: 200 },
  product: { w: 175, h: 215 },
};

const GRADIENTS = [
  'linear-gradient(135deg,#667eea 0%,#764ba2 100%)',
  'linear-gradient(135deg,#f093fb 0%,#f5576c 100%)',
  'linear-gradient(135deg,#4facfe 0%,#00f2fe 100%)',
  'linear-gradient(135deg,#43e97b 0%,#38f9d7 100%)',
  'linear-gradient(135deg,#fa709a 0%,#fee140 100%)',
  'linear-gradient(135deg,#0f0c29 0%,#302b63 50%,#24243e 100%)',
  'linear-gradient(135deg,#ffecd2 0%,#fcb69f 100%)',
  'linear-gradient(135deg,#a1ffce 0%,#faffd1 100%)',
];

interface DragState {
  id: string;
  mode: 'move' | 'resize';
  startClientX: number; startClientY: number;
  startX: number;       startY: number;
  startW: number;       startH: number;
}

// ─────────────────────────────────────────────────────────────────────────────
// Helpers
// ─────────────────────────────────────────────────────────────────────────────
function pageBgStyle(page: { bgType: string; bgValue: string }): React.CSSProperties {
  if (page.bgType === 'image' && page.bgValue)
    return { backgroundImage: `url(${page.bgValue})`, backgroundSize: 'cover', backgroundPosition: 'center', backgroundRepeat: 'no-repeat' };
  if (page.bgType === 'gradient')
    return { background: page.bgValue || '#1a1a2e' };
  return { backgroundColor: page.bgValue || '#1a1a2e' };
}

function getPages(catalog: Catalog): CanvasPage[] {
  const saved = catalog.theme.canvasPages;
  if (saved && saved.length > 0) return saved;
  // Migrate from legacy canvasElements (single page)
  return [{
    id: 'page-0',
    bgType: catalog.theme.bgType,
    bgValue: catalog.theme.bgValue,
    elements: catalog.theme.canvasElements ?? [],
  }];
}

// ─────────────────────────────────────────────────────────────────────────────
// Main component
// ─────────────────────────────────────────────────────────────────────────────
interface Props { catalog: Catalog; onChange: (u: Partial<Catalog>) => void; }

export default function CanvasEditor({ catalog, onChange }: Props) {
  const containerRef  = useRef<HTMLDivElement>(null);
  const imgInputRef   = useRef<HTMLInputElement>(null);

  const [scale, setScale]             = useState(1);
  const [activePage, setActivePage]   = useState(0);
  const [selectedId, setSelectedId]   = useState<string | null>(null);
  const [drag, setDrag]               = useState<DragState | null>(null);
  const [local, setLocal]             = useState<CanvasElement[] | null>(null);
  const [imgUploading, setImgUploading] = useState(false);
  const [imgProgress, setImgProgress] = useState(0);
  const [showPicker, setShowPicker]   = useState(false);

  const pages   = getPages(catalog);
  const pageIdx = Math.min(activePage, pages.length - 1);
  const curPage = pages[pageIdx];
  const saved   = curPage?.elements ?? [];
  const elements = local ?? saved;
  const selected = elements.find((e) => e.id === selectedId) ?? null;
  const { theme } = catalog;

  // Auto-save migration (runs once on mount if needed)
  useEffect(() => {
    if (!catalog.theme.canvasPages || catalog.theme.canvasPages.length === 0) {
      savePages(getPages(catalog));
    }
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [catalog.id]);

  // Scale via ResizeObserver
  useEffect(() => {
    const el = containerRef.current;
    if (!el) return;
    const update = () => setScale(el.clientWidth / CW);
    update();
    const ro = new ResizeObserver(update);
    ro.observe(el);
    return () => ro.disconnect();
  }, []);

  // ── Page save helpers ─────────────────────────────────────────────────────
  function savePages(newPages: CanvasPage[]) {
    onChange({ theme: { ...theme, canvasPages: newPages } });
  }
  function updatePage(idx: number, updates: Partial<CanvasPage>) {
    savePages(pages.map((p, i) => (i === idx ? { ...p, ...updates } : p)));
  }
  function saveElements(els: CanvasElement[]) {
    updatePage(pageIdx, { elements: els });
  }
  function updateSelected(updates: Partial<CanvasElement>) {
    if (!selectedId) return;
    saveElements(saved.map((e) => (e.id === selectedId ? { ...e, ...updates } : e)));
  }

  // ── Page management ───────────────────────────────────────────────────────
  function addPage() {
    const newPage: CanvasPage = {
      id: `page-${Date.now()}`,
      bgType: 'solid',
      bgValue: '#1a1a2e',
      elements: [],
    };
    const newPages = [...pages, newPage];
    savePages(newPages);
    setActivePage(newPages.length - 1);
    setSelectedId(null);
  }

  function duplicatePage(idx: number) {
    const clone: CanvasPage = {
      ...pages[idx],
      id: `page-${Date.now()}`,
      elements: pages[idx].elements.map((e) => ({ ...e, id: `${e.id}-c` })),
    };
    const newPages = [...pages.slice(0, idx + 1), clone, ...pages.slice(idx + 1)];
    savePages(newPages);
    setActivePage(idx + 1);
  }

  function deletePage(idx: number) {
    if (pages.length <= 1) return;
    const newPages = pages.filter((_, i) => i !== idx);
    savePages(newPages);
    setActivePage(Math.min(pageIdx, newPages.length - 1));
    setSelectedId(null);
  }

  function movePage(idx: number, dir: -1 | 1) {
    const target = idx + dir;
    if (target < 0 || target >= pages.length) return;
    const arr = [...pages];
    [arr[idx], arr[target]] = [arr[target], arr[idx]];
    savePages(arr);
    setActivePage(target);
  }

  // ── Element operations ────────────────────────────────────────────────────
  function addText() {
    const el: CanvasElement = {
      id: crypto.randomUUID(), type: 'text',
      x: CW/2 - 110, y: CH/2 - 35,
      w: DEFAULTS.text.w, h: DEFAULTS.text.h,
      text: 'Escribe aquí', fontSize: 30,
      color: '#ffffff', fontFamily: theme.fontFamily,
      fontWeight: 'bold', textAlign: 'center',
      bgColor: '', borderRadius: 4, opacity: 1,
    };
    saveElements([...saved, el]);
    setSelectedId(el.id);
  }

  function addImage() { imgInputRef.current?.click(); }

  function handleImageFile(file: File) {
    if (!file.type.startsWith('image/')) return;
    const ext = file.name.split('.').pop() ?? 'jpg';
    const path = `catalogs/${catalog.id}/canvas-${Date.now()}.${ext}`;
    const sRef = storageRef(storage, path);
    const task = uploadBytesResumable(sRef, file);
    setImgUploading(true); setImgProgress(0);
    task.on('state_changed',
      (snap) => setImgProgress(Math.round((snap.bytesTransferred / snap.totalBytes) * 100)),
      () => setImgUploading(false),
      async () => {
        const url = await getDownloadURL(task.snapshot.ref);
        setImgUploading(false);
        const el: CanvasElement = {
          id: crypto.randomUUID(), type: 'image',
          x: CW/2 - 100, y: CH/2 - 100,
          w: DEFAULTS.image.w, h: DEFAULTS.image.h,
          imageUrl: url, objectFit: 'cover', opacity: 1,
        };
        saveElements([...saved, el]);
        setSelectedId(el.id);
      }
    );
  }

  function addProduct(productId: string) {
    const el: CanvasElement = {
      id: crypto.randomUUID(), type: 'product',
      x: CW/2 - 87, y: CH/2 - 107,
      w: DEFAULTS.product.w, h: DEFAULTS.product.h,
      productId, productStyle: 'card', opacity: 1, borderRadius: 8,
    };
    saveElements([...saved, el]);
    setSelectedId(el.id);
    setShowPicker(false);
  }

  function deleteSelected() {
    if (!selectedId) return;
    saveElements(saved.filter((e) => e.id !== selectedId));
    setSelectedId(null);
  }
  function duplicateSelected() {
    if (!selected) return;
    const clone: CanvasElement = { ...selected, id: crypto.randomUUID(), x: selected.x + 20, y: selected.y + 20 };
    saveElements([...saved, clone]);
    setSelectedId(clone.id);
  }
  function bringForward() {
    if (!selectedId) return;
    const idx = saved.findIndex((e) => e.id === selectedId);
    if (idx < saved.length - 1) {
      const arr = [...saved]; [arr[idx], arr[idx+1]] = [arr[idx+1], arr[idx]]; saveElements(arr);
    }
  }
  function sendBackward() {
    if (!selectedId) return;
    const idx = saved.findIndex((e) => e.id === selectedId);
    if (idx > 0) {
      const arr = [...saved]; [arr[idx-1], arr[idx]] = [arr[idx], arr[idx-1]]; saveElements(arr);
    }
  }

  // ── Pointer events ────────────────────────────────────────────────────────
  function handlePointerDown(e: React.PointerEvent<HTMLDivElement>) {
    const target = e.target as HTMLElement;
    const resizeEl = target.closest('[data-resize]') as HTMLElement | null;
    const itemEl   = target.closest('[data-eid]')   as HTMLElement | null;
    if (resizeEl) {
      const id = resizeEl.getAttribute('data-resize')!;
      const el = saved.find((x) => x.id === id); if (!el) return;
      e.currentTarget.setPointerCapture(e.pointerId);
      setDrag({ id, mode: 'resize', startClientX: e.clientX, startClientY: e.clientY, startX: el.x, startY: el.y, startW: el.w, startH: el.h });
      return;
    }
    if (itemEl) {
      const id = itemEl.getAttribute('data-eid')!;
      const el = saved.find((x) => x.id === id); if (!el) return;
      e.currentTarget.setPointerCapture(e.pointerId);
      setSelectedId(id);
      setDrag({ id, mode: 'move', startClientX: e.clientX, startClientY: e.clientY, startX: el.x, startY: el.y, startW: el.w, startH: el.h });
      return;
    }
    setSelectedId(null); setShowPicker(false);
  }

  function handlePointerMove(e: React.PointerEvent<HTMLDivElement>) {
    if (!drag) return;
    const dx = (e.clientX - drag.startClientX) / scale;
    const dy = (e.clientY - drag.startClientY) / scale;
    const np: Partial<CanvasElement> = drag.mode === 'move'
      ? { x: Math.max(0, Math.min(CW - drag.startW, drag.startX + dx)), y: Math.max(0, Math.min(CH - drag.startH, drag.startY + dy)) }
      : { w: Math.max(40, Math.min(CW - drag.startX, drag.startW + dx)), h: Math.max(30, Math.min(CH - drag.startY, drag.startH + dy)) };
    setLocal(saved.map((el) => (el.id === drag.id ? { ...el, ...np } : el)));
  }

  function handlePointerUp(e: React.PointerEvent<HTMLDivElement>) {
    e.currentTarget.releasePointerCapture(e.pointerId);
    if (drag && local) { saveElements(local); setLocal(null); }
    setDrag(null);
  }

  // ─────────────────────────────────────────────────────────────────────────
  return (
    <div className="flex flex-col gap-3 w-full h-full">

      {/* ── Top row: canvas + properties ─────────────────────────────────── */}
      <div className="flex gap-3 flex-1 min-h-0">

        {/* Canvas column */}
        <div className="flex-1 flex flex-col gap-3 min-w-0">

          {/* Toolbar */}
          <div className="flex flex-wrap items-center gap-2">
            <button onClick={addText}
              className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-slate-700 hover:bg-slate-600 text-white text-xs font-semibold transition-colors">
              <span className="font-black text-base leading-none">T</span> Texto
            </button>
            <button onClick={addImage} disabled={imgUploading}
              className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-slate-700 hover:bg-slate-600 disabled:opacity-50 text-white text-xs font-semibold transition-colors">
              🖼️ {imgUploading ? `${imgProgress}%` : 'Imagen'}
            </button>
            <div className="relative">
              <button onClick={() => setShowPicker(!showPicker)}
                className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-slate-700 hover:bg-slate-600 text-white text-xs font-semibold transition-colors">
                📦 Producto ▾
              </button>
              {showPicker && (
                <div className="absolute top-full left-0 mt-1 w-56 bg-slate-800 border border-slate-700 rounded-xl shadow-2xl z-50 overflow-hidden">
                  {catalog.items.length === 0
                    ? <p className="text-slate-500 text-xs p-3 text-center">Sin productos</p>
                    : <div className="max-h-52 overflow-y-auto divide-y divide-slate-700/60">
                        {catalog.items.map((item) => (
                          <button key={item.id} onClick={() => addProduct(item.id)}
                            className="w-full flex items-center gap-2 px-3 py-2 hover:bg-slate-700 text-left transition-colors">
                            {item.images?.[0]
                              ? <img src={item.images[0]} className="w-8 h-8 rounded object-cover flex-shrink-0" />
                              : <div className="w-8 h-8 rounded bg-slate-700 flex-shrink-0" />}
                            <div className="flex-1 min-w-0">
                              <p className="text-white text-xs font-medium truncate">{item.name}</p>
                              {item.price !== undefined && (
                                <p className="text-[10px]" style={{ color: theme.primaryColor }}>${formatPrice(item.price)}</p>
                              )}
                            </div>
                          </button>
                        ))}
                      </div>
                  }
                </div>
              )}
            </div>

            {selectedId && <>
              <div className="w-px h-5 bg-slate-700 mx-0.5" />
              <button onClick={duplicateSelected} title="Duplicar" className="px-2.5 py-1.5 rounded-lg bg-slate-700 hover:bg-slate-600 text-white text-xs transition-colors">⧉</button>
              <button onClick={sendBackward}  title="Enviar atrás"   className="px-2.5 py-1.5 rounded-lg bg-slate-700 hover:bg-slate-600 text-white text-xs transition-colors">↙</button>
              <button onClick={bringForward}  title="Traer adelante" className="px-2.5 py-1.5 rounded-lg bg-slate-700 hover:bg-slate-600 text-white text-xs transition-colors">↗</button>
              <button onClick={deleteSelected} title="Eliminar" className="px-2.5 py-1.5 rounded-lg bg-red-500/20 hover:bg-red-500/30 text-red-400 text-xs transition-colors">🗑️</button>
            </>}
          </div>

          {/* Canvas */}
          <div ref={containerRef}
            className="relative w-full rounded-xl overflow-hidden border border-slate-700 shadow-2xl shadow-black/60"
            style={{ height: `${CH * scale}px` }}>
            <div className="absolute top-0 left-0 touch-none"
              style={{ width: CW, height: CH, transform: `scale(${scale})`, transformOrigin: 'top left',
                ...pageBgStyle(curPage), cursor: drag?.mode === 'move' ? 'grabbing' : 'default' }}
              onPointerDown={handlePointerDown}
              onPointerMove={handlePointerMove}
              onPointerUp={handlePointerUp}>

              {curPage.bgType !== 'image' && elements.length === 0 && (
                <div className="absolute inset-0 flex flex-col items-center justify-center gap-3 pointer-events-none select-none"
                  style={{ color: 'rgba(255,255,255,0.18)' }}>
                  <span style={{ fontSize: 52 }}>🖼️</span>
                  <p style={{ fontSize: 13, textAlign: 'center', maxWidth: 320, lineHeight: 1.6 }}>
                    Establece el fondo de esta página en el panel derecho<br/>
                    y agrega texto, imágenes y productos encima
                  </p>
                </div>
              )}

              {elements.map((el, idx) => (
                <ElementView key={el.id} el={el} isSelected={selectedId === el.id}
                  isDragging={drag?.id === el.id} zIndex={idx + 1} catalog={catalog} />
              ))}
            </div>
          </div>

          <p className="text-slate-600 text-[11px] text-center">
            Clic para seleccionar · Arrastra para mover · ↘ esquina para redimensionar
          </p>
        </div>

        {/* Properties panel */}
        <aside className="w-60 flex-shrink-0 bg-slate-900 rounded-xl border border-slate-800 overflow-y-auto"
          style={{ maxHeight: `${CH * scale + 80}px` }}>
          {selected
            ? <ElementPanel el={selected} catalog={catalog} onChange={updateSelected} />
            : <PagePanel page={curPage} catalog={catalog}
                onPageChange={(u) => updatePage(pageIdx, u)} />
          }
        </aside>
      </div>

      {/* ── Page strip ───────────────────────────────────────────────────── */}
      <div className="flex items-center gap-2 overflow-x-auto py-2 px-1 border-t border-slate-800 mt-1">
        {pages.map((page, idx) => (
          <PageThumb
            key={page.id}
            page={page}
            index={idx}
            total={pages.length}
            active={idx === pageIdx}
            catalog={catalog}
            onClick={() => { setActivePage(idx); setSelectedId(null); }}
            onDelete={() => deletePage(idx)}
            onDuplicate={() => duplicatePage(idx)}
            onMove={(dir) => movePage(idx, dir)}
          />
        ))}

        {/* Add page button */}
        <button onClick={addPage}
          className="flex-shrink-0 flex flex-col items-center justify-center gap-1 rounded-xl border-2 border-dashed border-slate-600 hover:border-purple-500 text-slate-500 hover:text-purple-400 transition-colors"
          style={{ width: TW, height: TH }}>
          <span className="text-2xl leading-none">+</span>
          <span className="text-[10px] font-medium">Página</span>
        </button>
      </div>

      <input ref={imgInputRef} type="file" accept="image/*" className="hidden"
        onChange={(e) => { const f = e.target.files?.[0]; if (f) handleImageFile(f); e.target.value = ''; }} />
    </div>
  );
}

// ─────────────────────────────────────────────────────────────────────────────
// PageThumb — mini preview in the page strip
// ─────────────────────────────────────────────────────────────────────────────
const THUMB_SCALE = TW / CW;

function PageThumb({ page, index, total, active, catalog, onClick, onDelete, onDuplicate, onMove }:
  { page: CanvasPage; index: number; total: number; active: boolean; catalog: Catalog;
    onClick: () => void; onDelete: () => void; onDuplicate: () => void; onMove: (dir: -1|1) => void }) {

  const [hover, setHover] = useState(false);

  return (
    <div className="flex-shrink-0 relative group" style={{ width: TW }}>
      {/* Thumbnail */}
      <div
        onClick={onClick}
        onMouseEnter={() => setHover(true)}
        onMouseLeave={() => setHover(false)}
        className={`relative rounded-lg border-2 cursor-pointer overflow-hidden transition-all ${
          active ? 'border-purple-500 shadow-lg shadow-purple-500/20' : 'border-slate-700 hover:border-slate-500'
        }`}
        style={{ width: TW, height: TH }}
      >
        {/* Mini canvas */}
        <div style={{ width: CW, height: CH, transform: `scale(${THUMB_SCALE})`, transformOrigin: 'top left',
          ...pageBgStyle(page), pointerEvents: 'none' }}>
          {page.elements.map((el, idx) => (
            <MiniElement key={el.id} el={el} zIndex={idx + 1} catalog={catalog} />
          ))}
        </div>

        {/* Page number badge */}
        <div className={`absolute bottom-1 left-1.5 text-[9px] font-bold px-1 py-0.5 rounded ${
          active ? 'bg-purple-500 text-white' : 'bg-black/50 text-white/70'}`}>
          {index + 1}
        </div>

        {/* Element count */}
        {page.elements.length > 0 && (
          <div className="absolute bottom-1 right-1.5 text-[9px] text-white/50 bg-black/40 px-1 rounded">
            {page.elements.length}
          </div>
        )}
      </div>

      {/* Context actions (show on hover or when active) */}
      {(hover || active) && (
        <div className="absolute -top-7 left-0 right-0 flex gap-0.5 justify-center z-10">
          <button onClick={(e) => { e.stopPropagation(); onMove(-1); }} disabled={index === 0}
            className="px-1.5 py-0.5 rounded bg-slate-700 hover:bg-slate-600 disabled:opacity-30 text-white text-[10px] transition-colors" title="Mover izquierda">◀</button>
          <button onClick={(e) => { e.stopPropagation(); onMove(1); }} disabled={index === total - 1}
            className="px-1.5 py-0.5 rounded bg-slate-700 hover:bg-slate-600 disabled:opacity-30 text-white text-[10px] transition-colors" title="Mover derecha">▶</button>
          <button onClick={(e) => { e.stopPropagation(); onDuplicate(); }}
            className="px-1.5 py-0.5 rounded bg-slate-700 hover:bg-slate-600 text-white text-[10px] transition-colors" title="Duplicar página">⧉</button>
          {total > 1 && (
            <button onClick={(e) => { e.stopPropagation(); onDelete(); }}
              className="px-1.5 py-0.5 rounded bg-red-500/40 hover:bg-red-500/60 text-red-300 text-[10px] transition-colors" title="Eliminar página">✕</button>
          )}
        </div>
      )}
    </div>
  );
}

// ─────────────────────────────────────────────────────────────────────────────
// MiniElement — simplified element render for thumbnails
// ─────────────────────────────────────────────────────────────────────────────
function MiniElement({ el, zIndex, catalog }: { el: CanvasElement; zIndex: number; catalog: Catalog }) {
  const s: React.CSSProperties = {
    position: 'absolute', left: el.x, top: el.y, width: el.w, height: el.h,
    opacity: el.opacity ?? 1, zIndex, borderRadius: el.borderRadius ?? 0, overflow: 'hidden',
  };
  if (el.type === 'text') return (
    <div style={{ ...s, backgroundColor: el.bgColor || 'rgba(0,0,0,0.3)',
      display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
      <span style={{ fontSize: (el.fontSize ?? 24) * 0.5, color: el.color ?? '#fff',
        fontWeight: el.fontWeight ?? 'bold', textAlign: 'center', wordBreak: 'break-word' }}>
        {el.text}
      </span>
    </div>
  );
  if (el.type === 'image') return (
    <div style={s}>
      <img src={el.imageUrl} alt="" style={{ width: '100%', height: '100%', objectFit: el.objectFit ?? 'cover', display: 'block' }} />
    </div>
  );
  const product = catalog.items.find((i) => i.id === el.productId);
  if (!product) return null;
  return (
    <div style={{ ...s, backgroundColor: 'rgba(0,0,0,0.6)' }}>
      {product.images?.[0] && <img src={product.images[0]} alt="" style={{ width: '100%', height: '70%', objectFit: 'cover', display: 'block' }} />}
      <div style={{ padding: '2px 4px' }}>
        <div style={{ color: '#fff', fontSize: 8, fontWeight: 700, overflow: 'hidden', whiteSpace: 'nowrap', textOverflow: 'ellipsis' }}>{product.name}</div>
      </div>
    </div>
  );
}

// ─────────────────────────────────────────────────────────────────────────────
// ElementView — full-size element on canvas
// ─────────────────────────────────────────────────────────────────────────────
function ElementView({ el, isSelected, isDragging, zIndex, catalog }:
  { el: CanvasElement; isSelected: boolean; isDragging: boolean; zIndex: number; catalog: Catalog }) {

  const { theme } = catalog;
  const wrapper: React.CSSProperties = {
    position: 'absolute', left: el.x, top: el.y, width: el.w, height: el.h,
    opacity: el.opacity ?? 1, zIndex: isSelected ? 9999 : zIndex,
    borderRadius: el.borderRadius ?? 0, cursor: isDragging ? 'grabbing' : 'grab',
    outline: isSelected ? '2px solid rgba(167,139,250,0.9)' : 'none',
    boxShadow: isSelected ? '0 0 0 3px rgba(167,139,250,0.2)' : undefined,
    overflow: 'hidden', userSelect: 'none',
    transition: isDragging ? 'none' : 'outline 0.1s',
  };

  let content: React.ReactNode;

  if (el.type === 'text') {
    content = (
      <div style={{ width: '100%', height: '100%', backgroundColor: el.bgColor || 'transparent',
        borderRadius: el.borderRadius ?? 0, display: 'flex', alignItems: 'center',
        padding: '6px 10px', boxSizing: 'border-box' }}>
        <span style={{ width: '100%', fontSize: el.fontSize ?? 24, color: el.color ?? '#fff',
          fontFamily: el.fontFamily ?? 'Inter, sans-serif', fontWeight: el.fontWeight ?? 'bold',
          fontStyle: el.fontStyle ?? 'normal', textAlign: el.textAlign ?? 'center',
          wordBreak: 'break-word', whiteSpace: 'pre-wrap', lineHeight: 1.25, pointerEvents: 'none' }}>
          {el.text || ''}
        </span>
      </div>
    );
  } else if (el.type === 'image') {
    content = <img src={el.imageUrl} alt="" draggable={false}
      style={{ width: '100%', height: '100%', objectFit: el.objectFit ?? 'cover', pointerEvents: 'none', display: 'block' }} />;
  } else {
    const product = catalog.items.find((i) => i.id === el.productId);
    if (!product) {
      content = (
        <div style={{ width:'100%',height:'100%',backgroundColor:'rgba(239,68,68,0.15)',
          display:'flex',alignItems:'center',justifyContent:'center' }}>
          <span style={{ color:'rgba(255,255,255,0.4)',fontSize:11 }}>Producto no encontrado</span>
        </div>
      );
    } else if (el.productStyle === 'minimal') {
      content = (
        <div style={{ width:'100%',height:'100%',backgroundColor:'rgba(0,0,0,0.62)',backdropFilter:'blur(6px)',
          display:'flex',flexDirection:'column',alignItems:'center',justifyContent:'center',
          padding:10,gap:4,boxSizing:'border-box' }}>
          <span style={{ color:'#fff',fontWeight:700,fontSize:14,textAlign:'center',lineHeight:1.2,wordBreak:'break-word',width:'100%' }}>{product.name}</span>
          {product.price !== undefined && <span style={{ color:theme.primaryColor,fontWeight:800,fontSize:16 }}>${formatPrice(product.price)}</span>}
        </div>
      );
    } else {
      content = (
        <div style={{ width:'100%',height:'100%',display:'flex',flexDirection:'column',backgroundColor:'rgba(0,0,0,0.65)',backdropFilter:'blur(4px)' }}>
          {product.images?.[0] && (
            <div style={{ flex:1,minHeight:0,overflow:'hidden' }}>
              <img src={product.images[0]} alt={product.name} draggable={false}
                style={{ width:'100%',height:'100%',objectFit:'cover',pointerEvents:'none',display:'block' }} />
            </div>
          )}
          <div style={{ flexShrink:0,padding:'6px 8px',backgroundColor:'rgba(0,0,0,0.55)' }}>
            <div style={{ color:'#fff',fontWeight:700,fontSize:12,overflow:'hidden',whiteSpace:'nowrap',textOverflow:'ellipsis' }}>{product.name}</div>
            {product.price !== undefined && <div style={{ color:theme.primaryColor,fontWeight:800,fontSize:11,marginTop:2 }}>${formatPrice(product.price)}</div>}
          </div>
        </div>
      );
    }
  }

  return (
    <div data-eid={el.id} style={wrapper}>
      {content}
      {isSelected && (
        <div data-resize={el.id}
          style={{ position:'absolute',bottom:0,right:0,width:18,height:18,backgroundColor:'rgba(139,92,246,0.95)',
            borderTopLeftRadius:5,cursor:'se-resize',zIndex:10000,display:'flex',alignItems:'center',justifyContent:'center' }}
          onClick={(e) => e.stopPropagation()}>
          <svg width="9" height="9" viewBox="0 0 9 9" fill="white">
            <rect x="0" y="7" width="2" height="2" rx="0.4"/>
            <rect x="3.5" y="7" width="2" height="2" rx="0.4"/>
            <rect x="7" y="7" width="2" height="2" rx="0.4"/>
            <rect x="7" y="3.5" width="2" height="2" rx="0.4"/>
            <rect x="7" y="0" width="2" height="2" rx="0.4"/>
          </svg>
        </div>
      )}
    </div>
  );
}

// ─────────────────────────────────────────────────────────────────────────────
// PagePanel — shown in right panel when no element is selected
// ─────────────────────────────────────────────────────────────────────────────
function PagePanel({ page, catalog, onPageChange }:
  { page: CanvasPage; catalog: Catalog; onPageChange: (u: Partial<CanvasPage>) => void }) {

  const bgImgRef = useRef<HTMLInputElement>(null);
  const [uploading, setUploading] = useState(false);
  const [progress, setProgress]   = useState(0);

  function uploadBg(file: File) {
    if (!file.type.startsWith('image/')) return;
    const ext = file.name.split('.').pop() ?? 'jpg';
    const path = `catalogs/${catalog.id}/page-bg-${Date.now()}.${ext}`;
    const sRef = storageRef(storage, path);
    const task = uploadBytesResumable(sRef, file);
    setUploading(true); setProgress(0);
    task.on('state_changed',
      (snap) => setProgress(Math.round((snap.bytesTransferred / snap.totalBytes) * 100)),
      () => setUploading(false),
      async () => {
        onPageChange({ bgType: 'image', bgValue: await getDownloadURL(task.snapshot.ref) });
        setUploading(false);
      }
    );
  }

  const lbl = "text-slate-400 text-[10px] font-semibold uppercase tracking-wider";
  const sec = "flex flex-col gap-1 mb-3";

  return (
    <div className="p-3 text-xs">
      <p className="text-slate-300 font-semibold text-xs mb-3 flex items-center gap-1.5">
        🎨 Fondo de la página
      </p>

      {/* Type selector */}
      <div className={sec}>
        <label className={lbl}>Tipo</label>
        <div className="grid grid-cols-3 gap-1.5">
          {([
            { value: 'solid',    label: '🔲 Sólido'   },
            { value: 'gradient', label: '🌈 Degradado' },
            { value: 'image',    label: '🖼️ Imagen'   },
          ] as const).map((t) => (
            <button key={t.value} onClick={() => onPageChange({ bgType: t.value })}
              className={`py-1.5 rounded-lg border text-[10px] font-medium transition-all text-center ${
                page.bgType === t.value ? 'border-purple-500 bg-purple-500/20 text-purple-300' : 'border-slate-700 text-slate-400 hover:border-slate-600'
              }`}>
              {t.label}
            </button>
          ))}
        </div>
      </div>

      {/* Solid color */}
      {page.bgType === 'solid' && (
        <div className={sec}>
          <label className={lbl}>Color</label>
          <div className="flex items-center gap-2">
            <input type="color" value={page.bgValue || '#1a1a2e'}
              onChange={(e) => onPageChange({ bgValue: e.target.value })}
              className="h-9 w-14 rounded cursor-pointer border-0 bg-transparent flex-shrink-0" />
            <span className="text-slate-400 text-xs">{page.bgValue || '#1a1a2e'}</span>
          </div>
        </div>
      )}

      {/* Gradient */}
      {page.bgType === 'gradient' && (
        <div className={sec}>
          <label className={lbl}>Degradados</label>
          <div className="grid grid-cols-4 gap-1.5">
            {GRADIENTS.map((g) => (
              <button key={g} onClick={() => onPageChange({ bgValue: g })}
                className={`h-9 rounded-lg border-2 transition-all hover:scale-110 ${page.bgValue === g ? 'border-white' : 'border-transparent'}`}
                style={{ background: g }} />
            ))}
          </div>
        </div>
      )}

      {/* Image */}
      {page.bgType === 'image' && (
        <div className={sec}>
          <label className={lbl}>Imagen de fondo</label>
          <button onClick={() => bgImgRef.current?.click()} disabled={uploading}
            className="w-full flex items-center justify-center gap-1.5 bg-slate-800 hover:bg-slate-700 disabled:opacity-50 border border-dashed border-slate-600 hover:border-purple-500 text-slate-300 hover:text-white rounded-lg py-2.5 text-xs font-medium transition-all">
            {uploading ? `⏳ ${progress}%` : '📁 Subir imagen (JPG, PNG, WebP, GIF)'}
          </button>
          {/* URL manual */}
          <input type="url" placeholder="O pega una URL…"
            value={page.bgValue.startsWith('http') ? page.bgValue : ''}
            onChange={(e) => onPageChange({ bgValue: e.target.value })}
            className="mt-1.5 w-full bg-slate-800 border border-slate-700 rounded-lg px-2.5 py-1.5 text-white text-xs outline-none focus:border-purple-500 transition-colors placeholder-slate-600" />
          {/* Preview */}
          {page.bgValue && (
            <div className="relative mt-1.5 rounded-lg overflow-hidden border border-slate-700" style={{ height: 60 }}>
              <img src={page.bgValue} alt="bg" className="w-full h-full object-cover"
                onError={(e) => { (e.target as HTMLImageElement).style.display = 'none'; }} />
              <button onClick={() => onPageChange({ bgValue: '' })}
                className="absolute top-1 right-1 w-5 h-5 bg-black/60 hover:bg-black/80 text-white rounded-full text-xs flex items-center justify-center">✕</button>
            </div>
          )}
          <input ref={bgImgRef} type="file" accept="image/*" className="hidden"
            onChange={(e) => { const f = e.target.files?.[0]; if (f) uploadBg(f); e.target.value = ''; }} />
        </div>
      )}

      <div className="mt-4 pt-3 border-t border-slate-800 text-slate-600 text-[10px] text-center">
        Selecciona un elemento del canvas<br/>para editar sus propiedades
      </div>
    </div>
  );
}

// ─────────────────────────────────────────────────────────────────────────────
// ElementPanel — element properties
// ─────────────────────────────────────────────────────────────────────────────
const FONTS = [
  { label: 'Inter',     value: 'Inter, sans-serif' },
  { label: 'Georgia',   value: 'Georgia, serif' },
  { label: 'Playfair',  value: "'Playfair Display', serif" },
  { label: 'Arial',     value: 'Arial, sans-serif' },
  { label: 'Monospace', value: 'ui-monospace, monospace' },
];

function ElementPanel({ el, catalog, onChange }:
  { el: CanvasElement; catalog: Catalog; onChange: (u: Partial<CanvasElement>) => void }) {

  const { theme } = catalog;
  const replaceRef = useRef<HTMLInputElement>(null);
  const [repUploading, setRepUploading] = useState(false);
  const [repProgress, setRepProgress]   = useState(0);

  function replaceImage(file: File) {
    if (!file.type.startsWith('image/')) return;
    const ext = file.name.split('.').pop() ?? 'jpg';
    const path = `catalogs/${catalog.id}/canvas-${Date.now()}.${ext}`;
    const sRef = storageRef(storage, path);
    const task = uploadBytesResumable(sRef, file);
    setRepUploading(true);
    task.on('state_changed',
      (snap) => setRepProgress(Math.round((snap.bytesTransferred / snap.totalBytes) * 100)),
      () => setRepUploading(false),
      async () => { onChange({ imageUrl: await getDownloadURL(task.snapshot.ref) }); setRepUploading(false); }
    );
  }

  const product = el.type === 'product' ? catalog.items.find((i) => i.id === el.productId) : undefined;
  const lbl = "text-slate-400 text-[10px] font-semibold uppercase tracking-wider";
  const inp = "bg-slate-800 border border-slate-700 rounded-lg px-2.5 py-1.5 text-white text-xs outline-none focus:border-purple-500 transition-colors w-full";
  const sec = "flex flex-col gap-1 mb-3";

  return (
    <div className="p-3 text-xs">
      <p className="text-slate-300 font-semibold text-xs mb-3 flex items-center gap-1.5">
        {el.type === 'text' ? '✏️ Texto' : el.type === 'image' ? '🖼️ Imagen' : '📦 Producto'}
      </p>

      <div className="grid grid-cols-2 gap-2 mb-3">
        {(['x','y','w','h'] as const).map((k) => (
          <div key={k} className="flex flex-col gap-0.5">
            <span className={lbl}>{k.toUpperCase()}</span>
            <input type="number" value={Math.round(el[k])}
              min={k==='w'||k==='h'?20:0} max={k==='x'||k==='w'?CW:CH}
              onChange={(e) => onChange({ [k]: Number(e.target.value) })}
              className={inp} />
          </div>
        ))}
      </div>

      <div className={sec}>
        <label className={lbl}>Opacidad · {Math.round((el.opacity ?? 1) * 100)}%</label>
        <input type="range" min="0" max="1" step="0.05" value={el.opacity ?? 1}
          onChange={(e) => onChange({ opacity: Number(e.target.value) })}
          className="w-full accent-purple-500" />
      </div>

      <div className={sec}>
        <label className={lbl}>Esquinas · {el.borderRadius ?? 0}px</label>
        <input type="range" min="0" max="60" value={el.borderRadius ?? 0}
          onChange={(e) => onChange({ borderRadius: Number(e.target.value) })}
          className="w-full accent-purple-500" />
      </div>

      {el.type === 'text' && <>
        <div className={sec}>
          <label className={lbl}>Texto</label>
          <textarea value={el.text ?? ''} onChange={(e) => onChange({ text: e.target.value })}
            rows={3} className={`${inp} resize-none`} />
        </div>
        <div className={sec}>
          <label className={lbl}>Tamaño · {el.fontSize ?? 24}px</label>
          <input type="range" min="8" max="120" value={el.fontSize ?? 24}
            onChange={(e) => onChange({ fontSize: Number(e.target.value) })}
            className="w-full accent-purple-500" />
        </div>
        <div className={sec}>
          <label className={lbl}>Color</label>
          <div className="flex items-center gap-2">
            <input type="color" value={el.color ?? '#ffffff'}
              onChange={(e) => onChange({ color: e.target.value })}
              className="h-8 w-12 rounded cursor-pointer border-0 bg-transparent flex-shrink-0" />
            <span className="text-slate-400">{el.color ?? '#ffffff'}</span>
          </div>
        </div>
        <div className={sec}>
          <label className={lbl}>Fuente</label>
          <select value={el.fontFamily ?? 'Inter, sans-serif'}
            onChange={(e) => onChange({ fontFamily: e.target.value })}
            className={inp}>
            {FONTS.map((f) => <option key={f.value} value={f.value}>{f.label}</option>)}
          </select>
        </div>
        <div className={sec}>
          <label className={lbl}>Estilo</label>
          <div className="flex gap-1.5">
            <button onClick={() => onChange({ fontWeight: el.fontWeight==='bold'?'normal':'bold' })}
              className={`flex-1 py-1.5 rounded-lg border text-xs font-bold transition-all ${el.fontWeight==='bold'?'border-purple-500 bg-purple-500/20 text-purple-300':'border-slate-700 text-slate-400'}`}>N</button>
            <button onClick={() => onChange({ fontStyle: el.fontStyle==='italic'?'normal':'italic' })}
              className={`flex-1 py-1.5 rounded-lg border text-xs italic transition-all ${el.fontStyle==='italic'?'border-purple-500 bg-purple-500/20 text-purple-300':'border-slate-700 text-slate-400'}`}>I</button>
          </div>
        </div>
        <div className={sec}>
          <label className={lbl}>Alineación</label>
          <div className="flex gap-1.5">
            {(['left','center','right'] as const).map((a) => (
              <button key={a} onClick={() => onChange({ textAlign: a })}
                className={`flex-1 py-1.5 rounded-lg border text-xs transition-all ${el.textAlign===a?'border-purple-500 bg-purple-500/20 text-purple-300':'border-slate-700 text-slate-400'}`}>
                {a==='left'?'⬅':a==='center'?'↔':'➡'}
              </button>
            ))}
          </div>
        </div>
        <div className={sec}>
          <label className={lbl}>Fondo del cuadro</label>
          <div className="flex items-center gap-2">
            <input type="color" value={el.bgColor||'#000000'}
              onChange={(e) => onChange({ bgColor: e.target.value })}
              className="h-8 w-12 rounded cursor-pointer border-0 bg-transparent flex-shrink-0" />
            <button onClick={() => onChange({ bgColor: '' })}
              className={`text-[10px] px-2 py-1 rounded border transition-all flex-1 ${!el.bgColor?'border-purple-500 text-purple-300 bg-purple-500/10':'border-slate-700 text-slate-500 hover:border-slate-600'}`}>
              Sin fondo
            </button>
          </div>
        </div>
      </>}

      {el.type === 'image' && <>
        <div className={sec}>
          <label className={lbl}>Ajuste</label>
          <div className="flex gap-1.5">
            {(['cover','contain','fill'] as const).map((f) => (
              <button key={f} onClick={() => onChange({ objectFit: f })}
                className={`flex-1 py-1.5 rounded-lg border text-[10px] transition-all ${el.objectFit===f?'border-purple-500 bg-purple-500/20 text-purple-300':'border-slate-700 text-slate-400'}`}>
                {f==='cover'?'Llenar':f==='contain'?'Ajustar':'Estirar'}
              </button>
            ))}
          </div>
        </div>
        <div className={sec}>
          <label className={lbl}>Reemplazar</label>
          <button onClick={() => replaceRef.current?.click()} disabled={repUploading}
            className="w-full flex items-center justify-center gap-1.5 bg-slate-800 hover:bg-slate-700 disabled:opacity-50 border border-dashed border-slate-600 hover:border-purple-500 text-slate-300 hover:text-white rounded-lg py-2 text-xs font-medium transition-all">
            {repUploading ? `⏳ ${repProgress}%` : '📁 Subir nueva imagen'}
          </button>
          <input ref={replaceRef} type="file" accept="image/*" className="hidden"
            onChange={(e) => { const f=e.target.files?.[0]; if(f) replaceImage(f); e.target.value=''; }} />
        </div>
      </>}

      {el.type === 'product' && product && <>
        <div className="mb-3 p-2.5 bg-slate-800 rounded-lg">
          <p className="text-white text-xs font-semibold">{product.name}</p>
          {product.price !== undefined && (
            <p className="text-xs mt-0.5" style={{ color: theme.primaryColor }}>${formatPrice(product.price)}</p>
          )}
        </div>
        <div className={sec}>
          <label className={lbl}>Estilo</label>
          <div className="flex gap-1.5">
            <button onClick={() => onChange({ productStyle: 'card' })}
              className={`flex-1 py-1.5 rounded-lg border text-[10px] transition-all ${(el.productStyle??'card')==='card'?'border-purple-500 bg-purple-500/20 text-purple-300':'border-slate-700 text-slate-400'}`}>Con imagen</button>
            <button onClick={() => onChange({ productStyle: 'minimal' })}
              className={`flex-1 py-1.5 rounded-lg border text-[10px] transition-all ${el.productStyle==='minimal'?'border-purple-500 bg-purple-500/20 text-purple-300':'border-slate-700 text-slate-400'}`}>Solo texto</button>
          </div>
        </div>
      </>}
    </div>
  );
}
