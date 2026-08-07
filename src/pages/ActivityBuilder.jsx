import React, { useState, useEffect } from "react";
import { useParams, useNavigate } from "react-router-dom";
import { base44 } from "@/api/base44Client";
import { useAuth } from "@/lib/AuthContext";
import { useProfile } from "@/lib/ProfileContext";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { ArrowLeft, Plus, Trash2, Copy, Image, Loader2, Save, Settings, Eye, BarChart2, Upload, Link } from "lucide-react";
import { toast } from "@/components/ui/use-toast";
import ActivityPreview from "@/components/activity/ActivityPreview";
import ActivitySettings from "@/components/activity/ActivitySettings";
import ActivityResponses from "@/components/activity/ActivityResponses";
import ActivityComment from "@/components/activity/ActivityComment";
import QuestionnaireImportExport from "@/components/activity/QuestionnaireImportExport";

const newQuestion = (defaultPoints = 1) => ({
  id: Date.now() + Math.random(),
  text: "",
  imageUrl: "",
  type: "multiple_choice",
  options: ["", ""],
  correctAnswer: 0,
  points: defaultPoints,
  required: true,
});

const TABS = ["Questions", "Preview", "Settings", "Responses", "Comments"];

export default function ActivityBuilder() {
  const { id: classroomId, activityId } = useParams();
  const navigate = useNavigate();
  const { user } = useAuth();
  const { profile } = useProfile();

  const [tab, setTab] = useState("Questions");
  const [title, setTitle] = useState("");
  const [description, setDescription] = useState("");
  const [actType, setActType] = useState("quiz");
  const [questions, setQuestions] = useState([newQuestion()]);
  const [settings, setSettings] = useState({ jumble: false, jumbleChoices: false, defaultPoints: 1, status: "open", deadline: "", requireAll: true, allowPrev: true, allowPause: true, coinsReward: 0, timeLimitMinutes: 0, maxRetakes: 0, assignedIds: [], scheduleDate: "", scheduleTime: "" });
  const [uploadFile, setUploadFile] = useState(null);
  const [linkUrl, setLinkUrl] = useState("");
  const [saving, setSaving] = useState(false);
  const [activity, setActivity] = useState(null);
  const [loading, setLoading] = useState(!!activityId);
  const [uploadingImg, setUploadingImg] = useState({});

  useEffect(() => {
    if (!activityId) return;
    (async () => {
      try {
        const a = await base44.entities.Activity.get(activityId);
        setActivity(a);
        setTitle(a.title || "");
        setDescription(a.description || "");
        setActType(a.type || "quiz");
        setLinkUrl(a.link_url || "");
        if (a.questions) setQuestions(JSON.parse(a.questions));
        if (a.settings) {
          const parsed = JSON.parse(a.settings);
          setSettings({
            jumble: parsed.jumble ?? false,
            jumbleChoices: parsed.jumbleChoices ?? false,
            defaultPoints: parsed.defaultPoints ?? 1,
            status: parsed.status ?? a.status ?? "open",
            deadline: parsed.deadline ?? a.deadline ?? "",
            requireAll: parsed.requireAll ?? true,
            allowPrev: parsed.allowPrev ?? true,
            allowPause: parsed.allowPause ?? a.allow_pause ?? true,
            coinsReward: parsed.coinsReward ?? a.coins_reward ?? 0,
            timeLimitMinutes: parsed.timeLimitMinutes ?? a.time_limit_minutes ?? 0,
            maxRetakes: parsed.maxRetakes ?? a.max_retakes ?? 0,
            assignedIds: parsed.assignedIds ?? [],
            scheduleDate: parsed.scheduleDate ?? "",
            scheduleTime: parsed.scheduleTime ?? "",
          });
        }
      } finally {
        setLoading(false);
      }
    })();
  }, [activityId]);

  const addQuestion = () => setQuestions((qs) => [...qs, newQuestion(settings.defaultPoints)]);
  const removeQuestion = (idx) => setQuestions((qs) => qs.filter((_, i) => i !== idx));
  const copyQuestion = (idx) => setQuestions((qs) => {
    const copy = { ...qs[idx], id: Date.now() + Math.random(), options: [...qs[idx].options] };
    return [...qs.slice(0, idx + 1), copy, ...qs.slice(idx + 1)];
  });

  // Import a previously exported questionnaire. Questions replace the current set;
  // quiz behavior settings are copied, but class-specific schedule/assignments are kept.
  const handleImport = ({ questions: imported, settings: importedSettings, type: importedType, title: importedTitle, description: importedDesc }) => {
    if (Array.isArray(imported) && imported.length > 0) {
      setQuestions(imported.map((q) => ({ ...q, id: Date.now() + Math.random() })));
    }
    if (importedSettings) {
      setSettings((prev) => ({
        ...prev,
        jumble: importedSettings.jumble ?? prev.jumble,
        jumbleChoices: importedSettings.jumbleChoices ?? prev.jumbleChoices,
        defaultPoints: importedSettings.defaultPoints ?? prev.defaultPoints,
        requireAll: importedSettings.requireAll ?? prev.requireAll,
        allowPrev: importedSettings.allowPrev ?? prev.allowPrev,
        allowPause: importedSettings.allowPause ?? prev.allowPause,
        timeLimitMinutes: importedSettings.timeLimitMinutes ?? prev.timeLimitMinutes,
        maxRetakes: importedSettings.maxRetakes ?? prev.maxRetakes,
        coinsReward: importedSettings.coinsReward ?? prev.coinsReward,
      }));
    }
    if (importedType) setActType(importedType);
    if (importedTitle) setTitle(importedTitle);
    if (importedDesc) setDescription(importedDesc);
  };
  const updateQuestion = (idx, field, value) => setQuestions((qs) => qs.map((q, i) => i === idx ? { ...q, [field]: value } : q));
  const updateOption = (qi, oi, val) => setQuestions((qs) => qs.map((q, i) => i === qi ? { ...q, options: q.options.map((o, j) => j === oi ? val : o) } : q));
  const addOption = (qi) => setQuestions((qs) => qs.map((q, i) => i === qi ? { ...q, options: [...q.options, ""] } : q));
  const removeOption = (qi, oi) => setQuestions((qs) => qs.map((q, i) => i === qi ? { ...q, options: q.options.filter((_, j) => j !== oi), correctAnswer: q.correctAnswer >= oi && q.correctAnswer > 0 ? q.correctAnswer - 1 : q.correctAnswer } : q));

  const handleImageUpload = async (qi, e) => {
    const file = e.target.files?.[0];
    if (!file) return;
    setUploadingImg((p) => ({ ...p, [qi]: true }));
    try {
      const res = await base44.integrations.Core.UploadFile({ file });
      updateQuestion(qi, "imageUrl", res.file_url);
    } catch (err) {
      toast({ title: "Image upload failed", description: err.message, variant: "destructive" });
    } finally {
      setUploadingImg((p) => ({ ...p, [qi]: false }));
    }
  };

  const handleSave = async () => {
    if (!title.trim()) { toast({ title: "Title is required", variant: "destructive" }); return; }
    setSaving(true);
    try {
      let fileUrl = activity?.file_url || "";
      if (uploadFile) {
        const res = await base44.integrations.Core.UploadFile({ file: uploadFile });
        fileUrl = res.file_url;
      }
      const data = {
        classroom_id: classroomId,
        title: title.trim(),
        description: description.trim(),
        type: actType,
        questions: JSON.stringify(questions),
        settings: JSON.stringify(settings),
        status: settings.status || "open",
        deadline: settings.deadline || "",
        default_points: settings.defaultPoints,
        jumble_questions: settings.jumble,
        jumble_choices: settings.jumbleChoices ?? false,
        require_all: settings.requireAll,
        allow_prev: settings.allowPrev,
        allow_pause: settings.allowPause ?? true,
        coins_reward: settings.coinsReward ?? 0,
        time_limit_minutes: settings.timeLimitMinutes ?? 0,
        max_retakes: settings.maxRetakes ?? 0,
        assigned_student_ids: JSON.stringify(settings.assignedIds || []),
        file_url: fileUrl,
        link_url: linkUrl,
        teacher_name: profile ? `${profile.first_name} ${profile.last_name}` : "",
      };
      if (activityId) {
        await base44.entities.Activity.update(activityId, data);
        toast({ title: "Activity updated!" });
      } else {
        const created = await base44.entities.Activity.create(data);
        toast({ title: "Activity created!" });

        // Notify enrolled students via backend function (respects preferences + email)
        if (settings.status !== "closed") {
          const enrollments = await base44.entities.ClassroomEnrollment.filter({ classroom_id: classroomId }, "created_date", 200);
          const assignedIds = settings.assignedIds?.length > 0 ? settings.assignedIds : null;
          const recipients = (enrollments || []).filter((e) => {
            const sid = e.student_id || e.created_by_id;
            return !assignedIds || assignedIds.includes(sid);
          });
          if (recipients.length > 0) {
            const scheduledISO = settings.scheduleDate
              ? new Date(`${settings.scheduleDate}T${settings.scheduleTime || "00:00"}`).toISOString()
              : "";
            await base44.functions.invoke("sendNotifications", {
              notifications: recipients.map((e) => ({
                user_id: e.student_id || e.created_by_id,
                title: "New activity assigned",
                message: `${profile ? `${profile.first_name} ${profile.last_name}` : "Your teacher"} posted a new activity: "${title.trim()}"`,
                activity_id: created.id,
                classroom_id: classroomId,
                type: "activity",
                category: "activity",
                scheduled_date: scheduledISO,
                deadline: settings.deadline || "",
                link: `${window.location.origin}/classrooms/${classroomId}/activities/${created.id}/take`,
                })),
            });
          }
        }

        navigate(`/classrooms/${classroomId}/activities/${created.id}`, { replace: true });
      }
    } catch (err) {
      toast({ title: "Save failed", description: err.message, variant: "destructive" });
    } finally {
      setSaving(false);
    }
  };

  if (loading) return <div className="flex justify-center py-20"><Loader2 className="w-6 h-6 animate-spin text-muted-foreground" /></div>;

  return (
    <div className="max-w-3xl mx-auto space-y-4">
      <div className="flex items-center gap-3 flex-wrap">
        <button onClick={() => navigate(`/classrooms/${classroomId}`)} className="inline-flex items-center gap-1.5 text-sm text-muted-foreground hover:text-foreground">
          <ArrowLeft className="w-4 h-4" /> Back
        </button>
        <div className="ml-auto flex items-center gap-2">
          <QuestionnaireImportExport
            title={title}
            description={description}
            actType={actType}
            questions={questions}
            settings={settings}
            onImport={handleImport}
          />
          <Button onClick={handleSave} disabled={saving}>
            {saving ? <Loader2 className="w-4 h-4 mr-2 animate-spin" /> : <Save className="w-4 h-4 mr-2" />}
            {activityId ? "Save Changes" : "Create Activity"}
          </Button>
        </div>
      </div>

      {/* Title & Description */}
      <div className="bg-card border border-border rounded-2xl p-5 space-y-4">
        <div className="space-y-2">
          <Input value={title} onChange={(e) => setTitle(e.target.value)} placeholder="Activity Title *" className="text-lg font-semibold h-12" />
        </div>
        <Textarea value={description} onChange={(e) => setDescription(e.target.value)} placeholder="Description (optional)" rows={2} />
        <div className="flex gap-3">
          <button type="button" onClick={() => setActType("quiz")} className={`flex-1 py-2 rounded-xl border-2 text-sm font-medium transition-all ${actType === "quiz" ? "border-primary bg-primary/5" : "border-border"}`}>
            Quiz / Assignment
          </button>
          <button type="button" onClick={() => setActType("upload_link")} className={`flex-1 py-2 rounded-xl border-2 text-sm font-medium transition-all ${actType === "upload_link" ? "border-primary bg-primary/5" : "border-border"}`}>
            Upload / Link
          </button>
        </div>
      </div>

      {/* Tabs */}
      <div className="flex gap-1 bg-muted rounded-xl p-1">
        {TABS.map((t) => (
          <button key={t} onClick={() => setTab(t)} className={`flex-1 py-2 text-sm font-medium rounded-lg transition-colors ${tab === t ? "bg-card shadow-sm text-foreground" : "text-muted-foreground hover:text-foreground"}`}>
            {t}
          </button>
        ))}
      </div>

      {/* Tab content */}
      {tab === "Questions" && (
        <div className="space-y-4">
          {actType === "upload_link" ? (
            <div className="bg-card border border-border rounded-2xl p-5 space-y-4">
              <div className="space-y-2">
                <Label>Upload a File</Label>
                {uploadFile ? (
                  <div className="flex items-center gap-3 border border-border rounded-xl p-3">
                    <Upload className="w-5 h-5 text-muted-foreground shrink-0" />
                    <p className="text-sm font-medium truncate flex-1">{uploadFile.name}</p>
                    <button type="button" onClick={() => setUploadFile(null)} className="text-xs text-destructive">Remove</button>
                  </div>
                ) : (
                  <label className="flex flex-col items-center justify-center gap-2 border-2 border-dashed border-border rounded-xl p-6 cursor-pointer hover:border-primary/40 transition-colors">
                    <Upload className="w-6 h-6 text-muted-foreground" />
                    <span className="text-sm text-muted-foreground">Click to upload file</span>
                    <input type="file" className="hidden" onChange={(e) => setUploadFile(e.target.files?.[0] || null)} />
                  </label>
                )}
              </div>
              <div className="space-y-2">
                <Label>Or paste a Link</Label>
                <div className="relative">
                  <Link className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
                  <Input value={linkUrl} onChange={(e) => setLinkUrl(e.target.value)} placeholder="https://…" className="pl-9" />
                </div>
              </div>
            </div>
          ) : (
            questions.map((q, qi) => (
              <QuestionCard
                key={q.id}
                question={q}
                index={qi}
                total={questions.length}
                uploadingImg={uploadingImg[qi]}
                onUpdate={(f, v) => updateQuestion(qi, f, v)}
                onUpdateOption={(oi, val) => updateOption(qi, oi, val)}
                onAddOption={() => addOption(qi)}
                onRemoveOption={(oi) => removeOption(qi, oi)}
                onDelete={() => removeQuestion(qi)}
                onCopy={() => copyQuestion(qi)}
                onImageUpload={(e) => handleImageUpload(qi, e)}
              />
            ))
          )}
          {actType === "quiz" && (
            <button onClick={addQuestion} className="w-full py-3 border-2 border-dashed border-border rounded-2xl text-sm text-muted-foreground hover:border-primary/40 hover:text-primary transition-colors flex items-center justify-center gap-2">
              <Plus className="w-4 h-4" /> Add Question
            </button>
          )}
        </div>
      )}
      {tab === "Preview" && <ActivityPreview title={title} description={description} questions={questions} actType={actType} linkUrl={linkUrl} settings={settings} />}
      {tab === "Settings" && <ActivitySettings settings={settings} onUpdate={setSettings} classroomId={classroomId} />}
      {tab === "Responses" && <ActivityResponses activityId={activityId} classroomId={classroomId} questions={questions} activity={activity} />}
      {tab === "Comments" && activityId ? (
        <ActivityComment activityId={activityId} />
      ) : tab === "Comments" ? (
        <div className="text-center py-10 text-muted-foreground text-sm bg-card border border-dashed border-border rounded-2xl">Save the activity first to enable comments.</div>
      ) : null}
    </div>
  );
}

