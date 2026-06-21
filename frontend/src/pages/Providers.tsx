import { useEffect, useState } from "react";
import { Plus } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Skeleton } from "@/components/ui/skeleton";
import { ProviderCard } from "../components/ProviderCard";
import { ProviderForm } from "../components/ProviderForm";
import { useAdminData } from "../hooks/useAdminData";
import type { Provider } from "../types";

function ProvidersSkeleton() {
  return (
    <div className="space-y-6">
      <div className="flex flex-wrap items-start justify-between gap-3">
        <div>
          <Skeleton className="h-8 w-40" />
          <Skeleton className="mt-1 h-4 w-80" />
        </div>
        <Skeleton className="h-9 w-32" />
      </div>
      <div className="space-y-3">
        {[1, 2, 3].map((i) => (
          <div key={i} className="border-border rounded-lg border p-4 space-y-3">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-3">
                <Skeleton className="h-5 w-28" />
                <Skeleton className="h-5 w-16" />
              </div>
              <div className="flex gap-2">
                <Skeleton className="h-8 w-16" />
                <Skeleton className="h-8 w-16" />
                <Skeleton className="h-8 w-16" />
              </div>
            </div>
            <Skeleton className="h-4 w-64" />
          </div>
        ))}
      </div>
    </div>
  );
}

export function Providers() {
  const { providers, loading } = useAdminData();
  const [editing, setEditing] = useState<Provider | null>(null);
  const [open, setOpen] = useState(false);
  const [mounted, setMounted] = useState(false);

  useEffect(() => {
    requestAnimationFrame(() => setMounted(true));
  }, []);

  function openAdd() {
    setEditing(null);
    setOpen(true);
  }

  function openEdit(provider: Provider) {
    setEditing(provider);
    setOpen(true);
  }

  if (!mounted || (loading && providers.length === 0)) return <ProvidersSkeleton />;

  return (
    <div className="space-y-6">
      <div className="flex flex-wrap items-start justify-between gap-3">
        <div>
          <h2 className="text-2xl font-semibold tracking-tight">Provider 管理</h2>
          <p className="text-muted-foreground mt-1 text-sm">配置上游 OpenAI 兼容 API，并同步它们暴露的模型清单。</p>
        </div>
        <Button onClick={openAdd}>
          <Plus className="size-4" />
          添加 Provider
        </Button>
      </div>

      {providers.length === 0 ? (
        <div className="border-border bg-muted/30 text-muted-foreground rounded-lg border border-dashed px-6 py-12 text-center text-sm">
          暂无 Provider。点击右上角"添加 Provider"来配置第一个上游 API。
        </div>
      ) : (
        <div className="space-y-3">
          {providers.map((p) => (
            <ProviderCard key={p.id} provider={p} onEdit={openEdit} />
          ))}
        </div>
      )}

      <ProviderForm open={open} onOpenChange={setOpen} editing={editing} />
    </div>
  );
}
