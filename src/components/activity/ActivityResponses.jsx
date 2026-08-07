import React, { useEffect, useState } from "react";
import { base44 } from "@/api/base44Client";
import { Loader2, ChevronLeft, CheckCircle2, ExternalLink, RotateCcw, Clock } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { toast } from "@/components/ui/use-toast";

export default function ActivityResponses({ activityId, classroomId, questions, activity }) {
  const [responses, setResponses] = useState([]);
  const [loading, setLoading] = useState(true);
  const [selected, setSelected] = useState(null);
  const [grades, setGrades] = useState({});
  const [saving, setSaving] = useState(false);
  const [grantingRetake, setGrantingRetake] = useState(null);

  const load = async () => {
    if (!activityId) { setLoading(false); return; }
    try {
      const data = await base44.entities.ActivityResponse.filter({ activity_id: activityId }, "-submitted_at", 200);
      setResponses(data || []);
    } finally { setLoading(false); }
  };

  useEffect(() => { load(); }, [activityId]);

  const saveGrades = async (response) => {
    setSaving(true);
    try {
      const answers = JSON.parse(response.answers || "{}");
      let total = 0;
      questions.forEach((q, qi) => {
        if (q.type === "essay" || q.type === "short_answer") {
          total += Number(grades[qi] || 0);
        } else if (["multiple_choice", "true_false"].includes(q.type)) {
          if (answers[qi] === q.correctAnswer) total += q.points;
        }
      });
      await base44.entities.ActivityResponse.update(response.id, { total_score: total, graded: true });
      toast({ title: "Grades saved!" });
      load();
      setSelected(null);
    } catch (err) {
      toast({ title: "Save failed", description: err.message, variant: "destructive" });
    } finally { setSaving(false); }
  };

  const grantRetake = async (response) => {
    setGrantingRetake(response.id);
    try {
      // Delete the student's response so they can retake
      await base44.entities.ActivityResponse.delete(response.id);
      toast({ title: "Retake granted!", description: `${response.student_name} can now retake the activity.` });
      load();
      setSelected(null);
    } catch (err) {
      toast({ title: "Failed to grant retake", description: err.message, variant: "destructive" });
    } finally { setGrantingRetake(null); }
  };

  if (!activityId) return (
    <div className="text-center py-12 bg-card border border-dashed border-border rounded-2xl text-muted-foreground text-sm">
      Save the activity first to see responses.
    </div>
  );

  if (loading) return <div className="flex justify-center py-12"><Loader2 className="w-6 h-6 animate-spin text-muted-foreground" /></div>;

  const settings = (() => { try { return JSON.parse(activity?.settings || "{}"); } catch { return {}; } })();
  const hasTimeLimit = settings.timeLimitMinutes > 0;

  if (selected) {
    const resp = responses.find((r) => r.id === selected);
    const answers = JSON.parse(resp?.answers || "{}");
    return (
      <div className="bg-card border border-border rounded-2xl p-5 space-y-4">
        <div className="flex items-center gap-3 flex-wrap">
          <button onClick={() => setSelected(null)} className="inline-flex items-center gap-1 text-sm text-muted-foreground hover:text-foreground">
            <ChevronLeft className="w-4 h-4" /> Back
          </button>
          <h3 className="font-semibold">{resp?.student_name}</h3>
          <span className="ml-auto text-sm text-muted-foreground">{resp?.total_score ?? "—"} / {questions.reduce((s, q) => s + q.points, 0)} pts</span>
        </div>

        {/* Time taken */}
        {hasTimeLimit && resp?.time_taken_minutes != null && (
          <div className="inline-flex items-center gap-1.5 text-sm text-blue-600 bg-blue-50 px-3 py-1.5 rounded-full">
            <Clock className="w-4 h-4" /> Finished in {resp.time_taken_minutes} min
          </div>
        )}

        {/* Retake button */}
        <Button variant="outline" size="sm" className="gap-1.5" disabled={grantingRetake === resp?.id}
          onClick={() => grantRetake(resp)}>
          {grantingRetake === resp?.id ? <Loader2 className="w-4 h-4 animate-spin" /> : <RotateCcw className="w-4 h-4" />}
          Grant Retake
        </Button>

        {resp?.file_url && <a href={resp.file_url} target="_blank" rel="noopener noreferrer" className="inline-flex items-center gap-2 text-primary text-sm hover:underline"><ExternalLink className="w-4 h-4" /> View uploaded file</a>}
        {resp?.link_url && <a href={resp.link_url} target="_blank" rel="noopener noreferrer" className="inline-flex items-center gap-2 text-primary text-sm hover:underline"><ExternalLink className="w-4 h-4" /> {resp.link_url}</a>}
        <div className="space-y-4">
          {questions.map((q, qi) => {
            const ans = answers[qi];
            const isEssay = q.type === "essay" || q.type === "short_answer";
            const isCorrect = !isEssay && ans === q.correctAnswer;
            return (
              <div key={qi} className="border border-border rounded-xl p-4 space-y-2">
                <p className="font-medium text-sm">{qi + 1}. {q.text}</p>
                {isEssay ? (
                  <>
                    <div className="bg-muted rounded-lg p-3 text-sm">{ans || <span className="italic text-muted-foreground">No answer</span>}</div>
                    <div className="flex items-center gap-2">
                      <label className="text-xs text-muted-foreground">Grade (max {q.points}):</label>
                      <Input type="number" min="0" max={q.points} value={grades[qi] ?? ""} onChange={(e) => setGrades((g) => ({ ...g, [qi]: e.target.value }))} className="w-20 h-7 text-sm" />
                    </div>
                  </>
                ) : (
                  <div className={`text-sm px-3 py-2 rounded-lg ${isCorrect ? "bg-emerald-50 text-emerald-700" : "bg-red-50 text-red-600"}`}>
                    Answer: {["multiple_choice", "true_false"].includes(q.type) ? (q.type === "true_false" ? ["True", "False"][ans] : q.options[ans]) : ans}
                    {" "}— {isCorrect ? `+${q.points} pts` : "Incorrect"}
                  </div>
                )}
              </div>
            );
          })}
        </div>
        {questions.some((q) => q.type === "essay" || q.type === "short_answer") && (
          <Button onClick={() => saveGrades(resp)} disabled={saving} className="w-full">
            {saving ? <Loader2 className="w-4 h-4 mr-2 animate-spin" /> : <CheckCircle2 className="w-4 h-4 mr-2" />} Save Grades
          </Button>
        )}
      </div>
    );
  }

  return (
    <div className="space-y-3">
      {responses.length === 0 ? (
        <div className="text-center py-12 bg-card border border-dashed border-border rounded-2xl text-muted-foreground text-sm">No responses yet.</div>
      ) : responses.map((r) => (
        <div key={r.id} className="w-full bg-card border border-border rounded-xl p-4 flex items-center gap-3 hover:border-primary/40 transition-colors">
          <button onClick={() => setSelected(r.id)} className="min-w-0 flex-1 text-left">
            <p className="font-medium">{r.student_name}</p>
            <div className="flex items-center gap-3 mt-0.5">
              <p className="text-xs text-muted-foreground">{r.submitted_at ? new Date(r.submitted_at).toLocaleString() : "—"}</p>
              {hasTimeLimit && r.time_taken_minutes != null && (
                <span className="text-xs text-blue-600 flex items-center gap-0.5"><Clock className="w-3 h-3" /> {r.time_taken_minutes} min</span>
              )}
            </div>
          </button>
          <div className="text-right shrink-0 flex flex-col items-end gap-1">
            <p className="font-semibold text-sm">{r.total_score ?? "—"} pts</p>
            {r.graded && <span className="text-xs text-emerald-600">Graded</span>}
          </div>
          <button onClick={() => grantRetake(r)} disabled={grantingRetake === r.id}
            className="p-1.5 rounded-lg hover:bg-accent text-muted-foreground shrink-0" title="Grant Retake">
            {grantingRetake === r.id ? <Loader2 className="w-4 h-4 animate-spin" /> : <RotateCcw className="w-4 h-4" />}
          </button>
        </div>
      ))}
    </div>
  );
}