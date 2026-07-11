import { useEffect, useRef, useState } from 'react';
import { ref, uploadBytesResumable, getDownloadURL } from 'firebase/storage';
import { IMAGE_UPLOAD_CACHE_CONTROL, storage } from '../../lib/firebase';

interface Props {
  catalogId: string;
  itemId: string;
  images: string[];
  onChange: (images: string[]) => void;
  onUploadingChange?: (isUploading: boolean) => void;
  max?: number;
}

interface UploadTask {
  name: string;
  progress: number; // 0-100
  error?: string;
}

interface BatchProgress {
  total: number;
  currentIndex: number;
  currentName: string;
  fileProgress: number;
}

const ACCEPTED = 'image/*';
const MAX_BATCH = 20;
const MAX_SIZE_MB = 5;
const MAX_PX = 900;       // ancho/alto máximo antes de subir
const QUALITY = 0.82;     // calidad WebP

/** Redimensiona y convierte a WebP antes de subir. Los GIFs se saltean (son animados). */
async function compressImage(file: File): Promise<File> {
  if (file.type === 'image/gif') return file;
  return new Promise((resolve) => {
    const img = new Image();
    const objUrl = URL.createObjectURL(file);
    img.onload = () => {
      URL.revokeObjectURL(objUrl);
      const scale = Math.min(1, MAX_PX / Math.max(img.width, img.height));
      const w = Math.round(img.width * scale);
      const h = Math.round(img.height * scale);
      const canvas = document.createElement('canvas');
      canvas.width = w;
      canvas.height = h;
      canvas.getContext('2d')!.drawImage(img, 0, 0, w, h);
      canvas.toBlob(
        (blob) => {
          if (!blob) { resolve(file); return; }
          resolve(new File([blob], file.name.replace(/\.[^.]+$/, '.webp'), { type: 'image/webp' }));
        },
        'image/webp',
        QUALITY,
      );
    };
    img.onerror = () => { URL.revokeObjectURL(objUrl); resolve(file); };
    img.src = objUrl;
  });
}

