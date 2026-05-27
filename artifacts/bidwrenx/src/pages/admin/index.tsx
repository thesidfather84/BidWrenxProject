import { useState, useEffect } from "react";
import { useLocation } from "wouter";
import {
  useGetAdminStats,
  useListAdminUsers,
  useListAdminJobs,
  useListAdminReports,
  useSuspendUser,
  useVerifyMechanic,
  useFlagUserAdmin,
  useRemoveJob,
  useReviewReport,
  useAdminReviewMechanicVerification,
  getGetAdminStatsQueryKey,
  getListAdminUsersQueryKey,
  getListAdminJobsQueryKey,
  getListAdminReportsQueryKey,
} from "@workspace/api-client-react";
import { useQueryClient, useQuery } from "@tanstack/react-query";
import { useAuth } from "@/contexts/auth";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Skeleton } from "@/components/ui/skeleton";
import { Textarea } from "@/components/ui/textarea";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from "@/components/ui/dialog";
import { useToast } from "@/hooks/use-toast";
import { StatusBadge } from "@/components/layout";
import { UserAvatar } from "@/components/user-avatar";
import { VerificationBadges } from "@/components/verification-badges";
import { cn } from "@/lib/utils";
import {
  Wrench, Users, Briefcase, Flag, BarChart3, LogOut, Search,
  ShieldCheck, ShieldOff, CheckCircle2, XCircle, AlertTriangle,
  Gavel, Trash2, Eye, Star, RefreshCw, Shield, BadgeCheck,
  FileText, Clock, Ban, Network, Globe, Link2, ScrollText, Map,
} from "lucide-react";

// ── admin fetch helper ────────────────────────────────────────────────────────
async function adminFetch(method: string, path: string, body?: object) {
  const token = localStorage.getItem("bidwrenx_token") ?? "";
  const res = await fetch(`/api${path}`, {
    method,
    headers: { "Content-Type": "application/json", Authorization: `Bearer ${token}` },
    ...(body != null ? { body: JSON.stringify(body) } : {}),
  });
  if (!res.ok) {
    const err = await res.json().catch(() => ({}));
    throw new Error((err as any).error ?? "Request failed");
  }
  return res.json();
}

// ── stat card ────────────────────────────────────────────────────────────────
function StatCard({ label, value, icon: Icon, color }: {
  label: string; value: number | string; icon: any; color: string;
}) {
  return (
    <div className="rounded-xl border border-border bg-card p-5 flex items-center gap-4">
      <div className={cn("w-10 h-10 rounded-lg flex items-center justify-center shrink-0", color)}>
        <Icon size={18} />
      </div>
      <div>
        <p className="text-2xl font-bold leading-none mb-1">{value}</p>
        <p className="text-xs text-muted-foreground">{label}</p>
      </div>
    </div>
  );
}

// ── User detail dialog ────────────────────────────────────────────────────────
type DetailTab = "overview" | "notes" | "reports" | "ip";

