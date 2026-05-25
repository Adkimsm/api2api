import { useState } from "react";
import { Loader2, Pencil, RefreshCw, Trash2 } from "lucide-react";
import { toast } from "sonner";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { api } from "../api";
import { useAdminData } from "../hooks/useAdminData";
import type { Provider } from "../types";

interface Props {
  provider: Provider;
  onEdit: (provider: Provider) => void;
}

export function ProviderCard({ provider, onEdit }: Props) {
  const { reload } = useAdminData();
  const [syncing, setSyncing] = useState(false);
  const [deleting, setDeleting] = useState(false);
  const [confirmOpen, setConfirmOpen] = useState(false);

  async function sync() {
    setSyncing(true);
    const id = toast.loading("正在同步 " + provider.name + " 模型...");
    try {
      await api("/api/providers/" + provider.id + "/sync", { method: "POST" });
      await reload();
      toast.success("同步完成", { id });
    } catch (err) {
      toast.error((err as Error).message, { id });
    } finally {
      setSyncing(false);
    }
  }

  async function remove() {
    setDeleting(true);
    try {
      await api("/api/providers/" + provider.id, { method: "DELETE" });
      await reload();
      toast.success("Provider 已删除");
      setConfirmOpen(false);
    } catch (err) {
      toast.error((err as Error).message);
    } finally {
      setDeleting(false);
    }
  }

  return (
    <Card>
      <CardContent className="p-4 sm:p-5">
        <div className="flex flex-wrap items-start gap-3">
          <div className="min-w-0 flex-1">
            <div className="flex flex-wrap items-center gap-2">
              <span className="text-sm font-semibold">{provider.name}</span>
              <Badge variant={provider.enabled ? "default" : "secondary"} className="text-xs">
                {provider.enabled ? "已启用" : "已禁用"}
              </Badge>
            </div>
            <div className="mt-1.5 min-w-0">
              <code className="text-muted-foreground block truncate font-mono text-xs" title={provider.baseUrl}>
                {provider.baseUrl}
              </code>
            </div>
            <div className="text-muted-foreground mt-2 text-xs">
              {provider.modelCount} 个模型 · 上次同步 {provider.lastSyncedAt || "—"}
            </div>
          </div>
          <div className="flex flex-wrap gap-1.5">
            <Button variant="outline" size="sm" onClick={() => onEdit(provider)} disabled={syncing || deleting}>
              <Pencil className="size-3.5" />
              编辑
            </Button>
            <Button variant="outline" size="sm" onClick={sync} disabled={syncing || deleting}>
              {syncing ? <Loader2 className="size-3.5 animate-spin" /> : <RefreshCw className="size-3.5" />}
              同步
            </Button>
            <Button
              variant="outline"
              size="sm"
              onClick={() => setConfirmOpen(true)}
              disabled={syncing || deleting}
              className="text-destructive hover:text-destructive"
            >
              <Trash2 className="size-3.5" />
              删除
            </Button>
          </div>
        </div>
      </CardContent>

      <Dialog open={confirmOpen} onOpenChange={setConfirmOpen}>
        <DialogContent className="sm:max-w-md">
          <DialogHeader>
            <DialogTitle>删除 Provider</DialogTitle>
            <DialogDescription>
              确认删除 <strong>{provider.name}</strong>？该 provider 缓存的所有模型也会被一并清除。此操作不可撤销。
            </DialogDescription>
          </DialogHeader>
          <DialogFooter>
            <Button variant="outline" onClick={() => setConfirmOpen(false)} disabled={deleting}>
              取消
            </Button>
            <Button variant="destructive" onClick={remove} disabled={deleting}>
              {deleting ? "删除中..." : "确认删除"}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </Card>
  );
}
