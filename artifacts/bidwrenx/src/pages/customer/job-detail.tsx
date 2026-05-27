import { useParams, useLocation } from "wouter";
import { useState } from "react";
import { useGetJob, useAcceptBid, getGetJobQueryKey, getGetCustomerDashboardQueryKey } from "@workspace/api-client-react";
import { useQueryClient } from "@tanstack/react-query";
import { AppLayout, StatusBadge, ProtectedRoute, BreadcrumbNav } from "@/components/layout";
import { DisclaimerModal, DisclaimerBanner } from "@/components/disclaimer-modal";
import { ReportUserButton } from "@/components/report-user";
import { TrustBadges } from "@/components/trust-badge";
import { JobPhotoGallery } from "@/components/job-photo-gallery";
import { Button } from "@/components/ui/button";
import { Skeleton } from "@/components/ui/skeleton";
import { useToast } from "@/hooks/use-toast";
import { Star, MapPin, Calendar, Clock, DollarSign, MessageSquare, CheckCircle } from "lucide-react";

function BidCard({ bid, jobCustomerId, currentUserId, jobId, jobStatus }: {
  bid: any;
  jobCustomerId: number;
  currentUserId: number;
  jobId: number;
  jobStatus: string;
}) {
  const { toast } = useToast();
  const queryClient = useQueryClient();
  const [, setLocation] = useLocation();
  const [showDisclaimer, setShowDisclaimer] = useState(false);
  const acceptBid = useAcceptBid();

  const handleAccept = () => {
    acceptBid.mutate({ id: bid.id }, {
      onSuccess: () => {
        queryClient.invalidateQueries({ queryKey: getGetJobQueryKey(jobId) });
        queryClient.invalidateQueries({ queryKey: getGetCustomerDashboardQueryKey() });
        toast({ title: "Bid accepted!", description: `You've accepted ${bid.mechanicName}'s bid.` });
      },
      onError: () => toast({ title: "Failed to accept bid", variant: "destructive" }),
    });
  };

  return (
    <>
      <div data-testid={`card-bid-${bid.id}`} className="rounded-xl border border-border bg-card p-5">
        <div className="flex items-start justify-between gap-4 mb-3">
          <div className="flex items-center gap-3">
            <div className="w-9 h-9 rounded-full bg-primary/20 flex items-center justify-center text-primary font-semibold text-sm shrink-0">
              {bid.mechanicName[0]}
            </div>
            <div>
              <p className="font-semibold text-sm">{bid.mechanicName}</p>
              <TrustBadges
                rating={bid.mechanicRating}
                reviewCount={bid.mechanicReviewCount}
                flaggedForReview={bid.mechanicFlagged}
                warningCount={bid.mechanicWarnings}
              />
            </div>
          </div>
          <div className="text-right">
            <p className="text-xl font-bold text-primary">${bid.amount.toFixed(0)}</p>
            <p className="text-xs text-muted-foreground flex items-center gap-1 justify-end">
              <Clock size={10} />
              {bid.estimatedDays} day{bid.estimatedDays !== 1 ? "s" : ""}
            </p>
          </div>
        </div>
        {bid.note && (
          <p className="text-sm text-muted-foreground bg-muted/30 rounded-lg p-3 mb-3 leading-relaxed">{bid.note}</p>
        )}
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-3">
            <StatusBadge status={bid.status} />
            <ReportUserButton userId={bid.mechanicId} userName={bid.mechanicName} jobId={jobId} />
          </div>
          {jobCustomerId === currentUserId && bid.status === "pending" && jobStatus === "open" && (
            <div className="flex gap-2">
              <Button
                size="sm"
                variant="outline"
                onClick={() => setLocation(`/messages/${jobId}/${bid.mechanicId}`)}
                data-testid={`button-message-mechanic-${bid.id}`}
              >
                <MessageSquare size={12} className="mr-1" />
                Message
              </Button>
              <Button
                size="sm"
                onClick={() => setShowDisclaimer(true)}
                data-testid={`button-accept-bid-${bid.id}`}
              >
                <CheckCircle size={12} className="mr-1" />
                Accept Bid
              </Button>
            </div>
          )}
        </div>
      </div>

      <DisclaimerModal
        open={showDisclaimer}
        action="Accept Bid"
        onConfirm={() => { setShowDisclaimer(false); handleAccept(); }}
        onCancel={() => setShowDisclaimer(false)}
      />
    </>
  );
}

