import React, { createContext, useContext, useState, useCallback } from 'react';

export type ToastVariant = 'success' | 'error' | 'info';

export type ToastData = {
  id: string;
  message: string;
  variant: ToastVariant;
};

type ToastContextType = {
  toast: ToastData | null;
  showToast: (message: string, variant?: ToastVariant) => void;
  hideToast: () => void;
};

const ToastContext = createContext<ToastContextType | null>(null);

let toastId = 0;
function nextToastId() {
  return `toast_${Date.now()}_${++toastId}`;
}

export function useToast() {
  const ctx = useContext(ToastContext);
  if (!ctx) return null;
  return ctx;
}

type Props = { children: React.ReactNode };

export function ToastProvider({ children }: Props) {
  const [toast, setToast] = useState<ToastData | null>(null);
  const timeoutRef = React.useRef<ReturnType<typeof setTimeout> | null>(null);

  const hideToast = useCallback(() => {
    if (timeoutRef.current) clearTimeout(timeoutRef.current);
    timeoutRef.current = null;
    setToast(null);
  }, []);

  const showToast = useCallback((message: string, variant: ToastVariant = 'info') => {
    if (timeoutRef.current) clearTimeout(timeoutRef.current);
    const id = nextToastId();
    setToast({ id, message, variant });
    timeoutRef.current = setTimeout(() => {
      setToast((t) => (t?.id === id ? null : t));
      timeoutRef.current = null;
    }, 3000);
  }, []);

  const value: ToastContextType = { toast, showToast, hideToast };

  return (
    <ToastContext.Provider value={value}>
      {children}
    </ToastContext.Provider>
  );
}
