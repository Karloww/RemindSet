import React, { useState, useEffect } from "react";
import { base44 } from "@/api/base44Client";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Loader2, Globe, Database, BarChart3, Shield, Settings, Activity, Users, BookOpen, ClipboardList, Bell, ShoppingBag, UserCheck, MessageSquare, ChevronRight, Search, Download, Upload } from "lucide-react";
import { toast } from "@/components/ui/use-toast";
import EntityDataViewer from "@/components/admin/EntityDataViewer";

const SECTIONS = ["Data", "Analytics", "Settings"];

const ENTITY_LIST = [
  { name: "Activity", icon: ClipboardList },
  { name: "ActivityComment", icon: MessageSquare },
  { name: "ActivityResponse", icon: ClipboardList },
  { name: "AppSettings", icon: Settings },
  { name: "Classroom", icon: BookOpen },
  { name: "ClassroomEnrollment", icon: Users },
  { name: "LessonAssignment", icon: ClipboardList },
  { name: "LessonPlan", icon: BookOpen },
  { name: "Notification", icon: Bell },
  { name: "Profile", icon: UserCheck },
  { name: "ShopItem", icon: ShoppingBag },
  { name: "UserPurchase", icon: ShoppingBag },
];

export default function ManageWebsite() {
  const [section, setSection] = useState("Data");
  const [entityCounts, setEntityCounts] = useState({});
  const [loadingData, setLoadingData] = useState(false);
  const [analytics, setAnalytics] = useState(null);
  const [loadingAnalytics, setLoadingAnalytics] = useState(false);
  const [appInfo, setAppInfo] = useState({ name: "RemindSet", description: "A comprehensive school management platform." });
  const [savingSettings, setSavingSettings] = useState(false);
  const [viewingEntity, setViewingEntity] = useState(null);
  const [viewFilter, setViewFilter] = useState(null);
  const [dataSearch, setDataSearch] = useState("");
  const [exporting, setExporting] = useState(false);
  const [importing, setImporting] = useState(false);

  const exportAllData = async () => {
    setExporting(true);
    try {
      const results = await Promise.allSettled(
        ENTITY_LIST.map((e) => base44.entities[e.name].list("-created_date", 5000))
      );
      const dump = {};
      ENTITY_LIST.forEach((e, i) => {
        dump[e.name] = results[i].status === "fulfilled" ? (results[i].value || []) : [];
      });
      const blob = new Blob([JSON.stringify({ app: "RemindSet", exported_at: new Date().toISOString(), data: dump }, null, 2)], { type: "application/json" });
      const url = URL.createObjectURL(blob);
      const a = document.createElement("a");
      a.href = url;
      a.download = `remindset_backup_${new Date().toISOString().slice(0, 10)}.json`;
      a.click();
      URL.revokeObjectURL(url);
      toast({ title: "Export complete", description: "Backup file downloaded." });
    } catch (e) {
      toast({ title: "Export failed", description: e.message, variant: "destructive" });
    } finally { setExporting(false); }
  };

  const importData = async (e) => {
    const file = e.target.files?.[0];
    if (!file) return;
    if (!window.confirm("Importing will ADD records to your database. Continue?")) { e.target.value = ""; return; }
    setImporting(true);
    try {
      const text = await file.text();
      const parsed = JSON.parse(text);
      const dump = parsed.data || parsed;
      let totalImported = 0;
      for (const [entityName, records] of Object.entries(dump)) {
        if (!ENTITY_LIST.find((e) => e.name === entityName)) continue;
        if (!Array.isArray(records) || records.length === 0) continue;
        const clean = records.map(({ id, created_date, updated_date, created_by_id, ...rest }) => rest);
        try {
          const created = await base44.entities[entityName].bulkCreate(clean);
          totalImported += (created || []).length;
        } catch (err) { /* skip entity on error */ }
      }
      toast({ title: "Import complete", description: `${totalImported} records imported.` });
      loadEntityCounts();
    } catch (err) {
      toast({ title: "Import failed", description: "Invalid backup file.", variant: "destructive" });
    } finally { setImporting(false); e.target.value = ""; }
  };

  useEffect(() => {
    if (section === "Data") loadEntityCounts();
    if (section === "Analytics") loadAnalytics();
  }, [section]);

  const loadEntityCounts = async () => {
    setLoadingData(true);
    try {
      const results = await Promise.allSettled(
        ENTITY_LIST.map((e) => base44.entities[e.name].list("-created_date", 1000))
      );
      const counts = {};
      ENTITY_LIST.forEach((e, i) => {
        counts[e.name] = results[i].status === "fulfilled" ? (results[i].value || []).length : "—";
      });
      setEntityCounts(counts);
    } finally {
      setLoadingData(false);
    }
  };

  const loadAnalytics = async () => {
    setLoadingAnalytics(true);
    try {
      const [users, profiles, activities, responses, classrooms] = await Promise.all([
        base44.entities.User.list(),
        base44.entities.Profile.list(),
        base44.entities.Activity.list(),
        base44.entities.ActivityResponse.list("-created_date", 1000),
        base44.entities.Classroom.list(),
      ]);
      const students = (profiles || []).filter((p) => p.account_type === "student").length;
      const teachers = (profiles || []).filter((p) => p.account_type === "teacher").length;
      const completed = (responses || []).filter((r) => r.graded).length;
      setAnalytics({
        totalUsers: (users || []).length,
        students,
        teachers,
        totalActivities: (activities || []).length,
        totalResponses: (responses || []).length,
        completedResponses: completed,
        totalClassrooms: (classrooms || []).length,
        completionRate: (responses || []).length > 0 ? Math.round((completed / (responses || []).length) * 100) : 0,
      });
    } catch (e) {
      toast({ title: "Failed to load analytics", description: e.message, variant: "destructive" });
    } finally {
      setLoadingAnalytics(false);
    }
  };

  return (
    <div className="space-y-5">
      {viewingEntity ? (
        <EntityDataViewer entityName={viewingEntity} filter={viewFilter} onClose={() => { setViewingEntity(null); setViewFilter(null); }} />
      ) : (
      <>
      <div>
        <h1 className="text-2xl font-bold tracking-tight flex items-center gap-2"><Globe className="w-6 h-6 text-primary" /> Manage Website</h1>
        <p className="text-muted-foreground text-sm mt-1">View and manage data, analytics, and app settings.</p>
      </div>

      {/* Section tabs */}
      <div className="flex gap-1 bg-muted rounded-xl p-1">
        {SECTIONS.map((s) => (
          <button key={s} onClick={() => setSection(s)}
            className={`flex-1 py-2 text-sm font-medium rounded-lg transition-colors ${section === s ? "bg-card shadow-sm text-foreground" : "text-muted-foreground hover:text-foreground"}`}>
            {s}
          </button>
        ))}
      </div>

      {/* Data Section */}
      {section === "Data" && (
        <div className="space-y-3">
          <div className="flex items-center justify-between gap-2">
            <div className="relative flex-1 max-w-xs">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
              <input
                value={dataSearch}
                onChange={(e) => setDataSearch(e.target.value)}
                placeholder="Search data…"
                className="w-full h-9 pl-9 pr-3 rounded-lg border border-border bg-background text-sm"
              />
            </div>
            <div className="flex gap-2">
              <Button variant="outline" size="sm" onClick={exportAllData} disabled={exporting}>
                {exporting ? <Loader2 className="w-4 h-4 animate-spin mr-1" /> : <Download className="w-4 h-4 mr-1" />} Export
              </Button>
              <label className="inline-flex items-center gap-1 cursor-pointer text-sm font-medium border border-input bg-transparent rounded-md px-3 py-2 hover:bg-accent">
                {importing ? <Loader2 className="w-4 h-4 animate-spin mr-1" /> : <Upload className="w-4 h-4 mr-1" />} Import
                <input type="file" accept=".json" className="hidden" onChange={importData} disabled={importing} />
              </label>
              <Button variant="outline" size="sm" onClick={loadEntityCounts} disabled={loadingData}>
                {loadingData ? <Loader2 className="w-4 h-4 animate-spin" /> : "Refresh"}
              </Button>
            </div>
          </div>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
            {ENTITY_LIST.filter((e) => e.name.toLowerCase().includes(dataSearch.toLowerCase())).map((entity) => {
              const Icon = entity.icon;
              const count = entityCounts[entity.name];
              return (
                <div key={entity.name} className="bg-card border border-border rounded-xl p-4 flex items-center gap-3">
                  <div className="w-9 h-9 rounded-lg bg-primary/10 flex items-center justify-center shrink-0">
                    <Icon className="w-4 h-4 text-primary" />
                  </div>
                  <div className="flex-1 min-w-0">
                    <p className="font-medium text-sm">{entity.name}</p>
                    <p className="text-xs text-muted-foreground">{count !== undefined ? `${count} records` : "Loading…"}</p>
                  </div>
                  <button
                    onClick={() => { setViewingEntity(entity.name); setViewFilter(null); }}
                    className="text-xs text-primary hover:bg-primary/10 px-2 py-1 rounded-lg transition-colors shrink-0">
                    View
                  </button>
                </div>
              );
            })}
          </div>
        </div>
      )}

      {/* Analytics Section */}
      {section === "Analytics" && (
        <div className="space-y-4">
          {loadingAnalytics ? (
            <div className="flex justify-center py-12"><Loader2 className="w-6 h-6 animate-spin text-muted-foreground" /></div>
          ) : analytics ? (
            <>
              <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
                {[
                  { label: "Total Users", value: analytics.totalUsers, color: "text-blue-600 bg-blue-50", entity: "User", filter: null },
                  { label: "Students", value: analytics.students, color: "text-primary bg-primary/10", entity: "Profile", filter: (r) => r.account_type === "student" },
                  { label: "Teachers", value: analytics.teachers, color: "text-amber-600 bg-amber-50", entity: "Profile", filter: (r) => r.account_type === "teacher" },
                  { label: "Classrooms", value: analytics.totalClassrooms, color: "text-purple-600 bg-purple-50", entity: "Classroom", filter: null },
                  { label: "Activities", value: analytics.totalActivities, color: "text-indigo-600 bg-indigo-50", entity: "Activity", filter: null },
                  { label: "Responses", value: analytics.totalResponses, color: "text-cyan-600 bg-cyan-50", entity: "ActivityResponse", filter: null },
                  { label: "Graded", value: analytics.completedResponses, color: "text-emerald-600 bg-emerald-50", entity: "ActivityResponse", filter: (r) => r.graded },
                  { label: "Completion Rate", value: `${analytics.completionRate}%`, color: "text-rose-600 bg-rose-50", entity: "ActivityResponse", filter: null },
                ].map((stat) => (
                  <button key={stat.label} onClick={() => { setViewingEntity(stat.entity); setViewFilter(stat.filter); }} className="bg-card border border-border rounded-2xl p-4 text-left hover:border-primary/40 transition-colors">
                    <div className={`inline-flex items-center justify-center w-8 h-8 rounded-lg mb-2 ${stat.color}`}>
                      <BarChart3 className="w-4 h-4" />
                    </div>
                    <p className="text-2xl font-bold">{stat.value}</p>
                    <p className="text-xs text-muted-foreground">{stat.label}</p>
                  </button>
                ))}
              </div>
              <div className="bg-card border border-border rounded-2xl p-5">
                <p className="text-sm font-medium mb-3">Activity Completion Overview</p>
                <div className="space-y-3">
                  <div>
                    <div className="flex justify-between text-xs text-muted-foreground mb-1">
                      <span>Graded responses</span>
                      <span>{analytics.completedResponses} / {analytics.totalResponses}</span>
                    </div>
                    <div className="h-2 bg-muted rounded-full overflow-hidden">
                      <div className="h-full bg-emerald-500 rounded-full transition-all"
                        style={{ width: analytics.totalResponses > 0 ? `${(analytics.completedResponses / analytics.totalResponses) * 100}%` : "0%" }} />
                    </div>
                  </div>
                  <div>
                    <div className="flex justify-between text-xs text-muted-foreground mb-1">
                      <span>Students vs Teachers</span>
                      <span>{analytics.students} students, {analytics.teachers} teachers</span>
                    </div>
                    <div className="h-2 bg-muted rounded-full overflow-hidden">
                      <div className="h-full bg-primary rounded-full transition-all"
                        style={{ width: analytics.totalUsers > 0 ? `${(analytics.students / analytics.totalUsers) * 100}%` : "0%" }} />
                    </div>
                  </div>
                </div>
              </div>
            </>
          ) : (
            <Button onClick={loadAnalytics}>Load Analytics</Button>
          )}
        </div>
      )}

      {/* Settings Section */}
      {section === "Settings" && (
        <div className="space-y-4">
          <div className="bg-card border border-border rounded-2xl p-5 space-y-4">
            <h3 className="font-semibold">App Info</h3>
            <div className="space-y-2">
              <Label>App Name</Label>
              <Input value={appInfo.name} onChange={(e) => setAppInfo({ ...appInfo, name: e.target.value })} placeholder="RemindSet" />
            </div>
            <div className="space-y-2">
              <Label>Description</Label>
              <textarea value={appInfo.description} onChange={(e) => setAppInfo({ ...appInfo, description: e.target.value })}
                rows={3} className="w-full border border-border rounded-lg px-3 py-2 text-sm bg-background resize-none"
                placeholder="Describe your app…" />
            </div>
            <p className="text-xs text-muted-foreground">To edit the app logo, description, visibility, and deployment settings, go to the Base44 dashboard → App Settings.</p>
          </div>

          <div className="bg-card border border-border rounded-2xl p-5 space-y-4">
            <h3 className="font-semibold">App Visibility</h3>
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm font-medium">Visibility</p>
                <p className="text-xs text-muted-foreground">Control who can access your application.</p>
              </div>
              <span className="inline-flex items-center gap-1.5 text-sm font-medium text-emerald-600 bg-emerald-50 px-3 py-1.5 rounded-full">
                <Globe className="w-3.5 h-3.5" /> Public
              </span>
            </div>
            <p className="text-xs text-muted-foreground">To change visibility or unpublish the app, use the Base44 dashboard → App Settings → General Settings.</p>
          </div>

          <div className="bg-card border border-border rounded-2xl p-5 space-y-3 border-red-200">
            <h3 className="font-semibold text-destructive">Danger Zone</h3>
            <p className="text-sm text-muted-foreground">Irreversible actions. Use the Base44 dashboard for these operations:</p>
            <ul className="text-sm text-muted-foreground list-disc list-inside space-y-1">
              <li>Unpublish / Delete the app</li>
              <li>Change domain settings</li>
              <li>Configure authentication methods</li>
              <li>View security & logs</li>
            </ul>
            <a href="https://base44.com/dashboard" target="_blank" rel="noopener noreferrer"
              className="inline-flex items-center gap-1.5 text-sm text-primary font-medium hover:underline">
              Go to Base44 Dashboard <ChevronRight className="w-4 h-4" />
            </a>
          </div>
        </div>
      )}
      </>
      )}
    </div>
  );
}