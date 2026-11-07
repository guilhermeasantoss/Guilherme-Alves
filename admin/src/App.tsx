import { lazy, Suspense, useEffect, useState, type FormEvent } from 'react';
import { Route, Routes } from 'react-router-dom';
import type { Session } from '@supabase/supabase-js';
import { supabase } from './lib/supabase';

const ProjectAdmin = lazy(() => import('./ProjectAdmin'));

type AccessState =
  | 'loading'
  | 'signed-out'
  | 'checking'
  | 'allowed'
  | 'denied'
  | 'error';

function App() {
  const client = supabase;
  const [session, setSession] = useState<Session | null>(null);
  const [access, setAccess] = useState<AccessState>(
    client ? 'loading' : 'error',
  );
  const [authError, setAuthError] = useState('');
  const [connectionError, setConnectionError] = useState('');

  useEffect(() => {
    document.documentElement.dataset.theme = 'dark';
    window.localStorage.removeItem('theme');
  }, []);

  useEffect(() => {
    if (!client) return;

    let active = true;
    let verification = 0;

    const verifyAdmin = async (currentSession: Session) => {
      const currentVerification = ++verification;
      setAccess('checking');
      setConnectionError('');

      const { data, error } = await client.rpc('is_project_admin');
      if (!active || currentVerification !== verification) return;

      if (error) {
        setConnectionError(
          'Não foi possível verificar a autorização no Supabase. Confira a migration e tente novamente.',
        );
        setAccess('error');
        return;
      }

      setAccess(data === true ? 'allowed' : 'denied');
      if (!active) return;
      setSession(currentSession);
    };

    const { data } = client.auth.onAuthStateChange((_event, nextSession) => {
      setSession(nextSession);
      setAuthError('');

      if (!nextSession) {
        verification += 1;
        setAccess('signed-out');
        setConnectionError('');
        return;
      }

      window.setTimeout(() => {
        if (active) void verifyAdmin(nextSession);
      }, 0);
    });

    void client.auth
      .getSession()
      .then(({ data: sessionData, error }) => {
        if (!active) return;
        if (error) {
          setConnectionError('Não foi possível carregar a sessão administrativa.');
          setAccess('error');
          return;
        }

        if (!sessionData.session) {
          setSession(null);
          setAccess('signed-out');
          return;
        }

        setSession(sessionData.session);
        void verifyAdmin(sessionData.session);
      })
      .catch(() => {
        if (!active) return;
        setConnectionError('Não foi possível conectar ao Supabase.');
        setAccess('error');
      });

    return () => {
      active = false;
      verification += 1;
      data.subscription.unsubscribe();
    };
  }, []);

  return (
    <Routes>
      <Route
        path="*"
        element={
          access === 'allowed' ? (
            <Suspense fallback={<main className="admin-content"><StatusCard title="Abrindo painel" message="Carregando o gerenciamento de projetos..." loading /></main>}>
              <ProjectAdmin onSignOut={() => void client?.auth.signOut()} />
            </Suspense>
          ) : (
            <main className="admin-shell">
              <header className="admin-header">
                <a className="brand" href="/admin/" aria-label="Painel administrativo">
                  <span className="brand-bracket">[</span>GA
                  <span className="brand-bracket">]</span>
                  <span className="brand-cursor">_</span>
                </a>
              </header>

              <section className="admin-content" aria-live="polite">
                {!client ? (
                  <StatusCard
                    title="Supabase ainda não configurado"
                    message="Defina VITE_SUPABASE_URL e VITE_SUPABASE_ANON_KEY no arquivo admin/.env.local e reinicie o servidor."
                  />
                ) : access === 'loading' || access === 'checking' ? (
                  <StatusCard
                    title="Verificando acesso"
                    message="Aguarde enquanto confirmamos sua sessão administrativa."
                    loading
                  />
                ) : access === 'signed-out' || access === 'error' ? (
                  <LoginForm
                    error={authError || connectionError}
                    onSubmit={async (email, password) => {
                      if (!client) return;
                      setAuthError('');
                      const { error } = await client.auth.signInWithPassword({
                        email,
                        password,
                      });
                      if (error) setAuthError('Não foi possível entrar. Verifique os dados e tente novamente.');
                    }}
                    onRetry={() => {
                      if (!session || !client) {
                        setAccess('signed-out');
                        return;
                      }
                      setSession(session);
                      void (async () => {
                        try {
                          const { data, error } = await client.rpc('is_project_admin');
                          if (error) {
                            setConnectionError('Não foi possível verificar a autorização no Supabase.');
                            setAccess('error');
                            return;
                          }
                          setAccess(data === true ? 'allowed' : 'denied');
                        } catch {
                          setConnectionError('Não foi possível conectar ao Supabase.');
                          setAccess('error');
                        }
                      })();
                    }}
                  />
                ) : (
                  <section className="welcome-card">
                    <span className="eyebrow">~/ADMIN/AUTH</span>
                    <h1>Acesso não autorizado<span>.</span></h1>
                    <p>Esta conta não está na lista de administradores autorizados.</p>
                    <button
                      type="button"
                      className="submit-button"
                      onClick={() => void client?.auth.signOut()}
                    >
                      SAIR
                    </button>
                  </section>
                )}
              </section>
            </main>
          )
        }
      />
    </Routes>
  );
}

function StatusCard({
  title,
  message,
  loading = false,
}: {
  title: string;
  message: string;
  loading?: boolean;
}) {
  return (
    <section className="welcome-card status-card">
      {loading && <span className="status-indicator" aria-hidden="true" />}
      <span className="eyebrow">~/ADMIN</span>
      <h1>{title}<span>.</span></h1>
      <p>{message}</p>
    </section>
  );
}

function LoginForm({
  error,
  onSubmit,
  onRetry,
}: {
  error: string;
  onSubmit: (email: string, password: string) => Promise<void>;
  onRetry: () => void;
}) {
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [submitting, setSubmitting] = useState(false);

  const handleSubmit = async (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    setSubmitting(true);
    try {
      await onSubmit(email.trim(), password);
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <section className="welcome-card login-card">
      <span className="eyebrow">~/ADMIN/AUTH</span>
      <h1>Acesso restrito<span>.</span></h1>
      <p>Entre com a conta administrativa previamente autorizada.</p>
      <form className="login-form" onSubmit={(event) => void handleSubmit(event)}>
        <label htmlFor="admin-email">E-MAIL</label>
        <input
          id="admin-email"
          type="email"
          autoComplete="username"
          value={email}
          onChange={(event) => setEmail(event.target.value)}
          required
        />
        <label htmlFor="admin-password">SENHA</label>
        <input
          id="admin-password"
          type="password"
          autoComplete="current-password"
          value={password}
          onChange={(event) => setPassword(event.target.value)}
          required
        />
        {error && <p className="form-error" role="alert">{error}</p>}
        <button className="submit-button" type="submit" disabled={submitting}>
          {submitting ? 'VERIFICANDO...' : 'ENTRAR →'}
        </button>
        {error && (
          <button className="text-button retry-button" type="button" onClick={onRetry}>
            TENTAR VERIFICAR NOVAMENTE
          </button>
        )}
      </form>
    </section>
  );
}

export default App;
