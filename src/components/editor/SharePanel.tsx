import { useRef } from 'react';
import { QRCodeCanvas } from 'qrcode.react';
import type { Catalog } from '../../types';

interface Props {
  catalog: Catalog;
}

export default function SharePanel({ catalog }: Props) {
  const publicUrl = `${window.location.origin}/c/${catalog.slug}`;
  const qrRef = useRef<HTMLDivElement>(null);

  function copyUrl() {
    navigator.clipboard.writeText(publicUrl).catch(() => {});
  }

  function downloadQR() {
    const canvas = qrRef.current?.querySelector('canvas');
    if (!canvas) return;
    const url = canvas.toDataURL('image/png');
    const a = document.createElement('a');
    a.href = url;
    a.download = `qr-${catalog.slug}.png`;
    a.click();
  }

  return (
    <div className="space-y-6 text-sm">
      <div>
        <label className="block text-slate-300 font-semibold mb-2">URL pública</label>
        <div className="flex gap-2">
          <input
            readOnly
            value={publicUrl}
            className="flex-1 bg-slate-800 border border-slate-700 rounded-lg px-3 py-2 text-purple-300 text-xs outline-none truncate"
          />
          <button
            onClick={copyUrl}
            title="Copiar URL"
            className="bg-slate-700 hover:bg-slate-600 text-white px-3 py-2 rounded-lg transition-colors"
          >
            📋
          </button>
        </div>
        <a
          href={publicUrl}
          target="_blank"
          rel="noopener noreferrer"
          className="mt-1 inline-block text-xs text-purple-400 hover:text-purple-300 transition-colors"
        >
          Abrir carta pública ↗
        </a>
      </div>

      {/* QR */}
      <div>
        <label className="block text-slate-300 font-semibold mb-3">Código QR</label>
        <div className="flex flex-col items-center gap-4">
          <div
            ref={qrRef}
            className="bg-white p-4 rounded-2xl shadow-lg shadow-black/30"
          >
            <QRCodeCanvas
              value={publicUrl}
              size={180}
              level="H"
              marginSize={4}
              fgColor="#111827"
              bgColor="#ffffff"
            />
          </div>
          <button
            onClick={downloadQR}
            className="w-full bg-gradient-to-r from-purple-500 to-pink-500 hover:from-purple-600 hover:to-pink-600 text-white font-semibold py-2.5 rounded-xl transition-all hover:scale-105 active:scale-95"
          >
            ⬇ Descargar QR (PNG)
          </button>
        </div>
      </div>

      {/* Info */}
      <div className="bg-slate-800/50 border border-slate-700 rounded-xl p-4 space-y-2">
        <div className="flex items-center gap-2 text-slate-400">
          <span>🔑</span>
          <span className="text-xs">ID: <span className="font-mono text-slate-300">{catalog.id.slice(0, 8)}…</span></span>
        </div>
        <div className="flex items-center gap-2 text-slate-400">
          <span>📅</span>
          <span className="text-xs">Actualizado: {new Date(catalog.updatedAt).toLocaleString()}</span>
        </div>
      </div>
    </div>
  );
}