export default function CustomerJobDetail() {
  const params = useParams<{ id: string }>();
  const id = parseInt(params.id ?? "0", 10);
  const { data: job, isLoading } = useGetJob(id, { query: { enabled: !!id, queryKey: getGetJobQueryKey(id) } });

  const userStr = localStorage.getItem("bidwrenx_user");
  const currentUser = userStr ? JSON.parse(userStr) : null;

  return (
    <ProtectedRoute role="customer">
      <AppLayout>
        <BreadcrumbNav items={[{ label: "My Jobs", href: "/customer/jobs" }, { label: "Job Detail" }]} />

        {isLoading ? (
          <div className="space-y-4">
            <Skeleton className="h-40 rounded-xl" />
            <Skeleton className="h-64 rounded-xl" />
          </div>
        ) : !job ? (
          <p className="text-muted-foreground">Job not found.</p>
        ) : (
          <div className="space-y-6">
            {/* Job details card */}
            <div className="rounded-xl border border-border bg-card p-6">
              <div className="flex items-start justify-between gap-4 mb-3">
                <h1 className="text-xl font-bold">{job.title}</h1>
                <StatusBadge status={job.status} />
              </div>
              <p className="text-sm text-muted-foreground leading-relaxed mb-4">{job.description}</p>

              {job.photos && job.photos.length > 0 && (
                <div className="mb-4">
                  <p className="text-xs text-muted-foreground mb-2">Repair Photos</p>
                  <JobPhotoGallery photos={job.photos} />
                </div>
              )}

              <div className="grid grid-cols-2 md:grid-cols-4 gap-4 text-sm">
                <div>
                  <p className="text-xs text-muted-foreground mb-0.5">Vehicle</p>
                  <p className="font-medium">{job.vehicleYear} {job.vehicleMake} {job.vehicleModel}</p>
                </div>
                <div>
                  <p className="text-xs text-muted-foreground mb-0.5">Category</p>
                  <p className="font-medium">{job.category}</p>
                </div>
                <div>
                  <p className="text-xs text-muted-foreground mb-0.5">Location</p>
                  <p className="font-medium flex items-center gap-1"><MapPin size={12} />{job.location}</p>
                </div>
                {(job.budgetMin || job.budgetMax) && (
                  <div>
                    <p className="text-xs text-muted-foreground mb-0.5">Budget</p>
                    <p className="font-medium flex items-center gap-1">
                      <DollarSign size={12} />
                      {job.budgetMin ?? "?"} – {job.budgetMax ?? "?"}
                    </p>
                  </div>
                )}
              </div>
              <p className="text-xs text-muted-foreground mt-4 flex items-center gap-1">
                <Calendar size={11} />
                Posted {new Date(job.createdAt).toLocaleDateString()}
              </p>
            </div>

            {/* Bids */}
            <div>
              <div className="flex items-center justify-between mb-3">
                <h2 className="font-semibold">
                  Bids Received{" "}
                  <span className="text-muted-foreground font-normal text-sm">({job.bids?.length ?? 0})</span>
                </h2>
              </div>
              {job.status === "open" && (job.bids?.length ?? 0) > 0 && (
                <DisclaimerBanner compact />
              )}
              {!job.bids?.length ? (
                <div className="rounded-xl border border-border bg-card p-8 text-center text-muted-foreground text-sm">
                  No bids received yet. Mechanics will start bidding soon.
                </div>
              ) : (
                <div className="space-y-3">
                  {job.bids.map((bid) => (
                    <BidCard
                      key={bid.id}
                      bid={bid}
                      jobCustomerId={job.customerId}
                      currentUserId={currentUser?.id}
                      jobId={id}
                      jobStatus={job.status}
                    />
                  ))}
                </div>
              )}
            </div>
          </div>
        )}
      </AppLayout>
    </ProtectedRoute>
  );
}
