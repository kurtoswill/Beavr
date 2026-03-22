"use client";
import { useState, useEffect } from "react";
import { useRouter, useParams } from "next/navigation";
import { Loader, Star } from "lucide-react";
import styles from "./page.module.css";

/* ------------------------------------------------------------------ */
/*  Types                                                               */
/* ------------------------------------------------------------------ */
interface Job {
  id: string;
  profession: string;
  description: string;
  specialist_id?: string;
  worker_id?: string;
  customer_id?: string;
  status: string;
  created_at: string;
}

interface Specialist {
  id: string;
  user_id?: string;
  full_name: string;
  avatar_url: string;
  profession: string;
  jobs_completed: number;
  avg_rating: number;
}

/* ================================================================== */
/*  Customer Rate Specialist Page                                      */
/* ================================================================== */
export default function RateSpecialistPage() {
  const router = useRouter();
  const params = useParams();
  const jobId = params?.jobId as string;

  // Data states
  const [job, setJob] = useState<Job | null>(null);
  const [specialist, setSpecialist] = useState<Specialist | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  // Form states
  const [rating, setRating] = useState(0);
  const [hoverRating, setHoverRating] = useState(0);
  const [comment, setComment] = useState("");
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [submitError, setSubmitError] = useState<string | null>(null);
  const [submitted, setSubmitted] = useState(false);

  // Fetch job and specialist data
  useEffect(() => {
    const fetchData = async () => {
      try {
        setIsLoading(true);
        setError(null);

        // Fetch job
        const jobRes = await fetch(`/api/jobs/${jobId}`);
        const jobData = await jobRes.json();

        if (!jobData.success || !jobData.job) {
          setError("Job not found");
          return;
        }

        setJob(jobData.job);

        // Fetch specialist
        const specialistId = jobData.job.specialist_id || jobData.job.worker_id;
        if (specialistId) {
          const specRes = await fetch(`/api/specialists/${specialistId}`);
          const specData = await specRes.json();

          if (specData.success && specData.specialist) {
            setSpecialist(specData.specialist);
          } else {
            setError("Specialist not found");
          }
        } else {
          setError("No specialist assigned to this job");
        }
      } catch (err) {
        console.error("Failed to fetch job/specialist:", err);
        setError("Failed to load data. Please try again.");
      } finally {
        setIsLoading(false);
      }
    };

    if (jobId) {
      fetchData();
    }
  }, [jobId]);

  // Handle review submission
  const handleSubmit = async () => {
    if (!rating) {
      setSubmitError("Please select a rating");
      return;
    }

    if (!job || !specialist) {
      setSubmitError("Job or specialist data missing");
      return;
    }

    try {
      setIsSubmitting(true);
      setSubmitError(null);

      const res = await fetch("/api/reviews", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          job_id: jobId,
          reviewer_id: job.customer_id,
          reviewee_id: specialist.user_id || specialist.id,
          rating_value: rating,
          comment: comment.trim() || null,
          photos: null,
        }),
      });

      const data = await res.json();

      if (data.success) {
        setSubmitted(true);
        // Redirect after 2 seconds
        setTimeout(() => {
          router.push("/");
        }, 2000);
      } else {
        setSubmitError(data.error || "Failed to submit review");
      }
    } catch (err) {
      console.error("Failed to submit review:", err);
      setSubmitError("An error occurred. Please try again.");
    } finally {
      setIsSubmitting(false);
    }
  };

  // Loading state
  if (isLoading) {
    return (
      <div className={styles.page}>
        <div className={styles.main} style={{ justifyContent: "center", alignItems: "center" }}>
          <div style={{ textAlign: "center" }}>
            <Loader size={32} style={{ animation: "spin 1s linear infinite", marginBottom: "16px" }} />
            <p>Loading...</p>
          </div>
        </div>
      </div>
    );
  }

  // Error state
  if (error) {
    return (
      <div className={styles.page}>
        <div className={styles.main} style={{ justifyContent: "center", alignItems: "center" }}>
          <div style={{ textAlign: "center", color: "#e74c3c" }}>
            <p>{error}</p>
          </div>
        </div>
      </div>
    );
  }

  // Success state
  if (submitted) {
    return (
      <div className={styles.page}>
        <div className={styles.main} style={{ justifyContent: "center", alignItems: "center" }}>
          <div style={{ textAlign: "center" }}>
            <div style={{ fontSize: "48px", marginBottom: "16px" }}>✓</div>
            <h2 style={{ fontSize: "24px", color: "#27ae60", marginBottom: "8px" }}>Thank you!</h2>
            <p>Your review has been submitted successfully.</p>
            <p style={{ fontSize: "14px", color: "#7f8c8d", marginTop: "8px" }}>Redirecting...</p>
          </div>
        </div>
      </div>
    );
  }

  // Main form state
  return (
    <div className={styles.page}>
      {/* Header */}
      <div className={styles.header}>
        <h1 className={styles.headerTitle}>Rate Specialist</h1>
      </div>

      {/* Main content */}
      <div className={styles.main}>
        {/* Specialist Section */}
        {specialist && (
          <div className={styles.workerSection}>
            <div className={styles.avatar}>
              <img
                src={specialist.avatar_url || "https://i.pravatar.cc/80?img=5"}
                alt={specialist.full_name}
              />
            </div>
            <h2 className={styles.workerName}>{specialist.full_name}</h2>
            <p className={styles.ratingPrompt}>{specialist.profession}</p>
          </div>
        )}

        {/* Job Info */}
        {job && (
          <div style={{ width: "100%", textAlign: "center", marginBottom: "24px" }}>
            <p style={{ fontSize: "14px", color: "#7f8c8d", marginBottom: "4px" }}>{job.profession}</p>
            <p style={{ fontSize: "13px", color: "#95a5a6" }}>{job.description.substring(0, 100)}...</p>
          </div>
        )}

        {/* Rating Section */}
        <div className={styles.ratingSection}>
          <p className={styles.ratingPrompt}>How would you rate this specialist?</p>
          <div className={styles.starRow}>
            {[1, 2, 3, 4, 5].map((star) => (
              <button
                key={star}
                className={styles.starBtn}
                onClick={() => setRating(star)}
                onMouseEnter={() => setHoverRating(star)}
                onMouseLeave={() => setHoverRating(0)}
                aria-label={`Rate ${star} star${star !== 1 ? "s" : ""}`}
              >
                <Star
                  size={32}
                  className={styles.starIcon}
                  style={{
                    fill: (hoverRating || rating) >= star ? "#E2C96B" : "transparent",
                    color: "#E2C96B",
                  }}
                />
              </button>
            ))}
          </div>
          {rating > 0 && (
            <p style={{ color: "#7f8c8d", fontSize: "14px", marginTop: "8px" }}>
              {rating === 1 && "Poor"}
              {rating === 2 && "Fair"}
              {rating === 3 && "Good"}
              {rating === 4 && "Great"}
              {rating === 5 && "Excellent"}
            </p>
          )}
        </div>

        {/* Comment Section */}
        <div style={{ width: "100%" }}>
          <label style={{ display: "block", marginBottom: "8px", fontSize: "14px", fontWeight: "500" }}>
            Add a comment (optional)
          </label>
          <textarea
            className={styles.reviewInput}
            placeholder="Tell others about your experience with this specialist..."
            value={comment}
            onChange={(e) => setComment(e.target.value.slice(0, 500))}
            maxLength={500}
          />
          <p style={{ fontSize: "12px", color: "#95a5a6", textAlign: "right", marginTop: "8px" }}>
            {comment.length}/500
          </p>
        </div>

        {/* Error Message */}
        {submitError && (
          <div
            style={{
              width: "100%",
              backgroundColor: "#ffe6e6",
              color: "#e74c3c",
              padding: "12px",
              borderRadius: "8px",
              fontSize: "14px",
              marginTop: "16px",
            }}
          >
            {submitError}
          </div>
        )}
      </div>

      {/* Bottom bar with submit button */}
      <div className={styles.bottomBar}>
        <button
          className={`${styles.submitBtn} ${isSubmitting || !rating ? styles.submitBtnDisabled : ""} ${submitted ? styles.submitBtnDone : ""}`}
          onClick={handleSubmit}
          disabled={isSubmitting || !rating}
        >
          {isSubmitting ? (
            <span style={{ display: "flex", alignItems: "center", justifyContent: "center", gap: "8px" }}>
              <Loader size={16} style={{ animation: "spin 1s linear infinite" }} />
              Submitting...
            </span>
          ) : (
            "Submit Review"
          )}
        </button>
      </div>

      <style>{`
        @keyframes spin {
          from { transform: rotate(0deg); }
          to { transform: rotate(360deg); }
        }
      `}</style>
    </div>
  );
}