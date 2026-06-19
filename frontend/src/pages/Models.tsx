import { useEffect, useMemo, useRef, useState } from "react";
import { useVirtualizer } from "@tanstack/react-virtual";
import { Loader2, Plus, RefreshCw, Search } from "lucide-react";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Skeleton } from "@/components/ui/skeleton";
import { api } from "../api";
import { ModelForm } from "../components/ModelForm";
import { ModelRow } from "../components/ModelRow";
import { useAdminData } from "../hooks/useAdminData";

const ALL_PROVIDERS = "__all__";
const ROW_HEIGHT = 44;
const GRID_COLS = "grid-cols-[40px_100px_minmax(100px,1fr)_minmax(200px,280px)_auto_40px]";

function ModelsSkeleton() {
  return (
    <div className="space-y-6">
      <div className="flex flex-wrap items-start justify-between gap-3">
        <div>
          <Skeleton className="h-8 w-32" />
          <Skeleton className="mt-1 h-4 w-64" />
        </div>
        <div className="flex flex-wrap gap-2">
          <Skeleton className="h-8 w-20" />
          <Skeleton className="h-8 w-24" />
          <Skeleton className="h-8 w-24" />
        </div>
      </div>
      <div className="grid gap-2 sm:grid-cols-[1fr_200px_auto_auto]">
        <Skeleton className="h-10 w-full" />
        <Skeleton className="h-10 w-[200px]" />
        <Skeleton className="h-10 w-24" />
        <Skeleton className="h-10 w-24" />
      </div>
      <div className="border-border bg-card overflow-hidden rounded-lg border">
        <div className="max-h-[640px] overflow-auto">
          <div className="min-w-[720px]">
            <div className={`bg-muted/40 sticky top-0 z-10 grid items-center border-b border-border px-3 py-2 text-xs font-medium text-muted-foreground ${GRID_COLS}`}>
              <div>暴露</div>
              <div>Provider</div>
              <div>Remote Model</div>
              <div>Public Model ID</div>
              <div>Last Seen</div>
              <div></div>
            </div>
            {[1, 2, 3, 4, 5, 6, 7, 8].map((i) => (
              <div key={i} className={`grid items-center border-b border-border px-3 py-2 last:border-b-0 ${GRID_COLS}`}>
                <div><Skeleton className="h-5 w-5" /></div>
                <div><Skeleton className="h-5 w-16" /></div>
                <div><Skeleton className="h-5 w-40" /></div>
                <div><Skeleton className="h-5 w-36" /></div>
                <div><Skeleton className="h-5 w-24" /></div>
                <div><Skeleton className="h-5 w-5" /></div>
              </div>
            ))}
          </div>
        </div>
      </div>
    </div>
  );
}

