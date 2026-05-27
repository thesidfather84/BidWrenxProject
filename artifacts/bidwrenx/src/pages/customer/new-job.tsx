import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { z } from "zod";
import { useState } from "react";
import { useLocation } from "wouter";
import { useCreateJob, getListMyJobsQueryKey, getGetCustomerDashboardQueryKey } from "@workspace/api-client-react";
import { useQueryClient } from "@tanstack/react-query";
import { AppLayout, PageHeader, ProtectedRoute, BreadcrumbNav } from "@/components/layout";
import { DisclaimerBanner } from "@/components/disclaimer-modal";
import { JobPhotoUploader } from "@/components/job-photo-uploader";
import { Button } from "@/components/ui/button";
import { Form, FormControl, FormField, FormItem, FormLabel, FormMessage } from "@/components/ui/form";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { useToast } from "@/hooks/use-toast";
import { Camera } from "lucide-react";

const CATEGORIES = ["Brakes", "Engine", "Transmission", "Oil Change", "AC & Heating", "Electrical", "Suspension", "Tires", "Diagnostics", "Bodywork", "Other"];

const schema = z.object({
  title: z.string().min(5, "Title must be at least 5 characters"),
  description: z.string().min(20, "Please describe the issue in more detail"),
  category: z.string().min(1, "Select a category"),
  vehicleMake: z.string().min(1, "Vehicle make is required"),
  vehicleModel: z.string().min(1, "Vehicle model is required"),
  vehicleYear: z.coerce.number().int().min(1980).max(2026),
  budgetMin: z.coerce.number().min(0).optional(),
  budgetMax: z.coerce.number().min(0).optional(),
  location: z.string().min(2, "Location is required"),
});

type FormValues = z.infer<typeof schema>;

