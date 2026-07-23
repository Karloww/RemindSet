import React, { useState } from "react";
import { useNavigate } from "react-router-dom";
import { useProfile } from "@/lib/ProfileContext";
import { base44 } from "@/api/base44Client";
import { Button } from "@/components/ui/button";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { ArrowLeft, Loader2, Save, Upload, X, ImageIcon, User } from "lucide-react";
import { toast } from "@/components/ui/use-toast";
import ProfileAvatar from "@/components/ProfileAvatar";
import { COVER_PHOTOS } from "@/lib/themes";

export default function EditProfile() {
  const { profile, setProfile } = useProfile();
  const navigate = useNavigate();
  const [bio, setBio] = useState(profile?.bio || "");
  const [profilePic, setProfilePic] = useState(profile?.profile_picture_url || "");
  const [coverUrl, setCoverUrl] = useState(profile?.cover_photo_url || "");
  const [uploadingPic, setUploadingPic] = useState(false);
  const [uploadingCover, setUploadingCover] = useState(false);
  const [saving, setSaving] = useState(false);

  if (!profile) return null;

  const handleProfilePic = async (e) => {
    const file = e.target.files?.[0];
    if (!file) return;
    setUploadingPic(true);
    try {
      const res = await base44.integrations.Core.UploadFile({ file });
      setProfilePic(res.file_url);
    } catch (err) {
      toast({ title: "Upload failed", description: err.message, variant: "destructive" });
    } finally {
      setUploadingPic(false);
    }
  };

  const handleCover = async (e) => {
    const file = e.target.files?.[0];
    if (!file) return;
    setUploadingCover(true);
    try {
      const res = await base44.integrations.Core.UploadFile({ file });
      setCoverUrl(res.file_url);
    } catch (err) {
      toast({ title: "Upload failed", description: err.message, variant: "destructive" });
    } finally {
      setUploadingCover(false);
    }
  };

  const handleSave = async (e) => {
    e.preventDefault();
    setSaving(true);
    try {
      const updated = await base44.entities.Profile.update(profile.id, {
        bio,
        profile_picture_url: profilePic,
        cover_photo_url: coverUrl,
      });
      setProfile(updated);
      toast({ title: "Changes saved!", description: "Your profile has been updated." });
      navigate("/profile");
    } catch (err) {
      toast({ title: "Save failed", description: err.message, variant: "destructive" });
    } finally {
      setSaving(false);
    }
  };

  const coverPreview = coverUrl || (COVER_PHOTOS[profile.selected_cover_photo] || COVER_PHOTOS.default).value;

  return (
    <div className="space-y-5 max-w-2xl mx-auto">
      <button onClick={() => navigate("/profile")} className="inline-flex items-center gap-1.5 text-sm text-muted-foreground hover:text-foreground">
        <ArrowLeft className="w-4 h-4" /> Back to profile
      </button>

      <div>
        <h1 className="text-2xl font-bold tracking-tight">Edit Profile</h1>
        <p className="text-muted-foreground text-sm mt-1">Update your bio, profile picture, and cover photo.</p>
      </div>

      <form onSubmit={handleSave} className="bg-card border border-border rounded-2xl p-6 space-y-6">
        {/* Profile Picture */}
        <div className="space-y-3">
          <Label className="flex items-center gap-2"><User className="w-4 h-4" /> Profile Picture</Label>
          <div className="flex items-center gap-4">
            <div className="rounded-full ring-4 ring-card overflow-hidden">
              {profilePic ? (
                <img src={profilePic} alt="Profile" className="w-24 h-24 rounded-full object-cover" />
              ) : (
                <ProfileAvatar profile={profile} size="xl" />
              )}
            </div>
            <div className="flex flex-col gap-2">
              <label className="inline-flex items-center gap-2 text-sm font-medium border border-border rounded-lg px-3 py-2 hover:bg-accent cursor-pointer transition-colors">
                {uploadingPic ? <Loader2 className="w-4 h-4 animate-spin" /> : <Upload className="w-4 h-4" />}
                {uploadingPic ? "Uploading…" : "Upload Photo"}
                <input type="file" accept="image/*" className="hidden" onChange={handleProfilePic} disabled={uploadingPic} />
              </label>
              {profilePic && (
                <button type="button" onClick={() => setProfilePic("")} className="inline-flex items-center gap-1 text-xs text-destructive hover:underline">
                  <X className="w-3 h-3" /> Remove
                </button>
              )}
            </div>
          </div>
        </div>

        {/* Cover Photo */}
        <div className="space-y-3">
          <Label className="flex items-center gap-2"><ImageIcon className="w-4 h-4" /> Cover Photo</Label>
          <div className="rounded-xl overflow-hidden border border-border">
            <div className="h-40 sm:h-48 bg-cover bg-center" style={coverUrl ? { backgroundImage: `url('${coverUrl}')` } : { background: coverPreview }} />
          </div>
          <div className="flex gap-2">
            <label className="inline-flex items-center gap-2 text-sm font-medium border border-border rounded-lg px-3 py-2 hover:bg-accent cursor-pointer transition-colors">
              {uploadingCover ? <Loader2 className="w-4 h-4 animate-spin" /> : <Upload className="w-4 h-4" />}
              {uploadingCover ? "Uploading…" : "Upload Cover"}
              <input type="file" accept="image/*" className="hidden" onChange={handleCover} disabled={uploadingCover} />
            </label>
            {coverUrl && (
              <button type="button" onClick={() => setCoverUrl("")} className="inline-flex items-center gap-1 text-xs text-destructive hover:underline px-3 py-2">
                <X className="w-3.5 h-3.5" /> Remove
              </button>
            )}
          </div>
        </div>

        {/* Bio */}
        <div className="space-y-2">
          <Label htmlFor="bio">Bio</Label>
          <Textarea id="bio" value={bio} onChange={(e) => setBio(e.target.value)} rows={4}
            placeholder="Tell us a bit about yourself…" />
        </div>

        <Button type="submit" className="w-full h-12" disabled={saving}>
          {saving ? <><Loader2 className="w-4 h-4 mr-2 animate-spin" />Saving…</> : <><Save className="w-4 h-4 mr-2" /> Save Changes</>}
        </Button>
      </form>
    </div>
  );
}