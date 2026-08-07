import React, { useRef, useState } from "react";
import { Download, Upload as UploadIcon, Loader2 } from "lucide-react";
import { Button } from "@/components/ui/button";
import { toast } from "@/components/ui/use-toast";

// Encode/decode a shareable questionnaire token (UTF-8 safe base64 JSON).
function encodeToken(payload) {
  const bytes = new TextEncoder().encode(JSON.stringify(payload));
  let binary = "";
  bytes.forEach((b) => (binary += String.fromCharCode(b)));
  return btoa(binary);
}
function decodeToken(token) {
  const binary = atob(token.trim());
  const bytes = Uint8Array.from(binary, (c) => c.charCodeAt(0));
  return JSON.parse(new TextDecoder().decode(bytes));
}

function safeFilename(name) {
  const base = (name || "questionnaire").trim().replace(/[\\/:*?"<>|]+/g, "_").replace(/\s+/g, " ").trim();
  return base || "questionnaire";
}

// Export downloads a .remindset file named after the activity title; Import uploads
// that file and loads the questions into the current activity (fully editable).
export default function QuestionnaireImportExport({ title, description, actType, questions, settings, onImport }) {
  const fileRef = useRef(null);
  const [busy, setBusy] = useState(false);

  const handleExport = () => {
    const valid = (questions || []).filter((q) => q && q.text && q.text.trim());
    if (valid.length === 0) {
      toast({ title: "Nothing to export", description: "Add at least one question with text first.", variant: "destructive" });
      return;
    }
    const token = encodeToken({ v: 1, type: actType, questions, settings, title, description });
    const blob = new Blob([token], { type: "text/plain" });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = `${safeFilename(title)}.remindset`;
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
    URL.revokeObjectURL(url);
    toast({ title: "Questionnaire exported!", description: `Saved as "${safeFilename(title)}.remindset".` });
  };

  const handleFile = async (e) => {
    const file = e.target.files?.[0];
    if (!file) return;
    setBusy(true);
    try {
      const text = await file.text();
      const data = decodeToken(text);
      if (!data || !Array.isArray(data.questions)) throw new Error("Invalid file");
      onImport({
        questions: data.questions,
        settings: data.settings || null,
        type: data.type || actType,
        title: data.title || "",
        description: data.description || "",
      });
      toast({ title: "Questionnaire imported!", description: "Review and edit before saving." });
    } catch {
      toast({ title: "Import failed", description: "That file is not a valid questionnaire.", variant: "destructive" });
    } finally {
      setBusy(false);
      if (fileRef.current) fileRef.current.value = "";
    }
  };

  return (
    <div className="flex gap-2">
      <Button type="button" variant="outline" size="sm" onClick={handleExport}>
        <Download className="w-4 h-4 mr-1.5" /> Export
      </Button>
      <Button type="button" variant="outline" size="sm" onClick={() => fileRef.current?.click()} disabled={busy}>
        {busy ? <Loader2 className="w-4 h-4 mr-1.5 animate-spin" /> : <UploadIcon className="w-4 h-4 mr-1.5" />} Import
      </Button>
      <input ref={fileRef} type="file" accept=".remindset,.txt,.json" className="hidden" onChange={handleFile} />
    </div>
  );
}