import { useState } from "react";
import { useRoute, useLocation } from "wouter";
import { useGetMechanicPublicProfile, getGetMechanicPublicProfileQueryKey } from "@workspace/api-client-react";
import { AppLayout, PageHeader } from "@/components/layout";
import { Button } from "@/components/ui/button";
import { Skeleton } from "@/components/ui/skeleton";
import { UserAvatar } from "@/components/user-avatar";
import { useAuth } from "@/contexts/auth";
import { useToast } from "@/hooks/use-toast";
import {
  Star, MapPin, BadgeCheck, Wrench, Trophy, Share2,
  Link2, Twitter, Facebook, CheckCircle2, Clock,
  ArrowLeft, Copy, Check,
} from "lucide-react";
import { cn } from "@/lib/utils";

function ShareButton({
  icon: Icon, label, onClick, className = "",
}: { icon: any; label: string; onClick: () => void; className?: string }) {
  return (
    <button
      onClick={onClick}
      className={cn(
        "flex items-center gap-2 px-4 py-2.5 rounded-lg border border-border text-sm font-medium transition-colors hover:bg-muted/60",
        className
      )}
    >
      <Icon size={15} />
      {label}
    </button>
  );
}

function BadgePill({ badge }: { badge: string }) {
  const config: Record<string, { icon: any; color: string }> = {
    "Verified Pro": { icon: BadgeCheck, color: "bg-emerald-500/10 text-emerald-400 border-emerald-500/20" },
    "Top Rated": { icon: Star, color: "bg-amber-500/10 text-amber-400 border-amber-500/20" },
    "Experienced": { icon: Trophy, color: "bg-blue-500/10 text-blue-400 border-blue-500/20" },
  };
  const { icon: Icon, color } = config[badge] ?? { icon: CheckCircle2, color: "bg-muted text-muted-foreground border-border" };
  return (
    <span className={cn("inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-xs font-medium border", color)}>
      <Icon size={11} />
      {badge}
    </span>
  );
}

