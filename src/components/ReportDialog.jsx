import React, { useState } from "react";
import { base44 } from "@/api/base44Client";
import { useAuth } from "@/lib/AuthContext";
import { useProfile } from "@/lib/ProfileContext";
import { Flag, X, Loader2 } from "lucide-react";
import { toast } from "@/components/ui/use-toast";

export default function ReportDialog({ targetType, targetId, reportedUserId, reportedUserName, contentSnapshot, children }) {
  const { user } = useAuth();
  const { profile } = useProfile();
  const [open, setOpen] = useState(false);
  const [reason, setReason] = useState("");
  const [submitting, setSubmitting] = useState(false);

  const submit = async () => {
    if (!reason.trim()) return;
    setSubmitting(true);
    try {
      await base44.entities.Report.create({
        reporter_id: user.id,
        reporter_name: profile ? `${profile.first_name} ${profile.last_name}` : (user?.full_name || "User"),
        reported_user_id: reportedUserId || "",
        reported_user_name: reportedUserName || "",
        target_type: targetType,
        target_id: targetId || "",
        reason: reason.trim(),
        content_snapshot: contentSnapshot || "",
        status: "pending",
      });
      toast({ title: "Report submitted", description: "Admins will review it shortly." });
      setReason("");
      setOpen(false);
    } catch (e) {
      toast({ title: "Failed to submit report", variant: "destructive" });
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <>
      <span onClick={(e) => { e.stopPropagation(); e.preventDefault(); setOpen(true); }} className="inline-flex">
        {children}
      </span>
      {open && (
        <div className="fixed inset-0 z-[60] flex items-center justify-center bg-black/50 p-4" onClick={() => setOpen(false)}>
          <div className="bg-card border border-border rounded-2xl w-full max-w-md p-5 text-foreground" onClick={(e) => e.stopPropagation()}>
            <div className="flex items-center justify-between mb-3">
              <h3 className="font-semibold flex items-center gap-2"><Flag className="w-4 h-4 text-destructive" /> Report {targetType.replace("_", " ")}</h3>
              <button onClick={() => setOpen(false)} className="p-1 rounded-lg hover:bg-accent"><X className="w-4 h-4" /></button>
            </div>
            <p className="text-sm text-muted-foreground mb-3">
              {reportedUserName ? `Reporting content from ${reportedUserName}. ` : ""}Describe the issue and admins will review it.
            </p>
            {contentSnapshot && (
              <div className="mb-3 p-2 rounded-lg bg-muted/50 border border-border text-xs text-muted-foreground max-h-24 overflow-y-auto">
                {contentSnapshot}
              </div>
            )}
            <textarea
              value={reason}
              onChange={(e) => setReason(e.target.value)}
              placeholder="Describe the issue (e.g. explicit content, harassment, spam)..."
              className="w-full min-h-[80px] rounded-lg border border-border bg-muted/50 p-3 text-sm focus:outline-none focus:ring-1 focus:ring-ring text-foreground"
              autoFocus
            />
            <div className="flex justify-end gap-2 mt-3">
              <button onClick={() => setOpen(false)} className="px-4 py-2 rounded-lg border border-border text-sm hover:bg-accent">Cancel</button>
              <button onClick={submit} disabled={submitting || !reason.trim()} className="px-4 py-2 rounded-lg bg-destructive text-destructive-foreground text-sm font-medium hover:bg-destructive/90 disabled:opacity-50">
                {submitting ? <Loader2 className="w-4 h-4 animate-spin" /> : "Submit Report"}
              </button>
            </div>
          </div>
        </div>
      )}
    </>
  );
}