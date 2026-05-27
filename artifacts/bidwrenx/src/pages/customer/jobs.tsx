import { Link } from "wouter";
import { useListMyJobs } from "@workspace/api-client-react";
import { AppLayout, PageHeader, StatusBadge, ProtectedRoute, EmptyState } from "@/components/layout";
import { Button } from "@/components/ui/button";
import { Skeleton } from "@/components/ui/skeleton";
import { PlusCircle, Briefcase, Gavel, MapPin, Calendar } from "lucide-react";

export default function CustomerJobs() {
  const { data, isLoading } = useListMyJobs();

  return (
    <ProtectedRoute role="customer">
      <AppLayout>
        <PageHeader
          title="My Jobs"
          subtitle="All repair jobs you have posted"
          action={
            <Link href="/customer/jobs/new">
              <Button size="sm" data-testid="button-new-job">
                <PlusCircle size={14} className="mr-1" />
                Post a Job
              </Button>
            </Link>
          }
        />

        {isLoading ? (
          <div className="space-y-3">
            {[...Array(3)].map((_, i) => <Skeleton key={i} className="h-24 rounded-xl" />)}
          </div>
        ) : !data?.length ? (
          <EmptyState
            icon={<Briefcase size={48} />}
            title="No jobs posted yet"
            description="Post your first job to start receiving bids from local mechanics."
            action={
              <Link href="/customer/jobs/new">
                <Button data-testid="button-post-first-job">
                  <PlusCircle size={14} className="mr-1" />
                  Post Your First Job
                </Button>
              </Link>
            }
          />
        ) : (
          <div className="space-y-3">
            {data.map((job) => (
              <Link key={job.id} href={`/customer/jobs/${job.id}`}>
                <div
                  data-testid={`card-job-${job.id}`}
                  className="rounded-xl border border-border bg-card p-5 hover:border-primary/30 transition-colors cursor-pointer"
                >
                  <div className="flex items-start justify-between gap-4">
                    <div className="min-w-0 flex-1">
                      <div className="flex items-center gap-2 mb-1">
                        <h3 className="font-semibold text-foreground">{job.title}</h3>
                        <StatusBadge status={job.status} />
                      </div>
                      <p className="text-sm text-muted-foreground mb-3 line-clamp-2">{job.description}</p>
                      <div className="flex items-center gap-4 text-xs text-muted-foreground">
                        <span className="flex items-center gap-1">
                          <MapPin size={11} />
                          {job.location}
                        </span>
                        <span className="flex items-center gap-1">
                          <Calendar size={11} />
                          {new Date(job.createdAt).toLocaleDateString()}
                        </span>
                        <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full bg-muted text-xs">
                          {job.category}
                        </span>
                      </div>
                    </div>
                    <div className="text-right shrink-0">
                      <div className="flex items-center gap-1 text-sm font-medium text-foreground justify-end">
                        <Gavel size={14} className="text-primary" />
                        {job.bidCount}
                      </div>
                      <p className="text-xs text-muted-foreground">bids</p>
                      {(job.budgetMin || job.budgetMax) && (
                        <p className="text-xs text-muted-foreground mt-1">
                          ${job.budgetMin ?? "?"} – ${job.budgetMax ?? "?"}
                        </p>
                      )}
                    </div>
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
