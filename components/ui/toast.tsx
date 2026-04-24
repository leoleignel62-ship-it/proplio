"use client";

import {
  createContext,
  useCallback,
  useContext,
  useMemo,
  useState,
  type ReactNode,
} from "react";

export type ToastKind = "success" | "error" | "info";

type ToastItem = {
  id: string;
  kind: ToastKind;
  message: string;
  exiting: boolean;
};

type ToastContextValue = {
  show: (kind: ToastKind, message: string) => void;
  success: (message: string) => void;
  error: (message: string) => void;
  info: (message: string) => void;
};

const ToastContext = createContext<ToastContextValue | null>(null);

const MAX = 3;
const DURATION: Record<ToastKind, number> = {
  success: 3000,
  error: 5000,
  info: 3000,
};

const BG: Record<ToastKind, string> = {
  success: "#10b981",
  error: "#ef4444",
  info: "#7c3aed",
};

const ICON: Record<ToastKind, string> = {
  success: "✓",
  error: "✗",
  info: "ℹ",
};

function ToastLine({ item }: { item: ToastItem }) {
  return (
    <div
      role="status"
      className="pointer-events-auto flex max-w-sm items-start gap-3 rounded-lg px-4 py-3 text-sm font-medium text-white shadow-lg transition-all duration-300 ease-out"
      style={{
        backgroundColor: BG[item.kind],
        opacity: item.exiting ? 0 : 1,
        transform: item.exiting ? "translateY(8px)" : "translateY(0)",
        boxShadow: "0 8px 24px rgba(0,0,0,0.35)",
      }}
    >
      <span className="shrink-0 text-base leading-none" aria-hidden>
        {ICON[item.kind]}
      </span>
      <span className="min-w-0 flex-1 leading-snug">{item.message}</span>
    </div>
  );
}

export function ToastProvider({ children }: { children: ReactNode }) {
  const [items, setItems] = useState<ToastItem[]>([]);

  const show = useCallback((kind: ToastKind, message: string) => {
    const id = crypto.randomUUID();
    const total = DURATION[kind];
    setItems((prev) => [...prev.slice(-(MAX - 1)), { id, kind, message, exiting: false }]);
    window.setTimeout(() => {
      setItems((prev) => prev.map((t) => (t.id === id ? { ...t, exiting: true } : t)));
    }, Math.max(0, total - 300));
    window.setTimeout(() => {
      setItems((prev) => prev.filter((t) => t.id !== id));
    }, total);
  }, []);

  const value = useMemo<ToastContextValue>(
    () => ({
      show,
      success: (m) => show("success", m),
      error: (m) => show("error", m),
      info: (m) => show("info", m),
    }),
    [show],
  );

  return (
    <ToastContext.Provider value={value}>
      {children}
      <div
        className="pointer-events-none fixed bottom-4 right-4 z-[240] flex w-[min(100vw-2rem,22rem)] flex-col gap-2"
        aria-live="polite"
      >
        {items.map((item) => (
          <ToastLine key={item.id} item={item} />
        ))}
      </div>
    </ToastContext.Provider>
  );
}

export function useToast(): ToastContextValue {
  const ctx = useContext(ToastContext);
  if (!ctx) {
    return {
      show: () => {},
      success: () => {},
      error: () => {},
      info: () => {},
    };
  }
  return ctx;
}
