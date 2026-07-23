import React, { useState, useEffect } from "react";
import { useParams, useNavigate } from "react-router-dom";
import { base44 } from "@/api/base44Client";
import { useProfile } from "@/lib/ProfileContext";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { ArrowLeft, Search, Send, Loader2, CheckCircle2, Users, FileText, Coins, CalendarClock, Check } from "lucide-react";
import { toast } from "@/components/ui/use-toast";

export default function AssignLesson() {
  const { id, lessonId } = useParams();
  const { profile } = useProfile();
  const navigate = useNavigate();
  const [lesson, setLesson] = useState(null);
  const [enrollments, setEnrollments] = useState([]);
  const [existing, setExisting] = useState([]);
  const [selected, setSelected] = useState(new Set());
  const [search, setSearch] = useState("");
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);

  const teacherName = profile ? `${profile.first_name} ${profile.last_name}` : "Teacher";

  useEffect(() => {
    if (!id || !lessonId) return;
    let active = true;
    (async () => {
      try {
        const [lessonData, enr, asg] = await Promise.all([
          base44.entities.LessonPlan.get(lessonId),
          base44.entities.ClassroomEnrollment.filter({ classroom_id: id }, "created_date", 200),
          base44.entities.LessonAssignment.filter({ lesson_id: lessonId }, "-created_date", 500),
        ]);
        if (!active) return;
        setLesson(lessonData);
        setEnrollments(enr || []);
        setExisting(asg || []);
        const existingIds = new Set((asg || []).map((a) => a.student_id));
        setSelected(new Set((enr || []).filter((e) => !existingIds.has(e.student_id)).map((e) => e.student_id)));
      } finally {
        if (active) setLoading(false);
      }
    })();
    return () => { active = false; };
  }, [id, lessonId]);

  const toggle = (studentId) => {
    setSelected((prev) => {
      const next = new Set(prev);
      if (next.has(studentId)) next.delete(studentId);
      else next.add(studentId);
      return next;
    });
  };

  const filtered = enrollments.filter((e) =>
    !search || e.student_name?.toLowerCase().includes(search.toLowerCase())
  );

  const handleAssign = async () => {
    if (selected.size === 0) return;
    setSaving(true);
    try {
      const toAssign = enrollments.filter((e) => selected.has(e.student_id));
      const created = await base44.entities.LessonAssignment.bulkCreate(
        toAssign.map((e) => ({
          lesson_id: lesson.id,
          lesson_title: lesson.title,
          subject: lesson.subject,
          description: lesson.description || "",
          file_url: lesson.file_url || "",
          file_name: lesson.file_name || "",
          teacher_name: lesson.teacher_name || teacherName,
          student_id: e.student_id || e.created_by_id,
          student_name: e.student_name,
          status: "assigned",
          points_earned: 0,
          points_reward: lesson.points_reward || 10,
          scheduled_date: lesson.scheduled_date || "",
          classroom_id: id,
        }))
      );
      const now = new Date().toISOString();
      const visible = created.filter((a) => !a.scheduled_date || a.scheduled_date <= now);
      if (visible.length > 0) {
        await base44.entities.Notification.bulkCreate(
          visible.map((a) => ({
            user_id: a.student_id,
            title: "New lesson assigned",
            message: `${teacherName} assigned you "${lesson.title}" (${lesson.subject}).`,
            read: false,
            assignment_id: a.id,
            classroom_id: id,
            scheduled_date: a.scheduled_date || "",
          }))
        );
      }
      toast({ title: "Assigned!", description: `Lesson sent to ${selected.size} student${selected.size !== 1 ? "s" : ""}.` });
      navigate(`/classrooms/${id}`);
    } catch (err) {
      toast({ title: "Assignment failed", description: err.message, variant: "destructive" });
    } finally {
      setSaving(false);
    }
  };

  if (loading) return <div className="flex justify-center py-20"><Loader2 className="w-6 h-6 animate-spin text-muted-foreground" /></div>;
  if (!lesson) return <div className="text-center py-20 text-muted-foreground">Lesson not found.</div>;

  return (
    <div className="space-y-5 max-w-2xl mx-auto">
      <button onClick={() => navigate(`/classrooms/${id}`)} className="inline-flex items-center gap-1.5 text-sm text-muted-foreground hover:text-foreground">
        <ArrowLeft className="w-4 h-4" /> Back to class
      </button>

      <div className="bg-emerald-50 border border-emerald-200 rounded-2xl p-5 text-center">
        <CheckCircle2 className="w-8 h-8 text-emerald-600 mx-auto mb-2" />
        <h2 className="font-bold text-lg">Lesson uploaded!</h2>
        <p className="text-sm text-muted-foreground">Now assign it to your students.</p>
      </div>

      <div className="bg-card border border-border rounded-2xl p-5">
        <span className="text-xs font-medium text-primary bg-primary/10 px-2 py-0.5 rounded-full">{lesson.subject}</span>
        <h3 className="font-bold text-xl mt-2">{lesson.title}</h3>
        <p className="text-sm text-muted-foreground mt-0.5">by {lesson.teacher_name}</p>
        {lesson.description && <p className="text-sm text-muted-foreground mt-3">{lesson.description}</p>}
        <div className="flex flex-wrap items-center gap-2 mt-3">
          <span className="inline-flex items-center gap-1 text-xs font-medium text-amber-600 bg-amber-50 px-2 py-1 rounded-full"><Coins className="w-3 h-3" /> {lesson.points_reward || 10} pts</span>
          {lesson.scheduled_date && (
            <span className="inline-flex items-center gap-1 text-xs font-medium text-blue-600 bg-blue-50 px-2 py-1 rounded-full"><CalendarClock className="w-3 h-3" /> {new Date(lesson.scheduled_date).toLocaleString()}</span>
          )}
          {lesson.file_name && (
            <span className="inline-flex items-center gap-1 text-xs font-medium text-muted-foreground bg-muted px-2 py-1 rounded-full"><FileText className="w-3 h-3" /> {lesson.file_name}</span>
          )}
        </div>
      </div>

      <div>
        <h3 className="font-semibold mb-3 flex items-center gap-2"><Users className="w-5 h-5" /> Select Students</h3>
        <div className="relative mb-3">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
          <Input value={search} onChange={(e) => setSearch(e.target.value)} placeholder="Search students..." className="pl-9" />
        </div>
        {enrollments.length === 0 ? (
          <div className="text-center py-10 bg-card border border-dashed border-border rounded-2xl">
            <Users className="w-8 h-8 text-muted-foreground mx-auto mb-2" />
            <p className="text-muted-foreground text-sm">No students enrolled yet. Share the class code first.</p>
          </div>
        ) : (
          <div className="bg-card border border-border rounded-2xl divide-y divide-border overflow-hidden">
            {filtered.map((e) => {
              const isSel = selected.has(e.student_id);
              const alreadyAssigned = existing.some((a) => a.student_id === e.student_id);
              return (
                <button key={e.student_id} onClick={() => !alreadyAssigned && toggle(e.student_id)} disabled={alreadyAssigned}
                  className={`w-full flex items-center gap-3 p-4 transition-colors ${alreadyAssigned ? "opacity-50 cursor-not-allowed" : "hover:bg-accent"}`}>
                  <div className={`w-5 h-5 rounded-full border-2 flex items-center justify-center shrink-0 ${isSel ? "bg-primary border-primary" : "border-border"}`}>
                    {isSel && <Check className="w-3 h-3 text-primary-foreground" />}
                  </div>
                  <div className="min-w-0 flex-1 text-left">
                    <p className="font-medium text-sm truncate">{e.student_name}</p>
                  </div>
                  {alreadyAssigned ? (
                    <span className="text-xs font-medium text-emerald-600 bg-emerald-50 px-2 py-1 rounded-full shrink-0">Assigned</span>
                  ) : (
                    <span className="text-xs text-muted-foreground shrink-0">{lesson.points_reward || 10} pts</span>
                  )}
                </button>
              );
            })}
          </div>
        )}
      </div>

      {enrollments.length > 0 && (
        <Button onClick={handleAssign} className="w-full h-12" disabled={saving || selected.size === 0}>
          {saving ? <><Loader2 className="w-4 h-4 mr-2 animate-spin" />Assigning…</> : <><Send className="w-4 h-4 mr-2" /> Assign to {selected.size} Student{selected.size !== 1 ? "s" : ""}</>}
        </Button>
      )}
    </div>
  );
}