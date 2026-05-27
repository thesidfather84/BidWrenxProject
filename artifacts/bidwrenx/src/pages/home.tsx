import { Link } from "wouter";
import { Button } from "@/components/ui/button";
import { Wrench, Shield, Clock, ChevronRight, Star, Car, Zap, Camera, TrendingDown, MapPin } from "lucide-react";
import { useAuth } from "@/contexts/auth";
import { useListMechanicsMap } from "@workspace/api-client-react";

const HOW_IT_WORKS = [
  { icon: <Car size={22} className="text-blue-400" />, step: "01", title: "Post Your Job", desc: "Describe your vehicle issue, set a budget range, and let the bids come to you." },
  { icon: <Wrench size={22} className="text-blue-400" />, step: "02", title: "Receive Bids", desc: "Certified mechanics in your area review the job and submit competitive bids." },
  { icon: <Shield size={22} className="text-blue-400" />, step: "03", title: "Choose & Get Fixed", desc: "Compare bids, ratings, and experience — then accept the best fit for you." },
];

const STATS = [
  { value: "12k+", label: "Jobs Completed" },
  { value: "2.4k+", label: "Verified Mechanics" },
  { value: "4.8", label: "Avg. Rating" },
  { value: "< 2hr", label: "First Bid Time" },
];

const REPAIR_EXAMPLES = [
  {
    title: "Brake Pads & Rotors Replacement",
    category: "Brakes",
    shopEst: "$350–$600",
    bidRange: "$180–$320",
    desc: "Front or rear disc brake service including pads, rotors, and hardware.",
  },
  {
    title: "AC Not Blowing Cold",
    category: "AC & Heating",
    shopEst: "$200–$500",
    bidRange: "$90–$250",
    desc: "Refrigerant recharge, leak diagnosis, compressor or expansion valve inspection.",
  },
  {
    title: "Radiator Leak Repair",
    category: "Engine",
    shopEst: "$400–$900",
    bidRange: "$200–$500",
    desc: "Coolant system inspection, radiator replacement or stop-leak treatment.",
  },
  {
    title: "No-Start Diagnosis",
    category: "Diagnostics",
    shopEst: "$150–$300",
    bidRange: "$60–$160",
    desc: "Battery, starter, alternator, and ignition system diagnostic check.",
  },
  {
    title: "Check Engine Light",
    category: "Diagnostics",
    shopEst: "$100–$250",
    bidRange: "$45–$130",
    desc: "OBD-II scan, fault code analysis, and root cause assessment.",
  },
  {
    title: "Alternator Replacement",
    category: "Electrical",
    shopEst: "$450–$800",
    bidRange: "$220–$450",
    desc: "New OEM or quality aftermarket alternator with belt and hardware check.",
  },
  {
    title: "Suspension Noise / Clunking",
    category: "Suspension",
    shopEst: "$300–$700",
    bidRange: "$140–$380",
    desc: "Ball joint, sway bar link, strut, and bushing inspection and replacement.",
  },
  {
    title: "Tire / Brake Vibration",
    category: "Tires",
    shopEst: "$200–$500",
    bidRange: "$80–$260",
    desc: "Wheel balance, tire rotation, and rotor runout check.",
  },
];

