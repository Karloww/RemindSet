import React from "react";
import { Outlet, Navigate, Link, useNavigate, useLocation } from "react-router-dom";
import { LayoutDashboard, Users, ShoppingBag, Bell, Shield, Globe, LogOut, Flag } from "lucide-react";
import { useAuth } from "@/lib/AuthContext";

export default function AdminLayout() {
  const { user, logout } = useAuth();
  const navigate = useNavigate();
  const location = useLocation();

  if (user?.role !== "admin") return <Navigate to="/" replace />;

  const navItems = [
    { label: "Dashboard", icon: LayoutDashboard, to: "/admin" },
    { label: "Users", icon: Users, to: "/admin/users" },
    { label: "Shop Items", icon: ShoppingBag, to: "/admin/shop" },
    { label: "Announcement", icon: Bell, to: "/admin/notifications" },
    { label: "Reports", icon: Flag, to: "/admin/reports" },
    { label: "Maintenance", icon: Shield, to: "/admin/maintenance" },
    { label: "Website", icon: Globe, to: "/admin/website" },
  ];

  const isActive = (to) => location.pathname === to;

  return (
    <div className="min-h-screen flex bg-muted/30">
      {/* Dark Sidebar (desktop) */}
      <aside className="hidden md:flex fixed left-0 top-0 bottom-0 w-56 flex-col bg-slate-900 text-white z-40">
        {/* Logo + RemindSet text */}
        <Link to="/admin" className="flex items-center justify-center gap-2 h-16 border-b border-white/10 px-3 hover:bg-white/5 transition-colors">
          <div className="w-9 h-9 rounded-xl bg-primary flex items-center justify-center shrink-0">
            <Shield className="w-5 h-5 text-primary-foreground" />
          </div>
          <span className="font-bold text-lg tracking-tight">RemindSet</span>
        </Link>

        <nav className="flex-1 flex flex-col gap-1 p-3 mt-2">
          {navItems.map((item) => (
            <button
              key={item.to}
              onClick={() => navigate(item.to)}
              className={`flex items-center gap-3 px-3 py-2.5 rounded-xl text-sm font-medium transition-colors text-left ${
                isActive(item.to) ? "bg-white/15 text-white" : "text-white/60 hover:text-white hover:bg-white/10"
              }`}
            >
              <item.icon className="w-5 h-5" />
              {item.label}
            </button>
          ))}
        </nav>

        <div className="p-3 border-t border-white/10 space-y-1">
          <div className="px-3 py-2">
            <p className="text-sm font-medium truncate text-white">{user?.email}</p>
            <div className="flex items-center gap-1">
              <Shield className="w-3 h-3 text-primary" />
              <p className="text-xs text-white/50">Administrator</p>
            </div>
          </div>
          <button
            onClick={() => logout()}
            className="flex items-center gap-3 px-3 py-2.5 rounded-xl text-sm font-medium text-white/60 hover:text-white hover:bg-white/10 transition-colors w-full"
          >
            <LogOut className="w-5 h-5" />
            Logout
          </button>
        </div>
      </aside>

      {/* Main area */}
      <div className="flex-1 flex flex-col md:ml-56 min-h-screen">
        {/* Top header */}
        <header className="sticky top-0 z-30 bg-background/95 backdrop-blur-md border-b border-border h-16 flex items-center px-4 gap-3">
          <div className="flex items-center gap-2">
            <Shield className="w-5 h-5 text-primary" />
            <h1 className="font-semibold text-base hidden sm:block">Admin Panel</h1>
          </div>
          <div className="flex-1" />
          <button
            onClick={() => logout()}
            className="md:hidden p-2 rounded-lg hover:bg-accent transition-colors"
            aria-label="Logout"
          >
            <LogOut className="w-5 h-5" />
          </button>
        </header>

        {/* Page content */}
        <main className="flex-1 w-full max-w-5xl mx-auto px-4 md:px-6 py-6 pb-28 md:pb-8">
          <Outlet />
        </main>
      </div>

      {/* Bottom nav (mobile only) */}
      <nav className="md:hidden fixed bottom-0 inset-x-0 z-30 bg-slate-900 text-white border-t border-white/10">
        <div className="flex items-center justify-around h-16 overflow-x-auto">
          {navItems.map((item) => (
            <button
              key={item.to}
              onClick={() => navigate(item.to)}
              className={`flex flex-col items-center justify-center gap-0.5 px-2 py-2 transition-colors shrink-0 ${
                isActive(item.to) ? "text-white" : "text-white/50"
              }`}
            >
              <item.icon className="w-5 h-5" />
              <span className="text-[10px] font-medium">{item.label}</span>
            </button>
          ))}
        </div>
      </nav>
    </div>
  );
}