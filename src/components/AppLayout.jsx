import React from "react";
import { Outlet, Navigate, Link, useNavigate } from "react-router-dom";
import { Menu, Bell, Home, School, ShoppingBag, User } from "lucide-react";
import { useProfile } from "@/lib/ProfileContext";
import { useAuth } from "@/lib/AuthContext";
import ProfileAvatar from "@/components/ProfileAvatar";

export default function AppLayout() {
  const { user } = useAuth();
  const { profile, loading } = useProfile();
  const navigate = useNavigate();

  if (user?.role === "admin") {
    return <Navigate to="/admin" replace />;
  }

  if (loading) {
    return (
      <div className="fixed inset-0 flex items-center justify-center">
        <div className="w-8 h-8 border-4 border-primary/20 border-t-primary rounded-full animate-spin"></div>
      </div>
    );
  }

  if (!profile) {
    return <Navigate to="/onboarding" replace />;
  }

  const isTeacher = profile.account_type === "teacher";

  const navItems = [
    { label: "Home", icon: Home, to: "/" },
    { label: "Classes", icon: School, to: "/classrooms" },
    { label: "Shop", icon: ShoppingBag, to: "/shop" },
    { label: "Profile", icon: User, to: "/profile" },
  ];
  if (isTeacher) {
    // Teachers don't use the Shop — themes are free for them.
    navItems.splice(navItems.findIndex((n) => n.to === "/shop"), 1);
  }

  return (
    <div className="min-h-screen flex flex-col relative">
      <div id="app-background-layer" className="fixed inset-0 -z-10 pointer-events-none" />

      {/* Top bar */}
      <header className="sticky top-0 z-30 bg-background/80 backdrop-blur-md border-b border-border">
        <div className="max-w-5xl mx-auto flex items-center justify-between h-16 px-4">
          <button
            onClick={() => navigate("/settings")}
            className="p-2 -ml-2 rounded-lg hover:bg-accent transition-colors"
            aria-label="Settings"
          >
            <Menu className="w-5 h-5" />
          </button>
          <Link to="/" className="flex items-center gap-1 font-bold text-lg tracking-tight">
            Remind<span className="text-primary">Set</span>
          </Link>
          <button
            onClick={() => navigate("/notifications")}
            className="p-2 -mr-2 rounded-lg hover:bg-accent transition-colors relative"
            aria-label="Notifications"
          >
            <Bell className="w-5 h-5" />
          </button>
        </div>
      </header>

      {/* Main content */}
      <main className="flex-1 w-full max-w-5xl mx-auto px-4 py-6 pb-28 md:pb-8 md:ml-56">
        <Outlet />
      </main>

      {/* Bottom nav (mobile) */}
      <nav className="md:hidden fixed bottom-0 inset-x-0 z-30 bg-background/90 backdrop-blur-md border-t border-border">
        <div className="flex items-center justify-around h-16">
          {navItems.map((item) => (
            <button
              key={item.to}
              onClick={() => navigate(item.to)}
              className="flex flex-col items-center justify-center gap-0.5 text-muted-foreground hover:text-primary transition-colors px-2 py-1"
            >
              <item.icon className="w-5 h-5" />
              <span className="text-[10px] font-medium">{item.label}</span>
            </button>
          ))}
        </div>
      </nav>

      {/* Desktop side nav */}
      <nav className="hidden md:flex fixed left-0 top-16 bottom-0 w-56 flex-col border-r border-border bg-background/60 backdrop-blur-sm p-4 gap-1">
        {navItems.map((item) => (
          <button
            key={item.to}
            onClick={() => navigate(item.to)}
            className="flex items-center gap-3 px-3 py-2.5 rounded-lg text-sm font-medium text-muted-foreground hover:text-foreground hover:bg-accent transition-colors"
          >
            <item.icon className="w-5 h-5" />
            {item.label}
          </button>
        ))}
        <div className="mt-auto flex items-center gap-3 p-3 rounded-lg bg-accent/50">
          <ProfileAvatar profile={profile} size="sm" />
          <div className="min-w-0">
            <p className="text-sm font-medium truncate">{profile.first_name} {profile.last_name}</p>
            <p className="text-xs text-muted-foreground">{profile.points} pts</p>
          </div>
        </div>
      </nav>
    </div>
  );
}