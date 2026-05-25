import { useEffect, useState } from "react";
import { toast } from "sonner";
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
import { Label } from "@/components/ui/label";
import { api } from "../api";
import { useAdminData } from "../hooks/useAdminData";
import type { Provider } from "../types";

interface Props {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  editing: Provider | null;
}

interface FormState {
  name: string;
  baseUrl: string;
  apiKey: string;
  enabled: boolean;
}

const EMPTY: FormState = { name: "", baseUrl: "", apiKey: "", enabled: true };

export function ProviderForm({ open, onOpenChange, editing }: Props) {
  const { reload } = useAdminData();
  const [state, setState] = useState<FormState>(EMPTY);
  const [submitting, setSubmitting] = useState(false);

  useEffect(() => {
    if (!open) return;
    if (editing) {
      setState({ name: editing.name, baseUrl: editing.baseUrl, apiKey: "", enabled: editing.enabled });
    } else {
      setState(EMPTY);
    }
  }, [open, editing]);

  async function save() {
    if (!state.name.trim() || !state.baseUrl.trim()) {
      toast.error("请填写 Name 和 Base URL");
      return;
    }
    const body: Record<string, unknown> = {
      name: state.name.trim(),
      baseUrl: state.baseUrl.trim(),
      enabled: state.enabled,
    };
    const key = state.apiKey.trim();
    if (key) body.apiKey = key;
    setSubmitting(true);
    try {
      if (editing) {
        await api("/api/providers/" + editing.id, { method: "PATCH", body: JSON.stringify(body) });
      } else {
        await api("/api/providers", { method: "POST", body: JSON.stringify(body) });
      }
      await reload();
      toast.success(editing ? "Provider 已更新" : "Provider 已创建");
      onOpenChange(false);
    } catch (err) {
      toast.error((err as Error).message);
    } finally {
      setSubmitting(false);
    }
  }

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-md">
        <DialogHeader>
          <DialogTitle>{editing ? "编辑 Provider" : "添加 Provider"}</DialogTitle>
          <DialogDescription>
            上游 API 的基本信息。Base URL 必须包含 <code className="font-mono text-xs">/v1</code> 路径。
          </DialogDescription>
        </DialogHeader>
        <div className="space-y-4">
          <div className="space-y-2">
            <Label htmlFor="provider-name">Name</Label>
            <Input
              id="provider-name"
              placeholder="openrouter"
              value={state.name}
              onChange={(e) => setState({ ...state, name: e.target.value })}
            />
          </div>
          <div className="space-y-2">
            <Label htmlFor="provider-baseurl">Base URL</Label>
            <Input
              id="provider-baseurl"
              placeholder="https://openrouter.ai/api/v1"
              value={state.baseUrl}
              onChange={(e) => setState({ ...state, baseUrl: e.target.value })}
            />
          </div>
          <div className="space-y-2">
            <Label htmlFor="provider-apikey">API Key</Label>
            <Input
              id="provider-apikey"
              type="password"
              autoComplete="off"
              placeholder={editing ? "留空表示不修改" : "sk-..."}
              value={state.apiKey}
              onChange={(e) => setState({ ...state, apiKey: e.target.value })}
            />
          </div>
          <div className="flex items-center gap-2">
            <Checkbox
              id="provider-enabled"
              checked={state.enabled}
              onCheckedChange={(v) => setState({ ...state, enabled: v === true })}
            />
            <Label htmlFor="provider-enabled" className="cursor-pointer text-sm font-normal">
              启用
            </Label>
          </div>
        </div>
        <DialogFooter>
          <Button variant="outline" onClick={() => onOpenChange(false)} disabled={submitting}>
            取消
          </Button>
          <Button onClick={save} disabled={submitting}>
            {submitting ? "保存中..." : "保存"}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
