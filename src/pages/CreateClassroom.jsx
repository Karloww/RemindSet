import React, { useState } from "react";
import { useNavigate } from "react-router-dom";
import { base44 } from "@/api/base44Client";
import { useProfile } from "@/lib/ProfileContext";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { ArrowLeft, Loader2, Sparkles, Copy, Check, BookOpen } from "lucide-react";
import { toast } from "@/components/ui/use-toast";

function generateClassCode() {
  const chars = "ABCDEFGHJKLMNPQRSTUVWXYZ23456789";
  let code = "";
  for (let i = 0; i < 6; i++) {
    code += chars[Math.floor(Math.random() * chars.length)];
  }
  return code;
}

export default function CreateClassroom() {
  const navigate = useNavigate();
  const { profile } = useProfile();
  const [subjectTitle, setSubjectTitle] = useState("");
  const [yearSection, setYearSection] = useState("");
  const [classCode, setClassCode] = useState("");
  const [copied, setCopied] = useState(false);
  const [saving, setSaving] = useState(false);

  const teacherName = profile ? `${profile.first_name} ${profile.last_name}` : "Teacher";
  const canGenerate = subjectTitle.trim() && yearSection.trim();

  const handleGenerate = () => {
    setClassCode(generateClassCode());
  };

  const copyCode = () => {
    navigator.clipboard?.writeText(classCode);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  const handleDone = async () => {
    if (!canGenerate || !classCode) return;
    setSaving(true);
    try {
      const classroom = await base44.entities.Classroom.create({
        subject_title: subjectTitle.trim(),
        year_and_section: yearSection.trim(),
        class_code: classCode,
        teacher_name: teacherName,
      });
      toast({ title: "Classroom created!", description: `Code: ${classCode}` });
      navigate(`/classrooms/${classroom.id}`);
    } catch (err) {
      toast({ title: "Failed to create", description: err.message, variant: "destructive" });
    } finally {
      setSaving(false);
    }
  };

  return (
    <div className="space-y-5 max-w-2xl mx-auto">
      <button onClick={() => navigate("/classrooms")} className="inline-flex items-center gap-1.5 text-sm text-muted-foreground hover:text-foreground">
        <ArrowLeft className="w-4 h-4" /> Back to classes
      </button>

      <div>
        <h1 className="text-2xl font-bold tracking-tight">Create a Classroom</h1>
        <p className="text-muted-foreground text-sm mt-1">Set up a class and share the code with your students.</p>
      </div>

      <div className="bg-card border border-border rounded-2xl p-6 space-y-5">
        <div className="space-y-2">
          <Label htmlFor="subject">Subject Title *</Label>
          <Input id="subject" value={subjectTitle} onChange={(e) => setSubjectTitle(e.target.value)}
            placeholder="e.g. Introduction to Algebra" />
        </div>
        <div className="space-y-2">
          <Label htmlFor="year">Year and Section *</Label>
          <Input id="year" value={yearSection} onChange={(e) => setYearSection(e.target.value)}
            placeholder="e.g. Grade 10 - Section A" />
        </div>

        {/* Generate button */}
        {!classCode ? (
          <Button onClick={handleGenerate} disabled={!canGenerate} variant="outline" className="w-full h-12">
            <Sparkles className="w-4 h-4 mr-2" /> Generate Class Code
          </Button>
        ) : (
          <div className="space-y-3">
            <Label>Class Code</Label>
            <div className="flex items-center gap-3 bg-primary/5 border-2 border-dashed border-primary/30 rounded-xl p-4">
              <BookOpen className="w-5 h-5 text-primary shrink-0" />
              <span className="text-2xl font-bold font-mono tracking-[0.3em] text-primary flex-1">{classCode}</span>
              <button type="button" onClick={copyCode} className="p-2 rounded-lg hover:bg-accent transition-colors">
                {copied ? <Check className="w-5 h-5 text-emerald-600" /> : <Copy className="w-5 h-5 text-muted-foreground" />}
              </button>
            </div>
            <p className="text-xs text-muted-foreground">Share this code with students so they can join the class.</p>
          </div>
        )}

        <Button onClick={handleDone} disabled={!classCode || saving} className="w-full h-12">
          {saving ? <><Loader2 className="w-4 h-4 mr-2 animate-spin" />Creating…</> : "Done"}
        </Button>
      </div>
    </div>
  );
}