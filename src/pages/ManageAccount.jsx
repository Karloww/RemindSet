import React, { useState } from "react";
import { useNavigate } from "react-router-dom";
import { base44 } from "@/api/base44Client";
import { useAuth } from "@/lib/AuthContext";
import { useProfile } from "@/lib/ProfileContext";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Loader2, Save, Trash2, Mail, KeyRound } from "lucide-react";
import { toast } from "@/components/ui/use-toast";

export default function ManageAccount() {
  const { user, logout } = useAuth();
  const { profile, setProfile } = useProfile();
  const navigate = useNavigate();
  const [firstName, setFirstName] = useState(profile?.first_name || "");
  const [lastName, setLastName] = useState(profile?.last_name || "");
  const [username, setUsername] = useState(profile?.username || "");
  const [gender, setGender] = useState(profile?.gender || "");
  const [saving, setSaving] = useState(false);
  const [deleting, setDeleting] = useState(false);
  const [showOnline, setShowOnline] = useState(profile?.show_online ?? true);
  const [allowFriendships, setAllowFriendships] = useState(profile?.allow_friendships ?? true);
  const [appearInSearch, setAppearInSearch] = useState(profile?.appear_in_search ?? true);

  const handleSave = async (e) => {
    e.preventDefault();
    if (!firstName || !lastName || !username) {
      toast({ title: "Please fill in all required fields.", variant: "destructive" });
      return;
    }
    setSaving(true);
    try {
      const updated = await base44.entities.Profile.update(profile.id, { first_name: firstName, last_name: lastName, username, gender: gender || "other", show_online: showOnline, allow_friendships: allowFriendships, appear_in_search: appearInSearch });
      setProfile(updated);
      toast({ title: "Changes saved!", description: "Your profile has been updated." });
    } catch (err) {
      toast({ title: "Save failed", description: err.message, variant: "destructive" });
    } finally {
      setSaving(false);
    }
  };

  const handleDelete = async () => {
    if (!window.confirm("Are you sure you want to delete your profile? This removes your RemindSet data and logs you out. This cannot be undone.")) return;
    setDeleting(true);
    try {
      await base44.entities.Profile.delete(profile.id);
      toast({ title: "Profile deleted", description: "You have been logged out." });
      logout("/");
    } catch (err) {
      toast({ title: "Delete failed", description: err.message, variant: "destructive" });
    } finally {
      setDeleting(false);
    }
  };

  const handleResetPassword = async () => {
    if (!user?.email) return;
    try {
      await base44.auth.resetPasswordRequest(user.email);
      toast({ title: "Reset link sent", description: "Check your email to reset your password." });
    } catch (err) {
      toast({ title: "Failed", description: err.message, variant: "destructive" });
    }
  };

  if (!profile) return null;

  return (
    <div className="space-y-5 max-w-2xl mx-auto">
      <div>
        <h1 className="text-2xl font-bold tracking-tight">Manage Account</h1>
        <p className="text-muted-foreground text-sm mt-1">Update your personal information.</p>
      </div>

      <form onSubmit={handleSave} className="bg-card border border-border rounded-2xl p-6 space-y-5">
        <div className="grid grid-cols-2 gap-3">
          <div className="space-y-2">
            <Label htmlFor="firstName">First Name *</Label>
            <Input id="firstName" value={firstName} onChange={(e) => setFirstName(e.target.value)} required />
          </div>
          <div className="space-y-2">
            <Label htmlFor="lastName">Last Name *</Label>
            <Input id="lastName" value={lastName} onChange={(e) => setLastName(e.target.value)} required />
          </div>
        </div>
        <div className="grid grid-cols-2 gap-3">
          <div className="space-y-2">
            <Label htmlFor="gender">Gender</Label>
            <select id="gender" value={gender} onChange={(e) => setGender(e.target.value)}
              className="flex h-10 w-full rounded-md border border-input bg-background px-3 text-sm">
              <option value="">Select…</option>
              <option value="male">Male</option>
              <option value="female">Female</option>
              <option value="other">Other</option>
            </select>
          </div>
          <div className="space-y-2">
            <Label htmlFor="username">Username *</Label>
            <Input id="username" value={username} onChange={(e) => setUsername(e.target.value)} required />
          </div>
        </div>

        {/* Email (read-only — platform constraint) */}
        <div className="space-y-2">
          <Label htmlFor="email">Email</Label>
          <div className="relative">
            <Mail className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
            <Input id="email" value={user?.email || ""} disabled className="pl-9 bg-muted/50" />
          </div>
          <p className="text-xs text-muted-foreground">Email is managed by your account and cannot be changed here.</p>
        </div>

        {/* Password reset */}
        <div className="flex items-center justify-between gap-3 rounded-xl border border-border p-4">
          <div className="flex items-center gap-3">
            <div className="rounded-lg bg-primary/10 text-primary p-2"><KeyRound className="w-4 h-4" /></div>
            <div>
              <p className="text-sm font-medium">Password</p>
              <p className="text-xs text-muted-foreground">Reset via a link sent to your email.</p>
            </div>
          </div>
          <Button type="button" variant="outline" onClick={handleResetPassword}>Reset</Button>
        </div>

        {/* Privacy Settings */}
        <div className="space-y-3 rounded-xl border border-border p-4">
          <p className="text-sm font-semibold">Privacy Settings</p>
          <label className="flex items-center gap-3 cursor-pointer">
            <input type="checkbox" checked={showOnline} onChange={(e) => setShowOnline(e.target.checked)} className="w-4 h-4" />
            <div>
              <p className="text-sm font-medium">Show online status</p>
              <p className="text-xs text-muted-foreground">If turned off, other users won't see if you're online or offline.</p>
            </div>
          </label>
          <label className="flex items-center gap-3 cursor-pointer">
            <input type="checkbox" checked={allowFriendships} onChange={(e) => setAllowFriendships(e.target.checked)} className="w-4 h-4" />
            <div>
              <p className="text-sm font-medium">Allow friendships</p>
              <p className="text-xs text-muted-foreground">If disabled, other users can't send or accept friend requests from you.</p>
            </div>
          </label>
          <label className="flex items-center gap-3 cursor-pointer">
            <input type="checkbox" checked={appearInSearch} onChange={(e) => setAppearInSearch(e.target.checked)} className="w-4 h-4" />
            <div>
              <p className="text-sm font-medium">Appear in Search</p>
              <p className="text-xs text-muted-foreground">If disabled, other users won't find your profile in the search bar.</p>
            </div>
          </label>
        </div>

        <Button type="submit" className="w-full h-12" disabled={saving}>
          {saving ? <><Loader2 className="w-4 h-4 mr-2 animate-spin" />Saving…</> : <><Save className="w-4 h-4 mr-2" /> Save Changes</>}
        </Button>
      </form>

      <div className="bg-destructive/5 border border-destructive/20 rounded-2xl p-6">
        <h3 className="font-semibold text-destructive">Danger Zone</h3>
        <p className="text-sm text-muted-foreground mt-1 mb-4">Permanently delete your RemindSet profile and all associated data.</p>
        <Button variant="destructive" onClick={handleDelete} disabled={deleting} className="w-full sm:w-auto">
          {deleting ? <><Loader2 className="w-4 h-4 mr-2 animate-spin" />Deleting…</> : <><Trash2 className="w-4 h-4 mr-2" /> Delete Account</>}
        </Button>
      </div>
    </div>
  );
}