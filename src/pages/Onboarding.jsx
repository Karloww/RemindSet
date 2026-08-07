import React, { useState } from "react";
import { useNavigate, Navigate } from "react-router-dom";
import { base44 } from "@/api/base44Client";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { UserPlus, User, Loader2, GraduationCap, Presentation, Lock } from "lucide-react";
import AuthLayout from "@/components/AuthLayout";
import { useAuth } from "@/lib/AuthContext";
import { toast } from "@/components/ui/use-toast";

// Shown when an authenticated user has no Profile record yet (e.g. Google sign-in).
export default function Onboarding() {
  const { user } = useAuth();
  const navigate = useNavigate();
  const [accountType, setAccountType] = useState("student");
  const [firstName, setFirstName] = useState("");
  const [lastName, setLastName] = useState("");
  const [username, setUsername] = useState("");
  const [gender, setGender] = useState("");
  const [teacherCode, setTeacherCode] = useState("");
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");

  if (user?.role === "admin") {
    return <Navigate to="/admin" replace />;
  }

  const handleSubmit = async (e) => {
    e.preventDefault();
    setError("");
    if (!firstName || !lastName || !username) {
      setError("Please fill in all fields.");
      return;
    }
    if (accountType === "teacher") {
      try {
        const settings = await base44.entities.AppSettings.list("created_date", 1);
        const secret = settings[0]?.teacher_secret_code || "";
        if (secret && teacherCode.trim() !== secret) {
          setError("Incorrect teacher's secret code. Please contact the admin.");
          return;
        }
      } catch {
        setError("Could not verify teacher code. Please try again.");
        return;
      }
    }
    setLoading(true);
    try {
      await base44.entities.Profile.create({
        first_name: firstName,
        last_name: lastName,
        username,
        gender: gender || "other",
        account_type: accountType,
        points: 0,
        selected_color_theme: "ocean",
        selected_background: "none",
        selected_cover_photo: "default",
        selected_profile_icon: "default",
      });
      toast({ title: "Profile created!", description: "Welcome to RemindSet." });
      window.location.href = "/";
    } catch (err) {
      setError(err.message || "Failed to create profile");
    } finally {
      setLoading(false);
    }
  };

  return (
    <AuthLayout icon={UserPlus} title="Complete your profile" subtitle="One last step to start using RemindSet">
      {error && <div className="mb-4 p-3 rounded-lg bg-destructive/10 text-destructive text-sm">{error}</div>}
      <div className="mb-5">
        <Label className="mb-2 block">I am a…</Label>
        <div className="grid grid-cols-2 gap-3">
          <button type="button" onClick={() => setAccountType("student")}
            className={`flex flex-col items-center gap-1 p-3 rounded-xl border-2 transition-all ${accountType === "student" ? "border-primary bg-primary/5" : "border-border"}`}>
            <GraduationCap className="w-6 h-6 text-primary" /><span className="text-sm font-medium">Student</span>
          </button>
          <button type="button" onClick={() => setAccountType("teacher")}
            className={`flex flex-col items-center gap-1 p-3 rounded-xl border-2 transition-all ${accountType === "teacher" ? "border-primary bg-primary/5" : "border-border"}`}>
            <Presentation className="w-6 h-6 text-primary" /><span className="text-sm font-medium">Teacher</span>
          </button>
        </div>
      </div>
      <form onSubmit={handleSubmit} className="space-y-4">
        <div className="grid grid-cols-2 gap-3">
          <div className="space-y-2">
            <Label htmlFor="firstName">First Name</Label>
            <Input id="firstName" value={firstName} onChange={(e) => setFirstName(e.target.value)} className="h-11" required />
          </div>
          <div className="space-y-2">
            <Label htmlFor="lastName">Last Name</Label>
            <Input id="lastName" value={lastName} onChange={(e) => setLastName(e.target.value)} className="h-11" required />
          </div>
        </div>
        <div className="grid grid-cols-2 gap-3">
          <div className="space-y-2">
            <Label htmlFor="gender">Gender</Label>
            <select id="gender" value={gender} onChange={(e) => setGender(e.target.value)}
              className="flex h-11 w-full rounded-md border border-input bg-background px-3 text-sm">
              <option value="">Select…</option>
              <option value="male">Male</option>
              <option value="female">Female</option>
              <option value="other">Other</option>
            </select>
          </div>
          <div className="space-y-2">
            <Label htmlFor="username">Username</Label>
            <div className="relative">
              <User className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
              <Input id="username" value={username} onChange={(e) => setUsername(e.target.value)} className="pl-9 h-11" required />
            </div>
          </div>
        </div>
        {accountType === "teacher" && (
          <div className="space-y-2">
            <Label htmlFor="teacherCode" className="flex items-center gap-1.5"><Lock className="w-4 h-4" /> Teacher's secret code</Label>
            <Input id="teacherCode" value={teacherCode} onChange={(e) => setTeacherCode(e.target.value)} className="h-11" placeholder="Enter the code from the admin" />
            <p className="text-xs text-muted-foreground">Required to register as a teacher. Ask the admin for the code.</p>
          </div>
        )}
        <Button type="submit" className="w-full h-12" disabled={loading}>
          {loading ? <><Loader2 className="w-4 h-4 mr-2 animate-spin" />Saving...</> : "Get Started"}
        </Button>
      </form>
    </AuthLayout>
  );
}