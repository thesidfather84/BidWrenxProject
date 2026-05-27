import { Link } from "wouter";
import { Wrench, ArrowLeft, Shield, AlertTriangle, Phone, CreditCard, Scale, CheckCircle } from "lucide-react";

export default function SafetyPage() {
  return (
    <div className="min-h-screen bg-background text-foreground">
      <nav className="border-b border-border px-6 py-4 flex items-center justify-between max-w-4xl mx-auto">
        <div className="flex items-center gap-2">
          <Wrench size={20} className="text-primary" />
          <span className="font-bold text-lg tracking-tight">BidWrenx</span>
        </div>
        <Link href="/">
          <div className="flex items-center gap-1 text-sm text-muted-foreground hover:text-foreground transition-colors cursor-pointer">
            <ArrowLeft size={14} />
            Back to home
          </div>
        </Link>
      </nav>

      <main className="max-w-3xl mx-auto px-6 py-14">
        <div className="mb-10">
          <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full border border-primary/30 bg-primary/5 text-primary text-xs font-medium mb-5">
            <Shield size={12} />
            Your safety matters
          </div>
          <h1 className="text-3xl font-bold mb-3">Safety & User Protection</h1>
          <p className="text-muted-foreground leading-relaxed">
            BidWrenx is a connection platform. Understanding how it works helps you stay safe, make smart decisions, and protect yourself when hiring a mechanic.
          </p>
        </div>

        <div className="space-y-6">

          {/* BidWrenx is a marketplace */}
          <div className="rounded-xl border border-border bg-card p-6">
            <div className="flex items-center gap-3 mb-4">
              <div className="w-9 h-9 rounded-lg bg-blue-500/10 border border-blue-500/20 flex items-center justify-center">
                <Wrench size={18} className="text-blue-400" />
              </div>
              <h2 className="text-lg font-semibold">BidWrenx Is a Connection Platform Only</h2>
            </div>
            <ul className="space-y-2 text-sm text-muted-foreground">
              <li className="flex items-start gap-2"><CheckCircle size={14} className="text-emerald-400 mt-0.5 shrink-0" />BidWrenx connects you with independent mechanics — it does not employ them</li>
              <li className="flex items-start gap-2"><CheckCircle size={14} className="text-emerald-400 mt-0.5 shrink-0" />BidWrenx does not supervise, inspect, or guarantee any repair work</li>
              <li className="flex items-start gap-2"><CheckCircle size={14} className="text-emerald-400 mt-0.5 shrink-0" />BidWrenx does not warranty parts, labor, or outcomes</li>
              <li className="flex items-start gap-2"><CheckCircle size={14} className="text-emerald-400 mt-0.5 shrink-0" />The contract for repair work is solely between you and the mechanic</li>
            </ul>
          </div>

          {/* Verify before hiring */}
          <div className="rounded-xl border border-border bg-card p-6">
            <div className="flex items-center gap-3 mb-4">
              <div className="w-9 h-9 rounded-lg bg-amber-500/10 border border-amber-500/20 flex items-center justify-center">
                <Shield size={18} className="text-amber-400" />
              </div>
              <h2 className="text-lg font-semibold">Verify Before You Hire</h2>
            </div>
            <p className="text-sm text-muted-foreground mb-3">BidWrenx does not screen, background-check, or verify mechanics. You are responsible for:</p>
            <ul className="space-y-2 text-sm text-muted-foreground">
              <li className="flex items-start gap-2"><CheckCircle size={14} className="text-emerald-400 mt-0.5 shrink-0" />Confirming the mechanic's identity in person before allowing access to your vehicle</li>
              <li className="flex items-start gap-2"><CheckCircle size={14} className="text-emerald-400 mt-0.5 shrink-0" />Verifying their state license or ASE certifications</li>
              <li className="flex items-start gap-2"><CheckCircle size={14} className="text-emerald-400 mt-0.5 shrink-0" />Confirming they carry liability and garage-keeper's insurance</li>
              <li className="flex items-start gap-2"><CheckCircle size={14} className="text-emerald-400 mt-0.5 shrink-0" />Checking their ratings, reviews, and job history on the platform</li>
              <li className="flex items-start gap-2"><CheckCircle size={14} className="text-emerald-400 mt-0.5 shrink-0" />Getting a written estimate and itemized list of parts before work begins</li>
            </ul>
          </div>

          {/* Platform protection */}
          <div className="rounded-xl border border-red-500/20 bg-red-500/5 p-6">
            <div className="flex items-center gap-3 mb-4">
              <div className="w-9 h-9 rounded-lg bg-red-500/10 border border-red-500/20 flex items-center justify-center">
                <Phone size={18} className="text-red-400" />
              </div>
              <h2 className="text-lg font-semibold">Never Share Contact Info Before Acceptance</h2>
            </div>
            <p className="text-sm text-muted-foreground mb-3">
              <strong className="text-foreground">For your protection</strong>, do not share or request phone numbers, emails, or payment app information before a bid is accepted on the platform.
            </p>
            <ul className="space-y-2 text-sm text-muted-foreground">
              <li className="flex items-start gap-2"><AlertTriangle size={14} className="text-red-400 mt-0.5 shrink-0" />Do not pay anyone outside the platform before a bid is formally accepted</li>
              <li className="flex items-start gap-2"><AlertTriangle size={14} className="text-red-400 mt-0.5 shrink-0" />Do not share your phone number in the chat before job acceptance</li>
              <li className="flex items-start gap-2"><AlertTriangle size={14} className="text-red-400 mt-0.5 shrink-0" />Do not use Cash App, Venmo, Zelle, or other apps for deposits or payments before hiring</li>
              <li className="flex items-start gap-2"><AlertTriangle size={14} className="text-red-400 mt-0.5 shrink-0" />Requests to move off-platform are a red flag — report them immediately</li>
            </ul>
          </div>

          {/* Payment safety */}
          <div className="rounded-xl border border-border bg-card p-6">
            <div className="flex items-center gap-3 mb-4">
              <div className="w-9 h-9 rounded-lg bg-emerald-500/10 border border-emerald-500/20 flex items-center justify-center">
                <CreditCard size={18} className="text-emerald-400" />
              </div>
              <h2 className="text-lg font-semibold">Payment Best Practices</h2>
            </div>
            <ul className="space-y-2 text-sm text-muted-foreground">
              <li className="flex items-start gap-2"><CheckCircle size={14} className="text-emerald-400 mt-0.5 shrink-0" />Agree on a full price before work starts — get it in writing</li>
              <li className="flex items-start gap-2"><CheckCircle size={14} className="text-emerald-400 mt-0.5 shrink-0" />Use payment methods that offer buyer protections (credit card, not cash or Zelle)</li>
              <li className="flex items-start gap-2"><CheckCircle size={14} className="text-emerald-400 mt-0.5 shrink-0" />Never pay the full amount upfront — consider paying after work is verified</li>
              <li className="flex items-start gap-2"><CheckCircle size={14} className="text-emerald-400 mt-0.5 shrink-0" />Keep all receipts, invoices, and communication records</li>
            </ul>
          </div>

          {/* Disputes */}
          <div className="rounded-xl border border-border bg-card p-6">
            <div className="flex items-center gap-3 mb-4">
              <div className="w-9 h-9 rounded-lg bg-purple-500/10 border border-purple-500/20 flex items-center justify-center">
                <Scale size={18} className="text-purple-400" />
              </div>
              <h2 className="text-lg font-semibold">Handling Disputes</h2>
            </div>
            <p className="text-sm text-muted-foreground mb-3">
              BidWrenx does not mediate or resolve disputes. If something goes wrong:
            </p>
            <ul className="space-y-2 text-sm text-muted-foreground">
              <li className="flex items-start gap-2"><CheckCircle size={14} className="text-blue-400 mt-0.5 shrink-0" />First, try to resolve it directly with the mechanic or customer</li>
              <li className="flex items-start gap-2"><CheckCircle size={14} className="text-blue-400 mt-0.5 shrink-0" />Contact your auto insurance provider if there is vehicle damage</li>
              <li className="flex items-start gap-2"><CheckCircle size={14} className="text-blue-400 mt-0.5 shrink-0" />File a complaint with your state's Bureau of Automotive Repair if fraud is suspected</li>
              <li className="flex items-start gap-2"><CheckCircle size={14} className="text-blue-400 mt-0.5 shrink-0" />Contact law enforcement for theft, fraud, or criminal conduct</li>
              <li className="flex items-start gap-2"><CheckCircle size={14} className="text-blue-400 mt-0.5 shrink-0" />Small claims court handles disputes under $10,000 in most states</li>
              <li className="flex items-start gap-2"><CheckCircle size={14} className="text-blue-400 mt-0.5 shrink-0" />Use the "Report User" button on the platform for policy violations</li>
            </ul>
          </div>

        </div>

        <div className="mt-10 flex gap-4">
          <Link href="/terms">
            <span className="text-primary hover:underline text-sm cursor-pointer">Read our Terms of Service →</span>
          </Link>
          <Link href="/register">
            <span className="text-primary hover:underline text-sm cursor-pointer">Create Account →</span>
          </Link>
        </div>
      </main>
    </div>
  );
}
