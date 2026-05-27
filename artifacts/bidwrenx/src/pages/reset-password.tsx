import { useState, useEffect } from "react";
import { Link, useLocation } from "wouter";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Wrench, ArrowLeft, KeyRound, CheckCircle2, XCircle } from "lucide-react";

export default function ResetPasswordPage() {
  const [location] = useLocation();
  const token = new URLSearchParams(window.location.search).get("token") ?? "";

  const [password, setPassword] = useState("");
  const [confirm, setConfirm] = useState("");
  const [loading, setLoading] = useState(false);
  const [success, setSuccess] = useState(false);
  const [error, setError] = useState("");

  useEffect(() => {
    if (!token) setError("Invalid or missing reset token. Please request a new link.");
  }, [token]);

  const passwordsMatch = password === confirm;
  const strongEnough = password.length >= 8;

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!passwordsMatch || !strongEnough) return;
    setLoading(true);
    setError("");
    try {
      const res = await fetch("/api/auth/reset-password", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ token, password }),
      });
      const data = await res.json().catch(() => ({}));
      if (!res.ok) {
        setError(data.error ?? "Reset failed. Please request a new link.");
        return;
      }
      setSuccess(true);
    } catch {
      setError("Network error. Please try again.");
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="min-h-screen bg-background flex items-center justify-center px-4">
      <div className="w-full max-w-sm">
        <div className="flex items-center gap-2 mb-10">
          <Wrench size={20} className="text-primary" />
          <span className="font-bold text-lg tracking-tight">BidWrenx</span>
        </div>

        <div className="rounded-xl border border-border bg-card p-7">
          {success ? (
            <div className="text-center py-2">
              <CheckCircle2 size={40} className="text-emerald-400 mx-auto mb-4" />
              <h1 className="text-xl font-bold mb-2">Password updated</h1>
              <p className="text-sm text-muted-foreground mb-6">
                Your password has been reset successfully. You can now sign in with your new password.
              </p>
              <Link href="/login">
                <Button className="w-full">Go to Sign In</Button>
              </Link>
            </div>
          ) : !token ? (
            <div className="text-center py-2">
              <XCircle size={40} className="text-red-400 mx-auto mb-4" />
              <h1 className="text-xl font-bold mb-2">Invalid link</h1>
              <p className="text-sm text-muted-foreground mb-6">
                This reset link is invalid or has expired. Please request a new one.
              </p>
              <Link href="/forgot-password">
                <Button className="w-full">Request new link</Button>
              </Link>
            </div>
          ) : (
            <>
              <div className="flex items-center gap-3 mb-5">
                <div className="w-9 h-9 rounded-lg bg-primary/10 flex items-center justify-center shrink-0">
                  <KeyRound size={17} className="text-primary" />
                </div>
                <div>
                  <h1 className="text-xl font-bold leading-none">Set new password</h1>
                  <p className="text-xs text-muted-foreground mt-0.5">Choose a strong password</p>
                </div>
              </div>

              <form onSubmit={handleSubmit} className="space-y-4">
                <div className="space-y-1.5">
                  <label className="text-sm font-medium" htmlFor="password">New password</label>
                  <Input
                    id="password"
                    type="password"
                    placeholder="At least 8 characters"
                    value={password}
                    onChange={(e) => setPassword(e.target.value)}
                    required
                    autoFocus
                    data-testid="input-new-password"
                  />
                  {password && !strongEnough && (
                    <p className="text-xs text-red-400">Must be at least 8 characters</p>
                  )}
                </div>

                <div className="space-y-1.5">
                  <label className="text-sm font-medium" htmlFor="confirm">Confirm password</label>
                  <Input
                    id="confirm"
                    type="password"
                    placeholder="Repeat your password"
                    value={confirm}
                    onChange={(e) => setConfirm(e.target.value)}
                    required
                    data-testid="input-confirm-password"
                  />
                  {confirm && !passwordsMatch && (
                    <p className="text-xs text-red-400">Passwords don't match</p>
                  )}
                </div>

                {error && (
                  <div className="flex items-start gap-2 text-sm text-red-400 bg-red-500/10 border border-red-500/20 rounded-lg px-3 py-2">
                    <XCircle size={15} className="shrink-0 mt-0.5" />
                    {error}
                  </div>
                )}

                <Button
                  type="submit"
                  className="w-full"
                  disabled={loading || !strongEnough || !passwordsMatch || !password || !confirm}
                  data-testid="button-submit-reset"
                >
                  {loading ? "Updating…" : "Update password"}
                </Button>
              </form>
            </>
          )}
        </div>

        <Link href="/login">
          <div className="flex items-center gap-1 text-sm text-muted-foreground mt-6 hover:text-foreground transition-colors cursor-pointer">
            <ArrowLeft size={14} />
            Back to sign in
          </div>
        </Link>
      </div>
    </div>
  );
}
