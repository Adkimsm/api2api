import { useState } from "react";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { setToken } from "../auth";

interface Props {
  onLogin: () => void | Promise<void>;
}

export function Login({ onLogin }: Props) {
  const [value, setValue] = useState("");
  const [busy, setBusy] = useState(false);

  async function submit() {
    const token = value.trim();
    if (!token) {
      toast.error("请输入 ADMIN_TOKEN");
      return;
    }
    setToken(token);
    setBusy(true);
    try {
      await onLogin();
    } catch (err) {
      toast.error("登录失败：" + (err as Error).message);
    } finally {
      setBusy(false);
    }
  }

  return (
    <div className="bg-background text-foreground flex min-h-svh items-center justify-center px-4">
      <Card className="w-full max-w-md">
        <CardHeader className="space-y-2">
          <div className="flex items-center gap-3">
            <div className="bg-foreground text-background flex size-8 items-center justify-center rounded-md text-xs font-semibold">
              a2
            </div>
            <CardTitle className="text-lg">api2api Admin</CardTitle>
          </div>
          <CardDescription>
            使用 Cloudflare Secret 中配置的 ADMIN_TOKEN 登录。Token 仅保存在当前浏览器的 localStorage。
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="space-y-2">
            <Label htmlFor="admin-token">ADMIN_TOKEN</Label>
            <Input
              id="admin-token"
              type="password"
              autoComplete="current-password"
              placeholder="••••••••"
              value={value}
              onChange={(e) => setValue(e.target.value)}
              onKeyDown={(e) => {
                if (e.key === "Enter") submit();
              }}
              disabled={busy}
            />
          </div>
          <Button onClick={submit} disabled={busy} className="w-full">
            {busy ? "登录中..." : "登录"}
          </Button>
        </CardContent>
      </Card>
    </div>
  );
}