export function Models() {
  const { providers, models, reload, busy, setBusy, loading } = useAdminData();
  const [search, setSearch] = useState("");
  const [providerFilter, setProviderFilter] = useState<string>(ALL_PROVIDERS);
  const [addOpen, setAddOpen] = useState(false);
  const [mounted, setMounted] = useState(false);
  const [syncErrors, setSyncErrors] = useState<Array<{ providerName: string; error: string }>>([]);
  const [errorDialogOpen, setErrorDialogOpen] = useState(false);
  const scrollRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    requestAnimationFrame(() => setMounted(true));
  }, []);

  const visible = useMemo(() => {
    const q = search.trim().toLowerCase();
    return models.filter((m) => {
      if (providerFilter !== ALL_PROVIDERS && m.providerName !== providerFilter) return false;
      if (!q) return true;
      return (
        m.remoteModelId.toLowerCase().includes(q) ||
        m.publicModelId.toLowerCase().includes(q)
      );
    });
  }, [models, search, providerFilter]);

  const selectedCount = models.filter((m) => m.selected && m.providerEnabled).length;

  const rowVirtualizer = useVirtualizer({
    count: visible.length,
    getScrollElement: () => scrollRef.current,
    estimateSize: () => ROW_HEIGHT,
    overscan: 5,
  });

  if (loading || !mounted) return <ModelsSkeleton />;

  async function syncAll() {
    setBusy(true);
    const id = toast.loading("正在同步所有 provider 模型...");
    try {
      const res = await api("/api/models/sync-all", { method: "POST" });
      await reload();

      const errors = res.data.filter((r: any) => r.error);
      if (errors.length === 0) {
        toast.success("全部同步完成", { id });
      } else {
        setSyncErrors(errors.map((e: any) => ({ providerName: e.providerName, error: e.error })));
        setErrorDialogOpen(true);
        toast.error(`${errors.length} 个 provider 同步失败`, { id, duration: 8000 });
      }
    } catch (err) {
      toast.error((err as Error).message, { id });
    } finally {
      setBusy(false);
    }
  }

  async function refresh() {
    setBusy(true);
    try {
      await reload();
      toast.success("已刷新");
    } catch (err) {
      toast.error((err as Error).message);
    } finally {
      setBusy(false);
    }
  }

  async function bulkSelect(selected: boolean) {
    const targets = visible.filter((m) => m.selected !== selected);
    if (!targets.length) return;
    if (!confirm((selected ? "选中" : "取消") + targets.length + " 个模型？")) return;
    setBusy(true);
    try {
      for (const m of targets) {
        await api("/api/models/" + m.id, {
          method: "PATCH",
          body: JSON.stringify({ selected }),
        });
      }
      await reload();
      toast.success("批量更新完成");
    } catch (err) {
      toast.error((err as Error).message);
    } finally {
      setBusy(false);
    }
  }

  return (
    <div className="space-y-6">
      <div className="flex flex-wrap items-start justify-between gap-3">
        <div>
          <h2 className="text-2xl font-semibold tracking-tight">模型管理</h2>
          <p className="text-muted-foreground mt-1 text-sm">
            管理从各 provider 同步过来的模型。当前已暴露 {selectedCount} / {models.length} 个。
          </p>
        </div>
        <div className="flex flex-wrap gap-2">
          <Button variant="outline" size="sm" onClick={refresh} disabled={busy}>
            <RefreshCw className="size-3.5" />
            刷新
          </Button>
          <Button
            variant="outline"
            size="sm"
            onClick={() => setAddOpen(true)}
            disabled={busy || providers.length === 0}
          >
            <Plus className="size-3.5" />
            添加模型
          </Button>
          <Button size="sm" onClick={syncAll} disabled={busy}>
            {busy ? <Loader2 className="size-3.5 animate-spin" /> : <RefreshCw className="size-3.5" />}
            同步全部
          </Button>
        </div>
      </div>

      <div className="grid gap-2 sm:grid-cols-[1fr_200px_auto_auto]">
        <div className="relative">
          <Search className="text-muted-foreground absolute top-1/2 left-3 size-3.5 -translate-y-1/2" />
          <Input
            placeholder="搜索 remote / public model id"
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            className="pl-9"
          />
        </div>
        <Select value={providerFilter} onValueChange={setProviderFilter}>
          <SelectTrigger>
            <SelectValue placeholder="所有 Provider" />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value={ALL_PROVIDERS}>所有 Provider</SelectItem>
            {providers.map((p) => (
              <SelectItem key={p.id} value={p.name}>
                {p.name}
              </SelectItem>
            ))}
          </SelectContent>
        </Select>
        <Button variant="outline" onClick={() => bulkSelect(true)} disabled={busy || !visible.length}>
          全选可见
        </Button>
        <Button variant="outline" onClick={() => bulkSelect(false)} disabled={busy || !visible.length}>
          全取消可见
        </Button>
      </div>

      <div className="border-border bg-card overflow-hidden rounded-lg border">
        <div ref={scrollRef} className="max-h-[640px] overflow-auto">
          <div className="min-w-[720px]">
            <div className={`bg-muted/40 sticky top-0 z-10 grid items-center border-b border-border px-3 py-2 text-xs font-medium text-muted-foreground ${GRID_COLS}`}>
              <div>暴露</div>
              <div>Provider</div>
              <div>Remote Model</div>
              <div>Public Model ID</div>
              <div>Last Seen</div>
              <div></div>
            </div>
            {visible.length === 0 ? (
              <div className="text-muted-foreground py-10 text-center text-sm">
                暂无模型。请先添加 Provider 并同步，或调整搜索 / 筛选条件。
              </div>
            ) : (
              <div className="relative" style={{ height: rowVirtualizer.getTotalSize() }}>
                {rowVirtualizer.getVirtualItems().map((virtualRow) => (
                  <div
                    key={virtualRow.key}
                    className="absolute left-0 top-0 w-full"
                    style={{
                      height: virtualRow.size,
                      transform: `translateY(${virtualRow.start}px)`,
                    }}
                  >
                    <ModelRow model={visible[virtualRow.index]} />
                  </div>
                ))}
              </div>
            )}
          </div>
        </div>
      </div>

      <ModelForm open={addOpen} onOpenChange={setAddOpen} />

      <Dialog open={errorDialogOpen} onOpenChange={setErrorDialogOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>同步失败详情</DialogTitle>
            <DialogDescription>
              以下 {syncErrors.length} 个 provider 同步失败：
            </DialogDescription>
          </DialogHeader>
          <div className="max-h-80 space-y-2 overflow-y-auto">
            {syncErrors.map((e, i) => (
              <div key={i} className="rounded-md border p-3 text-sm">
                <div className="font-medium">{e.providerName}</div>
                <div className="text-muted-foreground mt-1 break-all">{e.error}</div>
              </div>
            ))}
          </div>
        </DialogContent>
      </Dialog>
    </div>
  );
}
