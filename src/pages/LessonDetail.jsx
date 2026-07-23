import React, { useEffect, useState } from "react";
import { useParams, useNavigate, Link } from "react-router-dom";
import { base44 } from "@/api/base44Client";
import { useProfile } from "@/lib/ProfileContext";
import { Button } from "@/components/ui/button";
import { ArrowLeft, CheckCircle2, Coins, Download, FileText, Loader2, BookOpen } from "lucide-react";
import RoleBadge from "@/components/RoleBadge";
import confetti from "canvas-confetti";

export default function LessonDetail() {
  const { id } = useParams();
  const navigate = useNavigate();
  const { profile, setProfile } = useProfile();
  const [assignment, setAssignment] = useState(null);
  const [loading, setLoading] = useState(true);
  const [completing, setCompleting] = useState(false);

  useEffect(() => {
    if (!id) return;
    let active = true;
    (async () => {
      try {
        const data = await base44.entities.LessonAssignment.get(id);
        if (active) setAssignment(data);
      } finally {
        if (active) setLoading(false);
      }
    })();
    return () => { active = false; };
  }, [id]);

  const handleComplete = async () => {
    if (!assignment || assignment.status === "completed") return;
    setCompleting(true);
    try {
      const reward = assignment.points_reward ?? 10;
      const updated = await base44.entities.LessonAssignment.update(assignment.id, {
        status: "completed",
        viewed_date: new Date().toISOString(),
        points_earned: reward,
      });
      setAssignment(updated);
      // Award points to profile
      const newPoints = (profile.points || 0) + reward;
      const updatedProfile = await base44.entities.Profile.update(profile.id, { points: newPoints });
      setProfile(updatedProfile);
      // Celebrate
      confetti({ particleCount: 120, spread: 70, origin: { y: 0.6 } });
      // Notify the teacher
      try {
        await base44.entities.Notification.create({
          user_id: assignment.created_by_id,
          title: "Lesson completed",
          message: `${profile.first_name} ${profile.last_name} completed "${assignment.lesson_title}".`,
          read: false,
          classroom_id: assignment.classroom_id || "",
        });
      } catch (e) { /* ignore */ }
    } finally {
      setCompleting(false);
    }
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center py-20">
        <Loader2 className="w-6 h-6 animate-spin text-muted-foreground" />
      </div>
    );
  }

  if (!assignment) {
    return (
      <div className="text-center py-20">
        <p className="text-muted-foreground">Lesson not found.</p>
        <Link to="/classrooms" className="text-primary font-medium hover:underline mt-2 inline-block">Back to classes</Link>
      </div>
    );
  }

  const done = assignment.status === "completed";

  return (
    <div className="space-y-5 max-w-2xl mx-auto">
      <button onClick={() => navigate(assignment.classroom_id ? `/classrooms/${assignment.classroom_id}` : "/classrooms")} className="inline-flex items-center gap-1.5 text-sm text-muted-foreground hover:text-foreground">
        <ArrowLeft className="w-4 h-4" /> Back to class
      </button>

      <div className="bg-card border border-border rounded-2xl overflow-hidden">
        <div className="bg-primary/10 p-6">
          <div className="flex items-center gap-2 flex-wrap mb-2">
            <span className="text-xs font-medium text-primary bg-primary/15 px-2 py-0.5 rounded-full">{assignment.subject}</span>
            {done && <span className="inline-flex items-center gap-1 text-xs font-medium text-emerald-600 bg-emerald-50 px-2 py-0.5 rounded-full"><CheckCircle2 className="w-3 h-3" /> Completed</span>}
          </div>
          <h1 className="text-2xl font-bold tracking-tight">{assignment.lesson_title}</h1>
          <p className="text-sm text-muted-foreground mt-1">Assigned by {assignment.teacher_name}</p>
        </div>

        <div className="p-6 space-y-5">
          {assignment.description && (
            <div>
              <h3 className="text-sm font-semibold text-muted-foreground mb-2">Overview</h3>
              <p className="text-sm leading-relaxed whitespace-pre-wrap">{assignment.description}</p>
            </div>
          )}

          {assignment.file_url && (
            <div>
              <h3 className="text-sm font-semibold text-muted-foreground mb-2">Attached file</h3>
              <a href={assignment.file_url} target="_blank" rel="noreferrer"
                className="flex items-center gap-3 border border-border rounded-xl p-4 hover:border-primary/40 transition-colors">
                <div className="rounded-lg bg-primary/10 text-primary p-2.5"><FileText className="w-5 h-5" /></div>
                <div className="min-w-0 flex-1">
                  <p className="text-sm font-medium truncate">{assignment.file_name || "View file"}</p>
                  <p className="text-xs text-muted-foreground">Tap to open / download</p>
                </div>
                <Download className="w-4 h-4 text-muted-foreground" />
              </a>
            </div>
          )}

          {!assignment.file_url && !assignment.description && (
            <div className="flex items-center gap-3 text-muted-foreground text-sm">
              <BookOpen className="w-5 h-5" /> No additional materials for this lesson.
            </div>
          )}

          {/* Complete / earn points */}
          <div className={`rounded-xl p-5 ${done ? "bg-emerald-50 border border-emerald-100" : "bg-primary/5 border border-primary/10"}`}>
            {done ? (
              <div className="flex items-center gap-3">
                <CheckCircle2 className="w-8 h-8 text-emerald-600" />
                <div>
                  <p className="font-semibold text-emerald-700">Lesson completed!</p>
                  <p className="text-sm text-emerald-600">You earned {assignment.points_earned || assignment.points_reward || 10} points.</p>
                </div>
              </div>
            ) : (
              <div className="flex items-center justify-between gap-3 flex-wrap">
                <div className="flex items-center gap-3">
                  <div className="rounded-lg bg-primary text-primary-foreground p-2.5"><Coins className="w-5 h-5" /></div>
                  <div>
                    <p className="font-semibold">Complete this lesson</p>
                    <p className="text-sm text-muted-foreground">Earn {assignment.points_reward || 10} points when you're done.</p>
                  </div>
                </div>
                <Button onClick={handleComplete} disabled={completing}>
                  {completing ? <><Loader2 className="w-4 h-4 mr-2 animate-spin" />Marking…</> : "Mark as Completed"}
                </Button>
              </div>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}