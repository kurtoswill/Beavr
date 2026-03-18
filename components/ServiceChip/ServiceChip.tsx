"use client";

import { LucideIcon } from "lucide-react";
import styles from "./ServiceChip.module.css";

/* ------------------------------------------------------------------ */
/*  Types                                                               */
/* ------------------------------------------------------------------ */
export interface ServiceChipProps {
  /** Label shown on the chip */
  label: string;
  /** Lucide icon component */
  icon: LucideIcon;
  /** Whether this chip is currently selected */
  selected?: boolean;
  /** Click handler */
  onClick?: (label: string) => void;
}

/* ================================================================== */
/*  Component                                                           */
/* ================================================================== */
export default function ServiceChip({
  label,
  icon: Icon,
  selected = false,
  onClick,
}: ServiceChipProps) {
  return (
    <button
      type="button"
      className={`${styles.chip} ${selected ? styles.chipSelected : ""}`}
      onClick={() => onClick?.(label)}
      aria-pressed={selected}
      aria-label={`Select ${label}`}
    >
      <span className={styles.iconWrap}>
        <Icon size={15} strokeWidth={2.2} />
      </span>
      <span className={styles.label}>{label}</span>
    </button>
  );
}