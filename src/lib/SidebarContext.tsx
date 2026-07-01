'use client';

import { createContext, useContext, useState, type ReactNode } from 'react';

interface SidebarState {
  open: boolean;
  toggle: () => void;
  close: () => void;
  collapsed: boolean;
  toggleCollapsed: () => void;
}

const SidebarContext = createContext<SidebarState | null>(null);

const COLLAPSED_STORAGE_KEY = 'olahdana:sidebarCollapsed';

export function SidebarProvider({ children }: { children: ReactNode }) {
  const [open, setOpen] = useState(false);
  // Sidebar only ever mounts client-side, so reading localStorage in the
  // initializer is safe — no SSR pass for this provider to mismatch against.
  const [collapsed, setCollapsed] = useState(() => {
    if (typeof window === 'undefined') return false;
    return window.localStorage.getItem(COLLAPSED_STORAGE_KEY) === '1';
  });

  function toggleCollapsed() {
    setCollapsed((v) => {
      const next = !v;
      window.localStorage.setItem(COLLAPSED_STORAGE_KEY, next ? '1' : '0');
      return next;
    });
  }

  return (
    <SidebarContext.Provider
      value={{ open, toggle: () => setOpen((v) => !v), close: () => setOpen(false), collapsed, toggleCollapsed }}
    >
      {children}
    </SidebarContext.Provider>
  );
}

export function useSidebar() {
  const ctx = useContext(SidebarContext);
  if (!ctx) throw new Error('useSidebar must be used within SidebarProvider');
  return ctx;
}
