import React, { useState } from "react";
import { X, Camera, Link2, LogOut, UserMinus, UserCheck, Crown, Copy, Check, Loader2 } from "lucide-react";
import { base44 } from "@/api/base44Client";
import { useAuth } from "@/lib/AuthContext";
import { toast } from "@/components/ui/use-toast";
import ProfileAvatar from "@/components/ProfileAvatar";

export default function GroupSettingsDialog({ convo, profiles, onUpdated, onClose }) {
  const { user } = useAuth();
  const [name, setName] = useState(convo.name || "");
  const [savingName, setSavingName] = useState(false);
  const [uploadingPic, setUploadingPic] = useState(false);
  const [copied, setCopied] = useState(false);
  const [leaving, setLeaving] = useState(false);
  const [kicking, setKicking] = useState(null);
  const [promoting, setPromoting] = useState(null);

  const participantIds = safeParse(convo.participant_ids, []);
  const participantNames = safeParse(convo.participant_names, []);
  const adminIds = safeParse(convo.admin_ids, []);
  const isAdmin = adminIds.includes(user?.id);
  const isCreator = convo.created_by_id === user?.id;

  const getProfile = (uid) => profiles.find((p) => p.created_by_id === uid);

  const saveName = async () => {
    if (!name.trim()) return;
    setSavingName(true);
    try {
      await base44.entities.Conversation.update(convo.id, { name: name.trim() });
      toast({ title: "Group name updated" });
      onUpdated?.();
    } catch (e) {
      toast({ title: "Failed", variant: "destructive" });
    } finally { setSavingName(false); }
  };

  const handlePic = async (e) => {
    const file = e.target.files?.[0];
    if (!file) return;
    setUploadingPic(true);
    try {
      const res = await base44.integrations.Core.UploadFile({ file });
      await base44.entities.Conversation.update(convo.id, { group_picture_url: res.file_url });
      toast({ title: "Group picture updated" });
      onUpdated?.();
    } catch (err) {
      toast({ title: "Upload failed", variant: "destructive" });
    } finally { setUploadingPic(false); }
  };

  const generateLink = async () => {
    const token = convo.invite_link || Math.random().toString(36).slice(2, 10);
    try {
      if (!convo.invite_link) {
        await base44.entities.Conversation.update(convo.id, { invite_link: token });
        onUpdated?.();
      }
      const url = `${window.location.origin}/messages?join=${token}`;
      navigator.clipboard?.writeText(url);
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
      toast({ title: "Invite link copied!" });
    } catch (e) {
      toast({ title: "Failed", variant: "destructive" });
    }
  };

  const leaveGroup = async () => {
    if (!window.confirm("Leave this group chat?")) return;
    setLeaving(true);
    try {
      const remaining = participantIds.filter((id) => id !== user.id);
      if (remaining.length === 0) {
        await base44.entities.Message.deleteMany({ conversation_id: convo.id });
        await base44.entities.Conversation.delete(convo.id);
        toast({ title: "Group deleted (no members left)" });
        onClose?.();
        window.location.href = "/messages";
        return;
      }
      const newAdmins = adminIds.filter((id) => id !== user.id);
      const newNames = participantNames.filter((_, i) => participantIds[i] !== user.id);
      // If no admins remain, transfer to earliest remaining member
      if (newAdmins.length === 0) {
        newAdmins.push(remaining[0]);
      }
      await base44.entities.Conversation.update(convo.id, {
        participant_ids: JSON.stringify(remaining),
        participant_names: JSON.stringify(newNames),
        admin_ids: JSON.stringify(newAdmins),
      });
      toast({ title: "You left the group" });
      onClose?.();
      window.location.href = "/messages";
    } catch (e) {
      toast({ title: "Failed to leave", variant: "destructive" });
    } finally { setLeaving(false); }
  };

  const kickMember = async (uid, uname) => {
    if (!window.confirm(`Remove ${uname} from the group?`)) return;
    setKicking(uid);
    try {
      const remaining = participantIds.filter((id) => id !== uid);
      const newNames = participantNames.filter((_, i) => participantIds[i] !== uid);
      const newAdmins = adminIds.filter((id) => id !== uid);
      await base44.entities.Conversation.update(convo.id, {
        participant_ids: JSON.stringify(remaining),
        participant_names: JSON.stringify(newNames),
        admin_ids: JSON.stringify(newAdmins),
      });
      toast({ title: `${uname} removed` });
      onUpdated?.();
    } catch (e) {
      toast({ title: "Failed", variant: "destructive" });
    } finally { setKicking(null); }
  };

  const toggleAdmin = async (uid) => {
    setPromoting(uid);
    try {
      const newAdmins = adminIds.includes(uid)
        ? adminIds.filter((id) => id !== uid)
        : [...adminIds, uid];
      await base44.entities.Conversation.update(convo.id, { admin_ids: JSON.stringify(newAdmins) });
      toast({ title: adminIds.includes(uid) ? "Admin removed" : "Promoted to admin" });
      onUpdated?.();
    } catch (e) {
      toast({ title: "Failed", variant: "destructive" });
    } finally { setPromoting(null); }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 p-4" onClick={onClose}>
      <div className="bg-card border border-border rounded-2xl w-full max-w-md p-5 max-h-[85vh] overflow-y-auto" onClick={(e) => e.stopPropagation()}>
        <div className="flex items-center justify-between mb-4">
          <h3 className="font-semibold">Group Settings</h3>
          <button onClick={onClose} className="p-1 rounded-lg hover:bg-accent"><X className="w-4 h-4" /></button>
        </div>

        {/* Group picture */}
        <div className="flex flex-col items-center gap-2 mb-4">
          <div className="relative">
            <div className="w-20 h-20 rounded-full bg-primary/20 flex items-center justify-center overflow-hidden">
              {convo.group_picture_url ? (
                <img src={convo.group_picture_url} alt="Group" className="w-full h-full object-cover" />
              ) : (
                <span className="text-2xl font-bold text-primary">{(name || "G").charAt(0).toUpperCase()}</span>
              )}
            </div>
            {isAdmin && (
              <label className="absolute bottom-0 right-0 w-7 h-7 rounded-full bg-primary text-primary-foreground flex items-center justify-center cursor-pointer hover:bg-primary/90 shadow">
                {uploadingPic ? <Loader2 className="w-3.5 h-3.5 animate-spin" /> : <Camera className="w-3.5 h-3.5" />}
                <input type="file" accept="image/*" className="hidden" onChange={handlePic} />
              </label>
            )}
          </div>
        </div>

        {/* Group name */}
        {isAdmin ? (
          <div className="mb-4 space-y-2">
            <label className="text-sm font-medium">Group Name</label>
            <div className="flex gap-2">
              <input
                value={name}
                onChange={(e) => setName(e.target.value)}
                className="flex-1 h-10 px-3 rounded-lg bg-muted/50 border border-border text-sm focus:outline-none focus:ring-1 focus:ring-ring"
              />
              <button onClick={saveName} disabled={savingName || !name.trim()} className="px-4 rounded-lg bg-primary text-primary-foreground text-sm font-medium hover:bg-primary/90 disabled:opacity-50">
                {savingName ? <Loader2 className="w-4 h-4 animate-spin" /> : "Save"}
              </button>
            </div>
          </div>
        ) : (
          <div className="mb-4 text-center">
            <p className="font-semibold">{name}</p>
          </div>
        )}

        {/* Invite link */}
        <div className="mb-4">
          <button onClick={generateLink} className="w-full flex items-center gap-2 p-3 rounded-lg border border-border hover:bg-accent transition-colors text-sm">
            <Link2 className="w-4 h-4 text-primary" />
            <span className="flex-1 text-left">Invite via link</span>
            {copied ? <Check className="w-4 h-4 text-emerald-500" /> : <Copy className="w-4 h-4 text-muted-foreground" />}
          </button>
        </div>

        {/* Members */}
        <div className="mb-2">
          <p className="text-sm font-medium mb-2">Members ({participantIds.length})</p>
          <div className="space-y-1 max-h-48 overflow-y-auto">
            {participantIds.map((uid) => {
              const p = getProfile(uid);
              const uname = p ? `${p.first_name} ${p.last_name}` : (participantNames[participantIds.indexOf(uid)] || "User");
              const memberIsAdmin = adminIds.includes(uid);
              return (
                <div key={uid} className="flex items-center gap-2 p-2 rounded-lg hover:bg-accent/50">
                  <ProfileAvatar profile={p || {}} size="sm" />
                  <div className="min-w-0 flex-1">
                    <p className="text-sm font-medium truncate">{uname} {uid === user.id && "(You)"}</p>
                    {memberIsAdmin && <span className="text-xs text-primary flex items-center gap-0.5"><Crown className="w-3 h-3" /> Admin</span>}
                  </div>
                  {isAdmin && uid !== user.id && (
                    <div className="flex gap-1 shrink-0">
                      <button
                        onClick={() => toggleAdmin(uid)}
                        disabled={promoting === uid}
                        className="p-1.5 rounded-lg hover:bg-accent"
                        title={memberIsAdmin ? "Remove admin" : "Make admin"}
                      >
                        {promoting === uid ? <Loader2 className="w-3.5 h-3.5 animate-spin" /> : <UserCheck className={`w-3.5 h-3.5 ${memberIsAdmin ? "text-primary" : "text-muted-foreground"}`} />}
                      </button>
                      <button
                        onClick={() => kickMember(uid, uname)}
                        disabled={kicking === uid}
                        className="p-1.5 rounded-lg hover:bg-destructive/10 text-destructive"
                        title="Kick"
                      >
                        {kicking === uid ? <Loader2 className="w-3.5 h-3.5 animate-spin" /> : <UserMinus className="w-3.5 h-3.5" />}
                      </button>
                    </div>
                  )}
                </div>
              );
            })}
          </div>
        </div>

        {/* Leave group */}
        <button
          onClick={leaveGroup}
          disabled={leaving}
          className="w-full mt-2 flex items-center justify-center gap-2 p-3 rounded-lg border border-destructive/30 text-destructive hover:bg-destructive/10 transition-colors text-sm font-medium"
        >
          {leaving ? <Loader2 className="w-4 h-4 animate-spin" /> : <LogOut className="w-4 h-4" />}
          Leave Group
        </button>
      </div>
    </div>
  );
}

function safeParse(str, fallback) {
  try { return JSON.parse(str || JSON.stringify(fallback)); } catch { return fallback; }
}