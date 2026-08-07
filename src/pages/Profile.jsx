import React, { useEffect, useState } from "react";
import { Link } from "react-router-dom";
import { useAuth } from "@/lib/AuthContext";
import { useProfile } from "@/lib/ProfileContext";
import { base44 } from "@/api/base44Client";
import { Pencil, School, Facebook, Instagram, Music2, Twitter, Youtube, Users } from "lucide-react";
import { COVER_PHOTOS } from "@/lib/themes";
import ProfileAvatar from "@/components/ProfileAvatar";
import RoleBadge from "@/components/RoleBadge";

const SOCIAL_ICONS = { facebook: Facebook, instagram: Instagram, tiktok: Music2, twitter: Twitter, youtube: Youtube };

export default function Profile() {
  const { user } = useAuth();
  const { profile } = useProfile();
  const [classrooms, setClassrooms] = useState([]);
  const [enrollments, setEnrollments] = useState([]);
  const [friends, setFriends] = useState([]);
  const [allProfiles, setAllProfiles] = useState([]);
  const [loading, setLoading] = useState(true);

  const isTeacher = profile?.account_type === "teacher";

  useEffect(() => {
    if (!user || !profile) return;
    let active = true;
    (async () => {
      try {
        const [friendships, profiles] = await Promise.all([
          base44.entities.Friendship.filter({}, "-created_date", 200),
          base44.entities.Profile.list("-created_date", 200),
        ]);
        if (!active) return;
        setAllProfiles(profiles || []);
        const myFriends = (friendships || []).filter(
          (f) => f.status === "accepted" && (f.requester_id === user.id || f.recipient_id === user.id)
        );
        setFriends(myFriends);

        if (isTeacher) {
          const cls = await base44.entities.Classroom.filter({ created_by_id: user.id }, "-created_date", 100);
          if (active) setClassrooms(cls || []);
        } else {
          const enr = await base44.entities.ClassroomEnrollment.filter({ student_id: user.id }, "-created_date", 100);
          if (active) setEnrollments(enr || []);
        }
      } catch (e) { /* ignore */ }
      finally { if (active) setLoading(false); }
    })();
    return () => { active = false; };
  }, [user, profile, isTeacher]);

  if (!profile) return null;

  const selectedCover = profile.selected_cover_photo || "default";
  const coverPreset = COVER_PHOTOS[selectedCover] || COVER_PHOTOS.default;
  const cover = profile.cover_photo_url
    ? { type: "image", value: profile.cover_photo_url }
    : (selectedCover.startsWith("http") || selectedCover.startsWith("/"))
    ? { type: "image", value: selectedCover }
    : coverPreset;

  let socialMedia = {};
  try { socialMedia = profile.social_media ? JSON.parse(profile.social_media) : {}; } catch (e) { /* ignore */ }

  const friendProfiles = friends.map((f) => {
    const isRequester = f.requester_id === user.id;
    const otherId = isRequester ? f.recipient_id : f.requester_id;
    return allProfiles.find((p) => p.created_by_id === otherId) || {
      id: otherId,
      created_by_id: otherId,
      first_name: (isRequester ? f.recipient_name : f.requester_name)?.split(" ")[0] || "",
      last_name: (isRequester ? f.recipient_name : f.requester_name)?.split(" ").slice(1).join(" ") || "",
    };
  });

  const subjects = isTeacher ? classrooms : enrollments;

  return (
    <div className="space-y-5">
      <div className="bg-card border border-border rounded-2xl overflow-hidden">
        <div className="h-36 sm:h-44" style={cover.type === "gradient" ? { background: cover.value } : { backgroundImage: `url('${cover.value}')`, backgroundSize: "cover", backgroundPosition: "center" }} />
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
            {/* Social Media - below bio */}
            {Object.keys(socialMedia).length > 0 && (
              <div className="mt-3">
                <div className="flex gap-2 flex-wrap">
                  {Object.entries(socialMedia).filter(([_, url]) => url).map(([platform, url]) => {
                    const Icon = SOCIAL_ICONS[platform] || Twitter;
                    return (
                      <a key={platform} href={url} target="_blank" rel="noreferrer" className="p-2 bg-muted rounded-lg hover:bg-accent transition-colors">
                        <Icon className="w-4 h-4" />
                      </a>
                    );
                  })}
                </div>
              </div>
            )}
          </div>
        </div>
      </div>

      {/* Current Subjects */}
      <div>
        <h2 className="font-semibold mb-3">Current Subjects</h2>
        {loading ? (
          <div className="space-y-2">{[0, 1].map((i) => <div key={i} className="h-14 rounded-xl bg-muted animate-pulse" />)}</div>
        ) : subjects.length === 0 ? (
          <p className="text-sm text-muted-foreground">{isTeacher ? "No classes created yet." : "No classes enrolled yet."}</p>
        ) : (
          <div className="space-y-2">
            {subjects.map((s) => (
              <Link key={s.id} to={isTeacher ? `/classrooms/${s.id}` : `/classrooms/${s.classroom_id}`} className="flex items-center gap-3 bg-card border border-border rounded-xl p-3 hover:border-primary/30 transition-colors">
                <div className="rounded-lg bg-primary/10 text-primary p-2"><School className="w-4 h-4" /></div>
                <div className="min-w-0 flex-1">
                  <p className="font-medium text-sm truncate">{s.subject_title}</p>
                  <p className="text-xs text-muted-foreground truncate">{s.year_and_section}</p>
                </div>
              </Link>
            ))}
          </div>
        )}
      </div>

      {/* Friends */}
      <div>
        <div className="flex items-center justify-between mb-3">
          <h2 className="font-semibold flex items-center gap-2"><Users className="w-4 h-4" /> Friends</h2>
          <Link to="/users" className="text-sm text-primary hover:underline">View all</Link>
        </div>
        {friendProfiles.length === 0 ? (
          <p className="text-sm text-muted-foreground">No friends yet.</p>
        ) : (
          <div className="grid grid-cols-3 sm:grid-cols-4 gap-3">
            {friendProfiles.slice(0, 8).map((p) => (
              <Link key={p.id} to={`/users/${p.id}`} className="flex flex-col items-center gap-1 p-3 bg-card border border-border rounded-xl hover:border-primary/30 transition-colors">
                <ProfileAvatar profile={p} size="sm" />
                <p className="text-xs font-medium truncate w-full text-center">{p.first_name}</p>
              </Link>
            ))}
          </div>
        )}
      </div>

    </div>
  );
}