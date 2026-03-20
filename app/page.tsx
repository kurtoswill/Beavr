"use client";
import { useState, useRef } from "react";
import { useRouter } from "next/navigation";
import {
  MapPin,
  ChevronDown,
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
  { label: "Plumber", icon: Wrench },
  { label: "Electrician", icon: Zap },
  { label: "Caregiver", icon: Heart },
  { label: "Painter", icon: Paintbrush },
  { label: "Mover", icon: Truck },
  { label: "Not sure yet", icon: HelpCircle },
];

/* ------------------------------------------------------------------ */
/*  Types                                                               */
/* ------------------------------------------------------------------ */
interface UploadedFile {
  name: string;
  preview: string;
  file: File;  // ✅ Added for API upload
}

/* ================================================================== */
/*  Page                                                                */
/* ================================================================== */
export default function LandingPage() {
  const router = useRouter();
  const [query, setQuery] = useState("");
  const [description, setDescription] = useState("");
  const [files, setFiles] = useState<UploadedFile[]>([]);
  const [dragging, setDragging] = useState(false);
  const [errors, setErrors] = useState<{
    query?: string;
    description?: string;
  }>({});
  const [isLoading, setIsLoading] = useState(false);  // ✅ Added loading state
  const fileInputRef = useRef<HTMLInputElement>(null);

  // Test customer ID (replace with auth later)
  const CUSTOMER_ID = "dc8e8fd1-3dff-474e-a3b5-fbe005e9d636";

  /* ---- Upload image to Supabase Storage ---- */
  const uploadImage = async (file: File): Promise<string> => {
    const formData = new FormData();
    formData.append("file", file);
    formData.append("bucket", "job-images");

    const response = await fetch("/api/upload", {
      method: "POST",
      body: formData,
    });

    const data = await response.json();

    if (!response.ok) {
      throw new Error(data.error || "Failed to upload image");
    }

    return data.url;
  };

  /* ---- Create job via API ---- */
  const createJob = async (imageUrls: string[]): Promise<string> => {
    const response = await fetch("/api/jobs", {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        customer_id: CUSTOMER_ID,
        profession: query || "General Handyman",
        description,
        street_address: "Bancod, Indang, Cavite",
        province: "Cavite",
        municipality: "Indang",
        barangay: "Bancod",
        photos: imageUrls.length > 0 ? imageUrls : null,
      }),
    });

    const data = await response.json();

    if (!response.ok) {
      throw new Error(data.error || "Failed to create job");
    }

    return data.job.id;
  };

  /* ---- Handle Find Specialist ---- */
  const handleFindSpecialist = async () => {
    const newErrors: { query?: string; description?: string } = {};
    if (!query.trim()) newErrors.query = "Please tell us what you need.";
    if (!description.trim())
      newErrors.description = "Please describe the problem.";

    if (Object.keys(newErrors).length) {
      setErrors(newErrors);
      return;
    }

    setErrors({});
    setIsLoading(true);  // ✅ Set loading

    try {
      // Step 1: Upload all images
      const imageUrls = await Promise.all(
        files.map((f) => uploadImage(f.file))
      );

      // Step 2: Create job
      const jobId = await createJob(imageUrls);

      // Step 3: Redirect to tracking page
      router.push(`/tracking/${jobId}`);
    } catch (error) {
      console.error("Error creating job:", error);
      alert("Failed to create job. Please try again.");
    } finally {
      setIsLoading(false);  // ✅ Reset loading
    }
  };

  /* ---- File helpers ---- */
  const addFiles = (incoming: FileList | null) => {
    if (!incoming) return;
    const next: UploadedFile[] = Array.from(incoming)
      .filter((f) => f.type.startsWith("image/") || f.type.startsWith("video/"))
      .map((f) => ({
        name: f.name,
        preview: URL.createObjectURL(f),
        file: f,  // ✅ Store file object for upload
      }));
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
    setQuery((prev) => (prev === label ? "" : label));
  };

  /* ---------------------------------------------------------------- */
  return (
    <main className={styles.page}>
      {/* ── Hero ─────────────────────────────────────────────────── */}
      <section className={styles.hero}>
        <div className={styles.heroGlow} aria-hidden />
        <div className={styles.heroGlow2} aria-hidden />

        {/* Top bar */}
        <header className={styles.topBar}>
          <div className={styles.avatar}>
            {/* ✅ Use regular img tag for external URLs */}
            <img
              src="https://i.pravatar.cc/80?img=47"
              alt="User avatar"
              width={80}
              height={80}
            />
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
            Built for you.
            <br />
            Done fast.
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
        </div>
        {errors.query && <p className={styles.fieldError}>{errors.query}</p>}

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
        {errors.description && (
          <p className={styles.fieldError}>{errors.description}</p>
        )}

        {/* Upload drop zone */}
        <div
          className={`${styles.uploadZone} ${
            dragging ? styles.uploadZoneDragging : ""
          }`}
          onDragOver={(e) => {
            e.preventDefault();
            setDragging(true);
          }}
          onDragLeave={() => setDragging(false)}
          onDrop={handleDrop}
          onClick={() => fileInputRef.current?.click()}
          role="button"
          tabIndex={0}
          aria-label="Upload photos or videos"
          onKeyDown={(e) =>
            e.key === "Enter" && fileInputRef.current?.click()
          }
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
              <CloudUpload
                size={32}
                strokeWidth={1.5}
                className={styles.uploadIcon}
              />
              <span className={styles.uploadLabel}>
                Upload photos or videos{" "}
                <span className={styles.optionalTag}>(optional)</span>
              </span>
            </div>
          ) : (
            <div className={styles.uploadPreviews}>
              {files.map((f, i) => (
                <div key={i} className={styles.previewThumb}>
                  {/* ✅ Use regular img tag for preview */}
                  <img src={f.preview} alt={f.name} />
                  <button
                    className={styles.previewRemove}
                    aria-label={`Remove ${f.name}`}
                    onClick={(e) => {
                      e.stopPropagation();
                      removeFile(i);
                    }}
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
        <button
          className={styles.ctaPrimary}
          onClick={handleFindSpecialist}
          disabled={isLoading}
        >
          {isLoading ? "Creating job..." : "Find a specialist"}
        </button>

        {/* Divider */}
        <div className={styles.divider} aria-hidden>
          <span />
          <span className={styles.dividerText}>OR</span>
          <span />
        </div>

        {/* Secondary CTA */}
        <button
          className={styles.ctaSecondary}
          onClick={() => router.push("/onboard")}
        >
          Become a specialist
        </button>
      </section>
    </main>
  );
}