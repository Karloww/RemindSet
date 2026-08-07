// RemindSet theme system — the core of the "Customize Theme" feature.
// Each color theme overrides the shadcn CSS variables on :root, restyling the whole interface.

export const COLOR_THEMES = {
  ocean: {
    id: "ocean", name: "Ocean Blue", dark: false,
    vars: {
      "--primary": "199 89% 48%", "--primary-foreground": "0 0% 100%",
      "--ring": "199 89% 48%", "--accent": "199 89% 95%", "--accent-foreground": "199 89% 30%",
      "--chart-1": "199 89% 48%", "--chart-2": "173 58% 39%", "--chart-3": "197 37% 40%",
      "--chart-4": "43 74% 66%", "--chart-5": "27 87% 67%"
    }
  },
  emerald: {
    id: "emerald", name: "Emerald", dark: false,
    vars: {
      "--primary": "160 84% 39%", "--primary-foreground": "0 0% 100%",
      "--ring": "160 84% 39%", "--accent": "160 84% 95%", "--accent-foreground": "160 84% 25%",
      "--chart-1": "160 84% 39%", "--chart-2": "173 58% 39%", "--chart-3": "197 37% 40%",
      "--chart-4": "43 74% 66%", "--chart-5": "27 87% 67%"
    }
  },
  sunset: {
    id: "sunset", name: "Sunset Orange", dark: false,
    vars: {
      "--primary": "25 95% 53%", "--primary-foreground": "0 0% 100%",
      "--ring": "25 95% 53%", "--accent": "25 95% 95%", "--accent-foreground": "25 95% 30%",
      "--chart-1": "25 95% 53%", "--chart-2": "173 58% 39%", "--chart-3": "197 37% 40%",
      "--chart-4": "43 74% 66%", "--chart-5": "27 87% 67%"
    }
  },
  royal: {
    id: "royal", name: "Royal Purple", dark: false,
    vars: {
      "--primary": "270 76% 53%", "--primary-foreground": "0 0% 100%",
      "--ring": "270 76% 53%", "--accent": "270 76% 96%", "--accent-foreground": "270 76% 30%",
      "--chart-1": "270 76% 53%", "--chart-2": "173 58% 39%", "--chart-3": "197 37% 40%",
      "--chart-4": "43 74% 66%", "--chart-5": "27 87% 67%"
    }
  },
  rose: {
    id: "rose", name: "Rose Pink", dark: false,
    vars: {
      "--primary": "347 77% 50%", "--primary-foreground": "0 0% 100%",
      "--ring": "347 77% 50%", "--accent": "347 77% 96%", "--accent-foreground": "347 77% 30%",
      "--chart-1": "347 77% 50%", "--chart-2": "173 58% 39%", "--chart-3": "197 37% 40%",
      "--chart-4": "43 74% 66%", "--chart-5": "27 87% 67%"
    }
  },
  midnight: {
    id: "midnight", name: "Midnight", dark: true,
    vars: {
      "--primary": "217 91% 60%", "--primary-foreground": "0 0% 100%",
      "--ring": "217 91% 60%", "--accent": "217 91% 20%", "--accent-foreground": "217 91% 90%",
      "--chart-1": "217 91% 60%", "--chart-2": "160 60% 45%", "--chart-3": "30 80% 55%",
      "--chart-4": "280 65% 60%", "--chart-5": "340 75% 55%"
    }
  },
  forestnight: {
    id: "forestnight", name: "Forest Night", dark: true,
    vars: {
      "--primary": "142 71% 45%", "--primary-foreground": "0 0% 100%",
      "--ring": "142 71% 45%", "--accent": "142 71% 20%", "--accent-foreground": "142 71% 90%",
      "--chart-1": "142 71% 45%", "--chart-2": "173 58% 39%", "--chart-3": "197 37% 40%",
      "--chart-4": "43 74% 66%", "--chart-5": "27 87% 67%"
    }
  },
  obsidian: {
    id: "obsidian", name: "Obsidian", dark: true,
    vars: {
      "--primary": "280 65% 60%", "--primary-foreground": "0 0% 100%",
      "--ring": "280 65% 60%", "--accent": "280 65% 20%", "--accent-foreground": "280 65% 90%",
      "--chart-1": "280 65% 60%", "--chart-2": "160 60% 45%", "--chart-3": "30 80% 55%",
      "--chart-4": "217 91% 60%", "--chart-5": "340 75% 55%"
    }
  }
};

