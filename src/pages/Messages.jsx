import React, { useState, useEffect, useRef, useCallback } from "react";
import { useNavigate, useParams, useSearchParams } from "react-router-dom";
import { base44 } from "@/api/base44Client";
import { useAuth } from "@/lib/AuthContext";
import { useProfile } from "@/lib/ProfileContext";
import { Search, Send, ArrowLeft, Plus, Check, X, MessageCircle, Users as UsersIcon, Loader2, MoreVertical, Paperclip, Trash2, Archive, BellOff, Pencil, FileText, Settings as SettingsIcon, UserPlus, Inbox, User, FolderArchive, Flag } from "lucide-react";
import ProfileAvatar from "@/components/ProfileAvatar";
import NewGroupDialog from "@/components/messages/NewGroupDialog";
import GroupSettingsDialog from "@/components/messages/GroupSettingsDialog";
import ReportDialog from "@/components/ReportDialog";
import { toast } from "@/components/ui/use-toast";

const FILTER_TABS = [
  { id: "all", label: "All", icon: Inbox },
  { id: "direct", label: "Direct Message", icon: User },
  { id: "groups", label: "Groups", icon: UsersIcon },
];

function safeParse(str, fallback) {
  try { return JSON.parse(str || JSON.stringify(fallback)); } catch { return fallback; }
}

