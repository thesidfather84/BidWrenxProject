import { Star, CheckCircle, Briefcase, AlertTriangle } from "lucide-react";
import { cn } from "@/lib/utils";

interface TrustBadgesProps {
  rating?: number | null;
  reviewCount?: number;
  flaggedForReview?: boolean;
  warningCount?: number;
  size?: "sm" | "md";
}

export function TrustBadges({ rating, reviewCount, flaggedForReview, warningCount, size = "sm" }: TrustBadgesProps) {
  const textSize = size === "sm" ? "text-xs" : "text-sm";
  const iconSize = size === "sm" ? 11 : 14;

  return (
    <div className="flex items-center flex-wrap gap-2">
      {rating != null && (
        <span className={cn("flex items-center gap-1 text-amber-400 font-medium", textSize)}>
          <Star size={iconSize} fill="currentColor" />
          {rating.toFixed(1)}
        </span>
      )}
      {reviewCount != null && reviewCount > 0 && (
        <span className={cn("flex items-center gap-1 text-muted-foreground", textSize)}>
          <Briefcase size={iconSize} />
          {reviewCount} job{reviewCount !== 1 ? "s" : ""}
        </span>
      )}
      {flaggedForReview && (
        <span className={cn("flex items-center gap-1 text-red-400", textSize)} title="This account is under review">
          <AlertTriangle size={iconSize} />
          Under Review
        </span>
      )}
      {!flaggedForReview && (warningCount === 0 || warningCount == null) && (
        <span className={cn("flex items-center gap-1 text-muted-foreground/60", textSize)} title="No policy violations">
          <CheckCircle size={iconSize} />
          No warnings
        </span>
      )}
      {!flaggedForReview && warningCount != null && warningCount > 0 && (
        <span className={cn("flex items-center gap-1 text-amber-400", textSize)} title={`${warningCount} warning(s) on account`}>
          <AlertTriangle size={iconSize} />
          {warningCount} warning{warningCount !== 1 ? "s" : ""}
        </span>
      )}
    </div>
  );
}

export function VerifiedBadge({ size = "sm" }: { size?: "sm" | "md" }) {
  return (
    <span className={cn(
      "inline-flex items-center gap-1 px-1.5 py-0.5 rounded text-xs font-medium border",
      "bg-blue-500/10 text-blue-400 border-blue-500/20"
    )}>
      <CheckCircle size={size === "sm" ? 10 : 12} />
      Verified
    </span>
  );
}
