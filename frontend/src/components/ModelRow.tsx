import { useEffect, useState } from "react";
import { Check, Loader2 } from "lucide-react";
import { toast } from "sonner";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Checkbox } from "@/components/ui/checkbox";
import { Input } from "@/components/ui/input";
import { TableCell, TableRow } from "@/components/ui/table";
import { api } from "../api";
import { useAdminData } from "../hooks/useAdminData";
import type { Model } from "../types";

interface Props {
  model: Model;
}

export function ModelRow({ model }: Props) {
  const { reload } = useAdminData();
  const [publicId, setPublicId] = useState(model.publicModelId);
  const [savingSelected, setSavingSelected] = useState(false);
  const [savingId, setSavingId] = useState(false);

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

  const dirty = publicId !== model.publicModelId;

  return (
    <TableRow>
      <TableCell className="w-10">
        {savingSelected ? (
          <Loader2 className="text-muted-foreground size-4 animate-spin" />
        ) : (
          <Checkbox
            checked={model.selected}
            onCheckedChange={(v) => toggleSelected(v === true)}
            aria-label="暴露此模型"
          />
        )}
      </TableCell>
      <TableCell>
        <Badge variant={model.providerEnabled ? "secondary" : "outline"} className="text-xs font-normal">
          {model.providerName}
        </Badge>
      </TableCell>
      <TableCell>
        <code className="font-mono text-xs">{model.remoteModelId}</code>
      </TableCell>
      <TableCell>
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
      </TableCell>
      <TableCell className="text-muted-foreground text-xs whitespace-nowrap">{model.lastSeenAt}</TableCell>
    </TableRow>
  );
}
