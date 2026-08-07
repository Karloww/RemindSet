import React, { useEffect, useState } from "react";
import { Link, useSearchParams } from "react-router-dom";
import { base44 } from "@/api/base44Client";
import { useAuth } from "@/lib/AuthContext";
import { BookOpen, CheckCircle2, AlertTriangle, ArrowRight } from "lucide-react";

export default function StudentLessons() {
  const { user } = useAuth();
  const [searchParams] = useSearchParams();
  const initialTab = searchParams.get("tab") === "completed" ? "completed" : "pending";
  const [tab, setTab] = useState(initialTab);
  const [assignments, setAssignments] = useState([]);
  const [enrollments, setEnrollments] = useState([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (!user) return;
    let active = true;
    (async () => {
      try {
        const [asg, enr] = await Promise.all([
          base44.entities.LessonAssignment.filter({ student_id: user.id }, "-created_date", 200),
          base44.entities.ClassroomEnrollment.filter({ student_id: user.id }, "-created_date", 50),
        ]);
        if (active) {
          setAssignments(asg || []);
          setEnrollments(enr || []);
        }
      } finally {
        if (active) setLoading(false);
      }
    })();
    return () => { active = false; };
  }, [user]);

  const subjectName = (classroomId) => {
    const enr = enrollments.find((e) => e.classroom_id === classroomId);
    if (enr) return enr.subject_title;
    return assignments.find((a) => a.classroom_id === classroomId)?.subject || "Unknown";
  };

  const completed = assignments.filter((a) => a.status === "completed");
  const unfinished = assignments.filter((a) => a.status !== "completed");
  const now = new Date();
  const display = tab === "completed" ? completed : unfinished;

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-bold tracking-tight">Lessons</h1>
        <p className="text-muted-foreground text-sm mt-1">All your lessons across all subjects.</p>
      </div>

      <div className="flex gap-2">
        <button
          onClick={() => setTab("pending")}
          className={`px-4 py-2 rounded-full text-sm font-medium transition-colors ${tab === "pending" ? "bg-primary text-primary-foreground" : "bg-muted text-muted-foreground hover:bg-accent"}`}
        >
          Unfinished ({unfinished.length})
        </button>
        <button
          onClick={() => setTab("completed")}
          className={`px-4 py-2 rounded-full text-sm font-medium transition-colors ${tab === "completed" ? "bg-primary text-primary-foreground" : "bg-muted text-muted-foreground hover:bg-accent"}`}
        >
          Completed ({completed.length})
        </button>
      </div>

      {loading ? (
        <div className="text-muted-foreground text-sm">Loading...</div>
      ) : display.length === 0 ? (
        <div className="text-muted-foreground text-sm py-8 text-center bg-card border border-dashed border-border rounded-2xl">
          {tab === "completed" ? "No completed lessons yet." : "No unfinished lessons."}
        </div>
      ) : (
        <div className="space-y-3">
          {display.map((a) => {
            const isMissed = tab === "pending" && a.scheduled_date && new Date(a.scheduled_date) < now;
            return (
              <Link
                key={a.id}
                to={`/lessons/${a.lesson_id}`}
                className="flex items-center gap-3 bg-card border border-border rounded-xl p-4 hover:border-primary/30 transition-colors"
              >
                <div className={`rounded-lg p-2 shrink-0 ${isMissed ? "bg-red-100 text-red-600" : tab === "completed" ? "bg-emerald-100 text-emerald-600" : "bg-blue-100 text-blue-600"}`}>
                  {tab === "completed" ? <CheckCircle2 className="w-5 h-5" /> : isMissed ? <AlertTriangle className="w-5 h-5" /> : <BookOpen className="w-5 h-5" />}
                </div>
                <div className="min-w-0 flex-1">
                  <p className="font-medium truncate">{a.lesson_title}</p>
                  <p className="text-xs text-muted-foreground mt-0.5">{a.subject || subjectName(a.classroom_id)}</p>
                  <p className={`text-xs mt-0.5 ${isMissed ? "text-red-600 font-medium" : "text-muted-foreground"}`}>
                    {a.scheduled_date ? (isMissed ? `Missed • Due ${new Date(a.scheduled_date).toLocaleString()}` : `Due ${new Date(a.scheduled_date).toLocaleString()}`) : "No deadline"}
                  </p>
                </div>
                <ArrowRight className="w-4 h-4 text-muted-foreground shrink-0" />
              </Link>
            );
          })}
        </div>
      )}
    </div>
  );
}