import React, { useState, useMemo } from "react";
import { ChevronLeft, ChevronRight, CalendarClock, ClipboardList, CalendarOff } from "lucide-react";
import {
  startOfMonth, endOfMonth, startOfWeek, endOfWeek,
  eachDayOfInterval, format, isSameDay, isSameMonth, addMonths, subMonths
} from "date-fns";

// Regular and special non-working Philippine holidays.
// Fixed annual ones use "MM-DD"; movable ones use a full "yyyy-MM-dd".
const PH_HOLIDAYS = [
  { date: "01-01", name: "New Year's Day" },
  { date: "02-25", name: "EDSA People Power Revolution" },
  { date: "04-09", name: "Araw ng Kagitingan" },
  { date: "05-01", name: "Labor Day" },
  { date: "06-12", name: "Independence Day" },
  { date: "08-21", name: "Ninoy Aquino Day" },
  { date: "11-01", name: "All Saints' Day" },
  { date: "11-02", name: "All Souls' Day" },
  { date: "11-30", name: "Bonifacio Day" },
  { date: "12-08", name: "Immaculate Conception" },
  { date: "12-24", name: "Christmas Eve" },
  { date: "12-25", name: "Christmas Day" },
  { date: "12-30", name: "Rizal Day" },
  { date: "12-31", name: "New Year's Eve" },
  // Movable: Holy Week 2025
  { date: "2025-04-17", name: "Maundy Thursday" },
  { date: "2025-04-18", name: "Good Friday" },
  { date: "2025-04-19", name: "Black Saturday" },
  { date: "2025-08-25", name: "National Heroes Day" },
  // Movable: Holy Week 2026
  { date: "2026-02-18", name: "Ash Wednesday" },
  { date: "2026-04-02", name: "Maundy Thursday" },
  { date: "2026-04-03", name: "Good Friday" },
  { date: "2026-04-04", name: "Black Saturday" },
  { date: "2026-08-31", name: "National Heroes Day" },
];

function getHolidaysForDay(day) {
  const md = format(day, "MM-dd");
  const ymd = format(day, "yyyy-MM-dd");
  return PH_HOLIDAYS.filter((h) => h.date === md || h.date === ymd);
}

export default function HomeCalendar({ activities, onActivityClick }) {
  const [currentMonth, setCurrentMonth] = useState(new Date());

  const deadlineActivities = useMemo(
    () => (activities || []).filter((a) => a.deadline),
    [activities]
  );

  const days = useMemo(() => {
    const start = startOfWeek(startOfMonth(currentMonth));
    const end = endOfWeek(endOfMonth(currentMonth));
    return eachDayOfInterval({ start, end });
  }, [currentMonth]);

  const getActivitiesForDay = (day) =>
    deadlineActivities.filter((a) => isSameDay(new Date(a.deadline), day));

  return (
    <div className="bg-card border border-border rounded-2xl p-5">
      {/* Header */}
      <div className="flex items-center justify-between mb-4">
        <h3 className="font-semibold flex items-center gap-2">
          <CalendarClock className="w-5 h-5 text-primary" />
          {format(currentMonth, "MMMM yyyy")}
        </h3>
        <div className="flex gap-1">
          <button onClick={() => setCurrentMonth(subMonths(currentMonth, 1))} className="p-2 rounded-lg hover:bg-accent">
            <ChevronLeft className="w-4 h-4" />
          </button>
          <button onClick={() => setCurrentMonth(new Date())} className="px-3 py-1.5 rounded-lg hover:bg-accent text-xs font-medium">
            Today
          </button>
          <button onClick={() => setCurrentMonth(addMonths(currentMonth, 1))} className="p-2 rounded-lg hover:bg-accent">
            <ChevronRight className="w-4 h-4" />
          </button>
        </div>
      </div>

      {/* Day labels */}
      <div className="grid grid-cols-7 gap-1 mb-2">
        {["Sun", "Mon", "Tue", "Wed", "Thu", "Fri", "Sat"].map((d) => (
          <div key={d} className="text-center text-xs font-medium text-muted-foreground py-1">{d}</div>
        ))}
      </div>

      {/* Calendar grid */}
      <div className="grid grid-cols-7 gap-1">
        {days.map((day) => {
          const dayActivities = getActivitiesForDay(day);
          const dayHolidays = getHolidaysForDay(day);
          const isCurrentMonth = isSameMonth(day, currentMonth);
          const isToday = isSameDay(day, new Date());
          return (
            <div
              key={day.toISOString()}
              className={`min-h-[64px] p-1.5 rounded-lg border text-sm ${
                !isCurrentMonth ? "bg-muted/30 text-muted-foreground border-transparent" :
                isToday ? "border-primary bg-primary/5" :
                "border-border"
              }`}
            >
              <div className={`text-xs font-medium ${isToday ? "text-primary" : ""}`}>
                {format(day, "d")}
              </div>
              <div className="mt-1 space-y-0.5">
                {dayHolidays.map((h, i) => (
                  <div key={`h-${i}`} className="block text-[10px] truncate px-1 py-0.5 rounded bg-emerald-100 text-emerald-700 dark:bg-emerald-900/30 dark:text-emerald-400" title={h.name}>
                    {h.name}
                  </div>
                ))}
                {dayActivities.slice(0, 2 - dayHolidays.length > 0 ? 2 - dayHolidays.length : 0).map((a) => (
                  <button
                    key={a.id}
                    onClick={() => onActivityClick?.(a)}
                    className="block w-full text-left text-[10px] truncate px-1 py-0.5 rounded bg-amber-100 text-amber-700 hover:bg-amber-200 dark:bg-amber-900/30 dark:text-amber-400"
                  >
                    {a.title}
                  </button>
                ))}
                {dayActivities.length > 2 && (
                  <div className="text-[10px] text-muted-foreground">+{dayActivities.length - 2} more</div>
                )}
              </div>
            </div>
          );
        })}
      </div>

      {/* Legend */}
      <div className="flex items-center gap-4 mt-3 text-xs text-muted-foreground">
        <span className="inline-flex items-center gap-1"><span className="w-2.5 h-2.5 rounded bg-amber-200" /> Activity deadline</span>
        <span className="inline-flex items-center gap-1"><span className="w-2.5 h-2.5 rounded bg-emerald-200" /> PH holiday</span>
      </div>


    </div>
  );
}