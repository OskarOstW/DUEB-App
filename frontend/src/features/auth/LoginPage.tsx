import { HeartPulse, WifiOff, CircleAlert } from 'lucide-react';
import { Card, CardContent } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Button } from '@/components/ui/button';
import { Alert, AlertDescription } from '@/components/ui/alert';
import { cn } from '@/lib/utils';
import { PartnerFooter } from '@/components/PartnerFooter';
import { useLogin } from './useLogin';

export function LoginPage() {
  const {
    mode,
    changeMode,
    serverUrl,
    setServerUrl,
    username,
    setUsername,
    password,
    setPassword,
    formError,
    submitting,
    online,
    submit,
  } = useLogin();

  const onSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    void submit();
  };

  return (
    <div className="flex min-h-screen flex-col items-center justify-center bg-gradient-to-br from-sidebar to-slate-800 px-4 py-8">
      <div className="w-full max-w-md">
        {/* Markenkopf */}
        <div className="mb-6 flex flex-col items-center gap-3 text-center">
          <div className="flex size-14 items-center justify-center rounded-2xl bg-accent text-accent-foreground shadow-lg">
            <HeartPulse className="size-8" />
          </div>
          <div>
            <h1 className="text-3xl font-extrabold tracking-wide text-white">DUEB App</h1>
            <p className="text-sm text-white/60">Digitale Übungsbeobachtung</p>
          </div>
        </div>

        <Card className="shadow-xl">
          <CardContent className="pt-6">
            <form onSubmit={onSubmit} className="space-y-5">
              <div className="space-y-1">
                <h2 className="text-xl font-bold">Anmelden</h2>
                <p className="text-sm text-muted-foreground">Bitte Rolle wählen und anmelden</p>
              </div>

              {/* Modus-Auswahl */}
              <div className="grid grid-cols-2 gap-1 rounded-lg bg-secondary p-1">
                {(['admin', 'observer'] as const).map((m) => (
                  <button
                    key={m}
                    type="button"
                    onClick={() => changeMode(m)}
                    className={cn(
                      'rounded-md py-2 text-sm font-semibold transition-colors',
                      mode === m
                        ? 'bg-card text-foreground shadow-sm'
                        : 'text-muted-foreground hover:text-foreground',
                    )}
                  >
                    {m === 'admin' ? 'Admin' : 'Beobachter'}
                  </button>
                ))}
              </div>

              {!online && (
                <Alert>
                  <WifiOff className="size-4" />
                  <AlertDescription>
                    Zur Anmeldung wird eine Internetverbindung benötigt. Angemeldete Sitzungen können offline weiterarbeiten.
                  </AlertDescription>
                </Alert>
              )}

              {(
                <div className="space-y-1.5">
                  <Label htmlFor="server">Server-Adresse</Label>
                  <Input
                    id="server"
                    placeholder="https://dueb.example.org"
                    value={serverUrl}
                    onChange={(e) => setServerUrl(e.target.value)}
                    autoComplete="url"
                  />
                </div>
              )}

              <div className="space-y-1.5">
                <Label htmlFor="user">{mode === 'observer' ? 'Beobachterkonto' : 'Benutzername'}</Label>
                <Input
                  id="user"
                  value={username}
                  onChange={(e) => setUsername(e.target.value)}
                  autoComplete="username"
                  placeholder={mode === 'observer' ? 'Benutzername eingeben' : undefined}
                />
              </div>

              <div className="space-y-1.5">
                <Label htmlFor="pw">Passwort</Label>
                <Input
                  id="pw"
                  type="password"
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  autoComplete="current-password"
                />
              </div>

              {formError && (
                <Alert variant="destructive">
                  <CircleAlert className="size-4" />
                  <AlertDescription>{formError}</AlertDescription>
                </Alert>
              )}

              <Button type="submit" size="lg" className="w-full" disabled={submitting}>
                {submitting ? 'Anmelden…' : 'Anmelden'}
              </Button>
            </form>
          </CardContent>
        </Card>

        <PartnerFooter variant="onDark" />
      </div>
    </div>
  );
}
