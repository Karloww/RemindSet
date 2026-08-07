import React, { useState, useEffect } from "react";
import { useNavigate } from "react-router-dom";
import { base44 } from "@/api/base44Client";
import { useProfile } from "@/lib/ProfileContext";
import { Button } from "@/components/ui/button";
import { Label } from "@/components/ui/label";
import { ArrowLeft, Bell, Mail, Loader2, Save, ClipboardList, BookOpen, MessageCircle } from "lucide-react";
import { toast } from "@/components/ui/use-toast";

export default function NotificationSettings() {
  const navigate = useNavigate();
  const { profile, setProfile } = useProfile();
  const [settings, setSettings] = useState({});
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    if (!profile) return;
    setSettings({
      notify_activity: profile.notify_activity ?? true,
      notify_lesson: profile.notify_lesson ?? true,
      email_notifications: profile.email_notifications ?? false,
      notify_message: profile.notify_message ?? true,
      teacher_activity_done: profile.teacher_activity_done ?? "every_student",
      teacher_lesson_done: profile.teacher_lesson_done ?? "every_student",
    });
  }, [profile]);

  const isTeacher = profile?.account_type === "teacher";
  const set = (key, val) => setSettings((prev) => ({ ...prev, [key]: val }));

  const handleSave = async () => {
    setSaving(true);
    try {
      const updated = await base44.entities.Profile.update(profile.id, settings);
      setProfile(updated);
      toast({ title: "Notification settings saved!" });
    } catch (err) {
      toast({ title: "Save failed", description: err.message, variant: "destructive" });
    } finally {
      setSaving(false);
    }
  };

  if (!profile) return <div className="flex justify-center py-20"><Loader2 className="w-6 h-6 animate-spin text-muted-foreground" /></div>;

  return (
    <div className="space-y-5 max-w-2xl mx-auto">
      <button onClick={() => navigate("/settings")} className="inline-flex items-center gap-1.5 text-sm text-muted-foreground hover:text-foreground">
        <ArrowLeft className="w-4 h-4" /> Back to Settings
      </button>

      <div>
        <h1 className="text-2xl font-bold tracking-tight">Notification Settings</h1>
        <p className="text-muted-foreground text-sm mt-1">Choose which notifications you want to receive.</p>
      </div>

      <div className="bg-card border border-border rounded-2xl p-5 space-y-5">
        {isTeacher ? (
          <>
            {/* Teacher: Activity done */}
            <div className="space-y-3">
              <Label className="flex items-center gap-1.5"><ClipboardList className="w-4 h-4 text-primary" /> Notify when an Activity is submitted</Label>
              <select
                value={settings.teacher_activity_done}
                onChange={(e) => set("teacher_activity_done", e.target.value)}
                className="flex h-9 w-full rounded-md border border-input bg-background px-3 text-sm"
              >
                <option value="every_student">Every student submission</option>
                <option value="after_deadline">Only after the deadline has passed</option>
                <option value="disabled">Disabled</option>
              </select>
            </div>

            {/* Teacher: Lesson done */}
            <div className="space-y-3">
              <Label className="flex items-center gap-1.5"><BookOpen className="w-4 h-4 text-primary" /> Notify when a Lesson is completed</Label>
              <select
                value={settings.teacher_lesson_done}
                onChange={(e) => set("teacher_lesson_done", e.target.value)}
                className="flex h-9 w-full rounded-md border border-input bg-background px-3 text-sm"
              >
                <option value="every_student">Every student completion</option>
                <option value="disabled">Disabled</option>
              </select>
            </div>
          </>
        ) : (
          <>
            {/* Student: Activity notifications */}
            <label className="flex items-center gap-3 cursor-pointer">
              <input
                type="checkbox"
                checked={!!settings.notify_activity}
                onChange={(e) => set("notify_activity", e.target.checked)}
                className="w-4 h-4"
              />
              <div>
                <p className="text-sm font-medium">Notify when an Activity is uploaded</p>
                <p className="text-xs text-muted-foreground">Get notified when a teacher posts a new activity.</p>
              </div>
            </label>

            {/* Student: Lesson notifications */}
            <label className="flex items-center gap-3 cursor-pointer">
              <input
                type="checkbox"
                checked={!!settings.notify_lesson}
                onChange={(e) => set("notify_lesson", e.target.checked)}
                className="w-4 h-4"
              />
              <div>
                <p className="text-sm font-medium">Notify when a Lesson is uploaded</p>
                <p className="text-xs text-muted-foreground">Get notified when a teacher assigns a new lesson.</p>
              </div>
            </label>
          </>
        )}

        <div className="border-t border-border pt-4 space-y-4">
          {/* Email notifications */}
          <label className="flex items-center gap-3 cursor-pointer">
            <input
              type="checkbox"
              checked={!!settings.email_notifications}
              onChange={(e) => set("email_notifications", e.target.checked)}
              className="w-4 h-4"
            />
            <div>
              <p className="text-sm font-medium flex items-center gap-1.5"><Mail className="w-4 h-4 text-primary" /> Enable email notifications</p>
              <p className="text-xs text-muted-foreground">Receive a copy of notifications through your registered email.</p>
            </div>
          </label>

          {/* Message notifications */}
          <label className="flex items-center gap-3 cursor-pointer">
            <input
              type="checkbox"
              checked={!!settings.notify_message}
              onChange={(e) => set("notify_message", e.target.checked)}
              className="w-4 h-4"
            />
            <div>
              <p className="text-sm font-medium flex items-center gap-1.5"><MessageCircle className="w-4 h-4 text-primary" /> Notify when someone sends you a message</p>
              <p className="text-xs text-muted-foreground">Get notified when you receive a new message.</p>
            </div>
          </label>
        </div>
      </div>

      <Button onClick={handleSave} className="w-full h-12" disabled={saving}>
        {saving ? <><Loader2 className="w-4 h-4 mr-2 animate-spin" /> Saving…</> : <><Save className="w-4 h-4 mr-2" /> Save Settings</>}
      </Button>
    </div>
  );
}