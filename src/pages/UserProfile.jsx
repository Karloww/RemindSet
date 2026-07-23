import React, { useState, useEffect } from "react";
import { useParams, useSearchParams, useNavigate } from "react-router-dom";
import { base44 } from "@/api/base44Client";
import { useAuth } from "@/lib/AuthContext";
import { ArrowLeft, BookOpen, CheckCircle2, Clock, Loader2, GraduationCap, Presentation } from "lucide-react";
import ProfileAvatar from "@/components/ProfileAvatar";

export default function UserProfile() {
  const { userId } = useParams();
  const [searchParams] = useSearchParams();
  const classroomId = searchParams.get("classroomId");
  const navigate = useNavigate();
  const { user } = useAuth();
  const [profile, setProfile] = useState(null);
  const [assignments, setAssignments] = useState([]);
  const [classroom, setClassroom] = useState(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (!userId) return;
    let active = true;
    (async () => {
      try {
        const profiles = await base44.entities.Profile.filter({ created_by_id: userId }, "-created_date", 1);
        if (!active) return;
        setProfile(profiles?.[0] || null);

        if (classroomId) {
          const [c, asg] = await Promise.all([
            base44.entities.Classroom.get(classroomId),
            base44.entities.LessonAssignment.filter({ classroom_id: classroomId, student_id: userId }, "-created_date", 200),
          ]);
          if (!active) return;
          setClassroom(c);
          setAssignments(asg || []);
        }
      } catch (e) {
        /* ignore */
      } finally {
        if (active) setLoading(false);
      }
    })();
    return () => { active = false; };
  }, [userId, classroomId]);

  if (loading) return <div className="flex justify-center py-20"><Loader2 className="w-6 h-6 animate-spin text-muted-foreground" /></div>;
  if (!profile) return <div className="text-center py-20 text-muted-foreground">Profile not found.</div>;

  const completed = assignments.filter((a) => a.status === "completed").length;
  const total = assignments.length;
  const isTeacher = profile.account_type === "teacher";

  return (
    <div className="space-y-5 max-w-3xl mx-auto">
      <button onClick={() => navigate(classroomId ? `/classrooms/${classroomId}` : "/")} className="inline-flex items-center gap-1.5 text-sm text-muted-foreground hover:text-foreground">
        <ArrowLeft className="w-4 h-4" /> Back
      </button>

      {/* Profile Card */}
      <div className="bg-card border border-border rounded-2xl overflow-hidden">
        {profile.cover_photo_url ? (
          <div className="h-32 bg-cover bg-center" style={{ backgroundImage: `url('${profile.cover_photo_url}')` }} />
        ) : (
          <div className="h-32 bg-primary/10" />
        )}
        <div className="p-5">
          <div className="flex items-end gap-4 -mt-16 mb-3">
            <ProfileAvatar profile={profile} size="xl" />
            <div className="pb-1">
              <h1 className="text-xl font-bold">{profile.first_name} {profile.last_name}</h1>
              <span className={`inline-flex items-center gap-1 text-xs font-medium px-2 py-0.5 rounded-full mt-1 ${isTeacher ? "bg-amber-50 text-amber-600" : "bg-primary/10 text-primary"}`}>
                {isTeacher ? <Presentation className="w-3 h-3" /> : <GraduationCap className="w-3 h-3" />}
                {isTeacher ? "Teacher" : "Student"}
              </span>
            </div>
          </div>
          <p className="text-sm text-muted-foreground">@{profile.username}</p>
          {profile.bio && <p className="text-sm mt-2">{profile.bio}</p>}
        </div>
      </div>

      {/* Stats (only in classroom context) */}
      {classroomId && (
        <div className="grid grid-cols-2 gap-3">
          <div className="bg-card border border-border rounded-2xl p-5 text-center">
            <div className="inline-flex items-center justify-center w-10 h-10 rounded-xl bg-primary/10 text-primary mb-2">
              <BookOpen className="w-5 h-5" />
            </div>
            <p className="text-2xl font-bold">{total}</p>
            <p className="text-xs text-muted-foreground">Lessons Assigned</p>
            {classroom && <p className="text-xs text-muted-foreground mt-1">in {classroom.subject_title}</p>}
          </div>
          <div className="bg-card border border-border rounded-2xl p-5 text-center">
            <div className="inline-flex items-center justify-center w-10 h-10 rounded-xl bg-emerald-50 text-emerald-600 mb-2">
              <CheckCircle2 className="w-5 h-5" />
            </div>
            <p className="text-2xl font-bold">{completed}</p>
            <p className="text-xs text-muted-foreground">Completed</p>
          </div>
        </div>
      )}

      {/* Assignment list (in classroom context, not own profile) */}
      {classroomId && assignments.length > 0 && user?.id !== userId && (
        <div>
          <h2 className="text-lg font-semibold mb-3">Lesson Progress</h2>
          <div className="bg-card border border-border rounded-2xl divide-y divide-border overflow-hidden">
            {assignments.map((a) => (
              <div key={a.id} className="flex items-center justify-between gap-3 p-4">
                <div className="min-w-0">
                  <p className="font-medium text-sm truncate">{a.lesson_title}</p>
                  <p className="text-xs text-muted-foreground">{a.subject}</p>
                </div>
                {a.status === "completed" ? (
                  <span className="inline-flex items-center gap-1 text-xs font-medium text-emerald-600 bg-emerald-50 px-2 py-1 rounded-full shrink-0">
                    <CheckCircle2 className="w-3 h-3" /> Done
                  </span>
                ) : (
                  <span className="inline-flex items-center gap-1 text-xs font-medium text-muted-foreground bg-muted px-2 py-1 rounded-full shrink-0">
                    <Clock className="w-3 h-3" /> Pending
                  </span>
                )}
              </div>
            ))}
          </div>
        </div>
      )}
    </div>
  );
}