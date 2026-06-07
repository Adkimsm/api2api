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
import { Textarea } from "@/components/ui/textarea";
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
  injectTools: boolean;
  injectedTools: string;
}

const EMPTY: FormState = { name: "", baseUrl: "", apiKey: "", enabled: true, injectTools: false, injectedTools: "" };

export function ProviderForm({ open, onOpenChange, editing }: Props) {
  const { reload } = useAdminData();
  const [state, setState] = useState<FormState>(EMPTY);
  const [submitting, setSubmitting] = useState(false);

  useEffect(() => {
    if (!open) return;
    if (editing) {
      setState({ 
        name: editing.name, 
        baseUrl: editing.baseUrl, 
        apiKey: "", 
        enabled: editing.enabled,
        injectTools: editing.injectTools,
        injectedTools: editing.injectedTools || ""
      });
    } else {
      setState(EMPTY);
    }
  }, [open, editing]);

  async function save() {
    if (!state.name.trim() || !state.baseUrl.trim()) {
      toast.error("请填写 Name 和 Base URL");
      return;
    }
    
    // Validate injectedTools JSON format
    if (state.injectTools && state.injectedTools.trim()) {
      try {
        const parsed = JSON.parse(state.injectedTools);
        if (!Array.isArray(parsed)) {
          toast.error("工具定义必须是 JSON 数组格式");
          return;
        }
        // Basic type check
        for (let i = 0; i < parsed.length; i++) {
          const tool = parsed[i];
          if (!tool || typeof tool !== 'object' || !tool.type) {
            toast.error(`工具 #${i + 1} 缺少 'type' 字段`);
            return;
          }
        }
      } catch (err) {
        toast.error("工具定义 JSON 格式错误：" + (err as Error).message);
        return;
      }
    }
    
    const body: Record<string, unknown> = {
      name: state.name.trim(),
      baseUrl: state.baseUrl.trim(),
      enabled: state.enabled,
      injectTools: state.injectTools,
    };
    const key = state.apiKey.trim();
    if (key) body.apiKey = key;
    
    if (state.injectTools && state.injectedTools.trim()) {
      body.injectedTools = state.injectedTools.trim();
    }
    
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
            上游 API 的基本信息。Base URL 填写实际拼接前缀，例如 <code className="font-mono text-xs">https://api.openai.com/v1</code>，自定义路径也可。
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

        {/* Tool injection configuration */}
        <div className="space-y-4 rounded-lg border p-4 bg-muted/30">
          <div className="flex items-center gap-2">
            <Checkbox
              id="provider-inject-tools"
              checked={state.injectTools}
              onCheckedChange={(v) => setState({ ...state, injectTools: v === true })}
            />
            <Label htmlFor="provider-inject-tools" className="cursor-pointer text-sm font-normal">
              启用工具注入
            </Label>
          </div>

          {state.injectTools && (
            <div className="space-y-2">
              <Label htmlFor="injected-tools">工具定义（OpenAI Tools JSON 数组）</Label>
              <Textarea
                id="injected-tools"
                placeholder='[{"type":"function","name":"get_weather","description":"获取天气信息","parameters":{"type":"object","properties":{"location":{"type":"string"}},"required":["location"]}}]'
                className="font-mono text-xs min-h-[120px]"
                rows={8}
                value={state.injectedTools}
                onChange={(e: React.ChangeEvent<HTMLTextAreaElement>) => setState({ ...state, injectedTools: e.target.value })}
              />
              <p className="text-xs text-muted-foreground">
                转发请求时会将这些工具与客户端提供的工具合并（同名 function 会保留客户端的定义）。支持 function、file_search、web_search、code_interpreter 等所有 OpenAI 工具类型。
              </p>
            </div>
          )}
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
