import { useRef, useState } from "react";
import { useAuth } from "@/contexts/auth";
import {
  AppLayout, PageHeader, BreadcrumbNav, ProtectedRoute,
} from "@/components/layout";
import { VerificationBadges } from "@/components/verification-badges";
import { UserAvatar } from "@/components/user-avatar";
import { Button } from "@/components/ui/button";
import { useToast } from "@/hooks/use-toast";
import { cn } from "@/lib/utils";
import {
  Upload, ShieldCheck, FileText, CheckCircle2, Clock,
  BadgeCheck, Info, AlertCircle,
} from "lucide-react";

function getAuthToken() {
  return localStorage.getItem("bidwrenx_token") ?? "";
}

async function requestPresignedUrl(file: File): Promise<{ uploadURL: string; objectPath: string }> {
  const res = await fetch("/api/storage/uploads/request-url", {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      Authorization: `Bearer ${getAuthToken()}`,
    },
    body: JSON.stringify({ name: file.name, size: file.size, contentType: file.type }),
  });
  if (!res.ok) throw new Error("Failed to get upload URL");
  return res.json();
}

async function uploadToGCS(file: File, uploadURL: string) {
  const res = await fetch(uploadURL, {
    method: "PUT",
    headers: { "Content-Type": file.type },
    body: file,
  });
  if (!res.ok) throw new Error("Upload failed");
}

async function savePhotoUrl(objectPath: string): Promise<any> {
  const res = await fetch("/api/users/me/photo", {
    method: "PATCH",
    headers: {
      "Content-Type": "application/json",
      Authorization: `Bearer ${getAuthToken()}`,
    },
    body: JSON.stringify({ photoUrl: objectPath }),
  });
  if (!res.ok) throw new Error("Failed to save photo");
  return res.json();
}

async function saveDocumentPath(kind: "insurance" | "certification", objectPath: string): Promise<any> {
  const body = kind === "insurance"
    ? { insuranceDocumentPath: objectPath }
    : { certificationDocumentPath: objectPath };
  const res = await fetch("/api/users/me/verification/documents", {
    method: "PATCH",
    headers: {
      "Content-Type": "application/json",
      Authorization: `Bearer ${getAuthToken()}`,
    },
    body: JSON.stringify(body),
  });
  if (!res.ok) throw new Error("Failed to save document");
  return res.json();
}

async function requestVerification(): Promise<any> {
  const res = await fetch("/api/users/me/verification/request", {
    method: "POST",
    headers: { Authorization: `Bearer ${getAuthToken()}` },
  });
  if (!res.ok) {
    const err = await res.json().catch(() => ({}));
    throw new Error(err.error ?? "Failed to submit request");
  }
  return res.json();
}

function UploadButton({
  label,
  accept,
  uploaded,
  onUpload,
}: {
  label: string;
  accept: string;
  uploaded: boolean;
  onUpload: (file: File) => Promise<void>;
}) {
  const inputRef = useRef<HTMLInputElement>(null);
  const [uploading, setUploading] = useState(false);

  const handleChange = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    setUploading(true);
    try {
      await onUpload(file);
    } finally {
      setUploading(false);
      if (inputRef.current) inputRef.current.value = "";
    }
  };

  return (
    <div>
      <input ref={inputRef} type="file" accept={accept} className="hidden" onChange={handleChange} />
      <button
        onClick={() => inputRef.current?.click()}
        disabled={uploading}
        className={cn(
          "w-full flex items-center gap-3 p-4 rounded-xl border-2 border-dashed transition-all text-left",
          uploaded
            ? "border-emerald-500/40 bg-emerald-500/5 text-emerald-400"
            : "border-border hover:border-primary/40 hover:bg-primary/5 text-muted-foreground hover:text-foreground",
          uploading && "opacity-60 cursor-wait"
        )}
      >
        <div className={cn(
          "w-10 h-10 rounded-lg flex items-center justify-center shrink-0",
          uploaded ? "bg-emerald-500/10" : "bg-muted"
        )}>
          {uploading ? (
            <Upload size={18} className="animate-bounce" />
          ) : uploaded ? (
            <CheckCircle2 size={18} />
          ) : (
            <Upload size={18} />
          )}
        </div>
        <div className="min-w-0 flex-1">
          <p className="font-medium text-sm text-foreground">{label}</p>
          <p className="text-xs mt-0.5">
            {uploading ? "Uploading…" : uploaded ? "Document uploaded — click to replace" : "Click to upload (PDF, JPG, PNG)"}
          </p>
        </div>
      </button>
    </div>
  );
}

