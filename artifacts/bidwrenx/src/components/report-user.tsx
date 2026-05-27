import { useState } from "react";
import { useReportUser } from "@workspace/api-client-react";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Textarea } from "@/components/ui/textarea";
import { Label } from "@/components/ui/label";
import { useToast } from "@/hooks/use-toast";
import { Flag } from "lucide-react";

interface ReportUserButtonProps {
  userId: number;
  userName: string;
  jobId?: number;
}

const REASONS = [
  { value: "circumvention", label: "Tried to move off-platform / share contact info" },
  { value: "harassment", label: "Harassment or inappropriate messages" },
  { value: "fraud", label: "Fraudulent activity" },
  { value: "spam", label: "Spam" },
  { value: "other", label: "Other" },
];

export function ReportUserButton({ userId, userName, jobId }: ReportUserButtonProps) {
  const [open, setOpen] = useState(false);
  const [reason, setReason] = useState("");
  const [details, setDetails] = useState("");
  const { toast } = useToast();
  const reportUser = useReportUser();

  const handleSubmit = () => {
    if (!reason) return;
    reportUser.mutate(
      { id: userId, data: { reason: reason as any, details: details || undefined, jobId } },
      {
        onSuccess: () => {
          toast({
            title: "Report submitted",
            description: "Thank you. Our team will review this report.",
          });
          setOpen(false);
          setReason("");
          setDetails("");
        },
        onError: () => toast({ title: "Failed to submit report", variant: "destructive" }),
      }
    );
  };

  return (
    <>
      <button
        onClick={() => setOpen(true)}
        data-testid={`button-report-user-${userId}`}
        className="flex items-center gap-1 text-xs text-muted-foreground hover:text-red-400 transition-colors"
      >
        <Flag size={11} />
        Report
      </button>

      <Dialog open={open} onOpenChange={setOpen}>
        <DialogContent className="sm:max-w-md">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2 text-red-400">
              <Flag size={16} />
              Report {userName}
            </DialogTitle>
          </DialogHeader>
          <div className="space-y-4">
            <div>
              <Label className="mb-2 block">Reason</Label>
              <Select value={reason} onValueChange={setReason}>
                <SelectTrigger data-testid="select-report-reason">
                  <SelectValue placeholder="Select a reason" />
                </SelectTrigger>
                <SelectContent>
                  {REASONS.map(r => (
                    <SelectItem key={r.value} value={r.value}>{r.label}</SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
            <div>
              <Label className="mb-2 block">Details (optional)</Label>
              <Textarea
                placeholder="Describe what happened..."
                rows={3}
                value={details}
                onChange={(e) => setDetails(e.target.value)}
                data-testid="textarea-report-details"
              />
            </div>
            <p className="text-xs text-muted-foreground">
              Reports are reviewed by our safety team. Circumvention attempts are flagged and may result in account suspension.
            </p>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setOpen(false)}>Cancel</Button>
            <Button
              variant="destructive"
              onClick={handleSubmit}
              disabled={!reason || reportUser.isPending}
              data-testid="button-submit-report"
            >
              {reportUser.isPending ? "Submitting..." : "Submit Report"}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </>
  );
}
