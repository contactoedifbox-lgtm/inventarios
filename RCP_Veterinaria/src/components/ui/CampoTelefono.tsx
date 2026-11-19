import { normalizarTelefono } from '@/lib/format';

interface CampoTelefonoProps {
  value: string;
  onChange: (valor: string) => void;
  id?: string;
  placeholder?: string;
  autoComplete?: string;
}

/**
 * Input de telefono que previsualiza el valor normalizado para Chile
 * (+569XXXXXXXX). El valor se guarda normalizado al enviar el formulario.
 */
export function CampoTelefono({
  value,
  onChange,
  id,
  placeholder = '+56 9 1234 5678',
  autoComplete,
}: CampoTelefonoProps) {
  const digitos = value.replace(/\D/g, '');
  const normalizado = normalizarTelefono(value);

  return (
    <>
      <input
        id={id}
        className="input"
        type="tel"
        autoComplete={autoComplete}
        placeholder={placeholder}
        value={value}
        onChange={(e) => onChange(e.target.value)}
      />
      {digitos.length >= 8 && (
        <p className="mt-1 text-xs text-muted">Se guardara como {normalizado}</p>
      )}
    </>
  );
}
