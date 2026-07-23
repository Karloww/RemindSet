import React, { useState, useEffect } from "react";
import { Link } from "react-router-dom";
import { base44 } from "@/api/base44Client";
import { useProfile } from "@/lib/ProfileContext";
import { useShop } from "@/lib/useShop";
import { Button } from "@/components/ui/button";
import { Loader2, Check, Lock, Coins, Palette } from "lucide-react";
import ItemPreview from "@/components/ItemPreview";
import { COLOR_THEMES, BACKGROUNDS, COVER_PHOTOS, PROFILE_ICONS, SHOP_CATALOG, RARITY_INFO, isUrlValue, isCssValue } from "@/lib/themes";

const STATIC_MAPS = {
  color_theme: COLOR_THEMES,
  background: BACKGROUNDS,
  cover_photo: COVER_PHOTOS,
  profile_icon: PROFILE_ICONS,
};

const TAB_DEFS = [
  { id: "color_theme", label: "Color" },
  { id: "background", label: "Background" },
  { id: "cover_photo", label: "Cover" },
  { id: "profile_icon", label: "Icon" },
];

export default function CustomizeTheme() {
  const { profile } = useProfile();
  const { isOwned, isEquipped, equip, loading } = useShop();
  const [tab, setTab] = useState("color_theme");
  const [busy, setBusy] = useState({});
  const [shopItems, setShopItems] = useState([]);

  useEffect(() => {
    (async () => {
      try {
        const items = await base44.entities.ShopItem.list();
        setShopItems(items || []);
      } catch (e) { /* ignore */ }
    })();
  }, []);

  const isTeacher = profile?.account_type === "teacher";

  // Build merged options: static catalog + DB items not in static catalog
  const getOptions = (type) => {
    const staticMap = STATIC_MAPS[type];
    const staticOptions = Object.values(staticMap);
    const staticIds = new Set(staticOptions.map((o) => o.id));
    const dbItems = shopItems.filter((i) => i.type === type && i.value && !staticIds.has(i.value));
    const dbOptions = dbItems.map((i) => ({
      id: i.value,
      name: i.name,
      type: isUrlValue(i.value) ? "image" : "css",
      value: i.value,
    }));
    return [...staticOptions, ...dbOptions];
  };

  // Build price map: DB items first, then SHOP_CATALOG
  const priceMap = {};
  SHOP_CATALOG.forEach((i) => { priceMap[i.value] = { price: i.price, rarity: i.rarity }; });
  shopItems.forEach((i) => { if (!priceMap[i.value]) priceMap[i.value] = { price: i.price, rarity: i.rarity }; });

  const tabs = TAB_DEFS.map((t) => ({ ...t, options: getOptions(t.id) }));
  const activeTab = tabs.find((t) => t.id === tab);

  const handleEquip = async (opt) => {
    setBusy((b) => ({ ...b, [opt.id]: true }));
    await equip(tab, opt.id, opt.name);
    setBusy((b) => ({ ...b, [opt.id]: false }));
  };

  return (
    <div className="space-y-5">
      <div className="flex items-center justify-between flex-wrap gap-3">
        <div>
          <h1 className="text-2xl font-bold tracking-tight flex items-center gap-2"><Palette className="w-6 h-6 text-primary" /> Customize Theme</h1>
          <p className="text-muted-foreground text-sm mt-1">Restyle your whole app. Changes apply instantly.</p>
        </div>
        <div className="inline-flex items-center gap-1.5 bg-primary/10 text-primary px-3 py-1.5 rounded-full font-semibold">
          <Coins className="w-4 h-4" /> {isTeacher ? "Free" : `${profile?.points || 0} pts`}
        </div>
      </div>

      {/* Live preview card */}
      <div className="rounded-2xl border border-border overflow-hidden">
        <div className="p-5 bg-gradient-to-br from-primary to-primary/60 text-primary-foreground">
          <p className="text-primary-foreground/80 text-xs font-medium uppercase tracking-wide">Live Preview</p>
          <p className="text-xl font-bold mt-1">This is how your app looks right now.</p>
          <div className="flex gap-2 mt-3">
            <span className="bg-white/20 rounded-lg px-3 py-1.5 text-sm font-medium">Primary button</span>
            <span className="bg-white/10 rounded-lg px-3 py-1.5 text-sm">Secondary</span>
          </div>
        </div>
      </div>

      {/* Tabs */}
      <div className="flex gap-2 overflow-x-auto pb-1">
        {tabs.map((t) => (
          <button key={t.id} onClick={() => setTab(t.id)}
            className={`px-4 py-2 rounded-full text-sm font-medium whitespace-nowrap transition-colors ${tab === t.id ? "bg-primary text-primary-foreground" : "bg-muted text-muted-foreground hover:bg-accent"}`}>
            {t.label}
          </button>
        ))}
      </div>

      {loading ? (
        <div className="grid grid-cols-2 sm:grid-cols-3 gap-4">{[0,1,2,3,4,5].map((i) => <div key={i} className="h-40 rounded-2xl bg-muted animate-pulse" />)}</div>
      ) : (
        <div className="grid grid-cols-2 sm:grid-cols-3 gap-4">
          {activeTab.options.map((opt) => {
            const owned = isOwned(tab, opt.id);
            const equipped = isEquipped(tab, opt.id);
            const meta = priceMap[opt.id];
            const state = busy[opt.id];
            return (
              <div key={opt.id} className={`bg-card border rounded-2xl p-3 flex flex-col ${equipped ? "border-primary" : "border-border"}`}>
                <ItemPreview type={tab} value={opt.id} className="aspect-[4/3] mb-3" />
                <div className="flex items-center gap-1.5 mb-1 min-h-[18px]">
                  {meta && <span className={`text-[10px] font-semibold px-1.5 py-0.5 rounded-full ${RARITY_INFO[meta.rarity]?.badge || "bg-muted text-muted-foreground"}`}>{RARITY_INFO[meta.rarity]?.label || meta.rarity}</span>}
                  {equipped && <span className="text-[10px] font-semibold px-1.5 py-0.5 rounded-full bg-emerald-100 text-emerald-700">Active</span>}
                </div>
                <p className="font-medium text-sm">{opt.name}</p>
                <div className="mt-3">
                  {equipped ? (
                    <div className="w-full text-center text-sm font-medium text-emerald-600 py-2.5 rounded-lg bg-emerald-50 flex items-center justify-center gap-1"><Check className="w-4 h-4" /> Active</div>
                  ) : owned ? (
                    <Button variant="outline" className="w-full" disabled={state} onClick={() => handleEquip(opt)}>
                      {state ? <Loader2 className="w-4 h-4 mr-1 animate-spin" /> : <Check className="w-4 h-4 mr-1" />} Apply
                    </Button>
                  ) : isTeacher ? (
                    <Button variant="outline" className="w-full" disabled={state} onClick={() => handleEquip(opt)}>
                      {state ? <Loader2 className="w-4 h-4 mr-1 animate-spin" /> : <Check className="w-4 h-4 mr-1" />} Apply
                    </Button>
                  ) : (
                    <Link to="/shop" className="w-full inline-flex items-center justify-center gap-1 text-sm font-medium py-2.5 rounded-lg bg-muted text-muted-foreground hover:bg-accent">
                      <Lock className="w-3.5 h-3.5" /> {meta ? meta.price : "—"} pts
                    </Link>
                  )}
                </div>
              </div>
            );
          })}
        </div>
      )}

      <div className="text-center text-sm text-muted-foreground pt-2">
        {isTeacher
          ? "All themes are free for teachers — apply any style instantly."
          : <>Need more options? <Link to="/shop" className="text-primary font-medium hover:underline">Browse the Shop</Link></>}
      </div>
    </div>
  );
}