import { useRef, useState } from 'react';
import { ref, uploadBytesResumable, getDownloadURL } from 'firebase/storage';
import { IMAGE_UPLOAD_CACHE_CONTROL, storage } from '../../lib/firebase';
import type { Catalog, CatalogTheme } from '../../types';

const GRADIENTS = [
  { label: 'Púrpura', value: 'linear-gradient(135deg, #667eea 0%, #764ba2 100%)' },
  { label: 'Atardecer', value: 'linear-gradient(135deg, #f093fb 0%, #f5576c 100%)' },
  { label: 'Océano', value: 'linear-gradient(135deg, #4facfe 0%, #00f2fe 100%)' },
  { label: 'Bosque', value: 'linear-gradient(135deg, #43e97b 0%, #38f9d7 100%)' },
  { label: 'Llama', value: 'linear-gradient(135deg, #fa709a 0%, #fee140 100%)' },
  { label: 'Noche', value: 'linear-gradient(135deg, #0f0c29 0%, #302b63 50%, #24243e 100%)' },
  { label: 'Crema', value: 'linear-gradient(135deg, #ffecd2 0%, #fcb69f 100%)' },
  { label: 'Menta', value: 'linear-gradient(135deg, #a1ffce 0%, #faffd1 100%)' },
];

const SOLID_COLORS = [
  '#ffffff', '#f8f7f4', '#1a1a2e', '#16213e', '#0f3460',
  '#1b1b1b', '#2d2d2d', '#f5e6d3', '#fff8f0', '#fdf6e3',
];

const FONTS = [
  { label: 'Inter (moderno)', value: 'Inter, sans-serif' },
  { label: 'Georgia (clásico)', value: 'Georgia, serif' },
  { label: 'Playfair', value: '\'Playfair Display\', serif' },
  { label: 'Monospace', value: 'ui-monospace, monospace' },
];

const LAYOUT_OPTIONS: { value: NonNullable<CatalogTheme['layout']>; label: string; icon: string; desc: string }[] = [
  { value: 'list',      label: 'Lista',         icon: '☰', desc: 'Tarjetas horizontales con imagen pequeña' },
  { value: 'grid',      label: 'Cuadrícula',    icon: '⊞', desc: 'Grid 2 col con imagen grande' },
  { value: 'editorial', label: 'Editorial',     icon: '◈', desc: 'Primer item destacado + grid' },
  { value: 'minimal',   label: 'Minimalista',   icon: '≡', desc: 'Solo texto, estilo carta clásica' },
  { value: 'canvas',    label: 'Diseño Libre',  icon: '🖼', desc: 'Ubica items sobre imagen de fondo' },
];

const RADIUS_OPTIONS: { label: string; value: CatalogTheme['borderRadius'] }[] = [
  { label: 'Sin bordes', value: 'none' },
  { label: 'Suave', value: 'sm' },
  { label: 'Medio', value: 'md' },
  { label: 'Grande', value: 'lg' },
  { label: 'Circular', value: 'full' },
];

interface Props {
  catalog: Catalog;
  onChange: (updates: Partial<Catalog>) => void;
}

