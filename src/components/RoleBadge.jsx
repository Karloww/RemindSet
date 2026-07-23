import React from "react";
import { GraduationCap, Presentation } from "lucide-react";

export default function RoleBadge({ accountType, className = "" }) {
  const isTeacher = accountType === "teacher";
  return (
    <span
      className={`inline-flex items-center gap-1 px-2.5 py-1 rounded-full text-xs font-medium ${
        isTeacher ? "bg-amber-100 text-amber-700" : "bg-primary/10 text-primary"
      } ${className}`}
    >
      {isTeacher ? <Presentation className="w-3 h-3" /> : <GraduationCap className="w-3 h-3" />}
      {isTeacher ? "Teacher" : "Student"}
    </span>
  );
}