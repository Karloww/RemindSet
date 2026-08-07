import React, { useState, useEffect } from "react";
import { Outlet, Navigate, Link, useLocation, useNavigate } from "react-router-dom";
import { Bell, Home, School, Calendar, FolderOpen, Settings, Users, MessageCircle } from "lucide-react";
import { Image } from "@/components/ui/image";
import { base44 } from "@/api/base44Client";
import { useProfile } from "@/lib/ProfileContext";
import { useAuth } from "@/lib/AuthContext";
import ProfileAvatar from "@/components/ProfileAvatar";
import SearchBar from "@/components/SearchBar";

const routeTitles = {
  "/": "Home",
  "/classrooms": "Classes",
  "/calendar": "Calendar",
  "/resources": "Resources",
  "/users": "My Circle",
  "/messages": "Messages",
  "/profile": "Profile",
  "/settings": "Settings",
  "/announcements": "Announcements",
  "/notifications": "Notifications",
  "/notification-settings": "Notification Settings",
  "/manage-account": "Manage Account",
  "/edit-profile": "Edit Profile",
  "/customize-theme": "Customize Theme",
  "/how-to-use": "How to Use",
};

export default function AppLayout() {
  const { user } = useAuth();
  const { profile, loading } = useProfile();
  const navigate = useNavigate();
  const location = useLocation();
  const [unreadCount, setUnreadCount] = useState(0);
  const [unreadMessages, setUnreadMessages] = useState(0);

  useEffect(() => {
    if (!user) return;
    let active = true;
    const loadUnread = async () => {
      try {
        const data = await base44.entities.Notification.filter({ user_id: user.id, read: false }, "-created_date", 50);
        const now = new Date().toISOString();
        if (active) {
          setUnreadCount((data || []).filter((n) => !n.scheduled_date || n.scheduled_date <= now).length);
        }
      } catch (e) { /* ignore */ }
    };
    loadUnread();
    const unsubscribe = base44.entities.Notification.subscribe(() => loadUnread());
    return () => { active = false; unsubscribe?.(); };
  }, [user]);

  useEffect(() => {
    if (!user) return;
    let active = true;
    const loadUnreadMessages = async () => {
      try {
        const convos = await base44.entities.Conversation.list("-last_message_at", 200);
        const myConvos = (convos || []).filter((c) => {
          try { return JSON.parse(c.participant_ids || "[]").includes(user.id); } catch { return false; }
        });
        const convoIds = myConvos.map((c) => c.id);
        if (convoIds.length === 0) { if (active) setUnreadMessages(0); return; }
        const msgs = await base44.entities.Message.filter({ read: false }, "-created_date", 200);
        const unread = (msgs || []).filter((m) => convoIds.includes(m.conversation_id) && m.sender_id !== user.id);
        if (active) setUnreadMessages(unread.length);
      } catch (e) { /* ignore */ }
    };
    loadUnreadMessages();
    const unsubscribe = base44.entities.Message.subscribe(() => loadUnreadMessages());
    return () => { active = false; unsubscribe?.(); };
  }, [user]);

  if (user?.role === "admin") return <Navigate to="/admin" replace />;
  if (loading) return (
    <div className="fixed inset-0 flex items-center justify-center">
      <div className="w-8 h-8 border-4 border-primary/20 border-t-primary rounded-full animate-spin" />
    </div>
  );
  if (!profile) return <Navigate to="/onboarding" replace />;

  const isTeacher = profile.account_type === "teacher";

  const navItems = [
    { label: "Home", icon: Home, to: "/", bottomNav: true },
    { label: "Classes", icon: School, to: "/classrooms", bottomNav: true },
    { label: "Calendar", icon: Calendar, to: "/calendar", bottomNav: true },
    { label: "Resources", icon: FolderOpen, to: "/resources", bottomNav: true },
    { label: "My Circle", icon: Users, to: "/users", bottomNav: true },
  ];

  const isActive = (to) => (to === "/" ? location.pathname === "/" : location.pathname.startsWith(to));

  const pageTitle =
    routeTitles[location.pathname] ||
    (location.pathname.startsWith("/classrooms/") ? "Classes" : location.pathname.startsWith("/users/") ? "Profile" : location.pathname.startsWith("/messages") ? "Messages" : "RemindSet");

  return (
    <div className="min-h-screen flex bg-muted/30">
      <div id="app-background-layer" className="fixed inset-0 -z-10 pointer-events-none" />

      {/* Dark Sidebar (desktop) */}
      <aside className="hidden md:flex fixed left-0 top-0 bottom-0 w-56 flex-col bg-slate-900 text-white z-40">
        <Link to="/" className="flex items-center gap-2 h-16 border-b border-white/10 px-4 hover:bg-white/5 transition-colors">
          <Image
            src="https://media.base44.com/images/public/6a6892025dd8bd8fe989ee70/3ae6b97ea_RemindSetlogo.png"
            alt="RemindSet"
            fittingType="fit"
            className="h-8 w-8 shrink-0"
          />
          <span className="font-bold text-white text-lg">RemindSet</span>
        </Link>

        <nav className="flex-1 flex flex-col gap-1 p-3 mt-2 overflow-y-auto">
          {navItems.map((item) => (
            <Link
              key={item.to}
              to={item.to}
              className={`flex items-center gap-3 px-3 py-2.5 rounded-xl text-sm font-medium transition-colors ${
                isActive(item.to) ? "bg-white/15 text-white" : "text-white/60 hover:text-white hover:bg-white/10"
              }`}
            >
              <item.icon className="w-5 h-5" />
              {item.label}
            </Link>
          ))}
        </nav>

        <div className="p-3 border-t border-white/10">
          <Link
            to="/settings"
            className={`flex items-center gap-3 px-3 py-2.5 rounded-xl text-sm font-medium transition-colors ${
              isActive("/settings") ? "bg-white/15 text-white" : "text-white/60 hover:text-white hover:bg-white/10"
            }`}
          >
            <Settings className="w-5 h-5" />
            Settings
          </Link>
        </div>
      </aside>

      {/* Main area */}
      <div className="flex-1 flex flex-col md:ml-56 min-h-screen">
        {/* Top header */}
        <header className="sticky top-0 z-30 bg-background/95 backdrop-blur-md border-b border-border h-16 flex items-center px-4 gap-3">
          {/* Settings (mobile only) — left side */}
          <button
            onClick={() => navigate("/settings")}
            className="md:hidden p-2 -ml-2 rounded-lg hover:bg-accent transition-colors"
            aria-label="Settings"
          >
            <Settings className="w-5 h-5" />
          </button>
          <Link to="/" className="md:hidden flex items-center gap-2">
            <Image
              src="https://media.base44.com/images/public/6a6892025dd8bd8fe989ee70/3ae6b97ea_RemindSetlogo.png"
              alt="RemindSet"
              fittingType="fit"
              className="h-6 w-6"
            />
            <span className="font-bold text-base">RemindSet</span>
          </Link>
          <h1 className="font-semibold text-base hidden sm:block">{pageTitle}</h1>
          <div className="flex-1" />

          <SearchBar />

          {/* Messages */}
          <button
            onClick={() => navigate("/messages")}
            className="relative p-2 rounded-lg hover:bg-accent transition-colors"
            aria-label="Messages"
          >
            <MessageCircle className="w-5 h-5" />
            {unreadMessages > 0 && (
              <span className="absolute top-1 right-1 min-w-[16px] h-4 px-1 bg-destructive text-destructive-foreground text-[10px] font-bold rounded-full flex items-center justify-center">
                {unreadMessages > 9 ? "9+" : unreadMessages}
              </span>
            )}
          </button>

          {/* Notifications */}
          <button
            onClick={() => navigate("/notifications")}
            className="relative p-2 rounded-lg hover:bg-accent transition-colors"
            aria-label="Notifications"
          >
            <Bell className="w-5 h-5" />
            {unreadCount > 0 && (
              <span className="absolute top-1 right-1 min-w-[16px] h-4 px-1 bg-destructive text-destructive-foreground text-[10px] font-bold rounded-full flex items-center justify-center">
                {unreadCount > 9 ? "9+" : unreadCount}
              </span>
            )}
          </button>

          {/* User profile */}
          <button
            onClick={() => navigate("/profile")}
            className="flex items-center gap-2 pl-2 pr-3 py-1.5 rounded-xl hover:bg-accent transition-colors"
          >
            <ProfileAvatar profile={profile} size="sm" />
            <span className="hidden sm:block text-sm font-medium max-w-[120px] truncate">
              {profile.first_name} {profile.last_name}
            </span>
          </button>
        </header>

        {/* Page content */}
        <main className="flex-1 w-full max-w-6xl mx-auto px-4 md:px-6 py-6 pb-28 md:pb-8">
          <Outlet />
        </main>
      </div>

      {/* Bottom nav (mobile only) */}
      <nav className="md:hidden fixed bottom-0 inset-x-0 z-30 bg-slate-900 text-white border-t border-white/10">
        <div className="flex items-center justify-around h-16 w-full">
          {navItems.filter((item) => item.bottomNav).map((item) => (
            <Link
              key={item.to}
              to={item.to}
              className={`flex flex-col items-center justify-center gap-0.5 py-2 flex-1 transition-colors ${
                isActive(item.to) ? "text-white" : "text-white/50"
              }`}
            >
              <item.icon className="w-5 h-5" />
              <span className="text-[10px] font-medium">{item.label}</span>
            </Link>
          ))}
        </div>
      </nav>
    </div>
  );
}