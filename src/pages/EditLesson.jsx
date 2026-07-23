import React, { useState, useEffect } from "react";
import { useParams, useNavigate } from "react-router-dom";
import { base44 } from "@/api/base44Client";
import { useProfile } from "@/lib/ProfileContext";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Upload, FileText, Loader2, X, ArrowLeft, Coins, CalendarClock } from "lucide-react";
import { toast } from "@/components/ui/use-toast";

export default function EditLesson() {
  const { id, lessonId } = useParams();
  const { profile } = useProfile();
  const navigate = useNavigate();
  const [title, setTitle] = useState("");
  const [subject, setSubject] = useState("");
  const [description, setDescription] = useState("");
  const [pointsReward, setPointsReward] = useState(10);
  const [scheduleDate, setScheduleDate] = useState("");
  const [scheduleTime, setScheduleTime] = useState("");
  const [fileUrl, setFileUrl] = useState("");
  const [fileName, setFileName] = useState("");
  const [fileType, setFileType] = useState("");
  const [file, setFile] = useState(null);
  const [uploading, setUploading] = useState(false);
  const [saving, setSaving] = useState(false);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (!lessonId) return;
    let active = true;
    (async () => {
      try {
        const lesson = await base44.entities.LessonPlan.get(lessonId);
        if (!active) return;
        setTitle(lesson.title || "");
        setSubject(lesson.subject || "");
        setDescription(lesson.description || "");
        setPointsReward(lesson.points_reward || 10);
        setFileUrl(lesson.file_url || "");
        setFileName(lesson.file_name || "");
        setFileType(lesson.file_type || "");
        if (lesson.scheduled_date) {
          const d = new Date(lesson.scheduled_date);
          setScheduleDate(d.toISOString().split("T")[0]);
          setScheduleTime(d.toTimeString().slice(0, 5));
        }
      } finally {
        if (active) setLoading(false);
      }
    })();
    return () => { active = false; };
  }, [lessonId]);

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
      let f_url = fileUrl;
      let f_name = fileName;
      let f_type = fileType;
      if (file) {
        setUploading(true);
        const res = await base44.integrations.Core.UploadFile({ file });
        f_url = res.file_url;
        f_name = file.name;
        f_type = file.type;
        setUploading(false);
      }
      const scheduledISO = scheduleDate ? new Date(`${scheduleDate}T${scheduleTime || "00:00"}`).toISOString() : "";
      await base44.entities.LessonPlan.update(lessonId, {
        title, subject, description,
        file_url: f_url, file_name: f_name, file_type: f_type,
        points_reward: Number(pointsReward) || 0,
        scheduled_date: scheduledISO,
      });
      const existing = await base44.entities.LessonAssignment.filter({ lesson_id: lessonId }, "-created_date", 500);
      if (existing.length > 0) {
        await base44.entities.LessonAssignment.bulkUpdate(
          existing.map((a) => ({
            id: a.id,
            lesson_title: title,
            subject,
            description: description || "",
            file_url: f_url,
            file_name: f_name,
            points_reward: Number(pointsReward) || 0,
            scheduled_date: scheduledISO,
          }))
        );
      }
      toast({ title: "Lesson updated!" });
      navigate(`/classrooms/${id}`);
    } catch (err) {
      toast({ title: "Update failed", description: err.message, variant: "destructive" });
      setUploading(false);
    } finally {
      setSaving(false);
    }
  };

  if (loading) return <div className="flex justify-center py-20"><Loader2 className="w-6 h-6 animate-spin text-muted-foreground" /></div>;

  return (
    <div className="space-y-5 max-w-2xl mx-auto">
      <button onClick={() => navigate(`/classrooms/${id}`)} className="inline-flex items-center gap-1.5 text-sm text-muted-foreground hover:text-foreground">
        <ArrowLeft className="w-4 h-4" /> Back to class
      </button>
      <div>
        <h1 className="text-2xl font-bold tracking-tight">Edit Lesson</h1>
        <p className="text-muted-foreground text-sm mt-1">Update the lesson details and assigned content.</p>
      </div>
      <form onSubmit={handleSubmit} className="bg-card border border-border rounded-2xl p-6 space-y-5">
        <div className="space-y-2">
          <Label htmlFor="title">Lesson Title *</Label>
          <Input id="title" value={title} onChange={(e) => setTitle(e.target.value)} required />
        </div>
        <div className="space-y-2">
          <Label htmlFor="subject">Subject *</Label>
          <Input id="subject" value={subject} onChange={(e) => setSubject(e.target.value)} required />
        </div>
        <div className="space-y-2">
          <Label htmlFor="description">Description / Instructions</Label>
          <Textarea id="description" value={description} onChange={(e) => setDescription(e.target.value)} rows={5} />
        </div>
        <div className="space-y-2">
          <Label htmlFor="points" className="flex items-center gap-1.5"><Coins className="w-3.5 h-3.5" /> Points Reward</Label>
          <Input id="points" type="number" min="1" value={pointsReward} onChange={(e) => setPointsReward(e.target.value)} />
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
          {fileName && !file ? (
            <div className="flex items-center gap-3 border border-border rounded-xl p-4">
              <div className="rounded-lg bg-primary/10 text-primary p-2.5"><FileText className="w-5 h-5" /></div>
              <div className="min-w-0 flex-1"><p className="text-sm font-medium truncate">{fileName}</p></div>
              <button type="button" onClick={() => { setFileName(""); setFileUrl(""); }} className="p-1 rounded-lg hover:bg-accent"><X className="w-4 h-4" /></button>
            </div>
          ) : file ? (
            <div className="flex items-center gap-3 border border-border rounded-xl p-4">
              <div className="rounded-lg bg-primary/10 text-primary p-2.5"><FileText className="w-5 h-5" /></div>
              <div className="min-w-0 flex-1"><p className="text-sm font-medium truncate">{file.name}</p><p className="text-xs text-muted-foreground">{(file.size / 1024).toFixed(0)} KB</p></div>
              <button type="button" onClick={() => setFile(null)} className="p-1 rounded-lg hover:bg-accent"><X className="w-4 h-4" /></button>
            </div>
          ) : (
            <label className="flex flex-col items-center justify-center gap-2 border-2 border-dashed border-border rounded-xl p-8 cursor-pointer hover:border-primary/40 transition-colors">
              <Upload className="w-6 h-6 text-muted-foreground" />
              <span className="text-sm text-muted-foreground">Upload a new file (optional)</span>
              <input type="file" className="hidden" onChange={handleFile} />
            </label>
          )}
        </div>
        <Button type="submit" className="w-full h-12" disabled={saving}>
          {saving ? (
            <>{uploading ? <><Loader2 className="w-4 h-4 mr-2 animate-spin" />Uploading file…</> : <><Loader2 className="w-4 h-4 mr-2 animate-spin" />Saving…</>}</>
          ) : (
            <>Save Changes</>
          )}
        </Button>
      </form>
    </div>
  );
}