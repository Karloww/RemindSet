import React, { useState, useEffect } from "react";
import { base44 } from "@/api/base44Client";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import { Label } from "@/components/ui/label";
import { Input } from "@/components/ui/input";
import { Shield, ShieldOff, Loader2, AlertTriangle, KeyRound, Eye, EyeOff } from "lucide-react";
import { toast } from "@/components/ui/use-toast";

export default function MaintenanceMode() {
  const [settings, setSettings] = useState(null);
  const [settingsId, setSettingsId] = useState(null);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [message, setMessage] = useState("");
  const [teacherCode, setTeacherCode] = useState("");
  const [showCode, setShowCode] = useState(false);
  const [savingCode, setSavingCode] = useState(false);

  const load = async () => {
    try {
      const list = await base44.entities.AppSettings.list();
      if (list?.length > 0) {
        setSettings(list[0]);
        setSettingsId(list[0].id);
        setMessage(list[0].maintenance_message || "");
        setTeacherCode(list[0].teacher_secret_code || "");
      } else {
        setSettings({ maintenance_mode: false, maintenance_message: "", teacher_secret_code: "" });
        setTeacherCode("");
      }
    } finally { setLoading(false); }
  };

  useEffect(() => { load(); }, []);

  const handleToggle = async () => {
    setSaving(true);
    try {
      const newMode = !settings.maintenance_mode;
      const data = { maintenance_mode: newMode, maintenance_message: message };
      let updated;
      if (settingsId) {
        updated = await base44.entities.AppSettings.update(settingsId, data);
      } else {
        updated = await base44.entities.AppSettings.create(data);
        setSettingsId(updated.id);
      }
      setSettings(updated);
      toast({ title: newMode ? "Maintenance mode ENABLED" : "Maintenance mode DISABLED", description: newMode ? "Regular users will see the maintenance screen." : "App is now accessible to all users." });
    } catch (err) {
      toast({ title: "Failed", description: err.message, variant: "destructive" });
    } finally { setSaving(false); }
  };

  const handleSaveMessage = async () => {
    if (!settingsId) return;
    setSaving(true);
    try {
      await base44.entities.AppSettings.update(settingsId, { maintenance_message: message });
      toast({ title: "Message saved." });
    } catch (err) {
      toast({ title: "Failed", description: err.message, variant: "destructive" });
    } finally { setSaving(false); }
  };

  const handleSaveTeacherCode = async () => {
    setSavingCode(true);
    try {
      if (settingsId) {
        await base44.entities.AppSettings.update(settingsId, { teacher_secret_code: teacherCode });
      } else {
        const created = await base44.entities.AppSettings.create({ maintenance_mode: false, maintenance_message: message, teacher_secret_code: teacherCode });
        setSettingsId(created.id);
      }
      toast({ title: "Teacher Secret Code saved!" });
    } catch (err) {
      toast({ title: "Failed", description: err.message, variant: "destructive" });
    } finally { setSavingCode(false); }
  };

  if (loading) return <div className="flex justify-center py-12"><Loader2 className="w-6 h-6 animate-spin text-muted-foreground" /></div>;

  const isOn = settings?.maintenance_mode;

  return (
    <div className="space-y-5">
      <div>
        <h1 className="text-2xl font-bold tracking-tight">Maintenance Mode</h1>
        <p className="text-muted-foreground text-sm mt-1">Disable the app for regular users during maintenance. Admins can still access everything.</p>
      </div>
      <div className={`bg-card border-2 rounded-2xl p-6 space-y-4 ${isOn ? "border-amber-400 bg-amber-50/50" : "border-border"}`}>
        <div className="flex items-center gap-4">
          <div className={`rounded-full p-4 ${isOn ? "bg-amber-100 text-amber-600" : "bg-emerald-50 text-emerald-600"}`}>
            {isOn ? <AlertTriangle className="w-8 h-8" /> : <Shield className="w-8 h-8" />}
          </div>
          <div>
            <p className="text-lg font-bold">{isOn ? "Maintenance Mode is ON" : "App is Live"}</p>
            <p className="text-sm text-muted-foreground">{isOn ? "Regular users see the maintenance screen." : "All users can access the app normally."}</p>
          </div>
        </div>
        <div className="space-y-2">
          <Label>Maintenance Message</Label>
          <Textarea value={message} onChange={(e) => setMessage(e.target.value)} rows={3} placeholder="e.g. We're performing scheduled maintenance. Back at 3:00 PM." />
        </div>
        <div className="flex gap-3">
          <Button onClick={handleToggle} disabled={saving} className={isOn ? "bg-amber-600 hover:bg-amber-600" : ""}>
            {saving ? <Loader2 className="w-4 h-4 mr-2 animate-spin" /> : isOn ? <ShieldOff className="w-4 h-4 mr-2" /> : <Shield className="w-4 h-4 mr-2" />}
            {isOn ? "Disable Maintenance" : "Enable Maintenance"}
          </Button>
          {settingsId && <Button variant="outline" onClick={handleSaveMessage} disabled={saving}>Save Message</Button>}
        </div>
      </div>
      {/* Teacher Secret Code */}
      <div className="bg-card border border-border rounded-2xl p-6 space-y-4">
        <div className="flex items-center gap-3">
          <div className="rounded-lg bg-primary/10 p-2 text-primary"><KeyRound className="w-5 h-5" /></div>
          <div>
            <h2 className="font-bold">Teacher Secret Code</h2>
            <p className="text-sm text-muted-foreground">Only users with this code can register as a teacher.</p>
          </div>
        </div>
        <div className="space-y-2">
          <Label>Secret Code</Label>
          <div className="flex gap-2">
            <div className="relative flex-1">
              <input
                type={showCode ? "text" : "password"}
                value={teacherCode}
                onChange={(e) => setTeacherCode(e.target.value)}
                placeholder="Set a secret code for teachers…"
                className="w-full border border-border rounded-lg px-3 py-2 text-sm bg-background pr-10 font-mono"
              />
              <button type="button" onClick={() => setShowCode(!showCode)}
                className="absolute right-3 top-1/2 -translate-y-1/2 text-muted-foreground hover:text-foreground">
                {showCode ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
              </button>
            </div>
            <Button onClick={handleSaveTeacherCode} disabled={savingCode}>
              {savingCode ? <Loader2 className="w-4 h-4 animate-spin" /> : "Save"}
            </Button>
          </div>
          <p className="text-xs text-muted-foreground">Leave empty to disable teacher code validation.</p>
        </div>
      </div>
    </div>
  );
}