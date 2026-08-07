import React, { useState, useEffect, useRef } from "react";
import { base44 } from "@/api/base44Client";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import { Users as UsersIcon, Loader2, UserPlus, Trash2, Search, Mail, Eye, Download, Upload, X } from "lucide-react";
import { toast } from "@/components/ui/use-toast";

export default function ManageUsers() {
  const [users, setUsers] = useState([]);
  const [profiles, setProfiles] = useState([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState("");
  const [inviteOpen, setInviteOpen] = useState(false);
  const [inviteEmail, setInviteEmail] = useState("");
  const [inviteRole, setInviteRole] = useState("user");
  const [inviting, setInviting] = useState(false);
  const [updatingId, setUpdatingId] = useState(null);
  const [viewUser, setViewUser] = useState(null);
  const [importing, setImporting] = useState(false);
  const fileInputRef = useRef(null);

  const loadUsers = async () => {
    try {
      const [list, profList] = await Promise.all([
        base44.entities.User.list(),
        base44.entities.Profile.list("-created_date", 500),
      ]);
      setUsers(list || []);
      setProfiles(profList || []);
    } catch (e) {
      toast({ title: "Failed to load users", description: e.message, variant: "destructive" });
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => { loadUsers(); }, []);

  const getProfileFor = (userId) => profiles.find((p) => p.created_by_id === userId);

  const exportData = () => {
    const data = {
      exported_at: new Date().toISOString(),
      users: users.map((u) => ({ id: u.id, email: u.email, full_name: u.full_name, role: u.role, created_date: u.created_date })),
      profiles: profiles.map((p) => ({ ...p, _id: undefined })),
    };
    const blob = new Blob([JSON.stringify(data, null, 2)], { type: "application/json" });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = `remindset-users-backup-${new Date().toISOString().slice(0, 10)}.json`;
    a.click();
    URL.revokeObjectURL(url);
    toast({ title: "Exported user data" });
  };

  const importData = async (e) => {
    const file = e.target.files?.[0];
    if (!file) return;
    if (!window.confirm("Import profile data from this file? Existing accounts are NOT recreated — users must register or be invited. Profile records will be matched by created_by_id.")) {
      if (fileInputRef.current) fileInputRef.current.value = "";
      return;
    }
    setImporting(true);
    try {
      const text = await file.text();
      const data = JSON.parse(text);
      if (!data.profiles || !Array.isArray(data.profiles)) {
        toast({ title: "Invalid file format", variant: "destructive" });
        return;
      }
      const existingByUserId = new Map(profiles.map((p) => [p.created_by_id, p]));
      const toCreate = [];
      const toUpdate = [];
      for (const imported of data.profiles) {
        if (!imported.created_by_id) continue;
        const existing = existingByUserId.get(imported.created_by_id);
        if (existing) {
          toUpdate.push({ id: existing.id, first_name: imported.first_name, last_name: imported.last_name, username: imported.username, account_type: imported.account_type, bio: imported.bio, points: imported.points });
        } else {
          toCreate.push({
            first_name: imported.first_name, last_name: imported.last_name, username: imported.username,
            account_type: imported.account_type, bio: imported.bio, points: imported.points,
            created_by_id: imported.created_by_id,
          });
        }
      }
      let created = 0, updated = 0;
      if (toCreate.length > 0) {
        await base44.entities.Profile.bulkCreate(toCreate);
        created = toCreate.length;
      }
      if (toUpdate.length > 0) {
        await base44.entities.Profile.bulkUpdate(toUpdate);
        updated = toUpdate.length;
      }
      toast({ title: `Import complete`, description: `${created} new profiles, ${updated} updated.` });
      loadUsers();
    } catch (err) {
      toast({ title: "Import failed", description: err.message, variant: "destructive" });
    } finally {
      setImporting(false);
      if (fileInputRef.current) fileInputRef.current.value = "";
    }
  };

  const handleRoleChange = async (userId, newRole) => {
    setUpdatingId(userId);
    try {
      await base44.entities.User.update(userId, { role: newRole });
      toast({ title: `Role updated to ${newRole}` });
      loadUsers();
    } catch (e) {
      toast({ title: "Update failed", description: e.message, variant: "destructive" });
    } finally {
      setUpdatingId(null);
    }
  };

  const handleDelete = async (userId) => {
    if (!window.confirm("Delete this user account? This cannot be undone.")) return;
    try {
      await base44.entities.User.delete(userId);
      toast({ title: "User deleted" });
      loadUsers();
    } catch (e) {
      toast({ title: "Delete failed", description: e.message, variant: "destructive" });
    }
  };

  const handleInvite = async (e) => {
    e.preventDefault();
    if (!inviteEmail) return;
    setInviting(true);
    try {
      await base44.users.inviteUser(inviteEmail, inviteRole);
      toast({ title: "Invitation sent!", description: `${inviteEmail} has been invited as ${inviteRole}.` });
      setInviteEmail("");
      setInviteOpen(false);
      loadUsers();
    } catch (err) {
      toast({ title: "Invite failed", description: err.message, variant: "destructive" });
    } finally {
      setInviting(false);
    }
  };

  const filtered = users.filter((u) =>
    !search || u.email?.toLowerCase().includes(search.toLowerCase()) || u.full_name?.toLowerCase().includes(search.toLowerCase())
  );

  const roleBadge = (role) => {
    const styles = {
      admin: "bg-purple-50 text-purple-600",
      user: "bg-blue-50 text-blue-600",
      suspended: "bg-red-50 text-red-600",
    };
    return styles[role] || "bg-muted text-muted-foreground";
  };

  return (
    <div className="space-y-5">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold tracking-tight">Manage Users</h1>
          <p className="text-muted-foreground text-sm mt-1">{users.length} total accounts</p>
        </div>
        <div className="flex items-center gap-2">
          <Button variant="outline" onClick={exportData}><Download className="w-4 h-4 mr-2" /> Export</Button>
          <input ref={fileInputRef} type="file" accept="application/json" className="hidden" onChange={importData} />
          <Button variant="outline" onClick={() => fileInputRef.current?.click()} disabled={importing}>
            {importing ? <Loader2 className="w-4 h-4 mr-2 animate-spin" /> : <Upload className="w-4 h-4 mr-2" />} Import
          </Button>
          <Dialog open={inviteOpen} onOpenChange={setInviteOpen}>
            <DialogTrigger asChild>
              <Button><UserPlus className="w-4 h-4 mr-2" /> Invite User</Button>
            </DialogTrigger>
            <DialogContent>
              <DialogHeader>
                <DialogTitle>Invite a new user</DialogTitle>
              </DialogHeader>
              <form onSubmit={handleInvite} className="space-y-4">
                <div className="space-y-2">
                  <Label htmlFor="inviteEmail">Email</Label>
                  <div className="relative">
                    <Mail className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
                    <Input id="inviteEmail" type="email" value={inviteEmail} onChange={(e) => setInviteEmail(e.target.value)} className="pl-9" placeholder="user@example.com" required />
                  </div>
                </div>
                <div className="space-y-2">
                  <Label>Role</Label>
                  <div className="grid grid-cols-3 gap-2">
                    {["user", "admin", "suspended"].map((r) => (
                      <button key={r} type="button" onClick={() => setInviteRole(r)}
                        className={`p-2 rounded-lg border-2 text-sm font-medium capitalize transition-all ${inviteRole === r ? "border-primary bg-primary/5" : "border-border"}`}>
                        {r}
                      </button>
                    ))}
                  </div>
                </div>
                <Button type="submit" className="w-full" disabled={inviting}>
                  {inviting ? <><Loader2 className="w-4 h-4 mr-2 animate-spin" />Sending…</> : "Send Invitation"}
                </Button>
              </form>
            </DialogContent>
          </Dialog>
        </div>
      </div>

      {/* Search */}
      <div className="relative">
        <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
        <Input value={search} onChange={(e) => setSearch(e.target.value)} placeholder="Search by name or email…" className="pl-9" />
      </div>

      {/* User list */}
      {loading ? (
        <div className="flex justify-center py-12"><Loader2 className="w-6 h-6 animate-spin text-muted-foreground" /></div>
      ) : filtered.length === 0 ? (
        <div className="text-center py-12 bg-card border border-dashed border-border rounded-2xl">
          <UsersIcon className="w-8 h-8 text-muted-foreground mx-auto mb-2" />
          <p className="text-muted-foreground text-sm">No users found.</p>
        </div>
      ) : (
        <div className="bg-card border border-border rounded-2xl divide-y divide-border overflow-hidden">
          {filtered.map((u) => (
            <div key={u.id} className="flex items-center gap-3 p-4">
              <div className="w-10 h-10 rounded-full bg-primary/10 flex items-center justify-center shrink-0">
                <span className="text-sm font-medium text-primary">{(u.full_name || u.email || "?")[0].toUpperCase()}</span>
              </div>
              <div className="min-w-0 flex-1">
                <p className="font-medium truncate">{u.full_name || "No name"}</p>
                <p className="text-xs text-muted-foreground truncate">{u.email}</p>
              </div>
              <span className={`text-xs font-medium px-2 py-1 rounded-full shrink-0 ${roleBadge(u.role)}`}>
                {u.role || "user"}
              </span>
              <select
                value={u.role || "user"}
                onChange={(e) => handleRoleChange(u.id, e.target.value)}
                disabled={updatingId === u.id}
                className="text-xs border border-border rounded-md px-2 py-1 bg-background shrink-0"
              >
                <option value="user">User</option>
                <option value="admin">Admin</option>
                <option value="suspended">Suspend</option>
              </select>
              <button onClick={() => setViewUser(u)} className="p-1.5 rounded-lg hover:bg-accent text-muted-foreground shrink-0" title="View details">
                <Eye className="w-4 h-4" />
              </button>
              <button onClick={() => handleDelete(u.id)} className="p-1.5 rounded-lg hover:bg-destructive/10 text-destructive shrink-0">
                <Trash2 className="w-4 h-4" />
              </button>
            </div>
          ))}
        </div>
      )}

      {viewUser && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 p-4" onClick={() => setViewUser(null)}>
          <div className="bg-card border border-border rounded-2xl w-full max-w-md p-5" onClick={(e) => e.stopPropagation()}>
            <div className="flex items-center justify-between mb-4">
              <h3 className="font-semibold">User Details</h3>
              <button onClick={() => setViewUser(null)} className="p-1 rounded-lg hover:bg-accent"><X className="w-4 h-4" /></button>
            </div>
            {(() => {
              const p = getProfileFor(viewUser.id);
              return (
                <div className="space-y-3 text-sm">
                  <div className="flex items-center gap-3">
                    <div className="w-12 h-12 rounded-full bg-primary/10 flex items-center justify-center">
                      <span className="text-lg font-medium text-primary">{(viewUser.full_name || viewUser.email || "?")[0].toUpperCase()}</span>
                    </div>
                    <div>
                      <p className="font-medium">{viewUser.full_name || "No name"}</p>
                      <p className="text-xs text-muted-foreground">{viewUser.email}</p>
                    </div>
                  </div>
                  <div className="space-y-2 pt-2 border-t border-border">
                    <Detail label="User ID (Primary Key)" value={viewUser.id} mono />
                    <Detail label="Role" value={viewUser.role || "user"} />
                    <Detail label="Created" value={viewUser.created_date ? new Date(viewUser.created_date).toLocaleString() : "—"} />
                  </div>
                  {p ? (
                    <div className="space-y-2 pt-2 border-t border-border">
                      <p className="text-xs font-medium text-muted-foreground">Linked Profile</p>
                      <Detail label="Profile ID" value={p.id} mono />
                      <Detail label="Name" value={`${p.first_name || ""} ${p.last_name || ""}`} />
                      <Detail label="Username" value={p.username || "—"} />
                      <Detail label="Account Type" value={p.account_type || "—"} />
                      <Detail label="Points" value={String(p.points || 0)} />
                    </div>
                  ) : (
                    <p className="text-xs text-muted-foreground pt-2 border-t border-border">No profile created yet.</p>
                  )}
                </div>
              );
            })()}
          </div>
        </div>
      )}
    </div>
  );
}

function Detail({ label, value, mono }) {
  return (
    <div className="flex flex-col gap-0.5">
      <span className="text-xs text-muted-foreground">{label}</span>
      <span className={`text-sm font-medium break-all ${mono ? "font-mono" : ""}`}>{value}</span>
    </div>
  );
}