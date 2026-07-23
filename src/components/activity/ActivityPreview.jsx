import React, { useState } from "react";
import { Button } from "@/components/ui/button";
import { ChevronLeft, ChevronRight, CheckCircle2, ExternalLink } from "lucide-react";

export default function ActivityPreview({ title, description, questions, actType, linkUrl, settings }) {
  const [current, setCurrent] = useState(0);
  const [answers, setAnswers] = useState({});

  if (actType === "upload_link") {
    return (
      <div className="bg-card border border-border rounded-2xl p-6 space-y-4">
        <h2 className="text-xl font-bold">{title || "Untitled"}</h2>
        {description && <p className="text-muted-foreground text-sm">{description}</p>}
        <div className="border border-dashed border-border rounded-xl p-6 text-center text-muted-foreground">
          Students will upload a file or submit a link here.
        </div>
        {linkUrl && (
          <a href={linkUrl} target="_blank" rel="noopener noreferrer" className="inline-flex items-center gap-2 text-primary text-sm hover:underline">
            <ExternalLink className="w-4 h-4" /> {linkUrl}
          </a>
        )}
      </div>
    );
  }

  const q = questions[current];
  if (!q) return <div className="text-center py-10 text-muted-foreground">No questions yet.</div>;

  return (
    <div className="bg-card border border-border rounded-2xl p-6 space-y-5">
      <div className="flex items-center justify-between">
        <h2 className="text-xl font-bold">{title || "Untitled"}</h2>
        <span className="text-sm text-muted-foreground">{current + 1} / {questions.length}</span>
      </div>
      {description && <p className="text-sm text-muted-foreground">{description}</p>}
      <div className="space-y-4">
        <p className="font-semibold">{q.text || <span className="italic text-muted-foreground">No question text</span>}</p>
        {q.imageUrl && <img src={q.imageUrl} alt="Question" className="rounded-xl max-h-48 w-full object-cover" />}
        {["multiple_choice", "true_false"].includes(q.type) && (
          <div className="space-y-2">
            {(q.type === "true_false" ? ["True", "False"] : q.options).map((opt, oi) => (
              <label key={oi} className={`flex items-center gap-3 p-3 rounded-xl border cursor-pointer transition-colors ${answers[q.id] === oi ? "border-primary bg-primary/5" : "border-border"}`}>
                <input type="radio" name={`preview-${q.id}`} checked={answers[q.id] === oi} onChange={() => setAnswers((a) => ({ ...a, [q.id]: oi }))} />
                <span className="text-sm">{opt}</span>
              </label>
            ))}
          </div>
        )}
        {q.type === "checkbox" && (
          <div className="space-y-2">
            {q.options.map((opt, oi) => (
              <label key={oi} className="flex items-center gap-3 p-3 rounded-xl border border-border cursor-pointer">
                <input type="checkbox" />
                <span className="text-sm">{opt}</span>
              </label>
            ))}
          </div>
        )}
        {q.type === "short_answer" && <input className="w-full border border-border rounded-lg px-3 py-2 text-sm bg-background" placeholder="Short answer…" />}
        {q.type === "essay" && <textarea className="w-full border border-border rounded-lg px-3 py-2 text-sm bg-background" rows={4} placeholder="Essay answer…" />}
      </div>
      <div className="flex items-center gap-3 pt-2 border-t border-border">
        {settings.allowPrev && current > 0 && (
          <Button variant="outline" onClick={() => setCurrent((c) => c - 1)}><ChevronLeft className="w-4 h-4 mr-1" /> Prev</Button>
        )}
        {current < questions.length - 1 ? (
          <Button onClick={() => setCurrent((c) => c + 1)} className="ml-auto">Next <ChevronRight className="w-4 h-4 ml-1" /></Button>
        ) : (
          <Button className="ml-auto"><CheckCircle2 className="w-4 h-4 mr-1" /> Submit</Button>
        )}
      </div>
    </div>
  );
}