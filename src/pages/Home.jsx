import React, { useEffect, useState } from "react";
import { Link } from "react-router-dom";
import { base44 } from "@/api/base44Client";
import { useAuth } from "@/lib/AuthContext";
import { useProfile } from "@/lib/ProfileContext";
import { School, Coins, CheckCircle2, ShoppingBag, ArrowRight, Plus, BookOpen, Users } from "lucide-react";
import RoleBadge from "@/components/RoleBadge";

export default function Home() {
  const { user } = useAuth();
  const { profile } = useProfile();
  const [classrooms, setClassrooms] = useState([]);
  const [enrollments, setEnrollments] = useState([]);
  const [assignments, setAssignments] = useState([]);
  const [lessons, setLessons] = useState([]);
  const [loading, setLoading] = useState(true);

  const isTeacher = profile?.account_type === "teacher";

  useEffect(() => {
    if (!user || !profile) return;
    let active = true;
    (async () => {
      try {
        if (isTeacher) {
          const [cls, lns] = await Promise.all([
            base44.entities.Classroom.filter({ created_by_id: user.id }, "-created_date", 50),
            base44.entities.LessonPlan.filter({ created_by_id: user.id }, "-created_date", 50),
          ]);
          if (active) { setClassrooms(cls || []); setLessons(lns || []); }
        } else {
          const [enr, asg] = await Promise.all([
            base44.entities.ClassroomEnrollment.filter({ student_id: user.id }, "-created_date", 50),
            base44.entities.LessonAssignment.filter({ student_id: user.id }, "-created_date", 50),
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

  if (!profile) return null;

  const studentCompleted = assignments.filter((a) => a.status === "completed").length;
  const studentPending = assignments.filter((a) => a.status !== "completed").length;

  return (
    <div className="space-y-6">
      {/* Greeting */}
      <div className="flex items-center justify-between flex-wrap gap-3">
        <div>
          <h1 className="text-2xl font-bold tracking-tight">Hi, {profile.first_name}! 👋</h1>
          <p className="text-muted-foreground text-sm mt-1">
            {isTeacher ? "Manage your classrooms and lessons." : "Catch up on the lessons you missed."}
          </p>
        </div>
        <RoleBadge accountType={profile.account_type} />
      </div>

      {/* Stats card */}
      {isTeacher ? (
        <div className="grid grid-cols-2 gap-4">
          <StatCard icon={School} label="Classrooms" value={loading ? "—" : classrooms.length} />
          <StatCard icon={BookOpen} label="Lessons" value={loading ? "—" : lessons.length} />
        </div>
      ) : (
        <div className="rounded-2xl bg-gradient-to-br from-primary to-primary/70 text-primary-foreground p-6 shadow-lg shadow-primary/20">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-primary-foreground/80 text-sm font-medium">Your Points</p>
              <div className="flex items-center gap-2 mt-1">
                <Coins className="w-7 h-7" />
                <span className="text-4xl font-bold">{profile.points || 0}</span>
              </div>
            </div>
            <Link to="/shop" className="bg-white/20 hover:bg-white/30 transition-colors rounded-xl p-3">
              <ShoppingBag className="w-6 h-6" />
            </Link>
          </div>
          <div className="grid grid-cols-2 gap-3 mt-5">
            <div className="bg-white/15 rounded-xl p-3">
              <p className="text-2xl font-bold">{loading ? "—" : studentPending}</p>
              <p className="text-xs text-primary-foreground/80">Pending</p>
            </div>
            <div className="bg-white/15 rounded-xl p-3">
              <p className="text-2xl font-bold">{loading ? "—" : studentCompleted}</p>
              <p className="text-xs text-primary-foreground/80">Completed</p>
            </div>
          </div>
        </div>
      )}

      {/* Teacher create CTA */}
      {isTeacher && (
        <Link to="/create-classroom" className="flex items-center justify-between rounded-2xl border border-dashed border-primary/40 bg-primary/5 p-5 hover:bg-primary/10 transition-colors">
          <div className="flex items-center gap-3">
            <div className="rounded-xl bg-primary text-primary-foreground p-3"><Plus className="w-5 h-5" /></div>
            <div>
              <p className="font-semibold">Create a new classroom</p>
              <p className="text-sm text-muted-foreground">Set up a class and share the code with students.</p>
            </div>
          </div>
          <ArrowRight className="w-5 h-5 text-primary" />
        </Link>
      )}

      {/* Recent list */}
      <div>
        <div className="flex items-center justify-between mb-3">
          <h2 className="text-lg font-semibold">{isTeacher ? "Your Classrooms" : "Your Classes"}</h2>
          <Link to="/classrooms" className="text-sm text-primary font-medium hover:underline">View all</Link>
        </div>
        {loading ? (
          <SkeletonList />
        ) : isTeacher ? (
          classrooms.length === 0 ? (
            <EmptyState text="No classrooms yet." to="/create-classroom" cta="Create Class" />
          ) : (
            <div className="space-y-3">
              {classrooms.slice(0, 5).map((c) => (
                <Link key={c.id} to={`/classrooms/${c.id}`} className="block bg-card border border-border rounded-xl p-4 hover:border-primary/40 transition-colors">
                  <div className="flex items-center justify-between gap-3">
                    <div className="min-w-0">
                      <p className="font-medium truncate">{c.subject_title}</p>
                      <p className="text-sm text-muted-foreground truncate">{c.year_and_section}</p>
                    </div>
                    <ArrowRight className="w-4 h-4 text-muted-foreground shrink-0" />
                  </div>
                </Link>
              ))}
            </div>
          )
        ) : enrollments.length === 0 ? (
          <EmptyState text="You haven't joined any classes yet." to="/classrooms" cta="Join a Class" />
        ) : (
          <div className="space-y-3">
            {enrollments.slice(0, 5).map((e) => (
              <Link key={e.id} to={`/classrooms/${e.classroom_id}`} className="block bg-card border border-border rounded-xl p-4 hover:border-primary/40 transition-colors">
                <div className="flex items-center justify-between gap-3">
                  <div className="min-w-0">
                    <p className="font-medium truncate">{e.subject_title}</p>
                    <p className="text-sm text-muted-foreground truncate">{e.year_and_section} • {e.teacher_name}</p>
                  </div>
                  <ArrowRight className="w-4 h-4 text-muted-foreground shrink-0" />
                </div>
              </Link>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}

function StatCard({ icon: Icon, label, value }) {
  return (
    <div className="bg-card border border-border rounded-2xl p-5">
      <div className="rounded-xl bg-primary/10 text-primary p-2 w-fit mb-3"><Icon className="w-5 h-5" /></div>
      <p className="text-3xl font-bold">{value}</p>
      <p className="text-sm text-muted-foreground">{label}</p>
    </div>
  );
}

function SkeletonList() {
  return (
    <div className="space-y-3">
      {[0, 1, 2].map((i) => <div key={i} className="h-16 rounded-xl bg-muted animate-pulse" />)}
    </div>
  );
}

function EmptyState({ text, to, cta }) {
  return (
    <div className="text-center py-10 bg-card border border-dashed border-border rounded-2xl">
      <p className="text-muted-foreground mb-4">{text}</p>
      <Link to={to} className="inline-flex items-center gap-2 text-primary font-medium hover:underline">{cta} <ArrowRight className="w-4 h-4" /></Link>
    </div>
  );
}