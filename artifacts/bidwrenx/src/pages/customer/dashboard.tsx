import { Link } from "wouter";
import { useGetCustomerDashboard } from "@workspace/api-client-react";
import { AppLayout, PageHeader, StatCard, StatusBadge, ProtectedRoute, EmptyState } from "@/components/layout";
import { Button } from "@/components/ui/button";
import { Skeleton } from "@/components/ui/skeleton";
import { PlusCircle, Briefcase, Gavel } from "lucide-react";

function DashboardContent() {
  const { data, isLoading } = useGetCustomerDashboard();

  if (isLoading) {
    return (
      <div>
        <div className="grid grid-cols-2 md:grid-cols-4 gap-4 mb-8">
          {[...Array(4)].map((_, i) => <Skeleton key={i} className="h-28 rounded-lg" />)}
        </div>
        <Skeleton className="h-64 rounded-xl" />
      </div>
    );
  }

  return (
    <div>
      <div className="grid grid-cols-2 md:grid-cols-4 gap-4 mb-8">
        <StatCard label="Total Jobs" value={data?.totalJobs ?? 0} color="blue" />
        <StatCard label="Open Jobs" value={data?.openJobs ?? 0} sub="Accepting bids" color="green" />
        <StatCard label="In Progress" value={data?.inProgressJobs ?? 0} color="yellow" />
        <StatCard label="Bids Received" value={data?.totalBidsReceived ?? 0} color="purple" />
      </div>

      {/* Recent jobs */}
      <div className="rounded-xl border border-border bg-card">
        <div className="flex items-center justify-between px-5 py-4 border-b border-border">
          <h2 className="font-semibold text-sm">Recent Jobs</h2>
          <Link href="/customer/jobs">
            <span className="text-xs text-primary hover:underline cursor-pointer">View all</span>
          </Link>
        </div>
        {!data?.recentJobs?.length ? (
          <EmptyState
            icon={<Briefcase size={40} />}
            title="No jobs yet"
            description="Post your first repair job and start receiving bids from mechanics."
            action={
              <Link href="/customer/jobs/new">
                <Button size="sm" data-testid="button-post-first-job">
                  <PlusCircle size={14} className="mr-1" />
                  Post a Job
                </Button>
              </Link>
            }
          />
        ) : (
          <div className="divide-y divide-border">
            {data.recentJobs.map((job) => (
              <Link key={job.id} href={`/customer/jobs/${job.id}`}>
                <div
                  data-testid={`card-job-${job.id}`}
                  className="flex items-center justify-between px-5 py-3.5 hover:bg-muted/30 transition-colors cursor-pointer"
                >
                  <div className="min-w-0 flex-1">
                    <p className="font-medium text-sm text-foreground truncate">{job.title}</p>
                    <p className="text-xs text-muted-foreground mt-0.5">
                      {job.vehicleYear} {job.vehicleMake} {job.vehicleModel}
                    </p>
                  </div>
                  <div className="flex items-center gap-3 shrink-0 ml-4">
                    <div className="flex items-center gap-1 text-xs text-muted-foreground">
                      <Gavel size={12} />
                      {job.bidCount} bids
                    </div>
                    <StatusBadge status={job.status} />
                  </div>
                </div>
              </Link>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}

export default function CustomerDashboard() {
  return (
    <ProtectedRoute role="customer">
      <AppLayout>
        <PageHeader
          title="Dashboard"
          subtitle="Overview of your repair jobs"
          action={
            <Link href="/customer/jobs/new">
              <Button size="sm" data-testid="button-new-job">
                <PlusCircle size={14} className="mr-1" />
                Post a Job
              </Button>
            </Link>
          }
        />
        <DashboardContent />
      </AppLayout>
    </ProtectedRoute>
  );
}
