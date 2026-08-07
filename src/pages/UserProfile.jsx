import React, { useState, useEffect } from "react";
import { useParams, useSearchParams, useNavigate } from "react-router-dom";
import { base44 } from "@/api/base44Client";
import { useAuth } from "@/lib/AuthContext";
import { useProfile } from "@/lib/ProfileContext";
import { ArrowLeft, School, Facebook, Instagram, Music2, Twitter, Youtube, UserPlus, Check, Clock, Users, MessageCircle } from "lucide-react";
import ProfileAvatar from "@/components/ProfileAvatar";
import { COVER_PHOTOS } from "@/lib/themes";
import { toast } from "@/components/ui/use-toast";

const SOCIAL_ICONS = { facebook: Facebook, instagram: Instagram, tiktok: Music2, twitter: Twitter, youtube: Youtube };

export default function UserProfile() {
  const { userId } = useParams();
  const [searchParams] = useSearchParams();
  const classroomId = searchParams.get("classroomId");
  const navigate = useNavigate();
  const { user } = useAuth();
  const { profile: myProfile } = useProfile();
  const [profile, setProfile] = useState(null);
  const [friendship, setFriendship] = useState(null);
  const [subjects, setSubjects] = useState([]);
  const [myEnrollments, setMyEnrollments] = useState([]);
  const [myClassrooms, setMyClassrooms] = useState([]);
  const [friends, setFriends] = useState([]);
  const [allProfiles, setAllProfiles] = useState([]);
  const [loading, setLoading] = useState(true);
  const [actionLoading, setActionLoading] = useState(false);

  const isTeacher = profile?.account_type === "teacher";
  const isOwnProfile = userId === user?.id;

  useEffect(() => {
    if (!userId) return;
    let active = true;
    (async () => {
      try {
        const [friendships, allProfilesData] = await Promise.all([
          base44.entities.Friendship.filter({}, "-created_date", 200),
          base44.entities.Profile.list("-created_date", 200),
        ]);
        if (!active) return;
        let p = null;
        try { p = await base44.entities.Profile.get(userId); } catch (e) { /* not found by profile ID */ }
        if (!p) {
          const profiles = await base44.entities.Profile.filter({ created_by_id: userId }, "-created_date", 1);
          p = profiles?.[0] || null;
        }
        if (!active) return;
        setProfile(p);
        setAllProfiles(allProfilesData || []);

        if (user) {
          const myFriendship = (friendships || []).find(
            (f) =>
              (f.requester_id === user.id && f.recipient_id === userId) ||
              (f.recipient_id === user.id && f.requester_id === userId)
          );
          setFriendship(myFriendship || null);

          const myFriends = (friendships || []).filter(
            (f) => f.status === "accepted" && (f.requester_id === userId || f.recipient_id === userId)
          );
          setFriends(myFriends);

          if (p?.account_type === "teacher") {
            const cls = await base44.entities.Classroom.filter({ created_by_id: userId }, "-created_date", 100);
            if (active) setSubjects(cls || []);
          } else {
            const enr = await base44.entities.ClassroomEnrollment.filter({ student_id: userId }, "-created_date", 100);
            if (active) setSubjects(enr || []);
          }

          if (myProfile?.account_type === "student") {
            const myEnr = await base44.entities.ClassroomEnrollment.filter({ student_id: user.id }, "-created_date", 100);
            if (active) setMyEnrollments(myEnr || []);
          } else if (myProfile?.account_type === "teacher") {
            const myCls = await base44.entities.Classroom.filter({ created_by_id: user.id }, "-created_date", 100);
            if (active) setMyClassrooms(myCls || []);
          }
        }
      } catch (e) { /* ignore */ }
      finally { if (active) setLoading(false); }
    })();
    return () => { active = false; };
  }, [userId, user, myProfile]);

  const isClassmate = (subject) => {
    if (!user || isOwnProfile) return false;
    if (myProfile?.account_type === "student") {
      return myEnrollments.some((e) => e.classroom_id === (subject.classroom_id || subject.id));
    } else if (myProfile?.account_type === "teacher") {
      return myClassrooms.some((c) => c.id === (subject.classroom_id || subject.id));
    }
    return false;
  };

  const handleAddFriend = async () => {
    if (!user || !myProfile) return;
    setActionLoading(true);
    try {
      await base44.entities.Friendship.create({
        requester_id: user.id,
        requester_name: `${myProfile.first_name} ${myProfile.last_name}`,
        recipient_id: userId,
        recipient_name: `${profile.first_name} ${profile.last_name}`,
        status: "pending",
      });
      await base44.entities.Notification.create({
        user_id: userId,
        title: "New Friend Request",
        message: `${myProfile.first_name} ${myProfile.last_name} sent you a friend request`,
        type: "friend_request",
      });
      setFriendship({ status: "pending", requester_id: user.id });
      toast({ title: "Friend request sent!" });
    } catch (e) {
      toast({ title: "Failed to send request", variant: "destructive" });
    }
    setActionLoading(false);
  };

  const handleAcceptFriend = async () => {
    if (!friendship) return;
    setActionLoading(true);
    try {
      await base44.entities.Friendship.update(friendship.id, { status: "accepted" });
      setFriendship({ ...friendship, status: "accepted" });
      toast({ title: "Friend request accepted!" });
    } catch (e) {
      toast({ title: "Failed to accept", variant: "destructive" });
    }
    setActionLoading(false);
  };

  const handleMessage = () => {
    navigate(`/messages?userId=${userId}`);
  };

  if (loading) return <div className="flex justify-center py-20"><div className="w-8 h-8 border-4 border-primary/20 border-t-primary rounded-full animate-spin" /></div>;
  if (!profile) return <div className="text-center py-20 text-muted-foreground">Profile not found.</div>;

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
    const isRequester = f.requester_id === userId;
    const otherId = isRequester ? f.recipient_id : f.requester_id;
    return allProfiles.find((p) => p.created_by_id === otherId) || {
      id: otherId,
      created_by_id: otherId,
      first_name: (isRequester ? f.recipient_name : f.requester_name)?.split(" ")[0] || "",
      last_name: (isRequester ? f.recipient_name : f.requester_name)?.split(" ").slice(1).join(" ") || "",
    };
  });

  return (
    <div className="space-y-5 max-w-3xl mx-auto">
      <button onClick={() => navigate(classroomId ? `/classrooms/${classroomId}` : "/")} className="inline-flex items-center gap-1.5 text-sm text-muted-foreground hover:text-foreground">
        <ArrowLeft className="w-4 h-4" /> Back
      </button>

      {/* Profile Card */}
      <div className="bg-card border border-border rounded-2xl overflow-hidden">
        <div className="h-32" style={cover.type === "gradient" ? { background: cover.value } : { backgroundImage: `url('${cover.value}')`, backgroundSize: "cover", backgroundPosition: "center" }} />
        <div className="px-5 pb-5">
          <div className="flex items-end justify-between -mt-12">
            <div className="rounded-full ring-4 ring-card">
              <ProfileAvatar profile={profile} size="xl" />
            </div>
            {!isOwnProfile && user && (
              <div className="flex gap-2 pb-1">
                <button onClick={handleMessage} className="inline-flex items-center gap-1.5 text-sm font-medium border border-border rounded-lg px-3 py-2 hover:bg-accent">
                  <MessageCircle className="w-3.5 h-3.5" /> Message
                </button>
                {friendship?.status === "accepted" ? (
                  <span className="inline-flex items-center gap-1.5 text-sm font-medium bg-emerald-50 text-emerald-600 rounded-lg px-3 py-2">
                    <Check className="w-3.5 h-3.5" /> Friends
                  </span>
                ) : friendship?.status === "pending" && friendship.requester_id === user.id ? (
                  <span className="inline-flex items-center gap-1.5 text-sm font-medium bg-muted text-muted-foreground rounded-lg px-3 py-2">
                    <Clock className="w-3.5 h-3.5" /> Pending
                  </span>
                ) : friendship?.status === "pending" && friendship.recipient_id === user.id ? (
                  <button onClick={handleAcceptFriend} disabled={actionLoading} className="inline-flex items-center gap-1.5 text-sm font-medium bg-primary text-primary-foreground rounded-lg px-3 py-2 hover:bg-primary/90 disabled:opacity-50">
                    <UserPlus className="w-3.5 h-3.5" /> Accept
                  </button>
                ) : (
                  <button onClick={handleAddFriend} disabled={actionLoading} className="inline-flex items-center gap-1.5 text-sm font-medium bg-primary text-primary-foreground rounded-lg px-3 py-2 hover:bg-primary/90 disabled:opacity-50">
                    <UserPlus className="w-3.5 h-3.5" /> Add Friend
                  </button>
                )}
              </div>
            )}
          </div>
          <div className="mt-3">
            <h1 className="text-xl font-bold">{profile.first_name} {profile.last_name}</h1>
            <p className="text-sm text-muted-foreground">@{profile.username}</p>
            {profile.bio && <p className="text-sm text-muted-foreground mt-2">{profile.bio}</p>}
          </div>
        </div>
      </div>

      {/* Current Subjects */}
      <div>
        <h2 className="font-semibold mb-3">Current Subjects</h2>
        {subjects.length === 0 ? (
          <p className="text-sm text-muted-foreground">No subjects yet.</p>
        ) : (
          <div className="space-y-2">
            {subjects.map((s) => {
              const classmate = isClassmate(s);
              return (
                <div key={s.id} className="flex items-center gap-3 bg-card border border-border rounded-xl p-3">
                  <div className="rounded-lg bg-primary/10 text-primary p-2"><School className="w-4 h-4" /></div>
                  <div className="min-w-0 flex-1">
                    <p className="font-medium text-sm truncate">{s.subject_title}</p>
                    <p className="text-xs text-muted-foreground truncate">{s.year_and_section}</p>
                  </div>
                  {classmate && (
                    <span className="inline-flex items-center gap-1 text-xs font-medium text-primary bg-primary/10 px-2 py-1 rounded-full shrink-0">
                      <Users className="w-3 h-3" /> Classmate
                    </span>
                  )}
                </div>
              );
            })}
          </div>
        )}
      </div>

      {/* Friends */}
      {friendProfiles.length > 0 && (
        <div>
          <h2 className="font-semibold mb-3 flex items-center gap-2"><Users className="w-4 h-4" /> Friends</h2>
          <div className="grid grid-cols-3 sm:grid-cols-4 gap-3">
            {friendProfiles.slice(0, 8).map((p) => (
              <button key={p.id} onClick={() => navigate(`/users/${p.id}`)} className="flex flex-col items-center gap-1 p-3 bg-card border border-border rounded-xl hover:border-primary/30 transition-colors">
                <ProfileAvatar profile={p} size="sm" />
                <p className="text-xs font-medium truncate w-full text-center">{p.first_name}</p>
              </button>
            ))}
          </div>
        </div>
      )}

      {/* Social Media */}
      {Object.keys(socialMedia).length > 0 && (
        <div>
          <h2 className="font-semibold mb-3">Social Media</h2>
          <div className="flex gap-3">
            {Object.entries(socialMedia).filter(([_, url]) => url).map(([platform, url]) => {
              const Icon = SOCIAL_ICONS[platform] || Twitter;
              return (
                <a key={platform} href={url} target="_blank" rel="noreferrer" className="p-3 bg-card border border-border rounded-xl hover:border-primary/30 transition-colors">
                  <Icon className="w-5 h-5" />
                </a>
              );
            })}
          </div>
        </div>
      )}
    </div>
  );
}