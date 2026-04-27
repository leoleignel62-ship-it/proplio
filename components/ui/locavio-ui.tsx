"use client";

import type { ButtonHTMLAttributes, ReactNode } from "react";
import { PC } from "@/lib/locavio-colors";

export type BtnSize = "default" | "small";

type BaseBtnProps = Omit<ButtonHTMLAttributes<HTMLButtonElement>, "children"> & {
  children: ReactNode;
  icon?: ReactNode;
  loading?: boolean;
  size?: BtnSize;
  /** Couleur du spinner en chargement */
  spinnerTone?: "onPrimary" | "onMuted" | "onDanger";
};

const pad = (s: BtnSize) => (s === "small" ? "6px 12px" : "8px 16px");
const fz = (s: BtnSize) => (s === "small" ? 13 : 14);

function Spinner({ size, tone = "onPrimary" }: { size: BtnSize; tone?: "onPrimary" | "onMuted" | "onDanger" }) {
  const dim = size === "small" ? 14 : 16;
  const border =
    tone === "onPrimary" ? "rgba(255,255,255,0.35)" : "rgba(148,148,159,0.35)";
  const top = tone === "onPrimary" ? PC.white : tone === "onDanger" ? PC.danger : PC.primary;
  return (
    <span
      className="inline-block shrink-0 animate-spin rounded-full border-2"
      style={{ width: dim, height: dim, borderColor: border, borderTopColor: top }}
      aria-hidden
    />
  );
}

function BtnBase({
  children,
  icon,
  loading,
  size = "default",
  spinnerTone = "onPrimary",
  style,
  disabled,
  className = "",
  ...rest
}: BaseBtnProps & { style?: React.CSSProperties }) {
  return (
    <button
      type="button"
      disabled={disabled || loading}
      className={`inline-flex items-center justify-center gap-2 font-medium transition disabled:cursor-not-allowed disabled:opacity-50 ${className}`}
      style={{
        borderRadius: 8,
        padding: pad(size),
        fontSize: fz(size),
        lineHeight: 1.25,
        ...style,
      }}
      {...rest}
    >
      {loading ? (
        <Spinner size={size} tone={spinnerTone} />
      ) : icon ? (
        <span className="flex shrink-0 items-center [&>svg]:h-4 [&>svg]:w-4">{icon}</span>
      ) : null}
      {loading ? <span>…</span> : children}
    </button>
  );
}

export function BtnPrimary({ children, icon, loading, size = "default", spinnerTone = "onPrimary", style, ...rest }: BaseBtnProps) {
  return (
    <BtnBase
      icon={icon}
      loading={loading}
      spinnerTone={spinnerTone}
      size={size}
      style={{
        backgroundColor: PC.primary,
        color: PC.white,
        border: `1px solid ${PC.primary}`,
        ...style,
      }}
      onMouseEnter={(e) => {
        if (!rest.disabled && !loading) (e.currentTarget as HTMLButtonElement).style.backgroundColor = PC.primaryHover;
      }}
      onMouseLeave={(e) => {
        (e.currentTarget as HTMLButtonElement).style.backgroundColor = PC.primary;
      }}
      {...rest}
    >
      {children}
    </BtnBase>
  );
}

export function BtnSecondary({ children, icon, loading, size = "default", spinnerTone = "onMuted", style, ...rest }: BaseBtnProps) {
  return (
    <BtnBase
      icon={icon}
      loading={loading}
      spinnerTone={spinnerTone}
      size={size}
      style={{
        backgroundColor: "transparent",
        color: PC.primary,
        border: `1px solid ${PC.primary}`,
        ...style,
      }}
      onMouseEnter={(e) => {
        if (!rest.disabled && !loading) (e.currentTarget as HTMLButtonElement).style.backgroundColor = "rgba(124, 58, 237, 0.12)";
      }}
      onMouseLeave={(e) => {
        (e.currentTarget as HTMLButtonElement).style.backgroundColor = "transparent";
      }}
      {...rest}
    >
      {children}
    </BtnBase>
  );
}

export function BtnDanger({ children, icon, loading, size = "default", spinnerTone = "onDanger", style, ...rest }: BaseBtnProps) {
  return (
    <BtnBase
      icon={icon}
      loading={loading}
      spinnerTone={spinnerTone}
      size={size}
      style={{
        backgroundColor: "transparent",
        color: PC.danger,
        border: `1px solid ${PC.danger}`,
        ...style,
      }}
      onMouseEnter={(e) => {
        if (!rest.disabled && !loading) (e.currentTarget as HTMLButtonElement).style.backgroundColor = "rgba(239, 68, 68, 0.12)";
      }}
      onMouseLeave={(e) => {
        (e.currentTarget as HTMLButtonElement).style.backgroundColor = "transparent";
      }}
      {...rest}
    >
      {children}
    </BtnBase>
  );
}

export function BtnNeutral({ children, icon, loading, size = "default", spinnerTone = "onMuted", style, ...rest }: BaseBtnProps) {
  return (
    <BtnBase
      icon={icon}
      loading={loading}
      spinnerTone={spinnerTone}
      size={size}
      style={{
        backgroundColor: "transparent",
        color: PC.muted,
        border: "1px solid rgba(255,255,255,0.2)",
        ...style,
      }}
      onMouseEnter={(e) => {
        if (!rest.disabled && !loading) (e.currentTarget as HTMLButtonElement).style.backgroundColor = "rgba(255,255,255,0.06)";
      }}
      onMouseLeave={(e) => {
        (e.currentTarget as HTMLButtonElement).style.backgroundColor = "transparent";
      }}
      {...rest}
    >
      {children}
    </BtnBase>
  );
}

export function BtnPdf(props: Omit<BaseBtnProps, "children"> & { children?: ReactNode }) {
  const { children = "Générer PDF", ...rest } = props;
  return (
    <BtnPrimary {...rest} icon={rest.icon}>
      {children}
    </BtnPrimary>
  );
}

export function BtnEmail(props: Omit<BaseBtnProps, "children"> & { children?: ReactNode }) {
  const { children = "Envoyer par email", ...rest } = props;
  return (
    <BtnSecondary {...rest} icon={rest.icon}>
      {children}
    </BtnSecondary>
  );
}
