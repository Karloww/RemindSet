import React, { useState, useEffect } from "react";
import { base44 } from "@/api/base44Client";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { ShoppingBag, Loader2, Plus, Trash2, Pencil, Coins, Upload, X } from "lucide-react";
import { toast } from "@/components/ui/use-toast";

const ITEM_TYPES = ["color_theme", "cover_photo", "profile_icon"];
const RARITIES = ["common", "rare", "epic", "legendary"];

const emptyForm = { name: "", type: "color_theme", rarity: "common", price: 10, value: "", main_color: "#5B21B6", bg_color: "#EDE9FE", description: "", preview_url: "" };

export default function ManageShop() {
  const [items, setItems] = useState([]);
  const [loading, setLoading] = useState(true);
  const [dialogOpen, setDialogOpen] = useState(false);
  const [editing, setEditing] = useState(null);
  const [form, setForm] = useState(emptyForm);
  const [saving, setSaving] = useState(false);
  const [file, setFile] = useState(null);
  const [uploading, setUploading] = useState(false);

  const loadItems = async () => {
    try {
      const list = await base44.entities.ShopItem.list();
      setItems(list || []);
    } catch (e) {
      toast({ title: "Failed to load shop items", description: e.message, variant: "destructive" });
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => { loadItems(); }, []);

  const openCreate = () => {
    setEditing(null);
    setForm(emptyForm);
    setFile(null);
    setDialogOpen(true);
  };

  const openEdit = (item) => {
    setEditing(item);
    setForm({
      name: item.name || "",
      type: item.type || "color_theme",
      rarity: item.rarity || "common",
      price: item.price || 0,
      value: item.value || "",
      main_color: item.main_color || "#5B21B6",
      bg_color: item.bg_color || "#EDE9FE",
      description: item.description || "",
      preview_url: item.preview_url || "",
    });
    setFile(null);
    setDialogOpen(true);
  };

  const handleSave = async (e) => {
    e.preventDefault();
    setSaving(true);
    try {
      const data = { ...form, price: Number(form.price) || 0 };

      if (form.type === "color_theme") {
        // Value encodes both colors as JSON
        data.value = JSON.stringify({ main: form.main_color, bg: form.bg_color });
        // Generate a simple preview swatch
        data.preview_url = "";
      } else if ((form.type === "cover_photo" || form.type === "profile_icon") && file) {
        setUploading(true);
        const res = await base44.integrations.Core.UploadFile({ file });
        data.value = res.file_url;
        data.preview_url = res.file_url;
        setUploading(false);
      }

      if (!data.name) {
        toast({ title: "Name is required", variant: "destructive" });
        setSaving(false);
        return;
      }

      if (editing) {
        await base44.entities.ShopItem.update(editing.id, data);
        toast({ title: "Item updated!" });
      } else {
        await base44.entities.ShopItem.create(data);
        toast({ title: "Item created!" });
      }
      setDialogOpen(false);
      loadItems();
    } catch (err) {
      toast({ title: "Save failed", description: err.message, variant: "destructive" });
    } finally {
      setSaving(false);
    }
  };

  const handleDelete = async (itemId) => {
    if (!window.confirm("Delete this shop item?")) return;
    try {
      await base44.entities.ShopItem.delete(itemId);
      toast({ title: "Item deleted" });
      loadItems();
    } catch (e) {
      toast({ title: "Delete failed", description: e.message, variant: "destructive" });
    }
  };

  const rarityColor = (r) => ({
    common: "bg-muted text-muted-foreground",
    rare: "bg-blue-50 text-blue-600",
    epic: "bg-purple-50 text-purple-600",
    legendary: "bg-amber-50 text-amber-600",
  }[r] || "bg-muted text-muted-foreground");

  const isFileType = form.type === "cover_photo" || form.type === "profile_icon";
  const isColorType = form.type === "color_theme";

  return (
    <div className="space-y-5">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold tracking-tight">Manage Shop</h1>
          <p className="text-muted-foreground text-sm mt-1">{items.length} items</p>
        </div>
        <Button onClick={openCreate}><Plus className="w-4 h-4 mr-2" /> Add Item</Button>
      </div>

      {loading ? (
        <div className="flex justify-center py-12"><Loader2 className="w-6 h-6 animate-spin text-muted-foreground" /></div>
      ) : items.length === 0 ? (
        <div className="text-center py-12 bg-card border border-dashed border-border rounded-2xl">
          <ShoppingBag className="w-8 h-8 text-muted-foreground mx-auto mb-2" />
          <p className="text-muted-foreground text-sm">No shop items yet.</p>
        </div>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
          {items.map((item) => {
            // Preview for color themes
            let colorPreview = null;
            if (item.type === "color_theme" && item.value) {
              try {
                const c = JSON.parse(item.value);
                colorPreview = (
                  <div className="w-full h-full rounded-xl" style={{ background: c.bg || c.main || "#ccc" }} />
                );
              } catch { colorPreview = null; }
            }
            return (
              <div key={item.id} className="bg-card border border-border rounded-2xl p-4 flex items-start gap-3">
                <div className="w-12 h-12 rounded-xl bg-primary/10 flex items-center justify-center shrink-0 overflow-hidden">
                  {item.preview_url ? (
                    <img src={item.preview_url} alt={item.name} className="w-full h-full object-cover" />
                  ) : colorPreview || (
                    <ShoppingBag className="w-5 h-5 text-primary" />
                  )}
                </div>
                <div className="flex-1 min-w-0">
                  <p className="font-medium truncate">{item.name}</p>
                  <div className="flex flex-wrap items-center gap-1.5 mt-1">
                    <span className="text-xs text-muted-foreground bg-muted px-2 py-0.5 rounded-full">{item.type}</span>
                    <span className={`text-xs font-medium px-2 py-0.5 rounded-full ${rarityColor(item.rarity)}`}>{item.rarity}</span>
                    <span className="text-xs font-medium text-amber-600 inline-flex items-center gap-0.5"><Coins className="w-3 h-3" /> {item.price}</span>
                  </div>
                  {item.description && <p className="text-xs text-muted-foreground mt-1 line-clamp-2">{item.description}</p>}
                </div>
                <div className="flex flex-col gap-1 shrink-0">
                  <button onClick={() => openEdit(item)} className="p-1.5 rounded-lg hover:bg-accent"><Pencil className="w-4 h-4" /></button>
                  <button onClick={() => handleDelete(item.id)} className="p-1.5 rounded-lg hover:bg-destructive/10 text-destructive"><Trash2 className="w-4 h-4" /></button>
                </div>
              </div>
            );
          })}
        </div>
      )}

      {/* Add/Edit Dialog */}
      <Dialog open={dialogOpen} onOpenChange={setDialogOpen}>
        <DialogContent className="max-h-[90vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle>{editing ? "Edit Shop Item" : "Create Shop Item"}</DialogTitle>
          </DialogHeader>
          <form onSubmit={handleSave} className="space-y-4">
            <div className="space-y-2">
              <Label htmlFor="name">Name *</Label>
              <Input id="name" value={form.name} onChange={(e) => setForm({ ...form, name: e.target.value })} required />
            </div>
            <div className="grid grid-cols-2 gap-3">
              <div className="space-y-2">
                <Label htmlFor="type">Type</Label>
                <select id="type" value={form.type} onChange={(e) => setForm({ ...form, type: e.target.value })}
                  className="flex h-9 w-full rounded-md border border-input bg-background px-3 text-sm">
                  {ITEM_TYPES.map((t) => <option key={t} value={t}>{t.replace(/_/g, " ")}</option>)}
                </select>
              </div>
              <div className="space-y-2">
                <Label htmlFor="rarity">Rarity</Label>
                <select id="rarity" value={form.rarity} onChange={(e) => setForm({ ...form, rarity: e.target.value })}
                  className="flex h-9 w-full rounded-md border border-input bg-background px-3 text-sm">
                  {RARITIES.map((r) => <option key={r} value={r}>{r}</option>)}
                </select>
              </div>
            </div>
            <div className="space-y-2">
              <Label htmlFor="price">Price (coins)</Label>
              <Input id="price" type="number" min="0" value={form.price} onChange={(e) => setForm({ ...form, price: e.target.value })} />
            </div>

            {/* Color theme fields */}
            {isColorType && (
              <div className="space-y-3">
                <div className="grid grid-cols-2 gap-3">
                  <div className="space-y-2">
                    <Label>Main Color</Label>
                    <div className="flex items-center gap-2">
                      <input type="color" value={form.main_color} onChange={(e) => setForm({ ...form, main_color: e.target.value })}
                        className="w-10 h-9 rounded border border-input cursor-pointer" />
                      <Input value={form.main_color} onChange={(e) => setForm({ ...form, main_color: e.target.value })}
                        placeholder="#5B21B6" className="flex-1 font-mono text-sm" />
                    </div>
                  </div>
                  <div className="space-y-2">
                    <Label>Background Color</Label>
                    <div className="flex items-center gap-2">
                      <input type="color" value={form.bg_color} onChange={(e) => setForm({ ...form, bg_color: e.target.value })}
                        className="w-10 h-9 rounded border border-input cursor-pointer" />
                      <Input value={form.bg_color} onChange={(e) => setForm({ ...form, bg_color: e.target.value })}
                        placeholder="#EDE9FE" className="flex-1 font-mono text-sm" />
                    </div>
                  </div>
                </div>
                {/* Live preview */}
                <div className="h-16 rounded-xl border border-border overflow-hidden flex items-center justify-center"
                  style={{ background: form.bg_color }}>
                  <span className="text-sm font-semibold px-4 py-2 rounded-lg" style={{ background: form.main_color, color: "#fff" }}>
                    Preview
                  </span>
                </div>
              </div>
            )}

            {/* File upload for cover_photo / profile_icon */}
            {isFileType && (
              <div className="space-y-2">
                <Label>Attached File</Label>
                {file ? (
                  <div className="flex items-center gap-3 border border-border rounded-xl p-3">
                    <Upload className="w-5 h-5 text-muted-foreground shrink-0" />
                    <p className="text-sm font-medium truncate flex-1">{file.name}</p>
                    <button type="button" onClick={() => setFile(null)} className="p-1 text-destructive"><X className="w-4 h-4" /></button>
                  </div>
                ) : editing?.preview_url ? (
                  <div className="space-y-2">
                    <img src={editing.preview_url} alt="current" className="w-full h-24 object-cover rounded-xl border border-border" />
                    <label className="flex items-center gap-2 border border-dashed border-border rounded-xl p-3 cursor-pointer hover:border-primary/40 transition-colors">
                      <Upload className="w-4 h-4 text-muted-foreground" />
                      <span className="text-sm text-muted-foreground">Replace file</span>
                      <input type="file" accept="image/*" className="hidden" onChange={(e) => setFile(e.target.files?.[0] || null)} />
                    </label>
                  </div>
                ) : (
                  <label className="flex flex-col items-center justify-center gap-2 border-2 border-dashed border-border rounded-xl p-6 cursor-pointer hover:border-primary/40 transition-colors">
                    <Upload className="w-6 h-6 text-muted-foreground" />
                    <span className="text-sm text-muted-foreground">Click to upload a file (PDF, doc, image, etc.)</span>
                    <input type="file" accept="image/*,application/pdf" className="hidden" onChange={(e) => setFile(e.target.files?.[0] || null)} />
                  </label>
                )}
              </div>
            )}

            <div className="space-y-2">
              <Label htmlFor="description">Description</Label>
              <Textarea id="description" value={form.description} onChange={(e) => setForm({ ...form, description: e.target.value })} rows={2} />
            </div>
            <Button type="submit" className="w-full" disabled={saving}>
              {saving ? <><Loader2 className="w-4 h-4 mr-2 animate-spin" />{uploading ? "Uploading…" : "Saving…"}</> : (editing ? "Save Changes" : "Create Item")}
            </Button>
          </form>
        </DialogContent>
      </Dialog>
    </div>
  );
}