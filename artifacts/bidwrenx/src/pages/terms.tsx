import { Link } from "wouter";
import { Wrench, ArrowLeft, AlertTriangle } from "lucide-react";

export default function TermsPage() {
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
          <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full border border-amber-500/30 bg-amber-500/5 text-amber-400 text-xs font-medium mb-5">
            <AlertTriangle size={12} />
            Important — Please Read Carefully
          </div>
          <h1 className="text-3xl font-bold mb-3">Terms of Service & Disclaimer</h1>
          <p className="text-muted-foreground text-sm">Last updated: May 2026</p>
        </div>

        <div className="prose prose-invert prose-sm max-w-none space-y-8">

          <section className="p-6 rounded-xl border border-amber-500/20 bg-amber-500/5">
            <h2 className="text-lg font-bold text-amber-400 mb-3">⚠ Key Disclaimer — Read First</h2>
            <p className="text-foreground leading-relaxed">
              <strong>BidWrenx is a marketplace platform only.</strong> We connect vehicle owners with independent mechanics. BidWrenx does not perform, supervise, inspect, warranty, or guarantee any repair work of any kind. Mechanics listed on BidWrenx are not employees, agents, or contractors of BidWrenx. Customers hire mechanics entirely at their own risk.
            </p>
          </section>

          <section>
            <h2 className="text-xl font-semibold mb-3">1. What BidWrenx Is</h2>
            <p className="text-muted-foreground leading-relaxed">
              BidWrenx operates as an online marketplace that allows vehicle owners ("Customers") to post automotive repair jobs and independent mechanics ("Mechanics") to submit bids for those jobs. BidWrenx provides the platform for these connections but is not a party to any agreement between Customers and Mechanics.
            </p>
          </section>

          <section>
            <h2 className="text-xl font-semibold mb-3">2. Independent Contractor Status</h2>
            <p className="text-muted-foreground leading-relaxed mb-3">
              All Mechanics using BidWrenx are independent contractors, not employees of BidWrenx. Mechanics are solely responsible for:
            </p>
            <ul className="list-disc list-inside space-y-2 text-muted-foreground ml-2">
              <li>The quality, safety, and legality of their repair work</li>
              <li>Their own tools, equipment, parts, and workspace</li>
              <li>Maintaining all required licenses, certifications, and permits</li>
              <li>Carrying appropriate liability insurance and auto repair insurance</li>
              <li>Compliance with all federal, state, and local laws and regulations</li>
              <li>Payment of their own taxes (income, self-employment, etc.)</li>
              <li>Any injuries to themselves or damage to property during repairs</li>
            </ul>
          </section>

          <section>
            <h2 className="text-xl font-semibold mb-3">3. Customer Responsibilities</h2>
            <p className="text-muted-foreground leading-relaxed mb-3">By using BidWrenx as a Customer, you acknowledge and agree that:</p>
            <ul className="list-disc list-inside space-y-2 text-muted-foreground ml-2">
              <li>You are responsible for independently verifying any mechanic's identity, experience, skills, license, and insurance before hiring them</li>
              <li>BidWrenx does not screen, background-check, license-verify, or certify any mechanic</li>
              <li>Ratings and reviews are user-generated and BidWrenx makes no representations about their accuracy</li>
              <li>You hire any mechanic entirely at your own risk and discretion</li>
              <li>Payment for repair services is made between you and the mechanic directly</li>
            </ul>
          </section>

          <section>
            <h2 className="text-xl font-semibold mb-3">4. Limitation of Liability</h2>
            <p className="text-muted-foreground leading-relaxed">
              BidWrenx is not responsible for, and expressly disclaims all liability arising from: vehicle damage, personal injury, theft, bad repairs, incomplete work, missed appointments, part failures, disputes between users, financial losses, or any other direct, indirect, incidental, or consequential damages arising from use of the platform or any repair service arranged through it. Your sole remedy for dissatisfaction with any mechanic is to resolve the matter directly with that mechanic, through insurance, or through legal channels.
            </p>
          </section>

          <section>
            <h2 className="text-xl font-semibold mb-3">5. Anti-Circumvention Policy</h2>
            <p className="text-muted-foreground leading-relaxed mb-3">
              To protect all users, the following are strictly prohibited until a bid is formally accepted on the platform:
            </p>
            <ul className="list-disc list-inside space-y-2 text-muted-foreground ml-2">
              <li>Requesting or sharing phone numbers, email addresses, or other personal contact information</li>
              <li>Requesting or soliciting payment through Cash App, Venmo, Zelle, PayPal, or any off-platform method</li>
              <li>Asking to continue conversations on WhatsApp, Telegram, Snapchat, or other external platforms</li>
              <li>Any other attempt to bypass the BidWrenx platform for communications or payment</li>
            </ul>
            <p className="text-muted-foreground leading-relaxed mt-3">
              Violations may result in account warnings, suspension, or permanent termination. All suspicious activity is flagged for review.
            </p>
          </section>

          <section>
            <h2 className="text-xl font-semibold mb-3">6. Dispute Resolution</h2>
            <p className="text-muted-foreground leading-relaxed">
              Disputes between Customers and Mechanics should be addressed first between the parties directly. BidWrenx does not mediate, arbitrate, or resolve disputes. Serious matters — including fraud, theft, injury, or criminal conduct — should be reported to appropriate law enforcement, your insurance provider, or handled through the civil court system. You may report a user on the platform for policy violations.
            </p>
          </section>

          <section>
            <h2 className="text-xl font-semibold mb-3">7. No Warranty</h2>
            <p className="text-muted-foreground leading-relaxed">
              BidWrenx is provided "as is" without any warranty of any kind. We do not warrant that the platform will be error-free, uninterrupted, or that any information on the platform is accurate, complete, or current.
            </p>
          </section>

          <section>
            <h2 className="text-xl font-semibold mb-3">8. Changes to These Terms</h2>
            <p className="text-muted-foreground leading-relaxed">
              BidWrenx may update these Terms at any time. Continued use of the platform after changes are posted constitutes acceptance of the updated Terms.
            </p>
          </section>

          <div className="mt-10 flex gap-4">
            <Link href="/safety">
              <span className="text-primary hover:underline text-sm cursor-pointer">Read our Safety Guidelines →</span>
            </Link>
            <Link href="/register">
              <span className="text-primary hover:underline text-sm cursor-pointer">Create Account →</span>
            </Link>
          </div>
        </div>
      </main>
    </div>
  );
}
