import React, { useState, useEffect } from "react";
import { base44 } from "@/api/base44Client";
import { Button } from "@/components/ui/button";
import { Flag, Loader2, Trash2, CheckCircle2, Eye, X } from "lucide-react";
import { toast } from "@/components/ui/use-toast";

const STATUS_STYLES = {
  pending: "bg-amber-50 text-amber-600",
  reviewed: "bg-blue-50 text-blue-600",
  resolved: "bg-emerald-50 text-emerald-600",
};

export default function ManageReports() {
  const [reports, setReports] = useState([]);
  const [loading, setLoading] = useState(true);
  const [filter, setFilter] = useState("pending");
  const [selected, setSelected] = useState(null);

  const load = async () => {
    try {
      const list = await base44.entities.Report.list("-created_date", 500);
      setReports(list || []);
    } catch (e) {
      toast({ title: "Failed to load reports", variant: "destructive" });
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => { load(); }, []);

  const updateStatus = async (id, status) => {
    try {
      await base44.entities.Report.update(id, { status });
      setReports((prev) => prev.map((r) => (r.id === id ? { ...r, status } : r)));
      if (selected?.id === id) setSelected({ ...selected, status });
      toast({ title: `Marked as ${status}` });
    } catch (e) {
      toast({ title: "Failed to update", variant: "destructive" });
    }
  };

  const deleteReport = async (id) => {
    if (!window.confirm("Delete this report?")) return;
    try {
      await base44.entities.Report.delete(id);
      setReports((prev) => prev.filter((r) => r.id !== id));
      if (selected?.id === id) setSelected(null);
      toast({ title: "Report deleted" });
    } catch (e) {
      toast({ title: "Failed to delete", variant: "destructive" });
    }
  };

  const filtered = reports.filter((r) => filter === "all" || r.status === filter);
  const counts = {
    all: reports.length,
    pending: reports.filter((r) => r.status === "pending").length,
    reviewed: reports.filter((r) => r.status === "reviewed").length,
    resolved: reports.filter((r) => r.status === "resolved").length,
  };

  return (
    <div className="space-y-5">
      <div>
        <h1 className="text-2xl font-bold tracking-tight flex items-center gap-2"><Flag className="w-6 h-6 text-destructive" /> Reports</h1>
        <p className="text-muted-foreground text-sm mt-1">{counts.pending} pending review</p>
      </div>

      <div className="flex items-center gap-1.5 flex-wrap">
        {["pending", "reviewed", "resolved", "all"].map((f) => (
          <button
            key={f}
            onClick={() => setFilter(f)}
            className={`px-3 py-1.5 rounded-full text-xs font-medium border transition-colors capitalize ${
              filter === f ? "bg-primary text-primary-foreground border-primary" : "bg-card text-muted-foreground border-border hover:bg-accent"
            }`}
          >
            {f} ({counts[f]})
          </button>
        ))}
      </div>

      {loading ? (
        <div className="flex justify-center py-12"><Loader2 className="w-6 h-6 animate-spin text-muted-foreground" /></div>
      ) : filtered.length === 0 ? (
        <div className="text-center py-12 bg-card border border-dashed border-border rounded-2xl">
          <Flag className="w-8 h-8 text-muted-foreground mx-auto mb-2" />
          <p className="text-muted-foreground text-sm">No {filter !== "all" ? filter : ""} reports.</p>
        </div>
      ) : (
        <div className="bg-card border border-border rounded-2xl divide-y divide-border overflow-hidden">
          {filtered.map((r) => (
            <div key={r.id} className="p-4 hover:bg-accent/30 transition-colors">
              <div className="flex items-start justify-between gap-3">
                <div className="min-w-0 flex-1">
                  <div className="flex items-center gap-2 flex-wrap mb-1">
                    <span className={`text-xs font-medium px-2 py-0.5 rounded-full ${STATUS_STYLES[r.status] || ""}`}>{r.status}</span>
                    <span className="text-xs text-muted-foreground capitalize">{r.target_type?.replace("_", " ")}</span>
                    <span className="text-xs text-muted-foreground">• {new Date(r.created_date).toLocaleString()}</span>
                  </div>
                  <p className="text-sm">
                    <span className="font-medium">{r.reporter_name || "Unknown"}</span>
                    <span className="text-muted-foreground"> reported </span>
                    <span className="font-medium">{r.reported_user_name || "Unknown"}</span>
                  </p>
                  <p className="text-sm text-muted-foreground mt-1">{r.reason}</p>
                </div>
                <div className="flex items-center gap-1 shrink-0">
                  <button onClick={() => setSelected(r)} className="p-1.5 rounded-lg hover:bg-accent" title="View details"><Eye className="w-4 h-4" /></button>
                  {r.status === "pending" && (
                    <button onClick={() => updateStatus(r.id, "reviewed")} className="p-1.5 rounded-lg hover:bg-accent text-blue-600" title="Mark reviewed"><CheckCircle2 className="w-4 h-4" /></button>
                  )}
                  <button onClick={() => deleteReport(r.id)} className="p-1.5 rounded-lg hover:bg-destructive/10 text-destructive" title="Delete"><Trash2 className="w-4 h-4" /></button>
                </div>
              </div>
            </div>
          ))}
        </div>
      )}

      {selected && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 p-4" onClick={() => setSelected(null)}>
          <div className="bg-card border border-border rounded-2xl w-full max-w-lg p-5 max-h-[85vh] overflow-y-auto text-foreground" onClick={(e) => e.stopPropagation()}>
            <div className="flex items-center justify-between mb-3">
              <h3 className="font-semibold">Report Details</h3>
              <button onClick={() => setSelected(null)} className="p-1 rounded-lg hover:bg-accent"><X className="w-4 h-4" /></button>
            </div>
            <div className="space-y-3 text-sm">
              <div>
                <p className="text-muted-foreground text-xs">Status</p>
                <span className={`text-xs font-medium px-2 py-0.5 rounded-full ${STATUS_STYLES[selected.status]}`}>{selected.status}</span>
              </div>
              <div>
                <p className="text-muted-foreground text-xs">Reported by</p>
                <p>{selected.reporter_name} ({selected.reporter_id})</p>
              </div>
              <div>
                <p className="text-muted-foreground text-xs">Reported user</p>
                <p>{selected.reported_user_name} ({selected.reported_user_id || "—"})</p>
              </div>
              <div>
                <p className="text-muted-foreground text-xs">Target</p>
                <p className="capitalize">{selected.target_type?.replace("_", " ")} — ID: {selected.target_id || "—"}</p>
              </div>
              <div>
                <p className="text-muted-foreground text-xs">Reason</p>
                <p className="whitespace-pre-wrap">{selected.reason}</p>
              </div>
              {selected.content_snapshot && (
                <div>
                  <p className="text-muted-foreground text-xs">Content snapshot</p>
                  <div className="p-2 rounded-lg bg-muted/50 border border-border text-xs whitespace-pre-wrap">{selected.content_snapshot}</div>
                </div>
              )}
            </div>
            <div className="flex gap-2 mt-4">
              {selected.status !== "resolved" && (
                <Button onClick={() => updateStatus(selected.id, "resolved")} className="flex-1">
                  <CheckCircle2 className="w-4 h-4 mr-2" /> Mark Resolved
                </Button>
              )}
              {selected.status === "pending" && (
                <Button variant="outline" onClick={() => updateStatus(selected.id, "reviewed")} className="flex-1">Mark Reviewed</Button>
              )}
              <Button variant="destructive" onClick={() => deleteReport(selected.id)} className="flex-1"><Trash2 className="w-4 h-4 mr-2" /> Delete</Button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}