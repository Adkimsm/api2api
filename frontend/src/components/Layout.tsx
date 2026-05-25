import type { ReactNode } from "react";
import { LogOut } from "lucide-react";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { cn } from "@/lib/utils";
import { routeHref, type Route } from "../router";

interface Props {
  route: Route;
  onLogout: () => void;
  children: ReactNode;
}

const NAV: { route: Route; label: string }[] = [
  { route: "overview", label: "概览" },
  { route: "providers", label: "Provider 管理" },
  { route: "models", label: "模型管理" },
];

export function Layout({ route, onLogout, children }: Props) {
  return (
    <div className="bg-background text-foreground min-h-svh flex flex-col">
      <header className="sticky top-0 z-30 border-b border-border bg-background/80 backdrop-blur supports-[backdrop-filter]:bg-background/60">
        <div className="mx-auto flex h-14 w-full max-w-6xl items-center gap-3 px-4 sm:px-6">
          <div className="flex min-w-0 items-center gap-3">
            <div className="bg-foreground text-background flex size-7 items-center justify-center rounded-md text-xs font-semibold">
              a2
            </div>
            <span className="truncate text-sm font-semibold tracking-tight">api2api Admin</span>
          </div>
          <div className="ml-auto flex items-center gap-2">
            <Badge variant="outline" className="gap-1.5 px-2 py-0.5 text-xs font-normal">
              <span className="size-1.5 rounded-full bg-emerald-500" aria-hidden />
              已登录
            </Badge>
            <Button
              variant="ghost"
              size="sm"
              onClick={onLogout}
              className="text-muted-foreground hover:text-foreground"
            >
              <LogOut className="size-3.5" />
              <span className="hidden sm:inline">清除 Token</span>
            </Button>
          </div>
        </div>
      </header>

      <div className="mx-auto w-full max-w-6xl flex-1 px-4 py-6 sm:px-6">
        <div className="flex flex-col gap-6 md:flex-row md:gap-8">
          <aside className="md:w-56 md:shrink-0">
            <nav
              className="flex gap-1 overflow-x-auto pb-1 md:flex-col md:overflow-visible md:pb-0"
              aria-label="主导航"
            >
              {NAV.map((item) => (
                <a
                  key={item.route}
                  href={routeHref(item.route)}
                  className={cn(
                    "rounded-md px-3 py-2 text-sm font-medium whitespace-nowrap transition-colors",
                    route === item.route
                      ? "bg-secondary text-secondary-foreground"
                      : "text-muted-foreground hover:bg-secondary/60 hover:text-foreground",
                  )}
                  aria-current={route === item.route ? "page" : undefined}
                >
                  {item.label}
                </a>
              ))}
            </nav>
          </aside>
          <main className="min-w-0 flex-1">{children}</main>
        </div>
      </div>
    </div>
  );
}
