import React from "react";
import { PROFILE_ICONS, isUrlValue } from "@/lib/themes";

// Renders the user's selected profile icon: emoji, uploaded image, or initials fallback.
export default function ProfileAvatar({ profile, user, size = "md", className = "" }) {
  const sizes = {
    sm: "w-8 h-8 text-base",
    md: "w-12 h-12 text-2xl",
    lg: "w-20 h-20 text-4xl",
    xl: "w-28 h-28 text-6xl"
  };
  const iconId = profile?.selected_profile_icon || "default";
  const icon = PROFILE_ICONS[iconId];
  const name = profile ? `${profile.first_name || ""} ${profile.last_name || ""}`.trim() : (user?.full_name || "U");
  const initials = name.split(" ").map((p) => p[0]).slice(0, 2).join("").toUpperCase() || "U";

  // Uploaded profile picture takes priority.
  if (profile?.profile_picture_url) {
    return (
      <img
        src={profile.profile_picture_url}
        alt={name}
        className={`${sizes[size]} ${className} rounded-full object-cover shrink-0`}
      />
    );
  }

  // Dynamic profile icon (image URL from shop)
  if (!icon && isUrlValue(iconId)) {
    return (
      <img
        src={iconId}
        alt={name}
        className={`${sizes[size]} ${className} rounded-full object-cover shrink-0`}
      />
    );
  }

  const resolvedIcon = icon || PROFILE_ICONS.default;

  return (
    <div className={`${sizes[size]} ${className} rounded-full bg-primary/15 text-primary flex items-center justify-center font-semibold shrink-0`}>
      {resolvedIcon.type === "emoji" ? (
        <span>{resolvedIcon.value}</span>
      ) : (
        <span>{initials}</span>
      )}
    </div>
  );
}