export const BACKGROUNDS = {
  none: { id: "none", name: "Default", type: "none", value: "" },
  soft_gradient: {
    id: "soft_gradient", name: "Soft Gradient", type: "css",
    value: "linear-gradient(135deg, hsl(var(--primary) / 0.08) 0%, hsl(var(--background)) 60%)"
  },
  aurora: {
    id: "aurora", name: "Aurora", type: "css",
    value: "linear-gradient(135deg, #667eea 0%, #764ba2 50%, #f093fb 100%)"
  },
  peach: {
    id: "peach", name: "Peach Dawn", type: "css",
    value: "linear-gradient(135deg, #ffecd2 0%, #fcb69f 100%)"
  },
  mist: {
    id: "mist", name: "Mountain Mist", type: "image",
    value: "https://images.unsplash.com/photo-1506905925346-21bda4d32df4?w=1600&q=70"
  },
  galaxy: {
    id: "galaxy", name: "Starry Galaxy", type: "image",
    value: "https://images.unsplash.com/photo-1419242902214-272b3f66ee7a?w=1600&q=70"
  },
  beach: {
    id: "beach", name: "Calm Beach", type: "image",
    value: "https://images.unsplash.com/photo-1507525428034-b723cf961d3e?w=1600&q=70"
  },
  forest: {
    id: "forest", name: "Deep Forest", type: "image",
    value: "https://images.unsplash.com/photo-1441974231531-c6227db76b6e?w=1600&q=70"
  }
};

export const COVER_PHOTOS = {
  default: { id: "default", name: "Default", type: "gradient", value: "linear-gradient(135deg, hsl(var(--primary)) 0%, hsl(var(--primary) / 0.7) 100%)" },
  mountain: { id: "mountain", name: "Mountain Lake", type: "image", value: "https://images.unsplash.com/photo-1506905925346-21bda4d32df4?w=1200&q=70" },
  city: { id: "city", name: "City Lights", type: "image", value: "https://images.unsplash.com/photo-1477959858617-67f85cf4f1df?w=1200&q=70" },
  space: { id: "space", name: "Deep Space", type: "image", value: "https://images.unsplash.com/photo-1419242902214-272b3f66ee7a?w=1200&q=70" },
  sunset: { id: "sunset", name: "Golden Sunset", type: "image", value: "https://images.unsplash.com/photo-1500530855697-b586d89ba3ee?w=1200&q=70" },
  canopy: { id: "canopy", name: "Forest Canopy", type: "image", value: "https://images.unsplash.com/photo-1441974231531-c6227db76b6e?w=1200&q=70" },
  waves: { id: "waves", name: "Ocean Waves", type: "image", value: "https://images.unsplash.com/photo-1505144808419-1957a94ca61e?w=1200&q=70" }
};

export const PROFILE_ICONS = {
  default: { id: "default", name: "Initials", type: "initials", value: "" },
  fox: { id: "fox", name: "Fox", type: "emoji", value: "🦊" },
  panda: { id: "panda", name: "Panda", type: "emoji", value: "🐼" },
  rocket: { id: "rocket", name: "Rocket", type: "emoji", value: "🚀" },
  star: { id: "star", name: "Star", type: "emoji", value: "⭐" },
  grad: { id: "grad", name: "Scholar", type: "emoji", value: "🎓" },
  lion: { id: "lion", name: "Lion", type: "emoji", value: "🦁" },
  octopus: { id: "octopus", name: "Octopus", type: "emoji", value: "🐙" },
  owl: { id: "owl", name: "Owl", type: "emoji", value: "🦉" },
  moon: { id: "moon", name: "Moon", type: "emoji", value: "🌙" },
  dragon: { id: "dragon", name: "Dragon", type: "emoji", value: "🐉" },
  unicorn: { id: "unicorn", name: "Unicorn", type: "emoji", value: "🦄" }
};

export const RARITY_INFO = {
  common: { label: "Common", color: "text-slate-500", badge: "bg-slate-100 text-slate-600", price: 50 },
  rare: { label: "Rare", color: "text-blue-600", badge: "bg-blue-100 text-blue-700", price: 150 },
  epic: { label: "Epic", color: "text-purple-600", badge: "bg-purple-100 text-purple-700", price: 400 },
  legendary: { label: "Legendary", color: "text-amber-600", badge: "bg-amber-100 text-amber-700", price: 1000 }
};

