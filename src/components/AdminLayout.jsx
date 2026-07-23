import React from "react";
import { Outlet, Navigate, Link, useNavigate, useLocation } from "react-router-dom";
import { LayoutDashboard, Users, ShoppingBag, Bell, LogOut, Shield } from "lucide-react";
import { useAuth } from "@/lib/AuthContext";

export default function AdminLayout() {
  const { user, logout } = useAuth();
  const navigate = useNavigate();
  const location = useLocation();

  if (user?.role !== "admin") {
    return <Navigate to="/" replace />;
  }

  const navItems = [
    { label: "Dashboard", icon: LayoutDashboard, to: "/admin" },
    { label: "Users", icon: Users, to: "/admin/users" },
    { label: "Shop Items", icon: ShoppingBag, to: "/admin/shop" },
    { label: "Notifications", icon: Bell, to: "/admin/notifications" },
    { label: "Maintenance", icon: Shield, to: "/admin/maintenance" },
  ];

  const isActive = (to) => location.pathname === to;

  return (
    <div className="min-h-screen flex flex-col bg-background">
      {/* Top bar */}
      <header className="sticky top-0 z-30 bg-background/80 backdrop-blur-md border-b border-border">
        <div className="max-w-5xl mx-auto flex items-center justify-between h-16 px-4">
          <button onClick={() => navigate("/admin")} className="p-2 -ml-2 rounded-lg hover:bg-accent transition-colors" aria-label="Dashboard">
            <LayoutDashboard className="w-5 h-5" />
          </button>
          <Link to="/admin" className="flex items-center gap-1 font-bold text-lg tracking-tight">
            Remind<span className="text-primary">Set</span>
            <span className="text-xs text-muted-foreground ml-1">Admin</span>
          </Link>
          <button onClick={() => logout()} className="p-2 -mr-2 rounded-lg hover:bg-accent transition-colors" aria-label="Logout">
            <LogOut className="w-5 h-5" />
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
            <button key={item.to} onClick={() => navigate(item.to)} className={`flex flex-col items-center justify-center gap-0.5 px-2 py-1 transition-colors ${isActive(item.to) ? "text-primary" : "text-muted-foreground hover:text-primary"}`}>
              <item.icon className="w-5 h-5" />
              <span className="text-[10px] font-medium">{item.label}</span>
            </button>
          ))}
        </div>
      </nav>

      {/* Desktop side nav */}
      <nav className="hidden md:flex fixed left-0 top-16 bottom-0 w-56 flex-col border-r border-border bg-background/60 backdrop-blur-sm p-4 gap-1">
        {navItems.map((item) => (
          <button key={item.to} onClick={() => navigate(item.to)} className={`flex items-center gap-3 px-3 py-2.5 rounded-lg text-sm font-medium transition-colors ${isActive(item.to) ? "bg-accent text-foreground" : "text-muted-foreground hover:text-foreground hover:bg-accent"}`}>
            <item.icon className="w-5 h-5" />
            {item.label}
          </button>
        ))}
        <div className="mt-auto p-3 rounded-lg bg-accent/50">
          <p className="text-sm font-medium truncate">{user?.email}</p>
          <p className="text-xs text-muted-foreground">Administrator</p>
        </div>
      </nav>
    </div>
  );
}