import React, { useEffect, useState } from "react";
import { base44 } from "@/api/base44Client";
import { useAuth } from "@/lib/AuthContext";
import { useProfile } from "@/lib/ProfileContext";
import { Button } from "@/components/ui/button";
import { Plus, Megaphone } from "lucide-react";
import AnnouncementCard from "@/components/announcements/AnnouncementCard";
import AnnouncementForm from "@/components/announcements/AnnouncementForm";

export default function Announcements() {
  const { user } = useAuth();
  const { profile } = useProfile();
  const [announcements, setAnnouncements] = useState([]);
  const [enrolledIds, setEnrolledIds] = useState(new Set());
  const [loading, setLoading] = useState(true);
  const [showForm, setShowForm] = useState(false);
  const [editing, setEditing] = useState(null);

  const isAdmin = user?.role === "admin";
  const isTeacher = profile?.account_type === "teacher";
  const canCreate = isAdmin || isTeacher;

  const load = async () => {
    try {
      const data = await base44.entities.Announcement.list("-created_date", 200);
      setAnnouncements(data || []);
    } catch (e) { /* ignore */ }
    setLoading(false);
  };

  useEffect(() => {
    load();
    if (!isTeacher && user) {
      base44.entities.ClassroomEnrollment.filter({ student_id: user.id }).then((data) => {
        setEnrolledIds(new Set((data || []).map((e) => e.classroom_id)));
      }).catch(() => {});
    }
  }, [user, isTeacher]);

  const onSaved = () => {
    setShowForm(false);
    setEditing(null);
    load();
  };

  const onEdit = (ann) => {
    setEditing(ann);
    setShowForm(true);
  };

  const visible = (a) => a.visibility === "open" || a.created_by_id === user?.id;
  const adminSection = announcements.filter((a) => a.type === "admin" && visible(a));
  const teacherSection = announcements.filter((a) => {
    if (a.type !== "teacher" || !visible(a)) return false;
    if (!isTeacher && !isAdmin && !enrolledIds.has(a.classroom_id)) return false;
    return true;
  });

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between flex-wrap gap-3">
        <div>
          <h1 className="text-2xl font-bold tracking-tight flex items-center gap-2">
            <Megaphone className="w-6 h-6 text-primary" /> Announcements
          </h1>
          <p className="text-muted-foreground text-sm mt-1">Stay updated with the latest news.</p>
        </div>
        {canCreate && !showForm && (
          <Button onClick={() => { setEditing(null); setShowForm(true); }}>
            <Plus className="w-4 h-4" /> New Announcement
          </Button>
        )}
      </div>

      {showForm && (
        <AnnouncementForm
          existing={editing}
          onSaved={onSaved}
          onCancel={() => { setShowForm(false); setEditing(null); }}
        />
      )}

      {/* Admin section */}
      <div>
        <h2 className="font-semibold text-lg mb-3">Admin</h2>
        {loading ? (
          <div className="text-muted-foreground text-sm">Loading...</div>
        ) : adminSection.length === 0 ? (
          <div className="text-muted-foreground text-sm py-4 text-center bg-card border border-dashed border-border rounded-xl">No admin announcements.</div>
        ) : (
          <div className="space-y-3">
            {adminSection.map((a) => (
              <AnnouncementCard
                key={a.id}
                announcement={a}
                canEdit={a.created_by_id === user?.id || isAdmin}
                onEdit={onEdit}
                onUpdated={load}
              />
            ))}
          </div>
        )}
      </div>

      {/* Teachers section */}
      <div>
        <h2 className="font-semibold text-lg mb-3">Teachers</h2>
        {loading ? (
          <div className="text-muted-foreground text-sm">Loading...</div>
        ) : teacherSection.length === 0 ? (
          <div className="text-muted-foreground text-sm py-4 text-center bg-card border border-dashed border-border rounded-xl">No teacher announcements.</div>
        ) : (
          <div className="space-y-3">
            {teacherSection.map((a) => (
              <AnnouncementCard
                key={a.id}
                announcement={a}
                canEdit={a.created_by_id === user?.id || isAdmin}
                onEdit={onEdit}
                onUpdated={load}
              />
            ))}
          </div>
        )}
      </div>
    </div>
  );
}