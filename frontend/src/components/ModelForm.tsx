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
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { api } from "../api";
import { useAdminData } from "../hooks/useAdminData";

interface Props {
  open: boolean;
  onOpenChange: (open: boolean) => void;
}

interface FormState {
  providerId: string;
  remoteModelId: string;
  publicModelId: string;
  selected: boolean;
}

const EMPTY: FormState = { providerId: "", remoteModelId: "", publicModelId: "", selected: true };

export function ModelForm({ open, onOpenChange }: Props) {
  const { providers, reload } = useAdminData();
  const [state, setState] = useState<FormState>(EMPTY);
  const [submitting, setSubmitting] = useState(false);

  useEffect(() => {
    if (!open) return;
    setState({
      ...EMPTY,
      providerId: providers[0]?.id ?? "",
    });
  }, [open, providers]);

  const selectedProvider = providers.find((p) => p.id === state.providerId);
  const previewPublicId =
    state.publicModelId.trim() ||
    (selectedProvider && state.remoteModelId.trim()
      ? `${selectedProvider.name}/${state.remoteModelId.trim()}`
      : "");

  async function save() {
    if (!state.providerId) {
      toast.error("请先选择 Provider");
      return;
    }
    if (!state.remoteModelId.trim()) {
      toast.error("请填写 Remote Model ID");
      return;
    }
    const body: Record<string, unknown> = {
      providerId: state.providerId,
      remoteModelId: state.remoteModelId.trim(),
      selected: state.selected,
    };
    const pub = state.publicModelId.trim();
    if (pub) body.publicModelId = pub;

    setSubmitting(true);
    try {
      await api("/api/models", { method: "POST", body: JSON.stringify(body) });
      await reload();
      toast.success("模型已添加");
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
          <DialogTitle>手动添加模型</DialogTitle>
          <DialogDescription>
            适用于上游 <code className="font-mono text-xs">/models</code> 不返回但实际可调用的模型。
          </DialogDescription>
        </DialogHeader>
        <div className="space-y-4">
          <div className="space-y-2">
            <Label htmlFor="model-provider">Provider</Label>
            <Select
              value={state.providerId}
              onValueChange={(v) => setState({ ...state, providerId: v })}
            >
              <SelectTrigger id="model-provider">
                <SelectValue placeholder="选择 Provider" />
              </SelectTrigger>
              <SelectContent>
                {providers.map((p) => (
                  <SelectItem key={p.id} value={p.id}>
                    {p.name}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>
          <div className="space-y-2">
            <Label htmlFor="model-remote-id">Remote Model ID</Label>
            <Input
              id="model-remote-id"
              placeholder="gpt-4o-mini"
              value={state.remoteModelId}
              onChange={(e) => setState({ ...state, remoteModelId: e.target.value })}
              className="font-mono"
            />
          </div>
          <div className="space-y-2">
            <Label htmlFor="model-public-id">Public Model ID（可选）</Label>
            <Input
              id="model-public-id"
              placeholder={previewPublicId || "openai/gpt-4o-mini"}
              value={state.publicModelId}
              onChange={(e) => setState({ ...state, publicModelId: e.target.value })}
              className="font-mono"
            />
            <p className="text-muted-foreground text-xs">
              留空将自动使用 <code className="font-mono">{previewPublicId || "provider/remote-id"}</code>
            </p>
          </div>
          <div className="flex items-center gap-2">
            <Checkbox
              id="model-selected"
              checked={state.selected}
              onCheckedChange={(v) => setState({ ...state, selected: v === true })}
            />
            <Label htmlFor="model-selected" className="cursor-pointer text-sm font-normal">
              立即暴露给客户端
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
