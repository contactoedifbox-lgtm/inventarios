import { formatearRut, validarRut } from '@/lib/rut';

interface CampoRutProps {
  value: string;
  onChange: (valor: string) => void;
  id?: string;
  placeholder?: string;
}

/**
 * Input de RUT con formato en vivo (12.345.678-K) y validacion del digito
 * verificador. El valor se guarda normalizado (12345678-K) al enviar el formulario.
 */
export function CampoRut({ value, onChange, id, placeholder = '12.345.678-5' }: CampoRutProps) {
  return (
    <>
      <input
        id={id}
        className="input"
        inputMode="text"
        autoComplete="off"
        placeholder={placeholder}
        value={value}
        onChange={(e) => onChange(formatearRut(e.target.value))}
      />
      {value.length > 3 && !validarRut(value) && (
        <p className="mt-1 text-xs text-danger-600">RUT invalido</p>
      )}
    </>
  );
}