export default function NewJob() {
  const [, setLocation] = useLocation();
  const { toast } = useToast();
  const queryClient = useQueryClient();
  const createJob = useCreateJob();
  const [photos, setPhotos] = useState<string[]>([]);

  const form = useForm<FormValues>({
    resolver: zodResolver(schema),
    defaultValues: {
      title: "", description: "", category: "", vehicleMake: "",
      vehicleModel: "", vehicleYear: 2020, location: "",
    },
  });

  const onSubmit = (values: FormValues) => {
    createJob.mutate({ data: { ...values, photos } as any }, {
      onSuccess: (job) => {
        queryClient.invalidateQueries({ queryKey: getListMyJobsQueryKey() });
        queryClient.invalidateQueries({ queryKey: getGetCustomerDashboardQueryKey() });
        toast({ title: "Job posted!", description: "Mechanics in your area can now bid on your job." });
        setLocation(`/customer/jobs/${job.id}`);
      },
      onError: () => {
        toast({ title: "Failed to post job", variant: "destructive" });
      },
    });
  };

  return (
    <ProtectedRoute role="customer">
      <AppLayout>
        <BreadcrumbNav items={[{ label: "My Jobs", href: "/customer/jobs" }, { label: "Post a Job" }]} />
        <PageHeader title="Post a Repair Job" subtitle="Describe the issue and let mechanics bid" />

        <div className="max-w-2xl">
          <DisclaimerBanner />

          <Form {...form}>
            <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-6">
              {/* Job info */}
              <div className="rounded-xl border border-border bg-card p-6 space-y-4">
                <h2 className="font-semibold text-sm text-muted-foreground uppercase tracking-wide">Job Details</h2>
                <FormField control={form.control} name="title" render={({ field }) => (
                  <FormItem>
                    <FormLabel>Job Title</FormLabel>
                    <FormControl>
                      <Input placeholder="e.g. Brake pad replacement" data-testid="input-job-title" {...field} />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )} />
                <FormField control={form.control} name="description" render={({ field }) => (
                  <FormItem>
                    <FormLabel>Description</FormLabel>
                    <FormControl>
                      <Textarea
                        placeholder="Describe the issue in detail — symptoms, when it started, what you've tried..."
                        rows={4}
                        data-testid="input-job-description"
                        {...field}
                      />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )} />
                <FormField control={form.control} name="category" render={({ field }) => (
                  <FormItem>
                    <FormLabel>Category</FormLabel>
                    <Select onValueChange={field.onChange} defaultValue={field.value}>
                      <FormControl>
                        <SelectTrigger data-testid="select-category">
                          <SelectValue placeholder="Select a category" />
                        </SelectTrigger>
                      </FormControl>
                      <SelectContent>
                        {CATEGORIES.map(c => <SelectItem key={c} value={c}>{c}</SelectItem>)}
                      </SelectContent>
                    </Select>
                    <FormMessage />
                  </FormItem>
                )} />
              </div>

              {/* Photos */}
              <div className="rounded-xl border border-border bg-card p-6 space-y-4">
                <div className="flex items-center gap-2">
                  <Camera size={15} className="text-primary" />
                  <h2 className="font-semibold text-sm text-muted-foreground uppercase tracking-wide">Repair Photos</h2>
                  <span className="text-xs text-muted-foreground">(optional, up to 5)</span>
                </div>

                <div className="rounded-lg border border-primary/20 bg-primary/5 px-4 py-3 text-xs text-muted-foreground leading-relaxed">
                  Upload clear photos of the issue, warning lights, leaking areas, broken parts, tire damage, engine bay, radiator cap, battery, belts, hoses, or anything you want the mechanic to see. <span className="text-foreground font-medium">Better photos lead to better quotes.</span>
                </div>

                <JobPhotoUploader
                  value={photos}
                  onChange={setPhotos}
                  disabled={createJob.isPending}
                />
              </div>

              {/* Vehicle info */}
              <div className="rounded-xl border border-border bg-card p-6 space-y-4">
                <h2 className="font-semibold text-sm text-muted-foreground uppercase tracking-wide">Vehicle</h2>
                <div className="grid grid-cols-2 gap-4">
                  <FormField control={form.control} name="vehicleMake" render={({ field }) => (
                    <FormItem>
                      <FormLabel>Make</FormLabel>
                      <FormControl>
                        <Input placeholder="Toyota" data-testid="input-vehicle-make" {...field} />
                      </FormControl>
                      <FormMessage />
                    </FormItem>
                  )} />
                  <FormField control={form.control} name="vehicleModel" render={({ field }) => (
                    <FormItem>
                      <FormLabel>Model</FormLabel>
                      <FormControl>
                        <Input placeholder="Camry" data-testid="input-vehicle-model" {...field} />
                      </FormControl>
                      <FormMessage />
                    </FormItem>
                  )} />
                </div>
                <FormField control={form.control} name="vehicleYear" render={({ field }) => (
                  <FormItem>
                    <FormLabel>Year</FormLabel>
                    <FormControl>
                      <Input type="number" placeholder="2020" data-testid="input-vehicle-year" {...field} />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )} />
              </div>

              {/* Budget & location */}
              <div className="rounded-xl border border-border bg-card p-6 space-y-4">
                <h2 className="font-semibold text-sm text-muted-foreground uppercase tracking-wide">Budget & Location</h2>
                <div className="grid grid-cols-2 gap-4">
                  <FormField control={form.control} name="budgetMin" render={({ field }) => (
                    <FormItem>
                      <FormLabel>Min Budget ($)</FormLabel>
                      <FormControl>
                        <Input type="number" placeholder="100" data-testid="input-budget-min" {...field} />
                      </FormControl>
                      <FormMessage />
                    </FormItem>
                  )} />
                  <FormField control={form.control} name="budgetMax" render={({ field }) => (
                    <FormItem>
                      <FormLabel>Max Budget ($)</FormLabel>
                      <FormControl>
                        <Input type="number" placeholder="500" data-testid="input-budget-max" {...field} />
                      </FormControl>
                      <FormMessage />
                    </FormItem>
                  )} />
                </div>
                <FormField control={form.control} name="location" render={({ field }) => (
                  <FormItem>
                    <FormLabel>Location</FormLabel>
                    <FormControl>
                      <Input placeholder="Austin, TX" data-testid="input-location" {...field} />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )} />
              </div>

              <div className="flex gap-3">
                <Button type="submit" disabled={createJob.isPending} data-testid="button-submit-job">
                  {createJob.isPending ? "Posting..." : "Post Job"}
                </Button>
                <Button type="button" variant="outline" onClick={() => setLocation("/customer/jobs")}>
                  Cancel
                </Button>
              </div>
            </form>
          </Form>
        </div>
      </AppLayout>
    </ProtectedRoute>
  );
}
