import React from "react";
import { BACKGROUNDS, COVER_PHOTOS, PROFILE_ICONS, isUrlValue, isCssValue, getColorThemeSwatch, isColorThemeDark } from "@/lib/themes";

// Renders a visual preview swatch for any customization option by (type, value).
export default function ItemPreview({ type, value, className = "", rounded = "rounded-xl" }) {
  const base = `${className} ${rounded} overflow-hidden`;

  if (type === "color_theme") {
    const swatch = getColorThemeSwatch(value);
    const dark = isColorThemeDark(value);
    return (
      <div className={`${base} relative flex items-center justify-center`} style={{ background: swatch }}>
        {dark && <span className="text-[10px] text-white/90 font-medium bg-black/30 px-1.5 py-0.5 rounded-full">Dark</span>}
      </div>
    );
  }
  if (type === "background") {
    const b = BACKGROUNDS[value];
    if (b) {
      if (b.type === "none") return <div className={`${base} bg-muted flex items-center justify-center text-xs text-muted-foreground`}>Default</div>;
      return <div className={`${base}`} style={{ background: b.value }} />;
    }
    // Dynamic background value
    if (isCssValue(value)) return <div className={`${base}`} style={{ background: value }} />;
    if (isUrlValue(value)) return <img src={value} alt="Background" className={`${base} object-cover`} />;
    return <div className={`${base} bg-muted`} />;
  }
  if (type === "cover_photo") {
    const c = COVER_PHOTOS[value];
    if (c) {
      if (c.type === "gradient") return <div className={`${base}`} style={{ background: c.value }} />;
      return <img src={c.value} alt={c.name} className={`${base} object-cover`} />;
    }
    // Dynamic cover photo (image URL)
    if (isUrlValue(value)) return <img src={value} alt="Cover" className={`${base} object-cover`} />;
    return <div className={`${base} bg-muted`} />;
  }
  if (type === "profile_icon") {
    const ic = PROFILE_ICONS[value];
    if (ic) {
      if (ic.type === "initials") return <div className={`${base} bg-primary/15 text-primary flex items-center justify-center text-2xl font-bold`}>AB</div>;
      return <div className={`${base} bg-accent flex items-center justify-center text-4xl`}>{ic.value}</div>;
    }
    // Dynamic profile icon (image URL)
    if (isUrlValue(value)) return <img src={value} alt="Icon" className={`${base} object-cover`} />;
    return <div className={`${base} bg-muted`} />;
  }
  return <div className={`${base} bg-muted`} />;
}