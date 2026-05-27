import React from "react";
import { Link, useLocation } from "wouter";
import { useAuth } from "@/contexts/auth";
import { Button } from "@/components/ui/button";
import { useListMechanicsMap } from "@workspace/api-client-react";
import {
  LayoutDashboard,
  Briefcase,
  MessageSquare,
  LogOut,
  PlusCircle,
  Search,
  ChevronRight,
  Wrench,
  Gavel,
  BadgeCheck,
  ShieldCheck,
  Settings,
  MapPin,
} from "lucide-react";
import { cn } from "@/lib/utils";
import { UserAvatar } from "@/components/user-avatar";

interface NavItem {
  label: string;
  href: string;
  icon: React.ReactNode;
}

function getNavItems(role: "customer" | "mechanic"): NavItem[] {
  if (role === "customer") {
    return [
      { label: "Dashboard", href: "/customer/dashboard", icon: <LayoutDashboard size={16} /> },
      { label: "My Jobs", href: "/customer/jobs", icon: <Briefcase size={16} /> },
      { label: "Post a Job", href: "/customer/jobs/new", icon: <PlusCircle size={16} /> },
      { label: "Find Mechanics", href: "/mechanics-map", icon: <MapPin size={16} /> },
      { label: "Messages", href: "/messages", icon: <MessageSquare size={16} /> },
      { label: "Settings", href: "/settings", icon: <Settings size={16} /> },
    ];
  }
  return [
    { label: "Dashboard", href: "/mechanic/dashboard", icon: <LayoutDashboard size={16} /> },
    { label: "Browse Jobs", href: "/mechanic/jobs", icon: <Search size={16} /> },
    { label: "My Bids", href: "/mechanic/bids", icon: <Gavel size={16} /> },
    { label: "Messages", href: "/messages", icon: <MessageSquare size={16} /> },
    { label: "Verification", href: "/mechanic/verification", icon: <BadgeCheck size={16} /> },
    { label: "Settings", href: "/settings", icon: <Settings size={16} /> },
  ];
}

export function AppLayout({ children }: { children: React.ReactNode }) {
  const { user, logout } = useAuth();
  const [location] = useLocation();
  const { data: mapMechanics = [] } = useListMechanicsMap();
  const mapCount = mapMechanics.length;

  if (!user) return null;

  const navItems = getNavItems(user.role);

  return (
    <div className="flex min-h-screen bg-background">
      {/* Sidebar */}
      <aside className="hidden md:flex flex-col w-60 border-r border-border bg-sidebar shrink-0">
        {/* Logo */}
        <div className="flex items-center gap-2 px-5 py-5 border-b border-border">
          <Wrench size={20} className="text-primary" />
          <span className="font-bold text-lg tracking-tight text-foreground">BidWrenx</span>
        </div>

        {/* Role badge */}
        <div className="px-4 pt-4 pb-2">
          <span className={cn(
            "inline-flex items-center px-2 py-0.5 rounded text-xs font-medium",
            user.role === "customer"
              ? "bg-blue-500/10 text-blue-400 border border-blue-500/20"
              : "bg-emerald-500/10 text-emerald-400 border border-emerald-500/20"
          )}>
            {user.role === "customer" ? "Customer" : "Mechanic"}
          </span>
        </div>

        {/* Nav */}
        <nav className="flex-1 px-3 py-2 space-y-0.5">
          {navItems.map((item) => (
            <Link key={item.href} href={item.href}>
              <div
                data-testid={`nav-${item.label.toLowerCase().replace(/\s+/g, "-")}`}
                className={cn(
                  "flex items-center gap-3 px-3 py-2 rounded-md text-sm font-medium transition-colors cursor-pointer",
                  location === item.href || location.startsWith(item.href + "/")
                    ? "bg-primary/10 text-primary"
                    : "text-sidebar-foreground hover:bg-sidebar-accent hover:text-foreground"
                )}
              >
                {item.icon}
                {item.label}
                {item.href === "/mechanics-map" && mapCount > 0 && (
                  <span className="ml-auto text-[10px] font-bold px-1.5 py-0.5 rounded-full bg-primary/20 text-primary min-w-[18px] text-center">
                    {mapCount}
                  </span>
                )}
              </div>
            </Link>
          ))}
        </nav>

        {/* Admin link */}
        {user.isAdmin && (
          <div className="px-3 pb-2">
            <Link href="/admin">
              <div className={cn(
                "flex items-center gap-3 px-3 py-2 rounded-md text-sm font-medium transition-colors cursor-pointer",
                location.startsWith("/admin")
                  ? "bg-amber-500/15 text-amber-400"
                  : "text-amber-500/70 hover:bg-amber-500/10 hover:text-amber-400"
              )}>
                <ShieldCheck size={16} />
                Admin Panel
              </div>
            </Link>
          </div>
        )}

        {/* User & logout */}
        <div className="p-4 border-t border-border">
          <div className="flex items-center gap-3 mb-3">
            <UserAvatar name={user.name} photoUrl={user.photoUrl} size="sm" />
            <div className="flex-1 min-w-0">
              <p className="text-sm font-medium text-foreground truncate flex items-center gap-1">
                {user.name}
                {user.adminVerifiedMechanic && <BadgeCheck size={12} className="text-emerald-400 shrink-0" />}
              </p>
              <p className="text-xs text-muted-foreground truncate">{user.email}</p>
            </div>
          </div>
          <Button
            variant="ghost"
            size="sm"
            className="w-full justify-start text-muted-foreground hover:text-foreground"
            onClick={logout}
            data-testid="button-logout"
          >
            <LogOut size={14} className="mr-2" />
            Sign out
          </Button>
        </div>
      </aside>

      {/* Main content */}
      <main className="flex-1 flex flex-col min-w-0">
        {/* Mobile header */}
        <header className="md:hidden flex items-center justify-between px-4 py-3 border-b border-border bg-sidebar">
          <div className="flex items-center gap-2">
            <Wrench size={18} className="text-primary" />
            <span className="font-bold text-foreground">BidWrenx</span>
          </div>
          <div className="flex items-center gap-1">
            {navItems.map((item) => (
              <Link key={item.href} href={item.href}>
                <div className={cn(
                  "p-2 rounded-md",
                  location === item.href ? "text-primary" : "text-muted-foreground"
                )}>
                  {item.icon}
                </div>
              </Link>
            ))}
            <button onClick={logout} className="p-2 text-muted-foreground">
              <LogOut size={16} />
            </button>
          </div>
        </header>
        <div className="flex-1 p-4 md:p-8">
          {children}
        </div>
      </main>
    </div>
  );
}

