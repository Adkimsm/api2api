import { useMemo, useState } from "react";
import { Loader2, RefreshCw, Search } from "lucide-react";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { api } from "../api";
import { ModelRow } from "../components/ModelRow";
import { useAdminData } from "../hooks/useAdminData";

const ALL_PROVIDERS = "__all__";

export function Models() {
  const { providers, models, reload, busy, setBusy } = useAdminData();
  const [search, setSearch] = useState("");
  const [providerFilter, setProviderFilter] = useState<string>(ALL_PROVIDERS);

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

  async function syncAll() {
    setBusy(true);
    const id = toast.loading("正在同步所有 provider 模型...");
    try {
      await api("/api/models/sync-all", { method: "POST" });
      await reload();
      toast.success("全部同步完成", { id });
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
    if (!visible.length) return;
    if (!confirm((selected ? "选中" : "取消") + "当前可见的 " + visible.length + " 个模型？")) return;
    setBusy(true);
    try {
      for (const m of visible) {
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
        <div className="max-h-[640px] overflow-auto">
          <Table>
            <TableHeader className="bg-muted/40 sticky top-0 backdrop-blur">
              <TableRow>
                <TableHead className="w-10">暴露</TableHead>
                <TableHead>Provider</TableHead>
                <TableHead>Remote Model</TableHead>
                <TableHead>Public Model ID</TableHead>
                <TableHead className="whitespace-nowrap">Last Seen</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {visible.length === 0 ? (
                <TableRow>
                  <TableCell colSpan={5} className="text-muted-foreground py-10 text-center text-sm">
                    暂无模型。请先添加 Provider 并同步，或调整搜索 / 筛选条件。
                  </TableCell>
                </TableRow>
              ) : (
                visible.map((m) => <ModelRow key={m.id} model={m} />)
              )}
            </TableBody>
          </Table>
        </div>
      </div>
    </div>
  );
}
