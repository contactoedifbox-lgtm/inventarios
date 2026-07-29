'use client';

import React from 'react';
import { AlertTriangle } from 'lucide-react';
import { Button } from '@/components/ui/button';

interface ErrorBoundaryState {
  hasError: boolean;
  message: string;
}

/** Error Boundary de clase: captura errores de renderizado de sus hijos */
export class ErrorBoundary extends React.Component<
  { children: React.ReactNode; fallback?: React.ReactNode },
  ErrorBoundaryState
> {
  constructor(props: { children: React.ReactNode }) {
    super(props);
    this.state = { hasError: false, message: '' };
  }

  static getDerivedStateFromError(error: Error): ErrorBoundaryState {
    return { hasError: true, message: error.message };
  }

  componentDidCatch(error: Error, info: React.ErrorInfo): void {
    console.error('[ErrorBoundary]', error, info.componentStack);
  }

  render() {
    if (this.state.hasError) {
      if (this.props.fallback) return this.props.fallback;
      return (
        <div className="flex flex-col items-center justify-center rounded-lg border border-destructive/30 bg-destructive/5 py-16 text-center">
          <AlertTriangle className="mb-4 h-12 w-12 text-destructive" />
          <h3 className="mb-1 text-lg font-semibold">Algo salió mal</h3>
          <p className="mb-4 max-w-sm text-sm text-muted-foreground">
            Ocurrió un error inesperado. Intenta recargar la sección.
          </p>
          <Button variant="outline" onClick={() => this.setState({ hasError: false, message: '' })}>
            Reintentar
          </Button>
        </div>
      );
    }
    return this.props.children;
  }
}
