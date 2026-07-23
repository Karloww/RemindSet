import React, { createContext, useState, useContext, useEffect, useCallback } from "react";
import { base44 } from "@/api/base44Client";
import { useAuth } from "@/lib/AuthContext";
import { COLOR_THEMES, BACKGROUNDS, isUrlValue, isCssValue } from "@/lib/themes";

const ProfileContext = createContext();

export const ProfileProvider = ({ children }) => {
  const { user, isAuthenticated } = useAuth();
  const [profile, setProfile] = useState(null);
  const [loading, setLoading] = useState(true);

  const loadProfile = useCallback(async () => {
    if (!user) return;
    try {
      const list = await base44.entities.Profile.filter({ created_by_id: user.id }, "-created_date", 1);
      setProfile(list?.[0] || null);
    } catch (e) {
      setProfile(null);
    } finally {
      setLoading(false);
    }
  }, [user]);

  useEffect(() => {
    if (isAuthenticated && user) {
      setLoading(true);
      loadProfile();
    } else {
      setProfile(null);
      setLoading(false);
    }
  }, [isAuthenticated, user, loadProfile]);

  // Apply theme: color variables + dark class + app background.
  useEffect(() => {
    const root = document.documentElement;
    const themeId = profile?.selected_color_theme || "indigo";
    const theme = COLOR_THEMES[themeId] || COLOR_THEMES.indigo;
    Object.entries(theme.vars).forEach(([k, v]) => root.style.setProperty(k, v));
    if (theme.dark) root.classList.add("dark"); else root.classList.remove("dark");

    const bgId = profile?.selected_background || "none";
    const bg = BACKGROUNDS[bgId];
    const layer = document.getElementById("app-background-layer");
    if (layer) {
      if (bg) {
        if (bg.type === "none") {
          layer.style.background = "";
          layer.style.backgroundImage = "";
          layer.classList.remove("app-bg-image");
        } else if (bg.type === "css") {
          layer.style.backgroundImage = "";
          layer.style.background = bg.value;
          layer.classList.remove("app-bg-image");
        } else if (bg.type === "image") {
          layer.style.background = "";
          layer.style.backgroundImage = `url('${bg.value}')`;
          layer.classList.add("app-bg-image");
        }
      } else if (bgId === "none") {
        layer.style.background = "";
        layer.style.backgroundImage = "";
        layer.classList.remove("app-bg-image");
      } else if (isCssValue(bgId)) {
        layer.style.backgroundImage = "";
        layer.style.background = bgId;
        layer.classList.remove("app-bg-image");
      } else if (isUrlValue(bgId)) {
        layer.style.background = "";
        layer.style.backgroundImage = `url('${bgId}')`;
        layer.classList.add("app-bg-image");
      } else {
        layer.style.background = "";
        layer.style.backgroundImage = "";
        layer.classList.remove("app-bg-image");
      }
    }
  }, [profile?.selected_color_theme, profile?.selected_background]);

  return (
    <ProfileContext.Provider value={{ profile, setProfile, loading, reloadProfile: loadProfile }}>
      {children}
    </ProfileContext.Provider>
  );
};

export const useProfile = () => {
  const ctx = useContext(ProfileContext);
  if (!ctx) throw new Error("useProfile must be used within ProfileProvider");
  return ctx;
};