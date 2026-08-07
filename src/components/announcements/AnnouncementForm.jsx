import React, { useState, useEffect } from "react";
import { base44 } from "@/api/base44Client";
import { useAuth } from "@/lib/AuthContext";
import { useProfile } from "@/lib/ProfileContext";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Label } from "@/components/ui/label";
import { Loader2 } from "lucide-react";
import { toast } from "@/components/ui/use-toast";

export default function AnnouncementForm({ onSaved, onCancel, existing, fixedClassroomId, fixedClassroomName }) {
  const { user } = useAuth();
  const { profile } = useProfile();
  const [title, setTitle] = useState(existing?.title || "");
  const [message, setMessage] = useState(existing?.message || "");
  const [classroomId, setClassroomId] = useState(existing?.classroom_id || fixedClassroomId || "");
  const [visibility, setVisibility] = useState(existing?.visibility || "open");
  const [fileUrl, setFileUrl] = useState(existing?.file_url || "");
  const [classrooms, setClassrooms] = useState([]);
  const [saving, setSaving] = useState(false);
  const [uploading, setUploading] = useState(false);

  const isAdmin = user?.role === "admin";
  const isTeacher = profile?.account_type === "teacher";

  useEffect(() => {
    if (isTeacher && user && !fixedClassroomId) {
      (async () => {
        try {
          const cls = await base44.entities.Classroom.filter({ created_by_id: user.id }, "-created_date", 50);
          setClassrooms(cls || []);
        } catch (e) { /* ignore */ }
      })();
    }
  }, [isTeacher, user, fixedClassroomId]);

  const handleFile = async (e) => {
    const file = e.target.files?.[0];
    if (!file) return;
    setUploading(true);
    try {
      const result = await base44.integrations.Core.UploadFile({ file });
      setFileUrl(result.file_url);
    } catch (err) {
      toast({ title: "Upload failed", description: err.message, variant: "destructive" });
    }
    setUploading(false);
  };

  const handleSubmit = async () => {
    if (!title.trim() || !message.trim()) {
      toast({ title: "Please fill in all fields", variant: "destructive" });
      return;
    }
    if (isTeacher && !classroomId && !existing && !fixedClassroomId) {
      toast({ title: "Please select a classroom", variant: "destructive" });
      return;
    }
    setSaving(true);
    try {
      const data = {
        title: title.trim(),
        message: message.trim(),
        type: isAdmin ? "admin" : "teacher",
        author_name: profile ? `${profile.first_name} ${profile.last_name}` : "Unknown",
        classroom_id: isAdmin ? "" : (classroomId || fixedClassroomId || ""),
        classroom_name: isAdmin ? "" : (fixedClassroomName || classrooms.find((c) => c.id === classroomId)?.subject_title || ""),
        visibility,
        file_url: fileUrl || "",
        likes: existing?.likes || "[]",
      };
      if (existing) {
        await base44.entities.Announcement.update(existing.id, data);
        toast({ title: "Announcement updated" });
      } else {
        await base44.entities.Announcement.create(data);
        // Notify enrolled students about classroom announcements
        const cid = data.classroom_id;
        if (cid) {
          try {
            const enrollments = await base44.entities.ClassroomEnrollment.filter({ classroom_id: cid }, "-created_date", 200);
            const studentIds = (enrollments || []).map((e) => e.student_id || e.created_by_id).filter((sid) => sid !== user.id);
            if (studentIds.length > 0) {
              await base44.entities.Notification.bulkCreate(
                studentIds.map((sid) => ({
                  user_id: sid,
                  title: `New announcement: ${data.title}`,
                  message: data.message.slice(0, 100),
                  read: false,
                  type: "announcement",
                  classroom_id: cid,
                }))
              );
            }
          } catch (e) { /* ignore notification errors */ }
        }
        toast({ title: "Announcement posted" });
      }
      onSaved?.();
    } catch (err) {
      toast({ title: "Failed to save", description: err.message, variant: "destructive" });
    }
    setSaving(false);
  };

  return (
    <div className="space-y-3 bg-card border border-border rounded-xl p-4">
      <div>
        <Label>Title</Label>
        <Input value={title} onChange={(e) => setTitle(e.target.value)} placeholder="Announcement title" />
      </div>
      <div>
        <Label>Message</Label>
        <Textarea value={message} onChange={(e) => setMessage(e.target.value)} placeholder="Write your announcement..." rows={3} />
      </div>
      {isTeacher && !fixedClassroomId && (
        <div>
          <Label>Classroom</Label>
          <select value={classroomId} onChange={(e) => setClassroomId(e.target.value)} className="w-full h-9 rounded-md border border-input bg-transparent px-3 text-sm">
            <option value="">Select a classroom</option>
            {classrooms.map((c) => <option key={c.id} value={c.id}>{c.subject_title} - {c.year_and_section}</option>)}
          </select>
        </div>
      )}
      <div>
        <Label>Visibility</Label>
        <select value={visibility} onChange={(e) => setVisibility(e.target.value)} className="w-full h-9 rounded-md border border-input bg-transparent px-3 text-sm">
          <option value="open">Open (visible to everyone)</option>
          <option value="closed">Closed (hidden)</option>
        </select>
      </div>
      <div>
        <Label>File Attachment</Label>
        <div className="flex items-center gap-2">
          <input type="file" onChange={handleFile} className="text-sm" disabled={uploading} />
          {uploading && <Loader2 className="w-4 h-4 animate-spin" />}
        </div>
        {fileUrl && <p className="text-xs text-emerald-600 mt-1">File attached ✓</p>}
      </div>
      <div className="flex gap-2">
        <Button onClick={handleSubmit} disabled={saving}>
          {saving ? <Loader2 className="w-4 h-4 animate-spin" /> : null}
          {existing ? "Update" : "Post"}
        </Button>
        {onCancel && <Button variant="outline" onClick={onCancel}>Cancel</Button>}
      </div>
    </div>
  );
}