import { useEffect, useRef, useState, type FormEvent } from 'react';

interface BarcodeScannerProps {
  onScan: (codigo: string) => void;
  autoFocus?: boolean;
  placeholder?: string;
}

/**
 * Lector de codigo de barras. La pistola se comporta como un teclado que escribe
 * el codigo y envia Enter, por lo que basta un input enfocado.
 */
export function BarcodeScanner({
  onScan,
  autoFocus = true,
  placeholder = 'Escanea o escribe el codigo de barras',
}: BarcodeScannerProps) {
  const [valor, setValor] = useState('');
  const inputRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    if (autoFocus) inputRef.current?.focus();
  }, [autoFocus]);

  function handleSubmit(evento: FormEvent) {
    evento.preventDefault();
    const codigo = valor.trim();
    if (!codigo) return;
    onScan(codigo);
    setValor('');
    inputRef.current?.focus();
  }

  return (
    <form className="flex gap-2" onSubmit={handleSubmit}>
      <input
        ref={inputRef}
        className="input"
        placeholder={placeholder}
        value={valor}
        onChange={(e) => setValor(e.target.value)}
      />
      <button type="submit" className="btn-primary">
        Agregar
      </button>
    </form>
  );
}