export default function MechanicVerification() {
  const { user, updateUser } = useAuth();
  const { toast } = useToast();
  const photoInputRef = useRef<HTMLInputElement>(null);
  const [photoUploading, setPhotoUploading] = useState(false);
  const [requesting, setRequesting] = useState(false);

  if (!user) return null;

  const status = user.identityVerificationStatus;
  const canRequest = status === "none" || status === "rejected";
  const hasDocuments = user.insuranceDocumentUploaded || user.certificationDocumentUploaded;

  const handlePhotoChange = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    if (!file.type.startsWith("image/")) {
      toast({ title: "Please select an image file", variant: "destructive" });
      return;
    }
    if (file.size > 5 * 1024 * 1024) {
      toast({ title: "Photo must be under 5MB", variant: "destructive" });
      return;
    }
    setPhotoUploading(true);
    try {
      const { uploadURL, objectPath } = await requestPresignedUrl(file);
      await uploadToGCS(file, uploadURL);
      const updated = await savePhotoUrl(objectPath);
      updateUser(updated);
      toast({ title: "Profile photo updated" });
    } catch {
      toast({ title: "Failed to upload photo", variant: "destructive" });
    } finally {
      setPhotoUploading(false);
      if (photoInputRef.current) photoInputRef.current.value = "";
    }
  };

  const handleDocumentUpload = async (kind: "insurance" | "certification", file: File) => {
    const allowed = ["application/pdf", "image/jpeg", "image/jpg", "image/png"];
    if (!allowed.includes(file.type)) {
      toast({ title: "Please upload a PDF or image file", variant: "destructive" });
      return;
    }
    if (file.size > 10 * 1024 * 1024) {
      toast({ title: "File must be under 10MB", variant: "destructive" });
      return;
    }
    try {
      const { uploadURL, objectPath } = await requestPresignedUrl(file);
      await uploadToGCS(file, uploadURL);
      const updated = await saveDocumentPath(kind, objectPath);
      updateUser(updated);
      toast({ title: `${kind === "insurance" ? "Insurance" : "Certification"} document uploaded` });
    } catch {
      toast({ title: "Failed to upload document", variant: "destructive" });
    }
  };

  const handleRequestVerification = async () => {
    setRequesting(true);
    try {
      const updated = await requestVerification();
      updateUser(updated);
      toast({ title: "Verification request submitted — we'll review it soon." });
    } catch (e: any) {
      toast({ title: e.message ?? "Failed to submit request", variant: "destructive" });
    } finally {
      setRequesting(false);
    }
  };

  return (
    <ProtectedRoute role="mechanic">
      <AppLayout>
        <BreadcrumbNav items={[{ label: "Dashboard", href: "/mechanic/dashboard" }, { label: "Verification" }]} />
        <PageHeader
          title="Profile Verification"
          subtitle="Upload documents and request verification to display trust badges on your bids."
        />

        <div className="max-w-2xl space-y-6">
          {/* Current status banner */}
          {status === "approved" && user.adminVerifiedMechanic && (
            <div className="flex items-center gap-3 p-4 rounded-xl border border-emerald-500/30 bg-emerald-500/5">
              <BadgeCheck size={20} className="text-emerald-400 shrink-0" />
              <div>
                <p className="font-semibold text-emerald-400">Verified profile</p>
                <p className="text-sm text-muted-foreground">Your identity and documents have been reviewed. Your "Verified profile" badge is now visible to customers.</p>
              </div>
            </div>
          )}
          {status === "pending" && (
            <div className="flex items-center gap-3 p-4 rounded-xl border border-amber-500/30 bg-amber-500/5">
              <Clock size={20} className="text-amber-400 shrink-0" />
              <div>
                <p className="font-semibold text-amber-400">Review in progress</p>
                <p className="text-sm text-muted-foreground">Your verification request is under review. We'll update your status once complete.</p>
              </div>
            </div>
          )}
          {status === "rejected" && (
            <div className="flex items-center gap-3 p-4 rounded-xl border border-red-500/30 bg-red-500/5">
              <AlertCircle size={20} className="text-red-400 shrink-0" />
              <div>
                <p className="font-semibold text-red-400">Verification not approved</p>
                {user.verificationNotes && (
                  <p className="text-sm text-muted-foreground">Note: {user.verificationNotes}</p>
                )}
                <p className="text-sm text-muted-foreground mt-1">You can update your documents and submit a new request.</p>
              </div>
            </div>
          )}

          {/* Profile photo */}
          <section className="rounded-xl border border-border bg-card p-5 space-y-4">
            <div className="flex items-center gap-2 mb-1">
              <ShieldCheck size={16} className="text-primary" />
              <h2 className="font-semibold">Profile Photo</h2>
            </div>
            <p className="text-sm text-muted-foreground">Your photo appears on bid cards and messages so customers know who they're working with.</p>

            <div className="flex items-center gap-4">
              <UserAvatar name={user.name} photoUrl={user.photoUrl} size="lg" />
              <div>
                <input
                  ref={photoInputRef}
                  type="file"
                  accept="image/*"
                  className="hidden"
                  onChange={handlePhotoChange}
                />
                <Button
                  variant="outline"
                  size="sm"
                  onClick={() => photoInputRef.current?.click()}
                  disabled={photoUploading}
                  className="gap-2"
                >
                  <Upload size={14} />
                  {photoUploading ? "Uploading…" : user.photoUrl ? "Change photo" : "Upload photo"}
                </Button>
                <p className="text-xs text-muted-foreground mt-1.5">JPG or PNG, max 5MB</p>
              </div>
            </div>
          </section>

          {/* Documents */}
          <section className="rounded-xl border border-border bg-card p-5 space-y-4">
            <div className="flex items-center gap-2 mb-1">
              <FileText size={16} className="text-primary" />
              <h2 className="font-semibold">Verification Documents</h2>
            </div>
            <p className="text-sm text-muted-foreground">
              Upload your insurance certificate and/or trade certifications. These are reviewed privately by the BidWrenx team — customers never see the documents directly.
            </p>

            <div className="space-y-3">
              <UploadButton
                label="Insurance Certificate"
                accept=".pdf,.jpg,.jpeg,.png"
                uploaded={user.insuranceDocumentUploaded}
                onUpload={(f) => handleDocumentUpload("insurance", f)}
              />
              <UploadButton
                label="Trade Certification / Licence"
                accept=".pdf,.jpg,.jpeg,.png"
                uploaded={user.certificationDocumentUploaded}
                onUpload={(f) => handleDocumentUpload("certification", f)}
              />
            </div>

            <div className="flex items-start gap-2 text-xs text-muted-foreground bg-muted/30 rounded-lg px-3 py-2.5">
              <Info size={13} className="mt-0.5 shrink-0" />
              <p>Documents are stored securely and only visible to BidWrenx administrators for verification purposes.</p>
            </div>
          </section>

          {/* Current badges */}
          <section className="rounded-xl border border-border bg-card p-5 space-y-3">
            <h2 className="font-semibold">Your current badges</h2>
            <VerificationBadges
              info={{
                emailVerified: user.emailVerified,
                phoneVerified: user.phoneVerified,
                identityVerificationStatus: user.identityVerificationStatus,
                insuranceDocumentUploaded: user.insuranceDocumentUploaded,
                certificationDocumentUploaded: user.certificationDocumentUploaded,
                adminVerifiedMechanic: user.adminVerifiedMechanic,
                role: user.role,
              }}
            />
            {!user.emailVerified && !user.phoneVerified && !user.adminVerifiedMechanic && status === "none" && (
              <p className="text-sm text-muted-foreground">No badges yet — submit a verification request to get started.</p>
            )}
          </section>

          {/* Request button */}
          {canRequest && (
            <section className="rounded-xl border border-border bg-card p-5">
              <h2 className="font-semibold mb-2">Request Verification</h2>
              <p className="text-sm text-muted-foreground mb-4">
                Once you've uploaded your documents, submit a verification request. If approved, a <strong className="text-foreground">"Verified profile"</strong> badge will appear on all your bids and profile.
              </p>
              <Button
                onClick={handleRequestVerification}
                disabled={requesting || !hasDocuments}
                className="gap-2"
              >
                <BadgeCheck size={16} />
                {requesting ? "Submitting…" : "Submit verification request"}
              </Button>
              {!hasDocuments && (
                <p className="text-xs text-muted-foreground mt-2">Upload at least one document above before requesting verification.</p>
              )}
            </section>
          )}
        </div>
      </AppLayout>
    </ProtectedRoute>
  );
}
