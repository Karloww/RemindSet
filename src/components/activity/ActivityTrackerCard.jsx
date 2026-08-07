import React, { useState, useEffect } from "react";
import { useNavigate } from "react-router-dom";
import { base44 } from "@/api/base44Client";
import { useAuth } from "@/lib/AuthContext";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { ChevronDown, Pencil, Trash2, MessageSquare, Send, Coins, CalendarClock, FileText, CheckCircle2, Clock, AlertTriangle, ExternalLink } from "lucide-react";
import FilePreview from "@/components/FilePreview";
import { toast } from "@/components/ui/use-toast";

export default function ActivityTrackerCard({ activity, classroomId, enrollments, responses, onDeleted, isTeacher }) {
  const navigate = useNavigate();
  const { user } = useAuth();
  const [isExpanded, setIsExpanded] = useState(false);
  const [comments, setComments] = useState([]);
  const [showComments, setShowComments] = useState(false);
  const [commentText, setCommentText] = useState("");
  const [loadedComments, setLoadedComments] = useState(false);

  const activityResponses = responses.filter((r) => r.activity_id === activity.id);
  const missed = activity.deadline && new Date(activity.deadline) < new Date();

  const loadComments = async () => {
    try {
      const data = await base44.entities.ActivityComment.filter({ activity_id: activity.id }, "created_date", 200);
      setComments(data || []);
    } catch (e) { /* ignore */ }
    setLoadedComments(true);
  };

  useEffect(() => {
    if (showComments && !loadedComments) loadComments();
  }, [showComments, loadedComments]);

  const handleComment = async () => {
    if (!commentText.trim()) return;
    try {
      const profiles = await base44.entities.Profile.filter({ created_by_id: user.id });
      const p = (profiles || [])[0];
      const myName = p ? `${p.first_name} ${p.last_name}` : "User";
      const myType = p?.account_type || "student";
      await base44.entities.ActivityComment.create({
        activity_id: activity.id,
        user_id: user.id,
        user_name: myName,
        account_type: myType,
        message: commentText.trim(),
      });
      setCommentText("");
      loadComments();
    } catch (e) {
      toast({ title: "Failed to comment", variant: "destructive" });
    }
  };

  const handleDelete = async () => {
    if (!window.confirm(`Delete "${activity.title}"?`)) return;
    try {
      await base44.entities.Activity.delete(activity.id);
      toast({ title: "Activity deleted." });
      onDeleted();
    } catch (err) {
      toast({ title: "Delete failed", description: err.message, variant: "destructive" });
    }
  };

  const toggleStatus = async () => {
    try {
      await base44.entities.Activity.update(activity.id, {
        status: activity.status === "open" ? "closed" : "open",
      });
      toast({ title: `Activity ${activity.status === "open" ? "closed" : "opened"}.` });
      onDeleted();
    } catch (err) {
      toast({ title: "Update failed", description: err.message, variant: "destructive" });
    }
  };

  return (
    <div className="bg-card border border-border rounded-xl overflow-hidden">
      <button onClick={() => setIsExpanded(!isExpanded)} className="w-full flex items-center justify-between gap-3 p-4 hover:bg-accent transition-colors">
        <div className="min-w-0 flex-1 text-left">
          <div className="flex items-center gap-2 flex-wrap">
            <span className={`text-xs font-medium px-2 py-0.5 rounded-full ${activity.status === "open" ? "bg-emerald-50 text-emerald-600" : "bg-muted text-muted-foreground"}`}>{activity.status}</span>
            {missed && activity.status === "open" && (
              <span className="inline-flex items-center gap-1 text-xs font-medium text-red-600 bg-red-50 px-2 py-0.5 rounded-full"><AlertTriangle className="w-3 h-3" /> Missed</span>
            )}
          </div>
          <p className="font-semibold mt-1.5 truncate">{activity.title}</p>
          {activity.description && <p className="text-sm text-muted-foreground truncate">{activity.description}</p>}
          {activity.deadline && <p className="text-xs text-amber-600 mt-1">Due: {new Date(activity.deadline).toLocaleString()}</p>}
        </div>
        <ChevronDown className={`w-5 h-5 text-muted-foreground transition-transform shrink-0 ${isExpanded ? "rotate-180" : ""}`} />
      </button>

      {isExpanded && (
        <div className="border-t border-border">
          <div className="p-4 space-y-3">
            <div className="flex flex-wrap items-center gap-2">
              <span className="inline-flex items-center gap-1 text-xs font-medium text-amber-600 bg-amber-50 px-2 py-1 rounded-full"><Coins className="w-3 h-3" /> {activity.default_points || 1} pts</span>
              {activity.time_limit_minutes > 0 && (
                <span className="inline-flex items-center gap-1 text-xs font-medium text-blue-600 bg-blue-50 px-2 py-1 rounded-full"><Clock className="w-3 h-3" /> {activity.time_limit_minutes} min</span>
              )}
              {activity.deadline && (
                <span className="inline-flex items-center gap-1 text-xs font-medium text-muted-foreground bg-muted px-2 py-1 rounded-full"><CalendarClock className="w-3 h-3" /> Deadline</span>
              )}
              {activity.file_url && (
                <span className="inline-flex items-center gap-1 text-xs font-medium text-muted-foreground bg-muted px-2 py-1 rounded-full truncate max-w-[180px]"><FileText className="w-3 h-3 shrink-0" /> Attached file</span>
              )}
              {isTeacher && (
                <div className="inline-flex items-center rounded-full border border-border overflow-hidden">
                  <button type="button" onClick={toggleStatus} className={`px-2.5 py-1 text-xs font-medium ${activity.status === "open" ? "bg-emerald-500 text-white" : "text-muted-foreground hover:bg-accent"}`}>Open</button>
                  <button type="button" onClick={toggleStatus} className={`px-2.5 py-1 text-xs font-medium ${activity.status === "closed" ? "bg-amber-500 text-white" : "text-muted-foreground hover:bg-accent"}`}>Closed</button>
                </div>
              )}
            </div>
            {activity.file_url && <FilePreview fileUrl={activity.file_url} fileName={activity.title} />}
            {activity.link_url && (
              <a href={activity.link_url} target="_blank" rel="noopener noreferrer" className="inline-flex items-center gap-1 text-sm text-primary hover:underline">
                <ExternalLink className="w-3.5 h-3.5" /> {activity.link_url}
              </a>
            )}
          </div>

          {isTeacher ? (
            <>
              <div className="px-4 pb-3 flex flex-wrap gap-2">
                <Button variant="outline" size="sm" onClick={() => navigate(`/classrooms/${classroomId}/activities/${activity.id}`)}>
                  <Pencil className="w-3.5 h-3.5 mr-1" /> Edit
                </Button>
                <Button variant="outline" size="sm" className="text-destructive hover:text-destructive" onClick={handleDelete}>
                  <Trash2 className="w-3.5 h-3.5 mr-1" /> Delete
                </Button>
                <Button variant="outline" size="sm" onClick={() => setShowComments(!showComments)}>
                  <MessageSquare className="w-3.5 h-3.5 mr-1" /> Comments
                </Button>
              </div>
              <div className="border-t border-border p-4 space-y-1">
                <p className="text-xs font-medium text-muted-foreground uppercase tracking-wide mb-2">Student Progress</p>
                {enrollments.length === 0 ? (
                  <p className="text-sm text-muted-foreground text-center py-2">No students enrolled.</p>
                ) : (
                  enrollments.map((e) => {
                    const sid = e.student_id || e.created_by_id;
                    const resp = activityResponses.find((r) => r.student_id === sid);
                    const submitted = !!resp;
                    const missedStudent = !submitted && missed;
                    return (
                      <div key={sid} className="flex items-center justify-between gap-3 py-2">
                        <span className="text-sm font-medium truncate">{e.student_name}</span>
                        {submitted ? (
                          <span className="inline-flex items-center gap-1 text-xs font-medium text-emerald-600 bg-emerald-50 px-2 py-1 rounded-full shrink-0">
                            <CheckCircle2 className="w-3 h-3" /> Done ({resp.total_score}/{resp.max_score})
                          </span>
                        ) : missedStudent ? (
                          <span className="inline-flex items-center gap-1 text-xs font-medium text-red-600 bg-red-50 px-2 py-1 rounded-full shrink-0">
                            <AlertTriangle className="w-3 h-3" /> Missed
                          </span>
                        ) : (
                          <span className="inline-flex items-center gap-1 text-xs font-medium text-muted-foreground bg-muted px-2 py-1 rounded-full shrink-0">
                            <Clock className="w-3 h-3" /> Pending
                          </span>
                        )}
                      </div>
                    );
                  })
                )}
              </div>
              {showComments && (
                <div className="border-t border-border p-4 space-y-2">
                  {comments.length === 0 && loadedComments && <p className="text-xs text-muted-foreground">No comments yet.</p>}
                  {comments.map((c) => (
                    <div key={c.id} className="text-sm">
                      <span className="font-medium">{c.user_name}: </span>
                      <span className="text-muted-foreground">{c.message}</span>
                    </div>
                  ))}
                  <div className="flex gap-2">
                    <Input value={commentText} onChange={(e) => setCommentText(e.target.value)} placeholder="Add a comment..." className="text-sm" onKeyDown={(e) => e.key === "Enter" && handleComment()} />
                    <Button size="icon" onClick={handleComment}><Send className="w-4 h-4" /></Button>
                  </div>
                </div>
              )}
            </>
          ) : (
            <div className="px-4 pb-4">
              <Button onClick={() => navigate(`/classrooms/${classroomId}/activities/${activity.id}/take`)} className="w-full">
                Start Activity <ExternalLink className="w-3.5 h-3.5 ml-1" />
              </Button>
            </div>
          )}
        </div>
      )}
    </div>
  );
}