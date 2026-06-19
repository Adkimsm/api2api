import { useEffect, useState } from "react";
import { Check, Copy, Download } from "lucide-react";
import { toast } from "sonner";
import { api } from "../api";
import { clearToken } from "../auth";
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
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Skeleton } from "@/components/ui/skeleton";
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

function OverviewSkeleton() {
  return (
    <div className="space-y-6">
      <div>
        <Skeleton className="h-8 w-24" />
        <Skeleton className="mt-1 h-4 w-64" />
      </div>
      <Card>
        <CardHeader>
          <Skeleton className="h-5 w-32" />
          <Skeleton className="mt-1 h-4 w-80" />
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="space-y-1.5">
            <Skeleton className="h-3 w-24" />
            <Skeleton className="h-10 w-full" />
          </div>
          <div className="space-y-1.5">
            <Skeleton className="h-3 w-32" />
            <Skeleton className="h-10 w-full" />
          </div>
        </CardContent>
      </Card>
      <Card>
        <CardHeader>
          <Skeleton className="h-5 w-32" />
          <Skeleton className="mt-1 h-4 w-80" />
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="space-y-2">
            <Skeleton className="h-4 w-28" />
            <Skeleton className="h-10 w-full" />
          </div>
          <div className="grid gap-4 md:grid-cols-2">
            <div className="space-y-2">
              <Skeleton className="h-4 w-28" />
              <Skeleton className="h-10 w-full" />
            </div>
            <div className="space-y-2">
              <Skeleton className="h-4 w-28" />
              <Skeleton className="h-10 w-full" />
            </div>
          </div>
          <Skeleton className="h-10 w-24" />
        </CardContent>
      </Card>
      <Card>
        <CardHeader>
          <Skeleton className="h-5 w-32" />
          <Skeleton className="mt-1 h-4 w-80" />
        </CardHeader>
        <CardContent>
          <div className="flex flex-wrap items-center gap-2">
            <Skeleton className="h-10 w-[180px]" />
            <Skeleton className="h-10 w-20" />
          </div>
        </CardContent>
      </Card>
    </div>
  );
}

export function Overview() {
  const { config, models, reload, loading } = useAdminData();
  const [exportTarget, setExportTarget] = useState<string>(EXPORT_TARGETS[0].value);
  const [serviceApiKeyInput, setServiceApiKeyInput] = useState(config?.serviceApiKey || "");
  const [currentAdminToken, setCurrentAdminToken] = useState("");
  const [newAdminToken, setNewAdminToken] = useState("");
  const [savingConfig, setSavingConfig] = useState(false);
  const [mounted, setMounted] = useState(false);

  useEffect(() => {
    requestAnimationFrame(() => setMounted(true));
  }, []);

  useEffect(() => {
    setServiceApiKeyInput(config?.serviceApiKey || "");
  }, [config?.serviceApiKey]);

  const endpoint = window.location.origin + "/v1";
  const effectiveServiceApiKey = serviceApiKeyInput || config?.serviceApiKey || "";
  const apiKey = effectiveServiceApiKey || "(未设置 SERVICE_API_KEY)";

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
          options: { baseURL, apiKey: effectiveServiceApiKey },
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

  async function saveSecurityConfig() {
    const serviceApiKey = serviceApiKeyInput.trim();
    const currentToken = currentAdminToken.trim();
    const nextToken = newAdminToken.trim();
    if (!serviceApiKey) {
      toast.error("SERVICE_API_KEY 不能为空");
      return;
    }
    if (nextToken && !currentToken) {
      toast.error("修改 ADMIN_TOKEN 需要输入当前 ADMIN_TOKEN");
      return;
    }

    setSavingConfig(true);
    try {
      await api("/api/config", {
        method: "PATCH",
        body: JSON.stringify({
          serviceApiKey,
          ...(nextToken ? { currentAdminToken: currentToken, newAdminToken: nextToken } : {}),
        }),
      });
      setCurrentAdminToken("");
      setNewAdminToken("");
      if (nextToken) {
        clearToken();
        toast.success("配置已保存，请使用新的 ADMIN_TOKEN 重新登录");
        window.location.reload();
        return;
      }
      await reload();
      toast.success("配置已保存");
    } catch (err) {
      toast.error("保存失败：" + (err as Error).message);
    } finally {
      setSavingConfig(false);
    }
  }

  if (loading || !mounted) return <OverviewSkeleton />;

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
          <CardTitle className="text-base">安全配置</CardTitle>
          <CardDescription>
            后台保存的值会覆盖 Cloudflare 环境变量；ADMIN_TOKEN 不会从后端返回，修改时需要输入当前 token 校验。
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="space-y-2">
            <Label htmlFor="service-api-key">SERVICE_API_KEY</Label>
            <Input
              id="service-api-key"
              value={serviceApiKeyInput}
              onChange={(event) => setServiceApiKeyInput(event.target.value)}
              placeholder="sk-api2api-your-key"
              autoComplete="off"
            />
          </div>
          <div className="grid gap-4 md:grid-cols-2">
            <div className="space-y-2">
              <Label htmlFor="current-admin-token">当前 ADMIN_TOKEN</Label>
              <Input
                id="current-admin-token"
                type="password"
                value={currentAdminToken}
                onChange={(event) => setCurrentAdminToken(event.target.value)}
                placeholder="修改 ADMIN_TOKEN 时必填"
                autoComplete="current-password"
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="new-admin-token">新的 ADMIN_TOKEN</Label>
              <Input
                id="new-admin-token"
                type="password"
                value={newAdminToken}
                onChange={(event) => setNewAdminToken(event.target.value)}
                placeholder="留空则不修改"
                autoComplete="new-password"
              />
            </div>
          </div>
          <Button onClick={saveSecurityConfig} disabled={savingConfig}>
            {savingConfig ? "保存中..." : "保存配置"}
          </Button>
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
