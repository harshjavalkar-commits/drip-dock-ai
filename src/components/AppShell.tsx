import { Link, useNavigate } from "@tanstack/react-router";
import { useQueryClient } from "@tanstack/react-query";
import {
  BarChart3,
  CalendarDays,
  Heart,
  LayoutGrid,
  Luggage,
  Plus,
  Sparkles,
  UserRound,
  LogOut,
} from "lucide-react";
import type { ReactNode } from "react";
import { supabase } from "@/lib/supabase";
import { cn } from "@/lib/utils";

export const NAV = [
  { to: "/dock", label: "Dock", icon: LayoutGrid },
  { to: "/upload", label: "Upload", icon: Plus },
  { to: "/stylist", label: "Stylist", icon: Sparkles },
  { to: "/analytics", label: "Analytics", icon: BarChart3 },
  { to: "/wishlist", label: "Wishlist", icon: Heart },
  { to: "/calendar", label: "Calendar", icon: CalendarDays },
  { to: "/packing", label: "Packing", icon: Luggage },
] as const;

export function AppShell({ children }: { children: ReactNode }) {
  const navigate = useNavigate();
  const queryClient = useQueryClient();

  async function signOut() {
    await queryClient.cancelQueries();
    queryClient.clear();
    await supabase.auth.signOut();
    navigate({ to: "/auth", replace: true });
  }

  return (
    <div className="min-h-screen bg-background">
      {/* Desktop sidebar */}
      <aside className="fixed inset-y-0 left-0 z-30 hidden w-60 flex-col border-r border-border bg-sidebar px-4 py-6 lg:flex">
        <Link to="/dock" className="px-3 pb-8">
          <span className="display text-2xl">DripDock</span>
          <span className="eyebrow mt-1 block">Wardrobe intelligence</span>
        </Link>
        <nav className="flex flex-1 flex-col gap-1">
          {NAV.map((item) => (
            <Link
              key={item.to}
              to={item.to}
              className="flex items-center gap-3 rounded-lg px-3 py-2.5 text-sm text-muted-foreground transition-colors hover:bg-accent hover:text-foreground data-[status=active]:bg-accent data-[status=active]:text-foreground"
            >
              <item.icon className="h-4 w-4" strokeWidth={1.5} />
              {item.label}
            </Link>
          ))}
        </nav>
        <div className="flex flex-col gap-1 border-t border-border pt-3">
          <Link
            to="/profile"
            className="flex items-center gap-3 rounded-lg px-3 py-2.5 text-sm text-muted-foreground transition-colors hover:bg-accent hover:text-foreground data-[status=active]:bg-accent data-[status=active]:text-foreground"
          >
            <UserRound className="h-4 w-4" strokeWidth={1.5} />
            Profile
          </Link>
          <button
            onClick={signOut}
            className="flex items-center gap-3 rounded-lg px-3 py-2.5 text-sm text-muted-foreground transition-colors hover:bg-accent hover:text-foreground"
          >
            <LogOut className="h-4 w-4" strokeWidth={1.5} />
            Sign out
          </button>
        </div>
      </aside>

      {/* Mobile top bar */}
      <header className="sticky top-0 z-30 grid grid-cols-[minmax(0,1fr)_auto] items-center gap-4 border-b border-border bg-background/85 px-5 py-3.5 backdrop-blur-xl lg:hidden">
        <Link to="/dock" className="display truncate text-xl">
          DripDock
        </Link>
        <Link
          to="/profile"
          className="grid h-9 w-9 shrink-0 place-items-center rounded-full border border-border text-muted-foreground"
          aria-label="Profile"
        >
          <UserRound className="h-4 w-4" strokeWidth={1.5} />
        </Link>
      </header>

      <main className="pb-28 lg:pb-16 lg:pl-60">
        <div className="mx-auto w-full max-w-5xl px-5 py-8 sm:px-8 lg:py-14">{children}</div>
      </main>

      {/* Mobile tab bar */}
      <nav className="safe-bottom fixed inset-x-0 bottom-0 z-30 border-t border-border bg-background/90 px-2 pt-2 backdrop-blur-xl lg:hidden">
        <ul className="flex items-stretch justify-between">
          {NAV.map((item) => (
            <li key={item.to} className="min-w-0 flex-1">
              <Link
                to={item.to}
                className={cn(
                  "flex flex-col items-center gap-1 rounded-lg px-1 py-1.5 text-[10px] text-muted-foreground transition-colors",
                  "data-[status=active]:text-foreground",
                )}
              >
                <item.icon className="h-[18px] w-[18px]" strokeWidth={1.5} />
                <span className="truncate">{item.label}</span>
              </Link>
            </li>
          ))}
        </ul>
      </nav>
    </div>
  );
}

export function PageHeader({
  eyebrow,
  title,
  description,
  action,
}: {
  eyebrow?: string;
  title: string;
  description?: string;
  action?: ReactNode;
}) {
  return (
    <header className="rise mb-8 grid grid-cols-[minmax(0,1fr)_auto] items-end gap-4 sm:flex sm:flex-wrap sm:justify-between">
      <div className="min-w-0">
        {eyebrow ? <span className="eyebrow">{eyebrow}</span> : null}
        <h1 className="mt-2 text-3xl sm:text-4xl">{title}</h1>
        {description ? (
          <p className="mt-2 max-w-xl text-sm text-muted-foreground">{description}</p>
        ) : null}
      </div>
      {action}
    </header>
  );
}
