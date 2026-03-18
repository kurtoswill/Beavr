"use client";

import { useState, useRef } from "react";
import {
  MapPin,
  ChevronDown,
  SlidersHorizontal,
  CloudUpload,
  X,
  Wrench,
  Zap,
  Heart,
  HelpCircle,
  Paintbrush,
  Truck,
} from "lucide-react";
import type { LucideIcon } from "lucide-react";
import ServiceChip from "@/components/ServiceChip/ServiceChip";
import styles from "./page.module.css";

/* ------------------------------------------------------------------ */
/*  Data                                                                */
/* ------------------------------------------------------------------ */
interface Service {
  label: string;
  icon: LucideIcon;
}

const SERVICES: Service[] = [
  { label: "Plumber",      icon: Wrench     },
  { label: "Electrician",  icon: Zap        },
  { label: "Caregiver",    icon: Heart      },
  { label: "Painter",      icon: Paintbrush },
  { label: "Mover",        icon: Truck      },
  { label: "Not sure yet", icon: HelpCircle },
];

/* ------------------------------------------------------------------ */
/*  Types                                                               */
/* ------------------------------------------------------------------ */
interface UploadedFile {
  name: string;
  preview: string;
}

/* ================================================================== */
/*  Page                                                                */
/* ================================================================== */
export default function LandingPage() {
  const [query, setQuery]             = useState("");
  const [description, setDescription] = useState("");
  const [files, setFiles]             = useState<UploadedFile[]>([]);
  const [dragging, setDragging]       = useState(false);
  const fileInputRef                  = useRef<HTMLInputElement>(null);

  /* ---- File helpers ---- */
  const addFiles = (incoming: FileList | null) => {
    if (!incoming) return;
    const next: UploadedFile[] = Array.from(incoming)
      .filter((f) => f.type.startsWith("image/") || f.type.startsWith("video/"))
      .map((f) => ({ name: f.name, preview: URL.createObjectURL(f) }));
    setFiles((prev) => [...prev, ...next].slice(0, 6));
  };

  const removeFile = (index: number) =>
    setFiles((prev) => prev.filter((_, i) => i !== index));

  const handleDrop = (e: React.DragEvent) => {
    e.preventDefault();
    setDragging(false);
    addFiles(e.dataTransfer.files);
  };

  /* ---- Chip selection ---- */
  const handleChipClick = (label: string) => {
    if (label === "Not sure yet") {
      setQuery("");
      return;
    }
    // Toggle: clicking the active chip deselects it
    setQuery((prev) => (prev === label ? "" : label));
  };

  /* ---------------------------------------------------------------- */
  return (
    <main className={styles.page}>

      {/* ── Hero ─────────────────────────────────────────────────── */}
      <section className={styles.hero}>
        <div className={styles.heroGlow}  aria-hidden />
        <div className={styles.heroGlow2} aria-hidden />

        {/* Top bar */}
        <header className={styles.topBar}>
          <div className={styles.avatar}>
            <img src="https://i.pravatar.cc/80?img=47" alt="User avatar" />
          </div>
          <button className={styles.locationPill} aria-label="Change location">
            <span className={styles.locationLabel}>Your location</span>
            <span className={styles.locationValue}>
              <MapPin size={14} strokeWidth={2.5} />
              Bancod, Indang, Cavite&nbsp;&nbsp;·&nbsp;&nbsp;3km
              <ChevronDown size={14} strokeWidth={2.5} />
            </span>
          </button>
        </header>

        {/* Headline */}
        <div className={styles.heroText}>
          <h1 className={styles.headline}>
            Need someone?<br />Get them fast.
          </h1>
        </div>
      </section>

      {/* ── Form card ────────────────────────────────────────────── */}
      <section className={styles.formCard}>

        {/* Search */}
        <div className={styles.searchRow}>
          <input
            className={styles.searchInput}
            type="search"
            placeholder="What do you need?"
            value={query}
            onChange={(e) => setQuery(e.target.value)}
            aria-label="Search for a service"
          />
          <button className={styles.filterBtn} aria-label="Filters">
            <SlidersHorizontal size={18} strokeWidth={2} />
          </button>
        </div>

        {/* ── Service chips ── */}
        <div className={styles.chipsWrapper}>
        <div
          className={styles.chipsScroll}
          role="group"
          aria-label="Quick service selection"
        >
          {SERVICES.map((s) => (
            <ServiceChip
              key={s.label}
              label={s.label}
              icon={s.icon}
              selected={query === s.label}
              onClick={handleChipClick}
            />
          ))}
        </div>
        </div>

        {/* Describe */}
        <textarea
          className={styles.descTextarea}
          placeholder="Describe the problem:"
          value={description}
          onChange={(e) => setDescription(e.target.value)}
          rows={4}
          aria-label="Describe the problem"
        />

        {/* Upload drop zone */}
        <div
          className={`${styles.uploadZone} ${dragging ? styles.uploadZoneDragging : ""}`}
          onDragOver={(e) => { e.preventDefault(); setDragging(true); }}
          onDragLeave={() => setDragging(false)}
          onDrop={handleDrop}
          onClick={() => fileInputRef.current?.click()}
          role="button"
          tabIndex={0}
          aria-label="Upload photos or videos"
          onKeyDown={(e) => e.key === "Enter" && fileInputRef.current?.click()}
        >
          <input
            ref={fileInputRef}
            type="file"
            multiple
            accept="image/*,video/*"
            className={styles.fileInputHidden}
            onChange={(e) => addFiles(e.target.files)}
          />

          {files.length === 0 ? (
            <div className={styles.uploadPlaceholder}>
              <CloudUpload size={32} strokeWidth={1.5} className={styles.uploadIcon} />
              <span className={styles.uploadLabel}>Upload&nbsp; your photos or videos</span>
            </div>
          ) : (
            <div className={styles.uploadPreviews}>
              {files.map((f, i) => (
                <div key={i} className={styles.previewThumb}>
                  <img src={f.preview} alt={f.name} />
                  <button
                    className={styles.previewRemove}
                    aria-label={`Remove ${f.name}`}
                    onClick={(e) => { e.stopPropagation(); removeFile(i); }}
                  >
                    <X size={10} strokeWidth={3} />
                  </button>
                </div>
              ))}
              {files.length < 6 && (
                <div className={styles.previewAdd}>
                  <CloudUpload size={20} strokeWidth={1.5} />
                </div>
              )}
            </div>
          )}
        </div>

        {/* Primary CTA */}
        <button className={styles.ctaPrimary}>
          Find a worker
        </button>

        {/* Divider */}
        <div className={styles.divider} aria-hidden>
          <span />
          <span className={styles.dividerText}>OR</span>
          <span />
        </div>

        {/* Secondary CTA */}
        <button className={styles.ctaSecondary}>
          Be a worker
        </button>

      </section>
    </main>
  );
}