import React, { useEffect, useState } from "react";
import { Link, useNavigate } from "react-router-dom";
import { base44 } from "@/api/base44Client";
import { useAuth } from "@/lib/AuthContext";
import { useProfile } from "@/lib/ProfileContext";
import { Coins, ArrowRight, Plus, ClipboardList, Megaphone, Calendar as CalendarIcon, Palette } from "lucide-react";
import RoleBadge from "@/components/RoleBadge";
import MiniCalendar from "@/components/MiniCalendar";
import UnfinishedActivities from "@/components/UnfinishedActivities";

export default function Home() {
  const { user } = useAuth();
  const { profile } = useProfile();
  const navigate = useNavigate();
  const [classrooms, setClassrooms] = useState([]);
  const [enrollments, setEnrollments] = useState([]);
  const [assignments, setAssignments] = useState([]);
  const [activities, setActivities] = useState([]);
  const [responses, setResponses] = useState([]);
  const [announcements, setAnnouncements] = useState([]);
  const [teacherEnrollments, setTeacherEnrollments] = useState([]);
  const [lessonCount, setLessonCount] = useState(0);
  const [loading, setLoading] = useState(true);

  const isTeacher = profile?.account_type === "teacher";

  useEffect(() => {
    if (!user || !profile) return;
    let active = true;
    (async () => {
      try {
        if (isTeacher) {
          const [cls, acts, resps, enr, lns] = await Promise.all([
            base44.entities.Classroom.filter({ created_by_id: user.id }, "-created_date", 50),
            base44.entities.Activity.filter({ created_by_id: user.id }, "-created_date", 200),
            base44.entities.ActivityResponse.filter({}, "-created_date", 500),
            base44.entities.ClassroomEnrollment.filter({}, "-created_date", 500),
            base44.entities.LessonPlan.filter({ created_by_id: user.id }, "-created_date", 200),
          ]);
          let adminAnns = [], myTeacherAnns = [];
          try {
            [adminAnns, myTeacherAnns] = await Promise.all([
              base44.entities.Announcement.filter({ type: "admin", visibility: "open" }, "-created_date", 10),
              base44.entities.Announcement.filter({ type: "teacher" }, "-created_date", 50),
            ]);
            myTeacherAnns = (myTeacherAnns || []).filter((a) => a.created_by_id === user.id);
          } catch (e) { /* announcement entity might not exist yet */ }
          if (active) {
            setClassrooms(cls || []);
            setActivities(acts || []);
            setResponses(resps || []);
            setTeacherEnrollments((enr || []).filter((e) => (cls || []).some((c) => c.id === e.classroom_id)));
            setLessonCount((lns || []).length);
            setAnnouncements([...(adminAnns || []), ...(myTeacherAnns || [])]
              .sort((a, b) => new Date(b.created_date) - new Date(a.created_date))
              .slice(0, 3));
          }
        } else {
          const [enr, asg] = await Promise.all([
            base44.entities.ClassroomEnrollment.filter({ student_id: user.id }, "-created_date", 50),
            base44.entities.LessonAssignment.filter({ student_id: user.id }, "-created_date", 50),
          ]);
          const now = new Date().toISOString();
          const enrList = enr || [];
          const classroomIds = enrList.map((e) => e.classroom_id).filter(Boolean);
          let studentActs = [];
          let myResps = [];
          let adminAnns = [];
          let teacherAnns = [];
          if (classroomIds.length > 0) {
            const [allActs, resps] = await Promise.all([
              base44.entities.Activity.filter({}, "-created_date", 500),
              base44.entities.ActivityResponse.filter({ student_id: user.id }, "-created_date", 200),
            ]);
            studentActs = (allActs || []).filter((a) => classroomIds.includes(a.classroom_id));
            myResps = resps || [];
          }
          try {
            [adminAnns, teacherAnns] = await Promise.all([
              base44.entities.Announcement.filter({ type: "admin", visibility: "open" }, "-created_date", 10),
              base44.entities.Announcement.filter({ type: "teacher", visibility: "open" }, "-created_date", 50),
            ]);
            teacherAnns = (teacherAnns || []).filter((a) => classroomIds.includes(a.classroom_id));
          } catch (e) { /* announcement entity might not exist yet */ }
          if (active) {
            setEnrollments(enrList);
            setAssignments((asg || []).filter((a) => !a.scheduled_date || a.scheduled_date <= now));
            setActivities(studentActs);
            setResponses(myResps);
            setAnnouncements([...(adminAnns || []), ...(teacherAnns || [])]
              .sort((a, b) => new Date(b.created_date) - new Date(a.created_date))
              .slice(0, 3));
          }
        }
      } finally {
        if (active) setLoading(false);
      }
    })();
    return () => { active = false; };
  }, [user, profile, isTeacher]);

  // Create deadline reminder notifications for students
  useEffect(() => {
    if (!user || isTeacher || activities.length === 0) return;
    let active = true;
    (async () => {
      try {
        const notifs = await base44.entities.Notification.filter({ user_id: user.id }, "-created_date", 500);
        if (!active) return;
        const deadlineNotifs = (notifs || []).filter((n) => n.type === "deadline");
        const now = new Date();
        const reminders = [
          { offset: 5 * 3600000, label: "5 hours" },
          { offset: 3 * 3600000, label: "3 hours" },
          { offset: 1 * 3600000, label: "1 hour" },
          { offset: 30 * 60000, label: "30 minutes" },
        ];
        for (const act of activities) {
          if (!act.deadline) continue;
          const deadline = new Date(act.deadline);
          for (const { offset, label } of reminders) {
            const reminderTime = new Date(deadline.getTime() - offset);
            if (reminderTime <= now) continue;
            const exists = deadlineNotifs.some((n) => n.activity_id === act.id && n.scheduled_date === reminderTime.toISOString());
            if (exists) continue;
            await base44.entities.Notification.create({
              user_id: user.id,
              title: "Activity Deadline Approaching",
              message: `"${act.title}" is due in ${label}. Don't forget to submit!`,
              type: "deadline",
              activity_id: act.id,
              classroom_id: act.classroom_id,
              scheduled_date: reminderTime.toISOString(),
            });
          }
        }
      } catch (e) { /* ignore */ }
    })();
    return () => { active = false; };
  }, [user, isTeacher, activities]);

  if (!profile) return null;

  const studentCompleted = assignments.filter((a) => a.status === "completed").length;
  const studentPending = assignments.filter((a) => a.status !== "completed").length;
  const completedActivities = activities.filter((a) => responses.some((r) => r.activity_id === a.id)).length;
  const pendingActivities = activities.filter((a) => !responses.some((r) => r.activity_id === a.id) && (!a.deadline || new Date(a.deadline) >= new Date())).length;

  const totalStudents = new Set(teacherEnrollments.map((e) => e.student_id)).size;
  const missedCount = (() => {
    const now = new Date();
    let count = 0;
    const seen = new Set();
    for (const act of activities) {
      if (!act.deadline || new Date(act.deadline) >= now) continue;
      const enrolled = teacherEnrollments.filter((e) => e.classroom_id === act.classroom_id);
      for (const enr of enrolled) {
        const key = `${act.id}_${enr.student_id}`;
        if (seen.has(key)) continue;
        const hasResp = responses.some((r) => r.activity_id === act.id && r.student_id === enr.student_id);
        if (!hasResp) { count++; seen.add(key); }
      }
    }
    return count;
  })();

  const classroomNames = {};
  classrooms.forEach((c) => { classroomNames[c.id] = c.subject_title; });
  enrollments.forEach((e) => { classroomNames[e.classroom_id] = e.subject_title; });

  return (
    <div className="grid lg:grid-cols-[1fr_18rem] gap-6">
      {/* Main column */}
      <div className="space-y-6 min-w-0">
        {/* Greeting */}
        <div className="flex items-center justify-between flex-wrap gap-2">
          <div>
            <h1 className="text-xl font-bold tracking-tight">Hi, {profile.first_name}! 👋</h1>
            <p className="text-muted-foreground text-sm mt-0.5">{isTeacher ? "Manage your classrooms and lessons." : "Welcome to RemindSet"}</p>
          </div>
          <RoleBadge accountType={profile.account_type} />
        </div>

        {/* Student: Unfinished Activities */}
        {!isTeacher && (
          <UnfinishedActivities activities={activities} responses={responses} classroomNames={classroomNames} />
        )}

        {/* Student: Coins */}
        {!isTeacher && (
          <div className="rounded-2xl bg-gradient-to-br from-primary to-primary/70 text-primary-foreground p-5 shadow-lg shadow-primary/20">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-primary-foreground/80 text-sm font-medium">Your Coins</p>
                <div className="flex items-center gap-2 mt-1">
                  <Coins className="w-6 h-6" />
                  <span className="text-3xl font-bold">{profile.points || 0}</span>
                </div>
              </div>
              <Link to="/customize-theme" className="bg-white/20 hover:bg-white/30 transition-colors rounded-xl p-2.5">
                <Palette className="w-5 h-5" />
              </Link>
            </div>
          </div>
        )}

        {/* Teacher: Create Classroom */}
        {isTeacher && (
          <Link to="/create-classroom" className="flex items-center justify-between border-2 border-dashed border-border rounded-2xl p-4 hover:border-primary/40 transition-colors">
            <div className="flex items-center gap-3">
              <div className="rounded-xl bg-primary text-primary-foreground p-2.5">
                <Plus className="w-4 h-4" />
              </div>
              <div>
                <p className="font-semibold text-sm">Create a new classroom</p>
                <p className="text-xs text-muted-foreground">Set up a class and share the code with students.</p>
              </div>
            </div>
            <ArrowRight className="w-4 h-4 text-muted-foreground shrink-0" />
          </Link>
        )}

        {/* Classes preview */}
        <div>
          <div className="flex items-center justify-between mb-3">
            <h2 className="font-semibold text-base">{isTeacher ? "Your Classrooms" : "Your Classes"}</h2>
            <Link to="/classrooms" className="text-sm text-primary font-medium hover:underline">View all</Link>
          </div>
          {loading ? (
            <SkeletonList />
          ) : isTeacher ? (
            classrooms.length === 0 ? (
              <EmptyState text="No classrooms yet." to="/create-classroom" cta="Create Class" />
            ) : (
              <div className="space-y-2">
                {classrooms.slice(0, 3).map((c) => {
                  const clsActs = activities.filter((a) => a.classroom_id === c.id);
                  return (
                    <Link key={c.id} to={`/classrooms/${c.id}`} className="flex items-center justify-between bg-card border border-border rounded-xl p-4 hover:border-primary/30 hover:shadow-sm transition-all">
                      <div className="min-w-0 flex-1">
                        <p className="font-medium text-sm truncate">{c.subject_title}</p>
                        <p className="text-xs text-muted-foreground truncate mt-0.5">{c.year_and_section}</p>
                        <div className="mt-1.5 flex items-center gap-3">
                          <span className="inline-flex items-center gap-1 text-xs text-muted-foreground">
                            <ClipboardList className="w-3 h-3" /> {clsActs.length} activities
                          </span>
                        </div>
                      </div>
                      <ArrowRight className="w-4 h-4 text-muted-foreground shrink-0 ml-3" />
                    </Link>
                  );
                })}
                {classrooms.length > 3 && (
                  <Link to="/classrooms" className="block text-center text-sm text-primary font-medium hover:underline py-2">
                    View all {classrooms.length} classrooms
                  </Link>
                )}
              </div>
            )
          ) : enrollments.length === 0 ? (
            <EmptyState text="You haven't joined any classes yet." to="/classrooms" cta="Join a Class" />
          ) : (
            <div className="space-y-2">
              {enrollments.slice(0, 3).map((e) => (
                <Link key={e.id} to={`/classrooms/${e.classroom_id}`} className="flex items-center justify-between bg-card border border-border rounded-xl p-4 hover:border-primary/30 hover:shadow-sm transition-all">
                  <div className="min-w-0 flex-1">
                    <p className="font-medium text-sm truncate">{e.subject_title}</p>
                    <p className="text-xs text-muted-foreground truncate mt-0.5">{e.year_and_section} • {e.teacher_name}</p>
                  </div>
                  <ArrowRight className="w-4 h-4 text-muted-foreground shrink-0 ml-3" />
                </Link>
              ))}
              {enrollments.length > 3 && (
                <Link to="/classrooms" className="block text-center text-sm text-primary font-medium hover:underline py-2">
                  View all {enrollments.length} classes
                </Link>
              )}
            </div>
          )}
        </div>
      </div>

      {/* Sidebar column */}
      <div className="space-y-4">
        {/* Calendar */}
        <div className="bg-card border border-border rounded-2xl p-4">
          <div className="flex items-center gap-2 mb-3">
            <CalendarIcon className="w-4 h-4 text-muted-foreground" />
            <h3 className="font-semibold text-sm">Calendar</h3>
          </div>
          <MiniCalendar activities={activities} />
        </div>

        {/* Teacher: My Classes / Student: Progress */}
        {isTeacher ? (
          <div className="bg-card border border-border rounded-2xl p-4 space-y-3">
            <h3 className="font-semibold text-sm">My Classes</h3>
            <button onClick={() => navigate("/users")} className="w-full flex items-center justify-between text-sm hover:text-primary transition-colors text-left">
              <span className="text-muted-foreground">Total students</span>
              <span className="font-semibold">{totalStudents}</span>
            </button>
            <button onClick={() => navigate("/resources")} className="w-full flex items-center justify-between text-sm hover:text-primary transition-colors text-left">
              <span className="text-muted-foreground">Uploaded lessons</span>
              <span className="font-semibold">{lessonCount}</span>
            </button>
            <button onClick={() => navigate("/students-missed")} className="w-full flex items-center justify-between text-sm hover:text-red-600 transition-colors text-left">
              <span className="text-muted-foreground">Missed activities</span>
              <span className="font-semibold text-red-600">{missedCount}</span>
            </button>
          </div>
        ) : (
          <div className="bg-card border border-border rounded-2xl p-4 space-y-3">
            <h3 className="font-semibold text-sm">Progress</h3>
            <button onClick={() => navigate("/lessons?tab=completed")} className="w-full flex items-center justify-between text-sm hover:text-primary transition-colors text-left">
              <span className="text-muted-foreground">Completed lessons</span>
              <span className="font-semibold text-emerald-600">{studentCompleted}</span>
            </button>
            <button onClick={() => navigate("/lessons?tab=pending")} className="w-full flex items-center justify-between text-sm hover:text-primary transition-colors text-left">
              <span className="text-muted-foreground">Pending lessons</span>
              <span className="font-semibold text-amber-600">{studentPending}</span>
            </button>
            <button onClick={() => navigate("/activities?tab=completed")} className="w-full flex items-center justify-between text-sm hover:text-primary transition-colors text-left">
              <span className="text-muted-foreground">Completed activities</span>
              <span className="font-semibold text-emerald-600">{completedActivities}</span>
            </button>
            <button onClick={() => navigate("/activities?tab=pending")} className="w-full flex items-center justify-between text-sm hover:text-primary transition-colors text-left">
              <span className="text-muted-foreground">Pending activities</span>
              <span className="font-semibold text-amber-600">{pendingActivities}</span>
            </button>
          </div>
        )}

        {/* Announcement preview */}
        <div className="bg-card border border-border rounded-2xl p-4 space-y-3">
          <div className="flex items-center justify-between">
            <h3 className="font-semibold text-sm flex items-center gap-2"><Megaphone className="w-4 h-4" /> Announcement</h3>
            <Link to="/announcements" className="text-xs text-primary font-medium hover:underline">View all</Link>
          </div>
          {announcements.length === 0 ? (
            <p className="text-xs text-muted-foreground">No announcements yet.</p>
          ) : (
            <div className="space-y-2">
              {announcements.map((a) => (
                <div key={a.id}>
                  <p className="font-medium text-sm">{a.title}</p>
                  <p className="text-xs text-muted-foreground line-clamp-2">{a.message}</p>
                </div>
              ))}
            </div>
          )}
        </div>
      </div>
    </div>
  );
}

function SkeletonList() {
  return (
    <div className="space-y-2">
      {[0, 1, 2].map((i) => <div key={i} className="h-16 rounded-xl bg-muted animate-pulse" />)}
    </div>
  );
}

function EmptyState({ text, to, cta }) {
  return (
    <div className="text-center py-8 bg-card border border-dashed border-border rounded-2xl">
      <p className="text-muted-foreground text-sm mb-3">{text}</p>
      <Link to={to} className="inline-flex items-center gap-2 text-primary text-sm font-medium hover:underline">{cta} <ArrowRight className="w-3.5 h-3.5" /></Link>
    </div>
  );
}