function QuestionCard({ question: q, index, onUpdate, onUpdateOption, onAddOption, onRemoveOption, onDelete, onCopy, onImageUpload, uploadingImg }) {
  const TYPES = ["multiple_choice", "checkbox", "short_answer", "essay", "true_false"];
  return (
    <div className="bg-card border border-border rounded-2xl p-5 space-y-4">
      <div className="flex items-center justify-between gap-2">
        <span className="text-xs font-semibold text-muted-foreground">Question {index + 1}</span>
        <div className="flex gap-1">
          <button onClick={onCopy} className="p-1.5 rounded-lg hover:bg-accent text-muted-foreground" title="Copy"><Copy className="w-4 h-4" /></button>
          <button onClick={onDelete} className="p-1.5 rounded-lg hover:bg-destructive/10 text-destructive" title="Delete"><Trash2 className="w-4 h-4" /></button>
        </div>
      </div>
      <Textarea value={q.text} onChange={(e) => onUpdate("text", e.target.value)} placeholder="Question text…" rows={2} />
      {/* Image */}
      {q.imageUrl ? (
        <div className="relative">
          <img src={q.imageUrl} alt="Question" className="rounded-xl max-h-40 w-full object-cover" />
          <button onClick={() => onUpdate("imageUrl", "")} className="absolute top-2 right-2 bg-background/80 rounded-lg p-1 text-destructive"><Trash2 className="w-4 h-4" /></button>
        </div>
      ) : (
        <label className="inline-flex items-center gap-2 text-sm text-muted-foreground cursor-pointer hover:text-primary">
          {uploadingImg ? <Loader2 className="w-4 h-4 animate-spin" /> : <Image className="w-4 h-4" />}
          Add image
          <input type="file" accept="image/*" className="hidden" onChange={onImageUpload} />
        </label>
      )}
      {/* Type selector */}
      <div className="flex flex-wrap gap-1">
        {TYPES.map((t) => (
          <button key={t} type="button" onClick={() => onUpdate("type", t)} className={`text-xs px-2.5 py-1 rounded-full border transition-all ${q.type === t ? "border-primary bg-primary/5 text-primary" : "border-border text-muted-foreground"}`}>
            {t.replace(/_/g, " ")}
          </button>
        ))}
      </div>
      {/* Options */}
      {["multiple_choice", "checkbox", "true_false"].includes(q.type) && (
        <div className="space-y-2">
          {(q.type === "true_false" ? ["True", "False"] : q.options).map((opt, oi) => (
            <div key={oi} className="flex items-center gap-2">
              <input type="radio" name={`q-${q.id}`} checked={q.correctAnswer === oi} onChange={() => onUpdate("correctAnswer", oi)} className="shrink-0" />
              {q.type === "true_false" ? (
                <span className="text-sm flex-1">{opt}</span>
              ) : (
                <Input value={opt} onChange={(e) => onUpdateOption(oi, e.target.value)} placeholder={`Option ${oi + 1}`} className="flex-1 h-8 text-sm" />
              )}
              {q.type !== "true_false" && q.options.length > 2 && (
                <button onClick={() => onRemoveOption(oi)} className="p-1 text-muted-foreground hover:text-destructive"><Trash2 className="w-3.5 h-3.5" /></button>
              )}
            </div>
          ))}
          {q.type === "multiple_choice" && (
            <button onClick={onAddOption} className="text-sm text-primary hover:underline flex items-center gap-1"><Plus className="w-3.5 h-3.5" /> Add option</button>
          )}
        </div>
      )}
      {["short_answer", "essay"].includes(q.type) && (
        <div className="bg-muted rounded-xl p-3 text-sm text-muted-foreground italic">Students will type their answer here.</div>
      )}
      {/* Points & settings */}
      <div className="flex items-center gap-3 pt-1 border-t border-border">
        <div className="flex items-center gap-2">
          <Label className="text-xs">Points</Label>
          <Input type="number" min="0" value={q.points} onChange={(e) => onUpdate("points", Number(e.target.value))} className="w-16 h-7 text-sm" />
        </div>
        <label className="flex items-center gap-1.5 text-xs text-muted-foreground ml-auto">
          <input type="checkbox" checked={q.required} onChange={(e) => onUpdate("required", e.target.checked)} />
          Required
        </label>
      </div>
    </div>
  );
}