export default function ThemePanel({ catalog, onChange }: Props) {
  const { theme } = catalog;
  const bgFileRef = useRef<HTMLInputElement>(null);
  const [bgUploading, setBgUploading] = useState(false);
  const [bgProgress, setBgProgress] = useState(0);
  const logoFileRef = useRef<HTMLInputElement>(null);
  const [logoUploading, setLogoUploading] = useState(false);
  const [logoProgress, setLogoProgress] = useState(0);

  function updateTheme(updates: Partial<CatalogTheme>) {
    onChange({ theme: { ...theme, ...updates } });
  }

  function uploadBgImage(file: File) {
    if (!file.type.startsWith('image/')) return;
    const ext = file.name.split('.').pop() ?? 'jpg';
    const path = `catalogs/${catalog.id}/bg-${Date.now()}.${ext}`;
    const storageRef = ref(storage, path);
    const task = uploadBytesResumable(storageRef, file, {
      contentType: file.type,
      cacheControl: IMAGE_UPLOAD_CACHE_CONTROL,
    });
    setBgUploading(true);
    setBgProgress(0);
    task.on(
      'state_changed',
      (snap) => setBgProgress(Math.round((snap.bytesTransferred / snap.totalBytes) * 100)),
      () => setBgUploading(false),
      async () => {
        const url = await getDownloadURL(task.snapshot.ref);
        updateTheme({ bgValue: url });
        setBgUploading(false);
      }
    );
  }

  function uploadLogo(file: File) {
    if (!file.type.startsWith('image/')) return;
    const ext = file.name.split('.').pop() ?? 'png';
    const path = `catalogs/${catalog.id}/logo-${Date.now()}.${ext}`;
    const storageRef = ref(storage, path);
    const task = uploadBytesResumable(storageRef, file, {
      contentType: file.type,
      cacheControl: IMAGE_UPLOAD_CACHE_CONTROL,
    });
    setLogoUploading(true);
    setLogoProgress(0);
    task.on(
      'state_changed',
      (snap) => setLogoProgress(Math.round((snap.bytesTransferred / snap.totalBytes) * 100)),
      () => setLogoUploading(false),
      async () => {
        const url = await getDownloadURL(task.snapshot.ref);
        onChange({ logo: url });
        setLogoUploading(false);
      }
    );
  }

  return (
    <div className="space-y-6 text-sm">
      {/* Title & description */}
      <section>
        <label className="block text-slate-300 font-semibold mb-2">Nombre del catálogo</label>
        <input
          type="text"
          value={catalog.title}
          onChange={(e) => onChange({ title: e.target.value })}
          className="w-full bg-slate-800 border border-slate-700 rounded-lg px-3 py-2 text-white placeholder-slate-500 outline-none focus:border-purple-500 transition-colors"
        />
      </section>

      <section>
        <label className="block text-slate-300 font-semibold mb-2">Descripción</label>
        <textarea
          value={catalog.description}
          onChange={(e) => onChange({ description: e.target.value })}
          rows={2}
          placeholder="Una breve descripción de tu negocio..."
          className="w-full bg-slate-800 border border-slate-700 rounded-lg px-3 py-2 text-white placeholder-slate-500 outline-none focus:border-purple-500 transition-colors resize-none"
        />
      </section>

      {/* ── Logo & portada ── */}
      <section className="space-y-4">
        <label className="block text-slate-300 font-semibold">Logo del negocio</label>

        <input
          ref={logoFileRef}
          type="file"
          accept="image/*"
          className="hidden"
          onChange={(e) => { const f = e.target.files?.[0]; if (f) uploadLogo(f); e.target.value = ''; }}
        />
        <button
          onClick={() => logoFileRef.current?.click()}
          disabled={logoUploading}
          className="w-full flex items-center justify-center gap-2 bg-slate-800 hover:bg-slate-700 disabled:opacity-50 border border-dashed border-slate-600 hover:border-purple-500 text-slate-300 hover:text-white rounded-lg py-3 text-xs font-medium transition-all"
        >
          {logoUploading ? (
            <><span className="animate-spin">⏳</span> Subiendo {logoProgress}%</>
          ) : (
            <><span>🖼️</span> Subir logo del negocio</>
          )}
        </button>
        {logoUploading && (
          <div className="h-1 bg-slate-700 rounded-full overflow-hidden">
            <div className="h-full bg-purple-500 transition-all duration-200" style={{ width: `${logoProgress}%` }} />
          </div>
        )}
        {catalog.logo && (
          <div className="flex items-center gap-3">
            <img src={catalog.logo} alt="logo" className="w-14 h-14 object-contain rounded-xl border border-slate-700 bg-slate-800 p-1" />
            <button
              onClick={() => onChange({ logo: '' })}
              className="text-xs text-red-400 hover:text-red-300 transition-colors"
            >
              Quitar logo
            </button>
          </div>
        )}

        <div className="space-y-2">
          <label className="block text-slate-400 text-xs">Mostrar en la portada</label>
          <div className="flex gap-2">
            <button
              onClick={() => updateTheme({ showTitle: !(theme.showTitle ?? true) })}
              className={`flex-1 py-2 rounded-lg text-xs font-medium border transition-all ${
                (theme.showTitle ?? true)
                  ? 'border-purple-500 bg-purple-500/20 text-purple-300'
                  : 'border-slate-700 text-slate-500'
              }`}
            >
              {(theme.showTitle ?? true) ? '✓' : '○'} Nombre
            </button>
            <button
              onClick={() => updateTheme({ showDescription: !(theme.showDescription ?? true) })}
              className={`flex-1 py-2 rounded-lg text-xs font-medium border transition-all ${
                (theme.showDescription ?? true)
                  ? 'border-purple-500 bg-purple-500/20 text-purple-300'
                  : 'border-slate-700 text-slate-500'
              }`}
            >
              {(theme.showDescription ?? true) ? '✓' : '○'} Descripción
            </button>
          </div>
        </div>

        <div>
          <label className="block text-slate-400 text-xs mb-2">Alineación de portada</label>
          <div className="grid grid-cols-3 gap-2">
            {(['left', 'center', 'right'] as const).map((a) => (
              <button
                key={a}
                onClick={() => updateTheme({ headerAlign: a })}
                className={`py-2 rounded-lg text-xs font-medium border transition-all ${
                  (theme.headerAlign ?? 'center') === a
                    ? 'border-purple-500 bg-purple-500/20 text-purple-300'
                    : 'border-slate-700 text-slate-400 hover:border-slate-600'
                }`}
              >
                {a === 'left' ? '⬅ Izq' : a === 'center' ? '↔ Centro' : 'Der ➡'}
              </button>
            ))}
          </div>
        </div>
      </section>

      {/* Background type */}
      <section>
        <label className="block text-slate-300 font-semibold mb-3">Tipo de fondo</label>
        <div className="grid grid-cols-3 gap-2">
          {([
            { value: 'solid', label: '🔲 Sólido' },
            { value: 'gradient', label: '🌈 Degradado' },
            { value: 'image', label: '🖼️ Imagen / GIF' },
          ] as const).map((t) => (
            <button
              key={t.value}
              onClick={() => updateTheme({ bgType: t.value })}
              className={`py-2 rounded-lg text-xs font-medium transition-all border ${
                theme.bgType === t.value
                  ? 'border-purple-500 bg-purple-500/20 text-purple-300'
                  : 'border-slate-700 text-slate-400 hover:border-slate-600'
              }`}
            >
              {t.label}
            </button>
          ))}
        </div>
      </section>

      {/* Image / GIF upload + URL */}
      {theme.bgType === 'image' && (
        <section className="space-y-3">
          {/* Upload button */}
          <div>
            <label className="block text-slate-400 mb-1.5 text-xs">Subir imagen de fondo</label>
            <input
              ref={bgFileRef}
              type="file"
              accept="image/*"
              className="hidden"
              onChange={(e) => { const f = e.target.files?.[0]; if (f) uploadBgImage(f); e.target.value = ''; }}
            />
            <button
              onClick={() => bgFileRef.current?.click()}
              disabled={bgUploading}
              className="w-full flex items-center justify-center gap-2 bg-slate-800 hover:bg-slate-700 disabled:opacity-50 border border-dashed border-slate-600 hover:border-purple-500 text-slate-300 hover:text-white rounded-lg py-3 text-xs font-medium transition-all"
            >
              {bgUploading ? (
                <>
                  <span className="animate-spin">⏳</span>
                  Subiendo {bgProgress}%
                </>
              ) : (
                <>
                  <span>📁</span> Seleccionar archivo (JPG, PNG, WebP, GIF)
                </>
              )}
            </button>
            {bgUploading && (
              <div className="mt-1.5 h-1 bg-slate-700 rounded-full overflow-hidden">
                <div
                  className="h-full bg-purple-500 transition-all duration-200"
                  style={{ width: `${bgProgress}%` }}
                />
              </div>
            )}
          </div>

          {/* URL manual (para GIFs externos u otros) */}
          <div>
            <label className="block text-slate-500 mb-1 text-xs">O pega una URL directa (GIF animado, etc.)</label>
            <input
              type="url"
              placeholder="https://ejemplo.com/fondo.gif"
              value={theme.bgValue.startsWith('http') ? theme.bgValue : ''}
              onChange={(e) => updateTheme({ bgValue: e.target.value })}
              className="w-full bg-slate-800 border border-slate-700 rounded-lg px-3 py-2 text-white placeholder-slate-500 outline-none focus:border-purple-500 transition-colors text-xs"
            />
          </div>

          {/* Preview */}
          {theme.bgValue && (
            <div className="rounded-lg overflow-hidden border border-slate-700 h-20 relative">
              <img
                src={theme.bgValue}
                alt="preview fondo"
                className="w-full h-full object-cover"
                onError={(e) => { (e.target as HTMLImageElement).style.display = 'none'; }}
              />
              <button
                onClick={() => updateTheme({ bgValue: '' })}
                className="absolute top-1 right-1 bg-black/60 hover:bg-black/80 text-white text-xs rounded-full w-5 h-5 flex items-center justify-center"
                title="Quitar fondo"
              >
                ×
              </button>
            </div>
          )}
        </section>
      )}

      {/* Gradient presets */}
      {theme.bgType === 'gradient' && (
        <section>
          <label className="block text-slate-400 mb-2">Degradados predefinidos</label>
          <div className="grid grid-cols-4 gap-2">
            {GRADIENTS.map((g) => (
              <button
                key={g.label}
                title={g.label}
                onClick={() => updateTheme({ bgValue: g.value })}
                className={`h-10 rounded-lg border-2 transition-all hover:scale-110 ${
                  theme.bgValue === g.value ? 'border-white' : 'border-transparent'
                }`}
                style={{ background: g.value }}
              />
            ))}
          </div>
        </section>
      )}

      {/* Solid colors */}
      {theme.bgType === 'solid' && (
        <section>
          <label className="block text-slate-400 mb-2">Colores predefinidos</label>
          <div className="grid grid-cols-5 gap-2 mb-3">
            {SOLID_COLORS.map((c) => (
              <button
                key={c}
                title={c}
                onClick={() => updateTheme({ bgValue: c })}
                className={`h-8 w-8 rounded-lg border-2 transition-all hover:scale-110 ${
                  theme.bgValue === c ? 'border-purple-400' : 'border-slate-600'
                }`}
                style={{ background: c }}
              />
            ))}
          </div>
          <div className="flex items-center gap-2">
            <label className="text-slate-400 text-xs">Personalizado:</label>
            <input
              type="color"
              value={theme.bgValue.startsWith('#') ? theme.bgValue : '#ffffff'}
              onChange={(e) => updateTheme({ bgValue: e.target.value })}
              className="h-8 w-16 rounded cursor-pointer bg-transparent border-0"
            />
          </div>
        </section>
      )}

      {/* Primary color */}
      <section>
        <label className="block text-slate-300 font-semibold mb-2">Color principal</label>
        <div className="flex items-center gap-3">
          <input
            type="color"
            value={theme.primaryColor}
            onChange={(e) => updateTheme({ primaryColor: e.target.value })}
            className="h-9 w-16 rounded cursor-pointer bg-transparent border-0"
          />
          <span className="text-slate-400 text-xs">{theme.primaryColor}</span>
        </div>
      </section>

      {/* Font */}
      <section>
        <label className="block text-slate-300 font-semibold mb-2">Tipografía</label>
        <div className="space-y-2">
          {FONTS.map((f) => (
            <button
              key={f.value}
              onClick={() => updateTheme({ fontFamily: f.value })}
              className={`w-full text-left px-3 py-2 rounded-lg border transition-all ${
                theme.fontFamily === f.value
                  ? 'border-purple-500 bg-purple-500/20 text-white'
                  : 'border-slate-700 text-slate-400 hover:border-slate-600'
              }`}
              style={{ fontFamily: f.value }}
            >
              {f.label}
            </button>
          ))}
        </div>
      </section>

      {/* Border radius */}
      <section>
        <label className="block text-slate-300 font-semibold mb-2">Bordes de tarjetas</label>
        <div className="flex flex-wrap gap-2">
          {RADIUS_OPTIONS.map((r) => (
            <button
              key={r.value}
              onClick={() => updateTheme({ borderRadius: r.value })}
              className={`px-3 py-1.5 text-xs rounded-lg border transition-all ${
                theme.borderRadius === r.value
                  ? 'border-purple-500 bg-purple-500/20 text-purple-300'
                  : 'border-slate-700 text-slate-400 hover:border-slate-600'
              }`}
            >
              {r.label}
            </button>
          ))}
        </div>
      </section>

      {/* Layout */}
      <section>
        <label className="block text-slate-300 font-semibold mb-3">Diseño de carta</label>
        {(theme.layout ?? 'list') === 'canvas' && (
          <div className="mb-3 p-3 rounded-lg bg-purple-500/10 border border-purple-500/30 text-purple-300 text-xs leading-relaxed">
            🖼️ <strong>Diseño Libre activo.</strong> El editor de canvas aparece en el panel de la derecha. Sube una imagen de fondo arriba y coloca tus ítems encima.
          </div>
        )}
        <div className="grid grid-cols-2 gap-2">
          {LAYOUT_OPTIONS.map((l) => (
            <button
              key={l.value}
              onClick={() => updateTheme({ layout: l.value })}
              className={`flex flex-col gap-1 p-3 rounded-xl border text-left transition-all ${
                (theme.layout ?? 'list') === l.value
                  ? 'border-purple-500 bg-purple-500/20 text-white'
                  : 'border-slate-700 text-slate-400 hover:border-slate-600'
              }`}
            >
              <span className="text-xl">{l.icon}</span>
              <span className="font-semibold text-xs">{l.label}</span>
              <span className="text-xs opacity-60 leading-tight">{l.desc}</span>
            </button>
          ))}
        </div>
      </section>

      {/* Redes sociales */}
      <section className="space-y-3">
        <label className="block text-slate-300 font-semibold">Redes sociales</label>
        <p className="text-slate-500 text-xs -mt-1">Solo se muestran los íconos que tengan URL configurada.</p>

        <div className="space-y-2">
          <label className="flex items-center gap-2 text-slate-400 text-xs font-medium">
            <svg width="16" height="16" viewBox="0 0 24 24" fill="currentColor" className="text-pink-400"><path d="M12 2.163c3.204 0 3.584.012 4.85.07 3.252.148 4.771 1.691 4.919 4.919.058 1.265.069 1.645.069 4.849 0 3.205-.012 3.584-.069 4.849-.149 3.225-1.664 4.771-4.919 4.919-1.266.058-1.644.07-4.85.07-3.204 0-3.584-.012-4.849-.07-3.26-.149-4.771-1.699-4.919-4.92-.058-1.265-.07-1.644-.07-4.849 0-3.204.013-3.583.07-4.849.149-3.227 1.664-4.771 4.919-4.919 1.266-.057 1.645-.069 4.849-.069zm0-2.163c-3.259 0-3.667.014-4.947.072-4.358.2-6.78 2.618-6.98 6.98-.059 1.281-.073 1.689-.073 4.948 0 3.259.014 3.668.072 4.948.2 4.358 2.618 6.78 6.98 6.98 1.281.058 1.689.072 4.948.072 3.259 0 3.668-.014 4.948-.072 4.354-.2 6.782-2.618 6.979-6.98.059-1.28.073-1.689.073-4.948 0-3.259-.014-3.667-.072-4.947-.196-4.354-2.617-6.78-6.979-6.98-1.281-.059-1.69-.073-4.949-.073zm0 5.838c-3.403 0-6.162 2.759-6.162 6.162s2.759 6.163 6.162 6.163 6.162-2.759 6.162-6.163c0-3.403-2.759-6.162-6.162-6.162zm0 10.162c-2.209 0-4-1.79-4-4 0-2.209 1.791-4 4-4s4 1.791 4 4c0 2.21-1.791 4-4 4zm6.406-11.845c-.796 0-1.441.645-1.441 1.44s.645 1.44 1.441 1.44c.795 0 1.439-.645 1.439-1.44s-.644-1.44-1.439-1.44z"/></svg>
            Instagram
          </label>
          <input
            type="url"
            placeholder="https://instagram.com/tu_usuario"
            value={catalog.instagram ?? ''}
            onChange={(e) => onChange({ instagram: e.target.value || undefined })}
            className="w-full bg-slate-800 border border-slate-700 rounded-lg px-3 py-2 text-white placeholder-slate-500 outline-none focus:border-purple-500 transition-colors text-xs"
          />
        </div>

        <div className="space-y-2">
          <label className="flex items-center gap-2 text-slate-400 text-xs font-medium">
            <svg width="16" height="16" viewBox="0 0 24 24" fill="currentColor" className="text-blue-400"><path d="M24 12.073c0-6.627-5.373-12-12-12s-12 5.373-12 12c0 5.99 4.388 10.954 10.125 11.854v-8.385H7.078v-3.47h3.047V9.43c0-3.007 1.792-4.669 4.533-4.669 1.312 0 2.686.235 2.686.235v2.953H15.83c-1.491 0-1.956.925-1.956 1.874v2.25h3.328l-.532 3.47h-2.796v8.385C19.612 23.027 24 18.062 24 12.073z"/></svg>
            Facebook
          </label>
          <input
            type="url"
            placeholder="https://facebook.com/tu_pagina"
            value={catalog.facebook ?? ''}
            onChange={(e) => onChange({ facebook: e.target.value || undefined })}
            className="w-full bg-slate-800 border border-slate-700 rounded-lg px-3 py-2 text-white placeholder-slate-500 outline-none focus:border-purple-500 transition-colors text-xs"
          />
        </div>

        <div className="space-y-2">
          <label className="flex items-center gap-2 text-slate-400 text-xs font-medium">
            <svg width="16" height="16" viewBox="0 0 24 24" fill="currentColor" className="text-slate-300"><path d="M19.59 6.69a4.83 4.83 0 01-3.77-4.25V2h-3.45v13.67a2.89 2.89 0 01-2.88 2.5 2.89 2.89 0 01-2.89-2.89 2.89 2.89 0 012.89-2.89c.28 0 .54.04.79.1V9.01a6.33 6.33 0 00-.79-.05 6.34 6.34 0 00-6.34 6.34 6.34 6.34 0 006.34 6.34 6.34 6.34 0 006.33-6.34V8.69a8.16 8.16 0 004.77 1.52V6.78a4.85 4.85 0 01-1-.09z"/></svg>
            TikTok
          </label>
          <input
            type="url"
            placeholder="https://tiktok.com/@tu_usuario"
            value={catalog.tiktok ?? ''}
            onChange={(e) => onChange({ tiktok: e.target.value || undefined })}
            className="w-full bg-slate-800 border border-slate-700 rounded-lg px-3 py-2 text-white placeholder-slate-500 outline-none focus:border-purple-500 transition-colors text-xs"
          />
        </div>
      </section>
    </div>
  );
}
