import React, { useState } from "react";
import { X, Check, Search } from "lucide-react";
import ProfileAvatar from "@/components/ProfileAvatar";

export default function NewGroupDialog({ friends, onCreate, onClose }) {
  const [groupName, setGroupName] = useState("");
  const [selected, setSelected] = useState([]);
  const [search, setSearch] = useState("");

  const filtered = friends.filter((f) =>
    `${f.first_name} ${f.last_name}`.toLowerCase().includes(search.toLowerCase())
  );

  const toggle = (friend) => {
    setSelected((prev) =>
      prev.find((p) => p.id === friend.id)
        ? prev.filter((p) => p.id !== friend.id)
        : [...prev, friend]
    );
  };

  const handleCreate = () => {
    if (!groupName.trim() || selected.length < 1) return;
    onCreate(groupName.trim(), selected);
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 p-4" onClick={onClose}>
      <div className="bg-card border border-border rounded-2xl w-full max-w-md p-4" onClick={(e) => e.stopPropagation()}>
        <div className="flex items-center justify-between mb-3">
          <h3 className="font-semibold">Create Group Chat</h3>
          <button onClick={onClose} className="p-1 rounded-lg hover:bg-accent"><X className="w-4 h-4" /></button>
        </div>
        <input
          type="text"
          value={groupName}
          onChange={(e) => setGroupName(e.target.value)}
          placeholder="Group name..."
          className="w-full h-10 px-3 rounded-lg bg-muted/50 border border-border text-[16px] focus:outline-none focus:ring-1 focus:ring-ring mb-3"
        />
        <div className="relative mb-3">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
          <input
            type="text"
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            placeholder="Search friends..."
            className="w-full h-10 pl-9 pr-3 rounded-lg bg-muted/50 border border-border text-[16px] focus:outline-none focus:ring-1 focus:ring-ring"
          />
        </div>
        {selected.length > 0 && (
          <p className="text-xs text-muted-foreground mb-2">{selected.length} selected</p>
        )}
        <div className="max-h-48 overflow-y-auto space-y-1">
          {filtered.length === 0 ? (
            <p className="text-sm text-muted-foreground text-center py-4">No friends found.</p>
          ) : (
            filtered.map((f) => (
              <button
                key={f.id}
                onClick={() => toggle(f)}
                className={`flex items-center gap-3 w-full p-2 rounded-lg transition-colors ${
                  selected.find((p) => p.id === f.id) ? "bg-primary/10" : "hover:bg-accent"
                }`}
              >
                <ProfileAvatar profile={f} size="sm" />
                <span className="text-sm font-medium flex-1 text-left">{f.first_name} {f.last_name}</span>
                {selected.find((p) => p.id === f.id) && <Check className="w-4 h-4 text-primary" />}
              </button>
            ))
          )}
        </div>
        <button
          onClick={handleCreate}
          disabled={!groupName.trim() || selected.length < 1}
          className="w-full mt-3 bg-primary text-primary-foreground h-10 rounded-lg text-sm font-medium hover:bg-primary/90 disabled:opacity-50"
        >
          Create Group
        </button>
      </div>
    </div>
  );
}