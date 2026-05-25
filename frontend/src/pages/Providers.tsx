import { useState } from "react";
import { Plus } from "lucide-react";
import { Button } from "@/components/ui/button";
import { ProviderCard } from "../components/ProviderCard";
import { ProviderForm } from "../components/ProviderForm";
import { useAdminData } from "../hooks/useAdminData";
import type { Provider } from "../types";

export function Providers() {
  const { providers } = useAdminData();
  const [editing, setEditing] = useState<Provider | null>(null);
  const [open, setOpen] = useState(false);

  function openAdd() {
    setEditing(null);
    setOpen(true);
  }

  function openEdit(provider: Provider) {
    setEditing(provider);
    setOpen(true);
  }

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
