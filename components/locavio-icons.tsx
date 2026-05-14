import type { LucideProps } from "lucide-react";
import {
  BarChart2,
  Building,
  Building2,
  Calendar,
  Camera,
  ClipboardList,
  FileCheck,
  FileText,
  Folder,
  Landmark,
  Pencil,
  Plus,
  RefreshCw,
  Settings,
  Sparkles,
  Trash2,
  TrendingUp,
  Users,
} from "lucide-react";

function mergeIconClass(className?: string) {
  return ["h-5 w-5 shrink-0", className].filter(Boolean).join(" ");
}

export function LogoMark({ className = "h-8 w-8" }: { className?: string }) {
  return (
    <img src="/logos/logomark-couleur.svg" alt="Locavio" width={32} height={32} className={className} />
  );
}

export function LogoMarkColor({ className = "h-8 w-8" }: { className?: string }) {
  return (
    <img src="/logos/logomark-couleur.svg" alt="Locavio" width={32} height={32} className={className} />
  );
}

/** Lockup pour fonds clairs (sidebar, pages légales, marketing). */
export function LogoFull({ className = "h-7 w-auto" }: { className?: string }) {
  return (
    <img src="/logos/lockup-horizontal-clair.svg?v=2" alt="Locavio" width={140} height={28} className={className} />
  );
}

/** Lockup pour fonds sombres (auth violet, e-mails #141428, cartes sombres). */
export function LogoFullDark({ className = "h-7 w-auto" }: { className?: string }) {
  return (
    <img src="/logos/lockup-horizontal-sombre.svg?v=2" alt="Locavio" width={140} height={28} className={className} />
  );
}

/** Logomark pour fonds sombres. */
export function LogoMarkDark({ className = "h-8 w-8" }: { className?: string }) {
  return (
    <img src="/logos/logomark-fond-sombre.svg" alt="Locavio" width={32} height={32} className={className} />
  );
}

export function IconBuilding({ className, size = 20, strokeWidth = 1.75, ...props }: LucideProps) {
  return <Building2 className={mergeIconClass(className)} size={size} strokeWidth={strokeWidth} {...props} />;
}

export function IconHome(props: LucideProps) {
  return <IconBuilding {...props} />;
}

export function IconChart({ className, size = 20, strokeWidth = 1.75, ...props }: LucideProps) {
  return <BarChart2 className={mergeIconClass(className)} size={size} strokeWidth={strokeWidth} {...props} />;
}

export function IconOffice({ className, size = 20, strokeWidth = 1.75, ...props }: LucideProps) {
  return <Building className={mergeIconClass(className)} size={size} strokeWidth={strokeWidth} {...props} />;
}

export function IconUsers({ className, size = 20, strokeWidth = 1.75, ...props }: LucideProps) {
  return <Users className={mergeIconClass(className)} size={size} strokeWidth={strokeWidth} {...props} />;
}

export function IconDocument({ className, size = 20, strokeWidth = 1.75, ...props }: LucideProps) {
  return <FileText className={mergeIconClass(className)} size={size} strokeWidth={strokeWidth} {...props} />;
}

export function IconContract({ className, size = 20, strokeWidth = 1.75, ...props }: LucideProps) {
  return <FileCheck className={mergeIconClass(className)} size={size} strokeWidth={strokeWidth} {...props} />;
}

export function IconClipboard({ className, size = 20, strokeWidth = 1.75, ...props }: LucideProps) {
  return <ClipboardList className={mergeIconClass(className)} size={size} strokeWidth={strokeWidth} {...props} />;
}

export function IconCog({ className, size = 20, strokeWidth = 1.75, ...props }: LucideProps) {
  return <Settings className={mergeIconClass(className)} size={size} strokeWidth={strokeWidth} {...props} />;
}

export function IconPencil({ className, size = 20, strokeWidth = 1.75, ...props }: LucideProps) {
  return <Pencil className={mergeIconClass(className)} size={size} strokeWidth={strokeWidth} {...props} />;
}

export function IconTrash({ className, size = 20, strokeWidth = 1.75, ...props }: LucideProps) {
  return <Trash2 className={mergeIconClass(className)} size={size} strokeWidth={strokeWidth} {...props} />;
}

export function IconDeviceCamera({ className, size = 20, strokeWidth = 1.75, ...props }: LucideProps) {
  return <Camera className={mergeIconClass(className)} size={size} strokeWidth={strokeWidth} {...props} />;
}

export function IconPlus({ className, size = 20, strokeWidth = 1.75, ...props }: LucideProps) {
  return <Plus className={mergeIconClass(className)} size={size} strokeWidth={strokeWidth} {...props} />;
}

export function IconTrendingUp({ className, size = 20, strokeWidth = 1.75, ...props }: LucideProps) {
  return <TrendingUp className={mergeIconClass(className)} size={size} strokeWidth={strokeWidth} {...props} />;
}

export function IconArrowPath({ className, size = 20, strokeWidth = 1.75, ...props }: LucideProps) {
  return <RefreshCw className={mergeIconClass(className)} size={size} strokeWidth={strokeWidth} {...props} />;
}

export function IconFolder({ className, size = 20, strokeWidth = 1.75, ...props }: LucideProps) {
  return <Folder className={mergeIconClass(className)} size={size} strokeWidth={strokeWidth} {...props} />;
}

export function IconCalendar({ className, size = 20, strokeWidth = 1.75, ...props }: LucideProps) {
  return <Calendar className={mergeIconClass(className)} size={size} strokeWidth={strokeWidth} {...props} />;
}

export function IconEuroCircle({ className, size = 20, strokeWidth = 1.75, ...props }: LucideProps) {
  return <Landmark className={mergeIconClass(className)} size={size} strokeWidth={strokeWidth} {...props} />;
}

export function IconBank({ className, size = 20, strokeWidth = 1.75, ...props }: LucideProps) {
  return <Landmark className={mergeIconClass(className)} size={size} strokeWidth={strokeWidth} {...props} />;
}

export function IconSparkles({ className, size = 20, strokeWidth = 1.75, ...props }: LucideProps) {
  return <Sparkles className={mergeIconClass(className)} size={size} strokeWidth={strokeWidth} {...props} />;
}
