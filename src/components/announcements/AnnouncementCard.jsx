import React, { useState, useEffect } from "react";
import { base44 } from "@/api/base44Client";
import { useAuth } from "@/lib/AuthContext";
import { useProfile } from "@/lib/ProfileContext";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Pencil, Trash2, Eye, EyeOff, MessageSquare, Send, Heart, Flag } from "lucide-react";
import FilePreview from "@/components/FilePreview";
import ReportDialog from "@/components/ReportDialog";
import { toast } from "@/components/ui/use-toast";

export default function AnnouncementCard({ announcement, canEdit, onEdit, onUpdated }) {
  const { user } = useAuth();
  const { profile } = useProfile();
  const [comments, setComments] = useState([]);
  const [showComments, setShowComments] = useState(false);
  const [commentText, setCommentText] = useState("");
  const [deleting, setDeleting] = useState(false);
  const [loadedComments, setLoadedComments] = useState(false);
  const [likes, setLikes] = useState([]);
  const [likeBusy, setLikeBusy] = useState(false);

  const myName = profile ? `${profile.first_name} ${profile.last_name}` : (user?.full_name || "User");
  const myAccountType = profile?.account_type || "student";

  useEffect(() => {
    try {
      setLikes(JSON.parse(announcement.likes || "[]"));
    } catch {
      setLikes([]);
    }
  }, [announcement.likes]);

  const loadComments = async () => {
    try {
      const data = await base44.entities.AnnouncementComment.filter({ announcement_id: announcement.id }, "created_date", 200);
      setComments(data || []);
    } catch (e) { /* ignore */ }
    setLoadedComments(true);
  };

  useEffect(() => {
    if (showComments && !loadedComments) loadComments();
  }, [showComments, loadedComments]);

  const toggleLike = async () => {
    if (likeBusy || !user) return;
    setLikeBusy(true);
    const has = likes.includes(user.id);
    const next = has ? likes.filter((id) => id !== user.id) : [...likes, user.id];
    setLikes(next);
    try {
      await base44.entities.Announcement.update(announcement.id, { likes: JSON.stringify(next) });
      onUpdated?.();
    } catch {
      setLikes(likes);
    }
    setLikeBusy(false);
  };

  const handleComment = async () => {
    if (!commentText.trim()) return;
    try {
      await base44.entities.AnnouncementComment.create({
        announcement_id: announcement.id,
        user_id: user.id,
        user_name: myName,
        account_type: myAccountType,
        message: commentText.trim(),
      });
      setCommentText("");
      loadComments();
    } catch (e) {
      toast({ title: "Failed to comment", variant: "destructive" });
    }
  };

  const handleDelete = async () => {
    if (!confirm("Delete this announcement?")) return;
    setDeleting(true);
    try {
      await base44.entities.Announcement.delete(announcement.id);
      toast({ title: "Announcement deleted" });
      onUpdated?.();
    } catch (e) {
      toast({ title: "Failed to delete", variant: "destructive" });
    }
    setDeleting(false);
  };

  const toggleVisibility = async () => {
    try {
      await base44.entities.Announcement.update(announcement.id, {
        visibility: announcement.visibility === "open" ? "closed" : "open",
      });
      onUpdated?.();
    } catch (e) {
      toast({ title: "Failed to update", variant: "destructive" });
    }
  };

  const dateStr = announcement.created_date ? new Date(announcement.created_date).toLocaleDateString() : "";
  const hasLiked = user && likes.includes(user.id);

  return (
    <div className="bg-card border border-border rounded-xl p-4 space-y-2">
      <div className="flex items-start justify-between gap-2">
        <div className="min-w-0">
          <p className="font-semibold">{announcement.title}</p>
          <p className="text-xs text-muted-foreground">
            {announcement.author_name || "Unknown"}
            {announcement.classroom_name ? ` • ${announcement.classroom_name}` : ""}
            {announcement.type === "admin" ? " • Admin" : " • Teacher"}
            {dateStr ? ` • ${dateStr}` : ""}
          </p>
        </div>
        {canEdit && (
          <div className="flex items-center gap-1 shrink-0">
            <button onClick={() => onEdit?.(announcement)} className="p-1.5 rounded-lg hover:bg-accent" title="Edit">
              <Pencil className="w-3.5 h-3.5" />
            </button>
            <button onClick={toggleVisibility} className="p-1.5 rounded-lg hover:bg-accent" title="Toggle visibility">
              {announcement.visibility === "open" ? <Eye className="w-3.5 h-3.5" /> : <EyeOff className="w-3.5 h-3.5" />}
            </button>
            <button onClick={handleDelete} disabled={deleting} className="p-1.5 rounded-lg hover:bg-accent text-destructive" title="Delete">
              <Trash2 className="w-3.5 h-3.5" />
            </button>
          </div>
        )}
      </div>
      <p className="text-sm text-muted-foreground whitespace-pre-wrap">{announcement.message}</p>
      {announcement.file_url && <FilePreview fileUrl={announcement.file_url} />}
      <div className="flex items-center gap-3 pt-1">
        <button
          onClick={toggleLike}
          disabled={likeBusy}
          className={`flex items-center gap-1.5 text-xs transition-colors ${hasLiked ? "text-red-500" : "text-muted-foreground hover:text-red-500"}`}
        >
          <Heart className={`w-4 h-4 ${hasLiked ? "fill-current" : ""}`} />
          {likes.length > 0 && <span>{likes.length}</span>}
        </button>
        <button onClick={() => setShowComments(!showComments)} className="flex items-center gap-1.5 text-xs text-muted-foreground hover:text-foreground transition-colors">
          <MessageSquare className="w-3.5 h-3.5" /> Comments {comments.length > 0 && `(${comments.length})`}
        </button>
        <ReportDialog
          targetType="announcement"
          targetId={announcement.id}
          reportedUserId={announcement.created_by_id}
          reportedUserName={announcement.author_name}
          contentSnapshot={`${announcement.title}\n\n${announcement.message}`}
        >
          <button className="flex items-center gap-1.5 text-xs text-muted-foreground hover:text-destructive transition-colors">
            <Flag className="w-3.5 h-3.5" /> Report
          </button>
        </ReportDialog>
      </div>
      {showComments && (
        <div className="space-y-2 pt-2 border-t border-border">
          {comments.length === 0 && loadedComments && (
            <p className="text-xs text-muted-foreground">No comments yet.</p>
          )}
          {comments.map((c) => (
            <div key={c.id} className="flex items-start justify-between gap-2 text-sm">
              <div>
                <span className="font-medium">{c.user_name}: </span>
                <span className="text-muted-foreground">{c.message}</span>
              </div>
              {c.user_id !== user?.id && (
                <ReportDialog
                  targetType="announcement_comment"
                  targetId={c.id}
                  reportedUserId={c.user_id}
                  reportedUserName={c.user_name}
                  contentSnapshot={c.message}
                >
                  <button className="p-1 rounded text-muted-foreground hover:text-destructive shrink-0" title="Report">
                    <Flag className="w-3 h-3" />
                  </button>
                </ReportDialog>
              )}
            </div>
          ))}
          <div className="flex gap-2">
            <Input
              value={commentText}
              onChange={(e) => setCommentText(e.target.value)}
              placeholder="Add a comment..."
              className="text-sm"
              onKeyDown={(e) => e.key === "Enter" && handleComment()}
            />
            <Button size="icon" onClick={handleComment}><Send className="w-4 h-4" /></Button>
          </div>
        </div>
      )}
    </div>
  );
}