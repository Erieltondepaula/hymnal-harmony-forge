import { Link, useRouterState } from "@tanstack/react-router";
import {
  LayoutDashboard,
  FilePlus2,
  Library,
  Upload,
  Settings,
  HelpCircle,
  Music2,
} from "lucide-react";
import { cn } from "@/lib/utils";
import { type ReactNode } from "react";

const nav = [
  { to: "/", label: "Dashboard", icon: LayoutDashboard },
  { to: "/novo", label: "Novo Projeto", icon: FilePlus2 },
  { to: "/biblioteca", label: "Biblioteca", icon: Library },
  { to: "/importar", label: "Importar", icon: Upload },
  { to: "/configuracoes", label: "Configurações", icon: Settings },
  { to: "/ajuda", label: "Ajuda", icon: HelpCircle },
] as const;

export function AppShell({ children }: { children: ReactNode }) {
  const pathname = useRouterState({ select: (s) => s.location.pathname });
  // Editor uses full-bleed layout without sidebar chrome
  const isEditor = pathname.startsWith("/editor/");

  if (isEditor) {
    return <div className="min-h-screen bg-background">{children}</div>;
  }

  return (
    <div className="flex min-h-screen w-full bg-background text-foreground">
      <aside className="hidden md:flex sticky top-0 h-screen w-[280px] flex-col border-r border-border bg-sidebar">
        <div className="flex items-center gap-3 px-6 pt-8 pb-6">
          <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-primary/15 text-primary ring-1 ring-primary/30">
            <Music2 className="h-5 w-5" />
          </div>
          <div>
            <div className="text-[15px] font-semibold leading-tight">MapaLouvor</div>
            <div className="text-xs text-muted-foreground">Mapas musicais</div>
          </div>
        </div>

        <nav className="flex-1 px-3 py-2">
          <ul className="space-y-1">
            {nav.map((item) => {
              const active =
                item.to === "/"
                  ? pathname === "/"
                  : pathname.startsWith(item.to);
              const Icon = item.icon;
              return (
                <li key={item.to}>
                  <Link
                    to={item.to}
                    className={cn(
                      "group flex items-center gap-3 rounded-lg px-3 py-2.5 text-[14px] font-medium transition-colors",
                      active
                        ? "bg-primary/15 text-primary"
                        : "text-muted-foreground hover:bg-accent hover:text-foreground",
                    )}
                  >
                    <Icon className="h-[18px] w-[18px]" />
                    <span>{item.label}</span>
                  </Link>
                </li>
              );
            })}
          </ul>
        </nav>

        <div className="mx-3 mb-4 flex items-center gap-3 rounded-xl border border-border bg-card p-3">
          <div className="flex h-9 w-9 items-center justify-center rounded-full bg-primary/20 text-sm font-semibold text-primary">
            J
          </div>
          <div className="min-w-0">
            <div className="truncate text-sm font-medium">João</div>
            <div className="truncate text-xs text-muted-foreground">Ministério Louvor</div>
          </div>
        </div>
      </aside>

      <main className="flex-1 min-w-0">
        <div className="mx-auto w-full max-w-[1600px] px-6 py-10 md:px-12 md:py-12">
          {children}
        </div>
      </main>
    </div>
  );
}
