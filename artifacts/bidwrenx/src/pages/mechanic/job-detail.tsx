import { useParams, useLocation } from "wouter";
import { useState } from "react";
import { useGetJob, useCreateBid, getGetJobQueryKey, getListMyBidsQueryKey, getGetMechanicDashboardQueryKey } from "@workspace/api-client-react";
import { useQueryClient } from "@tanstack/react-query";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { z } from "zod";
import { AppLayout, StatusBadge, ProtectedRoute, BreadcrumbNav } from "@/components/layout";
import { ReportUserButton } from "@/components/report-user";
import { TrustBadges } from "@/components/trust-badge";
import { JobPhotoGallery } from "@/components/job-photo-gallery";
import { Button } from "@/components/ui/button";
import { Skeleton } from "@/components/ui/skeleton";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from "@/components/ui/dialog";
import { Form, FormControl, FormField, FormItem, FormLabel, FormMessage } from "@/components/ui/form";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { useToast } from "@/hooks/use-toast";
import { MapPin, Calendar, DollarSign, Gavel, Clock, MessageSquare, AlertTriangle } from "lucide-react";

const bidSchema = z.object({
  amount: z.coerce.number().min(1, "Amount must be greater than 0"),
  estimatedDays: z.coerce.number().int().min(1, "At least 1 day"),
  note: z.string().optional(),
});

type BidFormValues = z.infer<typeof bidSchema>;

function SubmitBidModal({ jobId, open, onClose }: { jobId: number; open: boolean; onClose: () => void }) {
  const { toast } = useToast();
  const queryClient = useQueryClient();
  const createBid = {
  isPending: false,
  mutate: async (
    payload: { data: BidFormValues },
    callbacks: { onSuccess: () => void; onError: (err: any) => void }
  ) => {
    try {
      const token = localStorage.getItem("token");

      const response = await fetch(`/api/jobs/${jobId}/bids`, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          ...(token ? { Authorization: `Bearer ${token}` } : {}),
        },
        body: JSON.stringify(payload.data),
      });

      const data = await response.json();

      if (!response.ok) {
        callbacks.onError({ data });
        return;
      }

      callbacks.onSuccess();
    } catch (error) {
      callbacks.onError(error);
    }
  },
};

  const form = useForm<BidFormValues>({
    resolver: zodResolver(bidSchema),
    defaultValues: { amount: undefined as any, estimatedDays: 1, note: "" },
  });

  const onSubmit = (values: BidFormValues) => {
    createBid.mutate({ data: values }, {
      onSuccess: () => {
        queryClient.invalidateQueries({ queryKey: getGetJobQueryKey(jobId) });
        queryClient.invalidateQueries({ queryKey: getListMyBidsQueryKey() });
        queryClient.invalidateQueries({ queryKey: getGetMechanicDashboardQueryKey() });
        toast({ title: "Bid submitted!", description: "The customer will review your bid." });
        onClose();
        form.reset();
      },
      onError: (err: any) => {
        toast({ title: "Failed to submit bid", description: err?.data?.error, variant: "destructive" });
      },
    });
  };

  return (
    <Dialog open={open} onOpenChange={onClose}>
      <DialogContent className="sm:max-w-md">
        <DialogHeader>
          <DialogTitle>Submit Your Bid</DialogTitle>
        </DialogHeader>
        <div className="flex items-start gap-2 p-3 rounded-lg border border-amber-500/20 bg-amber-500/5 text-xs text-amber-300 mb-2">
          <AlertTriangle size={12} className="mt-0.5 shrink-0" />
          <span>Do not share contact information or request off-platform payments in your note. Keep all communication on BidWrenx.</span>
        </div>
        <Form {...form}>
          <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-4">
            <FormField control={form.control} name="amount" render={({ field }) => (
              <FormItem>
                <FormLabel>Your Price ($)</FormLabel>
                <FormControl>
                  <Input type="number" placeholder="250" data-testid="input-bid-amount" {...field} />
                </FormControl>
                <FormMessage />
              </FormItem>
            )} />
            <FormField control={form.control} name="estimatedDays" render={({ field }) => (
              <FormItem>
                <FormLabel>Estimated Days to Complete</FormLabel>
                <FormControl>
                  <Input type="number" placeholder="2" data-testid="input-bid-days" {...field} />
                </FormControl>
                <FormMessage />
              </FormItem>
            )} />
            <FormField control={form.control} name="note" render={({ field }) => (
              <FormItem>
                <FormLabel>Note (optional)</FormLabel>
                <FormControl>
                  <Textarea placeholder="Tell the customer why you're the right mechanic for this job..." rows={3} data-testid="input-bid-note" {...field} />
                </FormControl>
                <FormMessage />
              </FormItem>
            )} />
            <DialogFooter>
              <Button type="button" variant="outline" onClick={onClose}>Cancel</Button>
              <Button type="submit" disabled={createBid.isPending} data-testid="button-submit-bid">
                {createBid.isPending ? "Submitting..." : "Submit Bid"}
              </Button>
            </DialogFooter>
          </form>
        </Form>
      </DialogContent>
    </Dialog>
  );
}

