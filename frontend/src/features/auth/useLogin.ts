import { useCallback, useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { authService } from '../../services/auth.service';
import { metaRepo } from '../../services/repos/meta.repo';
import { useSessionStore } from '../../app/sessionStore';
import { useOnlineStatus } from '../../hooks/useOnlineStatus';
import { ROUTES } from '../../config/constants';
import { DEFAULT_API_BASE_URL } from '../../config/env';
import { NetworkError, TimeoutError } from '../../lib/apiClient';

export type LoginMode = 'admin' | 'observer';

export function useLogin() {
  const navigate = useNavigate();
  const setSession = useSessionStore((s) => s.setSession);
  const online = useOnlineStatus();

  const [mode, setMode] = useState<LoginMode>('observer');
  const [serverUrl, setServerUrl] = useState('');
  const [username, setUsername] = useState('');
  const [password, setPassword] = useState('');
  const [formError, setFormError] = useState<string | null>(null);
  const [submitting, setSubmitting] = useState(false);

  useEffect(() => {
    void (async () => {
      const url = await metaRepo.getServerUrl();
      // Vorbelegung: gespeicherte URL → Build-Default (VITE_API_BASE_URL) →
      // aktueller Origin (Single-Origin-Deployment: PWA und API unter einer Domain).
      if (url) setServerUrl(url);
      else if (DEFAULT_API_BASE_URL) setServerUrl(DEFAULT_API_BASE_URL);
      else setServerUrl(window.location.origin);
    })();
  }, []);

  const changeMode = useCallback((next: LoginMode) => {
    setMode(next);
    setUsername('');
    setPassword('');
    setFormError(null);
  }, []);

  const validate = useCallback((): boolean => {
    setFormError(null);
    if (mode === 'admin' && !serverUrl.trim()) {
      setFormError('Bitte geben Sie eine Server-Adresse ein.');
      return false;
    }
    if (!username.trim()) {
      setFormError('Bitte geben Sie einen Benutzernamen ein.');
      return false;
    }
    if (!password.trim()) {
      setFormError('Bitte geben Sie ein Passwort ein.');
      return false;
    }
    if (!online) {
      setFormError('Die Anmeldung erfordert eine Internetverbindung.');
      return false;
    }
    return true;
  }, [mode, serverUrl, username, password, online]);

  const submit = useCallback(async () => {
    if (!validate()) return;
    setSubmitting(true);
    setFormError(null);
    try {
      const session =
        mode === 'admin'
          ? await authService.loginAsAdmin(username.trim(), password, serverUrl)
          : await authService.loginAsObserver(username.trim(), password, serverUrl);
      await setSession(session);
      navigate(ROUTES.HOME, { replace: true });
    } catch (err) {
      setFormError(err instanceof NetworkError || err instanceof TimeoutError
        ? 'Server nicht erreichbar. Bitte Verbindung und Server-Adresse prüfen. Die erste Anmeldung und das Laden der Übungsdaten müssen online erfolgen.'
        : err instanceof Error ? err.message : 'Anmeldung fehlgeschlagen.');
    } finally {
      setSubmitting(false);
    }
  }, [mode, username, password, serverUrl, validate, setSession, navigate]);

  return {
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
  };
}