export default function MechanicProfilePage() {
  const [, params] = useRoute("/mechanic/:id");
  const [, setLocation] = useLocation();
  const { toast } = useToast();
  const { user } = useAuth();
  const [copied, setCopied] = useState(false);

  const mechanicId = params?.id ? parseInt(params.id, 10) : NaN;
  const { data: profile, isLoading, error } = useGetMechanicPublicProfile(mechanicId, {
    query: { queryKey: getGetMechanicPublicProfileQueryKey(mechanicId), enabled: !isNaN(mechanicId) },
  });

  const profileUrl = `${window.location.origin}${import.meta.env.BASE_URL}mechanic/${mechanicId}`;
  const shareText = profile
    ? `Check out ${profile.name} on BidWrenx — a top mechanic ready to fix your car! ${profileUrl}`
    : profileUrl;

  const referralUrl = profile?.referralCode
    ? `${window.location.origin}${import.meta.env.BASE_URL}register?ref=${profile.referralCode}`
    : null;

  const copyLink = async () => {
    await navigator.clipboard.writeText(referralUrl ?? profileUrl);
    setCopied(true);
    toast({ title: "Link copied to clipboard!" });
    setTimeout(() => setCopied(false), 2000);
  };

  const shareTwitter = () => {
    window.open(`https://twitter.com/intent/tweet?text=${encodeURIComponent(shareText)}`, "_blank");
  };

  const shareFacebook = () => {
    window.open(`https://www.facebook.com/sharer/sharer.php?u=${encodeURIComponent(profileUrl)}`, "_blank");
  };

  const shareWhatsApp = () => {
    window.open(`https://wa.me/?text=${encodeURIComponent(shareText)}`, "_blank");
  };

  if (isLoading) {
    return (
      <AppLayout>
        <div className="max-w-2xl mx-auto space-y-5">
          <Skeleton className="h-48 rounded-2xl" />
          <Skeleton className="h-28 rounded-2xl" />
          <Skeleton className="h-36 rounded-2xl" />
        </div>
      </AppLayout>
    );
  }

  if (error || !profile) {
    return (
      <AppLayout>
        <div className="max-w-2xl mx-auto text-center py-20">
          <Wrench size={40} className="mx-auto mb-4 text-muted-foreground opacity-30" />
          <h2 className="text-lg font-bold mb-2">Mechanic not found</h2>
          <p className="text-muted-foreground text-sm mb-6">This mechanic profile doesn't exist or has been removed.</p>
          <Button variant="outline" onClick={() => setLocation(-1 as any)} className="gap-2">
            <ArrowLeft size={14} /> Go back
          </Button>
        </div>
      </AppLayout>
    );
  }

  const memberSince = new Date(profile.createdAt ?? Date.now()).toLocaleDateString("en-US", { year: "numeric", month: "long" });

  return (
    <AppLayout>
      <div className="max-w-2xl mx-auto space-y-5">
        {/* Back button */}
        <button
          onClick={() => setLocation(-1 as any)}
          className="flex items-center gap-1.5 text-sm text-muted-foreground hover:text-foreground transition-colors"
        >
          <ArrowLeft size={14} /> Back
        </button>

        {/* Profile card */}
        <div className="rounded-2xl border border-border bg-card overflow-hidden">
          {/* Header gradient strip */}
          <div className="h-24 bg-gradient-to-br from-primary/20 via-primary/10 to-transparent relative">
            <div className="absolute -bottom-10 left-6">
              <UserAvatar name={profile.name} photoUrl={profile.photoUrl} size="lg" />
            </div>
          </div>

          <div className="pt-14 pb-6 px-6">
            <div className="flex items-start justify-between gap-4 flex-wrap">
              <div>
                <div className="flex items-center gap-2 flex-wrap">
                  <h1 className="text-xl font-bold">{profile.name}</h1>
                  {profile.adminVerifiedMechanic && (
                    <BadgeCheck size={18} className="text-emerald-400" />
                  )}
                </div>
                <div className="flex items-center gap-3 mt-1 flex-wrap">
                  {profile.rating != null && (
                    <span className="flex items-center gap-1 text-amber-400 text-sm font-medium">
                      <Star size={13} fill="currentColor" />
                      {profile.rating.toFixed(1)}
                      <span className="text-muted-foreground font-normal text-xs">({profile.reviewCount} reviews)</span>
                    </span>
                  )}
                  {profile.location && (
                    <span className="flex items-center gap-1 text-muted-foreground text-sm">
                      <MapPin size={12} />
                      {profile.location}
                    </span>
                  )}
                  <span className="flex items-center gap-1 text-muted-foreground text-sm">
                    <Clock size={12} />
                    Member since {memberSince}
                  </span>
                </div>
              </div>

              {/* Stats chips */}
              <div className="flex gap-3">
                <div className="text-center">
                  <p className="text-2xl font-bold text-primary">{profile.completedJobs}</p>
                  <p className="text-xs text-muted-foreground">Jobs done</p>
                </div>
                <div className="text-center">
                  <p className="text-2xl font-bold text-primary">{profile.reviewCount}</p>
                  <p className="text-xs text-muted-foreground">Reviews</p>
                </div>
              </div>
            </div>

            {/* Badges */}
            {profile.badges.length > 0 && (
              <div className="flex gap-2 flex-wrap mt-4">
                {profile.badges.map((b) => <BadgePill key={b} badge={b} />)}
              </div>
            )}

            {/* Bio */}
            {profile.bio && (
              <p className="text-sm text-muted-foreground mt-4 leading-relaxed">{profile.bio}</p>
            )}

            {/* Specialties */}
            {profile.specialties && (
              <div className="mt-4">
                <p className="text-xs font-semibold text-muted-foreground uppercase tracking-wide mb-2">Specialties</p>
                <div className="flex flex-wrap gap-1.5">
                  {profile.specialties.split(",").map((s) => s.trim()).filter(Boolean).map((s) => (
                    <span key={s} className="text-xs px-2.5 py-1 rounded-full bg-primary/10 text-primary border border-primary/20">
                      {s}
                    </span>
                  ))}
                </div>
              </div>
            )}
          </div>
        </div>

        {/* Share card */}
        <div className="rounded-2xl border border-border bg-card p-6">
          <div className="flex items-center gap-2 mb-4">
            <Share2 size={16} className="text-primary" />
            <h2 className="font-semibold">Share Profile</h2>
          </div>

          {/* Referral link section */}
          {profile.referralCode && (
            <div className="mb-4 p-3 rounded-xl bg-primary/5 border border-primary/20">
              <p className="text-xs text-muted-foreground mb-1">Referral link — new users who sign up via this link are tracked</p>
              <div className="flex items-center gap-2">
                <code className="text-xs font-mono flex-1 truncate text-primary">
                  {`${window.location.origin}${import.meta.env.BASE_URL}register?ref=${profile.referralCode}`}
                </code>
                <button
                  onClick={copyLink}
                  className="shrink-0 p-1.5 rounded-lg hover:bg-primary/10 text-muted-foreground hover:text-primary transition-colors"
                >
                  {copied ? <Check size={13} className="text-emerald-400" /> : <Copy size={13} />}
                </button>
              </div>
            </div>
          )}

          {/* Share buttons */}
          <div className="flex flex-wrap gap-2">
            <ShareButton icon={copied ? Check : Link2} label={copied ? "Copied!" : "Copy link"} onClick={copyLink} />
            <ShareButton icon={Twitter} label="Twitter / X" onClick={shareTwitter} className="hover:border-sky-500/40 hover:text-sky-400" />
            <ShareButton icon={Facebook} label="Facebook" onClick={shareFacebook} className="hover:border-blue-500/40 hover:text-blue-400" />
            <ShareButton icon={Share2} label="WhatsApp" onClick={shareWhatsApp} className="hover:border-emerald-500/40 hover:text-emerald-400" />
          </div>

          {/* Hire CTA */}
          {user && user.role === "customer" && (
            <div className="mt-4 pt-4 border-t border-border">
              <Button
                className="w-full gap-2"
                onClick={() => setLocation("/customer/jobs/new")}
              >
                <Wrench size={14} />
                Post a Job for {profile.name}
              </Button>
            </div>
          )}
          {!user && (
            <div className="mt-4 pt-4 border-t border-border">
              <Button className="w-full gap-2" onClick={() => setLocation("/register")}>
                Sign up to book {profile.name}
              </Button>
            </div>
          )}
        </div>
      </div>
    </AppLayout>
  );
}
