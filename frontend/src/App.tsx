import { RouterProvider } from 'react-router-dom';
import { Loader2 } from 'lucide-react';
import { AppProviders } from './app/providers';
import { router } from './app/router';
import { useSessionStore } from './app/sessionStore';

function RouterGate() {
  const hydrated = useSessionStore((s) => s.hydrated);
  if (!hydrated) {
    return (
      <div className="flex min-h-screen items-center justify-center bg-background">
        <Loader2 className="size-7 animate-spin text-muted-foreground" />
      </div>
    );
  }
  return <RouterProvider router={router} />;
}

export default function App() {
  return (
    <AppProviders>
      <RouterGate />
    </AppProviders>
  );
}
