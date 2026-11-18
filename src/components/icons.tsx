import {
  BriefcaseBusiness,
  Compass,
  Feather,
  FingerprintPattern,
  GraduationCap,
  HeartHandshake,
  Link2,
  ShieldCheck,
  Sparkles,
  type LucideIcon,
} from "lucide-react";
import type { Theme } from "@/lib/harf";

export const THEME_ICONS: Record<Theme, LucideIcon> = {
  Learning: GraduationCap,
  Authorship: Feather,
  Identity: FingerprintPattern,
  Relationships: HeartHandshake,
  Trust: ShieldCheck,
  Dependency: Link2,
  Creativity: Sparkles,
  Work: BriefcaseBusiness,
  "Human Agency": Compass,
};

export function ThemeIcon({ theme, className }: { theme: string; className?: string }) {
  const Icon = THEME_ICONS[theme as Theme];
  return Icon ? <Icon aria-hidden className={className} strokeWidth={1.6} /> : null;
}
