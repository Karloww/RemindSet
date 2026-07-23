import React, { useEffect, useState } from "react";
import { Link } from "react-router-dom";
import { useAuth } from "@/lib/AuthContext";
import { useProfile } from "@/lib/ProfileContext";
import { base44 } from "@/api/base44Client";
import { ShoppingBag, Pencil, Coins, CheckCircle2, BookMarked } from "lucide-react";
import { COVER_PHOTOS } from "@/lib/themes";
import ProfileAvatar from "@/components/ProfileAvatar";
import RoleBadge from "@/components/RoleBadge";

export default function Profile() {
  const { user } = useAuth();
  const { profile } = useProfile();
  const [stats, setStats] = useState({ total: 0, completed: 0 });

  const isTeacher = profile?.account_type === "teacher";

  useEffect(() => {
    if (!user || !profile) return;
    let active = true;
    (async () => {
      try {
        if (isTeacher) {
          const data = await base44.entities.Classroom.filter({ created_by_id: user.id }, "-created_date", 200);
          if (active) setStats({ total: data?.length || 0, completed: 0 });
        } else {
          const data = await base44.entities.LessonAssignment.filter({ student_id: user.id }, "-created_date", 200);
          const list = data || [];
          if (active) setStats({ total: list.length, completed: list.filter((a) => a.status === "completed").length });
        }
      } catch (e) { /* ignore */ }
    })();
    return () => { active = false; };
  }, [user, profile, isTeacher]);

  if (!profile) return null;

  const coverPreset = COVER_PHOTOS[profile.selected_cover_photo] || COVER_PHOTOS.default;
  const cover = profile.cover_photo_url
    ? { type: "image", value: profile.cover_photo_url }
    : coverPreset;

  return (
    <div className="space-y-5">
      <div className="bg-card border border-border rounded-2xl overflow-hidden">
        {/* Cover */}
        <div className="h-36 sm:h-44" style={cover.type === "gradient" ? { background: cover.value } : { backgroundImage: `url('${cover.value}')`, backgroundSize: "cover", backgroundPosition: "center" }} />

        {/* Avatar + identity */}
        <div className="px-5 pb-5 -mt-12">
          <div className="flex items-end justify-between">
            <div className="rounded-full ring-4 ring-card">
              <ProfileAvatar profile={profile} user={user} size="xl" />
            </div>
            <Link to="/edit-profile" className="inline-flex items-center gap-1.5 text-sm font-medium border border-border rounded-lg px-3 py-2 hover:bg-accent">
              <Pencil className="w-3.5 h-3.5" /> Edit Profile
            </Link>
          </div>
          <div className="mt-3">
            <div className="flex items-center gap-2 flex-wrap">
              <h1 className="text-xl font-bold">{profile.first_name} {profile.last_name}</h1>
              <RoleBadge accountType={profile.account_type} />
            </div>
            <p className="text-sm text-muted-foreground">@{profile.username}</p>
            {profile.bio && <p className="text-sm text-muted-foreground mt-2">{profile.bio}</p>}
          </div>
        </div>
      </div>

      {/* Points */}
      {!isTeacher && (
        <div className="rounded-2xl bg-gradient-to-br from-primary to-primary/70 text-primary-foreground p-5 flex items-center justify-between">
          <div>
            <p className="text-primary-foreground/80 text-sm font-medium">Total Points</p>
            <div className="flex items-center gap-2 mt-1">
              <Coins className="w-6 h-6" />
              <span className="text-3xl font-bold">{profile.points || 0}</span>
            </div>
          </div>
          <Link to="/shop" className="bg-white/20 hover:bg-white/30 rounded-xl p-3 transition-colors"><ShoppingBag className="w-6 h-6" /></Link>
        </div>
      )}

      {/* Stats */}
      <div className="grid grid-cols-2 gap-4">
        <div className="bg-card border border-border rounded-2xl p-5">
          <div className="rounded-xl bg-primary/10 text-primary p-2 w-fit mb-3"><BookMarked className="w-5 h-5" /></div>
          <p className="text-3xl font-bold">{stats.total}</p>
          <p className="text-sm text-muted-foreground">{isTeacher ? "Classrooms" : "Lessons Assigned"}</p>
        </div>
        <div className="bg-card border border-border rounded-2xl p-5">
          <div className="rounded-xl bg-emerald-100 text-emerald-600 p-2 w-fit mb-3"><CheckCircle2 className="w-5 h-5" /></div>
          <p className="text-3xl font-bold">{isTeacher ? "—" : stats.completed}</p>
          <p className="text-sm text-muted-foreground">{isTeacher ? "Teacher" : "Completed"}</p>
        </div>
      </div>


    </div>
  );
}

function QuickLink({ to, icon: Icon, label }) {
  return (
    <Link to={to} className="flex flex-col items-center gap-2 bg-card border border-border rounded-2xl p-4 hover:border-primary/40 transition-colors">
      <div className="rounded-xl bg-primary/10 text-primary p-2.5"><Icon className="w-5 h-5" /></div>
      <span className="text-sm font-medium">{label}</span>
    </Link>
  );
}