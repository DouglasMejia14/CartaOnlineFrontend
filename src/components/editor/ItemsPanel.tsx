import { useState } from 'react';
import { v4 as uuidv4 } from 'uuid';
import type { Catalog, CatalogItem, Category, Subcategory } from '../../types';
import { catalogApi } from '../../services/catalogApi';
import { getCategoryId, getCategoryName, isItemInCategory, formatPrice } from '../../utils/catalog';
import ImageUploader from './ImageUploader';

interface Props {
  catalog: Catalog;
  onChange: (updates: Partial<Catalog>) => void;
}

const EMPTY_ITEM: Omit<CatalogItem, 'id'> = {
  name: '',
  description: '',
  price: undefined,
  images: [],
  category: '',
  subcategoryId: null,
  available: true,
  sizes: [],
  brand: '',
};

export default function ItemsPanel({ catalog, onChange }: Props) {
  const [editingItem, setEditingItem] = useState<CatalogItem | null>(null);
  const [isNew, setIsNew] = useState(false);
  const [newCategory, setNewCategory] = useState('');
  const [newSubInputs, setNewSubInputs] = useState<Record<string, string>>({});
  const [itemSaving, setItemSaving] = useState(false);
  const [itemSaveError, setItemSaveError] = useState<string | null>(null);

  function openNew() {
    const firstCat = catalog.categories[0];
    const firstCatId = firstCat ? getCategoryId(firstCat) : '';
    setEditingItem({ id: uuidv4(), ...EMPTY_ITEM, category: firstCatId });
    setIsNew(true);
  }

  async function saveItem(item: CatalogItem) {
    setItemSaving(true);
    setItemSaveError(null);
    try {
      if (isNew) {
        const { id: _tempId, ...payload } = item;
        const created = await catalogApi.createItem(catalog.id, payload);
        onChange({ items: [...catalog.items, created] });
      } else {
        const updated = await catalogApi.updateItem(catalog.id, item.id, item);
        onChange({ items: catalog.items.map((i) => (i.id === item.id ? updated : i)) });
      }
      setEditingItem(null);
    } catch (e) {
      setItemSaveError((e as Error).message);
    } finally {
      setItemSaving(false);
    }
  }

  async function deleteItem(id: string) {
    try {
      await catalogApi.deleteItem(catalog.id, id);
      onChange({ items: catalog.items.filter((i) => i.id !== id) });
    } catch (e) {
      console.error('Error al eliminar item:', (e as Error).message);
    }
  }

  function addCategory() {
    const name = newCategory.trim();
    if (!name) return;
    if (catalog.categories.some((c) => getCategoryName(c) === name)) return;
    const newCat: Category = { id: uuidv4(), name, subcategories: [] };
    onChange({ categories: [...catalog.categories, newCat] });
    setNewCategory('');
  }

  function deleteCategory(catId: string) {
    onChange({ categories: catalog.categories.filter((c) => getCategoryId(c) !== catId) });
  }

  function addSubcategory(catId: string) {
    const name = (newSubInputs[catId] ?? '').trim();
    if (!name) return;
    const newSub: Subcategory = { id: uuidv4(), name };
    onChange({
      categories: catalog.categories.map((c) => {
        if (typeof c === 'string' || c.id !== catId) return c;
        return { ...c, subcategories: [...c.subcategories, newSub] };
      }),
    });
    setNewSubInputs((prev) => ({ ...prev, [catId]: '' }));
  }

  function deleteSubcategory(catId: string, subId: string) {
    onChange({
      categories: catalog.categories.map((c) => {
        if (typeof c === 'string' || c.id !== catId) return c;
        return { ...c, subcategories: c.subcategories.filter((s) => s.id !== subId) };
      }),
    });
  }

  const grouped = catalog.categories.reduce<Record<string, CatalogItem[]>>((acc, cat) => {
    const catId = getCategoryId(cat);
    acc[catId] = catalog.items.filter((i) => isItemInCategory(i.category, cat));
    return acc;
  }, {});

  const unassigned = catalog.items.filter(
    (i) => !i.category || !catalog.categories.some((c) => isItemInCategory(i.category, c))
  );

  return (
    <div className="space-y-5 text-sm">
      {/* Categories */}
      <section className="space-y-3">
        <label className="text-slate-300 font-semibold block">Categorías</label>

        {catalog.categories.map((c) => {
          const catId = getCategoryId(c);
          const catName = getCategoryName(c);
          const subcategories = typeof c === 'string' ? [] : c.subcategories;
          return (
            <div key={catId} className="bg-slate-800 border border-slate-700 rounded-xl p-3 space-y-2">
              {/* Category header */}
              <div className="flex items-center gap-2">
                <span className="text-slate-200 text-xs font-semibold flex-1 truncate">{catName}</span>
                <button
                  onClick={() => deleteCategory(catId)}
                  className="w-5 h-5 flex items-center justify-center rounded-full hover:bg-red-500/30 hover:text-red-400 text-slate-500 transition-colors text-xs"
                  title="Eliminar categoría"
                >×</button>
              </div>

              {/* Subcategories */}
              {subcategories.length > 0 && (
                <div className="flex flex-wrap gap-1.5 pl-1">
                  {subcategories.map((sub) => (
                    <span key={sub.id} className="flex items-center gap-1 bg-slate-700 text-slate-300 pl-2 pr-1 py-0.5 rounded-full text-[11px]">
                      {sub.name}
                      <button
                        onClick={() => deleteSubcategory(catId, sub.id)}
                        className="w-3.5 h-3.5 flex items-center justify-center rounded-full hover:bg-red-500/30 hover:text-red-400 text-slate-500 transition-colors"
                        title="Eliminar subcategoría"
                      >×</button>
                    </span>
                  ))}
                </div>
              )}

              {/* Add subcategory */}
              <div className="flex gap-1.5 pl-1">
                <input
                  type="text"
                  value={newSubInputs[catId] ?? ''}
                  onChange={(e) => setNewSubInputs((prev) => ({ ...prev, [catId]: e.target.value }))}
                  onKeyDown={(e) => { if (e.key === 'Enter') { e.preventDefault(); addSubcategory(catId); } }}
                  placeholder="+ Subcategoría..."
                  className="flex-1 bg-slate-700 border border-slate-600 rounded-lg px-2.5 py-1 text-white placeholder-slate-500 outline-none focus:border-purple-500 transition-colors text-[11px]"
                />
                <button
                  onClick={() => addSubcategory(catId)}
                  className="bg-slate-700 hover:bg-slate-600 text-slate-300 px-2.5 py-1 rounded-lg text-[11px] transition-colors"
                >+</button>
              </div>
            </div>
          );
        })}

        {/* Add category */}
        <div className="flex gap-2">
          <input
            type="text"
            value={newCategory}
            onChange={(e) => setNewCategory(e.target.value)}
            onKeyDown={(e) => e.key === 'Enter' && addCategory()}
            placeholder="Nueva categoría..."
            className="flex-1 bg-slate-800 border border-slate-700 rounded-lg px-3 py-1.5 text-white placeholder-slate-500 outline-none focus:border-purple-500 transition-colors text-xs"
          />
          <button
            onClick={addCategory}
            className="bg-slate-700 hover:bg-slate-600 text-white px-3 py-1.5 rounded-lg text-xs transition-colors"
          >+</button>
        </div>
      </section>

      {/* Add item button */}
      <button
        onClick={openNew}
        className="w-full border-2 border-dashed border-slate-700 hover:border-purple-500 text-slate-400 hover:text-purple-400 py-3 rounded-xl transition-all text-sm font-medium"
      >
        + Agregar {catalog.type === 'restaurant' ? 'plato' : 'producto'}
      </button>

      {/* Items by category */}
      {catalog.categories.map((cat) => {
        const catId = getCategoryId(cat);
        const catName = getCategoryName(cat);
        const catItems = grouped[catId] ?? [];
        return (
          <section key={catId}>
            <h3 className="text-slate-400 font-semibold text-xs uppercase tracking-wider mb-2">{catName}</h3>
            {catItems.length === 0 && (
              <p className="text-slate-600 text-xs italic pl-2">Sin items</p>
            )}
            <div className="space-y-2">
              {catItems.map((item) => {
                const subName = (typeof cat !== 'string' && item.subcategoryId)
                  ? cat.subcategories.find((s) => s.id === item.subcategoryId)?.name
                  : undefined;
                return (
                  <div key={item.id} className="bg-slate-800 border border-slate-700 rounded-xl p-3 flex items-center gap-3">
                    {item.images && item.images.length > 0 ? (
                      <div className="relative w-10 h-10 flex-shrink-0">
                        <img src={item.images[0]} alt={item.name} className="w-10 h-10 rounded-lg object-cover" />
                        {item.images.length > 1 && (
                          <span className="absolute -bottom-1 -right-1 bg-purple-500 text-white text-[9px] font-bold rounded-full w-4 h-4 flex items-center justify-center">
                            {item.images.length}
                          </span>
                        )}
                      </div>
                    ) : (
                      <div className="w-10 h-10 rounded-lg bg-slate-700 flex items-center justify-center flex-shrink-0 text-slate-500 text-xs">📷</div>
                    )}
                    <div className="flex-1 min-w-0">
                      <div className="text-white font-medium truncate">{item.name}</div>
                      {subName && (
                        <div className="text-slate-500 text-[10px] truncate">{subName}</div>
                      )}
                      {item.price !== undefined && (
                        <div className="text-purple-400 text-xs">${formatPrice(item.price)}</div>
                      )}
                    </div>
                    <div className="flex gap-1">
                      <button
                        onClick={() => { setEditingItem(item); setIsNew(false); }}
                        className="text-slate-400 hover:text-white p-1 rounded transition-colors"
                        title="Editar"
                      >✏️</button>
                      <button
                        onClick={() => deleteItem(item.id)}
                        className="text-slate-400 hover:text-red-400 p-1 rounded transition-colors"
                        title="Eliminar"
                      >🗑️</button>
                    </div>
                  </div>
                );
              })}
            </div>
          </section>
        );
      })}

      {/* Items sin categoría (migración incompleta del backend) */}
      {unassigned.length > 0 && (
        <section>
          <h3 className="text-amber-500 font-semibold text-xs uppercase tracking-wider mb-2 flex items-center gap-1">
            ⚠️ Sin categoría
            <span className="text-amber-500/60 normal-case font-normal">— edítalos para asignar una</span>
          </h3>
          <div className="space-y-2">
            {unassigned.map((item) => (
              <div key={item.id} className="bg-slate-800 border border-amber-500/30 rounded-xl p-3 flex items-center gap-3">
                {item.images && item.images.length > 0 ? (
                  <img src={item.images[0]} alt={item.name} className="w-10 h-10 rounded-lg object-cover flex-shrink-0" />
                ) : (
                  <div className="w-10 h-10 rounded-lg bg-slate-700 flex items-center justify-center flex-shrink-0 text-slate-500 text-xs">📷</div>
                )}
                <div className="flex-1 min-w-0">
                  <div className="text-white font-medium truncate">{item.name}</div>
                  {item.price !== undefined && (
                    <div className="text-purple-400 text-xs">${formatPrice(item.price)}</div>
                  )}
                </div>
                <div className="flex gap-1">
                  <button
                    onClick={() => { setEditingItem(item); setIsNew(false); }}
                    className="text-slate-400 hover:text-white p-1 rounded transition-colors"
                    title="Editar y asignar categoría"
                  >✏️</button>
                  <button
                    onClick={() => deleteItem(item.id)}
                    className="text-slate-400 hover:text-red-400 p-1 rounded transition-colors"
                    title="Eliminar"
                  >🗑️</button>
                </div>
              </div>
            ))}
          </div>
        </section>
      )}

      {/* Edit/Create modal */}
      {editingItem && (
        <ItemEditModal
          item={editingItem}
          catalogId={catalog.id}
          categories={catalog.categories}
          type={catalog.type}
          onSave={saveItem}
          onClose={() => { setEditingItem(null); setItemSaveError(null); }}
          isSaving={itemSaving}
          saveError={itemSaveError}
        />
      )}
    </div>
  );
}

