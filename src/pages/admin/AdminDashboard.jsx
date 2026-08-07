import React, { useState, useEffect } from "react";
import { useNavigate } from "react-router-dom";
import { base44 } from "@/api/base44Client";
import { Users, BookOpen, GraduationCap, Presentation, ShoppingBag, CheckCircle2, ClipboardList, Loader2, ArrowRight, Bell } from "lucide-react";

export default function AdminDashboard() {
  const navigate = useNavigate();
  const [stats, setStats] = useState({});
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    let active = true;
    (async () => {
      try {
        const [users, profiles, classrooms, lessons, assignments, shopItems] = await Promise.all([
          base44.entities.User.list(),
          base44.entities.Profile.list(),
          base44.entities.Classroom.list(),
          base44.entities.LessonPlan.list(),
          base44.entities.LessonAssignment.list(),
          base44.entities.ShopItem.list(),
        ]);
        if (!active) return;
        const students = (profiles || []).filter((p) => p.account_type === "student").length;
        const teachers = (profiles || []).filter((p) => p.account_type === "teacher").length;
        const completed = (assignments || []).filter((a) => a.status === "completed").length;
        setStats({
          totalUsers: (users || []).length,
          students,
          teachers,
          classrooms: (classrooms || []).length,
          lessons: (lessons || []).length,
          assignments: (assignments || []).length,
          completed,
          completionRate: (assignments || []).length > 0 ? Math.round((completed / (assignments || []).length) * 100) : 0,
          shopItems: (shopItems || []).length,
        });
      } finally {
        if (active) setLoading(false);
      }
    })();
    return () => { active = false; };
  }, []);

  if (loading) return <div className="flex justify-center py-20"><Loader2 className="w-6 h-6 animate-spin text-muted-foreground" /></div>;

  const cards = [
    { label: "Total Users", value: stats.totalUsers, icon: Users, color: "text-blue-600 bg-blue-50" },
    { label: "Students", value: stats.students, icon: GraduationCap, color: "text-primary bg-primary/10" },
    { label: "Teachers", value: stats.teachers, icon: Presentation, color: "text-amber-600 bg-amber-50" },
    { label: "Classrooms", value: stats.classrooms, icon: BookOpen, color: "text-purple-600 bg-purple-50" },
    { label: "Lessons", value: stats.lessons, icon: ClipboardList, color: "text-indigo-600 bg-indigo-50" },
    { label: "Assignments", value: stats.assignments, icon: ClipboardList, color: "text-cyan-600 bg-cyan-50" },
    { label: "Completed", value: `${stats.completionRate}%`, icon: CheckCircle2, color: "text-emerald-600 bg-emerald-50" },
    { label: "Shop Items", value: stats.shopItems, icon: ShoppingBag, color: "text-pink-600 bg-pink-50" },
  ];

  const quickLinks = [
    { label: "Manage Users", desc: "Add, edit, suspend, or delete accounts", icon: Users, to: "/admin/users" },
    { label: "Manage Shop", desc: "Create, edit, or remove customization items", icon: ShoppingBag, to: "/admin/shop" },
    { label: "Send Notifications", desc: "Broadcast messages to users", icon: Bell, to: "/admin/notifications" },
  ];

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-bold tracking-tight">Admin Dashboard</h1>
        <p className="text-muted-foreground text-sm mt-1">Platform overview and management</p>
      </div>

      {/* Stats grid */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
        {cards.map((card) => (
          <div key={card.label} className="bg-card border border-border rounded-2xl p-4">
            <div className={`inline-flex items-center justify-center w-9 h-9 rounded-lg mb-2 ${card.color}`}>
              <card.icon className="w-4 h-4" />
            </div>
            <p className="text-2xl font-bold">{card.value}</p>
            <p className="text-xs text-muted-foreground">{card.label}</p>
          </div>
        ))}
      </div>

      {/* Quick links */}
      <div>
        <h2 className="text-lg font-semibold mb-3">Quick Actions</h2>
        <div className="space-y-2">
          {quickLinks.map((link) => (
            <button key={link.to} onClick={() => navigate(link.to)} className="w-full flex items-center gap-3 bg-card border border-border rounded-2xl p-4 hover:border-primary/40 transition-colors text-left">
              <div className="inline-flex items-center justify-center w-10 h-10 rounded-xl bg-primary/10 text-primary shrink-0">
                <link.icon className="w-5 h-5" />
              </div>
              <div className="flex-1 min-w-0">
                <p className="font-medium">{link.label}</p>
                <p className="text-sm text-muted-foreground">{link.desc}</p>
              </div>
              <ArrowRight className="w-5 h-5 text-muted-foreground" />
            </button>
          ))}
        </div>
      </div>
    </div>
  );
}