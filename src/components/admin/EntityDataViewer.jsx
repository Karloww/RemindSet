import React, { useState, useEffect } from "react";
import { base44 } from "@/api/base44Client";
import { X, Pencil, Trash2, Loader2, ArrowLeft, Search, Download, Database, Table2 } from "lucide-react";
import { toast } from "@/components/ui/use-toast";

const LONG_FIELDS = ["questions", "settings", "participant_ids", "participant_names", "answers", "social_media", "assigned_student_ids", "bio", "description", "message", "maintenance_message", "admin_ids", "deleted_for_ids", "likes"];

const TABS = ["Browse", "Structure", "Search", "Export"];

export default function EntityDataViewer({ entityName, filter, onClose }) {
  const [records, setRecords] = useState([]);
  const [schema, setSchema] = useState(null);
  const [loading, setLoading] = useState(true);
  const [editingRecord, setEditingRecord] = useState(null);
  const [editData, setEditData] = useState({});
  const [saving, setSaving] = useState(false);
  const [searchQuery, setSearchQuery] = useState("");
  const [activeTab, setActiveTab] = useState("Browse");
  const [page, setPage] = useState(0);
  const pageSize = 25;

  useEffect(() => {
    if (!entityName) return;
    let active = true;
    (async () => {
      setLoading(true);
      try {
        let data = null;
        try {
          data = await base44.entities[entityName].list("-created_date", 1000);
        } catch (e) {
          data = await base44.entities[entityName].filter({}, "-created_date", 1000);
        }
        if (!active) return;
        setRecords(filter ? (data || []).filter(filter) : (data || []));
      } catch (e) {
        toast({ title: "Failed to load", description: e.message, variant: "destructive" });
      } finally {
        if (active) setLoading(false);
      }
      try {
        if (typeof base44.entities[entityName].schema === "function") {
          const sch = await base44.entities[entityName].schema();
          if (active) setSchema(sch || null);
        }
      } catch (e) { /* ignore */ }
    })();
    return () => { active = false; };
  }, [entityName, filter]);

  const allFields = schema?.properties ? Object.keys(schema.properties) : (records[0] ? Object.keys(records[0]).filter((k) => !["id", "created_date", "updated_date", "created_by_id"].includes(k)) : []);
  const filteredRecords = searchQuery ? records.filter((r) => JSON.stringify(r).toLowerCase().includes(searchQuery.toLowerCase())) : records;
  const totalPages = Math.ceil(filteredRecords.length / pageSize);
  const pageRecords = filteredRecords.slice(page * pageSize, (page + 1) * pageSize);

  const startEdit = (record) => {
    setEditingRecord(record);
    setEditData({ ...record });
  };

  const saveEdit = async () => {
    if (!editingRecord) return;
    setSaving(true);
    try {
      const { id, created_date, updated_date, created_by_id, ...updateData } = editData;
      await base44.entities[entityName].update(editingRecord.id, updateData);
      setRecords((prev) => prev.map((r) => (r.id === editingRecord.id ? { ...r, ...updateData } : r)));
      setEditingRecord(null);
      toast({ title: "Record updated" });
    } catch (e) {
      toast({ title: "Update failed", description: e.message, variant: "destructive" });
    } finally {
      setSaving(false);
    }
  };

  const deleteRecord = async (record) => {
    if (!window.confirm("Delete this record? This cannot be undone.")) return;
    try {
      await base44.entities[entityName].delete(record.id);
      setRecords((prev) => prev.filter((r) => r.id !== record.id));
      toast({ title: "Record deleted" });
    } catch (e) {
      toast({ title: "Delete failed", description: e.message, variant: "destructive" });
    }
  };

  const exportEntity = () => {
    const blob = new Blob([JSON.stringify(records, null, 2)], { type: "application/json" });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = `${entityName}_export.json`;
    a.click();
    URL.revokeObjectURL(url);
    toast({ title: "Exported", description: `${records.length} records downloaded` });
  };

  const displayValue = (val) => {
    if (val === null || val === undefined || val === "") return "<i>NULL</i>";
    if (typeof val === "boolean") return val ? "true" : "false";
    if (typeof val === "object") return JSON.stringify(val).slice(0, 60) + "…";
    const s = String(val);
    return s.length > 60 ? s.slice(0, 60) + "…" : s;
  };

  return (
    <div className="space-y-3">
      {/* phpMyAdmin-style breadcrumb header */}
      <div className="bg-slate-100 dark:bg-slate-800 border border-slate-300 dark:border-slate-700 rounded-t-lg">
        <div className="flex items-center gap-2 px-3 py-2 text-sm text-slate-700 dark:text-slate-200">
          <button onClick={onClose} className="p-1 rounded hover:bg-slate-200 dark:hover:bg-slate-700">
            <ArrowLeft className="w-4 h-4" />
          </button>
          <Database className="w-4 h-4 text-slate-500" />
          <span className="text-slate-500">Server: RemindSet</span>
          <span className="text-slate-400">»</span>
          <span className="text-slate-500">Database: RemindSet</span>
          <span className="text-slate-400">»</span>
          <span className="font-semibold text-slate-800 dark:text-slate-100 flex items-center gap-1">
            <Table2 className="w-4 h-4" /> {entityName}
          </span>
        </div>
      </div>

      {/* phpMyAdmin-style tabs */}
      <div className="flex items-center gap-0 border-b border-slate-300 dark:border-slate-700">
        {TABS.map((t) => (
          <button
            key={t}
            onClick={() => setActiveTab(t)}
            className={`px-4 py-2 text-sm font-medium border border-b-0 transition-colors ${
              activeTab === t
                ? "bg-white dark:bg-slate-900 border-slate-300 dark:border-slate-700 text-slate-800 dark:text-slate-100 -mb-px"
                : "bg-slate-100 dark:bg-slate-800 border-transparent text-slate-600 dark:text-slate-400 hover:bg-slate-200 dark:hover:bg-slate-700"
            }`}
          >
            {t}
          </button>
        ))}
        <span className="ml-auto px-3 text-xs text-slate-500">{filteredRecords.length} records</span>
      </div>

      {/* Tab content */}
      <div className="bg-white dark:bg-slate-900 border border-slate-300 dark:border-slate-700 rounded-b-lg">
        {activeTab === "Browse" && (
          loading ? (
            <div className="flex justify-center py-12"><Loader2 className="w-6 h-6 animate-spin text-muted-foreground" /></div>
          ) : pageRecords.length === 0 ? (
            <div className="p-6 text-center text-sm text-slate-500">
              <p>MySQL returned an empty result set (i.e. zero rows).</p>
            </div>
          ) : (
            <>
              {/* Data table */}
              <div className="overflow-x-auto">
                <table className="w-full text-sm border-collapse">
                  <thead>
                    <tr className="bg-slate-200 dark:bg-slate-800 text-slate-700 dark:text-slate-200">
                      <th className="px-2 py-2 text-left font-semibold border border-slate-300 dark:border-slate-700 w-20">Actions</th>
                      {allFields.map((f) => (
                        <th key={f} className="px-3 py-2 text-left font-semibold border border-slate-300 dark:border-slate-700 whitespace-nowrap">{f}</th>
                      ))}
                    </tr>
                  </thead>
                  <tbody>
                    {pageRecords.map((record, i) => (
                      <tr key={record.id} className={i % 2 === 0 ? "bg-white dark:bg-slate-900" : "bg-slate-50 dark:bg-slate-800/50"}>
                        <td className="px-2 py-1.5 border border-slate-200 dark:border-slate-700">
                          <div className="flex gap-1">
                            <button onClick={() => startEdit(record)} className="p-1 rounded hover:bg-slate-200 dark:hover:bg-slate-700" title="Edit">
                              <Pencil className="w-3.5 h-3.5 text-slate-600 dark:text-slate-300" />
                            </button>
                            <button onClick={() => deleteRecord(record)} className="p-1 rounded hover:bg-red-100 dark:hover:bg-red-900/30" title="Delete">
                              <Trash2 className="w-3.5 h-3.5 text-red-600" />
                            </button>
                          </div>
                        </td>
                        {allFields.map((f) => (
                          <td key={f} className="px-3 py-1.5 border border-slate-200 dark:border-slate-700 text-slate-700 dark:text-slate-300 max-w-xs truncate" title={String(record[f] ?? "")}>
                            <span dangerouslySetInnerHTML={{ __html: displayValue(record[f]) }} />
                          </td>
                        ))}
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
              {/* Pagination */}
              {totalPages > 1 && (
                <div className="flex items-center justify-between px-3 py-2 border-t border-slate-200 dark:border-slate-700 text-sm text-slate-600 dark:text-slate-400">
                  <span>Page {page + 1} of {totalPages}</span>
                  <div className="flex gap-1">
                    <button onClick={() => setPage(Math.max(0, page - 1))} disabled={page === 0} className="px-2 py-1 rounded border border-slate-300 dark:border-slate-700 disabled:opacity-50 hover:bg-slate-100 dark:hover:bg-slate-800">‹ Prev</button>
                    <button onClick={() => setPage(Math.min(totalPages - 1, page + 1))} disabled={page >= totalPages - 1} className="px-2 py-1 rounded border border-slate-300 dark:border-slate-700 disabled:opacity-50 hover:bg-slate-100 dark:hover:bg-slate-800">Next ›</button>
                  </div>
                </div>
              )}
            </>
          )
        )}

        {activeTab === "Structure" && (
          <div className="overflow-x-auto">
            <table className="w-full text-sm border-collapse">
              <thead>
                <tr className="bg-slate-200 dark:bg-slate-800 text-slate-700 dark:text-slate-200">
                  <th className="px-3 py-2 text-left font-semibold border border-slate-300 dark:border-slate-700">Column</th>
                  <th className="px-3 py-2 text-left font-semibold border border-slate-300 dark:border-slate-700">Type</th>
                  <th className="px-3 py-2 text-left font-semibold border border-slate-300 dark:border-slate-700">Required</th>
                  <th className="px-3 py-2 text-left font-semibold border border-slate-300 dark:border-slate-700">Default</th>
                </tr>
              </thead>
              <tbody>
                {allFields.map((f, i) => {
                  const fs = schema?.properties?.[f] || {};
                  return (
                    <tr key={f} className={i % 2 === 0 ? "bg-white dark:bg-slate-900" : "bg-slate-50 dark:bg-slate-800/50"}>
                      <td className="px-3 py-1.5 border border-slate-200 dark:border-slate-700 font-medium text-slate-800 dark:text-slate-100">{f}</td>
                      <td className="px-3 py-1.5 border border-slate-200 dark:border-slate-700 text-slate-600 dark:text-slate-400">{fs.type || "string"}{fs.enum ? ` (${fs.enum.join(", ")})` : ""}</td>
                      <td className="px-3 py-1.5 border border-slate-200 dark:border-slate-700">{(schema?.required || []).includes(f) ? <span className="text-red-600 font-medium">YES</span> : "—"}</td>
                      <td className="px-3 py-1.5 border border-slate-200 dark:border-slate-700 text-slate-600 dark:text-slate-400">{fs.default !== undefined ? String(fs.default) : "—"}</td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        )}

        {activeTab === "Search" && (
          <div className="p-4 space-y-3">
            <div className="relative">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400" />
              <input
                value={searchQuery}
                onChange={(e) => { setSearchQuery(e.target.value); setPage(0); }}
                placeholder="Search records…"
                className="w-full h-9 pl-9 pr-3 rounded-lg border border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-900 text-sm"
              />
            </div>
            {searchQuery && (
              <p className="text-sm text-slate-500">{filteredRecords.length} matching records</p>
            )}
            <div className="flex flex-wrap gap-2">
              {filteredRecords.slice(0, 20).map((r) => (
                <button key={r.id} onClick={() => startEdit(r)} className="px-3 py-1.5 rounded-lg border border-slate-300 dark:border-slate-700 text-sm hover:bg-slate-100 dark:hover:bg-slate-800">
                  {allFields[0] ? String(r[allFields[0]] || r.id).slice(0, 30) : r.id}
                </button>
              ))}
            </div>
          </div>
        )}

        {activeTab === "Export" && (
          <div className="p-6 text-center space-y-3">
            <Download className="w-10 h-10 text-slate-400 mx-auto" />
            <p className="text-sm text-slate-600 dark:text-slate-400">Export {filteredRecords.length} records from <strong>{entityName}</strong> as JSON.</p>
            <button onClick={exportEntity} className="px-4 py-2 rounded-lg bg-slate-700 dark:bg-slate-200 text-white dark:text-slate-900 text-sm font-medium hover:bg-slate-800 dark:hover:bg-slate-300">
              Download {entityName}.json
            </button>
          </div>
        )}
      </div>

      {/* Edit modal */}
      {editingRecord && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 p-4" onClick={() => setEditingRecord(null)}>
          <div className="bg-card border border-border rounded-2xl w-full max-w-2xl p-6 max-h-[80vh] overflow-y-auto" onClick={(e) => e.stopPropagation()}>
            <div className="flex items-center justify-between mb-4">
              <h3 className="font-semibold">Edit {entityName}</h3>
              <button onClick={() => setEditingRecord(null)} className="p-1 rounded-lg hover:bg-accent"><X className="w-4 h-4" /></button>
            </div>
            <div className="space-y-3">
              {allFields.map((field) => {
                const fieldSchema = schema?.properties?.[field];
                const isBoolean = fieldSchema?.type === "boolean";
                const isNumber = fieldSchema?.type === "number";
                const isLongText = LONG_FIELDS.includes(field) || (fieldSchema?.type === "string" && fieldSchema?.format === "date-time");
                const val = editData[field];
                return (
                  <div key={field} className="space-y-1">
                    <label className="text-sm font-medium">{field}</label>
                    {isBoolean ? (
                      <select
                        value={val === true ? "true" : val === false ? "false" : ""}
                        onChange={(e) => setEditData({ ...editData, [field]: e.target.value === "true" ? true : e.target.value === "false" ? false : null })}
                        className="w-full h-9 px-3 rounded-lg border border-border bg-background text-sm"
                      >
                        <option value="">—</option>
                        <option value="true">true</option>
                        <option value="false">false</option>
                      </select>
                    ) : isLongText ? (
                      <textarea
                        value={typeof val === "object" ? JSON.stringify(val) : val || ""}
                        onChange={(e) => setEditData({ ...editData, [field]: e.target.value })}
                        rows={3}
                        className="w-full px-3 py-2 rounded-lg border border-border bg-background text-sm font-mono"
                      />
                    ) : (
                      <input
                        type={isNumber ? "number" : "text"}
                        value={val || ""}
                        onChange={(e) => setEditData({ ...editData, [field]: isNumber ? (e.target.value === "" ? null : Number(e.target.value)) : e.target.value })}
                        className="w-full h-9 px-3 rounded-lg border border-border bg-background text-sm"
                      />
                    )}
                  </div>
                );
              })}
            </div>
            <div className="flex gap-2 mt-4">
              <button onClick={() => setEditingRecord(null)} className="flex-1 h-10 rounded-lg border border-border text-sm font-medium hover:bg-accent">Cancel</button>
              <button onClick={saveEdit} disabled={saving} className="flex-1 h-10 rounded-lg bg-primary text-primary-foreground text-sm font-medium hover:bg-primary/90 disabled:opacity-50">
                {saving ? <Loader2 className="w-4 h-4 animate-spin mx-auto" /> : "Save"}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}