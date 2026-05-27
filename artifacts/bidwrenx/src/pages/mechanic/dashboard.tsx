import { Link } from "wouter";
import { useGetMechanicDashboard } from "@workspace/api-client-react";
import { AppLayout, PageHeader, StatCard, StatusBadge, ProtectedRoute, EmptyState } from "@/components/layout";
import { Skeleton } from "@/components/ui/skeleton";
import { Button } from "@/components/ui/button";
import { Search, Gavel, MapPin, DollarSign } from "lucide-react";

export default function MechanicDashboard() {
  const { data, isLoading } = useGetMechanicDashboard();

  return (
    <ProtectedRoute role="mechanic">
      <AppLayout>
        <PageHeader
          title="Dashboard"
          subtitle="Your bidding activity at a glance"
          action={
            <Link href="/mechanic/jobs">
              <Button size="sm" data-testid="button-browse-jobs">
                <Search size={14} className="mr-1" />
                Browse Jobs
              </Button>
            </Link>
          }
        />

        {isLoading ? (
          <div className="space-y-6">
            <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
              {[...Array(4)].map((_, i) => <Skeleton key={i} className="h-28 rounded-lg" />)}
            </div>
            <Skeleton className="h-64 rounded-xl" />
          </div>
        ) : (
          <div className="space-y-6">
            <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
              <StatCard label="Total Bids" value={data?.totalBids ?? 0} color="blue" />
              <StatCard label="Active Bids" value={data?.activeBids ?? 0} sub="Pending response" color="yellow" />
              <StatCard label="Accepted Bids" value={data?.acceptedBids ?? 0} color="green" />
              <StatCard label="Open Jobs" value={data?.availableJobs ?? 0} sub="Available to bid" color="purple" />
            </div>

            {/* Recent bids */}
            {(data?.recentBids?.length ?? 0) > 0 && (
              <div className="rounded-xl border border-border bg-card">
                <div className="flex items-center justify-between px-5 py-4 border-b border-border">
                  <h2 className="font-semibold text-sm">Recent Bids</h2>
                  <Link href="/mechanic/bids">
                    <span className="text-xs text-primary hover:underline cursor-pointer">View all</span>
                  </Link>
                </div>
                <div className="divide-y divide-border">
                  {data?.recentBids.map((bid) => (
                    <Link key={bid.id} href={`/mechanic/jobs/${bid.jobId}`}>
                      <div data-testid={`card-bid-${bid.id}`} className="flex items-center justify-between px-5 py-3.5 hover:bg-muted/30 transition-colors cursor-pointer">
                        <div>
                          <p className="text-sm font-medium">Job #{bid.jobId}</p>
                          <div className="flex items-center gap-1 text-xs text-muted-foreground mt-0.5">
                            <DollarSign size={11} />
                            Bid: ${bid.amount}
                          </div>
                        </div>
                        <StatusBadge status={bid.status} />
                      </div>
                    </Link>
                  ))}
                </div>
              </div>
            )}

            {/* Available jobs */}
            <div className="rounded-xl border border-border bg-card">
              <div className="flex items-center justify-between px-5 py-4 border-b border-border">
                <h2 className="font-semibold text-sm">Open Jobs Near You</h2>
                <Link href="/mechanic/jobs">
                  <span className="text-xs text-primary hover:underline cursor-pointer">Browse all</span>
                </Link>
              </div>
              {!data?.recentJobs?.length ? (
                <EmptyState
                  icon={<Gavel size={36} />}
                  title="No open jobs yet"
                  description="Check back soon — new jobs are posted every day."
                />
              ) : (
                <div className="divide-y divide-border">
                  {data.recentJobs.map((job) => (
                    <Link key={job.id} href={`/mechanic/jobs/${job.id}`}>
                      <div data-testid={`card-job-${job.id}`} className="flex items-center justify-between px-5 py-3.5 hover:bg-muted/30 transition-colors cursor-pointer">
                        <div className="min-w-0 flex-1">
                          <p className="text-sm font-medium truncate">{job.title}</p>
                          <div className="flex items-center gap-3 text-xs text-muted-foreground mt-0.5">
                            <span>{job.vehicleYear} {job.vehicleMake} {job.vehicleModel}</span>
                            <span className="flex items-center gap-0.5"><MapPin size={10} />{job.location}</span>
                          </div>
                        </div>
                        {(job.budgetMin || job.budgetMax) && (
                          <p className="text-xs text-muted-foreground shrink-0 ml-4">
                            ${job.budgetMin ?? "?"}–${job.budgetMax ?? "?"}
                          </p>
                        )}
                      </div>
                    </Link>
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
