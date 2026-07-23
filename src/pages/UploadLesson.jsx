import React, { useState, useEffect } from "react";
import { useParams, useNavigate } from "react-router-dom";
import { base44 } from "@/api/base44Client";
import { useAuth } from "@/lib/AuthContext";
import { useProfile } from "@/lib/ProfileContext";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Upload, FileText, Loader2, X, ArrowLeft, Coins, CalendarClock, BookOpen } from "lucide-react";
import { toast } from "@/components/ui/use-toast";

export default function UploadLesson() {
  const { id } = useParams();
  const { user } = useAuth();
  const { profile } = useProfile();
  const navigate = useNavigate();
  const [classroom, setClassroom] = useState(null);
  const [title, setTitle] = useState("");
  const [subject, setSubject] = useState("");
  const [description, setDescription] = useState("");
  const [pointsReward, setPointsReward] = useState(10);
  const [scheduleDate, setScheduleDate] = useState("");
  const [scheduleTime, setScheduleTime] = useState("");
  const [file, setFile] = useState(null);
  const [uploading, setUploading] = useState(false);
  const [saving, setSaving] = useState(false);

  const teacherName = profile ? `${profile.first_name} ${profile.last_name}` : (user?.full_name || "Teacher");

  useEffect(() => {
    if (!id) return;
    let active = true;
    (async () => {
      try {
        const c = await base44.entities.Classroom.get(id);
        if (active) {
          setClassroom(c);
          setSubject(c.subject_title || "");
        }
      } catch { /* ignore */ }
    })();
    return () => { active = false; };
  }, [id]);

  const handleFile = (e) => {
    const f = e.target.files?.[0];
    if (f) setFile(f);
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    if (!title || !subject) {
      toast({ title: "Please fill in the title and subject.", variant: "destructive" });
      return;
    }
    setSaving(true);
    try {
      let file_url = "";
      let file_name = "";
      let file_type = "";
      if (file) {
        setUploading(true);
        const res = await base44.integrations.Core.UploadFile({ file });
        file_url = res.file_url;
        file_name = file.name;
        file_type = file.type;
        setUploading(false);
      }
      const scheduledISO = scheduleDate ? new Date(`${scheduleDate}T${scheduleTime || "00:00"}`).toISOString() : "";
      const lesson = await base44.entities.LessonPlan.create({
        title, subject, description, file_url, file_name, file_type, teacher_name: teacherName,
        points_reward: Number(pointsReward) || 0,
        scheduled_date: scheduledISO,
        classroom_id: id,
      });

      toast({ title: "Lesson uploaded!", description: "Now select which students to assign it to." });
      navigate(`/classrooms/${id}/lessons/${lesson.id}/assign`);
    } catch (err) {
      toast({ title: "Upload failed", description: err.message, variant: "destructive" });
      setUploading(false);
    } finally {
      setSaving(false);
    }
  };

  return (
    <div className="space-y-5 max-w-2xl mx-auto">
      <button onClick={() => navigate(`/classrooms/${id}`)} className="inline-flex items-center gap-1.5 text-sm text-muted-foreground hover:text-foreground">
        <ArrowLeft className="w-4 h-4" /> Back to class
      </button>

      <div>
        <h1 className="text-2xl font-bold tracking-tight">Upload a Lesson</h1>
        <p className="text-muted-foreground text-sm mt-1">
          {classroom ? `For ${classroom.subject_title} — ${classroom.year_and_section}` : "Assign a lesson to enrolled students."}
        </p>
      </div>

      <form onSubmit={handleSubmit} className="bg-card border border-border rounded-2xl p-6 space-y-5">
        <div className="space-y-2">
          <Label htmlFor="title">Lesson Title *</Label>
          <Input id="title" value={title} onChange={(e) => setTitle(e.target.value)} placeholder="e.g. Introduction to Fractions" required />
        </div>
        <div className="space-y-2">
          <Label htmlFor="subject">Subject *</Label>
          <Input id="subject" value={subject} onChange={(e) => setSubject(e.target.value)} placeholder="e.g. Mathematics" required />
        </div>
        <div className="space-y-2">
          <Label htmlFor="description">Description / Instructions</Label>
          <Textarea id="description" value={description} onChange={(e) => setDescription(e.target.value)} rows={5}
            placeholder="Briefly describe the lesson and what the student should do…" />
        </div>

        <div className="space-y-2">
          <Label htmlFor="points" className="flex items-center gap-1.5"><Coins className="w-3.5 h-3.5" /> Points Reward</Label>
          <Input id="points" type="number" min="1" value={pointsReward} onChange={(e) => setPointsReward(e.target.value)} placeholder="10" />
          <p className="text-xs text-muted-foreground">Points students earn on completion.</p>
        </div>
        <div className="space-y-2">
          <Label className="flex items-center gap-1.5"><CalendarClock className="w-3.5 h-3.5" /> Schedule (optional)</Label>
          <div className="grid grid-cols-2 gap-2">
            <Input type="date" value={scheduleDate} onChange={(e) => setScheduleDate(e.target.value)} />
            <Input type="time" value={scheduleTime} onChange={(e) => setScheduleTime(e.target.value)} />
          </div>
          <p className="text-xs text-muted-foreground">Deliver to students at this date/time.</p>
        </div>
        <div className="space-y-2">
          <Label>Attached File</Label>
          {file ? (
            <div className="flex items-center gap-3 border border-border rounded-xl p-4">
              <div className="rounded-lg bg-primary/10 text-primary p-2.5"><FileText className="w-5 h-5" /></div>
              <div className="min-w-0 flex-1"><p className="text-sm font-medium truncate">{file.name}</p><p className="text-xs text-muted-foreground">{(file.size / 1024).toFixed(0)} KB</p></div>
              <button type="button" onClick={() => setFile(null)} className="p-1 rounded-lg hover:bg-accent"><X className="w-4 h-4" /></button>
            </div>
          ) : (
            <label className="flex flex-col items-center justify-center gap-2 border-2 border-dashed border-border rounded-xl p-8 cursor-pointer hover:border-primary/40 transition-colors">
              <Upload className="w-6 h-6 text-muted-foreground" />
              <span className="text-sm text-muted-foreground">Click to upload a file (PDF, doc, image, etc.)</span>
              <input type="file" className="hidden" onChange={handleFile} />
            </label>
          )}
        </div>

        <Button type="submit" className="w-full h-12" disabled={saving}>
          {saving ? (
            <>{uploading ? <><Loader2 className="w-4 h-4 mr-2 animate-spin" />Uploading file…</> : <><Loader2 className="w-4 h-4 mr-2 animate-spin" />Saving…</>}</>
          ) : (
            <><Upload className="w-4 h-4 mr-2" /> Upload & Assign</>
          )}
        </Button>
      </form>
    </div>
  );
}