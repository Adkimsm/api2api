import { useCallback, useEffect, useState } from "react";
import { BarChart3, TrendingUp, Activity, Layers } from "lucide-react";
import { fetchTokenStats, fetchTokenTrend } from "../api";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import type { ModelTokenStats, PeriodTokenStats, TokenStats } from "../types";

type Period = "all" | "today" | "week" | "month";
type TrendRange = "7d" | "30d" | "12m";

function formatNumber(n: number): string {
  if (n >= 1_000_000) return (n / 1_000_000).toFixed(1) + "M";
  if (n >= 1_000) return (n / 1_000).toFixed(1) + "K";
  return n.toString();
}

function StatCard({ icon: Icon, label, value, sub }: { icon: typeof BarChart3; label: string; value: string; sub?: string }) {
  return (
    <Card>
      <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
        <CardTitle className="text-sm font-medium text-muted-foreground">{label}</CardTitle>
        <Icon className="h-4 w-4 text-muted-foreground" />
      </CardHeader>
      <CardContent>
        <div className="text-2xl font-bold">{value}</div>
        {sub && <p className="text-xs text-muted-foreground mt-1">{sub}</p>}
      </CardContent>
    </Card>
  );
}

function MiniBarChart({ data, maxVal }: { data: PeriodTokenStats[]; maxVal: number }) {
  if (data.length === 0) {
    return <div className="text-center text-muted-foreground py-8">暂无数据</div>;
  }
  return (
    <div className="flex items-end gap-1 h-40">
      {data.map((d) => {
        const h = maxVal > 0 ? (d.total_tokens / maxVal) * 100 : 0;
        return (
          <div key={d.period} className="flex-1 flex flex-col items-center gap-1">
            <div className="w-full bg-primary/20 rounded-t" style={{ height: `${Math.max(h, 2)}%` }}>
              <div className="w-full bg-primary rounded-t" style={{ height: "100%" }} />
            </div>
            <span className="text-[10px] text-muted-foreground truncate w-full text-center">{d.period.slice(5)}</span>
          </div>
        );
      })}
    </div>
  );
}

export function Stats() {
  const [period, setPeriod] = useState<Period>("all");
  const [trendRange, setTrendRange] = useState<TrendRange>("30d");
  const [overall, setOverall] = useState<TokenStats | null>(null);
  const [byModel, setByModel] = useState<ModelTokenStats[]>([]);
  const [trend, setTrend] = useState<PeriodTokenStats[]>([]);
  const [loading, setLoading] = useState(true);

  const load = useCallback(async () => {
    setLoading(true);
    try {
      const [statsRes, trendRes] = await Promise.all([
        fetchTokenStats(period === "all" ? undefined : period),
        fetchTokenTrend(trendRange),
      ]);
      setOverall(statsRes.overall);
      setByModel(statsRes.byModel);
      setTrend(trendRes.data);
    } finally {
      setLoading(false);
    }
  }, [period, trendRange]);

  useEffect(() => {
    load();
  }, [load]);

  const maxTrend = Math.max(...trend.map((d) => d.total_tokens), 1);

  return (
    <div className="space-y-6">
      <div>
        <h2 className="text-2xl font-bold tracking-tight">用量统计</h2>
        <p className="text-muted-foreground">查看 Token 使用量与趋势</p>
      </div>

      {/* Period Tabs */}
      <div className="flex gap-1 rounded-lg bg-muted p-1 w-fit">
        {(["all", "today", "week", "month"] as const).map((p) => (
          <button
            key={p}
            onClick={() => setPeriod(p)}
            className={`px-3 py-1.5 text-sm rounded-md transition-colors ${
              period === p
                ? "bg-background text-foreground shadow-sm"
                : "text-muted-foreground hover:text-foreground"
            }`}
          >
            {p === "all" ? "总共" : p === "today" ? "今日" : p === "week" ? "本周" : "本月"}
          </button>
        ))}
      </div>

      {/* Overview Cards */}
      {loading ? (
        <div className="text-center text-muted-foreground py-8">加载中...</div>
      ) : overall ? (
        <div className="grid gap-4 md:grid-cols-4">
          <StatCard icon={Layers} label="总 Token" value={formatNumber(overall.total_tokens)} />
          <StatCard icon={Activity} label="请求次数" value={formatNumber(overall.total_requests)} />
          <StatCard icon={TrendingUp} label="输入 Token" value={formatNumber(overall.prompt_tokens)} />
          <StatCard icon={BarChart3} label="输出 Token" value={formatNumber(overall.completion_tokens)} />
        </div>
      ) : null}

      {/* Trend Chart */}
      <Card>
        <CardHeader>
          <div className="flex items-center justify-between">
            <CardTitle className="text-base">使用趋势</CardTitle>
            <div className="flex gap-1 rounded bg-muted p-0.5">
              {(["7d", "30d", "12m"] as const).map((r) => (
                <button
                  key={r}
                  onClick={() => setTrendRange(r)}
                  className={`px-2 py-1 text-xs rounded transition-colors ${
                    trendRange === r
                      ? "bg-background text-foreground shadow-sm"
                      : "text-muted-foreground hover:text-foreground"
                  }`}
                >
                  {r === "7d" ? "7天" : r === "30d" ? "30天" : "12月"}
                </button>
              ))}
            </div>
          </div>
        </CardHeader>
        <CardContent>
          <MiniBarChart data={trend} maxVal={maxTrend} />
        </CardContent>
      </Card>

      {/* By Model Table */}
      <Card>
        <CardHeader>
          <CardTitle className="text-base">模型用量分布</CardTitle>
        </CardHeader>
        <CardContent>
          {byModel.length === 0 ? (
            <div className="text-center text-muted-foreground py-8">暂无数据</div>
          ) : (
            <div className="rounded-md border">
              <Table className="min-w-[720px]">
                <TableHeader>
                  <TableRow className="bg-muted/50">
                    <TableHead className="text-left">模型</TableHead>
                    <TableHead className="text-right">请求数</TableHead>
                    <TableHead className="text-right">总 Token</TableHead>
                    <TableHead className="text-right">输入</TableHead>
                    <TableHead className="text-right">输出</TableHead>
                    <TableHead className="text-right">占比</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {byModel.map((m) => {
                    const pct = overall && overall.total_tokens > 0
                      ? ((m.total_tokens / overall.total_tokens) * 100).toFixed(1)
                      : "0";
                    return (
                      <TableRow key={m.public_model_id}>
                        <TableCell>
                          <Badge variant="outline">{m.public_model_id}</Badge>
                        </TableCell>
                        <TableCell className="text-right">{formatNumber(m.request_count)}</TableCell>
                        <TableCell className="text-right font-medium">{formatNumber(m.total_tokens)}</TableCell>
                        <TableCell className="text-right text-muted-foreground">{formatNumber(m.prompt_tokens)}</TableCell>
                        <TableCell className="text-right text-muted-foreground">{formatNumber(m.completion_tokens)}</TableCell>
                        <TableCell className="text-right">{pct}%</TableCell>
                      </TableRow>
                    );
                  })}
                </TableBody>
              </Table>
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  );
}
