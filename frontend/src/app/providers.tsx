import { useEffect, type ReactNode } from 'react';
import { QueryClientProvider } from '@tanstack/react-query';
import { queryClient } from '../lib/queryClient';
import { Toaster } from '@/components/ui/sonner';
import { TooltipProvider } from '@/components/ui/tooltip';
import { useSessionStore } from './sessionStore';
import { metaRepo } from '../services/repos/meta.repo';
import { setBaseUrl } from '../config/env';
import { PwaUpdatePrompt } from './PwaUpdatePrompt';

export function AppProviders({ children }: { children: ReactNode }) {
  const hydrate = useSessionStore((s) => s.hydrate);

  useEffect(() => {
    void (async () => {
      // Persistente Speicherung anfordern (mindert iOS-Storage-Eviction).
      if (navigator.storage?.persist) {
        await navigator.storage.persist().catch(() => undefined);
      }
      // Server-URL aus Dexie laden, bevor erste Requests laufen.
      const url = await metaRepo.getServerUrl();
      if (url) setBaseUrl(url);
      await hydrate();
    })();
  }, [hydrate]);

  return (
    <QueryClientProvider client={queryClient}>
      <TooltipProvider delayDuration={200}>
        <Toaster position="top-right" />
        <PwaUpdatePrompt />
        {children}
      </TooltipProvider>
    </QueryClientProvider>
  );
}
