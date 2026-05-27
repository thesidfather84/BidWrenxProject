import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { z } from "zod";
import { Link, useLocation } from "wouter";
import { useRegister } from "@workspace/api-client-react";
import { useAuth } from "@/contexts/auth";
import { Button } from "@/components/ui/button";
import { Form, FormControl, FormField, FormItem, FormLabel, FormMessage } from "@/components/ui/form";
import { Input } from "@/components/ui/input";
import { Checkbox } from "@/components/ui/checkbox";
import { Wrench, ArrowLeft, Car, Hammer, AlertTriangle } from "lucide-react";
import { useToast } from "@/hooks/use-toast";
import { cn } from "@/lib/utils";

const schema = z.object({
  name: z.string().min(2, "Name must be at least 2 characters"),
  email: z.string().email(),
  password: z.string().min(6, "Password must be at least 6 characters"),
  role: z.enum(["customer", "mechanic"]),
  termsAccepted: z.boolean().refine((v) => v === true, {
    message: "You must accept the Terms of Service and Disclaimer to continue",
  }),
});

type FormValues = z.infer<typeof schema>;

export default function RegisterPage() {
  const { login } = useAuth();
  const [, setLocation] = useLocation();
  const { toast } = useToast();
  const registerMutation = useRegister();

  const form = useForm<FormValues>({
    resolver: zodResolver(schema),
    defaultValues: { name: "", email: "", password: "", role: "customer", termsAccepted: false },
  });

  const selectedRole = form.watch("role");

  const onSubmit = (values: FormValues) => {
    registerMutation.mutate({ data: values as any }, {
      onSuccess: (data) => {
        login(data.token, data.user as any);
        setLocation(data.user.role === "customer" ? "/customer/dashboard" : "/mechanic/dashboard");
      },
      onError: (err: any) => {
        toast({
          title: "Registration failed",
          description: err?.data?.error ?? "Something went wrong.",
          variant: "destructive",
        });
      },
    });
  };

  return (
    <div className="min-h-screen bg-background flex items-center justify-center px-4 py-10">
      <div className="w-full max-w-sm">
        <div className="flex items-center gap-2 mb-10">
          <Wrench size={20} className="text-primary" />
          <span className="font-bold text-lg tracking-tight">BidWrenx</span>
        </div>

        <div className="rounded-xl border border-border bg-card p-7">
          <h1 className="text-xl font-bold mb-1">Create an account</h1>
          <p className="text-sm text-muted-foreground mb-6">Join BidWrenx today</p>

          <Form {...form}>
            <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-4">
              {/* Role selector */}
              <FormField
                control={form.control}
                name="role"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>I am a...</FormLabel>
                    <div className="grid grid-cols-2 gap-2">
                      <button
                        type="button"
                        data-testid="button-role-customer"
                        onClick={() => field.onChange("customer")}
                        className={cn(
                          "flex flex-col items-center gap-2 p-4 rounded-lg border text-sm font-medium transition-colors",
                          selectedRole === "customer"
                            ? "border-primary bg-primary/10 text-primary"
                            : "border-border text-muted-foreground hover:border-border/80"
                        )}
                      >
                        <Car size={20} />
                        Car Owner
                      </button>
                      <button
                        type="button"
                        data-testid="button-role-mechanic"
                        onClick={() => field.onChange("mechanic")}
                        className={cn(
                          "flex flex-col items-center gap-2 p-4 rounded-lg border text-sm font-medium transition-colors",
                          selectedRole === "mechanic"
                            ? "border-primary bg-primary/10 text-primary"
                            : "border-border text-muted-foreground hover:border-border/80"
                        )}
                      >
                        <Hammer size={20} />
                        Mechanic
                      </button>
                    </div>
                    <FormMessage />
                  </FormItem>
                )}
              />

              <FormField control={form.control} name="name" render={({ field }) => (
                <FormItem>
                  <FormLabel>Full Name</FormLabel>
                  <FormControl>
                    <Input placeholder="John Smith" data-testid="input-name" {...field} />
                  </FormControl>
                  <FormMessage />
                </FormItem>
              )} />
              <FormField control={form.control} name="email" render={({ field }) => (
                <FormItem>
                  <FormLabel>Email</FormLabel>
                  <FormControl>
                    <Input type="email" placeholder="you@example.com" data-testid="input-email" {...field} />
                  </FormControl>
                  <FormMessage />
                </FormItem>
              )} />
              <FormField control={form.control} name="password" render={({ field }) => (
                <FormItem>
                  <FormLabel>Password</FormLabel>
                  <FormControl>
                    <Input type="password" placeholder="Min. 6 characters" data-testid="input-password" {...field} />
                  </FormControl>
                  <FormMessage />
                </FormItem>
              )} />

              {/* Terms Disclaimer */}
              <div className="rounded-lg border border-amber-500/20 bg-amber-500/5 p-3">
                <div className="flex items-start gap-2 mb-2">
                  <AlertTriangle size={13} className="text-amber-400 mt-0.5 shrink-0" />
                  <p className="text-xs text-amber-300 leading-relaxed">
                    <strong>Marketplace Disclaimer:</strong> BidWrenx is a connection platform only. We do not employ mechanics, warranty repairs, or guarantee outcomes. You hire mechanics at your own risk.
                  </p>
                </div>
              </div>

              <FormField
                control={form.control}
                name="termsAccepted"
                render={({ field }) => (
                  <FormItem>
                    <div className="flex items-start gap-3">
                      <FormControl>
                        <Checkbox
                          checked={field.value}
                          onCheckedChange={field.onChange}
                          data-testid="checkbox-terms"
                        />
                      </FormControl>
                      <FormLabel className="text-sm font-normal leading-relaxed cursor-pointer">
                        I have read and agree to the{" "}
                        <Link href="/terms" target="_blank">
                          <span className="text-primary hover:underline">Terms of Service</span>
                        </Link>
                        {" "}and{" "}
                        <Link href="/safety" target="_blank">
                          <span className="text-primary hover:underline">Safety Guidelines</span>
                        </Link>
                        . I understand BidWrenx is a marketplace only and mechanics are independent contractors.
                      </FormLabel>
                    </div>
                    <FormMessage />
                  </FormItem>
                )}
              />

              <Button
                type="submit"
                className="w-full"
                disabled={registerMutation.isPending}
                data-testid="button-submit-register"
              >
                {registerMutation.isPending ? "Creating account..." : "Create Account"}
              </Button>
            </form>
          </Form>

          <p className="text-sm text-muted-foreground mt-5 text-center">
            Already have an account?{" "}
            <Link href="/login">
              <span className="text-primary hover:underline cursor-pointer">Sign in</span>
            </Link>
          </p>
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