export const POINTS_PER_LESSON = 10;

// Catalog used to seed the ShopItem entity and to resolve previews.
export const SHOP_CATALOG = [
  // Color themes
  { name: "Ocean Blue", type: "color_theme", rarity: "common", price: 50, value: "ocean", description: "A calm, breezy blue across the whole app." },
  { name: "Emerald", type: "color_theme", rarity: "common", price: 50, value: "emerald", description: "Fresh green accents for focused studying." },
  { name: "Sunset Orange", type: "color_theme", rarity: "rare", price: 150, value: "sunset", description: "Warm, energetic orange tones." },
  { name: "Rose Pink", type: "color_theme", rarity: "rare", price: 150, value: "rose", description: "Soft and playful pink highlights." },
  { name: "Royal Purple", type: "color_theme", rarity: "epic", price: 400, value: "royal", description: "Bold, regal purple palette." },
  { name: "Midnight", type: "color_theme", rarity: "epic", price: 400, value: "midnight", description: "A sleek dark theme with blue glow." },
  { name: "Forest Night", type: "color_theme", rarity: "legendary", price: 1000, value: "forestnight", description: "Dark mode with a verdant green soul." },
  { name: "Obsidian", type: "color_theme", rarity: "legendary", price: 1000, value: "obsidian", description: "The rarest dark theme — purple nebula vibes." },
  // Backgrounds
  { name: "Soft Gradient", type: "background", rarity: "common", price: 50, value: "soft_gradient", description: "A subtle tint behind everything." },
  { name: "Aurora", type: "background", rarity: "rare", price: 150, value: "aurora", description: "Vibrant multicolor gradient backdrop." },
  { name: "Peach Dawn", type: "background", rarity: "rare", price: 150, value: "peach", description: "Warm peachy morning glow." },
  { name: "Mountain Mist", type: "background", rarity: "epic", price: 400, value: "mist", description: "Misty mountain scenery behind your app." },
  { name: "Starry Galaxy", type: "background", rarity: "epic", price: 400, value: "galaxy", description: "A galaxy of stars behind your work." },
  { name: "Deep Forest", type: "background", rarity: "legendary", price: 1000, value: "forest", description: "Immersive deep-forest backdrop." },
  { name: "Calm Beach", type: "background", rarity: "legendary", price: 1000, value: "beach", description: "Serene beach panorama backdrop." },
  // Cover photos
  { name: "Mountain Lake Cover", type: "cover_photo", rarity: "common", price: 50, value: "mountain", description: "Alpine lake for your profile banner." },
  { name: "City Lights Cover", type: "cover_photo", rarity: "rare", price: 150, value: "city", description: "Neon city skyline banner." },
  { name: "Golden Sunset Cover", type: "cover_photo", rarity: "rare", price: 150, value: "sunset", description: "Warm sunset banner." },
  { name: "Deep Space Cover", type: "cover_photo", rarity: "epic", price: 400, value: "space", description: "Cosmic banner for your profile." },
  { name: "Ocean Waves Cover", type: "cover_photo", rarity: "epic", price: 400, value: "waves", description: "Rolling ocean waves banner." },
  { name: "Forest Canopy Cover", type: "cover_photo", rarity: "legendary", price: 1000, value: "canopy", description: "Lush forest canopy banner." },
  // Profile icons
  { name: "Fox Icon", type: "profile_icon", rarity: "common", price: 50, value: "fox", description: "A clever fox profile icon." },
  { name: "Panda Icon", type: "profile_icon", rarity: "common", price: 50, value: "panda", description: "An adorable panda icon." },
  { name: "Rocket Icon", type: "profile_icon", rarity: "rare", price: 150, value: "rocket", description: "Blast off with a rocket icon." },
  { name: "Star Icon", type: "profile_icon", rarity: "rare", price: 150, value: "star", description: "Shine bright with a star." },
  { name: "Scholar Icon", type: "profile_icon", rarity: "rare", price: 150, value: "grad", description: "Graduate cap icon." },
  { name: "Lion Icon", type: "profile_icon", rarity: "epic", price: 400, value: "lion", description: "King of the class lion icon." },
  { name: "Owl Icon", type: "profile_icon", rarity: "epic", price: 400, value: "owl", description: "Wise owl profile icon." },
  { name: "Octopus Icon", type: "profile_icon", rarity: "epic", price: 400, value: "octopus", description: "Smart multitasking octopus." },
  { name: "Moon Icon", type: "profile_icon", rarity: "legendary", price: 1000, value: "moon", description: "Mystical moon icon." },
  { name: "Dragon Icon", type: "profile_icon", rarity: "legendary", price: 1000, value: "dragon", description: "Mythic dragon profile icon." },
  { name: "Unicorn Icon", type: "profile_icon", rarity: "legendary", price: 1000, value: "unicorn", description: "Magical unicorn icon — the rarest." }
];

