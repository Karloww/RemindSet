import React, { useState, useEffect, useRef } from "react";
import { base44 } from "@/api/base44Client";
import { useAuth } from "@/lib/AuthContext";
import { useProfile } from "@/lib/ProfileContext";
import { Upload, Download, Trash2, FileText, FileVideo, FileImage, File, Eye, X } from "lucide-react";
import FilePreview from "@/components/FilePreview";
import { toast } from "@/components/ui/use-toast";

export default function Resources() {
  const { user } = useAuth();
  const { profile } = useProfile();
  const [tab, setTab] = useState("uploaded");
  const [uploadedFiles, setUploadedFiles] = useState([]);
  const [lockerItems, setLockerItems] = useState([]);
  const [loading, setLoading] = useState(true);
  const [uploading, setUploading] = useState(false);
  const [previewFile, setPreviewFile] = useState(null);
  const fileInputRef = useRef(null);
  const isTeacher = profile?.account_type === "teacher";

  useEffect(() => {
    if (!user) return;
    let active = true;
    (async () => {
      try {
        if (isTeacher) {
          const [lessons, acts] = await Promise.all([
            base44.entities.LessonPlan.filter({ created_by_id: user.id }, "-created_date", 200),
            base44.entities.Activity.filter({ created_by_id: user.id }, "-created_date", 200),
          ]);
          const files = [
            ...(lessons || []).filter((l) => l.file_url).map((l) => ({
              name: l.file_name || l.title,
              url: l.file_url,
              type: l.file_type,
              source: "Lesson",
            })),
            ...(acts || []).filter((a) => a.file_url).map((a) => ({
              name: a.title,
              url: a.file_url,
              type: "activity",
              source: "Activity",
            })),
          ];
          if (active) setUploadedFiles(files);
        } else {
          const resps = await base44.entities.ActivityResponse.filter({ student_id: user.id }, "-created_date", 200);
          const files = (resps || [])
            .filter((r) => r.file_url)
            .map((r) => ({ name: "Activity submission", url: r.file_url, type: "submission", source: "Submission" }));
          if (active) setUploadedFiles(files);
        }
        const locker = await base44.entities.LockerItem.filter({}, "-created_date", 200);
        if (active) setLockerItems(locker || []);
      } catch (e) { /* ignore */ }
      finally { if (active) setLoading(false); }
    })();
    return () => { active = false; };
  }, [user, isTeacher]);

  const handleUpload = async (e) => {
    const file = e.target.files?.[0];
    if (!file) return;
    setUploading(true);
    try {
      const { file_url } = await base44.integrations.Core.UploadFile({ file });
      await base44.entities.LockerItem.create({
        name: file.name,
        file_url,
        file_type: file.type || "file",
        file_size: file.size,
      });
      const locker = await base44.entities.LockerItem.filter({}, "-created_date", 200);
      setLockerItems(locker || []);
      toast({ title: "File uploaded to locker" });
    } catch (err) {
      toast({ title: "Upload failed", variant: "destructive" });
    }
    setUploading(false);
    if (fileInputRef.current) fileInputRef.current.value = "";
  };

  const handleDelete = async (id) => {
    try {
      await base44.entities.LockerItem.delete(id);
      setLockerItems(lockerItems.filter((i) => i.id !== id));
      toast({ title: "File removed" });
    } catch (e) {
      toast({ title: "Failed to delete", variant: "destructive" });
    }
  };

  const getFileIcon = (type) => {
    if (type?.includes("video")) return FileVideo;
    if (type?.includes("image")) return FileImage;
    return FileText;
  };

  return (
    <div>
      <h1 className="text-xl font-bold mb-4">Resources</h1>

      {/* Tabs */}
      <div className="flex gap-2 mb-4">
        <button
          onClick={() => setTab("uploaded")}
          className={`px-4 py-2 rounded-lg text-sm font-medium transition-colors ${
            tab === "uploaded" ? "bg-primary text-primary-foreground" : "bg-muted text-muted-foreground hover:bg-accent"
          }`}
        >
          Uploaded files
        </button>
        <button
          onClick={() => setTab("locker")}
          className={`px-4 py-2 rounded-lg text-sm font-medium transition-colors ${
            tab === "locker" ? "bg-primary text-primary-foreground" : "bg-muted text-muted-foreground hover:bg-accent"
          }`}
        >
          Locker {lockerItems.length > 0 && <span className="ml-1 text-xs">({lockerItems.length})</span>}
        </button>
      </div>

      {tab === "uploaded" ? (
        <div className="bg-card border border-border rounded-2xl overflow-hidden">
          {loading ? (
            <div className="p-8 text-center text-muted-foreground">Loading...</div>
          ) : uploadedFiles.length === 0 ? (
            <div className="p-8 text-center text-muted-foreground text-sm">No uploaded files yet.</div>
          ) : (
            <div className="divide-y divide-border">
              {uploadedFiles.map((f, i) => {
                const Icon = getFileIcon(f.type);
                return (
                  <div key={i} className="flex items-center gap-3 p-3 hover:bg-accent/30">
                    <Icon className="w-5 h-5 text-muted-foreground shrink-0" />
                    <div className="min-w-0 flex-1">
                      <p className="text-sm font-medium truncate">{f.name}</p>
                      <p className="text-xs text-muted-foreground">{f.source}</p>
                    </div>
                    <button onClick={() => setPreviewFile({ name: f.name, url: f.url })} className="p-2 rounded-lg hover:bg-accent" title="Preview">
                      <Eye className="w-4 h-4" />
                    </button>
                    <a href={f.url} target="_blank" rel="noreferrer" className="p-2 rounded-lg hover:bg-accent" title="Download">
                      <Download className="w-4 h-4" />
                    </a>
                  </div>
                );
              })}
            </div>
          )}
        </div>
      ) : (
        <div>
          <div className="flex items-center justify-between mb-3">
            <p className="text-sm text-muted-foreground">Use your locker to store personal resources.</p>
            <button
              onClick={() => fileInputRef.current?.click()}
              disabled={uploading}
              className="inline-flex items-center gap-2 bg-primary text-primary-foreground px-4 py-2 rounded-lg text-sm font-medium hover:bg-primary/90 disabled:opacity-50"
            >
              <Upload className="w-4 h-4" /> {uploading ? "Uploading..." : "Add"}
            </button>
            <input ref={fileInputRef} type="file" onChange={handleUpload} className="hidden" />
          </div>
          <div className="bg-card border border-border rounded-2xl overflow-hidden">
            {lockerItems.length === 0 ? (
              <div className="p-8 text-center text-muted-foreground text-sm">
                Your locker is empty. Upload files to get started.
              </div>
            ) : (
              <div className="divide-y divide-border">
                {lockerItems.map((item) => {
                  const Icon = getFileIcon(item.file_type);
                  return (
                    <div key={item.id} className="flex items-center gap-3 p-3 hover:bg-accent/30">
                      <Icon className="w-5 h-5 text-muted-foreground shrink-0" />
                      <div className="min-w-0 flex-1">
                        <p className="text-sm font-medium truncate">{item.name}</p>
                        <p className="text-xs text-muted-foreground">
                          {item.file_size ? `${(item.file_size / 1024).toFixed(0)} KB` : ""}
                        </p>
                      </div>
                      <button onClick={() => setPreviewFile({ name: item.name, url: item.file_url })} className="p-2 rounded-lg hover:bg-accent" title="Preview">
                        <Eye className="w-4 h-4" />
                      </button>
                      <a href={item.file_url} target="_blank" rel="noreferrer" className="p-2 rounded-lg hover:bg-accent" title="Download">
                        <Download className="w-4 h-4" />
                      </a>
                      <button
                        onClick={() => handleDelete(item.id)}
                        className="p-2 rounded-lg hover:bg-accent text-destructive"
                      >
                        <Trash2 className="w-4 h-4" />
                      </button>
                    </div>
                  );
                })}
              </div>
            )}
          </div>
        </div>
      )}

      {previewFile && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/50" onClick={() => setPreviewFile(null)}>
          <div className="bg-card border border-border rounded-2xl p-6 w-full max-w-2xl max-h-[80vh] overflow-y-auto" onClick={(e) => e.stopPropagation()}>
            <div className="flex items-center justify-between mb-4">
              <p className="font-semibold truncate">{previewFile.name}</p>
              <button onClick={() => setPreviewFile(null)} className="p-1 rounded-lg hover:bg-accent"><X className="w-5 h-5" /></button>
            </div>
            <FilePreview fileUrl={previewFile.url} fileName={previewFile.name} />
            <div className="mt-4">
              <a href={previewFile.url} target="_blank" rel="noreferrer" className="inline-flex items-center gap-2 text-sm text-primary hover:underline">
                <Download className="w-4 h-4" /> Download
              </a>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}