export default function MechanicJobDetail() {
  const params = useParams<{ id: string }>();
  const id = parseInt(params.id ?? "0", 10);
  const [showBidModal, setShowBidModal] = useState(false);
  const [, setLocation] = useLocation();
  const { data: job, isLoading } = useGetJob(id, { query: { enabled: !!id, queryKey: getGetJobQueryKey(id) } });

  return (
    <ProtectedRoute role="mechanic">
      <AppLayout>
        <BreadcrumbNav items={[{ label: "Browse Jobs", href: "/mechanic/jobs" }, { label: "Job Detail" }]} />

        {isLoading ? (
          <div className="space-y-4">
            <Skeleton className="h-40 rounded-xl" />
            <Skeleton className="h-24 rounded-xl" />
          </div>
        ) : !job ? (
          <p className="text-muted-foreground">Job not found.</p>
        ) : (
          <div className="space-y-6 max-w-2xl">
            {/* Job card */}
            <div className="rounded-xl border border-border bg-card p-6">
              <div className="flex items-start justify-between gap-4 mb-3">
                <div>
                  <h1 className="text-xl font-bold mb-1">{job.title}</h1>
                  <div className="flex items-center gap-3">
                    <p className="text-sm text-muted-foreground">Posted by {job.customerName}</p>
                    <ReportUserButton userId={job.customerId} userName={job.customerName} jobId={id} />
                  </div>
                </div>
                <StatusBadge status={job.status} />
              </div>
              <p className="text-sm text-muted-foreground leading-relaxed mb-4">{job.description}</p>

              {job.photos && job.photos.length > 0 && (
                <div className="mb-5">
                  <p className="text-xs text-muted-foreground mb-2">Customer Photos</p>
                  <JobPhotoGallery photos={job.photos} />
                </div>
              )}

              <div className="grid grid-cols-2 gap-4 text-sm mb-4">
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
                    <p className="font-medium flex items-center gap-1 text-primary">
                      <DollarSign size={12} />${job.budgetMin ?? "?"}–${job.budgetMax ?? "?"}
                    </p>
                  </div>
                )}
              </div>
              <div className="flex items-center gap-4 text-xs text-muted-foreground">
                <span className="flex items-center gap-1"><Calendar size={11} />Posted {new Date(job.createdAt).toLocaleDateString()}</span>
                <span className="flex items-center gap-1"><Gavel size={11} />{job.bids?.length ?? 0} bids submitted</span>
              </div>
            </div>

            {/* Action */}
            {job.status === "open" && (
              <div className="flex gap-3">
                <Button
                  onClick={() => setShowBidModal(true)}
                  data-testid="button-open-bid-modal"
                >
                  <Gavel size={14} className="mr-1" />
                  Submit a Bid
                </Button>
                <Button
                  variant="outline"
                  onClick={() => setLocation(`/messages/${job.id}/${job.customerId}`)}
                  data-testid="button-message-customer"
                >
                  <MessageSquare size={14} className="mr-1" />
                  Message Customer
                </Button>
              </div>
            )}

            {/* Existing bids overview */}
            {(job.bids?.length ?? 0) > 0 && (
              <div className="rounded-xl border border-border bg-card">
                <div className="px-5 py-4 border-b border-border">
                  <h2 className="font-semibold text-sm">Current Bids ({job.bids.length})</h2>
                </div>
                <div className="divide-y divide-border">
                  {job.bids.map((bid) => (
                    <div key={bid.id} className="flex items-center justify-between px-5 py-3.5">
                      <div className="flex items-center gap-3">
                        <div className="w-7 h-7 rounded-full bg-muted flex items-center justify-center text-xs font-semibold">
                          {bid.mechanicName[0]}
                        </div>
                        <div>
                          <p className="text-sm font-medium">{bid.mechanicName}</p>
                          <TrustBadges rating={bid.mechanicRating} size="sm" />
                        </div>
                      </div>
                      <div className="flex items-center gap-4">
                        <div className="text-right text-sm">
                          <p className="font-semibold text-primary">${bid.amount}</p>
                          <p className="text-xs text-muted-foreground flex items-center gap-0.5 justify-end">
                            <Clock size={10} />{bid.estimatedDays}d
                          </p>
                        </div>
                        <StatusBadge status={bid.status} />
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            )}
          </div>
        )}

        <SubmitBidModal jobId={id} open={showBidModal} onClose={() => setShowBidModal(false)} />
      </AppLayout>
    </ProtectedRoute>
  );
}
