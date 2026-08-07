import React, { useState, useEffect } from "react";
import { useNavigate } from "react-router-dom";
import { base44 } from "@/api/base44Client";
import { useAuth } from "@/lib/AuthContext";
import { useProfile } from "@/lib/ProfileContext";
import HomeCalendar from "@/components/HomeCalendar";

export default function CalendarPage() {
  const { user } = useAuth();
  const { profile } = useProfile();
  const navigate = useNavigate();
  const [activities, setActivities] = useState([]);
  const [classrooms, setClassrooms] = useState([]);
  const [loading, setLoading] = useState(true);
  const isTeacher = profile?.account_type === "teacher";

  useEffect(() => {
    if (!user) return;
    let active = true;
    (async () => {
      try {
        if (isTeacher) {
          const [acts, cls] = await Promise.all([
            base44.entities.Activity.filter({ created_by_id: user.id }, "-created_date", 200),
            base44.entities.Classroom.filter({ created_by_id: user.id }, "-created_date", 50),
          ]);
          if (active) { setActivities(acts || []); setClassrooms(cls || []); }
        } else {
          const enr = await base44.entities.ClassroomEnrollment.filter({ student_id: user.id }, "-created_date", 50);
          const classroomIds = (enr || []).map((e) => e.classroom_id).filter(Boolean);
          let acts = [];
          if (classroomIds.length > 0) {
            const allActs = await base44.entities.Activity.filter({}, "-created_date", 500);
            acts = (allActs || []).filter((a) => classroomIds.includes(a.classroom_id));
          }
          if (active) { setActivities(acts); setClassrooms(enr || []); }
        }
      } catch (e) { /* ignore */ }
      finally { if (active) setLoading(false); }
    })();
    return () => { active = false; };
  }, [user, isTeacher]);

  const dotColors = ["bg-blue-500", "bg-emerald-500", "bg-amber-500", "bg-rose-500", "bg-violet-500", "bg-cyan-500"];

  return (
    <div className="flex gap-6">
      <div className="flex-1 min-w-0">
        <h1 className="text-xl font-bold mb-4">Calendar</h1>
        <HomeCalendar
          activities={activities}
          onActivityClick={(a) => navigate(`/classrooms/${a.classroom_id}/activities/${a.id}${isTeacher ? "" : "/take"}`)}
        />
      </div>

      <aside className="hidden lg:block w-64 shrink-0 space-y-4">
        <div className="bg-card border border-border rounded-2xl p-4">
          <h3 className="font-semibold text-sm mb-3">Calendars</h3>
          {loading ? (
            <div className="space-y-2">
              {[0, 1, 2].map((i) => <div key={i} className="h-5 rounded bg-muted animate-pulse" />)}
            </div>
          ) : classrooms.length === 0 ? (
            <p className="text-xs text-muted-foreground">No classes to show.</p>
          ) : (
            <div className="space-y-2">
              {classrooms.map((c, i) => (
                <div key={c.id} className="flex items-center gap-2 text-sm">
                  <span className={`w-2.5 h-2.5 rounded-full shrink-0 ${dotColors[i % dotColors.length]}`} />
                  <span className="truncate">{c.subject_title || c.classroom_id || c.year_and_section}</span>
                </div>
              ))}
            </div>
          )}
        </div>
      </aside>
    </div>
  );
}