function ItemEditModal({
  item,
  catalogId,
  categories,
  type,
  onSave,
  onClose,
  isSaving = false,
  saveError = null,
}: {
  item: CatalogItem;
  catalogId: string;
  categories: Catalog['categories'];
  type: 'restaurant' | 'products';
  onSave: (item: CatalogItem) => void;
  onClose: () => void;
  isSaving?: boolean;
  saveError?: string | null;
}) {
  const [form, setForm] = useState<CatalogItem>({ ...item });
  const [uploading, setUploading] = useState(false);
  const [newSize, setNewSize] = useState('');

  function set<K extends keyof CatalogItem>(key: K, value: CatalogItem[K]) {
    setForm((prev) => ({ ...prev, [key]: value }));
  }

  function addSize() {
    const s = newSize.trim();
    if (!s || (form.sizes ?? []).includes(s)) return;
    set('sizes', [...(form.sizes ?? []), s]);
    setNewSize('');
  }

  return (
    <div className="fixed inset-0 bg-black/70 backdrop-blur-sm z-50 flex items-end sm:items-center justify-center px-4 pb-4 sm:pb-0">
      <div className="bg-slate-800 border border-slate-700 rounded-2xl p-5 w-full max-w-sm space-y-4 max-h-[90dvh] overflow-y-auto">
        <h3 className="text-white font-bold text-lg">
          {type === 'restaurant' ? '🍽️ Plato' : '👗 Producto'}
        </h3>

        <input
          type="text"
          placeholder="Nombre *"
          value={form.name}
          onChange={(e) => set('name', e.target.value)}
          className="w-full bg-slate-700 border border-slate-600 rounded-xl px-3 py-2.5 text-white placeholder-slate-400 outline-none focus:border-purple-500 transition-colors"
        />

        <textarea
          placeholder="Descripción"
          value={form.description}
          onChange={(e) => set('description', e.target.value)}
          rows={2}
          className="w-full bg-slate-700 border border-slate-600 rounded-xl px-3 py-2.5 text-white placeholder-slate-400 outline-none focus:border-purple-500 transition-colors resize-none"
        />

        <input
          type="number"
          placeholder="Precio"
          value={form.price ?? ''}
          onChange={(e) => set('price', e.target.value ? parseFloat(e.target.value) : undefined)}
          className="w-full bg-slate-700 border border-slate-600 rounded-xl px-3 py-2.5 text-white placeholder-slate-400 outline-none focus:border-purple-500 transition-colors"
        />

        {type === 'products' && (
          <input
            type="text"
            placeholder="Marca (ej: Nike, Adidas…)"
            value={form.brand ?? ''}
            onChange={(e) => set('brand', e.target.value)}
            className="w-full bg-slate-700 border border-slate-600 rounded-xl px-3 py-2.5 text-white placeholder-slate-400 outline-none focus:border-purple-500 transition-colors"
          />
        )}

        <ImageUploader
          catalogId={catalogId}
          itemId={form.id}
          images={form.images ?? []}
          onChange={(imgs) => set('images', imgs)}
          onUploadingChange={setUploading}
        />

        {/* Category */}
        <select
          value={form.category}
          onChange={(e) => { set('category', e.target.value); set('subcategoryId', null); }}
          className="w-full bg-slate-700 border border-slate-600 rounded-xl px-3 py-2.5 text-white outline-none focus:border-purple-500 transition-colors"
        >
          <option value="">Sin categoría</option>
          {categories.map((c) => {
            const id = getCategoryId(c);
            const name = getCategoryName(c);
            return <option key={id} value={id}>{name}</option>;
          })}
        </select>

        {/* Subcategory — only if selected category has subcategories */}
        {(() => {
          const selectedCat = categories.find((c) => getCategoryId(c) === form.category);
          const subs = (selectedCat && typeof selectedCat !== 'string') ? selectedCat.subcategories : [];
          if (subs.length === 0) return null;
          return (
            <select
              value={form.subcategoryId ?? ''}
              onChange={(e) => set('subcategoryId', e.target.value || null)}
              className="w-full bg-slate-700 border border-slate-600 rounded-xl px-3 py-2.5 text-white outline-none focus:border-purple-500 transition-colors"
            >
              <option value="">Sin subcategoría</option>
              {subs.map((s) => (
                <option key={s.id} value={s.id}>{s.name}</option>
              ))}
            </select>
          );
        })()}

        {/* Tallas (solo productos) */}
        {type === 'products' && (
          <div>
            <label className="text-slate-400 text-xs mb-1.5 block">Tallas</label>
            <div className="flex flex-wrap gap-1.5 mb-2">
              {(form.sizes ?? []).map((s) => (
                <span key={s} className="flex items-center gap-1 bg-slate-700 text-slate-200 pl-2.5 pr-1 py-1 rounded-full text-xs">
                  {s}
                  <button
                    type="button"
                    onClick={() => set('sizes', (form.sizes ?? []).filter((x) => x !== s))}
                    className="w-4 h-4 flex items-center justify-center rounded-full hover:bg-red-500/30 hover:text-red-400 text-slate-400 transition-colors"
                  >×</button>
                </span>
              ))}
            </div>
            <div className="flex gap-2">
              <input
                type="text"
                value={newSize}
                onChange={(e) => setNewSize(e.target.value)}
                onKeyDown={(e) => { if (e.key === 'Enter') { e.preventDefault(); addSize(); } }}
                placeholder="Ej: S, M, L, XL..."
                className="flex-1 bg-slate-700 border border-slate-600 rounded-xl px-3 py-2 text-white placeholder-slate-400 outline-none focus:border-purple-500 transition-colors text-xs"
              />
              <button
                type="button"
                onClick={addSize}
                className="bg-slate-700 hover:bg-slate-600 text-white px-3 py-2 rounded-xl text-xs transition-colors"
              >+</button>
            </div>
          </div>
        )}

        {/* Disponible */}
        <label className="flex items-center gap-2 cursor-pointer select-none">
          <input
            type="checkbox"
            checked={form.available ?? true}
            onChange={(e) => set('available', e.target.checked)}
            className="w-4 h-4 accent-purple-500"
          />
          <span className="text-slate-300 text-sm">Disponible</span>
        </label>

        {saveError && <p className="text-red-400 text-xs">{saveError}</p>}

        <div className="flex gap-3 pt-1">
          <button
            onClick={onClose}
            className="flex-1 bg-slate-700 hover:bg-slate-600 text-white py-2.5 rounded-xl transition-colors font-medium"
          >
            Cancelar
          </button>
          <button
            onClick={() => form.name.trim() && !uploading && !isSaving && onSave(form)}
            disabled={!form.name.trim() || uploading || isSaving}
            className="flex-1 bg-gradient-to-r from-purple-500 to-pink-500 disabled:opacity-40 text-white py-2.5 rounded-xl transition-all hover:scale-105 active:scale-95 font-medium"
          >
            {isSaving ? 'Guardando...' : uploading ? 'Subiendo fotos...' : 'Guardar'}
          </button>
        </div>
      </div>
    </div>
  );
}
