import React from "react";
import { BookOpenCheck } from "lucide-react";

export default function AuthLayout({ icon: Icon, title, subtitle, footer, children }) {
  return (
    <div className="min-h-screen flex items-center justify-center bg-gradient-to-br from-primary/10 via-background to-background px-4 py-8">
      <div className="w-full max-w-md">
        <div className="flex flex-col items-center mb-8">
          <div className="inline-flex items-center justify-center w-16 h-16 rounded-2xl bg-primary shadow-lg shadow-primary/30 mb-4">
            <BookOpenCheck className="w-8 h-8 text-primary-foreground" aria-hidden="true" />
          </div>
          <h1 className="text-2xl font-bold tracking-tight text-foreground flex items-center gap-1">
            Remind<span className="text-primary">Set</span>
          </h1>
          <p className="text-xs text-muted-foreground mt-1">Never miss a lesson.</p>
        </div>
        <div className="bg-card rounded-2xl shadow-sm border border-border p-8">
          <div className="mb-6 text-center">
            <h2 className="text-xl font-semibold tracking-tight text-foreground">{title}</h2>
            {subtitle && <p className="text-sm text-muted-foreground mt-1">{subtitle}</p>}
          </div>
          {children}
        </div>
        {footer && (
          <p className="text-center text-sm text-muted-foreground mt-6">{footer}</p>
        )}
      </div>
    </div>
  );
}