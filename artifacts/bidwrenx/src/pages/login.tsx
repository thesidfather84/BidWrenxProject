import { useState } from "react";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { z } from "zod";
import { Link, useLocation } from "wouter";
import { useLogin } from "@workspace/api-client-react";
import { useAuth } from "@/contexts/auth";
import { Button } from "@/components/ui/button";
import { Form, FormControl, FormField, FormItem, FormLabel, FormMessage } from "@/components/ui/form";
import { Input } from "@/components/ui/input";
import { PinInput } from "@/components/pin-input";
import { Wrench, ArrowLeft, Lock, AlertTriangle } from "lucide-react";
import { useToast } from "@/hooks/use-toast";
import { cn } from "@/lib/utils";

const schema = z.object({
  email: z.string().email(),
  password: z.string().min(1, "Password is required"),
});
type FormValues = z.infer<typeof schema>;

type PinStep = "email" | "enter";
type PinStatus = "idle" | "checking" | "ready" | "no-pin" | "locked";

export default function LoginPage() {
  const { login } = useAuth();
  const [, setLocation] = useLocation();
  const { toast } = useToast();
  const loginMutation = useLogin();

  const [activeTab, setActiveTab] = useState<"password" | "pin">("password");
  const [pinEmail, setPinEmail] = useState("");
  const [pinStep, setPinStep] = useState<PinStep>("email");
  const [pinStatus, setPinStatus] = useState<PinStatus>("idle");
  const [pinValue, setPinValue] = useState("");
  const [pinError, setPinError] = useState("");
  const [pinLoading, setPinLoading] = useState(false);

  const form = useForm<FormValues>({
    resolver: zodResolver(schema),
    defaultValues: { email: "", password: "" },
  });

  const handlePasswordLogin = (values: FormValues) => {
    loginMutation.mutate({ data: values }, {
      onSuccess: (data) => {
        login(data.token, data.user as any, "full");
        if ((data.user as any).mustChangePassword) {
          setLocation("/change-password");
        } else if (data.user.role === "customer") {
          setLocation("/customer/dashboard");
        } else {
          setLocation("/mechanic/dashboard");
        }
      },
      onError: () => {
        toast({ title: "Login failed", description: "Invalid email or password.", variant: "destructive" });
      },
    });
  };

  const handleTabSwitch = (tab: "password" | "pin") => {
    setActiveTab(tab);
    if (tab === "pin" && !pinEmail) {
      setPinEmail(form.getValues("email"));
    }
  };

  const handlePinContinue = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!pinEmail.trim()) return;
    setPinStatus("checking");
    setPinError("");
    try {
      const res = await fetch(`/api/auth/has-pin?email=${encodeURIComponent(pinEmail.trim().toLowerCase())}`);
      const data = await res.json();
      if (data.pinLocked) { setPinStatus("locked"); return; }
      if (!data.hasPinSet) { setPinStatus("no-pin"); return; }
      setPinStatus("ready");
      setPinStep("enter");
      setPinValue("");
    } catch {
      setPinError("Network error. Please try again.");
      setPinStatus("idle");
    }
  };

  const handlePinSubmit = async (pin: string) => {
    if (pin.length !== 4 || pinLoading) return;
    setPinLoading(true);
    setPinError("");
    try {
      const res = await fetch("/api/auth/pin-login", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ email: pinEmail.trim().toLowerCase(), pin }),
      });
      const data = await res.json();
      if (!res.ok) {
        setPinError(data.error ?? "PIN login failed.");
        setPinValue("");
        if (res.status === 403) setPinStatus("locked");
        return;
      }
      login(data.token, data.user, "pin");
      if (data.user.mustChangePassword) {
        setLocation("/change-password");
      } else if (data.user.role === "customer") {
        setLocation("/customer/dashboard");
      } else {
        setLocation("/mechanic/dashboard");
      }
    } catch {
      setPinError("Network error. Please try again.");
      setPinValue("");
    } finally {
      setPinLoading(false);
    }
  };

  const resetPin = () => {
    setPinStep("email");
    setPinStatus("idle");
    setPinValue("");
    setPinError("");
  };

  return (
    <div className="min-h-screen bg-background flex items-center justify-center px-4">
      <div className="w-full max-w-sm">
        <div className="flex items-center gap-2 mb-10">
          <Wrench size={20} className="text-primary" />
          <span className="font-bold text-lg tracking-tight">BidWrenx</span>
        </div>

        <div className="rounded-xl border border-border bg-card overflow-hidden">
          {/* Tabs */}
          <div className="flex border-b border-border">
            {(["password", "pin"] as const).map((tab) => (
              <button
                key={tab}
                onClick={() => handleTabSwitch(tab)}
                className={cn(
                  "flex-1 py-3 text-sm font-medium transition-colors",
                  activeTab === tab
                    ? "text-foreground border-b-2 border-primary -mb-px bg-card"
                    : "text-muted-foreground hover:text-foreground"
                )}
              >
                {tab === "password" ? "Password" : "Quick PIN"}
              </button>
            ))}
          </div>

          <div className="p-7">
            {activeTab === "password" ? (
              <>
                <h1 className="text-xl font-bold mb-1">Welcome back</h1>
                <p className="text-sm text-muted-foreground mb-6">Sign in to your account</p>

                <Form {...form}>
                  <form onSubmit={form.handleSubmit(handlePasswordLogin)} className="space-y-4">
                    <FormField
                      control={form.control}
                      name="email"
                      render={({ field }) => (
                        <FormItem>
                          <FormLabel>Email</FormLabel>
                          <FormControl>
                            <Input type="email" placeholder="you@example.com" data-testid="input-email" {...field} />
                          </FormControl>
                          <FormMessage />
                        </FormItem>
                      )}
                    />
                    <FormField
                      control={form.control}
                      name="password"
                      render={({ field }) => (
                        <FormItem>
                          <FormLabel>Password</FormLabel>
                          <FormControl>
                            <Input type="password" placeholder="••••••••" data-testid="input-password" {...field} />
                          </FormControl>
                          <FormMessage />
                        </FormItem>
                      )}
                    />
                    <div className="flex justify-end">
                      <Link href="/forgot-password">
                        <span className="text-xs text-muted-foreground hover:text-primary transition-colors cursor-pointer">
                          Forgot password?
                        </span>
                      </Link>
                    </div>
                    <Button type="submit" className="w-full" disabled={loginMutation.isPending} data-testid="button-submit-login">
                      {loginMutation.isPending ? "Signing in…" : "Sign In"}
                    </Button>
                  </form>
                </Form>

                <p className="text-sm text-muted-foreground mt-5 text-center">
                  Don't have an account?{" "}
                  <Link href="/register">
                    <span className="text-primary hover:underline cursor-pointer">Create one</span>
                  </Link>
                </p>
              </>
            ) : (
              <>
                <h1 className="text-xl font-bold mb-1">Quick PIN</h1>
                <p className="text-sm text-muted-foreground mb-6">Sign in with your 4-digit PIN</p>

                {pinStep === "email" ? (
                  <form onSubmit={handlePinContinue} className="space-y-4">
                    <div className="space-y-1.5">
                      <label className="text-sm font-medium">Email address</label>
                      <Input
                        type="email"
                        placeholder="you@example.com"
                        value={pinEmail}
                        onChange={(e) => { setPinEmail(e.target.value); setPinStatus("idle"); }}
                        required
                        autoFocus
                        data-testid="input-pin-email"
                      />
                    </div>

                    {pinStatus === "no-pin" && (
                      <div className="flex items-start gap-2 text-xs text-amber-300 bg-amber-500/10 border border-amber-500/20 rounded-lg px-3 py-2.5">
                        <AlertTriangle size={13} className="shrink-0 mt-0.5" />
                        No PIN configured for this account.{" "}
                        <button type="button" onClick={() => handleTabSwitch("password")} className="underline ml-0.5">Sign in with password</button>
                      </div>
                    )}
                    {pinStatus === "locked" && (
                      <div className="flex items-start gap-2 text-xs text-red-300 bg-red-500/10 border border-red-500/20 rounded-lg px-3 py-2.5">
                        <Lock size={13} className="shrink-0 mt-0.5" />
                        PIN locked after too many failed attempts. Please{" "}
                        <button type="button" onClick={() => handleTabSwitch("password")} className="underline ml-0.5">sign in with your password</button>
                        {" "}to unlock.
                      </div>
                    )}
                    {pinError && (
                      <p className="text-xs text-red-400">{pinError}</p>
                    )}

                    <Button
                      type="submit"
                      className="w-full"
                      disabled={pinStatus === "checking" || !pinEmail.trim()}
                    >
                      {pinStatus === "checking" ? "Checking…" : "Continue"}
                    </Button>
                  </form>
                ) : (
                  <div className="space-y-6">
                    <div className="text-center">
                      <p className="text-xs text-muted-foreground mb-5">
                        Signing in as <span className="text-foreground font-medium">{pinEmail}</span>
                        {" "}·{" "}
                        <button onClick={resetPin} className="text-primary hover:underline">Change</button>
                      </p>
                      <PinInput
                        value={pinValue}
                        onChange={setPinValue}
                        onComplete={handlePinSubmit}
                        disabled={pinLoading}
                        error={!!pinError}
                      />
                    </div>

                    {pinError && (
                      <p className="text-center text-sm text-red-400">{pinError}</p>
                    )}

                    {pinStatus === "locked" && (
                      <div className="flex items-center gap-2 text-xs text-red-300 bg-red-500/10 border border-red-500/20 rounded-lg px-3 py-2.5">
                        <Lock size={13} className="shrink-0" />
                        PIN locked. Sign in with your password to unlock it.
                      </div>
                    )}

                    <Button
                      className="w-full"
                      disabled={pinValue.length < 4 || pinLoading || pinStatus === "locked"}
                      onClick={() => handlePinSubmit(pinValue)}
                    >
                      {pinLoading ? "Verifying…" : "Verify PIN"}
                    </Button>
                  </div>
                )}
              </>
            )}
          </div>
        </div>

        <div className="text-center mt-4">
          <p className="text-xs text-muted-foreground mb-1">Demo accounts (password: password123)</p>
          <p className="text-xs text-muted-foreground">Customer: sarah@example.com | Mechanic: mike@example.com</p>
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
