import React from "react";
import { AlertTriangle } from "lucide-react";

export default function MaintenanceScreen({ message }) {
  return (
    <div className="fixed inset-0 flex flex-col items-center justify-center bg-background p-8 z-50">
      <div className="max-w-md w-full text-center space-y-5">
        <div className="inline-flex items-center justify-center w-20 h-20 rounded-full bg-amber-50 text-amber-500 mx-auto">
          <AlertTriangle className="w-10 h-10" />
        </div>
        <div>
          <h1 className="text-2xl font-bold">Under Maintenance</h1>
          <p className="text-muted-foreground mt-2 text-sm leading-relaxed">
            {message || "The application is currently under maintenance. Please check back later."}
          </p>
        </div>
        <p className="text-xs text-muted-foreground">If you need assistance, please contact your administrator.</p>
      </div>
    </div>
  );
}