export default function ImageUploader({ catalogId, itemId, images, onChange, onUploadingChange, max = 50 }: Props) {
  const inputRef = useRef<HTMLInputElement>(null);
  const [tasks, setTasks] = useState<UploadTask[]>([]);
  const [dragging, setDragging] = useState(false);
  const [batchProgress, setBatchProgress] = useState<BatchProgress | null>(null);

  // Always reflects the latest images prop — fixes stale closure on concurrent uploads
  const imagesRef = useRef(images);
  imagesRef.current = images;

  // Notify parent when upload state changes
  useEffect(() => {
    onUploadingChange?.(tasks.some((t) => !t.error));
  }, [tasks, onUploadingChange]);

  function updateTask(name: string, patch: Partial<UploadTask>) {
    setTasks((prev) => prev.map((t) => (t.name === name ? { ...t, ...patch } : t)));
  }

  async function uploadFile(file: File, batchMeta?: { total: number; currentIndex: number }): Promise<string | null> {
    if (!file.type.startsWith('image/')) {
      alert(`"${file.name}" no es una imagen compatible.`);
      return null;
    }
    if (file.size > MAX_SIZE_MB * 1024 * 1024) {
      alert(`"${file.name}" supera los ${MAX_SIZE_MB}MB permitidos.`);
      return null;
    }

    // Comprimir antes de subir (convierte a WebP ≤900px)
    const toUpload = await compressImage(file);

    const ext = toUpload.name.split('.').pop() ?? 'webp';
    const storageName = `${Date.now()}-${Math.random().toString(36).slice(2, 7)}.${ext}`;
    const storagePath = `catalogs/${catalogId}/items/${itemId}/${storageName}`;
    const taskEntry: UploadTask = { name: storageName, progress: 0 };

    setTasks((prev) => [...prev, taskEntry]);

    const storageRef = ref(storage, storagePath);
    const uploadTask = uploadBytesResumable(storageRef, toUpload, {
      contentType: toUpload.type,
      cacheControl: IMAGE_UPLOAD_CACHE_CONTROL,
    });

    return new Promise((resolve) => {
      uploadTask.on(
        'state_changed',
        (snap) => {
          const progress = Math.round((snap.bytesTransferred / snap.totalBytes) * 100);
          updateTask(storageName, { progress });
          if (batchMeta) {
            setBatchProgress({
              total: batchMeta.total,
              currentIndex: batchMeta.currentIndex,
              currentName: file.name,
              fileProgress: progress,
            });
          }
        },
        (err) => {
          updateTask(storageName, { error: err.message });
          resolve(null);
        },
        async () => {
          const url = await getDownloadURL(uploadTask.snapshot.ref);
          setTasks((prev) => prev.filter((t) => t.name !== storageName));
          resolve(url);
        }
      );
    });
  }

  async function handleFiles(files: FileList | null) {
    if (!files) return;
    const remainingSlots = Math.max(0, max - imagesRef.current.length);
    if (remainingSlots === 0) return;

    const selectedFiles = Array.from(files);
    const limitedFiles = selectedFiles.slice(0, Math.min(MAX_BATCH, remainingSlots));

    if (selectedFiles.length > limitedFiles.length) {
      const batchLimit = Math.min(MAX_BATCH, remainingSlots);
      alert(`Puedes subir hasta ${batchLimit} imágenes en esta tanda.`);
    }

    const uploadedUrls: string[] = [];
    setBatchProgress({
      total: limitedFiles.length,
      currentIndex: 1,
      currentName: limitedFiles[0]?.name ?? '',
      fileProgress: 0,
    });

    for (const [index, file] of limitedFiles.entries()) {
      const url = await uploadFile(file, { total: limitedFiles.length, currentIndex: index + 1 });
      if (url) uploadedUrls.push(url);
    }

    if (uploadedUrls.length > 0) {
      onChange([...imagesRef.current, ...uploadedUrls]);
    }

    setBatchProgress(null);
  }

  function removeImage(url: string) {
    onChange(images.filter((img) => img !== url));
  }

  function setCover(url: string) {
    onChange([url, ...images.filter((img) => img !== url)]);
  }

  const canAdd = images.length + tasks.length < max;

  return (
    <div className="space-y-3">
      <div className="flex items-center justify-between">
        <label className="text-slate-300 text-xs font-semibold">
          Imágenes ({images.length}/{max})
        </label>
        {images.length > 0 && (
          <span className="text-slate-500 text-xs">Elige la foto de portada o elimina fotos</span>
        )}
      </div>

      {/* Grid de imágenes subidas */}
      {images.length > 0 && (
        <div className="grid grid-cols-3 gap-2">
          {images.map((url, i) => (
            <div key={url} className="relative group aspect-square">
              <img
                src={url}
                alt={`imagen ${i + 1}`}
                className="w-full h-full object-cover rounded-xl border border-slate-600"
              />
              {/* Badge de primera imagen */}
              {i === 0 && (
                <div className="absolute left-1 right-1 top-1 flex justify-start">
                  <span className="bg-purple-500/95 text-white text-[9px] font-bold px-2 py-1 rounded-md shadow-sm">
                    Foto de portada
                  </span>
                </div>
              )}
              {i !== 0 && (
                <button
                  type="button"
                  onClick={() => setCover(url)}
                  className="absolute bottom-1 left-1 right-1 bg-slate-900/82 hover:bg-slate-800 text-white text-[10px] font-semibold px-2 py-1 rounded-md transition-colors border border-white/10"
                  title="Elegir como portada"
                >
                  Elegir portada
                </button>
              )}
              <button
                type="button"
                onClick={() => removeImage(url)}
                className="absolute top-1 right-1 bg-red-500 hover:bg-red-600 text-white rounded-full w-5 h-5 text-xs flex items-center justify-center opacity-0 group-hover:opacity-100 transition-opacity shadow"
                title="Eliminar"
              >
                ×
              </button>
            </div>
          ))}
        </div>
      )}

      {/* Tareas en progreso */}
      {(batchProgress || tasks.some((task) => task.error)) && (
        <div className="space-y-2">
          {batchProgress && (
            <div className="bg-slate-800 rounded-xl p-3 border border-slate-700 flex items-center gap-3">
              <div className="relative h-12 w-12 flex-shrink-0">
                <svg viewBox="0 0 36 36" className="h-12 w-12 -rotate-90">
                  <path
                    d="M18 2.5a15.5 15.5 0 1 1 0 31a15.5 15.5 0 1 1 0-31"
                    fill="none"
                    stroke="rgba(148,163,184,0.22)"
                    strokeWidth="3"
                  />
                  <path
                    d="M18 2.5a15.5 15.5 0 1 1 0 31a15.5 15.5 0 1 1 0-31"
                    fill="none"
                    stroke="url(#uploadProgressGradient)"
                    strokeWidth="3"
                    strokeDasharray={`${Math.max(4, batchProgress.fileProgress)}, 100`}
                    strokeLinecap="round"
                  />
                  <defs>
                    <linearGradient id="uploadProgressGradient" x1="0%" y1="0%" x2="100%" y2="100%">
                      <stop offset="0%" stopColor="#a855f7" />
                      <stop offset="100%" stopColor="#ec4899" />
                    </linearGradient>
                  </defs>
                </svg>
                <div className="absolute inset-0 flex items-center justify-center text-[11px] font-bold text-white">
                  {batchProgress.currentIndex}/{batchProgress.total}
                </div>
              </div>
              <div className="min-w-0 flex-1">
                <div className="flex items-center justify-between gap-2 text-xs mb-1">
                  <span className="text-slate-200 font-semibold">Subiendo imágenes</span>
                  <span className="text-slate-400">{batchProgress.fileProgress}%</span>
                </div>
                <p className="text-slate-400 text-xs truncate">
                  Foto {batchProgress.currentIndex} de {batchProgress.total}: {batchProgress.currentName}
                </p>
                <div className="w-full bg-slate-700 rounded-full h-1.5 overflow-hidden mt-2">
                  <div
                    className="bg-gradient-to-r from-purple-500 to-pink-500 h-1.5 rounded-full transition-all duration-200"
                    style={{ width: `${((batchProgress.currentIndex - 1) / batchProgress.total) * 100 + (batchProgress.fileProgress / batchProgress.total)}%` }}
                  />
                </div>
              </div>
            </div>
          )}

          {tasks.filter((task) => task.error).map((task) => (
            <div key={task.name} className="bg-slate-800 rounded-lg p-2">
              <p className="text-red-400 text-xs">{task.error}</p>
            </div>
          ))}
        </div>
      )}

      {/* Drop zone */}
      {canAdd && (
        <div
          onDragOver={(e) => { e.preventDefault(); setDragging(true); }}
          onDragLeave={() => setDragging(false)}
          onDrop={(e) => { e.preventDefault(); setDragging(false); handleFiles(e.dataTransfer.files); }}
          onClick={() => inputRef.current?.click()}
          className={`border-2 border-dashed rounded-xl py-5 flex flex-col items-center gap-1.5 cursor-pointer transition-all ${
            dragging
              ? 'border-purple-400 bg-purple-500/10'
              : 'border-slate-700 hover:border-purple-500 hover:bg-purple-500/5'
          }`}
        >
          <span className="text-2xl">📷</span>
          <p className="text-slate-400 text-xs text-center">
            Haz clic o arrastra imágenes aquí<br />
            <span className="text-slate-500">Hasta {MAX_BATCH} por tanda · máx {MAX_SIZE_MB}MB</span>
          </p>
        </div>
      )}

      <input
        ref={inputRef}
        type="file"
        accept={ACCEPTED}
        multiple
        className="hidden"
        onChange={(e) => { void handleFiles(e.target.files); e.target.value = ''; }}
      />
    </div>
  );
}
