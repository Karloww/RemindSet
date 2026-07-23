import React, { useEffect, useState } from "react";
import { Link } from "react-router-dom";
import { base44 } from "@/api/base44Client";
import { useProfile } from "@/lib/ProfileContext";
import { useShop } from "@/lib/useShop";
import { Button } from "@/components/ui/button";
import { Coins, Loader2, Check, Sparkles } from "lucide-react";
import ItemPreview from "@/components/ItemPreview";
import { RARITY_INFO } from "@/lib/themes";

const TABS = [
  { id: "color_theme", label: "Color Themes" },
  { id: "background", label: "Backgrounds" },
  { id: "cover_photo", label: "Cover Photos" },
  { id: "profile_icon", label: "Profile Icons" },
];

export default function Shop() {
  const { profile } = useProfile();
  const { isOwned, isEquipped, buy, equip, loading } = useShop();
  const [items, setItems] = useState([]);
  const [tab, setTab] = useState("color_theme");
  const [busy, setBusy] = useState({});

  useEffect(() => {
    let active = true;
    (async () => {
      const data = await base44.entities.ShopItem.list("name", 200);
      if (active) setItems(data || []);
    })();
    return () => { active = false; };
  }, []);

  const filtered = items.filter((i) => i.type === tab);

  const handleBuy = async (item) => {
    setBusy((b) => ({ ...b, [item.id]: "buy" }));
    await buy(item);
    setBusy((b) => ({ ...b, [item.id]: null }));
  };
  const handleEquip = async (item) => {
    setBusy((b) => ({ ...b, [item.id]: "equip" }));
    await equip(item.type, item.value, item.name);
    setBusy((b) => ({ ...b, [item.id]: null }));
  };

  return (
    <div className="space-y-5">
      <div className="flex items-center justify-between flex-wrap gap-3">
        <div>
          <h1 className="text-2xl font-bold tracking-tight">Shop</h1>
          <p className="text-muted-foreground text-sm mt-1">Spend your points on customization items.</p>
        </div>
        <div className="inline-flex items-center gap-1.5 bg-primary/10 text-primary px-3 py-1.5 rounded-full font-semibold">
          <Coins className="w-4 h-4" /> {profile?.points || 0}
        </div>
      </div>

      {/* Tabs */}
      <div className="flex gap-2 overflow-x-auto pb-1">
        {TABS.map((t) => (
          <button key={t.id} onClick={() => setTab(t.id)}
            className={`px-4 py-2 rounded-full text-sm font-medium whitespace-nowrap transition-colors ${tab === t.id ? "bg-primary text-primary-foreground" : "bg-muted text-muted-foreground hover:bg-accent"}`}>
            {t.label}
          </button>
        ))}
      </div>

      {loading ? (
        <div className="grid grid-cols-2 gap-4">{[0,1,2,3].map((i) => <div key={i} className="h-44 rounded-2xl bg-muted animate-pulse" />)}</div>
      ) : (
        <div className="grid grid-cols-2 gap-4">
          {filtered.map((item) => {
            const owned = isOwned(item.type, item.value);
            const equipped = isEquipped(item.type, item.value);
            const rar = RARITY_INFO[item.rarity] || RARITY_INFO.common;
            const state = busy[item.id];
            return (
              <div key={item.id} className="bg-card border border-border rounded-2xl p-3 flex flex-col">
                <ItemPreview type={item.type} value={item.value} className="aspect-[4/3] mb-3" />
                <div className="flex items-center gap-1.5 mb-1">
                  <span className={`text-[10px] font-semibold px-1.5 py-0.5 rounded-full ${rar.badge}`}>{rar.label}</span>
                  {equipped && <span className="text-[10px] font-semibold px-1.5 py-0.5 rounded-full bg-emerald-100 text-emerald-700">Active</span>}
                </div>
                <p className="font-medium text-sm leading-tight">{item.name}</p>
                <p className="text-xs text-muted-foreground line-clamp-2 mt-0.5 flex-1">{item.description}</p>
                <div className="mt-3">
                  {equipped ? (
                    <div className="w-full text-center text-sm font-medium text-emerald-600 py-2.5 rounded-lg bg-emerald-50 flex items-center justify-center gap-1"><Check className="w-4 h-4" /> Active</div>
                  ) : owned ? (
                    <Button variant="outline" className="w-full" disabled={state === "equip"} onClick={() => handleEquip(item)}>
                      {state === "equip" ? <Loader2 className="w-4 h-4 mr-1 animate-spin" /> : <Sparkles className="w-4 h-4 mr-1" />} Apply
                    </Button>
                  ) : (
                    <Button className="w-full" disabled={state === "buy"} onClick={() => handleBuy(item)}>
                      {state === "buy" ? <Loader2 className="w-4 h-4 mr-1 animate-spin" /> : <Coins className="w-4 h-4 mr-1" />} {item.price}
                    </Button>
                  )}
                </div>
              </div>
            );
          })}
        </div>
      )}

      <div className="text-center text-sm text-muted-foreground pt-2">
        Want more points? <Link to="/classrooms" className="text-primary font-medium hover:underline">Complete your lessons</Link> to earn {10} pts each.
      </div>
    </div>
  );
}