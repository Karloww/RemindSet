import React, { useState, useEffect } from "react";
import { Link } from "react-router-dom";
import { base44 } from "@/api/base44Client";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { UserPlus, Mail, Lock, User, Loader2, GraduationCap, Presentation, KeyRound } from "lucide-react";
import { InputOTP, InputOTPGroup, InputOTPSlot } from "@/components/ui/input-otp";
import AuthLayout from "@/components/AuthLayout";
import GoogleIcon from "@/components/GoogleIcon";
import { toast } from "@/components/ui/use-toast";
import LoadingScreen from "@/components/LoadingScreen";

export default function Register() {
  const [accountType, setAccountType] = useState("student");
  const [firstName, setFirstName] = useState("");
  const [lastName, setLastName] = useState("");
  const [gender, setGender] = useState("");
  const [username, setUsername] = useState("");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [confirmPassword, setConfirmPassword] = useState("");
  const [teacherCode, setTeacherCode] = useState("");
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(false);
  const [showOtp, setShowOtp] = useState(false);
  const [otpCode, setOtpCode] = useState("");
  const [done, setDone] = useState(false);
  const [validTeacherCode, setValidTeacherCode] = useState("");

  useEffect(() => {
    // Load the teacher secret code from AppSettings
    (async () => {
      try {
        const settings = await base44.entities.AppSettings.filter({}, "-created_date", 1);
        if (settings?.[0]?.teacher_secret_code) {
          setValidTeacherCode(settings[0].teacher_secret_code);
        }
      } catch { /* ignore */ }
    })();
  }, []);

  const handleSubmit = async (e) => {
    e.preventDefault();
    setError("");
    if (!firstName || !lastName || !username) {
      setError("Please fill in your name and username.");
      return;
    }
    if (password !== confirmPassword) {
      setError("Passwords do not match");
      return;
    }
    // Validate teacher secret code
    if (accountType === "teacher") {
      if (!teacherCode) {
        setError("Teacher Secret Code is required to register as a teacher.");
        return;
      }
      if (validTeacherCode && teacherCode !== validTeacherCode) {
        setError("Invalid Teacher Secret Code. Please contact your administrator.");
        return;
      }
    }
    setLoading(true);
    try {
      await base44.auth.register({ email, password });
      setShowOtp(true);
    } catch (err) {
      setError(err.message || "Registration failed");
    } finally {
      setLoading(false);
    }
  };

  const handleVerify = async () => {
    setError("");
    setLoading(true);
    try {
      const result = await base44.auth.verifyOtp({ email, otpCode });
      if (result?.access_token) {
        base44.auth.setToken(result.access_token);
      }
      await base44.entities.Profile.create({
        first_name: firstName,
        last_name: lastName,
        username,
        gender: gender || "other",
        account_type: accountType,
        points: 0,
        selected_color_theme: "indigo",
        selected_background: "none",
        selected_cover_photo: "default",
        selected_profile_icon: "default",
      });
      setDone(true);
      toast({ title: "Account registered successfully!", description: "Welcome to RemindSet." });
    } catch (err) {
      setError(err.message || "Invalid verification code");
    } finally {
      setLoading(false);
    }
  };

  const handleResend = async () => {
    setError("");
    try {
      await base44.auth.resendOtp(email);
      toast({ title: "Code sent", description: "Check your email for the new code." });
    } catch (err) {
      setError(err.message || "Failed to resend code");
    }
  };

  const handleGoogle = () => {
    base44.auth.loginWithProvider("google", "/");
  };

  if (done) {
    return <LoadingScreen onComplete={() => { window.location.href = "/"; }} />;
  }

  if (showOtp) {
    return (
      <AuthLayout icon={Mail} title="Verify your email" subtitle={`We sent a code to ${email}`}>
        {error && (
          <div className="mb-4 p-3 rounded-lg bg-destructive/10 text-destructive text-sm">{error}</div>
        )}
        <div className="flex justify-center mb-6">
          <InputOTP maxLength={6} value={otpCode} onChange={setOtpCode} autoFocus autoComplete="one-time-code">
            <InputOTPGroup>
              <InputOTPSlot index={0} /><InputOTPSlot index={1} /><InputOTPSlot index={2} />
              <InputOTPSlot index={3} /><InputOTPSlot index={4} /><InputOTPSlot index={5} />
            </InputOTPGroup>
          </InputOTP>
        </div>
        <Button onClick={handleVerify} className="w-full h-12 font-medium mt-6" disabled={loading || otpCode.length < 6}>
          {loading ? (<><Loader2 className="w-4 h-4 mr-2 animate-spin" />Verifying...</>) : ("Verify & Continue")}
        </Button>
        <p className="text-center text-sm text-muted-foreground mt-4">
          Didn't receive the code?{" "}
          <button onClick={handleResend} className="text-primary font-medium hover:underline">Resend</button>
        </p>
      </AuthLayout>
    );
  }

  return (
    <AuthLayout
      icon={UserPlus}
      title="Create your account"
      subtitle="Join RemindSet as a student or teacher"
      footer={<>Already have an account? <Link to="/login" className="text-primary font-medium hover:underline">Log in</Link></>}
    >
      {error && <div className="mb-4 p-3 rounded-lg bg-destructive/10 text-destructive text-sm">{error}</div>}

      {/* Role selection */}
      <div className="mb-5">
        <Label className="mb-2 block">I am a…</Label>
        <div className="grid grid-cols-2 gap-3">
          <button type="button" onClick={() => setAccountType("student")}
            className={`flex flex-col items-center gap-1 p-3 rounded-xl border-2 transition-all ${accountType === "student" ? "border-primary bg-primary/5" : "border-border"}`}>
            <GraduationCap className="w-6 h-6 text-primary" />
            <span className="text-sm font-medium">Student</span>
          </button>
          <button type="button" onClick={() => setAccountType("teacher")}
            className={`flex flex-col items-center gap-1 p-3 rounded-xl border-2 transition-all ${accountType === "teacher" ? "border-primary bg-primary/5" : "border-border"}`}>
            <Presentation className="w-6 h-6 text-primary" />
            <span className="text-sm font-medium">Teacher</span>
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
        <div className="space-y-2">
          <Label htmlFor="email">Email</Label>
          <div className="relative">
            <Mail className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
            <Input id="email" type="email" value={email} onChange={(e) => setEmail(e.target.value)} className="pl-9 h-11" required />
          </div>
        </div>
        <div className="space-y-2">
          <Label htmlFor="password">Password</Label>
          <div className="relative">
            <Lock className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
            <Input id="password" type="password" value={password} onChange={(e) => setPassword(e.target.value)} className="pl-9 h-11" required />
          </div>
        </div>
        <div className="space-y-2">
          <Label htmlFor="confirm">Confirm Password</Label>
          <div className="relative">
            <Lock className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
            <Input id="confirm" type="password" value={confirmPassword} onChange={(e) => setConfirmPassword(e.target.value)} className="pl-9 h-11" required />
          </div>
        </div>

        {/* Teacher Secret Code */}
        {accountType === "teacher" && (
          <div className="space-y-2">
            <Label className="text-primary font-semibold flex items-center gap-1.5">
              <KeyRound className="w-4 h-4" /> Teacher's Secret Code
            </Label>
            <div className="relative">
              <KeyRound className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
              <Input id="teacherCode" type="password" value={teacherCode}
                onChange={(e) => setTeacherCode(e.target.value)}
                placeholder="Type secret code to register as Teacher"
                className="pl-9 h-11" required={accountType === "teacher"} />
            </div>
            <p className="text-xs text-muted-foreground">Contact your administrator to get the teacher registration code.</p>
          </div>
        )}

        <Button type="submit" className="w-full h-12 font-medium" disabled={loading}>
          {loading ? (<><Loader2 className="w-4 h-4 mr-2 animate-spin" />Creating account...</>) : ("Done")}
        </Button>
      </form>
    </AuthLayout>
  );
}