// Resolve a preview for a shop item from the catalog value.
export function getShopPreview(item) {
  if (item.type === "color_theme") {
    const t = COLOR_THEMES[item.value];
    return t ? { kind: "color", color: `hsl(${t.vars["--primary"]})`, dark: t.dark } : { kind: "color", color: "#999" };
  }
  if (item.type === "background") {
    const b = BACKGROUNDS[item.value];
    return b ? { kind: b.type, value: b.value } : { kind: "none" };
  }
  if (item.type === "cover_photo") {
    const c = COVER_PHOTOS[item.value];
    return c ? { kind: c.type, value: c.value } : { kind: "none" };
  }
  if (item.type === "profile_icon") {
    const ic = PROFILE_ICONS[item.value];
    return ic ? { kind: ic.type, value: ic.value } : { kind: "initials" };
  }
  return { kind: "none" };
}

export function isUrlValue(v) {
  return typeof v === "string" && (v.startsWith("http") || v.startsWith("/") || v.startsWith("data:"));
}

export function isCssValue(v) {
  return typeof v === "string" && (v.startsWith("#") || v.startsWith("linear-gradient") || v.startsWith("radial-gradient") || v.startsWith("rgb(") || v.startsWith("hsl("));
}

// Convert a hex color (#RRGGBB) to HSL channels string like "243 75% 59%"
export function hexToHsl(hex) {
  hex = hex.replace('#', '');
  const r = parseInt(hex.slice(0, 2), 16) / 255;
  const g = parseInt(hex.slice(2, 4), 16) / 255;
  const b = parseInt(hex.slice(4, 6), 16) / 255;
  const max = Math.max(r, g, b), min = Math.min(r, g, b);
  let h = 0, s = 0;
  const l = (max + min) / 2;
  if (max !== min) {
    const d = max - min;
    s = l > 0.5 ? d / (2 - max - min) : d / (max + min);
    switch (max) {
      case r: h = ((g - b) / d + (g < b ? 6 : 0)); break;
      case g: h = ((b - r) / d + 2); break;
      case b: h = ((r - g) / d + 4); break;
    }
    h *= 60;
  }
  return { h: Math.round(h), s: Math.round(s * 100), l: Math.round(l * 100) };
}

function hslStr(h, s, l) { return `${h} ${s}% ${l}%`; }

// Try to parse a custom color theme value (JSON with {main, bg} hex colors).
// Returns {main, bg} or null.
export function parseCustomColorTheme(value) {
  if (typeof value !== 'string') return null;
  try {
    const parsed = JSON.parse(value);
    if (parsed && parsed.main) return parsed;
  } catch (e) { /* not JSON */ }
  return null;
}

// Resolve any color theme value (static id from the catalog or a custom JSON) into CSS vars.
export function resolveColorThemeVars(value) {
  if (COLOR_THEMES[value]) return COLOR_THEMES[value].vars;
  const custom = parseCustomColorTheme(value);
  if (custom) {
    const hsl = hexToHsl(custom.main);
    const primary = hslStr(hsl.h, hsl.s, hsl.l);
    return {
      "--primary": primary,
      "--primary-foreground": "0 0% 100%",
      "--ring": primary,
      "--accent": hslStr(hsl.h, hsl.s, 96),
      "--accent-foreground": hslStr(hsl.h, hsl.s, 30),
      "--chart-1": primary,
    };
  }
  return COLOR_THEMES.ocean.vars;
}

// Get a CSS color string for previewing a color theme value.
export function getColorThemeSwatch(value) {
  if (COLOR_THEMES[value]) return `hsl(${COLOR_THEMES[value].vars["--primary"]})`;
  const custom = parseCustomColorTheme(value);
  if (custom) return custom.main;
  return "#999";
}

// Check if a color theme value is a dark theme.
export function isColorThemeDark(value) {
  if (COLOR_THEMES[value]) return COLOR_THEMES[value].dark;
  return false;
}