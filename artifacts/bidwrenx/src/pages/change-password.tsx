import { useState } from "react";
import { useLocation } from "wouter";
import { useAuth } from "@/contexts/auth";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Wrench, KeyRound, ShieldCheck, Eye, EyeOff } from "lucide-react";
import { useToast } from "@/hooks/use-toast";

export default function ChangePasswordPage() {
  const { user, updateUser, logout } = useAuth();
  const [, setLocation] = useLocation();
  const { toast } = useToast();

  const [currentPassword, setCurrentPassword] = useState("");
  const [newPassword, setNewPassword] = useState("");
  const [confirm, setConfirm] = useState("");
  const [showCurrent, setShowCurrent] = useState(false);
  const [showNew, setShowNew] = useState(false);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");

  const isForced = user?.mustChangePassword ?? false;
  const passwordsMatch = newPassword === confirm;
  const strongEnough = newPassword.length >= 8;
  const canSubmit = strongEnough && passwordsMatch && newPassword && confirm && (isForced || currentPassword);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!canSubmit) return;
    setLoading(true);
    setError("");

    try {
      const token = localStorage.getItem("bidwrenx_token") ?? "";
      const body: Record<string, string> = { newPassword };
      if (!isForced) body.currentPassword = currentPassword;

      const res = await fetch("/api/users/me/password", {
        method: "PATCH",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${token}`,
        },
        body: JSON.stringify(body),
      });

      const data = await res.json().catch(() => ({}));
      if (!res.ok) {
        setError(data.error ?? "Failed to update password. Please try again.");
        return;
      }

      updateUser(data);
      toast({ title: "Password updated successfully" });
      setLocation(data.role === "customer" ? "/customer/dashboard" : data.isAdmin ? "/admin" : "/mechanic/dashboard");
    } catch {
      setError("Network error. Please try again.");
    } finally {
      setLoading(false);
    }
  };

  // Let logged-in users access this page to change their password manually.
// Only redirect if there is no logged-in user.
if (!user) {
  setLocation("/login");
  return null;
}

  if (!user) return null;

  return (
    <div className="min-h-screen bg-background flex items-center justify-center px-4">
      <div className="w-full max-w-sm">
        <div className="flex items-center gap-2 mb-10">
          <Wrench size={20} className="text-primary" />
          <span className="font-bold text-lg tracking-tight">BidWrenx</span>
        </div>

        <div className="rounded-xl border border-border bg-card p-7">
          {isForced && (
            <div className="flex items-start gap-2.5 mb-5 p-3 rounded-lg bg-amber-500/10 border border-amber-500/20">
              <ShieldCheck size={16} className="text-amber-400 shrink-0 mt-0.5" />
              <p className="text-xs text-amber-300 leading-relaxed">
                Your account requires a password change before you can continue.
              </p>
            </div>
          )}

          <div className="flex items-center gap-3 mb-5">
            <div className="w-9 h-9 rounded-lg bg-primary/10 flex items-center justify-center shrink-0">
              <KeyRound size={17} className="text-primary" />
            </div>
            <div>
              <h1 className="text-xl font-bold leading-none">
                {isForced ? "Set a new password" : "Change password"}
              </h1>
              <p className="text-xs text-muted-foreground mt-0.5">
                {isForced ? "Create a strong password to secure your account" : "Update your account password"}
              </p>
            </div>
          </div>

          <form onSubmit={handleSubmit} className="space-y-4">
            {!isForced && (
              <div className="space-y-1.5">
                <label className="text-sm font-medium" htmlFor="current">Current password</label>
                <div className="relative">
                  <Input
                    id="current"
                    type={showCurrent ? "text" : "password"}
                    placeholder="Your current password"
                    value={currentPassword}
                    onChange={(e) => setCurrentPassword(e.target.value)}
                    className="pr-9"
                    required
                  />
                  <button
                    type="button"
                    onClick={() => setShowCurrent(!showCurrent)}
                    className="absolute right-2.5 top-1/2 -translate-y-1/2 text-muted-foreground hover:text-foreground"
                    tabIndex={-1}
                  >
                    {showCurrent ? <EyeOff size={15} /> : <Eye size={15} />}
                  </button>
                </div>
              </div>
            )}

            <div className="space-y-1.5">
              <label className="text-sm font-medium" htmlFor="new">New password</label>
              <div className="relative">
                <Input
                  id="new"
                  type={showNew ? "text" : "password"}
                  placeholder="At least 8 characters"
                  value={newPassword}
                  onChange={(e) => setNewPassword(e.target.value)}
                  className="pr-9"
                  required
                  autoFocus={isForced}
                />
                <button
                  type="button"
                  onClick={() => setShowNew(!showNew)}
                  className="absolute right-2.5 top-1/2 -translate-y-1/2 text-muted-foreground hover:text-foreground"
                  tabIndex={-1}
                >
                  {showNew ? <EyeOff size={15} /> : <Eye size={15} />}
                </button>
              </div>
              {newPassword.length > 0 && (
                <div className="flex gap-1 mt-1.5">
                  {[...Array(4)].map((_, i) => (
                    <div
                      key={i}
                      className={`h-1 flex-1 rounded-full transition-colors ${
                        newPassword.length >= 12 ? "bg-emerald-500"
                        : newPassword.length >= 8 ? i < 3 ? "bg-amber-500" : "bg-border"
                        : i < 2 ? "bg-red-500" : "bg-border"
                      }`}
                    />
                  ))}
                  <span className="text-xs text-muted-foreground ml-1">
                    {newPassword.length >= 12 ? "Strong" : newPassword.length >= 8 ? "Good" : "Too short"}
                  </span>
                </div>
              )}
            </div>

            <div className="space-y-1.5">
              <label className="text-sm font-medium" htmlFor="confirm">Confirm password</label>
              <Input
                id="confirm"
                type="password"
                placeholder="Repeat your new password"
                value={confirm}
                onChange={(e) => setConfirm(e.target.value)}
                required
              />
              {confirm.length > 0 && !passwordsMatch && (
                <p className="text-xs text-red-400">Passwords don't match</p>
              )}
            </div>

            {error && (
              <p className="text-sm text-red-400 bg-red-500/10 border border-red-500/20 rounded-lg px-3 py-2">
                {error}
              </p>
            )}

            <Button
              type="submit"
              className="w-full"
              disabled={loading || !canSubmit}
              data-testid="button-change-password"
            >
              {loading ? "Updating…" : "Update password"}
            </Button>
          </form>

          {isForced && (
            <button
              onClick={logout}
              className="w-full text-center text-xs text-muted-foreground hover:text-foreground mt-4 transition-colors"
            >
              Sign out instead
            </button>
          )}
        </div>
      </div>
    </div>
  );
}
