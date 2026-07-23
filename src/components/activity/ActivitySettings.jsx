import React, { useEffect, useState } from "react";
import { base44 } from "@/api/base44Client";
import { useAuth } from "@/lib/AuthContext";
import { Label } from "@/components/ui/label";
import { Input } from "@/components/ui/input";
import { Loader2 } from "lucide-react";

export default function ActivitySettings({ settings, onUpdate, classroomId }) {
  const { user } = useAuth();
  const [students, setStudents] = useState([]);
  const [loadingStudents, setLoadingStudents] = useState(true);

  useEffect(() => {
    (async () => {
      try {
        const enr = await base44.entities.ClassroomEnrollment.filter({ classroom_id: classroomId }, "created_date", 200);
        setStudents(enr || []);
      } finally { setLoadingStudents(false); }
    })();
  }, [classroomId]);

  const set = (key, val) => onUpdate((prev) => ({ ...prev, [key]: val }));
  const toggleStudent = (sid) => {
    const ids = settings.assignedIds || [];
    onUpdate((prev) => ({ ...prev, assignedIds: ids.includes(sid) ? ids.filter((x) => x !== sid) : [...ids, sid] }));
  };

  return (
    <div className="bg-card border border-border rounded-2xl p-5 space-y-5">
      <h3 className="font-semibold">Activity Settings</h3>
      <div className="grid grid-cols-2 gap-4">
        <div className="space-y-2">
          <Label>Default Points Per Question</Label>
          <Input type="number" min="0" value={settings.defaultPoints} onChange={(e) => set("defaultPoints", Number(e.target.value))} />
        </div>
        <div className="space-y-2">
          <Label>Status</Label>
          <select value={settings.status} onChange={(e) => set("status", e.target.value)} className="flex h-9 w-full rounded-md border border-input bg-background px-3 text-sm">
            <option value="open">Open</option>
            <option value="closed">Closed</option>
          </select>
        </div>
      </div>
      <div className="space-y-2">
        <Label>Deadline (optional)</Label>
        <Input type="datetime-local" value={settings.deadline} onChange={(e) => set("deadline", e.target.value)} />
      </div>
      <div className="space-y-2">
        {[
          { key: "jumble", label: "Jumble (randomize) questions" },
          { key: "requireAll", label: "Require all questions to be answered" },
          { key: "allowPrev", label: "Allow going back to previous questions" },
        ].map(({ key, label }) => (
          <label key={key} className="flex items-center gap-3 cursor-pointer">
            <input type="checkbox" checked={!!settings[key]} onChange={(e) => set(key, e.target.checked)} className="w-4 h-4" />
            <span className="text-sm">{label}</span>
          </label>
        ))}
      </div>
      <div className="space-y-2">
        <Label>Assign to specific students (leave empty = all)</Label>
        {loadingStudents ? (
          <div className="flex items-center gap-2 text-muted-foreground text-sm"><Loader2 className="w-4 h-4 animate-spin" /> Loading…</div>
        ) : students.length === 0 ? (
          <p className="text-sm text-muted-foreground">No students enrolled yet.</p>
        ) : (
          <div className="space-y-1 border border-border rounded-xl p-3 max-h-40 overflow-y-auto">
            {students.map((s) => {
              const sid = s.student_id || s.created_by_id;
              const selected = (settings.assignedIds || []).includes(sid);
              return (
                <label key={sid} className="flex items-center gap-3 cursor-pointer py-1">
                  <input type="checkbox" checked={selected} onChange={() => toggleStudent(sid)} />
                  <span className="text-sm">{s.student_name}</span>
                </label>
              );
            })}
          </div>
        )}
      </div>
    </div>
  );
}