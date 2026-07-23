import React, { useState } from "react";
import { base44 } from "@/api/base44Client";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Bell, Loader2, Send, CheckCircle2, Image, Link, X } from "lucide-react";
import { toast } from "@/components/ui/use-toast";

export default function AdminNotifications() {
  const [title, setTitle] = useState("");
  const [message, setMessage] = useState("");
  const [audience, setAudience] = useState("all");
  const [sending, setSending] = useState(false);
  const [sent, setSent] = useState(false);
  const [imageFile, setImageFile] = useState(null);
  const [notifLink, setNotifLink] = useState("");

  const handleSend = async (e) => {
    e.preventDefault();
    if (!title || !message) {
      toast({ title: "Title and message are required", variant: "destructive" });
      return;
    }
    setSending(true);
    try {
      // Gather recipients
      let recipientIds = [];
      if (audience === "all") {
        const users = await base44.entities.User.list();
        recipientIds = (users || []).map((u) => u.id);
      } else {
        const profiles = await base44.entities.Profile.filter({ account_type: audience });
        recipientIds = (profiles || []).map((p) => p.created_by_id);
      }

      if (recipientIds.length === 0) {
        toast({ title: "No recipients found for this audience." });
        setSending(false);
        return;
      }

      let imageUrl = "";
      if (imageFile) {
        const res = await base44.integrations.Core.UploadFile({ file: imageFile });
        imageUrl = res.file_url;
      }

      // Create notifications in batches of 100
      const batchSize = 100;
      for (let i = 0; i < recipientIds.length; i += batchSize) {
        const batch = recipientIds.slice(i, i + batchSize);
        await base44.entities.Notification.bulkCreate(
          batch.map((uid) => ({
            user_id: uid,
            title,
            message: `${message}${imageUrl ? `\n[image:${imageUrl}]` : ""}${notifLink ? `\n[link:${notifLink}]` : ""}`,
            read: false,
          }))
        );
      }

      setSent(true);
      toast({ title: "Notifications sent!", description: `Delivered to ${recipientIds.length} recipient${recipientIds.length !== 1 ? "s" : ""}.` });
      setTitle(""); setMessage(""); setImageFile(null); setNotifLink("");
      setTimeout(() => setSent(false), 3000);
    } catch (err) {
      toast({ title: "Send failed", description: err.message, variant: "destructive" });
    } finally {
      setSending(false);
    }
  };

  return (
    <div className="space-y-5">
      <div>
        <h1 className="text-2xl font-bold tracking-tight">Send Notifications</h1>
        <p className="text-muted-foreground text-sm mt-1">Broadcast a message to all or specific user groups.</p>
      </div>

      {sent && (
        <div className="bg-emerald-50 border border-emerald-200 rounded-2xl p-4 flex items-center gap-3">
          <CheckCircle2 className="w-5 h-5 text-emerald-600 shrink-0" />
          <p className="text-sm text-emerald-700">Notifications delivered successfully!</p>
        </div>
      )}

      <form onSubmit={handleSend} className="bg-card border border-border rounded-2xl p-6 space-y-5">
        <div className="space-y-2">
          <Label htmlFor="title">Title *</Label>
          <Input id="title" value={title} onChange={(e) => setTitle(e.target.value)} placeholder="e.g. System Maintenance Notice" required />
        </div>
        <div className="space-y-2">
          <Label htmlFor="message">Message *</Label>
          <Textarea id="message" value={message} onChange={(e) => setMessage(e.target.value)} rows={5}
            placeholder="Write the notification content…" required />
        </div>
        <div className="space-y-2">
          <Label>Audience</Label>
          <div className="grid grid-cols-3 gap-2">
            {[
              { value: "all", label: "All Users" },
              { value: "student", label: "Students" },
              { value: "teacher", label: "Teachers" },
            ].map((opt) => (
              <button key={opt.value} type="button" onClick={() => setAudience(opt.value)}
                className={`p-3 rounded-xl border-2 text-sm font-medium transition-all ${audience === opt.value ? "border-primary bg-primary/5" : "border-border"}`}>
                {opt.label}
              </button>
            ))}
          </div>
        </div>
        {/* Image upload */}
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
        {/* Link */}
        <div className="space-y-2">
          <label className="text-sm font-medium">Attach Link (optional)</label>
          <div className="relative">
            <Link className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
            <input type="url" value={notifLink} onChange={(e) => setNotifLink(e.target.value)} placeholder="https://…" className="w-full pl-9 border border-border rounded-lg px-3 py-2 text-sm bg-background" />
          </div>
        </div>
        <Button type="submit" className="w-full h-12" disabled={sending}>
          {sending ? <><Loader2 className="w-4 h-4 mr-2 animate-spin" />Sending…</> : <><Send className="w-4 h-4 mr-2" /> Send Notification</>}
        </Button>
      </form>
    </div>
  );
}