import { useState } from "react";
import { Link } from "wouter";
import { useListJobs, getListJobsQueryKey } from "@workspace/api-client-react";
import { AppLayout, PageHeader, StatusBadge, ProtectedRoute, EmptyState } from "@/components/layout";
import { JobPhotoGallery } from "@/components/job-photo-gallery";
import { Input } from "@/components/ui/input";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Skeleton } from "@/components/ui/skeleton";
import { Search, MapPin, Calendar, Gavel, DollarSign } from "lucide-react";

const CATEGORIES = ["All", "Brakes", "Engine", "Transmission", "Oil Change", "AC & Heating", "Electrical", "Suspension", "Tires", "Diagnostics", "Bodywork", "Other"];

export default function BrowseJobs() {
  const [search, setSearch] = useState("");
  const [category, setCategory] = useState("All");

  const { data, isLoading } = useListJobs(
    { status: "open", ...(search ? { search } : {}), ...(category !== "All" ? { category } : {}) },
    { query: { queryKey: getListJobsQueryKey({ status: "open", search: search || undefined, category: category !== "All" ? category : undefined }) } }
  );

  return (
    <ProtectedRoute role="mechanic">
      <AppLayout>
        <PageHeader title="Browse Jobs" subtitle="Find repair jobs in your area" />

        {/* Filters */}
        <div className="flex flex-col sm:flex-row gap-3 mb-6">
          <div className="relative flex-1">
            <Search size={14} className="absolute left-3 top-1/2 -translate-y-1/2 text-muted-foreground" />
            <Input
              placeholder="Search jobs..."
              className="pl-9"
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              data-testid="input-search-jobs"
            />
          </div>
          <Select value={category} onValueChange={setCategory}>
            <SelectTrigger className="w-full sm:w-48" data-testid="select-category-filter">
              <SelectValue placeholder="Category" />
            </SelectTrigger>
            <SelectContent>
              {CATEGORIES.map(c => <SelectItem key={c} value={c}>{c}</SelectItem>)}
            </SelectContent>
          </Select>
        </div>

        {isLoading ? (
          <div className="space-y-3">
            {[...Array(4)].map((_, i) => <Skeleton key={i} className="h-28 rounded-xl" />)}
          </div>
        ) : !data?.length ? (
          <EmptyState
            icon={<Gavel size={48} />}
            title="No jobs found"
            description="Try adjusting your search or check back later for new postings."
          />
        ) : (
          <div className="space-y-3">
            {data.map((job) => (
              <Link key={job.id} href={`/mechanic/jobs/${job.id}`}>
                <div
                  data-testid={`card-job-${job.id}`}
                  className="rounded-xl border border-border bg-card p-5 hover:border-primary/30 transition-colors cursor-pointer"
                >
                  <div className="flex items-start justify-between gap-4">
                    <div className="min-w-0 flex-1">
                      <div className="flex items-center gap-2 mb-1">
                        <h3 className="font-semibold">{job.title}</h3>
                        <StatusBadge status={job.status} />
                      </div>
                      <p className="text-sm text-muted-foreground mb-3 line-clamp-2">{job.description}</p>

                      {job.photos && job.photos.length > 0 && (
                        <div className="mb-3" onClick={(e) => e.preventDefault()}>
                          <JobPhotoGallery photos={job.photos} compact />
                        </div>
                      )}

                      <div className="flex flex-wrap items-center gap-3 text-xs text-muted-foreground">
                        <span className="font-medium text-foreground">{job.vehicleYear} {job.vehicleMake} {job.vehicleModel}</span>
                        <span className="flex items-center gap-1"><MapPin size={11} />{job.location}</span>
                        <span className="flex items-center gap-1"><Calendar size={11} />{new Date(job.createdAt).toLocaleDateString()}</span>
                        <span className="px-2 py-0.5 rounded-full bg-muted text-xs">{job.category}</span>
                      </div>
                    </div>
                    <div className="text-right shrink-0">
                      {(job.budgetMin || job.budgetMax) ? (
                        <div>
                          <p className="text-xs text-muted-foreground">Budget</p>
                          <p className="text-sm font-semibold text-primary flex items-center gap-0.5 justify-end">
                            <DollarSign size={12} />
                            {job.budgetMin ?? "?"}–{job.budgetMax ?? "?"}
                          </p>
                        </div>
                      ) : (
                        <p className="text-xs text-muted-foreground">No budget set</p>
                      )}
                      <div className="flex items-center gap-1 text-xs text-muted-foreground mt-2 justify-end">
                        <Gavel size={11} />
                        {job.bidCount} bids
                      </div>
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
