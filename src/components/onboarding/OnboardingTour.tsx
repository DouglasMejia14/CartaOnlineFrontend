import { useState } from "react";
import { authApi } from "../../services/authApi";
import { markOnboardingDone } from "../../lib/auth";

interface Props {
  onDone: () => void;
}

const STEPS = [
  {
    icon: "👋",
    title: "¡Bienvenido a CartasOnline!",
    description:
      "Crea cartas y catálogos digitales en minutos, con URL propia y código QR para compartir al instante con tus clientes.",
  },
  {
    icon: "🍽️",
    title: "Cartas de restaurante",
    description:
      "Diseña la carta de tu restaurante con categorías, precios, fotos e información de cada plato. Perfecta para mostrar en mesas o compartir por WhatsApp.",
  },
  {
    icon: "📦",
    title: "Catálogos de productos",
    description:
      "¿Tienes una tienda? Crea un catálogo con tus productos, imágenes, tallas y colores. Ideal para ropa, accesorios, electrónica y más.",
  },
  {
    icon: "🎨",
    title: "Personaliza el diseño",
    description:
      "Elige colores, degradados, imágenes de fondo, tipografías y layouts. Tu catálogo refleja la identidad de tu negocio.",
  },
  {
    icon: "🔗",
    title: "Comparte con un link o QR",
    description:
      "Cada catálogo tiene su propia URL única. Genera un código QR en segundos y ponlo en tus mesas, tarjetas o redes sociales.",
  },
];

export default function OnboardingTour({ onDone }: Props) {
  const [step, setStep] = useState(0);
  const [exiting, setExiting] = useState(false);

  function finish() {
    setExiting(true);
    // Guarda en localStorage de forma permanente (no se sobreescribe con el login)
    markOnboardingDone();
    // Persiste en backend de forma asíncrona sin bloquear la UX
    authApi.completeOnboarding().catch(() => null);
    // Pequeña pausa para la animación de salida
    setTimeout(onDone, 300);
  }

  function next() {
    if (step < STEPS.length - 1) {
      setStep((s) => s + 1);
    } else {
      finish();
    }
  }

  function prev() {
    if (step > 0) setStep((s) => s - 1);
  }

  const current = STEPS[step];
  const isLast = step === STEPS.length - 1;

  return (
    <div
      className={`fixed inset-0 z-50 flex items-end sm:items-center justify-center px-4 pb-4 sm:pb-0
        bg-black/70 backdrop-blur-sm transition-opacity duration-300 ${exiting ? "opacity-0" : "opacity-100"}`}
    >
      <div
        className={`w-full max-w-md bg-slate-900 border border-white/10 rounded-3xl shadow-2xl shadow-purple-900/40
          transition-all duration-300 ${exiting ? "scale-95 opacity-0" : "scale-100 opacity-100"}`}
      >
        {/* Header */}
        <div className="flex items-center justify-between px-6 pt-5 pb-0">
          <span className="text-xs text-slate-500 font-medium tracking-wide uppercase">
            Tour de bienvenida
          </span>
          <button
            onClick={finish}
            className="text-slate-500 hover:text-slate-300 text-sm transition-colors"
          >
            Saltar tour
          </button>
        </div>

        {/* Content */}
        <div className="px-6 pt-8 pb-6 text-center">
          <div className="text-6xl mb-5 select-none">{current.icon}</div>
          <h2 className="text-xl font-black text-white mb-3">{current.title}</h2>
          <p className="text-slate-400 text-sm leading-relaxed">{current.description}</p>
        </div>

        {/* Progress dots */}
        <div className="flex justify-center gap-2 pb-4">
          {STEPS.map((_, i) => (
            <button
              key={i}
              onClick={() => setStep(i)}
              className={`rounded-full transition-all duration-200 ${
                i === step
                  ? "w-5 h-2 bg-purple-400"
                  : "w-2 h-2 bg-slate-600 hover:bg-slate-500"
              }`}
            />
          ))}
        </div>

        {/* Actions */}
        <div className="flex gap-3 px-6 pb-6">
          {step > 0 && (
            <button
              onClick={prev}
              className="flex-1 bg-slate-800 hover:bg-slate-700 text-slate-300 font-semibold py-3 rounded-xl transition-colors"
            >
              Anterior
            </button>
          )}
          <button
            onClick={next}
            className="flex-1 bg-gradient-to-r from-purple-500 to-pink-500 hover:from-purple-600 hover:to-pink-600
              text-white font-bold py-3 rounded-xl transition-all hover:scale-105 active:scale-95 shadow-lg shadow-purple-500/30"
          >
            {isLast ? "¡Empezar!" : "Siguiente"}
          </button>
        </div>
      </div>
    </div>
  );
}
