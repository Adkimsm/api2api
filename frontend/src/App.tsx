import { useCallback, useEffect, useState } from "react";
import { toast } from "sonner";
import { api } from "./api";
import { clearToken, getToken, UNAUTH_EVENT } from "./auth";
import { Layout } from "./components/Layout";
import { Login } from "./components/Login";
import { Toaster } from "./components/ui/sonner";
import { AdminDataContext, type AdminDataValue } from "./hooks/useAdminData";
import { useHashRoute } from "./router";
import { Models } from "./pages/Models";
import { Overview } from "./pages/Overview";
import { Providers } from "./pages/Providers";
import type { Config, Model, Provider, StatusKind } from "./types";

function notify(text: string, kind: StatusKind = "info") {
  if (kind === "ok") toast.success(text);
  else if (kind === "error") toast.error(text);
  else toast.info(text);
}

export function App() {
  const [authed, setAuthed] = useState<boolean>(() => !!getToken());
  const [providers, setProviders] = useState<Provider[]>([]);
  const [models, setModels] = useState<Model[]>([]);
  const [config, setConfig] = useState<Config | null>(null);
  const [loading, setLoading] = useState(false);
  const [busy, setBusy] = useState(false);

  const showStatus = useCallback((text: string, kind: StatusKind = "info") => {
    notify(text, kind);
  }, []);

  const reload = useCallback(async () => {
    setLoading(true);
    try {
      const [p, m, cfg] = await Promise.all([
        api<{ data: Provider[] }>("/api/providers"),
        api<{ data: Model[] }>("/api/models"),
        api<Config>("/api/config"),
      ]);
      setProviders(p.data || []);
      setModels(m.data || []);
      setConfig(cfg);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    if (!authed) return;
    let cancelled = false;
    setBusy(true);
    reload()
      .then(() => {
        if (!cancelled) showStatus("已登录", "ok");
      })
      .catch((err) => {
        if (cancelled) return;
        clearToken();
        setAuthed(false);
        showStatus("Token 无效或已过期：" + (err as Error).message, "error");
      })
      .finally(() => {
        if (!cancelled) setBusy(false);
      });
    return () => {
      cancelled = true;
    };
  }, [authed, reload, showStatus]);

  useEffect(() => {
    const onUnauth = () => {
      setAuthed(false);
      setProviders([]);
      setModels([]);
      setConfig(null);
    };
    window.addEventListener(UNAUTH_EVENT, onUnauth);
    return () => window.removeEventListener(UNAUTH_EVENT, onUnauth);
  }, []);

  const route = useHashRoute();

  const handleLogin = useCallback(async () => {
    await reload();
    setAuthed(true);
  }, [reload]);

  const handleLogout = useCallback(() => {
    clearToken();
    setAuthed(false);
    setProviders([]);
    setModels([]);
    setConfig(null);
    showStatus("已退出登录", "ok");
  }, [showStatus]);

  const value: AdminDataValue = {
    providers,
    models,
    config,
    loading,
    reload,
    busy,
    setBusy,
    showStatus,
  };

  return (
    <>
      {authed ? (
        <AdminDataContext.Provider value={value}>
          <Layout route={route} onLogout={handleLogout}>
            {route === "overview" && <Overview />}
            {route === "providers" && <Providers />}
            {route === "models" && <Models />}
          </Layout>
        </AdminDataContext.Provider>
      ) : (
        <Login onLogin={handleLogin} />
      )}
      <Toaster position="top-right" richColors closeButton />
    </>
  );
}
