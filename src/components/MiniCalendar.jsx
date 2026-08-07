import React, { useState, useMemo } from "react";
import { ChevronLeft, ChevronRight } from "lucide-react";
import { Link } from "react-router-dom";
import {
  startOfMonth, endOfMonth, startOfWeek, endOfWeek,
  eachDayOfInterval, format, isSameDay, isSameMonth, addMonths, subMonths
} from "date-fns";

export default function MiniCalendar({ activities = [] }) {
  const [currentMonth, setCurrentMonth] = useState(new Date());

  const days = useMemo(() => {
    const start = startOfWeek(startOfMonth(currentMonth));
    const end = endOfWeek(endOfMonth(currentMonth));
    return eachDayOfInterval({ start, end });
  }, [currentMonth]);

  const activityDays = useMemo(
    () => new Set((activities || []).filter((a) => a.deadline).map((a) => format(new Date(a.deadline), "yyyy-MM-dd"))),
    [activities]
  );

  return (
    <div>
      <div className="flex items-center justify-between mb-2">
        <span className="text-xs font-semibold">{format(currentMonth, "MMM yyyy")}</span>
        <div className="flex gap-0.5">
          <button onClick={() => setCurrentMonth(subMonths(currentMonth, 1))} className="p-1 rounded hover:bg-accent">
            <ChevronLeft className="w-3 h-3" />
          </button>
          <button onClick={() => setCurrentMonth(new Date())} className="px-1.5 py-0.5 rounded hover:bg-accent text-[10px] font-medium">
            Today
          </button>
          <button onClick={() => setCurrentMonth(addMonths(currentMonth, 1))} className="p-1 rounded hover:bg-accent">
            <ChevronRight className="w-3 h-3" />
          </button>
        </div>
      </div>
      <div className="grid grid-cols-7 gap-0.5">
        {["S", "M", "T", "W", "T", "F", "S"].map((d, i) => (
          <div key={i} className="text-center text-[9px] font-medium text-muted-foreground py-0.5">{d}</div>
        ))}
        {days.map((day) => {
          const isToday = isSameDay(day, new Date());
          const hasActivity = activityDays.has(format(day, "yyyy-MM-dd"));
          const inMonth = isSameMonth(day, currentMonth);
          return (
            <div
              key={day.toISOString()}
              className={`aspect-square flex items-center justify-center text-[10px] rounded ${
                isToday
                  ? "bg-primary text-primary-foreground font-bold"
                  : !inMonth
                  ? "text-muted-foreground/30"
                  : hasActivity
                  ? "bg-primary/10 text-foreground font-medium"
                  : "text-foreground hover:bg-accent"
              }`}
            >
              {format(day, "d")}
            </div>
          );
        })}
      </div>
      <div className="flex items-center justify-between mt-2 pt-2 border-t border-border">
        <Link to="/calendar" className="text-[10px] text-primary font-medium hover:underline">Full Calendar</Link>
      </div>
    </div>
  );
}