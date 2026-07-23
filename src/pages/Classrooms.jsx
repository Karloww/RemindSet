import React, { useEffect, useState } from "react";
import { Link, useNavigate } from "react-router-dom";
import { base44 } from "@/api/base44Client";
import { useAuth } from "@/lib/AuthContext";
import { useProfile } from "@/lib/ProfileContext";
import { School, Plus, Users, BookOpen, ArrowRight, Loader2, KeyRound } from "lucide-react";
import { toast } from "@/components/ui/use-toast";

export default function Classrooms() {
  const { user } = useAuth();
  const { profile } = useProfile();
  const navigate = useNavigate();
  const [classrooms, setClassrooms] = useState([]);
  const [enrollments, setEnrollments] = useState([]);
  const [allEnrollments, setAllEnrollments] = useState([]);
  const [assignments, setAssignments] = useState([]);
  const [lessons, setLessons] = useState([]);
  const [loading, setLoading] = useState(true);
  const [showJoin, setShowJoin] = useState(false);
  const [joinCode, setJoinCode] = useState("");
  const [joining, setJoining] = useState(false);

  const isTeacher = profile?.account_type === "teacher";
  const studentName = profile ? `${profile.first_name} ${profile.last_name}` : "";

  useEffect(() => {
    if (!user || !profile) return;
    let active = true;
    (async () => {
      try {
        if (isTeacher) {
          const [cls, enr, lns] = await Promise.all([
            base44.entities.Classroom.filter({ created_by_id: user.id }, "-created_date", 100),
            base44.entities.ClassroomEnrollment.filter({}, "-created_date", 500),
            base44.entities.LessonPlan.filter({ created_by_id: user.id }, "-created_date", 200),
          ]);
          if (active) { setClassrooms(cls || []); setAllEnrollments(enr || []); setLessons(lns || []); }
        } else {
          const [enr, asg] = await Promise.all([
            base44.entities.ClassroomEnrollment.filter({ student_id: user.id }, "-created_date", 100),
            base44.entities.LessonAssignment.filter({ student_id: user.id }, "-created_date", 200),
          ]);
          const now = new Date().toISOString();
          if (active) {
            setEnrollments(enr || []);
            setAssignments((asg || []).filter((a) => !a.scheduled_date || a.scheduled_date <= now));
          }
        }
      } finally {
        if (active) setLoading(false);
      }
    })();
    return () => { active = false; };
  }, [user, profile, isTeacher]);

  const handleJoin = async () => {
    if (!joinCode.trim()) return;
    setJoining(true);
    try {
      const found = await base44.entities.Classroom.filter({ class_code: joinCode.trim().toUpperCase() });
      const classroom = found?.[0];
      if (!classroom) {
        toast({ title: "Class not found", description: "Check the code and try again.", variant: "destructive" });
        return;
      }
      const existing = await base44.entities.ClassroomEnrollment.filter({ classroom_id: classroom.id, student_id: user.id });
      if (existing?.length > 0) {
        toast({ title: "Already enrolled", description: "You're already in this class." });
        navigate(`/classrooms/${classroom.id}`);
        return;
      }
      await base44.entities.ClassroomEnrollment.create({
        classroom_id: classroom.id,
        student_id: user.id,
        student_name: studentName,
        subject_title: classroom.subject_title,
        year_and_section: classroom.year_and_section,
        teacher_name: classroom.teacher_name,
      });
      // Auto-assign existing lessons in this classroom to the student
      const existingLessons = await base44.entities.LessonPlan.filter({ classroom_id: classroom.id }, "-created_date", 100);
      if (existingLessons.length > 0) {
        const now = new Date().toISOString();
        const created = await base44.entities.LessonAssignment.bulkCreate(
          existingLessons.map((l) => ({
            lesson_id: l.id,
            lesson_title: l.title,
            subject: l.subject,
            description: l.description || "",
            file_url: l.file_url || "",
            file_name: l.file_name || "",
            teacher_name: l.teacher_name,
            student_id: user.id,
            student_name: studentName,
            status: "assigned",
            points_earned: 0,
            points_reward: l.points_reward ?? 10,
            scheduled_date: l.scheduled_date || "",
            classroom_id: classroom.id,
          }))
        );
        const visible = created.filter((a) => !a.scheduled_date || a.scheduled_date <= now);
        if (visible.length > 0) {
          await base44.entities.Notification.bulkCreate(
            visible.map((a) => ({
              user_id: user.id,
              title: "New lesson assigned",
              message: `${classroom.teacher_name} assigned you "${a.lesson_title}" (${a.subject}).`,
              read: false,
              assignment_id: a.id,
              classroom_id: classroom.id,
              scheduled_date: a.scheduled_date || "",
            }))
          );
        }
      }
      toast({ title: "Joined class!", description: classroom.subject_title });
      navigate(`/classrooms/${classroom.id}`);
    } catch (err) {
      toast({ title: "Failed to join", description: err.message, variant: "destructive" });
    } finally {
      setJoining(false);
    }
  };

  return (
    <div className="space-y-5">
      <div className="flex items-center justify-between flex-wrap gap-3">
        <div>
          <h1 className="text-2xl font-bold tracking-tight">Classes</h1>
          <p className="text-muted-foreground text-sm mt-1">
            {isTeacher ? "Create classes and share the code with students." : "Join a class with a code to access lessons."}
          </p>
        </div>
        {isTeacher ? (
          <Link to="/create-classroom" className="inline-flex items-center gap-2 bg-primary text-primary-foreground rounded-lg px-3 py-2 text-sm font-medium hover:bg-primary/90">
            <Plus className="w-4 h-4" /> New Class
          </Link>
        ) : (
          <button onClick={() => setShowJoin((s) => !s)} className="inline-flex items-center gap-2 bg-primary text-primary-foreground rounded-lg px-3 py-2 text-sm font-medium hover:bg-primary/90">
            <KeyRound className="w-4 h-4" /> Join Class
          </button>
        )}
      </div>



      {/* Join form */}
      {showJoin && !isTeacher && (
        <div className="bg-card border border-border rounded-2xl p-5 space-y-3">
          <h3 className="font-semibold flex items-center gap-2"><KeyRound className="w-4 h-4 text-primary" /> Enter Class Code</h3>
          <div className="flex gap-2">
            <input
              value={joinCode}
              onChange={(e) => setJoinCode(e.target.value.toUpperCase())}
              placeholder="e.g. ABC123"
              className="flex-1 h-11 rounded-lg border border-input bg-background px-3 text-sm font-mono uppercase tracking-wider"
              onKeyDown={(e) => e.key === "Enter" && handleJoin()}
              autoFocus
            />
            <button onClick={handleJoin} disabled={joining || !joinCode.trim()} className="inline-flex items-center gap-2 bg-primary text-primary-foreground rounded-lg px-4 text-sm font-medium hover:bg-primary/90 disabled:opacity-50">
              {joining ? <Loader2 className="w-4 h-4 animate-spin" /> : "Join"}
            </button>
          </div>
        </div>
      )}

      {loading ? (
        <div className="space-y-3">{[0, 1, 2].map((i) => <div key={i} className="h-24 rounded-xl bg-muted animate-pulse" />)}</div>
      ) : isTeacher ? (
        classrooms.length === 0 ? (
          <div className="text-center py-16 bg-card border border-dashed border-border rounded-2xl">
            <School className="w-10 h-10 text-muted-foreground mx-auto mb-3" />
            <p className="text-muted-foreground mb-4">No classes yet.</p>
            <Link to="/create-classroom" className="inline-flex items-center gap-2 text-primary font-medium hover:underline">Create your first class <ArrowRight className="w-4 h-4" /></Link>
          </div>
        ) : (
          <div className="space-y-3">
            {classrooms.map((c) => {
              const studentCount = allEnrollments.filter((e) => e.classroom_id === c.id).length;
              const lessonCount = lessons.filter((l) => l.classroom_id === c.id).length;
              return (
                <Link key={c.id} to={`/classrooms/${c.id}`} className="block bg-card border border-border rounded-xl p-4 hover:border-primary/40 transition-colors">
                  <div className="flex items-center justify-between gap-3">
                    <div className="min-w-0 flex-1">
                      <div className="flex items-center gap-2 flex-wrap">
                        <span className="text-xs font-medium text-primary bg-primary/10 px-2 py-0.5 rounded-full font-mono">{c.class_code}</span>
                      </div>
                      <p className="font-semibold mt-1.5 truncate">{c.subject_title}</p>
                      <p className="text-sm text-muted-foreground truncate">{c.year_and_section}</p>
                    </div>
                    <div className="flex items-center gap-3 shrink-0 text-xs text-muted-foreground">
                      <span className="inline-flex items-center gap-1"><Users className="w-3.5 h-3.5" /> {studentCount}</span>
                      <span className="inline-flex items-center gap-1"><BookOpen className="w-3.5 h-3.5" /> {lessonCount}</span>
                      <ArrowRight className="w-4 h-4" />
                    </div>
                  </div>
                </Link>
              );
            })}
          </div>
        )
      ) : enrollments.length === 0 ? (
        <div className="text-center py-16 bg-card border border-dashed border-border rounded-2xl">
          <School className="w-10 h-10 text-muted-foreground mx-auto mb-3" />
          <p className="text-muted-foreground mb-4">You haven't joined any classes yet.</p>
          <button onClick={() => setShowJoin(true)} className="inline-flex items-center gap-2 text-primary font-medium hover:underline">Join a class <KeyRound className="w-4 h-4" /></button>
        </div>
      ) : (
        <div className="space-y-3">
          {enrollments.map((e) => {
            const classAssignments = assignments.filter((a) => a.classroom_id === e.classroom_id);
            const done = classAssignments.filter((a) => a.status === "completed").length;
            return (
              <Link key={e.id} to={`/classrooms/${e.classroom_id}`} className="block bg-card border border-border rounded-xl p-4 hover:border-primary/40 transition-colors">
                <div className="flex items-center justify-between gap-3">
                  <div className="min-w-0 flex-1">
                    <p className="font-semibold truncate">{e.subject_title}</p>
                    <p className="text-sm text-muted-foreground truncate">{e.year_and_section} • {e.teacher_name}</p>
                  </div>
                  <div className="shrink-0 text-right">
                    <p className="text-xs text-muted-foreground">{classAssignments.length} lessons</p>
                    <p className="text-xs font-medium text-emerald-600">{done} done</p>
                  </div>
                  <ArrowRight className="w-4 h-4 text-muted-foreground shrink-0" />
                </div>
              </Link>
            );
          })}
        </div>
      )}
    </div>
  );
}