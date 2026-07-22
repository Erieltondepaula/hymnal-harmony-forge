import { Link, useNavigate, useRouterState } from "@tanstack/react-router";
import {
  LayoutDashboard,
  FilePlus2,
  Library,
  Upload,
  Settings,
  HelpCircle,
  Music2,
  LogOut,
} from "lucide-react";
import { cn } from "@/lib/utils";
import { useEffect, type ReactNode } from "react";
import { useAuth } from "@/lib/auth-context";
import { useSongSync } from "@/lib/song-sync";
import { usePreferencesSync } from "@/lib/preferences-sync";

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
  const { user, loading, signOut } = useAuth();
  const navigate = useNavigate();
  useSongSync();
  usePreferencesSync();

  const isAuth = pathname === "/auth";
  const isEditor = pathname.startsWith("/editor/");

  // Client-side guard: redirect to /auth when not signed in
  useEffect(() => {
    if (!loading && !user && !isAuth) {
      navigate({ to: "/auth" });
    }
  }, [loading, user, isAuth, navigate]);

  if (isAuth) {
    return <>{children}</>;
  }

  if (loading || !user) {
    return (
      <div className="flex min-h-screen items-center justify-center bg-background">
        <div className="h-6 w-6 animate-spin rounded-full border-2 border-primary border-t-transparent" />
      </div>
    );
  }

  if (isEditor) {
    return <div className="min-h-screen bg-background">{children}</div>;
  }

  const displayName =
    (user.user_metadata?.full_name as string | undefined) ??
    (user.user_metadata?.name as string | undefined) ??
    user.email?.split("@")[0] ??
    "Você";
  const initial = displayName.charAt(0).toUpperCase();
  const avatarUrl = user.user_metadata?.avatar_url as string | undefined;

  return (
    <div className="flex min-h-screen w-full bg-background text-foreground">
      <aside className="hidden md:flex sticky top-0 h-screen w-[280px] flex-col border-r border-border bg-sidebar">
        <div className="flex items-center gap-3 px-6 pt-8 pb-6">
          <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-primary/15 text-primary ring-1 ring-primary/30">
            <Music2 className="h-5 w-5" />
          </div>
          <div>
            <div className="text-[15px] font-semibold leading-tight">Mapas de Acordes_IBVP</div>
            <div className="text-xs text-muted-foreground">Mapas musicais</div>
          </div>
        </div>

        <nav className="flex-1 px-3 py-2">
          <ul className="space-y-1">
            {nav.map((item) => {
              const active =
                item.to === "/" ? pathname === "/" : pathname.startsWith(item.to);
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
          {avatarUrl ? (
            <img src={avatarUrl} alt="" className="h-9 w-9 rounded-full object-cover" />
          ) : (
            <div className="flex h-9 w-9 items-center justify-center rounded-full bg-primary/20 text-sm font-semibold text-primary">
              {initial}
            </div>
          )}
          <div className="min-w-0 flex-1">
            <div className="truncate text-sm font-medium">{displayName}</div>
            <div className="truncate text-xs text-muted-foreground">{user.email}</div>
          </div>
          <button
            type="button"
            onClick={async () => {
              await signOut();
              navigate({ to: "/auth" });
            }}
            title="Sair"
            className="rounded-lg p-2 text-muted-foreground hover:bg-accent hover:text-foreground transition"
          >
            <LogOut className="h-4 w-4" />
          </button>
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
