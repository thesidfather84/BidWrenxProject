import { useState } from "react";
import { Link } from "wouter";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Checkbox } from "@/components/ui/checkbox";
import { AlertTriangle, Shield } from "lucide-react";

interface DisclaimerModalProps {
  open: boolean;
  onConfirm: () => void;
  onCancel: () => void;
  action?: string;
}

export function DisclaimerModal({ open, onConfirm, onCancel, action = "proceed" }: DisclaimerModalProps) {
  const [checked, setChecked] = useState(false);

  return (
    <Dialog open={open} onOpenChange={(o) => { if (!o) onCancel(); }}>
      <DialogContent className="sm:max-w-lg">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <AlertTriangle size={18} className="text-amber-400" />
            Marketplace Disclaimer
          </DialogTitle>
        </DialogHeader>

        <div className="space-y-4 text-sm">
          <div className="rounded-lg border border-amber-500/20 bg-amber-500/5 p-4 text-amber-200 leading-relaxed">
            <strong className="block mb-1 text-amber-300">BidWrenx is a marketplace platform only.</strong>
            BidWrenx does not perform, supervise, inspect, warranty, or guarantee any repair work. Mechanics are independent contractors — not BidWrenx employees. Customers hire mechanics entirely at their own risk.
          </div>

          <ul className="space-y-2 text-muted-foreground">
            <li className="flex items-start gap-2">
              <Shield size={13} className="text-primary mt-0.5 shrink-0" />
              Verify the mechanic's license and insurance before allowing access to your vehicle
            </li>
            <li className="flex items-start gap-2">
              <Shield size={13} className="text-primary mt-0.5 shrink-0" />
              BidWrenx is not responsible for damage, bad repairs, theft, or disputes
            </li>
            <li className="flex items-start gap-2">
              <Shield size={13} className="text-primary mt-0.5 shrink-0" />
              Serious disputes should be handled through insurance, law enforcement, or court
            </li>
          </ul>

          <div className="flex items-start gap-3 pt-2">
            <Checkbox
              id="disclaimer-confirm"
              checked={checked}
              onCheckedChange={(v) => setChecked(!!v)}
              data-testid="checkbox-disclaimer"
            />
            <label htmlFor="disclaimer-confirm" className="text-sm text-foreground cursor-pointer leading-relaxed">
              I understand that BidWrenx is a marketplace only and I am hiring this mechanic at my own risk. I have read the{" "}
              <Link href="/terms" target="_blank">
                <span className="text-primary hover:underline">Terms</span>
              </Link>{" "}
              and{" "}
              <Link href="/safety" target="_blank">
                <span className="text-primary hover:underline">Safety guidelines</span>
              </Link>.
            </label>
          </div>
        </div>

        <DialogFooter>
          <Button variant="outline" onClick={onCancel}>Cancel</Button>
          <Button
            onClick={onConfirm}
            disabled={!checked}
            data-testid="button-confirm-disclaimer"
          >
            {action}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}

interface DisclaimerBannerProps {
  compact?: boolean;
}

export function DisclaimerBanner({ compact }: DisclaimerBannerProps) {
  if (compact) {
    return (
      <div className="flex items-start gap-2 p-3 rounded-lg border border-amber-500/20 bg-amber-500/5 text-xs text-amber-300 mb-4">
        <AlertTriangle size={12} className="mt-0.5 shrink-0" />
        <span>
          <strong>Reminder:</strong> BidWrenx is a marketplace only. We do not supervise, warranty, or guarantee repairs.{" "}
          <Link href="/terms"><span className="underline cursor-pointer">Terms</span></Link>
        </span>
      </div>
    );
  }
  return (
    <div className="flex items-start gap-3 p-4 rounded-xl border border-amber-500/20 bg-amber-500/5 text-sm text-amber-200 mb-6">
      <AlertTriangle size={16} className="mt-0.5 shrink-0 text-amber-400" />
      <div>
        <strong className="text-amber-300 block mb-1">Marketplace Disclaimer</strong>
        BidWrenx connects you with independent mechanics and is not responsible for the quality, safety, or outcome of any repair. Verify the mechanic's credentials before hiring.{" "}
        <Link href="/terms"><span className="underline cursor-pointer">Read full Terms</span></Link>
      </div>
    </div>
  );
}
