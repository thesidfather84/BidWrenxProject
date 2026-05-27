import { useState } from "react";
import { Link } from "wouter";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Wrench, ArrowLeft, Mail, CheckCircle2 } from "lucide-react";

export default function ForgotPasswordPage() {
  const [email, setEmail] = useState("");
  const [submitted, setSubmitted] = useState(false);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!email.trim()) return;
    setLoading(true);
    setError("");
    try {
      const res = await fetch("/api/auth/forgot-password", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ email: email.trim().toLowerCase() }),
      });
      if (!res.ok) {
        const data = await res.json().catch(() => ({}));
        setError(data.error ?? "Something went wrong. Please try again.");
        return;
      }
      setSubmitted(true);
    } catch {
      setError("Network error. Please check your connection and try again.");
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
          {submitted ? (
            <div className="text-center py-2">
              <CheckCircle2 size={40} className="text-emerald-400 mx-auto mb-4" />
              <h1 className="text-xl font-bold mb-2">Check your email</h1>
              <p className="text-sm text-muted-foreground leading-relaxed">
                If <span className="text-foreground font-medium">{email}</span> is registered with BidWrenx,
                you'll receive a password reset link shortly.
              </p>
              <p className="text-xs text-muted-foreground mt-4">
                Didn't get it? Check your spam folder or{" "}
                <button
                  onClick={() => { setSubmitted(false); setEmail(""); }}
                  className="text-primary hover:underline"
                >
                  try again
                </button>.
              </p>
            </div>
          ) : (
            <>
              <div className="flex items-center gap-3 mb-5">
                <div className="w-9 h-9 rounded-lg bg-primary/10 flex items-center justify-center shrink-0">
                  <Mail size={17} className="text-primary" />
                </div>
                <div>
                  <h1 className="text-xl font-bold leading-none">Forgot password?</h1>
                  <p className="text-xs text-muted-foreground mt-0.5">We'll send you a reset link</p>
                </div>
              </div>

              <form onSubmit={handleSubmit} className="space-y-4">
                <div className="space-y-1.5">
                  <label className="text-sm font-medium" htmlFor="email">Email address</label>
                  <Input
                    id="email"
                    type="email"
                    placeholder="you@example.com"
                    value={email}
                    onChange={(e) => setEmail(e.target.value)}
                    required
                    autoFocus
                    data-testid="input-forgot-email"
                  />
                </div>

                {error && (
                  <p className="text-sm text-red-400 bg-red-500/10 border border-red-500/20 rounded-lg px-3 py-2">
                    {error}
                  </p>
                )}

                <Button
                  type="submit"
                  className="w-full"
                  disabled={loading || !email.trim()}
                  data-testid="button-send-reset"
                >
                  {loading ? "Sending…" : "Send reset link"}
                </Button>
              </form>

              <p className="text-sm text-muted-foreground mt-5 text-center">
                Remember your password?{" "}
                <Link href="/login">
                  <span className="text-primary hover:underline cursor-pointer">Sign in</span>
                </Link>
              </p>
            </>
          )}
        </div>

        <Link href="/">
          <div className="flex items-center gap-1 text-sm text-muted-foreground mt-6 hover:text-foreground transition-colors cursor-pointer">
            <ArrowLeft size={14} />
            Back to home
          </div>
        </Link>
      </div>
    </div>
  );
}
