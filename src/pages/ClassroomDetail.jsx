import React, { useEffect, useState } from "react";
import { useParams, useNavigate } from "react-router-dom";
import { base44 } from "@/api/base44Client";
import { useAuth } from "@/lib/AuthContext";
import { useProfile } from "@/lib/ProfileContext";
import { Button } from "@/components/ui/button";
import { ArrowLeft, Copy, Check, Plus, Users, BookOpen, CheckCircle2, Clock, ChevronDown, Loader2, Upload, Trash2, Pencil, UserPlus, FileText, Coins, CalendarClock, User, ClipboardList, LogOut, AlertTriangle, Lock, MessageCircle } from "lucide-react";
import { POINTS_PER_LESSON } from "@/lib/themes";
import { toast } from "@/components/ui/use-toast";
import ProfileAvatar from "@/components/ProfileAvatar";
import ActivityTrackerCard from "@/components/activity/ActivityTrackerCard";
import AnnouncementCard from "@/components/announcements/AnnouncementCard";
import AnnouncementForm from "@/components/announcements/AnnouncementForm";
import { Megaphone } from "lucide-react";

const TABS = ["Lessons", "Activity", "Students", "Announcement"];

export default function ClassroomDetail() {
  const { id } = useParams();
  const { user } = useAuth();
  const { profile } = useProfile();
  const navigate = useNavigate();
  const [classroom, setClassroom] = useState(null);
  const [enrollments, setEnrollments] = useState([]);
  const [lessons, setLessons] = useState([]);
  const [assignments, setAssignments] = useState([]);
  const [activities, setActivities] = useState([]);
  const [loading, setLoading] = useState(true);
  const [copied, setCopied] = useState(false);
  const [expandedLesson, setExpandedLesson] = useState(null);
  const [tab, setTab] = useState("Lessons");
  const [editOpen, setEditOpen] = useState(false);
  const [editSubject, setEditSubject] = useState("");
  const [editSection, setEditSection] = useState("");
  const [editSaving, setEditSaving] = useState(false);
  const [unenrolling, setUnenrolling] = useState(false);
  const [removingStudent, setRemovingStudent] = useState(null);
  const [profiles, setProfiles] = useState({});
  const [responses, setResponses] = useState([]);
  const [lessonVisMap, setLessonVisMap] = useState({});
  const [classroomAnnouncements, setClassroomAnnouncements] = useState([]);
  const [showAnnForm, setShowAnnForm] = useState(false);
  const [loadingAnns, setLoadingAnns] = useState(false);

  const isTeacher = profile?.account_type === "teacher";

  const loadClassroomAnnouncements = async () => {
    setLoadingAnns(true);
    try {
      const data = await base44.entities.Announcement.filter({ classroom_id: id }, "-created_date", 200);
      setClassroomAnnouncements(data || []);
    } catch (e) { /* ignore */ }
    setLoadingAnns(false);
  };

  useEffect(() => {
    if (tab === "Announcement") loadClassroomAnnouncements();
  }, [tab, id]);

  const loadData = async () => {
    if (!id || !user) return;
    try {
      if (isTeacher) {
        const [c, enr, lns, asg, acts] = await Promise.all([
          base44.entities.Classroom.get(id),
          base44.entities.ClassroomEnrollment.filter({ classroom_id: id }, "-created_date", 200),
          base44.entities.LessonPlan.filter({ classroom_id: id }, "-created_date", 200),
          base44.entities.LessonAssignment.filter({ classroom_id: id }, "-created_date", 500),
          base44.entities.Activity.filter({ classroom_id: id }, "-created_date", 100),
        ]);
        setClassroom(c); setEnrollments(enr || []); setLessons(lns || []); setAssignments(asg || []); setActivities(acts || []);
        const teacherResps = await base44.entities.ActivityResponse.filter({ classroom_id: id }, "-created_date", 500);
        setResponses(teacherResps || []);
        setLessonVisMap(Object.fromEntries((lns || []).map((l) => [l.id, l.visibility || "open"])));
        const tIds = [c.created_by_id, ...(enr || []).map((e) => e.student_id || e.created_by_id)].filter(Boolean);
        const tProfs = await base44.entities.Profile.filter({ created_by_id: { $in: tIds } }, "-created_date", 200);
        setProfiles(Object.fromEntries((tProfs || []).map((p) => [p.created_by_id, p])));
      } else {
        const [c, asg, enr, acts, lns] = await Promise.all([
          base44.entities.Classroom.get(id),
          base44.entities.LessonAssignment.filter({ classroom_id: id, student_id: user.id }, "-created_date", 200),
          base44.entities.ClassroomEnrollment.filter({ classroom_id: id }, "created_date", 200),
          base44.entities.Activity.filter({ classroom_id: id }, "-created_date", 100),
          base44.entities.LessonPlan.filter({ classroom_id: id }, "created_date", 200),
        ]);
        const now = new Date().toISOString();
        setClassroom(c); setEnrollments(enr || []); setAssignments((asg || []).filter((a) => !a.scheduled_date || a.scheduled_date <= now));
        setActivities((acts || []).filter((a) => a.status === "open" && (!a.deadline || a.deadline >= now)));
        const studentResps = await base44.entities.ActivityResponse.filter({ classroom_id: id, student_id: user.id }, "-created_date", 200);
        setResponses(studentResps || []);
        setLessonVisMap(Object.fromEntries((lns || []).map((l) => [l.id, l.visibility || "open"])));
        const sIds = [c.created_by_id, ...(enr || []).map((e) => e.student_id || e.created_by_id)].filter(Boolean);
        const sProfs = await base44.entities.Profile.filter({ created_by_id: { $in: sIds } }, "-created_date", 200);
        setProfiles(Object.fromEntries((sProfs || []).map((p) => [p.created_by_id, p])));
      }
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => { loadData(); }, [id, user, isTeacher]);

  if (loading) return <div className="flex justify-center py-20"><Loader2 className="w-6 h-6 animate-spin text-muted-foreground" /></div>;
  if (!classroom) return <div className="text-center py-20 text-muted-foreground">Classroom not found.</div>;

  const copyCode = () => {
    navigator.clipboard?.writeText(classroom.class_code);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  const handleDeleteClassroom = async () => {
    if (!window.confirm(`Delete "${classroom.subject_title}"? This removes all lessons and enrollments.`)) return;
    try {
      await Promise.all([
        base44.entities.LessonAssignment.deleteMany({ classroom_id: id }),
        base44.entities.ClassroomEnrollment.deleteMany({ classroom_id: id }),
        base44.entities.LessonPlan.deleteMany({ classroom_id: id }),
        base44.entities.Activity.deleteMany({ classroom_id: id }),
      ]);
      await base44.entities.Classroom.delete(id);
      toast({ title: "Classroom deleted." });
      navigate("/classrooms");
    } catch (err) {
      toast({ title: "Delete failed", description: err.message, variant: "destructive" });
    }
  };

  const handleEditSave = async () => {
    if (!editSubject.trim() || !editSection.trim()) return;
    setEditSaving(true);
    try {
      await base44.entities.Classroom.update(id, { subject_title: editSubject.trim(), year_and_section: editSection.trim() });
      toast({ title: "Classroom updated!" });
      setEditOpen(false);
      loadData();
    } catch (err) {
      toast({ title: "Update failed", description: err.message, variant: "destructive" });
    } finally { setEditSaving(false); }
  };

  const handleUnenroll = async () => {
    if (!window.confirm("Unenroll from this class?")) return;
    setUnenrolling(true);
    try {
      const enr = enrollments.find((e) => (e.student_id || e.created_by_id) === user.id);
      if (enr) await base44.entities.ClassroomEnrollment.delete(enr.id);
      await base44.entities.LessonAssignment.deleteMany({ classroom_id: id, student_id: user.id });
      toast({ title: "Unenrolled from class." });
      navigate("/classrooms");
    } catch (err) {
      toast({ title: "Failed to unenroll", description: err.message, variant: "destructive" });
    } finally { setUnenrolling(false); }
  };

  const handleArchive = async () => {
    try {
      if (isTeacher) {
        await base44.entities.Classroom.update(id, { archived: !classroom.archived });
      } else {
        const enr = enrollments.find((e) => (e.student_id || e.created_by_id) === user.id);
        if (enr) await base44.entities.ClassroomEnrollment.update(enr.id, { archived: !enr.archived });
      }
      toast({ title: "Class archive status updated" });
      loadData();
    } catch (e) {
      toast({ title: "Failed", variant: "destructive" });
    }
  };

  const handleRemoveStudent = async (enrollment) => {
    const sid = enrollment.student_id || enrollment.created_by_id;
    if (!window.confirm(`Remove ${enrollment.student_name} from this class?`)) return;
    setRemovingStudent(sid);
    try {
      await base44.entities.ClassroomEnrollment.delete(enrollment.id);
      await base44.entities.LessonAssignment.deleteMany({ classroom_id: id, student_id: sid });
      toast({ title: `${enrollment.student_name} removed.` });
      loadData();
    } catch (err) {
      toast({ title: "Failed to remove", description: err.message, variant: "destructive" });
    } finally { setRemovingStudent(null); }
  };

  return (
    <div className="space-y-5 max-w-3xl mx-auto">
      <button onClick={() => navigate("/classrooms")} className="inline-flex items-center gap-1.5 text-sm text-muted-foreground hover:text-foreground">
        <ArrowLeft className="w-4 h-4" /> Back to classes
      </button>

      {/* Header */}
      <div className="bg-card border border-border rounded-2xl overflow-hidden">
        <div className="bg-primary/10 p-6">
          <div className="flex items-start justify-between gap-3">
            <div>
              <h1 className="text-2xl font-bold tracking-tight">{classroom.subject_title}</h1>
              <p className="text-sm text-muted-foreground mt-1">{classroom.year_and_section}</p>
            </div>
            {isTeacher && (
              <div className="flex gap-2 shrink-0">
                <button onClick={() => { setEditSubject(classroom.subject_title); setEditSection(classroom.year_and_section); setEditOpen(true); }} className="p-2 rounded-lg hover:bg-accent transition-colors" title="Edit classroom">
                  <Pencil className="w-4 h-4" />
                </button>
                <button onClick={handleDeleteClassroom} className="p-2 rounded-lg hover:bg-destructive/10 text-destructive transition-colors" title="Delete classroom">
                  <Trash2 className="w-4 h-4" />
                </button>
                <button onClick={handleArchive} className="p-2 rounded-lg hover:bg-accent transition-colors" title={classroom.archived ? "Unarchive" : "Archive"}>
                  {classroom.archived ? <Check className="w-4 h-4" /> : <Clock className="w-4 h-4" />}
                </button>
              </div>
            )}
          </div>
          {isTeacher ? (
            <button onClick={copyCode} className="mt-3 inline-flex items-center gap-2 bg-background border border-border rounded-lg px-3 py-1.5 text-sm hover:bg-accent transition-colors">
              <span className="font-mono font-bold text-primary tracking-wider">{classroom.class_code}</span>
              {copied ? <Check className="w-4 h-4 text-emerald-600" /> : <Copy className="w-4 h-4 text-muted-foreground" />}
              <span className="text-xs text-muted-foreground">{copied ? "Copied!" : "Copy"}</span>
            </button>
          ) : (
            <div className="flex items-center justify-between mt-2">
              <button onClick={() => navigate(`/users/${classroom.created_by_id}?classroomId=${id}`)} className="text-sm text-muted-foreground hover:text-primary transition-colors">
                Teacher: {classroom.teacher_name}
              </button>
              <div className="flex items-center gap-2">
                <button onClick={handleArchive} className="inline-flex items-center gap-1.5 text-sm text-muted-foreground hover:bg-accent px-3 py-1.5 rounded-lg transition-colors">
                  {enrollments.find((e) => (e.student_id || e.created_by_id) === user.id)?.archived ? <Check className="w-4 h-4" /> : <Clock className="w-4 h-4" />}
                  {enrollments.find((e) => (e.student_id || e.created_by_id) === user.id)?.archived ? "Unarchive" : "Archive"}
                </button>
                <button onClick={handleUnenroll} disabled={unenrolling} className="inline-flex items-center gap-1.5 text-sm text-destructive hover:bg-destructive/10 px-3 py-1.5 rounded-lg transition-colors">
                  {unenrolling ? <Loader2 className="w-4 h-4 animate-spin" /> : <LogOut className="w-4 h-4" />} Unenroll
                </button>
              </div>
            </div>
          )}
        </div>
        {isTeacher ? (
          <div className="grid grid-cols-3 divide-x divide-border">
            <div className="p-4 text-center">
              <p className="text-2xl font-bold">{enrollments.length}</p>
              <p className="text-xs text-muted-foreground">Students</p>
            </div>
            <div className="p-4 text-center">
              <p className="text-2xl font-bold">{lessons.length}</p>
              <p className="text-xs text-muted-foreground">Lessons</p>
            </div>
            <div className="p-4 text-center">
              <p className="text-2xl font-bold">{activities.length}</p>
              <p className="text-xs text-muted-foreground">Activities</p>
            </div>
          </div>
        ) : null}
      </div>

      {/* Student Progress & Grade */}
      {!isTeacher && (assignments.length > 0 || activities.length > 0) && (
        <div className="bg-card border border-border rounded-2xl p-5">
          <h3 className="font-semibold mb-3">Your Progress</h3>
          <div className="space-y-4">
            <div>
              <div className="flex items-center justify-between text-sm mb-1.5">
                <span className="text-muted-foreground">Activities Completed</span>
                <span className="font-medium">{responses.length} / {activities.length}</span>
              </div>
              <div className="h-2 bg-muted rounded-full overflow-hidden">
                <div className="h-full bg-blue-500 rounded-full transition-all" style={{ width: `${activities.length > 0 ? (responses.length / activities.length) * 100 : 0}%` }} />
              </div>
            </div>
            <div>
              <div className="flex items-center justify-between text-sm mb-1.5">
                <span className="text-muted-foreground">Lessons Completed</span>
                <span className="font-medium">{assignments.filter((a) => a.status === "completed").length} / {assignments.length}</span>
              </div>
              <div className="h-2 bg-muted rounded-full overflow-hidden">
                <div className="h-full bg-emerald-500 rounded-full transition-all" style={{ width: `${assignments.length > 0 ? (assignments.filter((a) => a.status === "completed").length / assignments.length) * 100 : 0}%` }} />
              </div>
            </div>
            {responses.length > 0 && (() => {
              const totalScore = responses.reduce((sum, r) => sum + (r.total_score || 0), 0);
              const maxScore = responses.reduce((sum, r) => sum + (r.max_score || 0), 0);
              const pct = maxScore > 0 ? (totalScore / maxScore) * 100 : 0;
              const grade = pct >= 90 ? "A" : pct >= 80 ? "B" : pct >= 70 ? "C" : pct >= 60 ? "D" : "F";
              return (
                <div>
                  <div className="flex items-center justify-between text-sm mb-1.5">
                    <span className="text-muted-foreground">Overall Grade</span>
                    <span className="font-bold text-lg">{grade} ({pct.toFixed(0)}%)</span>
                  </div>
                  <div className="h-2 bg-muted rounded-full overflow-hidden">
                    <div className="h-full bg-primary rounded-full transition-all" style={{ width: `${pct}%` }} />
                  </div>
                </div>
              );
            })()}
          </div>
        </div>
      )}

      {/* Edit Modal */}
      {editOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/40">
          <div className="bg-card border border-border rounded-2xl p-6 w-full max-w-md space-y-4">
            <h2 className="text-lg font-bold">Edit Classroom</h2>
            <div className="space-y-2">
              <label className="text-sm font-medium">Subject Title</label>
              <input value={editSubject} onChange={(e) => setEditSubject(e.target.value)} className="w-full border border-border rounded-lg px-3 py-2 text-sm bg-background" />
            </div>
            <div className="space-y-2">
              <label className="text-sm font-medium">Year and Section</label>
              <input value={editSection} onChange={(e) => setEditSection(e.target.value)} className="w-full border border-border rounded-lg px-3 py-2 text-sm bg-background" />
            </div>
            <div className="flex gap-3">
              <Button variant="outline" className="flex-1" onClick={() => setEditOpen(false)}>Cancel</Button>
              <Button className="flex-1" onClick={handleEditSave} disabled={editSaving}>
                {editSaving ? <Loader2 className="w-4 h-4 mr-2 animate-spin" /> : null} Save
              </Button>
            </div>
          </div>
        </div>
      )}

      {/* Tab bar */}
      <div className="flex gap-1 bg-muted rounded-xl p-1">
        {TABS.map((t) => (
          <button key={t} onClick={() => setTab(t)} className={`flex-1 py-2 text-sm font-medium rounded-lg transition-colors ${tab === t ? "bg-card shadow-sm text-foreground" : "text-muted-foreground hover:text-foreground"}`}>
            {t}
          </button>
        ))}
      </div>

      {/* Lessons Tab */}
      {tab === "Lessons" && (
        <div className="space-y-4">
          {isTeacher && (
            <Button onClick={() => navigate(`/classrooms/${id}/upload-lesson`)} className="w-full h-12">
              <Upload className="w-4 h-4 mr-2" /> Upload Lesson
            </Button>
          )}
          {(isTeacher ? lessons : assignments).length === 0 ? (
            <div className="text-center py-12 bg-card border border-dashed border-border rounded-2xl">
              <BookOpen className="w-8 h-8 text-muted-foreground mx-auto mb-2" />
              <p className="text-muted-foreground text-sm">{isTeacher ? "No lessons uploaded yet." : "No lessons in this class yet."}</p>
            </div>
          ) : isTeacher ? (
            <div className="space-y-3">
              {lessons.map((lesson) => (
                <LessonTrackerCard key={lesson.id} lesson={lesson} enrollments={enrollments} assignments={assignments} classroomId={id} onDeleted={loadData}
                  isExpanded={expandedLesson === lesson.id} onToggle={() => setExpandedLesson(expandedLesson === lesson.id ? null : lesson.id)} />
              ))}
            </div>
          ) : (
            <div className="space-y-3">
              {assignments.map((a) => {
                const done = a.status === "completed";
                const closed = lessonVisMap[a.lesson_id] === "closed";
                const missed = !done && !closed && a.scheduled_date && new Date(a.scheduled_date) < new Date();
                return (
                  <div key={a.id} className={`bg-card border border-border rounded-xl p-4 transition-colors ${closed ? "opacity-70" : "hover:border-primary/40"}`}>
                    <div className="flex items-center justify-between gap-3">
                      <button onClick={() => !closed && navigate(`/lessons/${a.id}`)} disabled={closed} className="min-w-0 flex-1 text-left">
                        <div className="flex items-center gap-2 flex-wrap">
                          <span className="text-xs font-medium text-primary bg-primary/10 px-2 py-0.5 rounded-full">{a.subject}</span>
                          {closed && <span className="inline-flex items-center gap-1 text-xs font-medium text-amber-600 bg-amber-50 px-2 py-0.5 rounded-full"><Lock className="w-3 h-3" /> Closed</span>}
                          {missed && <span className="inline-flex items-center gap-1 text-xs font-medium text-red-600 bg-red-50 px-2 py-0.5 rounded-full"><AlertTriangle className="w-3 h-3" /> Missed</span>}
                        </div>
                        <p className="font-semibold mt-1.5 truncate">{a.lesson_title}</p>
                        <p className="text-sm text-muted-foreground truncate">{a.file_name || "No file attached"}</p>
                        {missed && a.scheduled_date && <p className="text-xs text-red-500 mt-1">Deadline: {new Date(a.scheduled_date).toLocaleString()}</p>}
                      </button>
                      <div className="shrink-0">
                        {done ? (
                          <span className="inline-flex items-center gap-1 text-xs font-medium text-emerald-600 bg-emerald-50 px-2 py-1 rounded-full"><CheckCircle2 className="w-3 h-3" /> Done</span>
                        ) : closed ? (
                          <span className="inline-flex items-center gap-1 text-xs font-medium text-amber-600 bg-amber-50 px-2 py-1 rounded-full"><Lock className="w-3 h-3" /> Locked</span>
                        ) : missed ? (
                          <button onClick={() => navigate(`/messages?userId=${classroom.created_by_id}`)} className="inline-flex items-center gap-1 text-xs font-medium text-primary bg-primary/10 px-2 py-1 rounded-full hover:bg-primary/20">
                            <MessageCircle className="w-3 h-3" /> Message Teacher
                          </button>
                        ) : (
                          <span className="inline-flex items-center gap-1 text-xs font-medium text-primary bg-primary/10 px-2 py-1 rounded-full">+{a.points_reward ?? POINTS_PER_LESSON} pts</span>
                        )}
                      </div>
                    </div>
                  </div>
                );
              })}
            </div>
          )}
        </div>
      )}

      {/* Activity Tab */}
      {tab === "Activity" && (
        <div className="space-y-4">
          {isTeacher && (
            <Button onClick={() => navigate(`/classrooms/${id}/activities/new`)} className="w-full h-12">
              <Plus className="w-4 h-4 mr-2" /> Create Activity
            </Button>
          )}
          {activities.length === 0 ? (
            <div className="text-center py-12 bg-card border border-dashed border-border rounded-2xl">
              <ClipboardList className="w-8 h-8 text-muted-foreground mx-auto mb-2" />
              <p className="text-muted-foreground text-sm">{isTeacher ? "No activities yet." : "No open activities."}</p>
            </div>
          ) : (
            <div className="space-y-3">
              {activities.map((a) => (
                <ActivityTrackerCard key={a.id} activity={a} classroomId={id} enrollments={enrollments} responses={responses} onDeleted={loadData} isTeacher={isTeacher} />
              ))}
            </div>
          )}
        </div>
      )}

      {/* Students Tab */}
      {tab === "Students" && (
        <div className="space-y-4">
          {isTeacher ? (
            enrollments.length === 0 ? (
              <div className="text-center py-10 bg-card border border-dashed border-border rounded-2xl">
                <Users className="w-8 h-8 text-muted-foreground mx-auto mb-2" />
                <p className="text-muted-foreground text-sm">No students enrolled yet. Share the code: <span className="font-mono font-bold text-primary">{classroom.class_code}</span></p>
              </div>
            ) : (
              <div className="bg-card border border-border rounded-2xl divide-y divide-border overflow-hidden">
                {enrollments.map((e) => {
                  const studentAssignments = assignments.filter((a) => a.student_id === e.student_id);
                  const doneCount = studentAssignments.filter((a) => a.status === "completed").length;
                  const actDoneCount = responses.filter((r) => r.student_id === (e.student_id || e.created_by_id)).length;
                  const sid = e.student_id || e.created_by_id;
                  const removing = removingStudent === sid;
                  return (
                    <div key={e.id} className="flex items-center justify-between gap-3 p-4">
                      <button onClick={() => navigate(`/users/${sid}?classroomId=${id}`)} className="flex items-center gap-3 flex-1 min-w-0 text-left hover:opacity-80">
                        <ProfileAvatar profile={profiles[sid] || { first_name: e.student_name, account_type: "student" }} size="md" />
                        <div className="min-w-0">
                          <p className="font-medium truncate">{e.student_name}</p>
                          <p className="text-xs text-muted-foreground">{doneCount}/{studentAssignments.length} lessons • {actDoneCount}/{activities.length} activities</p>
                          {(() => {
                            const studentResps = responses.filter((r) => r.student_id === sid);
                            const ts = studentResps.reduce((sum, r) => sum + (r.total_score || 0), 0);
                            const ms = studentResps.reduce((sum, r) => sum + (r.max_score || 0), 0);
                            const pct = ms > 0 ? (ts / ms) * 100 : 0;
                            const grade = pct >= 90 ? "A" : pct >= 80 ? "B" : pct >= 70 ? "C" : pct >= 60 ? "D" : "F";
                            return ms > 0 ? <p className="text-xs font-medium text-primary">Grade: {grade} ({pct.toFixed(0)}%)</p> : null;
                          })()}
                        </div>
                      </button>
                      <button onClick={() => handleRemoveStudent(e)} disabled={removing} className="p-1.5 rounded-lg hover:bg-destructive/10 text-destructive shrink-0" title="Remove student">
                        {removing ? <Loader2 className="w-4 h-4 animate-spin" /> : <Trash2 className="w-4 h-4" />}
                      </button>
                    </div>
                  );
                })}
              </div>
            )
          ) : (
            <div className="bg-card border border-border rounded-2xl divide-y divide-border overflow-hidden">
              <button onClick={() => navigate(`/users/${classroom.created_by_id}?classroomId=${id}`)} className="w-full flex items-center gap-3 p-4 hover:bg-accent transition-colors text-left">
                <ProfileAvatar profile={profiles[classroom.created_by_id] || { first_name: classroom.teacher_name, account_type: "teacher" }} size="md" />
                <div className="min-w-0">
                  <p className="font-medium truncate">{classroom.teacher_name}</p>
                  <p className="text-xs text-muted-foreground">Teacher</p>
                </div>
              </button>
              {enrollments.filter((e) => (e.student_id || e.created_by_id) !== user.id).map((e) => {
                const sid = e.student_id || e.created_by_id;
                return (
                  <button key={e.id || sid} onClick={() => navigate(`/users/${sid}?classroomId=${id}`)} className="w-full flex items-center gap-3 p-4 hover:bg-accent transition-colors text-left">
                    <ProfileAvatar profile={profiles[sid] || { first_name: e.student_name, account_type: "student" }} size="md" />
                    <div className="min-w-0">
                      <p className="font-medium truncate">{e.student_name}</p>
                      <p className="text-xs text-muted-foreground">Classmate</p>
                    </div>
                  </button>
                );
              })}
            </div>
          )}
        </div>
      )}

      {/* Announcement Tab */}
      {tab === "Announcement" && (
        <div className="space-y-4">
          {isTeacher && !showAnnForm && (
            <Button onClick={() => setShowAnnForm(true)} className="w-full h-12">
              <Megaphone className="w-4 h-4 mr-2" /> Post Announcement
            </Button>
          )}
          {isTeacher && showAnnForm && (
            <AnnouncementForm
              existing={null}
              fixedClassroomId={id}
              fixedClassroomName={classroom.subject_title}
              onSaved={() => { setShowAnnForm(false); loadClassroomAnnouncements(); }}
              onCancel={() => setShowAnnForm(false)}
            />
          )}
          {loadingAnns ? (
            <div className="flex justify-center py-12"><Loader2 className="w-6 h-6 animate-spin text-muted-foreground" /></div>
          ) : classroomAnnouncements.length === 0 ? (
            <div className="text-center py-12 bg-card border border-dashed border-border rounded-2xl">
              <Megaphone className="w-8 h-8 text-muted-foreground mx-auto mb-2" />
              <p className="text-muted-foreground text-sm">No announcements for this class yet.</p>
            </div>
          ) : (
            <div className="space-y-3">
              {classroomAnnouncements
                .filter((a) => a.visibility === "open" || a.created_by_id === user?.id)
                .map((a) => (
                  <AnnouncementCard
                    key={a.id}
                    announcement={a}
                    canEdit={a.created_by_id === user?.id || isTeacher}
                    onUpdated={loadClassroomAnnouncements}
                  />
                ))}
            </div>
          )}
        </div>
      )}
    </div>
  );
}

function LessonTrackerCard({ lesson, enrollments, assignments, classroomId, onDeleted, isExpanded, onToggle }) {
  const navigate = useNavigate();
  const lessonAssignments = assignments.filter((a) => a.lesson_id === lesson.id);
  const completed = lessonAssignments.filter((a) => a.status === "completed").length;
  const total = enrollments.length;

  const handleDelete = async () => {
    if (!window.confirm(`Delete "${lesson.title}"?`)) return;
    try {
      await base44.entities.LessonAssignment.deleteMany({ lesson_id: lesson.id });
      await base44.entities.LessonPlan.delete(lesson.id);
      toast({ title: "Lesson deleted." });
      onDeleted();
    } catch (err) {
      toast({ title: "Delete failed", description: err.message, variant: "destructive" });
    }
  };

  const toggleVisibility = async (visibility) => {
    try {
      await base44.entities.LessonPlan.update(lesson.id, { visibility });
      toast({ title: `Lesson ${visibility === "closed" ? "closed" : "opened"}.` });
      onDeleted();
    } catch (err) {
      toast({ title: "Update failed", description: err.message, variant: "destructive" });
    }
  };

  return (
    <div className="bg-card border border-border rounded-xl overflow-hidden">
      <button onClick={onToggle} className="w-full flex items-center justify-between gap-3 p-4 hover:bg-accent transition-colors">
        <div className="min-w-0 flex-1 text-left">
          <span className="text-xs font-medium text-primary bg-primary/10 px-2 py-0.5 rounded-full">{lesson.subject}</span>
          <p className="font-semibold mt-1.5 truncate">{lesson.title}</p>
          <div className="flex items-center gap-2 mt-1">
            <div className="flex-1 h-1.5 bg-muted rounded-full overflow-hidden max-w-[120px]">
              <div className="h-full bg-emerald-500 rounded-full transition-all" style={{ width: total > 0 ? `${(completed / total) * 100}%` : "0%" }} />
            </div>
            <span className="text-xs text-muted-foreground">{completed}/{total} done</span>
          </div>
          {lesson.visibility === "closed" && <span className="inline-flex items-center gap-1 text-xs font-medium text-amber-600 bg-amber-50 px-2 py-0.5 rounded-full mt-1"><Lock className="w-3 h-3" /> Closed</span>}
        </div>
        <ChevronDown className={`w-5 h-5 text-muted-foreground transition-transform shrink-0 ${isExpanded ? "rotate-180" : ""}`} />
      </button>
      {isExpanded && (
        <div className="border-t border-border">
          <div className="p-4 space-y-3">
            {lesson.description && <p className="text-sm text-muted-foreground">{lesson.description}</p>}
            <div className="flex flex-wrap items-center gap-2">
              <span className="inline-flex items-center gap-1 text-xs font-medium text-amber-600 bg-amber-50 px-2 py-1 rounded-full"><Coins className="w-3 h-3" /> {lesson.points_reward || 10} pts</span>
              {lesson.scheduled_date && <span className="inline-flex items-center gap-1 text-xs font-medium text-blue-600 bg-blue-50 px-2 py-1 rounded-full"><CalendarClock className="w-3 h-3" /> {new Date(lesson.scheduled_date).toLocaleString()}</span>}
              {lesson.file_name && <span className="inline-flex items-center gap-1 text-xs font-medium text-muted-foreground bg-muted px-2 py-1 rounded-full truncate max-w-[180px]"><FileText className="w-3 h-3 shrink-0" /> {lesson.file_name}</span>}
              <div className="inline-flex items-center rounded-full border border-border overflow-hidden">
                <button type="button" onClick={(e) => { e.stopPropagation(); toggleVisibility("open"); }} className={`px-2.5 py-1 text-xs font-medium ${lesson.visibility !== "closed" ? "bg-emerald-500 text-white" : "text-muted-foreground hover:bg-accent"}`}>Open</button>
                <button type="button" onClick={(e) => { e.stopPropagation(); toggleVisibility("closed"); }} className={`px-2.5 py-1 text-xs font-medium ${lesson.visibility === "closed" ? "bg-amber-500 text-white" : "text-muted-foreground hover:bg-accent"}`}>Closed</button>
              </div>
            </div>
          </div>
          <div className="px-4 pb-3 flex flex-wrap gap-2">
            <Button variant="outline" size="sm" onClick={() => navigate(`/classrooms/${classroomId}/lessons/${lesson.id}/assign`)}>
              <UserPlus className="w-3.5 h-3.5 mr-1" /> Assign
            </Button>
            <Button variant="outline" size="sm" onClick={() => navigate(`/classrooms/${classroomId}/lessons/${lesson.id}/edit`)}>
              <Pencil className="w-3.5 h-3.5 mr-1" /> Edit
            </Button>
            <Button variant="outline" size="sm" className="text-destructive hover:text-destructive" onClick={handleDelete}>
              <Trash2 className="w-3.5 h-3.5 mr-1" /> Delete
            </Button>
          </div>
          <div className="border-t border-border p-4 space-y-1">
            <p className="text-xs font-medium text-muted-foreground uppercase tracking-wide mb-2">Student Progress</p>
            {enrollments.length === 0 ? (
              <p className="text-sm text-muted-foreground text-center py-2">No students enrolled.</p>
            ) : (
              enrollments.map((e) => {
                const a = lessonAssignments.find((la) => la.student_id === e.student_id);
                const done = a?.status === "completed";
                return (
                  <div key={e.student_id} className="flex items-center justify-between gap-3 py-2">
                    <span className="text-sm font-medium truncate">{e.student_name}</span>
                    {!a ? (
                      <span className="text-xs font-medium text-muted-foreground bg-muted px-2 py-1 rounded-full shrink-0">Not assigned</span>
                    ) : done ? (
                      <span className="inline-flex items-center gap-1 text-xs font-medium text-emerald-600 bg-emerald-50 px-2 py-1 rounded-full shrink-0"><CheckCircle2 className="w-3 h-3" /> Done</span>
                    ) : (
                      <span className="inline-flex items-center gap-1 text-xs font-medium text-muted-foreground bg-muted px-2 py-1 rounded-full shrink-0"><Clock className="w-3 h-3" /> Pending</span>
                    )}
                  </div>
                );
              })
            )}
          </div>
        </div>
      )}
    </div>
  );
}