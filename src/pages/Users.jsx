import React, { useState, useEffect } from "react";
import { useNavigate } from "react-router-dom";
import { base44 } from "@/api/base44Client";
import { useAuth } from "@/lib/AuthContext";
import { useProfile } from "@/lib/ProfileContext";
import { UserPlus, MessageCircle, Trash2, Search, X, Check, Loader2 } from "lucide-react";
import ProfileAvatar from "@/components/ProfileAvatar";
import { toast } from "@/components/ui/use-toast";

export default function Users() {
  const { user } = useAuth();
  const { profile } = useProfile();
  const navigate = useNavigate();
  const [tab, setTab] = useState("friends");
  const [friendships, setFriendships] = useState([]);
  const [allFriendships, setAllFriendships] = useState([]);
  const [pendingRequests, setPendingRequests] = useState([]);
  const [teachers, setTeachers] = useState([]);
  const [students, setStudents] = useState([]);
  const [loading, setLoading] = useState(true);
  const [showAddFriend, setShowAddFriend] = useState(false);
  const [searchQuery, setSearchQuery] = useState("");
  const [searchResults, setSearchResults] = useState([]);
  const [allProfiles, setAllProfiles] = useState([]);

  const isTeacher = profile?.account_type === "teacher";

  useEffect(() => {
    if (!user) return;
    let active = true;
    (async () => {
      try {
        const [friendshipsData, profiles, classrooms] = await Promise.all([
          base44.entities.Friendship.filter({}, "-created_date", 200),
          base44.entities.Profile.list("-created_date", 200),
          base44.entities.Classroom.list("-created_date", 200),
        ]);
        if (!active) return;
        setAllProfiles(profiles || []);

        const myFriendships = (friendshipsData || []).filter(
          (f) => f.requester_id === user.id || f.recipient_id === user.id
        );
        setAllFriendships(myFriendships);
        setFriendships(myFriendships.filter((f) => f.status === "accepted"));
        setPendingRequests(
          myFriendships.filter((f) => f.status === "pending" && f.recipient_id === user.id)
        );

        if (isTeacher) {
          const myClassrooms = (classrooms || []).filter((c) => c.created_by_id === user.id);
          const classroomIds = myClassrooms.map((c) => c.id);
          const enrollments = classroomIds.length > 0
            ? await base44.entities.ClassroomEnrollment.filter({}, "-created_date", 200)
            : [];
          const myStudentIds = (enrollments || [])
            .filter((e) => classroomIds.includes(e.classroom_id))
            .map((e) => e.student_id);
          setStudents((profiles || []).filter((p) => myStudentIds.includes(p.created_by_id)));
        } else {
          const enrollments = await base44.entities.ClassroomEnrollment.filter({ student_id: user.id }, "-created_date", 50);
          const classroomIds = (enrollments || []).map((e) => e.classroom_id).filter(Boolean);
          const myClassrooms = (classrooms || []).filter((c) => classroomIds.includes(c.id));
          const teacherIds = myClassrooms.map((c) => c.created_by_id).filter(Boolean);
          setTeachers((profiles || []).filter((p) => teacherIds.includes(p.created_by_id)));
        }
      } catch (e) { /* ignore */ }
      finally { if (active) setLoading(false); }
    })();
    return () => { active = false; };
  }, [user, isTeacher]);

  const getFriendProfile = (f) => {
    const isRequester = f.requester_id === user.id;
    const otherId = isRequester ? f.recipient_id : f.requester_id;
    return allProfiles.find((p) => p.created_by_id === otherId) || {
      id: otherId,
      created_by_id: otherId,
      first_name: (isRequester ? f.recipient_name : f.requester_name)?.split(" ")[0] || "",
      last_name: (isRequester ? f.recipient_name : f.requester_name)?.split(" ").slice(1).join(" ") || "",
    };
  };

  const handleRemoveFriend = async (f) => {
    if (!window.confirm("Remove this friend?")) return;
    try {
      await base44.entities.Friendship.delete(f.id);
      setFriendships(friendships.filter((x) => x.id !== f.id));
      toast({ title: "Friend removed" });
    } catch (e) {
      toast({ title: "Failed to remove", variant: "destructive" });
    }
  };

  const handleAcceptRequest = async (f) => {
    try {
      await base44.entities.Friendship.update(f.id, { status: "accepted" });
      setPendingRequests(pendingRequests.filter((x) => x.id !== f.id));
      setFriendships([...friendships, { ...f, status: "accepted" }]);
      toast({ title: "Friend request accepted" });
    } catch (e) {
      toast({ title: "Failed to accept", variant: "destructive" });
    }
  };

  const handleDeclineRequest = async (f) => {
    try {
      await base44.entities.Friendship.delete(f.id);
      setPendingRequests(pendingRequests.filter((x) => x.id !== f.id));
    } catch (e) { /* ignore */ }
  };

  const handleSendRequest = async (otherProfile) => {
    const otherUserId = otherProfile.created_by_id || otherProfile.id;
    const existing = allFriendships.find((f) => {
      const otherId = f.requester_id === user.id ? f.recipient_id : f.requester_id;
      return otherId === otherUserId;
    });
    if (existing) {
      toast({ title: "You are already friends or have a pending request" });
      return;
    }
    try {
      await base44.entities.Friendship.create({
        requester_id: user.id,
        requester_name: `${profile.first_name} ${profile.last_name}`,
        recipient_id: otherUserId,
        recipient_name: `${otherProfile.first_name} ${otherProfile.last_name}`,
        status: "pending",
      });
      await base44.entities.Notification.create({
        user_id: otherUserId,
        title: "New Friend Request",
        message: `${profile.first_name} ${profile.last_name} sent you a friend request`,
        type: "friend_request",
      });
      toast({ title: "Friend request sent!" });
      setShowAddFriend(false);
      setSearchQuery("");
    } catch (e) {
      toast({ title: "Failed to send request", variant: "destructive" });
    }
  };

  const handleMessage = (otherProfile) => {
    const userId = otherProfile.created_by_id || otherProfile.id;
    navigate(`/messages?userId=${userId}`);
  };

  useEffect(() => {
    if (!searchQuery.trim()) { setSearchResults([]); return; }
    const q = searchQuery.toLowerCase();
    const existingFriendUserIds = new Set([
      ...allFriendships.map((f) => (f.requester_id === user.id ? f.recipient_id : f.requester_id)),
      user.id,
    ]);
    const results = allProfiles
      .filter((p) => !existingFriendUserIds.has(p.created_by_id))
      .filter((p) =>
        `${p.first_name} ${p.last_name}`.toLowerCase().includes(q) ||
        (p.username || "").toLowerCase().includes(q)
      )
      .slice(0, 10);
    setSearchResults(results);
  }, [searchQuery, allProfiles, allFriendships, user]);

  if (!profile) return null;

  return (
    <div>
      <div className="flex items-center justify-between mb-4">
        <h1 className="text-xl font-bold">My Circle</h1>
        <button
          onClick={() => setShowAddFriend(true)}
          className="inline-flex items-center gap-2 bg-primary text-primary-foreground px-4 py-2 rounded-lg text-sm font-medium hover:bg-primary/90"
        >
          <UserPlus className="w-4 h-4" /> Add Friend
        </button>
      </div>

      {/* Pending requests */}
      {pendingRequests.length > 0 && (
        <div className="bg-amber-50 dark:bg-amber-900/20 border border-amber-200 dark:border-amber-800 rounded-2xl p-4 mb-4">
          <p className="text-sm font-semibold mb-2">Friend Requests ({pendingRequests.length})</p>
          <div className="space-y-2">
            {pendingRequests.map((f) => {
              const p = getFriendProfile(f);
              return (
                <div key={f.id} className="flex items-center gap-3">
                  <ProfileAvatar profile={p} size="sm" />
                  <span className="text-sm font-medium flex-1">{f.requester_id === user.id ? f.recipient_name : f.requester_name}</span>
                  <button onClick={() => handleAcceptRequest(f)} className="p-2 rounded-lg bg-emerald-500 text-white hover:bg-emerald-600">
                    <Check className="w-4 h-4" />
                  </button>
                  <button onClick={() => handleDeclineRequest(f)} className="p-2 rounded-lg bg-destructive text-destructive-foreground hover:bg-destructive/90">
                    <X className="w-4 h-4" />
                  </button>
                </div>
              );
            })}
          </div>
        </div>
      )}

      {/* Tabs */}
      <div className="flex gap-2 mb-4">
        <button
          onClick={() => setTab("friends")}
          className={`px-4 py-2 rounded-lg text-sm font-medium ${tab === "friends" ? "bg-primary text-primary-foreground" : "bg-muted text-muted-foreground hover:bg-accent"}`}
        >
          Friends {friendships.length > 0 && <span className="ml-1 text-xs">({friendships.length})</span>}
        </button>
        <button
          onClick={() => setTab("teachers")}
          className={`px-4 py-2 rounded-lg text-sm font-medium ${tab === "teachers" ? "bg-primary text-primary-foreground" : "bg-muted text-muted-foreground hover:bg-accent"}`}
        >
          {isTeacher ? "My Students" : "My Teachers"}
        </button>
      </div>

      {/* Content */}
      {loading ? (
        <div className="flex justify-center py-20"><Loader2 className="w-6 h-6 animate-spin text-muted-foreground" /></div>
      ) : tab === "friends" ? (
        <div className="bg-card border border-border rounded-2xl overflow-hidden">
          {friendships.length === 0 ? (
            <div className="p-8 text-center text-muted-foreground text-sm">
              No friends yet. Click "Add Friend" to search for users.
            </div>
          ) : (
            <div className="divide-y divide-border">
              {friendships.map((f) => {
                const p = getFriendProfile(f);
                return (
                  <div key={f.id} className="flex items-center gap-3 p-3 hover:bg-accent/30">
                    <ProfileAvatar profile={p} size="sm" />
                    <div className="min-w-0 flex-1">
                      <button onClick={() => navigate(`/users/${p.id}`)} className="text-sm font-medium hover:underline truncate block text-left">
                        {p.first_name} {p.last_name}
                      </button>
                      <p className="text-xs text-muted-foreground">{p.username || ""}</p>
                    </div>
                    <button onClick={() => handleMessage(p)} className="p-2 rounded-lg hover:bg-accent" title="Message">
                      <MessageCircle className="w-4 h-4" />
                    </button>
                    <button onClick={() => handleRemoveFriend(f)} className="p-2 rounded-lg hover:bg-accent text-destructive" title="Remove">
                      <Trash2 className="w-4 h-4" />
                    </button>
                  </div>
                );
              })}
            </div>
          )}
        </div>
      ) : (
        <div className="bg-card border border-border rounded-2xl overflow-hidden">
          {isTeacher ? (
            students.length === 0 ? (
              <div className="p-8 text-center text-muted-foreground text-sm">No students enrolled in your classes yet.</div>
            ) : (
              <div className="divide-y divide-border">
                {students.map((s) => (
                  <div key={s.id} className="flex items-center gap-3 p-3 hover:bg-accent/30">
                    <ProfileAvatar profile={s} size="sm" />
                    <div className="min-w-0 flex-1">
                      <button onClick={() => navigate(`/users/${s.id}`)} className="text-sm font-medium hover:underline truncate block text-left">
                        {s.first_name} {s.last_name}
                      </button>
                      <p className="text-xs text-muted-foreground">{s.username || ""}</p>
                    </div>
                    <button onClick={() => handleMessage(s)} className="p-2 rounded-lg hover:bg-accent" title="Message">
                      <MessageCircle className="w-4 h-4" />
                    </button>
                  </div>
                ))}
              </div>
            )
          ) : teachers.length === 0 ? (
            <div className="p-8 text-center text-muted-foreground text-sm">No teachers yet.</div>
          ) : (
            <div className="divide-y divide-border">
              {teachers.map((t) => (
                <div key={t.id} className="flex items-center gap-3 p-3 hover:bg-accent/30">
                  <ProfileAvatar profile={t} size="sm" />
                  <div className="min-w-0 flex-1">
                    <button onClick={() => navigate(`/users/${t.id}`)} className="text-sm font-medium hover:underline truncate block text-left">
                      {t.first_name} {t.last_name}
                    </button>
                    <p className="text-xs text-muted-foreground">Teacher</p>
                  </div>
                  <button onClick={() => handleMessage(t)} className="p-2 rounded-lg hover:bg-accent" title="Message">
                    <MessageCircle className="w-4 h-4" />
                  </button>
                </div>
              ))}
            </div>
          )}
        </div>
      )}

      {/* Add Friend modal */}
      {showAddFriend && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 p-4" onClick={() => setShowAddFriend(false)}>
          <div className="bg-card border border-border rounded-2xl w-full max-w-md p-4" onClick={(e) => e.stopPropagation()}>
            <div className="flex items-center justify-between mb-3">
              <h3 className="font-semibold">Add Friend</h3>
              <button onClick={() => setShowAddFriend(false)} className="p-1 rounded-lg hover:bg-accent"><X className="w-4 h-4" /></button>
            </div>
            <div className="relative mb-3">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
              <input
                type="text"
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                placeholder="Search by name or username..."
                className="w-full h-10 pl-9 pr-3 rounded-lg bg-muted/50 border border-border text-[16px] text-foreground focus:outline-none focus:ring-1 focus:ring-ring"
                autoFocus
              />
            </div>
            <div className="max-h-64 overflow-y-auto">
              {searchQuery.trim() === "" ? (
                <p className="text-sm text-muted-foreground text-center py-4">Start typing to search for users.</p>
              ) : searchResults.length === 0 ? (
                <p className="text-sm text-muted-foreground text-center py-4">No users found.</p>
              ) : (
                <div className="space-y-1">
                  {searchResults.map((p) => (
                    <div key={p.id} className="flex items-center gap-3 p-2 rounded-lg hover:bg-accent">
                      <ProfileAvatar profile={p} size="sm" />
                      <div className="min-w-0 flex-1">
                        <p className="text-sm font-medium truncate">{p.first_name} {p.last_name}</p>
                        <p className="text-xs text-muted-foreground">{p.username || ""}</p>
                      </div>
                      <button onClick={() => handleSendRequest(p)} className="inline-flex items-center gap-1 bg-primary text-primary-foreground px-3 py-1.5 rounded-lg text-xs font-medium hover:bg-primary/90">
                        <UserPlus className="w-3.5 h-3.5" /> Add
                      </button>
                    </div>
                  ))}
                </div>
              )}
            </div>
          </div>
        </div>
      )}
    </div>
  );
}