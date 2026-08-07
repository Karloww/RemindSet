import React from "react";
import { Link } from "react-router-dom";
import { FileText, ArrowRight, CalendarX } from "lucide-react";

export default function UnfinishedActivities({ activities, responses, classroomNames = {} }) {
  const respondedIds = new Set((responses || []).map((r) => r.activity_id));
  const unfinished = (activities || [])
    .filter((a) => !respondedIds.has(a.id) && a.status !== "closed")
    .slice(0, 3);
  const totalCount = (activities || []).filter((a) => !respondedIds.has(a.id) && a.status !== "closed").length;

  return (
    <div>
      <div className="flex items-center justify-between mb-3">
        <h2 className="font-semibold text-base">Unfinished Activities</h2>
        <Link to="/activities" className="text-sm text-primary font-medium hover:underline">View all</Link>
      </div>
      {unfinished.length === 0 ? (
        <div className="text-center py-8 bg-card border border-dashed border-border rounded-2xl">
          <CalendarX className="w-7 h-7 text-muted-foreground mx-auto mb-2" />
          <p className="text-muted-foreground text-sm">No unfinished activities. You're all caught up!</p>
        </div>
      ) : (
        <div className="bg-card border border-border rounded-2xl divide-y divide-border overflow-hidden">
          {unfinished.map((a) => (
            <Link key={a.id} to={`/classrooms/${a.classroom_id}/activities/${a.id}/take`} className="flex items-center gap-3 p-4 hover:bg-accent transition-colors">
              <div className="rounded-lg bg-amber-100 text-amber-600 p-2 shrink-0"><FileText className="w-5 h-5" /></div>
              <div className="min-w-0 flex-1">
                <p className="font-medium truncate">{a.title}</p>
                <p className="text-xs text-muted-foreground">{classroomNames[a.classroom_id] || "Unknown subject"}</p>
                <p className="text-xs text-muted-foreground">{a.deadline ? new Date(a.deadline).toLocaleString() : "No deadline"}</p>
              </div>
              <ArrowRight className="w-4 h-4 text-muted-foreground shrink-0" />
            </Link>
          ))}
        </div>
      )}
      {totalCount > 3 && (
        <Link to="/activities" className="block text-center text-sm text-primary font-medium hover:underline py-2">
          View all {totalCount} activities
        </Link>
      )}
    </div>
  );
}