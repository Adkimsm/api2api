import { useEffect, useState } from "react";
import type { ChangeEvent } from "react";
import { ChevronDown } from "lucide-react";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import { Checkbox } from "@/components/ui/checkbox";
import { Collapsible, CollapsibleContent, CollapsibleTrigger } from "@/components/ui/collapsible";
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
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Textarea } from "@/components/ui/textarea";
import { toolTemplates } from "@/data/toolTemplates";
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
  const [showTemplates, setShowTemplates] = useState(false);
  const [selectedTemplate, setSelectedTemplate] = useState("");

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
    setShowTemplates(false);
    setSelectedTemplate("");
  }, [open, editing]);

  function insertTemplate() {
    if (!selectedTemplate) {
      toast.error("请先选择一个模板");
      return;
    }

    const template = toolTemplates.find((item) => item.id === selectedTemplate);
    if (!template) return;

    try {
      const current = state.injectedTools.trim() ? JSON.parse(state.injectedTools) : [];
      if (!Array.isArray(current)) {
        toast.error("当前工具定义必须是 JSON 数组，修正后再插入模板");
        return;
      }

      const merged = [...current];
      const existingFunctionNames = new Set(
        current
          .filter((tool) => tool && typeof tool === "object" && tool.type === "function" && typeof tool.name === "string")
          .map((tool) => tool.name)
      );
      const toInsert = Array.isArray(template.tool) ? template.tool : [template.tool];
      let skipped = 0;

      for (const tool of toInsert) {
        if (tool.type === "function" && typeof tool.name === "string") {
          if (existingFunctionNames.has(tool.name)) {
            skipped++;
            continue;
          }
          existingFunctionNames.add(tool.name);
        }
        merged.push(tool);
      }

      setState({ ...state, injectedTools: JSON.stringify(merged, null, 2) });
      setSelectedTemplate("");
      toast.success(skipped > 0 ? `已插入模板，跳过 ${skipped} 个重复 function` : `已插入模板：${template.name}`);
    } catch (err) {
      toast.error("当前工具定义 JSON 格式错误：" + (err as Error).message);
    }
  }

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
              <>
                <Collapsible open={showTemplates} onOpenChange={setShowTemplates}>
                  <CollapsibleTrigger asChild>
                    <Button type="button" variant="outline" size="sm" className="w-full justify-between">
                      从模板添加
                      <ChevronDown className={`h-4 w-4 transition-transform ${showTemplates ? "rotate-180" : ""}`} />
                    </Button>
                  </CollapsibleTrigger>
                  <CollapsibleContent className="mt-2 space-y-2">
                    <div className="flex gap-2">
                      <Select value={selectedTemplate} onValueChange={setSelectedTemplate}>
                        <SelectTrigger className="flex-1">
                          <SelectValue placeholder="选择工具模板..." />
                        </SelectTrigger>
                        <SelectContent>
                          {toolTemplates.map((template) => (
                            <SelectItem key={template.id} value={template.id}>
                              {template.name}
                            </SelectItem>
                          ))}
                        </SelectContent>
                      </Select>
                      <Button type="button" size="sm" onClick={insertTemplate} disabled={!selectedTemplate}>
                        插入
                      </Button>
                    </div>
                    {selectedTemplate && (
                      <p className="text-xs text-muted-foreground">
                        {toolTemplates.find((template) => template.id === selectedTemplate)?.description}
                      </p>
                    )}
                    <p className="text-xs text-muted-foreground">插入后可在下方 JSON 编辑器中自定义参数。</p>
                  </CollapsibleContent>
                </Collapsible>

                <div className="space-y-2">
                  <Label htmlFor="injected-tools">工具定义（OpenAI Tools JSON 数组）</Label>
                  <Textarea
                    id="injected-tools"
                    placeholder='[{"type":"function","name":"get_weather","description":"获取天气信息","parameters":{"type":"object","properties":{"location":{"type":"string"}},"required":["location"]}}]'
                    className="font-mono text-xs min-h-[120px]"
                    rows={8}
                    value={state.injectedTools}
                    onChange={(e: ChangeEvent<HTMLTextAreaElement>) => setState({ ...state, injectedTools: e.target.value })}
                  />
                  <p className="text-xs text-muted-foreground">
                    转发请求时会将这些工具与客户端提供的工具合并（同名 function 会保留客户端的定义）。支持 function、file_search、web_search、code_interpreter 等所有 OpenAI 工具类型。
                  </p>
                </div>
              </>
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
