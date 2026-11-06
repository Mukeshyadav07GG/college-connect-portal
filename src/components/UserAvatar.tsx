import { cn } from "@/lib/utils";

interface Props {
  name?: string | null;
  src?: string | null;
  className?: string;
}

/** Round profile photo with initial-letter fallback. Used everywhere a user avatar appears. */
export const UserAvatar = ({ name, src, className }: Props) => {
  const initial = (name ?? "?").trim().charAt(0).toUpperCase() || "?";
  return src ? (
    <img src={src} alt={name ?? "Profile"} className={cn("rounded-full object-cover shrink-0", className)} />
  ) : (
    <div className={cn("rounded-full gradient-bg flex items-center justify-center text-primary-foreground font-bold shrink-0", className)}>
      {initial}
    </div>
  );
};
