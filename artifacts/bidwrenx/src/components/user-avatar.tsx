import { cn } from "@/lib/utils";

interface UserAvatarProps {
  name: string;
  photoUrl?: string | null;
  size?: "xs" | "sm" | "md" | "lg";
  className?: string;
}

const sizes = {
  xs: "w-6 h-6 text-xs",
  sm: "w-8 h-8 text-sm",
  md: "w-10 h-10 text-base",
  lg: "w-14 h-14 text-xl",
};

export function UserAvatar({ name, photoUrl, size = "sm", className }: UserAvatarProps) {
  const initials = name
    .split(" ")
    .map((part) => part[0])
    .join("")
    .slice(0, 2)
    .toUpperCase();

  if (photoUrl) {
    return (
      <img
        src={`/api/storage${photoUrl}`}
        alt={name}
        className={cn("rounded-full object-cover shrink-0", sizes[size], className)}
        onError={(e) => {
          (e.target as HTMLImageElement).style.display = "none";
        }}
      />
    );
  }

  return (
    <div
      className={cn(
        "rounded-full bg-primary/20 flex items-center justify-center text-primary font-semibold shrink-0",
        sizes[size],
        className
      )}
    >
      {initials}
    </div>
  );
}
