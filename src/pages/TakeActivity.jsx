import React, { useState, useEffect } from "react";
import { useParams, useNavigate } from "react-router-dom";
import { base44 } from "@/api/base44Client";
import { useAuth } from "@/lib/AuthContext";
import { useProfile } from "@/lib/ProfileContext";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Loader2, ChevronLeft, ChevronRight, CheckCircle2, Upload, Link, Send, ArrowLeft } from "lucide-react";
import { toast } from "@/components/ui/use-toast";
import ActivityComment from "@/components/activity/ActivityComment";

export default function TakeActivity() {
  const { id: classroomId, activityId } = useParams();
  const navigate = useNavigate();
  const { user } = useAuth();
  const { profile } = useProfile();
  const [activity, setActivity] = useState(null);
  const [loading, setLoading] = useState(true);
  const [current, setCurrent] = useState(0);
  const [answers, setAnswers] = useState({});
  const [file, setFile] = useState(null);
  const [linkUrl, setLinkUrl] = useState("");
  const [submitting, setSubmitting] = useState(false);
  const [submitted, setSubmitted] = useState(false);
  const [existingResponse, setExistingResponse] = useState(null);

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

  if (loading) return <div className="flex justify-center py-20"><Loader2 className="w-6 h-6 animate-spin text-muted-foreground" /></div>;
  if (!activity) return <div className="text-center py-20 text-muted-foreground">Activity not found.</div>;

  const questions = (() => { try { return JSON.parse(activity.questions || "[]"); } catch { return []; } })();
  const settings = (() => { try { return JSON.parse(activity.settings || "{}"); } catch { return {}; } })();
  const isUploadLink = activity.type === "upload_link";

  const handleSubmit = async () => {
    if (activity.status === "closed") { toast({ title: "This activity is closed.", variant: "destructive" }); return; }
    if (activity.deadline && new Date() > new Date(activity.deadline)) { toast({ title: "Deadline has passed.", variant: "destructive" }); return; }
    setSubmitting(true);
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
      });
      setSubmitted(true);
      toast({ title: "Submitted!", description: hasEssay ? "Awaiting teacher grading." : `Score: ${total} pts` });
    } catch (err) {
      toast({ title: "Submit failed", description: err.message, variant: "destructive" });
    } finally { setSubmitting(false); }
  };

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
        </div>
        <ActivityComment activityId={activityId} />
      </div>
    );
  }

  const q = questions[current];

  return (
    <div className="max-w-2xl mx-auto space-y-5">
      <button onClick={() => navigate(`/classrooms/${classroomId}`)} className="inline-flex items-center gap-1.5 text-sm text-muted-foreground hover:text-foreground">
        <ArrowLeft className="w-4 h-4" /> Back
      </button>
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
            <span>Question {current + 1} of {questions.length}</span>
            <span>{q.points} pts</span>
          </div>
          <p className="font-semibold">{q.text}</p>
          {q.imageUrl && <img src={q.imageUrl} alt="Question" className="rounded-xl max-h-48 w-full object-cover" />}
          {["multiple_choice", "true_false"].includes(q.type) && (
            <div className="space-y-2">
              {(q.type === "true_false" ? ["True", "False"] : q.options).map((opt, oi) => (
                <label key={oi} className={`flex items-center gap-3 p-3 rounded-xl border cursor-pointer transition-colors ${answers[current] === oi ? "border-primary bg-primary/5" : "border-border"}`}>
                  <input type="radio" name={`q-${current}`} checked={answers[current] === oi} onChange={() => setAnswers((a) => ({ ...a, [current]: oi }))} />
                  <span className="text-sm">{opt}</span>
                </label>
              ))}
            </div>
          )}
          {q.type === "checkbox" && (
            <div className="space-y-2">
              {q.options.map((opt, oi) => {
                const checked = (answers[current] || []).includes(oi);
                return (
                  <label key={oi} className={`flex items-center gap-3 p-3 rounded-xl border cursor-pointer transition-colors ${checked ? "border-primary bg-primary/5" : "border-border"}`}>
                    <input type="checkbox" checked={checked} onChange={() => setAnswers((a) => {
                      const arr = a[current] || [];
                      return { ...a, [current]: checked ? arr.filter((x) => x !== oi) : [...arr, oi] };
                    })} />
                    <span className="text-sm">{opt}</span>
                  </label>
                );
              })}
            </div>
          )}
          {q.type === "short_answer" && <input value={answers[current] || ""} onChange={(e) => setAnswers((a) => ({ ...a, [current]: e.target.value }))} placeholder="Your answer…" className="w-full border border-border rounded-lg px-3 py-2 text-sm bg-background" />}
          {q.type === "essay" && <textarea value={answers[current] || ""} onChange={(e) => setAnswers((a) => ({ ...a, [current]: e.target.value }))} rows={5} placeholder="Write your answer…" className="w-full border border-border rounded-lg px-3 py-2 text-sm bg-background" />}
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
      <ActivityComment activityId={activityId} />
    </div>
  );
}