export default function HomePage() {
  const { isAuthenticated, user } = useAuth();
  const { data: mapMechanics = [] } = useListMechanicsMap();

  return (
    <div className="min-h-screen bg-background text-foreground">
      {/* Nav */}
      <nav className="border-b border-border px-6 py-4 flex items-center justify-between max-w-7xl mx-auto">
        <div className="flex items-center gap-2">
          <Wrench size={20} className="text-primary" />
          <span className="font-bold text-lg tracking-tight">BidWrenx</span>
        </div>
        <div className="hidden md:flex items-center gap-6 text-sm text-muted-foreground">
          <a href="#how-it-works" className="hover:text-foreground transition-colors">How It Works</a>
          <a href="#repair-examples" className="hover:text-foreground transition-colors">Repair Examples</a>
          {!isAuthenticated && (
            <a href="#cta" className="hover:text-foreground transition-colors">Pricing</a>
          )}
        </div>
        <div className="flex items-center gap-3">
          {isAuthenticated ? (
            <Link href={user?.role === "customer" ? "/customer/dashboard" : "/mechanic/dashboard"}>
              <Button size="sm" data-testid="button-go-dashboard">Go to Dashboard</Button>
            </Link>
          ) : (
            <>
              <Link href="/login">
                <Button variant="ghost" size="sm" data-testid="link-login">Sign In</Button>
              </Link>
              <Link href="/register">
                <Button size="sm" data-testid="link-register">Get Started</Button>
              </Link>
            </>
          )}
        </div>
      </nav>

      {/* Hero */}
      <section className="max-w-7xl mx-auto px-6 pt-24 pb-20 text-center">
        <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full border border-primary/30 bg-primary/5 text-primary text-xs font-medium mb-8">
          <Zap size={12} />
          The smarter way to get your car fixed
        </div>
        <h1 className="text-5xl md:text-7xl font-extrabold tracking-tight mb-6 leading-tight">
          Post a Job.<br />
          <span className="text-primary">Mechanics Bid.</span><br />
          You Choose.
        </h1>
        <p className="text-lg text-muted-foreground max-w-2xl mx-auto mb-10 leading-relaxed">
          BidWrenx connects car owners with verified local mechanics. Post your repair job, receive competitive bids, and pick the best mechanic — all in one place.
        </p>
        <div className="flex flex-col sm:flex-row gap-3 justify-center">
          <Link href="/register">
            <Button size="lg" className="text-base px-8" data-testid="button-hero-customer">
              Post a Job — It's Free
              <ChevronRight size={16} className="ml-1" />
            </Button>
          </Link>
          <Link href="/register">
            <Button size="lg" variant="outline" className="text-base px-8" data-testid="button-hero-mechanic">
              Join as a Mechanic
            </Button>
          </Link>
          <Link href="/mechanics-map">
            <Button size="lg" variant="outline" className="text-base px-8 gap-2" data-testid="button-hero-map">
              <MapPin size={16} />
              Find Mechanics Near Me
              {mapMechanics.length > 0 && (
                <span className="ml-1 px-1.5 py-0.5 rounded-full bg-primary text-primary-foreground text-xs font-bold">
                  {mapMechanics.length}
                </span>
              )}
            </Button>
          </Link>
        </div>
      </section>

      {/* Stats */}
      <section className="border-y border-border py-10">
        <div className="max-w-7xl mx-auto px-6 grid grid-cols-2 md:grid-cols-4 gap-8 text-center">
          {STATS.map((s) => (
            <div key={s.label}>
              <p className="text-3xl font-bold text-primary">{s.value}</p>
              <p className="text-sm text-muted-foreground mt-1">{s.label}</p>
            </div>
          ))}
        </div>
      </section>

      {/* Photo tip banner */}
      <section className="max-w-7xl mx-auto px-6 py-8">
        <div className="rounded-xl border border-primary/20 bg-primary/5 px-6 py-5 flex items-start gap-4">
          <div className="w-10 h-10 rounded-lg bg-primary/10 flex items-center justify-center shrink-0 mt-0.5">
            <Camera size={18} className="text-primary" />
          </div>
          <div>
            <p className="font-semibold text-sm mb-1">Photos help mechanics understand the job before bidding — better photos lead to better quotes.</p>
            <p className="text-sm text-muted-foreground">
              When posting, upload clear photos of warning lights, leaking areas, broken parts, tire damage, engine bay, radiator cap, battery, belts, hoses, or anything you want the mechanic to see.
            </p>
          </div>
        </div>
      </section>

      {/* How it works */}
      <section id="how-it-works" className="max-w-7xl mx-auto px-6 py-16">
        <div className="text-center mb-14">
          <h2 className="text-3xl font-bold">How It Works</h2>
          <p className="text-muted-foreground mt-2">Three steps to get your car fixed right</p>
        </div>
        <div className="grid md:grid-cols-3 gap-8">
          {HOW_IT_WORKS.map((item) => (
            <div key={item.step} className="relative p-6 rounded-xl border border-border bg-card">
              <div className="absolute top-5 right-5 text-6xl font-black text-border opacity-40 select-none">{item.step}</div>
              <div className="w-10 h-10 rounded-lg bg-blue-500/10 border border-blue-500/20 flex items-center justify-center mb-4">
                {item.icon}
              </div>
              <h3 className="font-semibold text-foreground mb-2">{item.title}</h3>
              <p className="text-sm text-muted-foreground leading-relaxed">{item.desc}</p>
            </div>
          ))}
        </div>
      </section>

      {/* Common repair examples */}
      <section id="repair-examples" className="border-t border-border py-16 bg-card/30">
        <div className="max-w-7xl mx-auto px-6">
          <div className="text-center mb-10">
            <h2 className="text-3xl font-bold mb-2">Common Repair Examples</h2>
            <p className="text-muted-foreground max-w-2xl mx-auto text-sm leading-relaxed">
              See how BidWrenx compares to typical shop rates. Independent mechanics often offer more competitive pricing, faster availability, and personalized service.
            </p>
          </div>

          <div className="grid sm:grid-cols-2 lg:grid-cols-4 gap-4 mb-6">
            {REPAIR_EXAMPLES.map((ex) => (
              <div key={ex.title} className="rounded-xl border border-border bg-card p-5 flex flex-col gap-3">
                <div>
                  <span className="inline-block px-2 py-0.5 rounded-full bg-primary/10 text-primary text-xs font-medium mb-2">{ex.category}</span>
                  <h3 className="font-semibold text-sm leading-snug">{ex.title}</h3>
                  <p className="text-xs text-muted-foreground mt-1 leading-relaxed">{ex.desc}</p>
                </div>
                <div className="mt-auto space-y-2 pt-2 border-t border-border">
                  <div className="flex items-center justify-between text-xs">
                    <span className="text-muted-foreground">Avg. shop estimate</span>
                    <span className="font-medium text-muted-foreground line-through">{ex.shopEst}</span>
                  </div>
                  <div className="flex items-center justify-between text-xs">
                    <span className="text-muted-foreground flex items-center gap-1">
                      <TrendingDown size={11} className="text-emerald-400" />
                      Mechanic bid range
                    </span>
                    <span className="font-bold text-emerald-400">{ex.bidRange}</span>
                  </div>
                </div>
              </div>
            ))}
          </div>

          <p className="text-center text-xs text-muted-foreground max-w-2xl mx-auto leading-relaxed">
            Actual prices vary based on vehicle make/model, location, parts availability, and mechanic. BidWrenx does not guarantee savings. Customers may save money, get faster service, or find a mechanic with better availability — results depend on individual bids received.
          </p>
        </div>
      </section>

      {/* Trust signals */}
      <section className="border-t border-border py-16 bg-card/50">
        <div className="max-w-5xl mx-auto px-6 grid md:grid-cols-3 gap-6 text-center">
          <div className="p-5">
            <Shield size={28} className="text-primary mx-auto mb-3" />
            <h3 className="font-semibold mb-1">Verified Mechanics</h3>
            <p className="text-sm text-muted-foreground">Every mechanic is vetted, rated, and reviewed by real customers.</p>
          </div>
          <div className="p-5">
            <Star size={28} className="text-amber-400 mx-auto mb-3" />
            <h3 className="font-semibold mb-1">Competitive Bids</h3>
            <p className="text-sm text-muted-foreground">Get multiple quotes and choose the best price and timeline for you.</p>
          </div>
          <div className="p-5">
            <Clock size={28} className="text-emerald-400 mx-auto mb-3" />
            <h3 className="font-semibold mb-1">Fast Response</h3>
            <p className="text-sm text-muted-foreground">Most jobs receive their first bid within 2 hours of posting.</p>
          </div>
        </div>
      </section>

      {/* CTA */}
      <section className="max-w-3xl mx-auto px-6 py-24 text-center">
        <h2 className="text-3xl font-bold mb-4">Ready to get started?</h2>
        <p className="text-muted-foreground mb-8">Join thousands of car owners and mechanics on BidWrenx.</p>
        <Link href="/register">
          <Button size="lg" className="text-base px-10" data-testid="button-cta-register">
            Create a Free Account
            <ChevronRight size={16} className="ml-1" />
          </Button>
        </Link>
      </section>

      {/* Footer */}
      <footer className="border-t border-border px-6 py-8">
        <div className="max-w-7xl mx-auto flex items-center justify-between">
          <div className="flex items-center gap-2">
            <Wrench size={16} className="text-primary" />
            <span className="font-semibold text-sm">BidWrenx</span>
          </div>
          <p className="text-xs text-muted-foreground">© 2026 BidWrenx. All rights reserved.</p>
        </div>
      </footer>
    </div>
  );
}