export default function Messages() {
  const { user } = useAuth();
  const { profile } = useProfile();
  const navigate = useNavigate();
  const { conversationId } = useParams();
  const [searchParams, setSearchParams] = useSearchParams();
  const targetUserId = searchParams.get("userId");
  const joinToken = searchParams.get("join");

  const [conversations, setConversations] = useState([]);
  const [selectedConvo, setSelectedConvo] = useState(null);
  const [messages, setMessages] = useState([]);
  const [newMessage, setNewMessage] = useState("");
  const [searchQuery, setSearchQuery] = useState("");
  const [loading, setLoading] = useState(true);
  const [showNewMessage, setShowNewMessage] = useState(false);
  const [showNewGroup, setShowNewGroup] = useState(false);
  const [showGroupSettings, setShowGroupSettings] = useState(false);
  const [allProfiles, setAllProfiles] = useState([]);
  const [friends, setFriends] = useState([]);
  const [userSearchResults, setUserSearchResults] = useState([]);
  const [convoMenuId, setConvoMenuId] = useState(null);
  const [msgMenuId, setMsgMenuId] = useState(null);
  const [editingMsgId, setEditingMsgId] = useState(null);
  const [editContent, setEditContent] = useState("");
  const [uploadingFile, setUploadingFile] = useState(false);
  const [activeFilter, setActiveFilter] = useState("all");
  const [extraMenuOpen, setExtraMenuOpen] = useState(false);
  const [inviteToGroupFor, setInviteToGroupFor] = useState(null);
  const [sending, setSending] = useState(false);
  const messagesEndRef = useRef(null);
  const fileInputRef = useRef(null);
  const pasteInputRef = useRef(null);

  const loadConversations = useCallback(async () => {
    if (!user) return;
    try {
      const convos = await base44.entities.Conversation.list("-last_message_at", 500);
      const myConvos = (convos || []).filter((c) => safeParse(c.participant_ids, []).includes(user.id));
      setConversations(myConvos);
    } catch (e) { /* ignore */ }
  }, [user]);

  useEffect(() => {
    if (!user) return;
    let active = true;
    (async () => {
      try {
        const [convos, friendships, profiles] = await Promise.all([
          base44.entities.Conversation.list("-last_message_at", 500),
          base44.entities.Friendship.filter({}, "-created_date", 500),
          base44.entities.Profile.list("-created_date", 500),
        ]);
        if (!active) return;
        setAllProfiles(profiles || []);
        const myConvos = (convos || []).filter((c) => safeParse(c.participant_ids, []).includes(user.id));
        setConversations(myConvos);
        const myFriends = (friendships || []).filter(
          (f) => f.status === "accepted" && (f.requester_id === user.id || f.recipient_id === user.id)
        );
        setFriends(myFriends);
      } catch (e) { /* ignore */ }
      finally { if (active) setLoading(false); }
    })();
    return () => { active = false; };
  }, [user]);

  // Handle join via link
  useEffect(() => {
    if (!joinToken || !user || loading || conversations.length === 0) return;
    (async () => {
      const convo = conversations.find((c) => c.invite_link === joinToken);
      if (!convo) { toast({ title: "Invalid or expired invite link", variant: "destructive" }); setSearchParams({}); return; }
      const ids = safeParse(convo.participant_ids, []);
      if (ids.includes(user.id)) { setSelectedConvo(convo); navigate(`/messages/${convo.id}`); setSearchParams({}); return; }
      try {
        const newIds = [...ids, user.id];
        const names = safeParse(convo.participant_names, []);
        const p = allProfiles.find((pr) => pr.created_by_id === user.id);
        const myName = p ? `${p.first_name} ${p.last_name}` : (user.full_name || "User");
        const newNames = [...names, myName];
        await base44.entities.Conversation.update(convo.id, {
          participant_ids: JSON.stringify(newIds),
          participant_names: JSON.stringify(newNames),
        });
        toast({ title: `Joined "${convo.name || "Group"}"` });
        setSelectedConvo(convo);
        navigate(`/messages/${convo.id}`);
        setSearchParams({});
        loadConversations();
      } catch (e) { toast({ title: "Failed to join group", variant: "destructive" }); }
    })();
  }, [joinToken, user, loading, conversations]);

  useEffect(() => {
    if (conversationId && conversations.length > 0) {
      const convo = conversations.find((c) => c.id === conversationId);
      if (convo) setSelectedConvo(convo);
    }
  }, [conversationId, conversations]);

  useEffect(() => {
    if (targetUserId && allProfiles.length > 0 && !loading) {
      const otherProfile = allProfiles.find((p) => p.id === targetUserId || p.created_by_id === targetUserId);
      if (otherProfile) {
        startConversation(otherProfile);
        setSearchParams({});
      }
    }
  }, [targetUserId, allProfiles, loading]);

  useEffect(() => {
    if (!selectedConvo) return;
    let active = true;
    (async () => {
      try {
        const msgs = await base44.entities.Message.filter({ conversation_id: selectedConvo.id }, "created_date", 500);
        if (active) {
          setMessages(msgs || []);
          setTimeout(() => messagesEndRef.current?.scrollIntoView({ behavior: "smooth" }), 100);
          const unread = (msgs || []).filter((m) => !m.read && !m.unsent && m.sender_id !== user.id);
          if (unread.length > 0) {
            for (const m of unread) {
              try { await base44.entities.Message.update(m.id, { read: true }); } catch (e) { /* ignore */ }
            }
          }
        }
      } catch (e) { /* ignore */ }
    })();
    const unsubscribe = base44.entities.Message.subscribe((event) => {
      if (event.data?.conversation_id === selectedConvo.id && event.type === "create") {
        setMessages((prev) => prev.some((m) => m.id === event.data.id) ? prev : [...prev, event.data]);
        if (event.data.sender_id !== user.id) {
          base44.entities.Message.update(event.data.id, { read: true }).catch(() => {});
        }
        setTimeout(() => messagesEndRef.current?.scrollIntoView({ behavior: "smooth" }), 100);
      }
      if (event.type === "update") {
        setMessages((prev) => prev.map((m) => (m.id === event.data.id ? { ...m, ...event.data } : m)));
      }
      if (event.type === "delete") {
        setMessages((prev) => prev.filter((m) => m.id !== event.data.id));
      }
    });
    return () => { active = false; unsubscribe?.(); };
  }, [selectedConvo]);

  useEffect(() => {
    if (!showNewMessage) return;
    if (!searchQuery.trim()) { setUserSearchResults([]); return; }
    const q = searchQuery.toLowerCase();
    const results = allProfiles
      .filter((p) => p.created_by_id !== user.id)
      .filter((p) =>
        `${p.first_name} ${p.last_name}`.toLowerCase().includes(q) ||
        (p.username || "").toLowerCase().includes(q)
      )
      .slice(0, 10);
    setUserSearchResults(results);
  }, [showNewMessage, searchQuery, allProfiles, user]);

  const getFriendProfiles = () =>
    friends.map((f) => {
      const isRequester = f.requester_id === user.id;
      const otherId = isRequester ? f.recipient_id : f.requester_id;
      return allProfiles.find((p) => p.created_by_id === otherId) || {
        id: otherId,
        created_by_id: otherId,
        first_name: (isRequester ? f.recipient_name : f.requester_name)?.split(" ")[0] || "",
        last_name: (isRequester ? f.recipient_name : f.requester_name)?.split(" ").slice(1).join(" ") || "",
      };
    });

  const startConversation = async (otherProfile) => {
    const otherUserId = otherProfile.created_by_id || otherProfile.id;
    const existing = conversations.find((c) => {
      if (c.type !== "direct") return false;
      const ids = safeParse(c.participant_ids, []);
      return ids.length === 2 && ids.includes(otherUserId) && ids.includes(user.id);
    });
    if (existing) {
      setSelectedConvo(existing);
      navigate(`/messages/${existing.id}`);
      setShowNewMessage(false);
      return;
    }
    const isFriend = friends.some(
      (f) => f.status === "accepted" && ((f.requester_id === user.id && f.recipient_id === otherUserId) || (f.recipient_id === user.id && f.requester_id === otherUserId))
    );
    try {
      const convo = await base44.entities.Conversation.create({
        type: "direct",
        participant_ids: JSON.stringify([user.id, otherUserId]),
        participant_names: JSON.stringify([`${profile.first_name} ${profile.last_name}`, `${otherProfile.first_name} ${otherProfile.last_name}`]),
        is_request: !isFriend,
      });
      setConversations((prev) => [convo, ...prev]);
      setSelectedConvo(convo);
      navigate(`/messages/${convo.id}`);
      setShowNewMessage(false);
    } catch (e) {
      toast({ title: "Failed to start conversation", variant: "destructive" });
    }
  };

  const createGroup = async (name, participants) => {
    try {
      const participantIds = [user.id, ...participants.map((p) => p.created_by_id || p.id)];
      const participantNames = [`${profile.first_name} ${profile.last_name}`, ...participants.map((p) => `${p.first_name} ${p.last_name}`)];
      const convo = await base44.entities.Conversation.create({
        type: "group",
        name,
        participant_ids: JSON.stringify(participantIds),
        participant_names: JSON.stringify(participantNames),
        admin_ids: JSON.stringify([user.id]),
      });
      setConversations((prev) => [convo, ...prev]);
      setSelectedConvo(convo);
      navigate(`/messages/${convo.id}`);
      setShowNewGroup(false);
    } catch (e) {
      toast({ title: "Failed to create group", variant: "destructive" });
    }
  };

  const sendMessage = async (fileUrl = null) => {
    if (sending) return;
    if (!newMessage.trim() && !fileUrl) return;
    if (!selectedConvo) return;
    setSending(true);
    const content = newMessage.trim();
    setNewMessage("");
    try {
      const msg = await base44.entities.Message.create({
        conversation_id: selectedConvo.id,
        sender_id: user.id,
        sender_name: `${profile.first_name} ${profile.last_name}`,
        content: content || (fileUrl ? "📎 File attachment" : ""),
        file_url: fileUrl || "",
        deleted_for_ids: "[]",
      });
      // Rely on the subscription to add the message to avoid duplicates.
      await base44.entities.Conversation.update(selectedConvo.id, {
        last_message: content || "📎 File attachment",
        last_message_at: new Date().toISOString(),
        last_sender_id: user.id,
        last_sender_name: `${profile.first_name} ${profile.last_name}`,
      });
      try {
        const participantIds = safeParse(selectedConvo.participant_ids, []);
        const otherIds = participantIds.filter((id) => id !== user.id);
        for (const otherId of otherIds) {
          await base44.entities.Notification.create({
            user_id: otherId,
            title: "New Message",
            message: `${profile.first_name} ${profile.last_name} sent you a message`,
            type: "message",
            conversation_id: selectedConvo.id,
          });
        }
      } catch (e) { /* ignore */ }
      setTimeout(() => messagesEndRef.current?.scrollIntoView({ behavior: "smooth" }), 100);
    } catch (e) {
      toast({ title: "Failed to send", variant: "destructive" });
    } finally {
      setSending(false);
    }
  };

  const handleFileUpload = async (file) => {
    if (!file || !selectedConvo) return;
    setUploadingFile(true);
    try {
      const res = await base44.integrations.Core.UploadFile({ file });
      await sendMessage(res.file_url);
    } catch (err) {
      toast({ title: "Upload failed", variant: "destructive" });
    } finally {
      setUploadingFile(false);
      if (fileInputRef.current) fileInputRef.current.value = "";
    }
  };

  const handleFileInput = (e) => {
    const file = e.target.files?.[0];
    if (file) handleFileUpload(file);
  };

  const handlePaste = async (e) => {
    if (!selectedConvo) return;
    const items = e.clipboardData?.items;
    if (!items) return;
    for (const item of items) {
      if (item.kind === "file") {
        const file = item.getAsFile();
        if (file) {
          e.preventDefault();
          handleFileUpload(file);
          return;
        }
      }
    }
  };

  const deleteConversation = async (convo) => {
    if (!window.confirm("Delete this conversation? All messages will be removed.")) return;
    try {
      await base44.entities.Message.deleteMany({ conversation_id: convo.id });
      await base44.entities.Conversation.delete(convo.id);
      setConversations((prev) => prev.filter((c) => c.id !== convo.id));
      if (selectedConvo?.id === convo.id) { setSelectedConvo(null); navigate("/messages"); }
      setConvoMenuId(null);
      toast({ title: "Conversation deleted" });
    } catch (e) { toast({ title: "Failed to delete", variant: "destructive" }); }
  };

  const toggleArchive = async (convo) => {
    try {
      await base44.entities.Conversation.update(convo.id, { archived: !convo.archived });
      setConversations((prev) => prev.map((c) => (c.id === convo.id ? { ...c, archived: !c.archived } : c)));
      setConvoMenuId(null);
      toast({ title: convo.archived ? "Conversation unarchived" : "Conversation archived" });
    } catch (e) { toast({ title: "Failed", variant: "destructive" }); }
  };

  const muteConversation = async (convo, duration) => {
    try {
      let mutedUntil = null;
      if (duration === "1h") mutedUntil = new Date(Date.now() + 3600000).toISOString();
      else if (duration === "1d") mutedUntil = new Date(Date.now() + 86400000).toISOString();
      await base44.entities.Conversation.update(convo.id, { muted_until: mutedUntil || "" });
      setConversations((prev) => prev.map((c) => (c.id === convo.id ? { ...c, muted_until: mutedUntil || "" } : c)));
      setConvoMenuId(null);
      toast({ title: duration === "off" ? "Unmuted" : `Muted for ${duration === "1h" ? "1 hour" : "1 day"}` });
    } catch (e) { toast({ title: "Failed", variant: "destructive" }); }
  };

  const deleteMessageForMe = async (msg) => {
    try {
      const deleted = safeParse(msg.deleted_for_ids, []);
      if (!deleted.includes(user.id)) deleted.push(user.id);
      await base44.entities.Message.update(msg.id, { deleted_for_ids: JSON.stringify(deleted) });
      setMessages((prev) => prev.map((m) => (m.id === msg.id ? { ...m, deleted_for_ids: JSON.stringify(deleted) } : m)));
      setMsgMenuId(null);
      toast({ title: "Message deleted for you" });
    } catch (e) { toast({ title: "Failed", variant: "destructive" }); }
  };

  const unsendMessage = async (msg) => {
    try {
      await base44.entities.Message.update(msg.id, { unsent: true, unsent_by_name: msg.sender_name || "User", content: "" });
      setMessages((prev) => prev.map((m) => (m.id === msg.id ? { ...m, unsent: true, unsent_by_name: msg.sender_name, content: "" } : m)));
      setMsgMenuId(null);
      toast({ title: "Message unsent" });
    } catch (e) { toast({ title: "Failed", variant: "destructive" }); }
  };

  const startEditMessage = (msg) => {
    setEditingMsgId(msg.id);
    setEditContent(msg.content);
    setMsgMenuId(null);
  };

  const saveEditMessage = async (msg) => {
    if (!editContent.trim()) return;
    try {
      await base44.entities.Message.update(msg.id, { content: editContent.trim(), edited: true, edited_at: new Date().toISOString() });
      setMessages((prev) => prev.map((m) => (m.id === msg.id ? { ...m, content: editContent.trim(), edited: true, edited_at: new Date().toISOString() } : m)));
      setEditingMsgId(null);
      setEditContent("");
    } catch (e) { toast({ title: "Failed to edit", variant: "destructive" }); }
  };

  const acceptRequest = async (convo) => {
    try {
      await base44.entities.Conversation.update(convo.id, { is_request: false });
      setConversations((prev) => prev.map((c) => (c.id === convo.id ? { ...c, is_request: false } : c)));
    } catch (e) { /* ignore */ }
  };

  const declineRequest = async (convo) => {
    try {
      await base44.entities.Conversation.delete(convo.id);
      setConversations((prev) => prev.filter((c) => c.id !== convo.id));
    } catch (e) { /* ignore */ }
  };

  const inviteToGroup = async (groupConvo, targetUserId) => {
    const ids = safeParse(groupConvo.participant_ids, []);
    if (ids.includes(targetUserId)) {
      toast({ title: "User is already in this group" });
      return;
    }
    const names = safeParse(groupConvo.participant_names, []);
    const tp = allProfiles.find((p) => p.created_by_id === targetUserId);
    const tname = tp ? `${tp.first_name} ${tp.last_name}` : "User";
    const newIds = [...ids, targetUserId];
    const newNames = [...names, tname];
    try {
      await base44.entities.Conversation.update(groupConvo.id, {
        participant_ids: JSON.stringify(newIds),
        participant_names: JSON.stringify(newNames),
      });
      toast({ title: `Added to "${groupConvo.name}"` });
      setInviteToGroupFor(null);
      loadConversations();
    } catch (e) { toast({ title: "Failed to invite", variant: "destructive" }); }
  };

  const getConvoDisplay = (convo) => {
    if (convo.type === "group") return { name: convo.name || "Group Chat", isGroup: true, profileId: null, profile: null };
    const ids = safeParse(convo.participant_ids, []);
    const names = safeParse(convo.participant_names, []);
    const otherIdx = ids.indexOf(user.id) === 0 ? 1 : 0;
    const otherId = ids[otherIdx];
    const otherProfile = allProfiles.find((p) => p.created_by_id === otherId);
    return { name: names[otherIdx] || "Unknown", isGroup: false, profile: otherProfile, profileId: otherProfile?.id };
  };

  const isMuted = (convo) => {
    if (!convo.muted_until) return false;
    return new Date(convo.muted_until) > new Date();
  };

  // Filter conversations
  const allInbox = conversations.filter((c) => !c.archived && (!c.is_request || c.created_by_id === user.id));
  const requestConvos = conversations.filter((c) => c.is_request && c.created_by_id !== user.id && !c.archived);
  const archivedConvos = conversations.filter((c) => c.archived);

  const myGroups = allInbox.filter((c) => c.type === "group");
  const myDirects = allInbox.filter((c) => c.type === "direct");

  let displayConvos = allInbox;
  if (activeFilter === "direct") displayConvos = myDirects;
  else if (activeFilter === "groups") displayConvos = myGroups;
  else if (activeFilter === "request") displayConvos = requestConvos;
  else if (activeFilter === "archive") displayConvos = archivedConvos;

  const filteredDisplayConvos = displayConvos.filter((c) => !searchQuery.trim() || getConvoDisplay(c).name.toLowerCase().includes(searchQuery.toLowerCase()));

  if (!profile) return null;

  const myGroupsForInvite = myGroups;

  return (
    <div className="flex gap-0 md:gap-4 h-[calc(100vh-8rem)]">
      {/* Conversation list */}
      <div className={`${selectedConvo ? "hidden md:flex" : "flex"} flex-col w-full md:w-80 bg-card border border-border rounded-2xl overflow-hidden`}>
        <div className="p-3 border-b border-border space-y-2">
          <div className="flex items-center justify-between">
            <h2 className="font-semibold">Messages</h2>
            <div className="flex gap-1">
              <button onClick={() => setShowNewMessage(true)} className="p-2 rounded-lg hover:bg-accent" title="New Message">
                <Plus className="w-4 h-4" />
              </button>
              <button onClick={() => setShowNewGroup(true)} className="p-2 rounded-lg hover:bg-accent" title="Create Group">
                <UsersIcon className="w-4 h-4" />
              </button>
            </div>
          </div>
          <div className="relative">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
            <input
              type="text"
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              placeholder="Search conversations..."
              className="w-full h-9 pl-9 pr-3 rounded-lg bg-muted/50 border border-border text-[16px] sm:text-sm text-foreground focus:outline-none"
            />
          </div>
          {/* Filter tabs */}
          <div className="flex items-center gap-1.5 flex-wrap">
            {FILTER_TABS.map((t) => (
              <button
                key={t.id}
                onClick={() => setActiveFilter(t.id)}
                className={`px-3 py-1.5 rounded-full text-xs font-medium border transition-colors ${
                  activeFilter === t.id ? "bg-primary text-primary-foreground border-primary" : "bg-card text-muted-foreground border-border hover:bg-accent"
                }`}
              >
                {t.label}
              </button>
            ))}
            <div className="relative">
              <button onClick={() => setExtraMenuOpen(!extraMenuOpen)} className="p-1.5 rounded-full hover:bg-accent" title="More">
                <MoreVertical className="w-4 h-4 text-muted-foreground" />
              </button>
              {extraMenuOpen && (
                <>
                  <div className="fixed inset-0 z-40" onClick={() => setExtraMenuOpen(false)} />
                  <div className="absolute right-0 top-full mt-1 w-44 bg-card border border-border rounded-xl shadow-lg z-50 py-1">
                    <button onClick={() => { setActiveFilter("request"); setExtraMenuOpen(false); }} className="flex items-center gap-2 w-full px-3 py-2 text-sm hover:bg-accent text-left">
                      <Inbox className="w-4 h-4" /> Requests {requestConvos.length > 0 && <span className="ml-auto text-xs bg-primary text-primary-foreground rounded-full px-1.5">{requestConvos.length}</span>}
                    </button>
                    <button onClick={() => { setActiveFilter("archive"); setExtraMenuOpen(false); }} className="flex items-center gap-2 w-full px-3 py-2 text-sm hover:bg-accent text-left">
                      <FolderArchive className="w-4 h-4" /> Archive
                    </button>
                  </div>
                </>
              )}
            </div>
          </div>
        </div>

        <div className="flex-1 overflow-y-auto">
          {loading ? (
            <div className="flex justify-center py-10"><Loader2 className="w-5 h-5 animate-spin text-muted-foreground" /></div>
          ) : activeFilter === "request" ? (
            requestConvos.length === 0 ? (
              <div className="p-6 text-center text-sm text-muted-foreground">No message requests.</div>
            ) : (
              <div className="divide-y divide-border">
                {requestConvos.map((convo) => {
                  const d = getConvoDisplay(convo);
                  return (
                    <div key={convo.id} className="flex items-center gap-2 p-3 hover:bg-accent/50">
                      <ProfileAvatar profile={d.profile || {}} size="sm" />
                      <div className="min-w-0 flex-1">
                        <p className="text-sm font-medium truncate">{d.name}</p>
                        <p className="text-xs text-muted-foreground truncate">{convo.last_message || "No messages yet"}</p>
                      </div>
                      <button onClick={() => acceptRequest(convo)} className="p-1.5 rounded-lg bg-emerald-500 text-white" title="Accept"><Check className="w-3.5 h-3.5" /></button>
                      <button onClick={() => declineRequest(convo)} className="p-1.5 rounded-lg bg-destructive text-destructive-foreground" title="Decline"><X className="w-3.5 h-3.5" /></button>
                    </div>
                  );
                })}
              </div>
            )
          ) : activeFilter === "archive" ? (
            archivedConvos.length === 0 ? (
              <div className="p-6 text-center text-sm text-muted-foreground">No archived conversations.</div>
            ) : (
              <div className="divide-y divide-border">
                {archivedConvos.map((convo) => {
                  const d = getConvoDisplay(convo);
                  return (
                    <div key={convo.id} className="flex items-center gap-2 p-3 hover:bg-accent/50 opacity-60">
                      <button onClick={() => { setSelectedConvo(convo); navigate(`/messages/${convo.id}`); }} className="flex items-center gap-3 flex-1 min-w-0 text-left">
                        {d.isGroup ? <div className="w-10 h-10 rounded-full bg-primary/20 flex items-center justify-center shrink-0"><UsersIcon className="w-5 h-5 text-primary" /></div> : <ProfileAvatar profile={d.profile || {}} size="sm" />}
                        <div className="min-w-0 flex-1">
                          <p className="text-sm font-medium truncate">{d.name}</p>
                          <p className="text-xs text-muted-foreground truncate">{convo.last_message || "No messages yet"}</p>
                        </div>
                      </button>
                      <button onClick={() => toggleArchive(convo)} className="p-1.5 rounded-lg hover:bg-accent shrink-0" title="Unarchive"><Archive className="w-4 h-4" /></button>
                    </div>
                  );
                })}
              </div>
            )
          ) : filteredDisplayConvos.length === 0 ? (
            <div className="p-6 text-center text-sm text-muted-foreground">
              No conversations yet. Tap <Plus className="w-3.5 h-3.5 inline" /> to start a new message.
            </div>
          ) : (
            <div className="divide-y divide-border">
              {filteredDisplayConvos.map((convo) => {
                const d = getConvoDisplay(convo);
                const isSelected = selectedConvo?.id === convo.id;
                const muted = isMuted(convo);
                return (
                  <div key={convo.id} className={`flex items-center gap-2 p-3 transition-colors ${isSelected ? "bg-primary/10" : "hover:bg-accent/50"}`}>
                    <button onClick={() => { setSelectedConvo(convo); navigate(`/messages/${convo.id}`); }} className="flex items-center gap-3 flex-1 min-w-0 text-left">
                      {d.isGroup ? (
                        <div className="w-10 h-10 rounded-full bg-primary/20 flex items-center justify-center shrink-0 overflow-hidden">
                          {convo.group_picture_url ? <img src={convo.group_picture_url} alt="Group" className="w-full h-full object-cover" /> : <UsersIcon className="w-5 h-5 text-primary" />}
                        </div>
                      ) : (
                        <ProfileAvatar profile={d.profile || {}} size="sm" />
                      )}
                      <div className="min-w-0 flex-1">
                        <div className="flex items-center gap-1">
                          <p className="text-sm font-medium truncate">{d.name}</p>
                          {muted && <BellOff className="w-3 h-3 text-muted-foreground shrink-0" />}
                        </div>
                        <p className="text-xs text-muted-foreground truncate">
                          {convo.last_sender_id === user.id ? "You: " : ""}
                          {convo.last_message || "No messages yet"}
                        </p>
                      </div>
                    </button>
                    <div className="relative shrink-0">
                      <button onClick={() => setConvoMenuId(convoMenuId === convo.id ? null : convo.id)} className="p-1.5 rounded-lg hover:bg-accent">
                        <MoreVertical className="w-4 h-4 text-muted-foreground" />
                      </button>
                      {convoMenuId === convo.id && (
                        <div className="absolute right-0 top-full mt-1 w-48 bg-card border border-border rounded-xl shadow-lg z-50 py-1">
                          <button onClick={() => toggleArchive(convo)} className="flex items-center gap-2 w-full px-3 py-2 text-sm hover:bg-accent text-left">
                            <Archive className="w-4 h-4" /> {convo.archived ? "Unarchive" : "Archive"}
                          </button>
                          {!d.isGroup && (
                            <button onClick={() => { setInviteToGroupFor(convo); setConvoMenuId(null); }} className="flex items-center gap-2 w-full px-3 py-2 text-sm hover:bg-accent text-left">
                              <UserPlus className="w-4 h-4" /> Invite to group chat
                            </button>
                          )}
                          {d.isGroup && (
                            <button onClick={() => { setShowGroupSettings(true); setConvoMenuId(null); }} className="flex items-center gap-2 w-full px-3 py-2 text-sm hover:bg-accent text-left">
                              <SettingsIcon className="w-4 h-4" /> Group settings
                            </button>
                          )}
                          <div className="group relative">
                            <button className="flex items-center gap-2 w-full px-3 py-2 text-sm hover:bg-accent text-left">
                              <BellOff className="w-4 h-4" /> Mute
                            </button>
                            <div className="hidden group-hover:block absolute left-full top-0 ml-1 w-40 bg-card border border-border rounded-xl shadow-lg z-50 py-1">
                              <button onClick={() => muteConversation(convo, "1h")} className="block w-full px-3 py-2 text-sm hover:bg-accent text-left">1 hour</button>
                              <button onClick={() => muteConversation(convo, "1d")} className="block w-full px-3 py-2 text-sm hover:bg-accent text-left">1 day</button>
                              <button onClick={() => muteConversation(convo, "off")} className="block w-full px-3 py-2 text-sm hover:bg-accent text-left">Until I turn it back on</button>
                            </div>
                          </div>
                          <button onClick={() => deleteConversation(convo)} className="flex items-center gap-2 w-full px-3 py-2 text-sm hover:bg-accent text-destructive text-left">
                            <Trash2 className="w-4 h-4" /> Delete
                          </button>
                        </div>
                      )}
                    </div>
                  </div>
                );
              })}
            </div>
          )}
        </div>
      </div>

      {/* Chat view */}
      <div className={`${selectedConvo ? "flex" : "hidden md:flex"} flex-1 flex-col bg-card border border-border rounded-2xl overflow-hidden`}>
        {!selectedConvo ? (
          <div className="flex-1 flex items-center justify-center text-muted-foreground">
            <div className="text-center">
              <MessageCircle className="w-12 h-12 mx-auto mb-2 opacity-30" />
              <p className="text-sm">Select a conversation to start chatting</p>
            </div>
          </div>
        ) : (
          <>
            <div className="flex items-center gap-3 p-3 border-b border-border">
              <button onClick={() => { setSelectedConvo(null); navigate("/messages"); }} className="md:hidden p-1 rounded-lg hover:bg-accent">
                <ArrowLeft className="w-5 h-5" />
              </button>
              {(() => {
                const d = getConvoDisplay(selectedConvo);
                return (
                  <button
                    onClick={() => d.isGroup ? setShowGroupSettings(true) : d.profileId && navigate(`/users/${d.profileId}`)}
                    className="flex items-center gap-3 flex-1 min-w-0 text-left hover:opacity-80 transition-opacity"
                  >
                    {d.isGroup ? (
                      <div className="w-10 h-10 rounded-full bg-primary/20 flex items-center justify-center shrink-0 overflow-hidden">
                        {selectedConvo.group_picture_url ? <img src={selectedConvo.group_picture_url} alt="Group" className="w-full h-full object-cover" /> : <UsersIcon className="w-5 h-5 text-primary" />}
                      </div>
                    ) : (
                      <ProfileAvatar profile={d.profile || {}} size="sm" />
                    )}
                    <div className="min-w-0">
                      <p className="font-medium text-sm truncate">{d.name}</p>
                      {selectedConvo.type === "group" && (
                        <p className="text-xs text-muted-foreground">{safeParse(selectedConvo.participant_names, []).length} members</p>
                      )}
                    </div>
                  </button>
                );
              })()}
              {selectedConvo.type === "group" && (
                <button onClick={() => setShowGroupSettings(true)} className="p-2 rounded-lg hover:bg-accent" title="Group settings">
                  <SettingsIcon className="w-4 h-4 text-muted-foreground" />
                </button>
              )}
            </div>

            <div className="flex-1 overflow-y-auto p-4 space-y-2">
              {messages.length === 0 ? (
                <p className="text-sm text-muted-foreground text-center py-8">No messages yet. Say hello!</p>
              ) : (
                messages.map((msg) => {
                  const isMine = msg.sender_id === user.id;
                  const deletedForMe = safeParse(msg.deleted_for_ids, []).includes(user.id);
                  if (deletedForMe) return null;
                  if (msg.unsent) {
                    return (
                      <div key={msg.id} className="flex justify-center">
                        <span className="text-xs text-muted-foreground bg-muted rounded-full px-3 py-1">
                          {msg.unsent_by_name || "Someone"} unsent a message
                        </span>
                      </div>
                    );
                  }
                  return (
                    <div key={msg.id} className={`group flex ${isMine ? "justify-end" : "justify-start"}`}>
                      <div className={`max-w-[75%] rounded-2xl px-3 py-2 text-sm relative ${
                        isMine ? "bg-primary text-primary-foreground" : "bg-muted text-foreground"
                      }`}>
                        {selectedConvo.type === "group" && !isMine && (
                          <p className="text-xs font-semibold mb-0.5 opacity-80">{msg.sender_name}</p>
                        )}
                        {editingMsgId === msg.id ? (
                          <div className="flex flex-col gap-1">
                            <input
                              type="text"
                              value={editContent}
                              onChange={(e) => setEditContent(e.target.value)}
                              onKeyDown={(e) => { if (e.key === "Enter") saveEditMessage(msg); if (e.key === "Escape") setEditingMsgId(null); }}
                              className="w-full bg-background text-foreground rounded px-2 py-1 text-sm outline-none"
                              autoFocus
                            />
                            <div className="flex gap-1 justify-end">
                              <button onClick={() => setEditingMsgId(null)} className="text-xs px-2 py-0.5 rounded bg-black/10 text-primary-foreground hover:bg-black/20">Cancel</button>
                              <button onClick={() => saveEditMessage(msg)} className="text-xs px-2 py-0.5 rounded bg-black/20 text-primary-foreground hover:bg-black/30 font-medium">Save</button>
                            </div>
                          </div>
                        ) : (
                          <>
                            {msg.file_url && (
                              <a href={msg.file_url} target="_blank" rel="noreferrer" className="flex items-center gap-2 mb-1 underline">
                                <FileText className="w-4 h-4" /> Attached file
                              </a>
                            )}
                            {msg.content && <p>{msg.content}</p>}
                            {msg.edited && <span className="text-[10px] opacity-60 ml-1">edited{msg.edited_at ? ` ${new Date(msg.edited_at).toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" })}` : ""}</span>}
                          </>
                        )}
                        {isMine && editingMsgId !== msg.id && (
                          <div className="absolute -right-2 top-1/2 -translate-y-1/2 opacity-0 group-hover:opacity-100 transition-opacity">
                            <button onClick={() => setMsgMenuId(msgMenuId === msg.id ? null : msg.id)} className="p-1 rounded-full bg-background/80 shadow">
                              <MoreVertical className="w-3 h-3 text-foreground" />
                            </button>
                            {msgMenuId === msg.id && (
                              <div className="absolute right-0 top-full mt-1 w-44 bg-card border border-border rounded-xl shadow-lg z-50 py-1 text-foreground">
                                <button onClick={() => startEditMessage(msg)} className="flex items-center gap-2 w-full px-3 py-1.5 text-xs hover:bg-accent text-left">
                                  <Pencil className="w-3 h-3" /> Edit
                                </button>
                                <button onClick={() => deleteMessageForMe(msg)} className="flex items-center gap-2 w-full px-3 py-1.5 text-xs hover:bg-accent text-left">
                                  <Trash2 className="w-3 h-3" /> Delete (for me)
                                </button>
                                <button onClick={() => unsendMessage(msg)} className="flex items-center gap-2 w-full px-3 py-1.5 text-xs hover:bg-accent text-destructive text-left">
                                  <X className="w-3 h-3" /> Unsend (everyone)
                                </button>
                              </div>
                            )}
                          </div>
                        )}
                        {!isMine && (
                          <div className="absolute -left-2 top-1/2 -translate-y-1/2 opacity-0 group-hover:opacity-100 transition-opacity">
                            <ReportDialog
                              targetType="message"
                              targetId={msg.id}
                              reportedUserId={msg.sender_id}
                              reportedUserName={msg.sender_name}
                              contentSnapshot={msg.content || msg.file_url || ""}
                            >
                              <button className="p-1 rounded-full bg-background/90 shadow text-foreground hover:text-destructive" title="Report">
                                <Flag className="w-3 h-3" />
                              </button>
                            </ReportDialog>
                          </div>
                        )}
                      </div>
                    </div>
                  );
                })
              )}
              <div ref={messagesEndRef} />
            </div>

            <div className="p-3 border-t border-border flex items-center gap-2">
              <input ref={fileInputRef} type="file" className="hidden" onChange={handleFileInput} disabled={uploadingFile} />
              <button onClick={() => fileInputRef.current?.click()} disabled={uploadingFile} className="w-10 h-10 rounded-full hover:bg-accent flex items-center justify-center shrink-0 disabled:opacity-50" title="Attach file">
                {uploadingFile ? <Loader2 className="w-4 h-4 animate-spin" /> : <Paperclip className="w-4 h-4" />}
              </button>
              <input
                ref={pasteInputRef}
                type="text"
                value={newMessage}
                onChange={(e) => setNewMessage(e.target.value)}
                onKeyDown={(e) => { if (e.key === "Enter" && !e.shiftKey) { e.preventDefault(); sendMessage(); } }}
                onPaste={handlePaste}
                placeholder="Type a message... (paste files with Ctrl+V)"
                className="flex-1 h-10 px-3 rounded-full bg-muted/50 border border-border text-[16px] sm:text-sm text-foreground focus:outline-none focus:ring-1 focus:ring-ring"
              />
              <button
                onClick={() => sendMessage()}
                disabled={(!newMessage.trim() && !uploadingFile) || sending}
                className="w-10 h-10 rounded-full bg-primary text-primary-foreground flex items-center justify-center hover:bg-primary/90 disabled:opacity-50 shrink-0"
              >
                {sending ? <Loader2 className="w-4 h-4 animate-spin" /> : <Send className="w-4 h-4" />}
              </button>
            </div>
          </>
        )}
      </div>

      {/* New message modal */}
      {showNewMessage && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 p-4" onClick={() => setShowNewMessage(false)}>
          <div className="bg-card border border-border rounded-2xl w-full max-w-md p-4" onClick={(e) => e.stopPropagation()}>
            <div className="flex items-center justify-between mb-3">
              <h3 className="font-semibold">New Message</h3>
              <button onClick={() => setShowNewMessage(false)} className="p-1 rounded-lg hover:bg-accent"><X className="w-4 h-4" /></button>
            </div>
            <div className="relative mb-3">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
              <input
                type="text"
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                placeholder="Search for a user..."
                className="w-full h-10 pl-9 pr-3 rounded-lg bg-muted/50 border border-border text-[16px] text-foreground focus:outline-none focus:ring-1 focus:ring-ring"
                autoFocus
              />
            </div>
            <div className="max-h-64 overflow-y-auto">
              {searchQuery.trim() === "" ? (
                <p className="text-sm text-muted-foreground text-center py-4">Search for a user to start chatting.</p>
              ) : userSearchResults.length === 0 ? (
                <p className="text-sm text-muted-foreground text-center py-4">No users found.</p>
              ) : (
                <div className="space-y-1">
                  {userSearchResults.map((p) => (
                    <button
                      key={p.id}
                      onClick={() => startConversation(p)}
                      className="flex items-center gap-3 w-full p-2 rounded-lg hover:bg-accent text-left"
                    >
                      <ProfileAvatar profile={p} size="sm" />
                      <div className="min-w-0 flex-1">
                        <p className="text-sm font-medium truncate">{p.first_name} {p.last_name}</p>
                        <p className="text-xs text-muted-foreground">{p.username || ""}</p>
                      </div>
                    </button>
                  ))}
                </div>
              )}
            </div>
          </div>
        </div>
      )}

      {showNewGroup && (
        <NewGroupDialog friends={getFriendProfiles()} onCreate={createGroup} onClose={() => setShowNewGroup(false)} />
      )}

      {showGroupSettings && selectedConvo && (
        <GroupSettingsDialog
          convo={selectedConvo}
          profiles={allProfiles}
          onUpdated={loadConversations}
          onClose={() => setShowGroupSettings(false)}
        />
      )}

      {/* Invite to group chat dialog */}
      {inviteToGroupFor && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 p-4" onClick={() => setInviteToGroupFor(null)}>
          <div className="bg-card border border-border rounded-2xl w-full max-w-md p-4" onClick={(e) => e.stopPropagation()}>
            <div className="flex items-center justify-between mb-3">
              <h3 className="font-semibold">Invite to Group Chat</h3>
              <button onClick={() => setInviteToGroupFor(null)} className="p-1 rounded-lg hover:bg-accent"><X className="w-4 h-4" /></button>
            </div>
            {myGroupsForInvite.length === 0 ? (
              <div className="text-center py-6">
                <p className="text-sm text-muted-foreground mb-3">You don't have any groups yet.</p>
                <button onClick={() => { setShowNewGroup(true); setInviteToGroupFor(null); }} className="px-4 py-2 rounded-lg bg-primary text-primary-foreground text-sm font-medium hover:bg-primary/90">
                  Create a new group
                </button>
              </div>
            ) : (
              <div className="space-y-1 max-h-64 overflow-y-auto">
                {myGroupsForInvite.map((g) => {
                  const ids = safeParse(g.participant_ids, []);
                  const targetId = safeParse(inviteToGroupFor.participant_ids, []).find((id) => id !== user.id);
                  const alreadyIn = ids.includes(targetId);
                  return (
                    <button
                      key={g.id}
                      onClick={() => inviteToGroup(g, targetId)}
                      disabled={alreadyIn}
                      className={`flex items-center gap-3 w-full p-2 rounded-lg text-left ${alreadyIn ? "opacity-50 cursor-not-allowed" : "hover:bg-accent"}`}
                    >
                      <div className="w-10 h-10 rounded-full bg-primary/20 flex items-center justify-center shrink-0 overflow-hidden">
                        {g.group_picture_url ? <img src={g.group_picture_url} alt="Group" className="w-full h-full object-cover" /> : <UsersIcon className="w-5 h-5 text-primary" />}
                      </div>
                      <div className="min-w-0 flex-1">
                        <p className="text-sm font-medium truncate">{g.name || "Group Chat"}</p>
                        <p className="text-xs text-muted-foreground">{ids.length} members {alreadyIn && "• Already in group"}</p>
                      </div>
                    </button>
                  );
                })}
              </div>
            )}
          </div>
        </div>
      )}
    </div>
  );
}