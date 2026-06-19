import { memo, useEffect, useState } from "react";
import { Check, Loader2, Trash2 } from "lucide-react";
import { toast } from "sonner";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Checkbox } from "@/components/ui/checkbox";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { api } from "../api";
import { useAdminData } from "../hooks/useAdminData";
import type { Model } from "../types";

interface Props {
  model: Model;
}

export const ModelRow = memo(function ModelRow({ model }: Props) {
  const { reload } = useAdminData();
  const [publicId, setPublicId] = useState(model.publicModelId);
  const [savingSelected, setSavingSelected] = useState(false);
  const [savingId, setSavingId] = useState(false);
  const [deleting, setDeleting] = useState(false);
  const [confirmOpen, setConfirmOpen] = useState(false);

  useEffect(() => {
    setPublicId(model.publicModelId);
  }, [model.publicModelId]);

  async function toggleSelected(selected: boolean) {
    setSavingSelected(true);
    try {
      await api("/api/models/" + model.id, {
        method: "PATCH",
        body: JSON.stringify({ selected }),
      });
      await reload();
    } catch (err) {
      toast.error((err as Error).message);
    } finally {
      setSavingSelected(false);
    }
  }

  async function savePublicId() {
    if (publicId === model.publicModelId) return;
    setSavingId(true);
    try {
      await api("/api/models/" + model.id, {
        method: "PATCH",
        body: JSON.stringify({ publicModelId: publicId }),
      });
      await reload();
      toast.success("Public ID 已更新");
    } catch (err) {
      toast.error((err as Error).message);
    } finally {
      setSavingId(false);
    }
  }

  async function remove() {
    setDeleting(true);
    try {
      await api("/api/models/" + model.id, { method: "DELETE" });
      await reload();
      toast.success("模型已删除");
      setConfirmOpen(false);
    } catch (err) {
      toast.error((err as Error).message);
    } finally {
      setDeleting(false);
    }
  }

  const dirty = publicId !== model.publicModelId;

  return (
    <div className="grid grid-cols-[40px_100px_minmax(100px,1fr)_minmax(200px,280px)_auto_40px] items-center border-b border-border px-3 py-2 text-sm last:border-b-0">
      <div>
        {savingSelected ? (
          <Loader2 className="text-muted-foreground size-4 animate-spin" />
        ) : (
          <Checkbox
            checked={model.selected}
            onCheckedChange={(v) => toggleSelected(v === true)}
            aria-label="暴露此模型"
          />
        )}
      </div>
      <div>
        <Badge variant={model.providerEnabled ? "secondary" : "outline"} className="text-xs font-normal">
          {model.providerName}
        </Badge>
      </div>
      <div className="min-w-0">
        <code className="font-mono text-xs">{model.remoteModelId}</code>
      </div>
      <div>
        <div className="flex items-center gap-1.5">
          <Input
            value={publicId}
            onChange={(e) => setPublicId(e.target.value)}
            onKeyDown={(e) => {
              if (e.key === "Enter") savePublicId();
            }}
            className="h-8 min-w-[200px] font-mono text-xs"
          />
          {dirty && (
            <Button
              variant="ghost"
              size="icon-sm"
              onClick={savePublicId}
              disabled={savingId}
              aria-label="保存 Public ID"
            >
              {savingId ? <Loader2 className="size-3.5 animate-spin" /> : <Check className="size-3.5" />}
            </Button>
          )}
        </div>
      </div>
      <div className="text-muted-foreground text-xs whitespace-nowrap">{model.lastSeenAt}</div>
      <div>
        <Button
          variant="ghost"
          size="icon-sm"
          onClick={() => setConfirmOpen(true)}
          disabled={deleting}
          className="text-muted-foreground hover:text-destructive"
          aria-label="删除模型"
        >
          {deleting ? <Loader2 className="size-3.5 animate-spin" /> : <Trash2 className="size-3.5" />}
        </Button>
      </div>

      <Dialog open={confirmOpen} onOpenChange={setConfirmOpen}>
        <DialogContent className="sm:max-w-md">
          <DialogHeader>
            <DialogTitle>删除模型</DialogTitle>
            <DialogDescription>
              确认删除 <code className="font-mono text-xs">{model.publicModelId}</code>？该记录将从数据库中移除，下一次同步若上游仍返回该模型会被重新创建。
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
    </div>
  );
});