export function PageHeader({
  title,
  subtitle,
  action,
}: {
  title: string;
  subtitle?: string;
  action?: React.ReactNode;
}) {
  return (
    <div className="flex items-start justify-between mb-8">
      <div>
        <h1 className="text-2xl font-bold text-foreground">{title}</h1>
        {subtitle && <p className="text-muted-foreground mt-1 text-sm">{subtitle}</p>}
      </div>
      {action}
    </div>
  );
}

export function StatCard({
  label,
  value,
  sub,
  color = "blue",
}: {
  label: string;
  value: number | string;
  sub?: string;
  color?: "blue" | "green" | "yellow" | "red" | "purple";
}) {
  const colors = {
    blue: "border-blue-500/20 bg-blue-500/5",
    green: "border-emerald-500/20 bg-emerald-500/5",
    yellow: "border-amber-500/20 bg-amber-500/5",
    red: "border-red-500/20 bg-red-500/5",
    purple: "border-purple-500/20 bg-purple-500/5",
  };
  const textColors = {
    blue: "text-blue-400",
    green: "text-emerald-400",
    yellow: "text-amber-400",
    red: "text-red-400",
    purple: "text-purple-400",
  };
  return (
    <div className={cn("rounded-lg border p-5", colors[color])}>
      <p className="text-xs text-muted-foreground font-medium uppercase tracking-wide">{label}</p>
      <p className={cn("text-3xl font-bold mt-1", textColors[color])}>{value}</p>
      {sub && <p className="text-xs text-muted-foreground mt-1">{sub}</p>}
    </div>
  );
}

export function StatusBadge({ status }: { status: string }) {
  const styles: Record<string, string> = {
    open: "bg-emerald-500/10 text-emerald-400 border-emerald-500/20",
    in_progress: "bg-blue-500/10 text-blue-400 border-blue-500/20",
    completed: "bg-gray-500/10 text-gray-400 border-gray-500/20",
    cancelled: "bg-red-500/10 text-red-400 border-red-500/20",
    pending: "bg-amber-500/10 text-amber-400 border-amber-500/20",
    accepted: "bg-emerald-500/10 text-emerald-400 border-emerald-500/20",
    rejected: "bg-red-500/10 text-red-400 border-red-500/20",
    withdrawn: "bg-gray-500/10 text-gray-400 border-gray-500/20",
  };
  const labels: Record<string, string> = {
    open: "Open",
    in_progress: "In Progress",
    completed: "Completed",
    cancelled: "Cancelled",
    pending: "Pending",
    accepted: "Accepted",
    rejected: "Rejected",
    withdrawn: "Withdrawn",
  };
  return (
    <span className={cn(
      "inline-flex items-center px-2 py-0.5 rounded text-xs font-medium border",
      styles[status] ?? "bg-gray-500/10 text-gray-400 border-gray-500/20"
    )}>
      {labels[status] ?? status}
    </span>
  );
}

export function EmptyState({ icon, title, description, action }: {
  icon?: React.ReactNode;
  title: string;
  description?: string;
  action?: React.ReactNode;
}) {
  return (
    <div className="flex flex-col items-center justify-center py-20 text-center">
      {icon && <div className="mb-4 text-muted-foreground opacity-40">{icon}</div>}
      <h3 className="text-lg font-semibold text-foreground">{title}</h3>
      {description && <p className="text-muted-foreground text-sm mt-1 max-w-sm">{description}</p>}
      {action && <div className="mt-5">{action}</div>}
    </div>
  );
}

export function ProtectedRoute({ children, role }: { children: React.ReactNode; role?: "customer" | "mechanic" }) {
  const { isAuthenticated, user } = useAuth();
  const [, setLocation] = useLocation();

  React.useEffect(() => {
    if (!isAuthenticated) {
      setLocation("/login");
    } else if (role && user?.role !== role) {
      setLocation(user?.role === "customer" ? "/customer/dashboard" : "/mechanic/dashboard");
    }
  }, [isAuthenticated, user, role, setLocation]);

  if (!isAuthenticated) return null;
  if (role && user?.role !== role) return null;
  return <>{children}</>;
}

export function BreadcrumbNav({ items }: { items: { label: string; href?: string }[] }) {
  return (
    <nav className="flex items-center gap-1 text-sm text-muted-foreground mb-6">
      {items.map((item, i) => (
        <React.Fragment key={i}>
          {i > 0 && <ChevronRight size={14} className="opacity-50" />}
          {item.href ? (
            <Link href={item.href}>
              <span className="hover:text-foreground transition-colors cursor-pointer">{item.label}</span>
            </Link>
          ) : (
            <span className="text-foreground font-medium">{item.label}</span>
          )}
        </React.Fragment>
      ))}
    </nav>
  );
}
