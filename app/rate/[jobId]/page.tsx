"use client";

import { useState, useRef } from "react";
import { useRouter } from "next/navigation";
import { ArrowLeft, Star, CloudUpload, X } from "lucide-react";
import styles from "./page.module.css";

/* ------------------------------------------------------------------ */
/*  Data                                                                */
/* ------------------------------------------------------------------ */
const WORKER = {
  name:   "Kurt Oswill McCarver",
  avatar: "https://images.unsplash.com/photo-1621905251918-48416bd8575a?w=400&q=80",
  role:   "Electrician",
};

interface UploadedFile {
  name: string;
  preview: string;
}

/* ================================================================== */
/*  Interactive star picker                                             */
/* ================================================================== */
function StarPicker({
  value,
  onChange,
}: {
  value: number;
  onChange: (n: number) => void;
}) {
  const [hovered, setHovered] = useState(0);
  const active = hovered || value;

  return (
    <div className={styles.starRow} role="group" aria-label="Rate the worker">
      {[1, 2, 3, 4, 5].map((n) => (
        <button
          key={n}
          type="button"
          className={styles.starBtn}
          onMouseEnter={() => setHovered(n)}
          onMouseLeave={() => setHovered(0)}
          onClick={() => onChange(n)}
          aria-label={`${n} star${n > 1 ? "s" : ""}`}
          aria-pressed={value === n}
        >
          <Star
            size={36}
            strokeWidth={1.5}
            className={`${styles.starIcon} ${active >= n ? styles.starFilled : ""}`}
          />
        </button>
      ))}
    </div>
  );
}

/* ================================================================== */
/*  Page                                                                */
/* ================================================================== */
export default function RatePage() {
  const router = useRouter();
  const [rating, setRating]       = useState(0);
  const [review, setReview]       = useState("");
  const [files, setFiles]         = useState<UploadedFile[]>([]);
  const [dragging, setDragging]   = useState(false);
  const [submitted, setSubmitted] = useState(false);
  const fileInputRef              = useRef<HTMLInputElement>(null);

  /* ---- File helpers ---- */
  const addFiles = (incoming: FileList | null) => {
    if (!incoming) return;
    const next: UploadedFile[] = Array.from(incoming)
      .filter((f) => f.type.startsWith("image/") || f.type.startsWith("video/"))
      .map((f) => ({ name: f.name, preview: URL.createObjectURL(f) }));
    setFiles((prev) => [...prev, ...next].slice(0, 6));
  };

  const removeFile = (i: number) =>
    setFiles((prev) => prev.filter((_, idx) => idx !== i));

  const handleDrop = (e: React.DragEvent) => {
    e.preventDefault();
    setDragging(false);
    addFiles(e.dataTransfer.files);
  };

  /* ---- Submit ---- */
  const handleSubmit = () => {
    setSubmitted(true);
    setTimeout(() => router.push("/"), 1200);
  };

  const canSubmit = rating > 0;

  return (
    <div className={styles.page}>

      {/* Header */}
      <header className={styles.header}>
        <span className={styles.headerTitle}>Your specialist finished the job!</span>
      </header>

      {/* Content */}
      <main className={styles.main}>

        {/* Worker avatar + name */}
        <div className={styles.workerSection}>
          <div className={styles.avatar}>
            <img src={WORKER.avatar} alt={WORKER.name} />
          </div>
          <h1 className={styles.workerName}>{WORKER.name}</h1>
        </div>

        {/* Rating prompt */}
        <div className={styles.ratingSection}>
          <p className={styles.ratingPrompt}>Work done well? Rate your specialist.</p>
          <StarPicker value={rating} onChange={setRating} />
        </div>

        {/* Review textarea */}
        <textarea
          className={styles.reviewInput}
          placeholder="Add a review"
          value={review}
          onChange={(e) => setReview(e.target.value)}
          rows={4}
          aria-label="Write a review"
        />

        {/* Upload zone */}
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
              <CloudUpload size={28} strokeWidth={1.5} className={styles.uploadIcon} />
              <span className={styles.uploadLabel}>Upload your photos or videos</span>
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
                  <CloudUpload size={18} strokeWidth={1.5} />
                </div>
              )}
            </div>
          )}
        </div>

      </main>

      {/* Submit button */}
      <div className={styles.bottomBar}>
        <button
          className={`${styles.submitBtn} ${!canSubmit ? styles.submitBtnDisabled : ""} ${submitted ? styles.submitBtnDone : ""}`}
          onClick={handleSubmit}
          disabled={!canSubmit || submitted}
        >
          {submitted ? "Thanks for your feedback!" : "Submit"}
        </button>
      </div>

    </div>
  );
}