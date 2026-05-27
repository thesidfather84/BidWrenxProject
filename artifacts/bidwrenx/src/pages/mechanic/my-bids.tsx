import { Link } from "wouter";
import { useListMyBids } from "@workspace/api-client-react";
import { AppLayout, PageHeader, StatusBadge, ProtectedRoute, EmptyState } from "@/components/layout";
import { Skeleton } from "@/components/ui/skeleton";
import { Gavel, DollarSign, Clock } from "lucide-react";

export default function MyBids() {
  const { data, isLoading } = useListMyBids();

  return (
    <ProtectedRoute role="mechanic">
      <AppLayout>
        <PageHeader title="My Bids" subtitle="All bids you have submitted" />

        {isLoading ? (
          <div className="space-y-3">
            {[...Array(3)].map((_, i) => <Skeleton key={i} className="h-20 rounded-xl" />)}
          </div>
        ) : !data?.length ? (
          <EmptyState
            icon={<Gavel size={48} />}
            title="No bids yet"
            description="Browse open jobs and submit your first bid."
            action={
              <Link href="/mechanic/jobs">
                <span className="text-primary hover:underline cursor-pointer text-sm">Browse Jobs</span>
              </Link>
            }
          />
        ) : (
          <div className="space-y-3">
            {data.map((bid) => (
              <Link key={bid.id} href={`/mechanic/jobs/${bid.jobId}`}>
                <div
                  data-testid={`card-bid-${bid.id}`}
                  className="rounded-xl border border-border bg-card p-5 hover:border-primary/30 transition-colors cursor-pointer"
                >
                  <div className="flex items-center justify-between gap-4">
                    <div>
                      <p className="font-medium text-sm mb-1">Job #{bid.jobId}</p>
                      {bid.note && (
                        <p className="text-xs text-muted-foreground line-clamp-2">{bid.note}</p>
                      )}
                      <div className="flex items-center gap-3 text-xs text-muted-foreground mt-1.5">
                        <span className="flex items-center gap-1"><DollarSign size={11} />${bid.amount}</span>
                        <span className="flex items-center gap-1"><Clock size={11} />{bid.estimatedDays} day{bid.estimatedDays !== 1 ? "s" : ""}</span>
                        <span>{new Date(bid.createdAt).toLocaleDateString()}</span>
                      </div>
                    </div>
                    <StatusBadge status={bid.status} />
                  </div>
                </div>
              </Link>
            ))}
          </div>
        )}
      </AppLayout>
    </ProtectedRoute>
  );
}
