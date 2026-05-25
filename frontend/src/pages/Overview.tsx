import { useState } from "react";
import { Check, Copy, Download } from "lucide-react";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { useAdminData } from "../hooks/useAdminData";

const EXPORT_TARGETS = [{ value: "opencode", label: "opencode" }] as const;

function downloadFile(filename: string, content: string) {
  const blob = new Blob([content], { type: "application/json;charset=utf-8" });
  const url = URL.createObjectURL(blob);
  const a = document.createElement("a");
  a.href = url;
  a.download = filename;
  document.body.appendChild(a);
  a.click();
  document.body.removeChild(a);
  setTimeout(() => URL.revokeObjectURL(url), 1000);
}

function CopyField({ label, value, monospace = true }: { label: string; value: string; monospace?: boolean }) {
  const [copied, setCopied] = useState(false);
  async function copy() {
    try {
      await navigator.clipboard.writeText(value);
      setCopied(true);
      setTimeout(() => setCopied(false), 1500);
    } catch {
      toast.error("复制失败");
    }
  }
  return (
    <div className="space-y-1.5">
      <div className="text-muted-foreground text-xs font-medium tracking-wide uppercase">{label}</div>
      <div className="bg-muted/40 group flex items-center gap-2 rounded-md border border-border px-3 py-2">
        <code
          className={
            "min-w-0 flex-1 truncate text-sm " + (monospace ? "font-mono" : "")
          }
          title={value}
        >
          {value}
        </code>
        <Button
          variant="ghost"
          size="icon-sm"
          onClick={copy}
          className="text-muted-foreground hover:text-foreground shrink-0"
          aria-label="复制"
        >
          {copied ? <Check className="size-3.5" /> : <Copy className="size-3.5" />}
        </Button>
      </div>
    </div>
  );
}

export function Overview() {
  const { config, models } = useAdminData();
  const [exportTarget, setExportTarget] = useState<string>(EXPORT_TARGETS[0].value);

  const endpoint = window.location.origin + "/v1";
  const apiKey = config?.serviceApiKey || "(未设置 SERVICE_API_KEY)";

  function buildOpencodeConfig() {
    const baseURL = endpoint;
    const selected = models.filter((m) => m.selected && m.providerEnabled);
    const modelsMap: Record<string, { name: string }> = {};
    selected.forEach((m) => {
      modelsMap[m.publicModelId] = { name: m.publicModelId };
    });
    return {
      $schema: "https://opencode.ai/config.json",
      provider: {
        api2api: {
          npm: "@ai-sdk/openai-compatible",
          name: "api2api",
          options: { baseURL, apiKey: config?.serviceApiKey || "" },
          models: modelsMap,
        },
      },
    };
  }

  function exportConfig(target: string) {
    try {
      if (target === "opencode") {
        const cfg = buildOpencodeConfig();
        downloadFile("opencode.json", JSON.stringify(cfg, null, 2));
        toast.success("已导出 opencode 配置文件");
      }
    } catch (err) {
      toast.error("导出失败：" + (err as Error).message);
    }
  }

  const selectedCount = models.filter((m) => m.selected && m.providerEnabled).length;

  return (
    <div className="space-y-6">
      <div>
        <h2 className="text-2xl font-semibold tracking-tight">概览</h2>
        <p className="text-muted-foreground mt-1 text-sm">查看 OpenAI 兼容接入信息，导出客户端配置。</p>
      </div>

      <Card>
        <CardHeader>
          <CardTitle className="text-base">API 接入信息</CardTitle>
          <CardDescription>
            把以下信息填进客户端：base URL 指向 <code className="font-mono text-xs">/v1</code>，使用 SERVICE_API_KEY 作为 Bearer Token。
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          <CopyField label="API Endpoint" value={endpoint} />
          <CopyField label="SERVICE_API_KEY" value={apiKey} />
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle className="text-base">导出配置文件</CardTitle>
          <CardDescription>
            选择目标平台，下载预填好 endpoint、API Key 与已选模型的配置文件。当前已选 {selectedCount} 个模型。
          </CardDescription>
        </CardHeader>
        <CardContent>
          <div className="flex flex-wrap items-center gap-2">
            <Select value={exportTarget} onValueChange={setExportTarget}>
              <SelectTrigger className="w-[180px]">
                <SelectValue placeholder="选择目标平台" />
              </SelectTrigger>
              <SelectContent>
                {EXPORT_TARGETS.map((t) => (
                  <SelectItem key={t.value} value={t.value}>
                    {t.label}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
            <Button onClick={() => exportConfig(exportTarget)} disabled={!exportTarget}>
              <Download className="size-4" />
              导出
            </Button>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}
