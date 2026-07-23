import { useState, useEffect, useCallback } from "react";
import { base44 } from "@/api/base44Client";
import { useProfile } from "@/lib/ProfileContext";
import { toast } from "@/components/ui/use-toast";

const FIELD_MAP = {
  color_theme: "selected_color_theme",
  background: "selected_background",
  cover_photo: "selected_cover_photo",
  profile_icon: "selected_profile_icon",
};

export function useShop() {
  const { profile, setProfile } = useProfile();
  const [purchases, setPurchases] = useState([]);
  const [loading, setLoading] = useState(true);

  const reload = useCallback(async () => {
    if (!profile) { setLoading(false); return; }
    try {
      const data = await base44.entities.UserPurchase.filter({ created_by_id: profile.created_by_id }, "-created_date", 200);
      setPurchases(data || []);
    } finally {
      setLoading(false);
    }
  }, [profile]);

  useEffect(() => { reload(); }, [reload]);

  const isTeacher = profile?.account_type === "teacher";
  const ownedValues = new Set(purchases.map((p) => p.item_value));
  // Defaults are always "owned". Teachers get everything for free.
  const isOwned = (type, value) => isTeacher || value === "default" || value === "indigo" || value === "none" || ownedValues.has(value);

  const buy = async (item) => {
    if (ownedValues.has(item.value)) return true;
    if ((profile.points || 0) < item.price) {
      toast({ title: "Not enough points", description: `You need ${item.price - profile.points} more points.`, variant: "destructive" });
      return false;
    }
    try {
      const newPoints = profile.points - item.price;
      const updatedProfile = await base44.entities.Profile.update(profile.id, { points: newPoints });
      setProfile(updatedProfile);
      await base44.entities.UserPurchase.create({
        shop_item_id: item.id, item_type: item.type, item_value: item.value, item_name: item.name, rarity: item.rarity,
      });
      await reload();
      toast({ title: "Purchased!", description: `${item.name} is now yours.` });
      return true;
    } catch (err) {
      toast({ title: "Purchase failed", description: err.message, variant: "destructive" });
      return false;
    }
  };

  const equip = async (type, value, name) => {
    const field = FIELD_MAP[type];
    if (!field || !profile) return;
    try {
      const updatedProfile = await base44.entities.Profile.update(profile.id, { [field]: value });
      setProfile(updatedProfile);
      toast({ title: "Applied!", description: `${name || "Theme"} is now active.` });
    } catch (err) {
      toast({ title: "Failed to apply", description: err.message, variant: "destructive" });
    }
  };

  const isEquipped = (type, value) => {
    const field = FIELD_MAP[type];
    return profile?.[field] === value;
  };

  return { purchases, ownedValues, isOwned, isEquipped, loading, buy, equip };
}