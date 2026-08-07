import React from "react";
import { useNavigate } from "react-router-dom";
import { useAuth } from "@/lib/AuthContext";
import { useProfile } from "@/lib/ProfileContext";
import { HelpCircle, Palette, UserCog, LogOut, ChevronRight, BookOpenCheck, Bell } from "lucide-react";
import ProfileAvatar from "@/components/ProfileAvatar";
import RoleBadge from "@/components/RoleBadge";

export default function Settings() {
  const navigate = useNavigate();
  const { user, logout } = useAuth();
  const { profile } = useProfile();

  const items = [
    { label: "How to Use", desc: "Learn how RemindSet works", icon: HelpCircle, to: "/how-to-use" },
    { label: "Customize Theme", desc: "Color, background, cover & icon", icon: Palette, to: "/customize-theme" },
    { label: "Manage Account", desc: "Edit your profile & security", icon: UserCog, to: "/manage-account" },
    { label: "Notification Settings", desc: "Choose which notifications you receive", icon: Bell, to: "/notification-settings" },
  ];

  return (
    <div className="space-y-6 max-w-2xl mx-auto">
      <div>
        <h1 className="text-2xl font-bold tracking-tight">Settings</h1>
        <p className="text-muted-foreground text-sm mt-1">Manage your account and preferences.</p>
      </div>

      {/* Profile card */}
      <div className="bg-card border border-border rounded-2xl p-5 flex items-center gap-4">
        <ProfileAvatar profile={profile} user={user} size="lg" />
        <div className="min-w-0 flex-1">
          <p className="font-semibold truncate">{profile?.first_name} {profile?.last_name}</p>
          <p className="text-sm text-muted-foreground truncate">@{profile?.username}</p>
          <div className="mt-1.5"><RoleBadge accountType={profile?.account_type} /></div>
        </div>
        {profile?.account_type !== "teacher" && (
          <div className="text-right">
            <p className="text-xs text-muted-foreground">Coins</p>
            <p className="text-xl font-bold text-primary">{profile?.points || 0}</p>
          </div>
        )}
      </div>

      {/* Menu */}
      <div className="bg-card border border-border rounded-2xl overflow-hidden">
        {items.map((item, i) => (
          <button key={item.to} onClick={() => navigate(item.to)}
            className={`w-full flex items-center gap-4 p-4 hover:bg-accent transition-colors ${i > 0 ? "border-t border-border" : ""}`}>
            <div className="rounded-lg bg-primary/10 text-primary p-2.5"><item.icon className="w-5 h-5" /></div>
            <div className="flex-1 text-left">
              <p className="font-medium">{item.label}</p>
              <p className="text-sm text-muted-foreground">{item.desc}</p>
            </div>
            <ChevronRight className="w-5 h-5 text-muted-foreground" />
          </button>
        ))}
      </div>

      {/* Logout */}
      <button onClick={() => logout("/login")}
        className="w-full flex items-center gap-4 bg-card border border-border rounded-2xl p-4 hover:bg-destructive/5 hover:border-destructive/30 transition-colors">
        <div className="rounded-lg bg-destructive/10 text-destructive p-2.5"><LogOut className="w-5 h-5" /></div>
        <div className="flex-1 text-left">
          <p className="font-medium text-destructive">Logout</p>
          <p className="text-sm text-muted-foreground">Sign out of your account</p>
        </div>
      </button>

      <div className="text-center text-xs text-muted-foreground flex items-center justify-center gap-1.5 pt-2">
        <BookOpenCheck className="w-3.5 h-3.5" /> RemindSet • Never miss a lesson
      </div>
    </div>
  );
}