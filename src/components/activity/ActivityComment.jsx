import React, { useState, useEffect } from "react";
import { base44 } from "@/api/base44Client";
import { useAuth } from "@/lib/AuthContext";
import { useProfile } from "@/lib/ProfileContext";
import { MessageCircle, Send, Loader2, Trash2, Flag } from "lucide-react";
import ReportDialog from "@/components/ReportDialog";
import { toast } from "@/components/ui/use-toast";

export default function ActivityComment({ activityId }) {
  const { user } = useAuth();
  const { profile } = useProfile();
  const [comments, setComments] = useState([]);
  const [text, setText] = useState("");
  const [loading, setLoading] = useState(true);
  const [posting, setPosting] = useState(false);

  const load = async () => {
    try {
      const data = await base44.entities.ActivityComment.filter({ activity_id: activityId }, "created_date", 200);
      setComments(data || []);
    } finally { setLoading(false); }
  };

  useEffect(() => { if (activityId) load(); }, [activityId]);

  const handlePost = async () => {
    if (!text.trim()) return;
    setPosting(true);
    try {
      await base44.entities.ActivityComment.create({
        activity_id: activityId,
        user_id: user.id,
        user_name: profile ? `${profile.first_name} ${profile.last_name}` : "User",
        account_type: profile?.account_type || "student",
        message: text.trim(),
      });
      setText("");
      load();
    } catch (err) {
      toast({ title: "Failed to post", description: err.message, variant: "destructive" });
    } finally { setPosting(false); }
  };

  const handleDelete = async (id) => {
    try {
      await base44.entities.ActivityComment.delete(id);
      setComments((c) => c.filter((x) => x.id !== id));
    } catch { /* ignore */ }
  };

  return (
    <div className="bg-card border border-border rounded-2xl p-5 space-y-4">
      <h3 className="font-semibold flex items-center gap-2"><MessageCircle className="w-5 h-5 text-primary" /> Comments</h3>
      {loading ? (
        <div className="flex justify-center py-4"><Loader2 className="w-5 h-5 animate-spin text-muted-foreground" /></div>
      ) : comments.length === 0 ? (
        <p className="text-sm text-muted-foreground text-center py-4">No comments yet. Ask a question!</p>
      ) : (
        <div className="space-y-3">
          {comments.map((c) => (
            <div key={c.id} className="flex gap-3">
              <div className="w-8 h-8 rounded-full bg-primary/10 flex items-center justify-center shrink-0">
                <span className="text-xs font-bold text-primary">{(c.user_name || "U")[0].toUpperCase()}</span>
              </div>
              <div className="flex-1 min-w-0">
                <div className="flex items-baseline gap-2">
                  <p className="text-sm font-medium">{c.user_name}</p>
                  {c.account_type === "teacher" && <span className="text-xs text-amber-600 font-medium">Teacher</span>}
                  <p className="text-xs text-muted-foreground ml-auto">{c.created_date ? new Date(c.created_date).toLocaleString() : ""}</p>
                </div>
                <p className="text-sm mt-0.5">{c.message}</p>
              </div>
              {c.created_by_id === user?.id ? (
                <button onClick={() => handleDelete(c.id)} className="p-1 text-muted-foreground hover:text-destructive shrink-0"><Trash2 className="w-3.5 h-3.5" /></button>
              ) : (
                <ReportDialog
                  targetType="activity_comment"
                  targetId={c.id}
                  reportedUserId={c.user_id}
                  reportedUserName={c.user_name}
                  contentSnapshot={c.message}
                >
                  <button className="p-1 text-muted-foreground hover:text-destructive shrink-0" title="Report"><Flag className="w-3.5 h-3.5" /></button>
                </ReportDialog>
              )}
            </div>
          ))}
        </div>
      )}
      <div className="flex gap-2 pt-2 border-t border-border">
        <input value={text} onChange={(e) => setText(e.target.value)} onKeyDown={(e) => e.key === "Enter" && !e.shiftKey && handlePost()} placeholder="Ask a question or comment…" className="flex-1 border border-border rounded-lg px-3 py-2 text-sm bg-background" />
        <button onClick={handlePost} disabled={posting || !text.trim()} className="inline-flex items-center gap-2 bg-primary text-primary-foreground rounded-lg px-3 text-sm font-medium disabled:opacity-50">
          {posting ? <Loader2 className="w-4 h-4 animate-spin" /> : <Send className="w-4 h-4" />}
        </button>
      </div>
    </div>
  );
}