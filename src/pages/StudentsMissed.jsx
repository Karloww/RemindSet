import React, { useEffect, useState } from "react";
import { useNavigate } from "react-router-dom";
import { base44 } from "@/api/base44Client";
import { useAuth } from "@/lib/AuthContext";
import { Button } from "@/components/ui/button";
import { AlertTriangle, MessageCircle, RotateCcw } from "lucide-react";
import { toast } from "@/components/ui/use-toast";

export default function StudentsMissed() {
  const { user } = useAuth();
  const navigate = useNavigate();
  const [missed, setMissed] = useState([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (!user) return;
    let active = true;
    (async () => {
      try {
        const [cls, acts, resps, enr] = await Promise.all([
          base44.entities.Classroom.filter({ created_by_id: user.id }, "-created_date", 50),
          base44.entities.Activity.filter({ created_by_id: user.id }, "-created_date", 200),
          base44.entities.ActivityResponse.filter({}, "-created_date", 500),
          base44.entities.ClassroomEnrollment.filter({}, "-created_date", 500),
        ]);
        const clsList = cls || [];
        const myEnrollments = (enr || []).filter((e) => clsList.some((c) => c.id === e.classroom_id));
        const now = new Date();
        const missedList = [];
        for (const act of (acts || [])) {
          if (!act.deadline || new Date(act.deadline) >= now) continue;
          const enrolled = myEnrollments.filter((e) => e.classroom_id === act.classroom_id);
          for (const e of enrolled) {
            const hasResp = (resps || []).some((r) => r.activity_id === act.id && r.student_id === e.student_id);
            if (!hasResp) {
              const classroom = clsList.find((c) => c.id === act.classroom_id);
              missedList.push({ activity: act, student: e, classroom });
            }
          }
        }
        if (active) setMissed(missedList);
      } finally {
        if (active) setLoading(false);
      }
    })();
    return () => { active = false; };
  }, [user]);

  const handleRetake = async (activity, studentId, studentName) => {
    try {
      await base44.entities.Activity.update(activity.id, {
        max_retakes: (activity.max_retakes || 0) + 1,
      });
      await base44.entities.Notification.create({
        user_id: studentId,
        title: "Retake Granted",
        message: `You can now retake "${activity.title}".`,
        type: "activity",
        activity_id: activity.id,
        classroom_id: activity.classroom_id,
      });
      toast({ title: "Retake granted", description: `${studentName} can now retake this activity.` });
    } catch (e) {
      toast({ title: "Failed", description: e.message, variant: "destructive" });
    }
  };

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-bold tracking-tight flex items-center gap-2">
          <AlertTriangle className="w-6 h-6 text-red-500" /> Students Missed
        </h1>
        <p className="text-muted-foreground text-sm mt-1">Students who missed activities past the deadline.</p>
      </div>

      {loading ? (
        <div className="text-muted-foreground text-sm">Loading...</div>
      ) : missed.length === 0 ? (
        <div className="text-muted-foreground text-sm py-8 text-center bg-card border border-dashed border-border rounded-2xl">
          No students missed any activities. Great!
        </div>
      ) : (
        <div className="space-y-3">
          {missed.map((m, i) => (
            <div key={i} className="flex items-center gap-3 bg-card border border-border rounded-xl p-4 flex-wrap">
              <div className="rounded-lg bg-red-100 text-red-600 p-2 shrink-0">
                <AlertTriangle className="w-5 h-5" />
              </div>
              <div className="min-w-0 flex-1">
                <p className="font-medium truncate">{m.student.student_name}</p>
                <p className="text-xs text-muted-foreground mt-0.5">{m.activity.title} • {m.classroom?.subject_title || "Unknown"}</p>
                <p className="text-xs text-red-600 font-medium mt-0.5">
                  Missed • Due {new Date(m.activity.deadline).toLocaleString()}
                </p>
              </div>
              <Button variant="outline" size="sm" onClick={() => navigate(`/users/${m.student.student_id}`)}>
                <MessageCircle className="w-3.5 h-3.5" /> Message
              </Button>
              <Button variant="outline" size="sm" onClick={() => handleRetake(m.activity, m.student.student_id, m.student.student_name)}>
                <RotateCcw className="w-3.5 h-3.5" /> Retake
              </Button>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}