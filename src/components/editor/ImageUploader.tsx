import { useEffect, useRef, useState } from 'react';
import { ref, uploadBytesResumable, getDownloadURL } from 'firebase/storage';
import { storage } from '../../lib/firebase';

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

const ACCEPTED = 'image/jpeg,image/png,image/webp,image/gif,image/avif';
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

export default function ImageUploader({ catalogId, itemId, images, onChange, onUploadingChange, max = 20 }: Props) {
  const inputRef = useRef<HTMLInputElement>(null);
  const [tasks, setTasks] = useState<UploadTask[]>([]);
  const [dragging, setDragging] = useState(false);

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

  async function uploadFile(file: File) {
    if (images.length + tasks.filter((t) => !t.error).length >= max) return;
    if (file.size > MAX_SIZE_MB * 1024 * 1024) {
      alert(`"${file.name}" supera los ${MAX_SIZE_MB}MB permitidos.`);
      return;
    }

    // Comprimir antes de subir (convierte a WebP ≤900px)
    const toUpload = await compressImage(file);

    const ext = toUpload.name.split('.').pop() ?? 'webp';
    const storageName = `${Date.now()}-${Math.random().toString(36).slice(2, 7)}.${ext}`;
    const storagePath = `catalogs/${catalogId}/items/${itemId}/${storageName}`;
    const taskEntry: UploadTask = { name: storageName, progress: 0 };

    setTasks((prev) => [...prev, taskEntry]);

    const storageRef = ref(storage, storagePath);
    const uploadTask = uploadBytesResumable(storageRef, toUpload, { contentType: toUpload.type });

    uploadTask.on(
      'state_changed',
      (snap) => {
        const progress = Math.round((snap.bytesTransferred / snap.totalBytes) * 100);
        updateTask(storageName, { progress });
      },
      (err) => {
        updateTask(storageName, { error: err.message });
      },
      async () => {
        const url = await getDownloadURL(uploadTask.snapshot.ref);
        onChange([...imagesRef.current, url]);
        setTasks((prev) => prev.filter((t) => t.name !== storageName));
      }
    );
  }

  function handleFiles(files: FileList | null) {
    if (!files) return;
    Array.from(files).forEach(uploadFile);
  }

  function removeImage(url: string) {
    onChange(images.filter((img) => img !== url));
  }

  const canAdd = images.length + tasks.length < max;

  return (
    <div className="space-y-3">
      <div className="flex items-center justify-between">
        <label className="text-slate-300 text-xs font-semibold">
          Imágenes ({images.length}/{max})
        </label>
        {images.length > 0 && (
          <span className="text-slate-500 text-xs">Arrastra para reordenar próximamente</span>
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
                <span className="absolute top-1 left-1 bg-purple-500 text-white text-[9px] font-bold px-1.5 py-0.5 rounded-full">
                  portada
                </span>
              )}
              <button
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
      {tasks.length > 0 && (
        <div className="space-y-1.5">
          {tasks.map((task) => (
            <div key={task.name} className="bg-slate-800 rounded-lg p-2">
              {task.error ? (
                <p className="text-red-400 text-xs">{task.error}</p>
              ) : (
                <>
                  <div className="flex justify-between text-xs text-slate-400 mb-1">
                    <span className="truncate max-w-[160px]">Subiendo...</span>
                    <span>{task.progress}%</span>
                  </div>
                  <div className="w-full bg-slate-700 rounded-full h-1.5 overflow-hidden">
                    <div
                      className="bg-gradient-to-r from-purple-500 to-pink-500 h-1.5 rounded-full transition-all duration-200"
                      style={{ width: `${task.progress}%` }}
                    />
                  </div>
                </>
              )}
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
            <span className="text-slate-500">JPG, PNG, WebP, GIF · máx {MAX_SIZE_MB}MB</span>
          </p>
        </div>
      )}

      <input
        ref={inputRef}
        type="file"
        accept={ACCEPTED}
        multiple
        className="hidden"
        onChange={(e) => handleFiles(e.target.files)}
      />
    </div>
  );
}
