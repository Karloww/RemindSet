import React, { useState, useEffect, useRef } from "react";
import { useNavigate } from "react-router-dom";
import { Search, User, School, FileText } from "lucide-react";
import { base44 } from "@/api/base44Client";

export default function SearchBar() {
  const [query, setQuery] = useState("");
  const [open, setOpen] = useState(false);
  const [allProfiles, setAllProfiles] = useState([]);
  const [allClassrooms, setAllClassrooms] = useState([]);
  const [fetched, setFetched] = useState(false);
  const navigate = useNavigate();
  const containerRef = useRef(null);

  useEffect(() => {
    if (open && !fetched) {
      (async () => {
        try {
          const [profiles, classrooms] = await Promise.all([
            base44.entities.Profile.list("-created_date", 200),
            base44.entities.Classroom.list("-created_date", 50),
          ]);
          setAllProfiles(profiles || []);
          setAllClassrooms(classrooms || []);
        } catch (e) { /* ignore */ }
        setFetched(true);
      })();
    }
  }, [open, fetched]);

  useEffect(() => {
    const handler = (e) => {
      if (containerRef.current && !containerRef.current.contains(e.target)) setOpen(false);
    };
    document.addEventListener("mousedown", handler);
    return () => document.removeEventListener("mousedown", handler);
  }, []);

  const q = query.toLowerCase().trim();
  const matchedUsers = q
    ? allProfiles.filter((p) =>
        `${p.first_name} ${p.last_name}`.toLowerCase().includes(q) ||
        (p.username || "").toLowerCase().includes(q)
      ).slice(0, 5)
    : [];
  const matchedClassrooms = q
    ? allClassrooms.filter((c) =>
        (c.subject_title || "").toLowerCase().includes(q) ||
        (c.year_and_section || "").toLowerCase().includes(q)
      ).slice(0, 5)
    : [];
  const pages = q
    ? [
        { label: "Home", to: "/" },
        { label: "Classes", to: "/classrooms" },
        { label: "Calendar", to: "/calendar" },
        { label: "Resources", to: "/resources" },
        { label: "My Circle", to: "/users" },
        { label: "Messages", to: "/messages" },
        { label: "Profile", to: "/profile" },
        { label: "Settings", to: "/settings" },
        { label: "Notifications", to: "/notifications" },
        { label: "Announcements", to: "/announcements" },
        { label: "Activities", to: "/activities" },
        { label: "Lessons", to: "/lessons" },
        { label: "Customize Theme", to: "/customize-theme" },
      ].filter((p) => p.label.toLowerCase().includes(q))
    : [];

  const hasResults = matchedUsers.length > 0 || matchedClassrooms.length > 0 || pages.length > 0;
  const go = (to) => { navigate(to); setOpen(false); setQuery(""); };

  return (
    <div ref={containerRef} className="relative">
      {/* Desktop input */}
      <div className="hidden sm:block">
        <div className="relative">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
          <input
            type="text"
            value={query}
            onChange={(e) => { setQuery(e.target.value); setOpen(true); }}
            onFocus={() => setOpen(true)}
            placeholder="Search users, classes, pages..."
            className="w-56 lg:w-72 h-9 pl-9 pr-3 rounded-lg bg-muted/50 border border-border text-[16px] sm:text-sm text-foreground focus:outline-none focus:ring-1 focus:ring-ring"
          />
        </div>
      </div>

      {/* Mobile icon */}
      <button onClick={() => setOpen(!open)} className="sm:hidden p-2 rounded-lg hover:bg-accent transition-colors" aria-label="Search">
        <Search className="w-5 h-5" />
      </button>

      {/* Dropdown — full width on mobile, positioned on desktop */}
      {open && (
        <div className="fixed left-0 right-0 top-16 sm:absolute sm:left-auto sm:right-0 sm:top-full sm:w-80 mt-0 sm:mt-2 bg-card border-b sm:border sm:rounded-xl shadow-lg z-50 max-h-[70vh] sm:max-h-96 overflow-y-auto">
          {/* Mobile input */}
          <div className="sm:hidden p-3 border-b border-border">
            <div className="relative">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
              <input
                type="text"
                value={query}
                onChange={(e) => setQuery(e.target.value)}
                placeholder="Search users, classes, pages..."
                className="w-full h-10 pl-9 pr-3 rounded-lg bg-muted/50 border border-border text-[16px] text-foreground focus:outline-none focus:ring-1 focus:ring-ring"
                autoFocus
              />
            </div>
          </div>
          {q === "" ? (
            <div className="p-4 text-sm text-muted-foreground text-center">Start typing to search...</div>
          ) : !hasResults ? (
            <div className="p-4 text-sm text-muted-foreground text-center">No results found.</div>
          ) : (
            <div className="p-2">
              {pages.length > 0 && (
                <div>
                  <p className="text-xs font-semibold text-muted-foreground px-2 py-1">Pages</p>
                  {pages.map((p) => (
                    <button key={p.to} onClick={() => go(p.to)} className="flex items-center gap-2 w-full px-2 py-2 rounded-lg hover:bg-accent text-sm text-left">
                      <FileText className="w-4 h-4 text-muted-foreground" /> {p.label}
                    </button>
                  ))}
                </div>
              )}
              {matchedUsers.length > 0 && (
                <div>
                  <p className="text-xs font-semibold text-muted-foreground px-2 py-1 mt-1">Users</p>
                  {matchedUsers.map((u) => (
                    <button key={u.id} onClick={() => go(`/users/${u.id}`)} className="flex items-center gap-2 w-full px-2 py-2 rounded-lg hover:bg-accent text-sm text-left">
                      <User className="w-4 h-4 text-muted-foreground" /> {u.first_name} {u.last_name}
                    </button>
                  ))}
                </div>
              )}
              {matchedClassrooms.length > 0 && (
                <div>
                  <p className="text-xs font-semibold text-muted-foreground px-2 py-1 mt-1">Classes</p>
                  {matchedClassrooms.map((c) => (
                    <button key={c.id} onClick={() => go(`/classrooms/${c.id}`)} className="flex items-center gap-2 w-full px-2 py-2 rounded-lg hover:bg-accent text-sm text-left">
                      <School className="w-4 h-4 text-muted-foreground" /> {c.subject_title}
                    </button>
                  ))}
                </div>
              )}
            </div>
          )}
        </div>
      )}
    </div>
  );
}