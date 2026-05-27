import { cn } from "@/lib/utils";
import { Mail, Phone, ShieldCheck, FileText, BadgeCheck, Clock, ShieldX } from "lucide-react";
import { Tooltip, TooltipContent, TooltipTrigger } from "@/components/ui/tooltip";

export interface VerificationInfo {
  emailVerified: boolean;
  phoneVerified: boolean;
  identityVerificationStatus: "none" | "pending" | "approved" | "rejected";
  insuranceDocumentUploaded: boolean;
  certificationDocumentUploaded: boolean;
  adminVerifiedMechanic: boolean;
  role?: string;
}

interface BadgeProps {
  icon: React.ReactNode;
  label: string;
  color: string;
  tooltip: string;
}

function Badge({ icon, label, color, tooltip }: BadgeProps) {
  return (
    <Tooltip>
      <TooltipTrigger asChild>
        <span className={cn(
          "inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-xs font-medium border cursor-default",
          color
        )}>
          {icon}
          {label}
        </span>
      </TooltipTrigger>
      <TooltipContent>{tooltip}</TooltipContent>
    </Tooltip>
  );
}

export function VerificationBadges({
  info,
  compact = false,
}: {
  info: VerificationInfo;
  compact?: boolean;
}) {
  const badges: BadgeProps[] = [];

  if (info.adminVerifiedMechanic) {
    badges.push({
      icon: <BadgeCheck size={11} />,
      label: "Verified profile",
      color: "bg-emerald-500/10 text-emerald-400 border-emerald-500/30",
      tooltip: "This mechanic's identity and documents have been reviewed by the BidWrenx team.",
    });
  } else if (info.identityVerificationStatus === "pending") {
    badges.push({
      icon: <Clock size={11} />,
      label: "ID pending",
      color: "bg-amber-500/10 text-amber-400 border-amber-500/30",
      tooltip: "Verification request is under review.",
    });
  } else if (info.identityVerificationStatus === "rejected") {
    badges.push({
      icon: <ShieldX size={11} />,
      label: "ID not approved",
      color: "bg-red-500/10 text-red-400 border-red-500/30",
      tooltip: "Verification was not approved.",
    });
  }

  if (!compact) {
    if (info.emailVerified) {
      badges.push({
        icon: <Mail size={11} />,
        label: "Email verified",
        color: "bg-blue-500/10 text-blue-400 border-blue-500/30",
        tooltip: "Email address has been verified.",
      });
    }

    if (info.phoneVerified) {
      badges.push({
        icon: <Phone size={11} />,
        label: "Phone verified",
        color: "bg-blue-500/10 text-blue-400 border-blue-500/30",
        tooltip: "Phone number has been verified.",
      });
    }

    const docsUploaded = info.insuranceDocumentUploaded || info.certificationDocumentUploaded;
    if (docsUploaded && !info.adminVerifiedMechanic) {
      badges.push({
        icon: <FileText size={11} />,
        label: "Docs submitted",
        color: "bg-purple-500/10 text-purple-400 border-purple-500/30",
        tooltip: "Documents have been submitted for review.",
      });
    }
  }

  if (badges.length === 0) return null;

  return (
    <div className="flex flex-wrap gap-1.5">
      {badges.map((b) => (
        <Badge key={b.label} {...b} />
      ))}
    </div>
  );
}

export function VerifiedBadgeIcon({ size = 14 }: { size?: number }) {
  return (
    <Tooltip>
      <TooltipTrigger asChild>
        <BadgeCheck size={size} className="text-emerald-400 shrink-0 cursor-default" />
      </TooltipTrigger>
      <TooltipContent>Verified profile</TooltipContent>
    </Tooltip>
  );
}
