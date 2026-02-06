import * as React from "react";

const TOAST_LIMIT = 3;
const TOAST_REMOVE_DELAY = 4000;

export type ToastOptions = {
  title: string;
  description?: string;
  variant?: "default" | "destructive";
};

type ToastState = ToastOptions & { id: string; open: boolean };

type ToastContextValue = {
  toasts: ToastState[];
  push: (toast: ToastOptions) => void;
  dismiss: (id: string) => void;
};

const ToastContext = React.createContext<ToastContextValue | undefined>(undefined);

export function ToastProviderInternal({ children }: { children: React.ReactNode }) {
  const [toasts, setToasts] = React.useState<ToastState[]>([]);

  const dismiss = React.useCallback((id: string) => {
    setToasts((prev) => prev.filter((toast) => toast.id !== id));
  }, []);

  const push = React.useCallback((toast: ToastOptions) => {
    const id = crypto.randomUUID();
    setToasts((prev) => {
      const next = [{ ...toast, id, open: true }, ...prev];
      return next.slice(0, TOAST_LIMIT);
    });
    setTimeout(() => dismiss(id), TOAST_REMOVE_DELAY);
  }, [dismiss]);

  const value = React.useMemo(() => ({ toasts, push, dismiss }), [toasts, push, dismiss]);

  return <ToastContext.Provider value={value}>{children}</ToastContext.Provider>;
}

export function useToast() {
  const context = React.useContext(ToastContext);
  if (!context) {
    throw new Error("useToast must be used within ToastProviderInternal");
  }
  return context;
}
