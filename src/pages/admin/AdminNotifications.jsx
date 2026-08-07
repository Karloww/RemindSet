import React, { useState, useEffect } from "react";
import { base44 } from "@/api/base44Client";
import { useAuth } from "@/lib/AuthContext";
import { useProfile } from "@/lib/ProfileContext";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Megaphone, Loader2, Send, CheckCircle2, Image, Link as LinkIcon, X, Sparkles } from "lucide-react";
import { toast } from "@/components/ui/use-toast";
import AnnouncementCard from "@/components/announcements/AnnouncementCard";

export default function AdminNotifications() {
  const { user } = useAuth();
  const { profile } = useProfile();
  const [tab, setTab] = useState("send");
  const [title, setTitle] = useState("");
  const [message, setMessage] = useState("");
  const [sending, setSending] = useState(false);
  const [sent, setSent] = useState(false);
  const [imageFile, setImageFile] = useState(null);
  const [notifLink, setNotifLink] = useState("");

  const [posted, setPosted] = useState([]);
  const [loadingPosted, setLoadingPosted] = useState(false);
  const [sendingQuote, setSendingQuote] = useState(false);

  const sendDailyQuote = async () => {
    setSendingQuote(true);
    try {
      const res = await base44.functions.invoke("dailyQuote", {});
      toast({ title: "Daily quote sent!", description: res?.data?.quote || "Quote sent to all users." });
    } catch (err) {
      toast({ title: "Failed to send quote", description: err.message, variant: "destructive" });
    } finally { setSendingQuote(false); }
  };

  const loadPosted = async () => {
    setLoadingPosted(true);
    try {
      const data = await base44.entities.Announcement.filter({ type: "admin" }, "-created_date", 200);
      setPosted(data || []);
    } catch (e) {
      toast({ title: "Failed to load", description: e.message, variant: "destructive" });
    } finally {
      setLoadingPosted(false);
    }
  };

  useEffect(() => {
    if (tab === "posted") loadPosted();
  }, [tab]);

  const handleSend = async (e) => {
    e.preventDefault();
    if (!title || !message) {
      toast({ title: "Title and message are required", variant: "destructive" });
      return;
    }
    setSending(true);
    try {
      let fileUrl = "";
      if (imageFile) {
        const res = await base44.integrations.Core.UploadFile({ file: imageFile });
        fileUrl = res.file_url;
      }

      const fullMessage = `${message}${notifLink ? `\n[link:${notifLink}]` : ""}`;
      const authorName = profile ? `${profile.first_name} ${profile.last_name}` : "Admin";

      await base44.entities.Announcement.create({
        title: title.trim(),
        message: fullMessage,
        type: "admin",
        author_name: authorName,
        visibility: "open",
        file_url: fileUrl,
        likes: "[]",
      });

      setSent(true);
      toast({ title: "Announcement posted!", description: "Visible in the Announcement section for all users." });
      setTitle(""); setMessage(""); setImageFile(null); setNotifLink("");
      setTimeout(() => setSent(false), 3000);
    } catch (err) {
      toast({ title: "Send failed", description: err.message, variant: "destructive" });
    } finally {
      setSending(false);
    }
  };

  const handleDelete = async (ann) => {
    if (!window.confirm("Delete this announcement?")) return;
    try {
      await base44.entities.Announcement.delete(ann.id);
      toast({ title: "Announcement deleted" });
      loadPosted();
    } catch (err) {
      toast({ title: "Delete failed", description: err.message, variant: "destructive" });
    }
  };

  return (
    <div className="space-y-5">
      <div>
        <h1 className="text-2xl font-bold tracking-tight">Announcement</h1>
        <p className="text-muted-foreground text-sm mt-1">Post announcements visible to all users in the Announcement section.</p>
      </div>

      <div className="flex items-center justify-between gap-2 flex-wrap">
        <div className="flex gap-1 bg-muted rounded-xl p-1 w-fit">
          {[{ id: "send", label: "Post New" }, { id: "posted", label: "Posted" }].map((t) => (
            <button key={t.id} onClick={() => setTab(t.id)}
              className={`px-4 py-2 rounded-lg text-sm font-medium transition-colors ${tab === t.id ? "bg-card shadow-sm text-foreground" : "text-muted-foreground hover:text-foreground"}`}>
              {t.label}
            </button>
          ))}
        </div>
        <Button variant="outline" onClick={sendDailyQuote} disabled={sendingQuote} className="gap-1.5">
          {sendingQuote ? <Loader2 className="w-4 h-4 animate-spin" /> : <Sparkles className="w-4 h-4" />}
          Send Daily Quote Now
        </Button>
      </div>

      {tab === "send" && (
        <>
          {sent && (
            <div className="bg-emerald-50 border border-emerald-200 rounded-2xl p-4 flex items-center gap-3">
              <CheckCircle2 className="w-5 h-5 text-emerald-600 shrink-0" />
              <p className="text-sm text-emerald-700">Announcement posted successfully!</p>
            </div>
          )}
          <form onSubmit={handleSend} className="bg-card border border-border rounded-2xl p-6 space-y-5">
            <div className="space-y-2">
              <Label htmlFor="title">Title *</Label>
              <Input id="title" value={title} onChange={(e) => setTitle(e.target.value)} placeholder="e.g. Class Cancellation Notice" required />
            </div>
            <div className="space-y-2">
              <Label htmlFor="message">Message *</Label>
              <Textarea id="message" value={message} onChange={(e) => setMessage(e.target.value)} rows={5} placeholder="Write the announcement content…" required />
            </div>
            <div className="space-y-2">
              <label className="text-sm font-medium">Attach Image (optional)</label>
              {imageFile ? (
                <div className="flex items-center gap-3 border border-border rounded-xl p-3">
                  <img src={URL.createObjectURL(imageFile)} alt="preview" className="w-12 h-12 rounded-lg object-cover" />
                  <p className="text-sm truncate flex-1">{imageFile.name}</p>
                  <button type="button" onClick={() => setImageFile(null)} className="p-1 rounded-lg hover:bg-accent"><X className="w-4 h-4" /></button>
                </div>
              ) : (
                <label className="flex items-center gap-2 border border-dashed border-border rounded-xl p-4 cursor-pointer hover:border-primary/40 transition-colors">
                  <Image className="w-5 h-5 text-muted-foreground" />
                  <span className="text-sm text-muted-foreground">Click to upload image</span>
                  <input type="file" accept="image/*" className="hidden" onChange={(e) => setImageFile(e.target.files?.[0] || null)} />
                </label>
              )}
            </div>
            <div className="space-y-2">
              <label className="text-sm font-medium">Attach Link (optional)</label>
              <div className="relative">
                <LinkIcon className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
                <input type="url" value={notifLink} onChange={(e) => setNotifLink(e.target.value)} placeholder="https://…"
                  className="w-full pl-9 border border-border rounded-lg px-3 py-2 text-sm bg-background" />
              </div>
            </div>
            <Button type="submit" className="w-full h-12" disabled={sending}>
              {sending ? <><Loader2 className="w-4 h-4 mr-2 animate-spin" />Posting…</> : <><Send className="w-4 h-4 mr-2" /> Post Announcement</>}
            </Button>
          </form>
        </>
      )}

      {tab === "posted" && (
        <div className="space-y-3">
          {loadingPosted ? (
            <div className="flex justify-center py-12"><Loader2 className="w-6 h-6 animate-spin text-muted-foreground" /></div>
          ) : posted.length === 0 ? (
            <div className="text-center py-12 bg-card border border-dashed border-border rounded-2xl">
              <Megaphone className="w-8 h-8 text-muted-foreground mx-auto mb-2" />
              <p className="text-muted-foreground text-sm">No announcements posted yet.</p>
            </div>
          ) : (
            posted.map((a) => (
              <AnnouncementCard
                key={a.id}
                announcement={a}
                canEdit={true}
                onUpdated={loadPosted}
              />
            ))
          )}
        </div>
      )}
    </div>
  );
}