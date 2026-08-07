import React, { useState, useEffect, useRef, useCallback, useMemo } from "react";
import { useParams, useNavigate } from "react-router-dom";
import { base44 } from "@/api/base44Client";
import { useAuth } from "@/lib/AuthContext";
import { useProfile } from "@/lib/ProfileContext";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Loader2, ChevronLeft, ChevronRight, CheckCircle2, Upload, Link, Send, ArrowLeft, Pause, Play, Timer, Coins } from "lucide-react";
import { toast } from "@/components/ui/use-toast";
import ActivityComment from "@/components/activity/ActivityComment";

export default function TakeActivity() {
  const { id: classroomId, activityId } = useParams();
  const navigate = useNavigate();
  const { user } = useAuth();
  const { profile, setProfile } = useProfile();
  const [activity, setActivity] = useState(null);
  const [loading, setLoading] = useState(true);
  const [current, setCurrent] = useState(0);
  const [answers, setAnswers] = useState({});
  const [file, setFile] = useState(null);
  const [linkUrl, setLinkUrl] = useState("");
  const [submitting, setSubmitting] = useState(false);
  const [submitted, setSubmitted] = useState(false);
  const [existingResponse, setExistingResponse] = useState(null);
  const [timeElapsed, setTimeElapsed] = useState(0);
  const [paused, setPaused] = useState(false);
  const timerRef = useRef(null);

  // Derived values (safe with optional chaining before activity loads)
  const questions = (() => { try { return JSON.parse(activity?.questions || "[]"); } catch { return []; } })();
  const settings = (() => { try { return JSON.parse(activity?.settings || "{}"); } catch { return {}; } })();
  const timeLimitMinutes = settings.timeLimitMinutes ?? activity?.time_limit_minutes ?? 0;
  const allowPause = settings.allowPause ?? activity?.allow_pause ?? true;
  const coinsReward = settings.coinsReward ?? activity?.coins_reward ?? 0;
  const retakeNumber = existingResponse?.retake_number ?? 0;
  const timeLimitSeconds = timeLimitMinutes * 60;
  const timeRemaining = timeLimitSeconds - timeElapsed;
  const isTimeUp = timeLimitSeconds > 0 && timeRemaining <= 0;

  // Anti-cheat: optionally shuffle question order and/or the options within each
  // multiple-choice question. Answers are always stored keyed by the ORIGINAL question
  // index and ORIGINAL option index (remapped on selection), so teacher grading and
  // the Responses view stay correct regardless of shuffling.
  const jumbleQuestions = settings.jumble ?? activity?.jumble_questions ?? false;
  const jumbleChoices = settings.jumbleChoices ?? activity?.jumble_choices ?? false;
  const displayQuestions = useMemo(() => {
    let qs = [];
    try { qs = JSON.parse(activity?.questions || "[]"); } catch { qs = []; }
    if (!Array.isArray(qs)) qs = [];
    let order = qs.map((_, i) => i);
    if (jumbleQuestions && order.length > 1) {
      for (let i = order.length - 1; i > 0; i--) {
        const j = Math.floor(Math.random() * (i + 1));
        [order[i], order[j]] = [order[j], order[i]];
      }
    }
    return order.map((origIndex) => {
      const q = qs[origIndex];
      if (q.type === "true_false") {
        return { ...q, origIndex, displayOptions: ["True", "False"], optionMap: [0, 1] };
      }
      let optionMap = (q.options || []).map((_, i) => i);
      if (jumbleChoices && q.type === "multiple_choice" && Array.isArray(q.options) && q.options.length > 1) {
        for (let i = optionMap.length - 1; i > 0; i--) {
          const j = Math.floor(Math.random() * (i + 1));
          [optionMap[i], optionMap[j]] = [optionMap[j], optionMap[i]];
        }
      }
      const displayOptions = optionMap.map((oi) => q.options[oi]);
      return { ...q, origIndex, displayOptions, optionMap };
    });
  }, [activity?.questions, jumbleQuestions, jumbleChoices]);

  useEffect(() => {
    if (!activityId || !user) return;
    (async () => {
      try {
        const [a, existing] = await Promise.all([
          base44.entities.Activity.get(activityId),
          base44.entities.ActivityResponse.filter({ activity_id: activityId, student_id: user.id }),
        ]);
        setActivity(a);
        if (existing?.length > 0) { setExistingResponse(existing[0]); setSubmitted(true); }
      } finally { setLoading(false); }
    })();
  }, [activityId, user]);

  // Start timer once activity loads
  useEffect(() => {
    if (!activity || submitted) return;
    const s = (() => { try { return JSON.parse(activity.settings || "{}"); } catch { return {}; } })();
    const hasTimer = (s.timeLimitMinutes ?? activity.time_limit_minutes ?? 0) > 0;
    if (!hasTimer) return;
    timerRef.current = setInterval(() => setTimeElapsed((t) => t + 1), 1000);
    return () => clearInterval(timerRef.current);
  }, [activity, submitted]);

  // Pause/resume timer
  useEffect(() => {
    if (!activity || timeLimitMinutes === 0) return;
    clearInterval(timerRef.current);
    if (!paused) {
      timerRef.current = setInterval(() => setTimeElapsed((t) => t + 1), 1000);
    }
    return () => clearInterval(timerRef.current);
  }, [paused]);

  const handleSubmit = useCallback(async () => {
    if (activity?.status === "closed") { toast({ title: "This activity is closed.", variant: "destructive" }); return; }
    if (activity?.deadline && new Date() > new Date(activity.deadline)) { toast({ title: "Deadline has passed.", variant: "destructive" }); return; }
    setSubmitting(true);
    clearInterval(timerRef.current);
    try {
      let fileUrl = "";
      if (file) {
        const res = await base44.integrations.Core.UploadFile({ file });
        fileUrl = res.file_url;
      }
      let total = 0;
      questions.forEach((q, qi) => {
        if (["multiple_choice", "true_false"].includes(q.type) && answers[qi] === q.correctAnswer) total += q.points;
      });
      const hasEssay = questions.some((q) => q.type === "essay" || q.type === "short_answer");
      const timeTakenMinutes = timeLimitMinutes > 0 ? Math.round(timeElapsed / 60) : null;

      await base44.entities.ActivityResponse.create({
        activity_id: activityId,
        classroom_id: classroomId,
        student_id: user.id,
        student_name: profile ? `${profile.first_name} ${profile.last_name}` : "Student",
        answers: JSON.stringify(answers),
        total_score: hasEssay ? null : total,
        max_score: questions.reduce((s, q) => s + q.points, 0),
        graded: !hasEssay,
        submitted_at: new Date().toISOString(),
        file_url: fileUrl,
        link_url: linkUrl,
        time_taken_minutes: timeTakenMinutes,
        retake_number: retakeNumber,
      });

      // Notify the teacher that a student submitted the activity
      try {
        const classroom = await base44.entities.Classroom.get(classroomId);
        const teacherId = classroom?.created_by_id;
        if (teacherId) {
          await base44.functions.invoke("sendNotifications", {
            notifications: [{
              user_id: teacherId,
              title: "Activity submitted",
              message: `${profile?.first_name || "Student"} ${profile?.last_name || ""} submitted "${activity.title}"`,
              activity_id: activityId,
              classroom_id: classroomId,
              type: "activity_done",
              category: "activity_done",
              deadline: activity.deadline || "",
              link: `${window.location.origin}/classrooms/${classroomId}/activities/${activityId}`,
            }],
          });
        }
      } catch (e) { /* best-effort */ }

      if (coinsReward > 0 && profile) {
        const newPoints = (profile.points || 0) + coinsReward;
        const updatedProfile = await base44.entities.Profile.update(profile.id, { points: newPoints });
        setProfile(updatedProfile);
        toast({ title: `+${coinsReward} coins earned! 🎉`, description: hasEssay ? "Awaiting teacher grading." : `Score: ${total} pts` });
      } else {
        toast({ title: "Submitted!", description: hasEssay ? "Awaiting teacher grading." : `Score: ${total} pts` });
      }
      setSubmitted(true);
      setExistingResponse({ total_score: hasEssay ? null : total, max_score: questions.reduce((s, q) => s + q.points, 0), graded: !hasEssay });
    } catch (err) {
      toast({ title: "Submit failed", description: err.message, variant: "destructive" });
    } finally { setSubmitting(false); }
  }, [activity, file, questions, answers, timeLimitMinutes, timeElapsed, coinsReward, profile, retakeNumber, activityId, classroomId, user, linkUrl]);

  // Auto-submit when time is up
  useEffect(() => {
    if (isTimeUp && !submitted && !submitting) {
      toast({ title: "Time's up! Submitting automatically…", variant: "destructive" });
      handleSubmit();
    }
  }, [isTimeUp]);

  const formatTime = (secs) => {
    const m = Math.floor(Math.abs(secs) / 60);
    const s = Math.abs(secs) % 60;
    return `${m}:${s.toString().padStart(2, "0")}`;
  };

  // Early returns after all hooks
  if (loading) return <div className="flex justify-center py-20"><Loader2 className="w-6 h-6 animate-spin text-muted-foreground" /></div>;
  if (!activity) return <div className="text-center py-20 text-muted-foreground">Activity not found.</div>;

  if (submitted) {
    return (
      <div className="max-w-2xl mx-auto space-y-5">
        <button onClick={() => navigate(`/classrooms/${classroomId}`)} className="inline-flex items-center gap-1.5 text-sm text-muted-foreground hover:text-foreground">
          <ArrowLeft className="w-4 h-4" /> Back
        </button>
        <div className="bg-card border border-border rounded-2xl p-8 text-center space-y-3">
          <CheckCircle2 className="w-12 h-12 text-emerald-500 mx-auto" />
          <h2 className="text-xl font-bold">Submitted!</h2>
          {existingResponse?.total_score != null && (
            <p className="text-muted-foreground">Your score: <span className="font-bold text-foreground">{existingResponse.total_score}</span> / {existingResponse.max_score} pts</p>
          )}
          {existingResponse?.graded === false && <p className="text-sm text-muted-foreground">Awaiting teacher grading.</p>}
          {coinsReward > 0 && (
            <div className="inline-flex items-center gap-1.5 text-emerald-600 bg-emerald-50 px-3 py-1.5 rounded-full text-sm font-medium">
              <Coins className="w-4 h-4" /> +{coinsReward} coins earned!
            </div>
          )}
        </div>
        <ActivityComment activityId={activityId} />
      </div>
    );
  }

  const isUploadLink = activity.type === "upload_link";
  const q = displayQuestions[current];

  return (
    <div className="max-w-2xl mx-auto space-y-5">
      <div className="flex items-center gap-3">
        <button onClick={() => navigate(`/classrooms/${classroomId}`)} className="inline-flex items-center gap-1.5 text-sm text-muted-foreground hover:text-foreground">
          <ArrowLeft className="w-4 h-4" /> Back
        </button>
        {timeLimitMinutes > 0 && (
          <div className="ml-auto flex items-center gap-2">
            {allowPause && (
              <Button size="sm" variant="outline" onClick={() => setPaused((p) => !p)}>
                {paused ? <Play className="w-4 h-4" /> : <Pause className="w-4 h-4" />}
                {paused ? "Resume" : "Pause"}
              </Button>
            )}
            <div className={`flex items-center gap-1.5 px-3 py-1.5 rounded-full text-sm font-mono font-semibold ${timeRemaining < 60 ? "bg-destructive/10 text-destructive" : "bg-primary/10 text-primary"}`}>
              <Timer className="w-4 h-4" />
              {paused ? "Paused" : formatTime(timeRemaining)}
            </div>
          </div>
        )}
      </div>

      <div className="bg-card border border-border rounded-2xl p-6 space-y-4">
        <h1 className="text-xl font-bold">{activity.title}</h1>
        {activity.description && <p className="text-sm text-muted-foreground">{activity.description}</p>}
        {activity.deadline && <p className="text-xs text-amber-600 font-medium">Due: {new Date(activity.deadline).toLocaleString()}</p>}
      </div>

      {isUploadLink ? (
        <div className="bg-card border border-border rounded-2xl p-6 space-y-4">
          {activity.file_url && <a href={activity.file_url} target="_blank" rel="noopener noreferrer" className="inline-flex items-center gap-2 text-primary text-sm hover:underline"><Link className="w-4 h-4" /> View teacher file</a>}
          {activity.link_url && <a href={activity.link_url} target="_blank" rel="noopener noreferrer" className="inline-flex items-center gap-2 text-primary text-sm hover:underline"><Link className="w-4 h-4" /> {activity.link_url}</a>}
          <div className="space-y-2">
            <label className="flex flex-col items-center justify-center gap-2 border-2 border-dashed border-border rounded-xl p-6 cursor-pointer hover:border-primary/40">
              <Upload className="w-6 h-6 text-muted-foreground" />
              <span className="text-sm text-muted-foreground">{file ? file.name : "Upload your file"}</span>
              <input type="file" className="hidden" onChange={(e) => setFile(e.target.files?.[0] || null)} />
            </label>
            <Input value={linkUrl} onChange={(e) => setLinkUrl(e.target.value)} placeholder="Or paste a link…" />
          </div>
          <Button onClick={handleSubmit} className="w-full" disabled={submitting}>
            {submitting ? <Loader2 className="w-4 h-4 mr-2 animate-spin" /> : <Send className="w-4 h-4 mr-2" />} Submit
          </Button>
        </div>
      ) : questions.length > 0 && q ? (
        <div className="bg-card border border-border rounded-2xl p-6 space-y-5">
          <div className="flex justify-between items-center text-sm text-muted-foreground">
            <span>Question {current + 1} of {displayQuestions.length}</span>
            <span>{q.points} pts</span>
          </div>
          <p className="font-semibold">{q.text}</p>
          {q.imageUrl && <img src={q.imageUrl} alt="Question" className="rounded-xl max-h-48 w-full object-cover" />}
          {["multiple_choice", "true_false"].includes(q.type) && (
            <div className="space-y-2">
              {q.displayOptions.map((opt, oi) => {
                const origOpt = q.optionMap[oi];
                const selected = answers[q.origIndex] === origOpt;
                return (
                  <label key={oi} className={`flex items-center gap-3 p-3 rounded-xl border cursor-pointer transition-colors ${selected ? "border-primary bg-primary/5" : "border-border"}`}>
                    <input type="radio" name={`q-${q.origIndex}`} checked={selected} onChange={() => setAnswers((a) => ({ ...a, [q.origIndex]: origOpt }))} />
                    <span className="text-sm">{opt}</span>
                  </label>
                );
              })}
            </div>
          )}
          {q.type === "checkbox" && (
            <div className="space-y-2">
              {q.displayOptions.map((opt, oi) => {
                const origOpt = q.optionMap[oi];
                const arr = answers[q.origIndex] || [];
                const checked = arr.includes(origOpt);
                return (
                  <label key={oi} className={`flex items-center gap-3 p-3 rounded-xl border cursor-pointer transition-colors ${checked ? "border-primary bg-primary/5" : "border-border"}`}>
                    <input type="checkbox" checked={checked} onChange={() => setAnswers((a) => {
                      const cur = a[q.origIndex] || [];
                      return { ...a, [q.origIndex]: checked ? cur.filter((x) => x !== origOpt) : [...cur, origOpt] };
                    })} />
                    <span className="text-sm">{opt}</span>
                  </label>
                );
              })}
            </div>
          )}
          {q.type === "short_answer" && <input value={answers[q.origIndex] || ""} onChange={(e) => setAnswers((a) => ({ ...a, [q.origIndex]: e.target.value }))} placeholder="Your answer…" className="w-full border border-border rounded-lg px-3 py-2 text-sm bg-background" />}
          {q.type === "essay" && <textarea value={answers[q.origIndex] || ""} onChange={(e) => setAnswers((a) => ({ ...a, [q.origIndex]: e.target.value }))} rows={5} placeholder="Write your answer…" className="w-full border border-border rounded-lg px-3 py-2 text-sm bg-background" />}
          <div className="flex items-center gap-3 pt-2 border-t border-border">
            {settings.allowPrev && current > 0 && <Button variant="outline" onClick={() => setCurrent((c) => c - 1)}><ChevronLeft className="w-4 h-4 mr-1" /> Prev</Button>}
            {current < questions.length - 1 ? (
              <Button onClick={() => setCurrent((c) => c + 1)} className="ml-auto">Next <ChevronRight className="w-4 h-4 ml-1" /></Button>
            ) : (
              <Button onClick={handleSubmit} className="ml-auto" disabled={submitting}>
                {submitting ? <Loader2 className="w-4 h-4 mr-2 animate-spin" /> : <Send className="w-4 h-4 mr-2" />} Submit
              </Button>
            )}
          </div>
        </div>
      ) : (
        <div className="text-center py-10 text-muted-foreground">No questions in this activity.</div>
      )}
    </div>
  );
}