import React, { useEffect, useState } from "react";
import { useNavigate } from "react-router-dom";
import { useAuth } from "@/lib/AuthContext";
import { base44 } from "@/api/base44Client";
import { Bell, Loader2, CheckCheck, ArrowRight } from "lucide-react";
import { Button } from "@/components/ui/button";
import { toast } from "@/components/ui/use-toast";

export default function Notifications() {
  const { user } = useAuth();
  const navigate = useNavigate();
  const [items, setItems] = useState([]);
  const [loading, setLoading] = useState(true);

  const load = async () => {
    if (!user) return;
    try {
      const data = await base44.entities.Notification.filter({ user_id: user.id }, "-created_date", 50);
      const now = new Date().toISOString();
      setItems((data || []).filter((n) => n.type !== "admin" && (!n.scheduled_date || n.scheduled_date <= now)));
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    load();
    const unsubscribe = base44.entities.Notification.subscribe(() => {
      load();
    });
    return () => { unsubscribe?.(); };
  }, [user]);

  const markAllRead = async () => {
    try {
      await base44.entities.Notification.updateMany({ user_id: user.id, read: false }, { $set: { read: true } });
      toast({ title: "All marked as read" });
      load();
    } catch (err) {
      toast({ title: "Failed", description: err.message, variant: "destructive" });
    }
  };

  const handleClick = async (n) => {
    // Mark as read
    if (!n.read) {
      try {
        await base44.entities.Notification.update(n.id, { read: true });
      } catch (e) { /* ignore */ }
      setItems((prev) => prev.map((x) => (x.id === n.id ? { ...x, read: true } : x)));
    }
    if (n.activity_id && n.classroom_id) {
      navigate(`/classrooms/${n.classroom_id}/activities/${n.activity_id}/take`);
    } else if (n.classroom_id) {
      navigate(`/classrooms/${n.classroom_id}`);
    } else if (n.assignment_id) {
      navigate(`/lessons/${n.assignment_id}`);
    }
  };

  const unread = items.filter((n) => !n.read).length;

  return (
    <div className="space-y-5 max-w-2xl mx-auto">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold tracking-tight">Notifications</h1>
          <p className="text-muted-foreground text-sm mt-1">{unread > 0 ? `${unread} unread` : "You're all caught up."}</p>
        </div>
        {unread > 0 && (
          <Button variant="outline" onClick={markAllRead} className="gap-1.5"><CheckCheck className="w-4 h-4" /> Mark all read</Button>
        )}
      </div>

      {loading ? (
        <div className="flex justify-center py-16"><Loader2 className="w-6 h-6 animate-spin text-muted-foreground" /></div>
      ) : items.length === 0 ? (
        <div className="text-center py-16 bg-card border border-dashed border-border rounded-2xl">
          <Bell className="w-10 h-10 text-muted-foreground mx-auto mb-3" />
          <p className="text-muted-foreground">No notifications yet.</p>
        </div>
      ) : (
        <div className="space-y-2">
          {items.map((n) => {
            const clickable = !!(n.assignment_id || n.classroom_id);
            return (
              <div key={n.id}
                onClick={() => clickable && handleClick(n)}
                className={`bg-card border rounded-xl p-4 flex gap-3 ${n.read ? "border-border" : "border-primary/40 bg-primary/5"} ${clickable ? "cursor-pointer hover:border-primary/60 transition-colors" : ""}`}>
                <div className={`rounded-lg p-2 shrink-0 ${n.read ? "bg-muted text-muted-foreground" : "bg-primary/15 text-primary"}`}>
                  <Bell className="w-4 h-4" />
                </div>
                <div className="min-w-0 flex-1">
                  <p className="font-medium text-sm">{n.title}</p>
                  <p className="text-sm text-muted-foreground mt-0.5 whitespace-pre-line">{(n.message || "").replace(/\[image:[^\]]+\]/g, "").replace(/\[link:[^\]]+\]/g, "").trim()}</p>
                  {n.message?.includes("[image:") && (() => {
                    const match = n.message.match(/\[image:([^\]]+)\]/);
                    return match ? <img src={match[1]} alt="Announcement" className="rounded-xl mt-2 max-h-40 w-full object-cover" /> : null;
                  })()}
                  {n.message?.includes("[link:") && (() => {
                    const match = n.message.match(/\[link:([^\]]+)\]/);
                    return match ? <a href={match[1]} target="_blank" rel="noopener noreferrer" className="inline-flex items-center gap-1 text-primary text-xs mt-1 hover:underline">🔗 {match[1]}</a> : null;
                  })()}
                  <p className="text-xs text-muted-foreground mt-1">{new Date(n.created_date).toLocaleString()}</p>
                </div>
                {clickable && <ArrowRight className="w-4 h-4 text-muted-foreground shrink-0 self-center" />}
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
}