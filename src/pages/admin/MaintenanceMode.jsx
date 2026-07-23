import React, { useState, useEffect } from "react";
import { base44 } from "@/api/base44Client";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import { Label } from "@/components/ui/label";
import { Shield, ShieldOff, Loader2, AlertTriangle } from "lucide-react";
import { toast } from "@/components/ui/use-toast";

export default function MaintenanceMode() {
  const [settings, setSettings] = useState(null);
  const [settingsId, setSettingsId] = useState(null);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [message, setMessage] = useState("");

  const load = async () => {
    try {
      const list = await base44.entities.AppSettings.list();
      if (list?.length > 0) {
        setSettings(list[0]);
        setSettingsId(list[0].id);
        setMessage(list[0].maintenance_message || "");
      } else {
        setSettings({ maintenance_mode: false, maintenance_message: "" });
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
          <Button onClick={handleToggle} disabled={saving} className={isOn ? "bg-emerald-600 hover:bg-emerald-700" : "bg-amber-500 hover:bg-amber-600"}>
            {saving ? <Loader2 className="w-4 h-4 mr-2 animate-spin" /> : isOn ? <ShieldOff className="w-4 h-4 mr-2" /> : <Shield className="w-4 h-4 mr-2" />}
            {isOn ? "Disable Maintenance" : "Enable Maintenance"}
          </Button>
          {settingsId && <Button variant="outline" onClick={handleSaveMessage} disabled={saving}>Save Message</Button>}
        </div>
      </div>
    </div>
  );
}