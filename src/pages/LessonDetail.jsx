import React, { useEffect, useState, useRef, useCallback } from "react";
import { useParams, useNavigate, Link } from "react-router-dom";
import { base44 } from "@/api/base44Client";
import { useProfile } from "@/lib/ProfileContext";
import { Button } from "@/components/ui/button";
import { ArrowLeft, CheckCircle2, Coins, Download, Loader2, BookOpen, Lock } from "lucide-react";
import confetti from "canvas-confetti";

export default function LessonDetail() {
  const { id } = useParams();
  const navigate = useNavigate();
  const { profile, setProfile } = useProfile();
  const [assignment, setAssignment] = useState(null);
  const [loading, setLoading] = useState(true);
  const [claiming, setClaiming] = useState(false);
  const [lessonPlan, setLessonPlan] = useState(null);
  const [readProgress, setReadProgress] = useState(0); // 0-100
  const scrollContainerRef = useRef(null);

  useEffect(() => {
    if (!id) return;
    let active = true;
    (async () => {
      try {
        const data = await base44.entities.LessonAssignment.get(id);
        if (!active) return;
        setAssignment(data);
        if (data?.lesson_id) {
          try {
            const lp = await base44.entities.LessonPlan.get(data.lesson_id);
            if (active) setLessonPlan(lp);
          } catch { /* ignore */ }
        }
      } finally {
        if (active) setLoading(false);
      }
    })();
    return () => { active = false; };
  }, [id]);

  // Track scroll progress within the review container (outer scroll).
  // We render files in a tall iframe so the outer container scrolls, since
  // cross-origin iframe internal scroll cannot be accessed.
  const handleScroll = useCallback(() => {
    const el = scrollContainerRef.current;
    if (!el) return;
    const scrollTop = el.scrollTop;
    const scrollHeight = el.scrollHeight - el.clientHeight;
    if (scrollHeight <= 0) return; // not enough content to scroll yet
    const pct = Math.min(100, Math.round((scrollTop / scrollHeight) * 100));
    setReadProgress(pct);
  }, []);

  const claimCoins = async () => {
    if (!assignment || assignment.status === "completed" || readProgress < 95) return;
    setClaiming(true);
    try {
      const reward = assignment.points_reward ?? 10;
      const updated = await base44.entities.LessonAssignment.update(assignment.id, {
        status: "completed",
        viewed_date: new Date().toISOString(),
        points_earned: reward,
      });
      setAssignment(updated);
      const newPoints = (profile.points || 0) + reward;
      const updatedProfile = await base44.entities.Profile.update(profile.id, { points: newPoints });
      setProfile(updatedProfile);
      confetti({ particleCount: 120, spread: 70, origin: { y: 0.6 } });
      try {
        await base44.entities.Notification.create({
          user_id: assignment.created_by_id,
          title: "Lesson completed",
          message: `${profile.first_name} ${profile.last_name} completed "${assignment.lesson_title}".`,
          read: false,
          classroom_id: assignment.classroom_id || "",
          type: "lesson_done",
        });
      } catch (e) { /* ignore */ }
    } finally {
      setClaiming(false);
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

  if (lessonPlan?.visibility === "closed") {
    return (
      <div className="space-y-5 max-w-3xl mx-auto">
        <button onClick={() => navigate(assignment.classroom_id ? `/classrooms/${assignment.classroom_id}` : "/classrooms")} className="inline-flex items-center gap-1.5 text-sm text-muted-foreground hover:text-foreground">
          <ArrowLeft className="w-4 h-4" /> Back to class
        </button>
        <div className="bg-card border border-border rounded-2xl p-8 text-center space-y-3">
          <div className="mx-auto w-fit rounded-full bg-amber-50 text-amber-600 p-3"><Lock className="w-7 h-7" /></div>
          <h2 className="text-xl font-bold">This lesson is currently closed</h2>
          <p className="text-sm text-muted-foreground">Your teacher has hidden this lesson for now. Please check back later.</p>
        </div>
      </div>
    );
  }

  const reward = assignment.points_reward ?? 10;
  const canClaim = !done && readProgress >= 95;

  return (
    <div className="space-y-5 max-w-3xl mx-auto">
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

          {/* Review section with progress tracking */}
          {assignment.file_url ? (
            <div>
              <div className="flex items-center justify-between mb-2">
                <h3 className="text-sm font-semibold text-muted-foreground flex items-center gap-1.5">
                  <BookOpen className="w-4 h-4" /> Review the lesson
                </h3>
                <span className="text-sm font-medium">{readProgress}%</span>
              </div>
              {/* Progress bar */}
              <div className="h-2 bg-muted rounded-full overflow-hidden mb-3">
                <div className={`h-full rounded-full transition-all ${done ? "bg-emerald-500" : "bg-primary"}`} style={{ width: `${done ? 100 : readProgress}%` }} />
              </div>
              <p className="text-xs text-muted-foreground mb-3">
                {done
                  ? "You've completed this lesson and earned your coins."
                  : "Scroll through all the slides/pages to reach 100% and unlock your coins. You can only earn coins once per lesson."}
              </p>
              {/* Scrollable review container with the file */}
              <div
                ref={scrollContainerRef}
                onScroll={handleScroll}
                className="w-full h-[60vh] overflow-y-auto rounded-xl border border-border bg-muted/30"
              >
                {isOfficeFile(assignment.file_url) ? (
                  <iframe
                    title="Lesson file"
                    src={`https://view.officeapps.live.com/embed/?src=${encodeURIComponent(assignment.file_url)}`}
                    className="w-full border-0"
                    style={{ height: "70vh", minHeight: "400px" }}
                  />
                ) : isPdfFile(assignment.file_url) ? (
                  <iframe
                    title="Lesson file"
                    src={assignment.file_url}
                    className="w-full border-0"
                    style={{ height: "4000px" }}
                  />
                ) : isImageFile(assignment.file_url) ? (
                  <div className="p-4">
                    <img src={assignment.file_url} alt="Lesson" className="w-full h-auto rounded-lg" />
                  </div>
                ) : (
                  <iframe
                    title="Lesson file"
                    src={assignment.file_url}
                    className="w-full border-0"
                    style={{ height: "4000px" }}
                  />
                )}
              </div>
              <a href={assignment.file_url} target="_blank" rel="noreferrer" className="inline-flex items-center gap-1.5 text-xs text-primary hover:underline mt-2">
                <Download className="w-3 h-3" /> Open / download file in new tab
              </a>
            </div>
          ) : !assignment.description ? (
            <div className="flex items-center gap-3 text-muted-foreground text-sm">
              <BookOpen className="w-5 h-5" /> No additional materials for this lesson.
            </div>
          ) : null}

          {/* Claim coins / completed state */}
          <div className={`rounded-xl p-5 ${done ? "bg-emerald-50 border border-emerald-100" : "bg-primary/5 border border-primary/10"}`}>
            {done ? (
              <div className="flex items-center gap-3">
                <CheckCircle2 className="w-8 h-8 text-emerald-600" />
                <div>
                  <p className="font-semibold text-emerald-700">Lesson completed!</p>
                  <p className="text-sm text-emerald-600">You earned {assignment.points_earned || reward} points.</p>
                </div>
              </div>
            ) : assignment.file_url ? (
              <div className="flex items-center justify-between gap-3 flex-wrap">
                <div className="flex items-center gap-3">
                  <div className="rounded-lg bg-primary text-primary-foreground p-2.5"><Coins className="w-5 h-5" /></div>
                  <div>
                    <p className="font-semibold">Earn {reward} coins</p>
                    <p className="text-sm text-muted-foreground">
                      {canClaim
                        ? "You've reached the end! Claim your coins now."
                        : `Reach 100% by scrolling to the last slide to unlock your coins (${readProgress}%).`}
                    </p>
                  </div>
                </div>
                <Button onClick={claimCoins} disabled={!canClaim || claiming}>
                  {claiming ? <><Loader2 className="w-4 h-4 mr-2 animate-spin" />Claiming…</> : <><Coins className="w-4 h-4 mr-2" />Claim Coins</>}
                </Button>
              </div>
            ) : (
              <div className="flex items-center justify-between gap-3 flex-wrap">
                <div className="flex items-center gap-3">
                  <div className="rounded-lg bg-primary text-primary-foreground p-2.5"><Coins className="w-5 h-5" /></div>
                  <div>
                    <p className="font-semibold">Complete this lesson</p>
                    <p className="text-sm text-muted-foreground">Earn {reward} points when you're done.</p>
                  </div>
                </div>
                <Button onClick={claimCoins} disabled={claiming}>
                  {claiming ? <><Loader2 className="w-4 h-4 mr-2 animate-spin" />Marking…</> : "Mark as Completed"}
                </Button>
              </div>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}

function isPdfFile(url) {
  return /\.(pdf)(\?|$)/i.test(url || "");
}
function isImageFile(url) {
  return /\.(png|jpe?g|gif|webp|svg)(\?|$)/i.test(url || "");
}
function isOfficeFile(url) {
  return /\.(pptx?|docx?|xlsx?|odt|ods|odp)(\?|$)/i.test(url || "");
}