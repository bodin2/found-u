"use client";

import Image from "next/image";
import type { User } from "@/lib/auth";
import type { AppUser } from "@/lib/types";
import { getProfilePhotoUrl, getUserInitials } from "@/lib/user-display";
import { cn } from "@/lib/utils";
import { User as UserIcon } from "lucide-react";

interface UserAvatarProps {
  user: User | null | undefined;
  appUser?: AppUser | null;
  className?: string;
  iconClassName?: string;
  fallbackClassName?: string;
  /** Display size in CSS pixels — used for next/image optimization */
  size?: number;
}

function parseSizeFromClassName(className: string): number {
  const match = className.match(/\bw-(\d+)\b/);
  if (match) {
    const tailwindUnit = Number(match[1]);
    if (!Number.isNaN(tailwindUnit)) return tailwindUnit * 4;
  }
  return 40;
}

export function UserAvatar({
  user,
  appUser,
  className = "w-10 h-10 rounded-full object-cover",
  iconClassName = "w-5 h-5",
  fallbackClassName,
  size,
}: UserAvatarProps) {
  const photoUrl = getProfilePhotoUrl(appUser, user);
  const pixelSize = size ?? parseSizeFromClassName(className);
  const initials = getUserInitials(appUser, user);

  const shellClassName = cn(
    className,
    "relative shrink-0 overflow-hidden aspect-square"
  );

  if (photoUrl) {
    return (
      <span className={shellClassName}>
        <Image
          src={photoUrl}
          alt=""
          width={pixelSize}
          height={pixelSize}
          sizes={`${pixelSize}px`}
          className="h-full w-full object-cover"
        />
      </span>
    );
  }

  return (
    <div
      className={cn(
        shellClassName,
        "flex items-center justify-center bg-line-green/20 text-line-green font-semibold text-sm",
        fallbackClassName
      )}
    >
      {initials.length <= 2 ? (
        initials
      ) : (
        <UserIcon className={iconClassName} />
      )}
    </div>
  );
}