function UserDetailDialog({ user, onClose, onRefresh }: {
  user: any | null;
  onClose: () => void;
  onRefresh: () => void;
}) {
  const [tab, setTab] = useState<DetailTab>("overview");
  const [notes, setNotes] = useState("");
  const [savingNotes, setSavingNotes] = useState(false);
  const [banning, setBanning] = useState(false);
  const [deleting, setDeleting] = useState(false);
  const [confirmDelete, setConfirmDelete] = useState(false);
  const [togglingMapVisible, setTogglingMapVisible] = useState(false);
  const { toast } = useToast();

  useEffect(() => {
    if (user) {
      setNotes(user.adminNotes ?? "");
      setTab("overview");
      setConfirmDelete(false);
    }
  }, [user?.id]);

  const { data: reports, isLoading: reportsLoading } = useQuery({
    queryKey: ["admin-user-reports", user?.id],
    queryFn: () => adminFetch("GET", `/admin/users/${user!.id}/reports`),
    enabled: !!user && tab === "reports",
  });

  const { data: ipHistory, isLoading: ipLoading } = useQuery({
    queryKey: ["admin-user-ip", user?.id],
    queryFn: () => adminFetch("GET", `/admin/users/${user!.id}/ip-history`),
    enabled: !!user && tab === "ip",
  });

  const handleSaveNotes = async () => {
    setSavingNotes(true);
    try {
      await adminFetch("PATCH", `/admin/users/${user!.id}/notes`, { notes });
      toast({ title: "Notes saved" });
      onRefresh();
    } catch (e: any) {
      toast({ title: e.message ?? "Failed", variant: "destructive" });
    } finally { setSavingNotes(false); }
  };

  const handleBan = async () => {
    setBanning(true);
    try {
      await adminFetch("PATCH", `/admin/users/${user!.id}/ban`, { banned: !user!.banned });
      toast({ title: user!.banned ? `${user!.name} unbanned` : `${user!.name} banned` });
      onRefresh();
      onClose();
    } catch (e: any) {
      toast({ title: e.message ?? "Failed", variant: "destructive" });
    } finally { setBanning(false); }
  };

  const handleDelete = async () => {
    if (!confirmDelete) { setConfirmDelete(true); return; }
    setDeleting(true);
    try {
      await adminFetch("DELETE", `/admin/users/${user!.id}`);
      toast({ title: `${user!.name} deleted` });
      onRefresh();
      onClose();
    } catch (e: any) {
      toast({ title: e.message ?? "Failed", variant: "destructive" });
      setConfirmDelete(false);
    } finally { setDeleting(false); }
  };

  const handleToggleMapVisible = async () => {
    setTogglingMapVisible(true);
    try {
      await adminFetch("PATCH", `/admin/users/${user!.id}/map-visible`, { mapVisible: !user!.mapVisible });
      toast({ title: user!.mapVisible ? `${user!.name} hidden from map` : `${user!.name} visible on map` });
      onRefresh();
    } catch (e: any) {
      toast({ title: e.message ?? "Failed", variant: "destructive" });
    } finally { setTogglingMapVisible(false); }
  };

  if (!user) return null;

  const DETAIL_TABS: { key: DetailTab; label: string }[] = [
    { key: "overview", label: "Overview" },
    { key: "notes", label: "Admin Notes" },
    { key: "reports", label: "Reports" },
    { key: "ip", label: "IP History" },
  ];

  return (
    <Dialog open={!!user} onOpenChange={(o) => { if (!o) onClose(); }}>
      <DialogContent className="sm:max-w-2xl max-h-[85vh] flex flex-col gap-0 p-0">
        <DialogHeader className="px-6 pt-6 pb-0">
          <DialogTitle className="flex items-center gap-2">
            <UserAvatar name={user.name} photoUrl={user.photoUrl} size="sm" />
            <span>{user.name}</span>
            {user.banned && (
              <span className="text-xs bg-red-700/20 text-red-300 px-2 py-0.5 rounded-full border border-red-700/30">Banned</span>
            )}
            {user.suspended && !user.banned && (
              <span className="text-xs bg-orange-500/10 text-orange-400 px-2 py-0.5 rounded-full border border-orange-500/20">Suspended</span>
            )}
          </DialogTitle>
        </DialogHeader>

        <div className="flex gap-0 border-b border-border px-6 mt-4">
          {DETAIL_TABS.map(({ key, label }) => (
            <button
              key={key}
              onClick={() => setTab(key)}
              className={cn(
                "px-3 py-2.5 text-sm font-medium border-b-2 -mb-px transition-colors",
                tab === key ? "border-primary text-primary" : "border-transparent text-muted-foreground hover:text-foreground"
              )}
            >
              {label}
            </button>
          ))}
        </div>

        <div className="overflow-y-auto flex-1 p-6 space-y-4">
          {tab === "overview" && (
            <div className="space-y-4">
              <div className="grid grid-cols-2 gap-x-8 gap-y-3 text-sm">
                <div><p className="text-xs text-muted-foreground mb-0.5">Legal name</p><p className="font-medium">{user.name}{user.legalName && user.legalName !== user.name ? <span className="text-muted-foreground font-normal"> ({user.legalName})</span> : null}</p></div>
                <div><p className="text-xs text-muted-foreground mb-0.5">Public name</p><p className="font-medium">{user.displayName ?? user.username ?? <span className="text-muted-foreground italic">uses account name</span>}</p></div>
                <div><p className="text-xs text-muted-foreground mb-0.5">Email</p><p className="font-medium">{user.email}</p></div>
                <div><p className="text-xs text-muted-foreground mb-0.5">Role</p><p className="font-medium capitalize">{user.role}</p></div>
                <div><p className="text-xs text-muted-foreground mb-0.5">Joined</p><p className="font-medium">{new Date(user.createdAt).toLocaleDateString()}</p></div>
                <div><p className="text-xs text-muted-foreground mb-0.5">Referral code</p><p className="font-mono text-xs">{user.referralCode ?? "—"}</p></div>
                <div><p className="text-xs text-muted-foreground mb-0.5">Sign-up IP</p><p className="font-mono text-xs">{user.signupIp ?? "—"}</p></div>
                <div><p className="text-xs text-muted-foreground mb-0.5">Last login IP</p><p className="font-mono text-xs">{user.lastLoginIp ?? "—"}</p></div>
                {user.referredBy && (
                  <div><p className="text-xs text-muted-foreground mb-0.5">Referred by code</p><p className="font-mono text-xs">{user.referredBy}</p></div>
                )}
                {user.username && (
                  <div><p className="text-xs text-muted-foreground mb-0.5">Username</p><p className="font-mono text-xs">@{user.username}</p></div>
                )}
                {user.specialties && (
                  <div className="col-span-2"><p className="text-xs text-muted-foreground mb-0.5">Specialties</p><p className="text-sm">{user.specialties}</p></div>
                )}
              </div>

              {user.adminNotes && (
                <div className="p-3 rounded-lg bg-amber-500/5 border border-amber-500/20">
                  <p className="text-xs font-semibold text-amber-400 mb-1">Admin Notes</p>
                  <p className="text-sm text-muted-foreground whitespace-pre-wrap">{user.adminNotes}</p>
                </div>
              )}

              <div className="pt-3 border-t border-border flex items-center gap-2 flex-wrap">
                <Button
                  size="sm"
                  variant="outline"
                  className={cn("gap-1.5", user.banned
                    ? "text-emerald-400 border-emerald-500/30 hover:bg-emerald-500/10"
                    : "text-red-400 border-red-500/30 hover:bg-red-500/10"
                  )}
                  onClick={handleBan}
                  disabled={banning}
                >
                  <Ban size={13} />
                  {banning ? "…" : user.banned ? "Unban user" : "Ban user"}
                </Button>

                {user.role === "mechanic" && (
                  <Button
                    size="sm"
                    variant="outline"
                    className={cn("gap-1.5", user.mapVisible
                      ? "text-amber-400 border-amber-500/30 hover:bg-amber-500/10"
                      : "text-emerald-400 border-emerald-500/30 hover:bg-emerald-500/10"
                    )}
                    onClick={handleToggleMapVisible}
                    disabled={togglingMapVisible}
                  >
                    <Map size={13} />
                    {togglingMapVisible ? "…" : user.mapVisible ? "Hide from map" : "Show on map"}
                  </Button>
                )}

                {!confirmDelete ? (
                  <Button size="sm" variant="outline" className="gap-1.5 text-red-500 border-red-700/30 hover:bg-red-500/10" onClick={handleDelete}>
                    <Trash2 size={13} /> Delete account
                  </Button>
                ) : (
                  <div className="flex items-center gap-2">
                    <p className="text-xs text-red-400 font-medium">Permanently delete {user.name}?</p>
                    <Button size="sm" variant="destructive" onClick={handleDelete} disabled={deleting}>
                      {deleting ? "Deleting…" : "Yes, delete"}
                    </Button>
                    <Button size="sm" variant="ghost" onClick={() => setConfirmDelete(false)}>Cancel</Button>
                  </div>
                )}
              </div>
            </div>
          )}

          {tab === "notes" && (
            <div className="space-y-3">
              <p className="text-sm text-muted-foreground">Private admin notes — not visible to the user.</p>
              <Textarea
                rows={7}
                placeholder="e.g. Contacted about issue #42. Watching for further reports. Identity verified via email thread."
                value={notes}
                onChange={(e) => setNotes(e.target.value)}
              />
              <Button
                size="sm"
                onClick={handleSaveNotes}
                disabled={savingNotes || notes === (user.adminNotes ?? "")}
              >
                {savingNotes ? "Saving…" : "Save notes"}
              </Button>
            </div>
          )}

          {tab === "reports" && (
            <div>
              {reportsLoading ? (
                <div className="space-y-2">{[...Array(3)].map((_, i) => <Skeleton key={i} className="h-14 rounded-lg" />)}</div>
              ) : !reports?.length ? (
                <p className="text-center text-muted-foreground py-8 text-sm">No reports involving this user.</p>
              ) : (
                <div className="space-y-2">
                  {reports.map((r: any) => (
                    <div key={r.id} className={cn("rounded-lg border p-3", r.isAboutUser ? "border-red-500/20 bg-red-500/5" : "border-border bg-card")}>
                      <div className="flex items-center gap-2 mb-1">
                        <span className={cn("text-xs px-1.5 py-0.5 rounded font-medium capitalize", r.isAboutUser ? "bg-red-500/20 text-red-400" : "bg-blue-500/10 text-blue-400")}>
                          {r.isAboutUser ? "Reported" : "Reporter"}
                        </span>
                        <span className="text-xs px-1.5 py-0.5 rounded bg-muted text-muted-foreground capitalize">{r.reason}</span>
                        {r.reviewed && <span className="text-xs px-1.5 py-0.5 rounded bg-emerald-500/10 text-emerald-400">Reviewed</span>}
                        <span className="ml-auto text-xs text-muted-foreground">{new Date(r.createdAt).toLocaleDateString()}</span>
                      </div>
                      <p className="text-xs text-muted-foreground">
                        {r.isAboutUser
                          ? <span>Reported by <strong className="text-foreground">{r.reporterName}</strong></span>
                          : <span>Reported <strong className="text-foreground">{r.reportedUserName}</strong></span>}
                      </p>
                      {r.details && <p className="text-xs text-muted-foreground mt-1">{r.details}</p>}
                      {r.resolution && <p className="text-xs text-emerald-400 mt-1">Resolution: {r.resolution}</p>}
                    </div>
                  ))}
                </div>
              )}
            </div>
          )}

          {tab === "ip" && (
            <div>
              {ipLoading ? (
                <div className="space-y-2">{[...Array(5)].map((_, i) => <Skeleton key={i} className="h-10 rounded-lg" />)}</div>
              ) : !ipHistory?.length ? (
                <p className="text-center text-muted-foreground py-8 text-sm">No login history found for this user.</p>
              ) : (
                <div className="rounded-xl border border-border overflow-hidden">
                  <table className="w-full text-sm">
                    <thead>
                      <tr className="border-b border-border bg-muted/30">
                        <th className="text-left px-3 py-2 text-xs font-semibold text-muted-foreground uppercase tracking-wide">IP Address</th>
                        <th className="text-left px-3 py-2 text-xs font-semibold text-muted-foreground uppercase tracking-wide">Action</th>
                        <th className="text-left px-3 py-2 text-xs font-semibold text-muted-foreground uppercase tracking-wide">When</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-border">
                      {ipHistory.map((h: any) => (
                        <tr key={h.id} className="hover:bg-muted/10">
                          <td className="px-3 py-2 font-mono text-xs">{h.ip}</td>
                          <td className="px-3 py-2 text-xs text-muted-foreground capitalize">{h.action.replace(/_/g, " ")}</td>
                          <td className="px-3 py-2 text-xs text-muted-foreground">{new Date(h.createdAt).toLocaleString()}</td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              )}
            </div>
          )}
        </div>
      </DialogContent>
    </Dialog>
  );
}

// ── Users tab ────────────────────────────────────────────────────────────────
function UsersTab() {
  const [search, setSearch] = useState("");
  const [roleFilter, setRoleFilter] = useState<"" | "customer" | "mechanic">("");
  const [selectedUser, setSelectedUser] = useState<any | null>(null);
  const { toast } = useToast();
  const queryClient = useQueryClient();

  const { data: users, isLoading } = useListAdminUsers(
    { role: roleFilter || undefined, search: search || undefined },
    { query: { queryKey: getListAdminUsersQueryKey({ role: roleFilter || undefined, search: search || undefined }) } }
  );

  const suspend = useSuspendUser();
  const verify = useVerifyMechanic();
  const flag = useFlagUserAdmin();

  const invalidate = () => {
    queryClient.invalidateQueries({ queryKey: getListAdminUsersQueryKey() });
    queryClient.invalidateQueries({ queryKey: getGetAdminStatsQueryKey() });
  };

  const handleSuspend = (id: number, name: string, suspended: boolean) => {
    suspend.mutate({ id, data: { suspended } }, {
      onSuccess: () => { invalidate(); toast({ title: suspended ? `${name} suspended` : `${name} unsuspended` }); },
      onError: () => toast({ title: "Action failed", variant: "destructive" }),
    });
  };

  const handleVerify = (id: number, name: string, verified: boolean) => {
    verify.mutate({ id, data: { verified } }, {
      onSuccess: () => { invalidate(); toast({ title: verified ? `${name} verified ✓` : `${name} unverified` }); },
      onError: () => toast({ title: "Action failed", variant: "destructive" }),
    });
  };

  const handleFlag = (id: number, name: string, flaggedForReview: boolean) => {
    flag.mutate({ id, data: { flaggedForReview } }, {
      onSuccess: () => { invalidate(); toast({ title: flaggedForReview ? `${name} flagged for review` : `${name} unflagged` }); },
      onError: () => toast({ title: "Action failed", variant: "destructive" }),
    });
  };

  return (
    <div>
      <div className="flex gap-3 mb-5">
        <div className="relative flex-1 max-w-xs">
          <Search size={14} className="absolute left-3 top-1/2 -translate-y-1/2 text-muted-foreground" />
          <Input
            className="pl-9"
            placeholder="Search name or email..."
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            data-testid="input-user-search"
          />
        </div>
        <div className="flex rounded-lg border border-border overflow-hidden text-sm">
          {(["", "customer", "mechanic"] as const).map((r) => (
            <button
              key={r}
              onClick={() => setRoleFilter(r)}
              className={cn(
                "px-3 py-1.5 transition-colors",
                roleFilter === r ? "bg-primary text-primary-foreground" : "text-muted-foreground hover:bg-muted"
              )}
            >
              {r === "" ? "All" : r === "customer" ? "Customers" : "Mechanics"}
            </button>
          ))}
        </div>
      </div>

      {isLoading ? (
        <div className="space-y-2">{[...Array(5)].map((_, i) => <Skeleton key={i} className="h-14 rounded-lg" />)}</div>
      ) : !users?.length ? (
        <p className="text-center text-muted-foreground py-12 text-sm">No users found.</p>
      ) : (
        <div className="rounded-xl border border-border overflow-hidden">
          <table className="w-full text-sm">
            <thead>
              <tr className="border-b border-border bg-muted/30">
                <th className="text-left px-4 py-3 text-xs font-semibold text-muted-foreground uppercase tracking-wide">User</th>
                <th className="text-left px-4 py-3 text-xs font-semibold text-muted-foreground uppercase tracking-wide">Legal / Public Name</th>
                <th className="text-left px-4 py-3 text-xs font-semibold text-muted-foreground uppercase tracking-wide">Role</th>
                <th className="text-left px-4 py-3 text-xs font-semibold text-muted-foreground uppercase tracking-wide">Rating</th>
                <th className="text-left px-4 py-3 text-xs font-semibold text-muted-foreground uppercase tracking-wide">Warns</th>
                <th className="text-left px-4 py-3 text-xs font-semibold text-muted-foreground uppercase tracking-wide">Status</th>
                <th className="text-right px-4 py-3 text-xs font-semibold text-muted-foreground uppercase tracking-wide">Actions</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-border">
              {users.map((u) => (
                <tr key={u.id} data-testid={`row-user-${u.id}`} className="hover:bg-muted/10 transition-colors">
                  <td className="px-4 py-3">
                    <div className="flex items-center gap-2.5">
                      <UserAvatar name={u.name} photoUrl={u.photoUrl} size="sm" />
                      <div>
                        <p className="font-medium flex items-center gap-1.5">
                          {u.name}
                          {u.adminVerifiedMechanic && <BadgeCheck size={12} className="text-emerald-400" />}
                          {u.verified && !u.adminVerifiedMechanic && <CheckCircle2 size={12} className="text-blue-400" />}
                          {u.flaggedForReview && <AlertTriangle size={12} className="text-amber-400" />}
                        </p>
                        <p className="text-xs text-muted-foreground">{u.email}</p>
                      </div>
                    </div>
                  </td>
                  <td className="px-4 py-3 max-w-[160px]">
                    <p className="text-xs text-muted-foreground truncate" title={u.legalName ?? u.name}>
                      {u.legalName ?? u.name}
                    </p>
                    {(u.displayName || u.username) && (
                      <p className="text-xs text-primary truncate" title={u.displayName ?? `@${u.username}`}>
                        {u.displayName ?? `@${u.username}`}
                      </p>
                    )}
                    {!u.displayName && !u.username && (
                      <p className="text-xs text-muted-foreground/50 italic">no alias</p>
                    )}
                  </td>
                  <td className="px-4 py-3">
                    <span className={cn(
                      "text-xs px-2 py-0.5 rounded-full font-medium",
                      u.role === "mechanic" ? "bg-blue-500/10 text-blue-400" : "bg-emerald-500/10 text-emerald-400"
                    )}>
                      {u.role}
                    </span>
                  </td>
                  <td className="px-4 py-3">
                    {u.rating != null ? (
                      <span className="flex items-center gap-1 text-amber-400 text-xs font-medium">
                        <Star size={11} fill="currentColor" />
                        {u.rating.toFixed(1)}
                        <span className="text-muted-foreground font-normal">({u.reviewCount})</span>
                      </span>
                    ) : (
                      <span className="text-muted-foreground text-xs">—</span>
                    )}
                  </td>
                  <td className="px-4 py-3">
                    <span className={cn("text-xs font-medium", u.warningCount > 0 ? "text-amber-400" : "text-muted-foreground")}>
                      {u.warningCount}
                    </span>
                  </td>
                  <td className="px-4 py-3">
                    {(u as any).banned ? (
                      <span className="text-xs bg-red-700/20 text-red-300 px-2 py-0.5 rounded-full font-medium border border-red-700/30">Banned</span>
                    ) : u.suspended ? (
                      <span className="text-xs bg-red-500/10 text-red-400 px-2 py-0.5 rounded-full font-medium">Suspended</span>
                    ) : (
                      <span className="text-xs bg-emerald-500/10 text-emerald-400 px-2 py-0.5 rounded-full font-medium">Active</span>
                    )}
                  </td>
                  <td className="px-4 py-3">
                    <div className="flex items-center justify-end gap-1.5 flex-wrap">
                      <Button
                        size="sm"
                        variant="outline"
                        className="h-7 px-2 text-xs gap-1"
                        onClick={() => setSelectedUser(u)}
                        data-testid={`button-details-${u.id}`}
                      >
                        <Eye size={12} />
                        Details
                      </Button>
                      {u.role === "mechanic" && (
                        <Button
                          size="sm"
                          variant={u.verified ? "outline" : "outline"}
                          className={cn("h-7 px-2 text-xs gap-1", u.verified ? "text-blue-400 border-blue-500/30" : "")}
                          onClick={() => handleVerify(u.id, u.name, !u.verified)}
                          data-testid={`button-verify-${u.id}`}
                        >
                          <ShieldCheck size={12} />
                          {u.verified ? "Unverify" : "Verify"}
                        </Button>
                      )}
                      <Button
                        size="sm"
                        variant="outline"
                        className={cn("h-7 px-2 text-xs gap-1", u.flaggedForReview ? "text-amber-400 border-amber-500/30" : "")}
                        onClick={() => handleFlag(u.id, u.name, !u.flaggedForReview)}
                        data-testid={`button-flag-${u.id}`}
                      >
                        <Flag size={12} />
                        {u.flaggedForReview ? "Unflag" : "Flag"}
                      </Button>
                      <Button
                        size="sm"
                        variant="outline"
                        className={cn("h-7 px-2 text-xs gap-1", u.suspended ? "text-emerald-400 border-emerald-500/30" : "text-red-400 border-red-500/30")}
                        onClick={() => handleSuspend(u.id, u.name, !u.suspended)}
                        data-testid={`button-suspend-${u.id}`}
                      >
                        {u.suspended ? <ShieldOff size={12} /> : <XCircle size={12} />}
                        {u.suspended ? "Unsuspend" : "Suspend"}
                      </Button>
                    </div>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}

      <UserDetailDialog
        user={selectedUser}
        onClose={() => setSelectedUser(null)}
        onRefresh={invalidate}
      />
    </div>
  );
}

// ── Verification tab ──────────────────────────────────────────────────────────
function VerificationTab() {
  const { toast } = useToast();
  const queryClient = useQueryClient();
  const [filter, setFilter] = useState<"pending" | "approved" | "rejected" | "all">("pending");
  const [reviewingUser, setReviewingUser] = useState<any | null>(null);
  const [notes, setNotes] = useState("");
  const [decision, setDecision] = useState<"approved" | "rejected" | "pending">("approved");

  const { data: users, isLoading } = useListAdminUsers(
    { role: "mechanic" },
    { query: { queryKey: getListAdminUsersQueryKey({ role: "mechanic" }) } }
  );

  const reviewVerification = useAdminReviewMechanicVerification();

  const filtered = users?.filter((u) => {
    if (filter === "all") return true;
    return u.identityVerificationStatus === filter;
  }) ?? [];

  const pendingCount = users?.filter(u => u.identityVerificationStatus === "pending").length ?? 0;

  const handleReview = () => {
    if (!reviewingUser) return;
    reviewVerification.mutate({
      id: reviewingUser.id,
      data: {
        identityVerificationStatus: decision,
        adminVerifiedMechanic: decision === "approved",
        verificationNotes: notes.trim() || null,
      },
    }, {
      onSuccess: () => {
        queryClient.invalidateQueries({ queryKey: getListAdminUsersQueryKey() });
        queryClient.invalidateQueries({ queryKey: getGetAdminStatsQueryKey() });
        toast({ title: `${reviewingUser.name}: verification ${decision}` });
        setReviewingUser(null);
        setNotes("");
      },
      onError: () => toast({ title: "Action failed", variant: "destructive" }),
    });
  };

  const STATUS_COLORS: Record<string, string> = {
    none: "text-muted-foreground bg-muted",
    pending: "text-amber-400 bg-amber-500/10",
    approved: "text-emerald-400 bg-emerald-500/10",
    rejected: "text-red-400 bg-red-500/10",
  };

  return (
    <div>
      <div className="flex gap-1.5 mb-5 flex-wrap">
        {([
          { key: "pending", label: "Pending" },
          { key: "approved", label: "Approved" },
          { key: "rejected", label: "Rejected" },
          { key: "all", label: "All mechanics" },
        ] as const).map(({ key, label }) => (
          <button
            key={key}
            onClick={() => setFilter(key)}
            className={cn(
              "px-3 py-1.5 rounded-lg text-sm border transition-colors",
              filter === key
                ? "bg-primary border-primary text-primary-foreground"
                : "border-border text-muted-foreground hover:bg-muted"
            )}
          >
            {label}
            {key === "pending" && pendingCount > 0 && (
              <span className="ml-1.5 bg-amber-500 text-white text-xs px-1.5 py-0.5 rounded-full leading-none">
                {pendingCount}
              </span>
            )}
          </button>
        ))}
      </div>

      {isLoading ? (
        <div className="space-y-2">{[...Array(4)].map((_, i) => <Skeleton key={i} className="h-24 rounded-lg" />)}</div>
      ) : !filtered.length ? (
        <div className="text-center text-muted-foreground py-16">
          <BadgeCheck size={40} className="mx-auto mb-3 opacity-20" />
          <p className="text-sm">No mechanics in this category.</p>
        </div>
      ) : (
        <div className="space-y-3">
          {filtered.map((u) => (
            <div key={u.id} className="rounded-xl border border-border bg-card p-4">
              <div className="flex items-start gap-4">
                <UserAvatar name={u.name} photoUrl={u.photoUrl} size="md" />
                <div className="flex-1 min-w-0">
                  <div className="flex items-center gap-2 mb-1 flex-wrap">
                    <p className="font-semibold">{u.name}</p>
                    <span className={cn("text-xs px-2 py-0.5 rounded-full font-medium", STATUS_COLORS[u.identityVerificationStatus ?? "none"])}>
                      {u.identityVerificationStatus === "none" ? "Not requested" : u.identityVerificationStatus}
                    </span>
                    {u.adminVerifiedMechanic && (
                      <span className="text-xs px-2 py-0.5 rounded-full bg-emerald-500/10 text-emerald-400 font-medium flex items-center gap-1">
                        <BadgeCheck size={10} /> Verified profile
                      </span>
                    )}
                  </div>
                  <p className="text-xs text-muted-foreground mb-2">{u.email}</p>
                  <div className="flex items-center gap-4 text-xs text-muted-foreground mb-2">
                    <span className={cn("flex items-center gap-1", u.insuranceDocumentPath ? "text-emerald-400" : "")}>
                      <FileText size={11} />
                      Insurance {u.insuranceDocumentPath ? "✓" : "not uploaded"}
                    </span>
                    <span className={cn("flex items-center gap-1", u.certificationDocumentPath ? "text-emerald-400" : "")}>
                      <FileText size={11} />
                      Certification {u.certificationDocumentPath ? "✓" : "not uploaded"}
                    </span>
                    {u.verificationRequestedAt && (
                      <span className="flex items-center gap-1">
                        <Clock size={11} />
                        Requested {new Date(u.verificationRequestedAt).toLocaleDateString()}
                      </span>
                    )}
                  </div>
                  {u.verificationNotes && (
                    <p className="text-xs text-muted-foreground bg-muted/40 px-2 py-1.5 rounded">
                      <span className="text-foreground font-medium">Note: </span>{u.verificationNotes}
                    </p>
                  )}
                </div>
                <div className="shrink-0">
                  {u.identityVerificationStatus !== "none" && (
                    <Button
                      size="sm"
                      variant="outline"
                      className="h-7 px-2 text-xs gap-1"
                      onClick={() => {
                        setReviewingUser(u);
                        setDecision("approved");
                        setNotes(u.verificationNotes ?? "");
                      }}
                    >
                      <Eye size={12} />
                      Review
                    </Button>
                  )}
                </div>
              </div>
            </div>
          ))}
        </div>
      )}

      <Dialog open={!!reviewingUser} onOpenChange={(o) => { if (!o) setReviewingUser(null); }}>
        <DialogContent className="sm:max-w-md">
          <DialogHeader>
            <DialogTitle>Review Verification — {reviewingUser?.name}</DialogTitle>
          </DialogHeader>
          <div className="space-y-4">
            <div>
              <p className="text-sm font-medium mb-2">Decision</p>
              <div className="flex gap-2">
                {(["approved", "pending", "rejected"] as const).map((d) => (
                  <button
                    key={d}
                    onClick={() => setDecision(d)}
                    className={cn(
                      "flex-1 py-2 rounded-lg text-sm font-medium border transition-colors capitalize",
                      decision === d
                        ? d === "approved" ? "bg-emerald-500/20 border-emerald-500/50 text-emerald-400"
                          : d === "rejected" ? "bg-red-500/20 border-red-500/50 text-red-400"
                          : "bg-amber-500/20 border-amber-500/50 text-amber-400"
                        : "border-border text-muted-foreground hover:bg-muted"
                    )}
                  >
                    {d}
                  </button>
                ))}
              </div>
            </div>
            <div>
              <p className="text-sm font-medium mb-1.5">Note for mechanic <span className="text-muted-foreground font-normal">(optional)</span></p>
              <Textarea
                placeholder="e.g. Documents approved. or Certificate expired, please resubmit."
                rows={3}
                value={notes}
                onChange={(e) => setNotes(e.target.value)}
              />
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setReviewingUser(null)}>Cancel</Button>
            <Button
              onClick={handleReview}
              disabled={reviewVerification.isPending}
              className={cn(
                decision === "approved" ? "bg-emerald-600 hover:bg-emerald-700 text-white"
                  : decision === "rejected" ? "bg-red-600 hover:bg-red-700 text-white"
                  : ""
              )}
            >
              {reviewVerification.isPending ? "Saving…" : `Mark ${decision}`}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}

// ── Jobs tab ─────────────────────────────────────────────────────────────────
function JobPhotoManager({ job, onUpdated }: { job: any; onUpdated: () => void }) {
  const { toast } = useToast();
  const [removing, setRemoving] = useState<string | null>(null);
  const photos: string[] = job.photos ?? [];

  if (photos.length === 0) return <span className="text-xs text-muted-foreground">No photos</span>;

  const handleRemovePhoto = async (path: string) => {
    if (!confirm("Remove this photo?")) return;
    setRemoving(path);
    try {
      const token = localStorage.getItem("bidwrenx_token") ?? "";
      const res = await fetch(`/api/admin/jobs/${job.id}/photos`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json", Authorization: `Bearer ${token}` },
        body: JSON.stringify({ photos: photos.filter((p) => p !== path) }),
      });
      if (!res.ok) throw new Error("Failed");
      toast({ title: "Photo removed" });
      onUpdated();
    } catch {
      toast({ title: "Failed to remove photo", variant: "destructive" });
    } finally {
      setRemoving(null);
    }
  };

  return (
    <div className="flex flex-wrap gap-1.5 mt-1.5">
      {photos.map((path) => (
        <div key={path} className="relative group w-12 h-12 rounded overflow-hidden border border-border bg-muted/30 shrink-0">
          <img src={`/api/storage${path}`} alt="job photo" className="w-full h-full object-cover" />
          <button
            type="button"
            disabled={removing === path}
            onClick={() => handleRemovePhoto(path)}
            className="absolute inset-0 bg-background/70 opacity-0 group-hover:opacity-100 flex items-center justify-center transition-opacity"
            title="Remove photo"
          >
            <Trash2 size={12} className="text-red-400" />
          </button>
        </div>
      ))}
    </div>
  );
}

function JobsTab() {
  const [statusFilter, setStatusFilter] = useState<"" | "open" | "in_progress" | "completed" | "cancelled">("");
  const { toast } = useToast();
  const queryClient = useQueryClient();
  const { data: jobs, isLoading, refetch } = useListAdminJobs(
    { status: statusFilter || undefined },
    { query: { queryKey: getListAdminJobsQueryKey({ status: statusFilter || undefined }) } }
  );
  const removeJob = useRemoveJob();

  const handleRemove = (id: number, title: string) => {
    if (!confirm(`Cancel job "${title}"? This cannot be undone.`)) return;
    removeJob.mutate({ id }, {
      onSuccess: () => {
        queryClient.invalidateQueries({ queryKey: getListAdminJobsQueryKey() });
        queryClient.invalidateQueries({ queryKey: getGetAdminStatsQueryKey() });
        toast({ title: `Job "${title}" cancelled` });
      },
      onError: () => toast({ title: "Failed to cancel job", variant: "destructive" }),
    });
  };

  const STATUSES = ["", "open", "in_progress", "completed", "cancelled"] as const;

  return (
    <div>
      <div className="flex gap-1.5 mb-5 flex-wrap">
        {STATUSES.map((s) => (
          <button
            key={s}
            onClick={() => setStatusFilter(s)}
            className={cn(
              "px-3 py-1.5 rounded-lg text-sm transition-colors border",
              statusFilter === s
                ? "bg-primary border-primary text-primary-foreground"
                : "border-border text-muted-foreground hover:bg-muted"
            )}
          >
            {s === "" ? "All" : s.replace("_", " ")}
          </button>
        ))}
      </div>

      {isLoading ? (
        <div className="space-y-2">{[...Array(5)].map((_, i) => <Skeleton key={i} className="h-14 rounded-lg" />)}</div>
      ) : !jobs?.length ? (
        <p className="text-center text-muted-foreground py-12 text-sm">No jobs found.</p>
      ) : (
        <div className="rounded-xl border border-border overflow-hidden">
          <table className="w-full text-sm">
            <thead>
              <tr className="border-b border-border bg-muted/30">
                <th className="text-left px-4 py-3 text-xs font-semibold text-muted-foreground uppercase tracking-wide">Job</th>
                <th className="text-left px-4 py-3 text-xs font-semibold text-muted-foreground uppercase tracking-wide">Customer</th>
                <th className="text-left px-4 py-3 text-xs font-semibold text-muted-foreground uppercase tracking-wide">Status</th>
                <th className="text-left px-4 py-3 text-xs font-semibold text-muted-foreground uppercase tracking-wide">Bids</th>
                <th className="text-left px-4 py-3 text-xs font-semibold text-muted-foreground uppercase tracking-wide">Posted</th>
                <th className="text-right px-4 py-3 text-xs font-semibold text-muted-foreground uppercase tracking-wide">Actions</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-border">
              {jobs.map((job) => (
                <tr key={job.id} data-testid={`row-job-${job.id}`} className="hover:bg-muted/10 transition-colors">
                  <td className="px-4 py-3">
                    <p className="font-medium truncate max-w-[220px]" title={job.title}>{job.title}</p>
                    <p className="text-xs text-muted-foreground">{job.category} · {job.vehicleYear} {job.vehicleMake} {job.vehicleModel}</p>
                    <JobPhotoManager job={job} onUpdated={() => refetch()} />
                  </td>
                  <td className="px-4 py-3 text-muted-foreground">{job.customerName}</td>
                  <td className="px-4 py-3"><StatusBadge status={job.status} /></td>
                  <td className="px-4 py-3">
                    <span className="flex items-center gap-1 text-muted-foreground">
                      <Gavel size={11} />{job.bidCount}
                    </span>
                  </td>
                  <td className="px-4 py-3 text-xs text-muted-foreground whitespace-nowrap">
                    {new Date(job.createdAt).toLocaleDateString()}
                  </td>
                  <td className="px-4 py-3 text-right">
                    {job.status !== "cancelled" && job.status !== "completed" && (
                      <Button
                        size="sm"
                        variant="outline"
                        className="h-7 px-2 text-xs text-red-400 border-red-500/30 gap-1"
                        onClick={() => handleRemove(job.id, job.title)}
                        data-testid={`button-remove-job-${job.id}`}
                      >
                        <Trash2 size={12} />
                        Remove
                      </Button>
                    )}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}
    </div>
  );
}

// ── IP Blocklist tab ──────────────────────────────────────────────────────────
function IpBlocklistTab() {
  const { toast } = useToast();
  const [addingIp, setAddingIp] = useState(false);
  const [newIp, setNewIp] = useState("");
  const [newReason, setNewReason] = useState("");
  const [adding, setAdding] = useState(false);

  const { data: blocklist, isLoading, refetch } = useQuery({
    queryKey: ["admin-ip-blocklist"],
    queryFn: () => adminFetch("GET", "/admin/ip-blocklist"),
  });

  const handleAdd = async () => {
    if (!newIp.trim()) return;
    setAdding(true);
    try {
      await adminFetch("POST", "/admin/ip-blocklist", {
        ip: newIp.trim(),
        ...(newReason.trim() ? { reason: newReason.trim() } : {}),
      });
      toast({ title: `IP ${newIp.trim()} blocked` });
      setNewIp(""); setNewReason(""); setAddingIp(false);
      refetch();
    } catch (e: any) {
      toast({ title: e.message ?? "Failed", variant: "destructive" });
    } finally { setAdding(false); }
  };

  const handleRemove = async (id: number, ip: string) => {
    if (!confirm(`Unblock IP ${ip}?`)) return;
    try {
      await adminFetch("DELETE", `/admin/ip-blocklist/${id}`);
      toast({ title: `IP ${ip} unblocked` });
      refetch();
    } catch (e: any) {
      toast({ title: e.message ?? "Failed", variant: "destructive" });
    }
  };

  return (
    <div>
      <div className="flex items-center justify-between mb-5">
        <p className="text-sm text-muted-foreground">Block specific IPs from logging in or registering.</p>
        <Button size="sm" className="gap-2" onClick={() => setAddingIp(true)}>
          <Network size={13} /> Block IP
        </Button>
      </div>

      {isLoading ? (
        <div className="space-y-2">{[...Array(3)].map((_, i) => <Skeleton key={i} className="h-12 rounded-lg" />)}</div>
      ) : !blocklist?.length ? (
        <div className="text-center py-16 text-muted-foreground">
          <Globe size={36} className="mx-auto mb-3 opacity-20" />
          <p className="text-sm">No IPs blocked. The blocklist is empty.</p>
        </div>
      ) : (
        <div className="rounded-xl border border-border overflow-hidden">
          <table className="w-full text-sm">
            <thead>
              <tr className="border-b border-border bg-muted/30">
                <th className="text-left px-4 py-3 text-xs font-semibold text-muted-foreground uppercase tracking-wide">IP Address</th>
                <th className="text-left px-4 py-3 text-xs font-semibold text-muted-foreground uppercase tracking-wide">Reason</th>
                <th className="text-left px-4 py-3 text-xs font-semibold text-muted-foreground uppercase tracking-wide">Blocked by</th>
                <th className="text-left px-4 py-3 text-xs font-semibold text-muted-foreground uppercase tracking-wide">Date</th>
                <th className="text-right px-4 py-3"></th>
              </tr>
            </thead>
            <tbody className="divide-y divide-border">
              {blocklist.map((entry: any) => (
                <tr key={entry.id} className="hover:bg-muted/10 transition-colors">
                  <td className="px-4 py-3 font-mono text-sm">{entry.ip}</td>
                  <td className="px-4 py-3 text-sm text-muted-foreground">{entry.reason ?? "—"}</td>
                  <td className="px-4 py-3 text-sm text-muted-foreground">{entry.blockedByName}</td>
                  <td className="px-4 py-3 text-xs text-muted-foreground">{new Date(entry.createdAt).toLocaleDateString()}</td>
                  <td className="px-4 py-3 text-right">
                    <Button
                      size="sm"
                      variant="outline"
                      className="h-7 px-2 text-xs gap-1 text-red-400 border-red-500/30"
                      onClick={() => handleRemove(entry.id, entry.ip)}
                    >
                      <Trash2 size={11} /> Unblock
                    </Button>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}

      <Dialog open={addingIp} onOpenChange={(o) => { if (!o) { setAddingIp(false); setNewIp(""); setNewReason(""); } }}>
        <DialogContent className="sm:max-w-sm">
          <DialogHeader><DialogTitle>Block IP Address</DialogTitle></DialogHeader>
          <div className="space-y-3">
            <div>
              <label className="text-sm font-medium">IP Address</label>
              <Input
                placeholder="e.g. 192.168.1.100"
                value={newIp}
                onChange={(e) => setNewIp(e.target.value)}
                className="mt-1 font-mono"
                autoFocus
              />
            </div>
            <div>
              <label className="text-sm font-medium">Reason <span className="text-muted-foreground font-normal">(optional)</span></label>
              <Input
                placeholder="e.g. Fraudulent activity"
                value={newReason}
                onChange={(e) => setNewReason(e.target.value)}
                className="mt-1"
              />
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => { setAddingIp(false); setNewIp(""); setNewReason(""); }}>
              Cancel
            </Button>
            <Button onClick={handleAdd} disabled={!newIp.trim() || adding}>
              {adding ? "Blocking…" : "Block IP"}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}

// ── Audit Log tab ─────────────────────────────────────────────────────────────
function AuditLogTab() {
  const { data: entries, isLoading, refetch } = useQuery({
    queryKey: ["admin-audit-log"],
    queryFn: () => adminFetch("GET", "/admin/audit-log?limit=100"),
  });

  const ACTION_COLORS: Record<string, string> = {
    ban_user: "text-red-400 bg-red-500/10",
    unban_user: "text-emerald-400 bg-emerald-500/10",
    suspend_user: "text-orange-400 bg-orange-500/10",
    unsuspend_user: "text-emerald-400 bg-emerald-500/10",
    delete_user: "text-red-500 bg-red-700/10",
    restore_user: "text-blue-400 bg-blue-500/10",
    block_ip: "text-red-400 bg-red-500/10",
    unblock_ip: "text-emerald-400 bg-emerald-500/10",
    review_report: "text-amber-400 bg-amber-500/10",
    update_admin_notes: "text-blue-400 bg-blue-500/10",
    cancel_job: "text-orange-400 bg-orange-500/10",
    verify_user: "text-emerald-400 bg-emerald-500/10",
    flag_user: "text-amber-400 bg-amber-500/10",
    update_map_visible: "text-blue-400 bg-blue-500/10",
    remove_job_photo: "text-orange-400 bg-orange-500/10",
  };

  return (
    <div>
      <div className="flex items-center justify-between mb-5">
        <p className="text-sm text-muted-foreground">All admin actions are logged here for accountability.</p>
        <Button size="sm" variant="outline" className="gap-2" onClick={() => refetch()}>
          <RefreshCw size={13} /> Refresh
        </Button>
      </div>

      {isLoading ? (
        <div className="space-y-2">{[...Array(6)].map((_, i) => <Skeleton key={i} className="h-12 rounded-lg" />)}</div>
      ) : !entries?.length ? (
        <div className="text-center py-16 text-muted-foreground">
          <ScrollText size={36} className="mx-auto mb-3 opacity-20" />
          <p className="text-sm">No audit log entries yet.</p>
        </div>
      ) : (
        <div className="space-y-2">
          {entries.map((e: any) => (
            <div key={e.id} className="rounded-xl border border-border bg-card p-3 flex items-start gap-3">
              <span className={cn(
                "text-xs px-2 py-0.5 rounded-full font-medium shrink-0 mt-0.5 whitespace-nowrap",
                ACTION_COLORS[e.action] ?? "text-muted-foreground bg-muted"
              )}>
                {e.action.replace(/_/g, " ")}
              </span>
              <div className="flex-1 min-w-0">
                <p className="text-sm">
                  <span className="font-medium">{e.adminName}</span>
                  {e.targetUserName && (
                    <span className="text-muted-foreground"> → {e.targetUserName}</span>
                  )}
                </p>
                {e.details && (
                  <p className="text-xs text-muted-foreground mt-0.5 truncate">{e.details}</p>
                )}
                {e.ip && (
                  <p className="text-xs text-muted-foreground font-mono">from {e.ip}</p>
                )}
              </div>
              <span className="text-xs text-muted-foreground shrink-0 whitespace-nowrap">
                {new Date(e.createdAt).toLocaleString()}
              </span>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}

// ── Referrals tab ─────────────────────────────────────────────────────────────
function ReferralsTab() {
  const { data: referrals, isLoading } = useQuery({
    queryKey: ["admin-referrals"],
    queryFn: () => adminFetch("GET", "/admin/referrals"),
  });

  return (
    <div>
      <p className="text-sm text-muted-foreground mb-5">Mechanics with referral codes and the users they've referred.</p>

      {isLoading ? (
        <div className="space-y-2">{[...Array(4)].map((_, i) => <Skeleton key={i} className="h-12 rounded-lg" />)}</div>
      ) : !referrals?.length ? (
        <div className="text-center py-16 text-muted-foreground">
          <Link2 size={36} className="mx-auto mb-3 opacity-20" />
          <p className="text-sm">No mechanics with referral codes yet.</p>
        </div>
      ) : (
        <div className="rounded-xl border border-border overflow-hidden">
          <table className="w-full text-sm">
            <thead>
              <tr className="border-b border-border bg-muted/30">
                <th className="text-left px-4 py-3 text-xs font-semibold text-muted-foreground uppercase tracking-wide">Mechanic</th>
                <th className="text-left px-4 py-3 text-xs font-semibold text-muted-foreground uppercase tracking-wide">Referral Code</th>
                <th className="text-left px-4 py-3 text-xs font-semibold text-muted-foreground uppercase tracking-wide">Referrals</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-border">
              {referrals.map((r: any) => (
                <tr key={r.mechanicId} className="hover:bg-muted/10 transition-colors">
                  <td className="px-4 py-3">
                    <p className="font-medium">{r.mechanicName}</p>
                    <p className="text-xs text-muted-foreground">{r.email}</p>
                  </td>
                  <td className="px-4 py-3 font-mono text-sm text-primary tracking-widest">{r.referralCode}</td>
                  <td className="px-4 py-3">
                    <span className={cn(
                      "text-sm font-bold",
                      r.referralCount > 0 ? "text-emerald-400" : "text-muted-foreground"
                    )}>
                      {r.referralCount}
                    </span>
                    {r.referralCount > 0 && (
                      <span className="text-xs text-muted-foreground ml-1">
                        {r.referralCount === 1 ? "user" : "users"}
                      </span>
                    )}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}
    </div>
  );
}

// ── Reports tab ───────────────────────────────────────────────────────────────
function ReportsTab() {
  const [showReviewed, setShowReviewed] = useState(false);
  const [reviewingId, setReviewingId] = useState<number | null>(null);
  const [resolution, setResolution] = useState("");
  const { toast } = useToast();
  const queryClient = useQueryClient();

  const { data: reports, isLoading } = useListAdminReports(
    { reviewed: showReviewed },
    { query: { queryKey: getListAdminReportsQueryKey({ reviewed: showReviewed }) } }
  );
  const reviewReport = useReviewReport();

  const handleReview = () => {
    if (!reviewingId || !resolution.trim()) return;
    reviewReport.mutate({ id: reviewingId, data: { resolution: resolution.trim() } }, {
      onSuccess: () => {
        queryClient.invalidateQueries({ queryKey: getListAdminReportsQueryKey() });
        queryClient.invalidateQueries({ queryKey: getGetAdminStatsQueryKey() });
        toast({ title: "Report marked as reviewed" });
        setReviewingId(null);
        setResolution("");
      },
      onError: () => toast({ title: "Action failed", variant: "destructive" }),
    });
  };

  const REASON_COLORS: Record<string, string> = {
    circumvention: "text-red-400 bg-red-500/10",
    harassment: "text-orange-400 bg-orange-500/10",
    fraud: "text-red-400 bg-red-500/10",
    spam: "text-yellow-400 bg-yellow-500/10",
    other: "text-muted-foreground bg-muted",
  };

  return (
    <div>
      <div className="flex gap-1.5 mb-5">
        <button
          onClick={() => setShowReviewed(false)}
          className={cn(
            "px-3 py-1.5 rounded-lg text-sm border transition-colors",
            !showReviewed ? "bg-primary border-primary text-primary-foreground" : "border-border text-muted-foreground hover:bg-muted"
          )}
        >
          Pending Review
        </button>
        <button
          onClick={() => setShowReviewed(true)}
          className={cn(
            "px-3 py-1.5 rounded-lg text-sm border transition-colors",
            showReviewed ? "bg-primary border-primary text-primary-foreground" : "border-border text-muted-foreground hover:bg-muted"
          )}
        >
          Reviewed
        </button>
      </div>

      {isLoading ? (
        <div className="space-y-2">{[...Array(4)].map((_, i) => <Skeleton key={i} className="h-16 rounded-lg" />)}</div>
      ) : !reports?.length ? (
        <div className="text-center text-muted-foreground py-12">
          <Flag size={32} className="mx-auto mb-3 opacity-30" />
          <p className="text-sm">{showReviewed ? "No reviewed reports." : "No pending reports — all clear!"}</p>
        </div>
      ) : (
        <div className="space-y-3">
          {reports.map((r) => (
            <div key={r.id} data-testid={`card-report-${r.id}`} className="rounded-xl border border-border bg-card p-4">
              <div className="flex items-start justify-between gap-4">
                <div className="flex-1 min-w-0">
                  <div className="flex items-center gap-2 flex-wrap mb-2">
                    <span className={cn("text-xs px-2 py-0.5 rounded-full font-medium capitalize", REASON_COLORS[r.reason] ?? "text-muted-foreground bg-muted")}>
                      {r.reason}
                    </span>
                    {r.reviewed && (
                      <span className="text-xs px-2 py-0.5 rounded-full bg-emerald-500/10 text-emerald-400 font-medium">
                        Reviewed
                      </span>
                    )}
                    <span className="text-xs text-muted-foreground">
                      {new Date(r.createdAt).toLocaleDateString()}
                    </span>
                  </div>
                  <p className="text-sm">
                    <span className="text-muted-foreground">Reporter:</span>{" "}
                    <span className="font-medium">{r.reporterName}</span>
                    <span className="mx-2 text-muted-foreground">→</span>
                    <span className="text-muted-foreground">Reported:</span>{" "}
                    <span className="font-medium">{r.reportedUserName}</span>
                  </p>
                  {r.details && (
                    <p className="text-sm text-muted-foreground mt-1 truncate">{r.details}</p>
                  )}
                  {r.reviewed && r.resolution && (
                    <p className="text-xs text-emerald-400 mt-1.5">
                      <span className="text-muted-foreground">Resolution:</span> {r.resolution}
                    </p>
                  )}
                </div>
                {!r.reviewed && (
                  <Button
                    size="sm"
                    variant="outline"
                    className="h-7 px-2 text-xs gap-1 shrink-0"
                    onClick={() => { setReviewingId(r.id); setResolution(""); }}
                    data-testid={`button-review-report-${r.id}`}
                  >
                    <Eye size={12} />
                    Review
                  </Button>
                )}
              </div>
            </div>
          ))}
        </div>
      )}

      <Dialog open={reviewingId !== null} onOpenChange={(o) => { if (!o) setReviewingId(null); }}>
        <DialogContent className="sm:max-w-md">
          <DialogHeader>
            <DialogTitle>Mark Report as Reviewed</DialogTitle>
          </DialogHeader>
          <div className="space-y-3">
            <p className="text-sm text-muted-foreground">Describe the action taken or your resolution decision:</p>
            <Textarea
              placeholder="e.g. Warning issued to user. Account monitored for 30 days."
              rows={4}
              value={resolution}
              onChange={(e) => setResolution(e.target.value)}
              data-testid="textarea-resolution"
            />
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setReviewingId(null)}>Cancel</Button>
            <Button
              onClick={handleReview}
              disabled={!resolution.trim() || reviewReport.isPending}
              data-testid="button-submit-resolution"
            >
              {reviewReport.isPending ? "Saving..." : "Mark Reviewed"}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}

// ── Main admin page ───────────────────────────────────────────────────────────
const TABS = [
  { key: "overview", label: "Overview", icon: BarChart3 },
  { key: "users", label: "Users", icon: Users },
  { key: "verification", label: "Verification", icon: BadgeCheck },
  { key: "jobs", label: "Jobs", icon: Briefcase },
  { key: "reports", label: "Reports", icon: Flag },
  { key: "ip-blocklist", label: "IP Blocklist", icon: Network },
  { key: "audit-log", label: "Audit Log", icon: ScrollText },
  { key: "referrals", label: "Referrals", icon: Link2 },
] as const;

type Tab = typeof TABS[number]["key"];

export default function AdminDashboard() {
  const { user, logout } = useAuth();
  const [, setLocation] = useLocation();
  const [activeTab, setActiveTab] = useState<Tab>("overview");
  const { data: stats, isLoading: statsLoading, refetch: refetchStats } = useGetAdminStats({
    query: { queryKey: getGetAdminStatsQueryKey() }
  });

  const { data: allMechanics } = useListAdminUsers(
    { role: "mechanic" },
    { query: { queryKey: getListAdminUsersQueryKey({ role: "mechanic" }) } }
  );
  const pendingVerifications = allMechanics?.filter(u => u.identityVerificationStatus === "pending").length ?? 0;

  if (!user?.isAdmin) {
    return (
      <div className="min-h-screen bg-background flex items-center justify-center text-center px-4">
        <div>
          <Shield size={48} className="mx-auto mb-4 text-muted-foreground opacity-30" />
          <h1 className="text-xl font-bold mb-2">Access Denied</h1>
          <p className="text-muted-foreground text-sm mb-4">You don't have permission to view this page.</p>
          <Button onClick={() => setLocation("/")}>Go Home</Button>
        </div>
      </div>
    );
  }

  const TAB_DESCRIPTIONS: Record<Tab, string> = {
    overview: "Platform-wide stats and health",
    users: "Manage all customers and mechanics",
    verification: "Review mechanic verification requests",
    jobs: "Monitor and manage all jobs",
    reports: "Review user-submitted reports",
    "ip-blocklist": "Block IPs from accessing the platform",
    "audit-log": "Full log of admin actions",
    referrals: "Mechanic referral codes and growth",
  };

  return (
    <div className="min-h-screen bg-background flex">
      {/* Sidebar */}
      <aside className="w-56 shrink-0 border-r border-border bg-card flex flex-col">
        <div className="px-5 py-5 border-b border-border">
          <div className="flex items-center gap-2">
            <Wrench size={18} className="text-primary" />
            <div>
              <p className="font-bold text-sm tracking-tight">BidWrenx</p>
              <p className="text-xs text-muted-foreground">Admin Panel</p>
            </div>
          </div>
        </div>

        <nav className="flex-1 px-3 py-4 space-y-0.5 overflow-y-auto">
          {TABS.map(({ key, label, icon: Icon }) => (
            <button
              key={key}
              onClick={() => setActiveTab(key)}
              data-testid={`tab-${key}`}
              className={cn(
                "w-full flex items-center gap-2.5 px-3 py-2 rounded-lg text-sm font-medium transition-colors text-left",
                activeTab === key
                  ? "bg-primary/10 text-primary"
                  : "text-muted-foreground hover:text-foreground hover:bg-muted"
              )}
            >
              <Icon size={15} />
              {label}
              {key === "reports" && stats && stats.unreviewedReports > 0 && (
                <span className="ml-auto bg-red-500 text-white text-xs px-1.5 py-0.5 rounded-full leading-none">
                  {stats.unreviewedReports}
                </span>
              )}
              {key === "verification" && pendingVerifications > 0 && (
                <span className="ml-auto bg-amber-500 text-white text-xs px-1.5 py-0.5 rounded-full leading-none">
                  {pendingVerifications}
                </span>
              )}
            </button>
          ))}
        </nav>

        <div className="px-3 pb-4 border-t border-border pt-4 space-y-2">
          <div className="px-3 py-2">
            <p className="text-xs font-medium truncate">{user.name}</p>
            <p className="text-xs text-muted-foreground truncate">{user.email}</p>
          </div>
          <Button variant="outline" size="sm" className="w-full gap-2 text-xs" onClick={logout}>
            <LogOut size={12} />
            Sign out
          </Button>
        </div>
      </aside>

      {/* Main */}
      <main className="flex-1 overflow-auto">
        <div className="px-8 py-7">
          <div className="flex items-center justify-between mb-8">
            <div>
              <h1 className="text-2xl font-bold">{TABS.find(t => t.key === activeTab)?.label}</h1>
              <p className="text-sm text-muted-foreground">{TAB_DESCRIPTIONS[activeTab]}</p>
            </div>
            {activeTab === "overview" && (
              <Button variant="outline" size="sm" className="gap-2" onClick={() => refetchStats()}>
                <RefreshCw size={14} />
                Refresh
              </Button>
            )}
          </div>

          {activeTab === "overview" && (
            <div className="space-y-8">
              {statsLoading ? (
                <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
                  {[...Array(8)].map((_, i) => <Skeleton key={i} className="h-20 rounded-xl" />)}
                </div>
              ) : stats ? (
                <>
                  <div>
                    <p className="text-xs font-semibold text-muted-foreground uppercase tracking-wide mb-3">Users</p>
                    <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
                      <StatCard label="Total users" value={stats.totalUsers} icon={Users} color="bg-blue-500/10 text-blue-400" />
                      <StatCard label="Customers" value={stats.totalCustomers} icon={Users} color="bg-emerald-500/10 text-emerald-400" />
                      <StatCard label="Mechanics" value={stats.totalMechanics} icon={Wrench} color="bg-purple-500/10 text-purple-400" />
                      <StatCard label="Suspended" value={stats.suspendedUsers} icon={ShieldOff} color="bg-red-500/10 text-red-400" />
                    </div>
                  </div>
                  <div>
                    <p className="text-xs font-semibold text-muted-foreground uppercase tracking-wide mb-3">Jobs & Bids</p>
                    <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
                      <StatCard label="Total jobs" value={stats.totalJobs} icon={Briefcase} color="bg-blue-500/10 text-blue-400" />
                      <StatCard label="Open jobs" value={stats.openJobs} icon={Briefcase} color="bg-emerald-500/10 text-emerald-400" />
                      <StatCard label="Completed" value={stats.completedJobs} icon={CheckCircle2} color="bg-emerald-500/10 text-emerald-400" />
                      <StatCard label="Total bids" value={stats.totalBids} icon={Gavel} color="bg-amber-500/10 text-amber-400" />
                    </div>
                  </div>
                  <div>
                    <p className="text-xs font-semibold text-muted-foreground uppercase tracking-wide mb-3">Activity</p>
                    <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
                      <StatCard label="Messages" value={stats.totalMessages} icon={Flag} color="bg-purple-500/10 text-purple-400" />
                      <StatCard label="Reports" value={stats.totalReports} icon={Flag} color="bg-amber-500/10 text-amber-400" />
                      <StatCard label="Pending reports" value={stats.unreviewedReports} icon={AlertTriangle} color="bg-red-500/10 text-red-400" />
                      <StatCard
                        label="Avg mechanic rating"
                        value={stats.avgMechanicRating != null ? `★ ${Number(stats.avgMechanicRating).toFixed(2)}` : "—"}
                        icon={Star}
                        color="bg-amber-500/10 text-amber-400"
                      />
                    </div>
                  </div>
                </>
              ) : null}
            </div>
          )}

          {activeTab === "users" && <UsersTab />}
          {activeTab === "verification" && <VerificationTab />}
          {activeTab === "jobs" && <JobsTab />}
          {activeTab === "reports" && <ReportsTab />}
          {activeTab === "ip-blocklist" && <IpBlocklistTab />}
          {activeTab === "audit-log" && <AuditLogTab />}
          {activeTab === "referrals" && <ReferralsTab />}
        </div>
      </main>
    </div>
  );
}
