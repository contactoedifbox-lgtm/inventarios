import { useRef, type ReactNode } from 'react';

interface ModalProps {
  open: boolean;
  title: string;
  onClose: () => void;
  children: ReactNode;
  wide?: boolean;
}

export function Modal({ open, title, onClose, children, wide = false }: ModalProps) {
  // Recuerda si la pulsacion comenzo sobre el fondo (y no dentro del contenido),
  // para no cerrar el modal si el mouse se suelta fuera tras empezar dentro.
  const inicioEnFondo = useRef(false);

  if (!open) return null;

  return (
    <div
      className="fixed inset-0 z-50 flex items-start justify-center overflow-y-auto bg-slate-900/40 p-4"
      onMouseDown={(evento) => {
        inicioEnFondo.current = evento.target === evento.currentTarget;
      }}
      onClick={(evento) => {
        if (inicioEnFondo.current && evento.target === evento.currentTarget) {
          onClose();
        }
      }}
      role="presentation"
    >
      <div
        className={`mt-10 w-full ${wide ? 'max-w-3xl' : 'max-w-lg'} rounded-xl bg-white shadow-xl`}
        onClick={(evento) => evento.stopPropagation()}
        role="dialog"
        aria-modal="true"
        aria-label={title}
      >
        <div className="flex items-center justify-between border-b border-slate-200 px-5 py-3">
          <h2 className="text-lg font-semibold text-slate-800">{title}</h2>
          <button
            type="button"
            className="text-xl leading-none text-slate-400 hover:text-slate-600"
            onClick={onClose}
            aria-label="Cerrar"
          >
            ✕
          </button>
        </div>
        <div className="p-5">{children}</div>
      </div>
    </div>
  );
}