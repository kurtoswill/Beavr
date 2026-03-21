"use client";

import { useState, useEffect, useRef, useCallback } from "react";
import { useRouter } from "next/navigation";
import { useParams } from "next/navigation";
import { createClient } from "@supabase/supabase-js";
import {
  Phone,
  MapPin,
  Navigation,
  Zap,
  Clock,
  CheckCircle2,
  Smile,
  Frown,
  ChevronRight,
} from "lucide-react";
import styles from "./page.module.css";

/* ------------------------------------------------------------------ */
/*  Supabase Client                                                     */
/* ------------------------------------------------------------------ */
const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL!;
const supabaseKey = process.env.NEXT_PUBLIC_SUPABASE_PUBLISHABLE_DEFAULT_KEY!;
const supabase = createClient(supabaseUrl, supabaseKey);

/* ------------------------------------------------------------------ */
/*  Types & constants                                                   */
/* ------------------------------------------------------------------ */
type JobStatus = "heading" | "arrived" | "working" | "rate_customer";

const SNAP_TOP_THRESHOLD = 750;
const SNAP_BOTTOM_THRESHOLD = 250;

interface JobData {
  id: string;
  clientName: string;
  clientAvatar: string;
  service: string;
  description: string;
  location: string;
  distance: string;
  eta: number;
  rate: number;
  currency: string;
  images: string[];
  customer_id: string;
}

/* ------------------------------------------------------------------ */
/*  Fake map                                                            */
/* ------------------------------------------------------------------ */
function FakeMap({ status, job }: { status: JobStatus; job: JobData | null }) {
  const isMoving = status === "heading";
  if (!job) return null;

  return (
    <div className={styles.map}>
      <div className={styles.mapBg} />
      <svg className={styles.mapRoads} viewBox="0 0 390 700" aria-hidden>
        <line
          x1="0"
          y1="280"
          x2="390"
          y2="310"
          stroke="#4a5568"
          strokeWidth="6"
        />
        <line
          x1="0"
          y1="420"
          x2="390"
          y2="400"
          stroke="#4a5568"
          strokeWidth="4"
        />
        <line
          x1="195"
          y1="0"
          x2="210"
          y2="700"
          stroke="#4a5568"
          strokeWidth="6"
        />
        <line
          x1="80"
          y1="0"
          x2="90"
          y2="700"
          stroke="#374151"
          strokeWidth="3"
        />
        <line
          x1="310"
          y1="0"
          x2="300"
          y2="700"
          stroke="#374151"
          strokeWidth="3"
        />
        <line
          x1="0"
          y1="150"
          x2="390"
          y2="160"
          stroke="#374151"
          strokeWidth="2"
          opacity="0.5"
        />
        <line
          x1="0"
          y1="530"
          x2="390"
          y2="545"
          stroke="#374151"
          strokeWidth="2"
          opacity="0.5"
        />
        <text
          x="20"
          y="272"
          fill="#6b7280"
          fontSize="9"
          fontFamily="sans-serif"
        >
          National Road
        </text>
        <text
          x="215"
          y="200"
          fill="#6b7280"
          fontSize="9"
          fontFamily="sans-serif"
          transform="rotate(90,215,200)"
        >
          Indang Rd
        </text>
      </svg>
      <svg
        className={styles.routeSvg}
        viewBox="0 0 390 700"
        fill="none"
        aria-hidden
      >
        <path
          d="M200 110 C205 160, 185 220, 200 295 C210 350, 192 410, 198 500"
          stroke="#22C55E"
          strokeWidth="14"
          strokeLinecap="round"
          opacity="0.15"
        />
        <path
          d="M200 110 C205 160, 185 220, 200 295 C210 350, 192 410, 198 500"
          stroke="#22C55E"
          strokeWidth="5"
          strokeLinecap="round"
          strokeDasharray="10 5"
        />
      </svg>
      {/* Customer pin */}
      <div className={styles.pinCustomer}>
        <div className={styles.pinCustomerRing} />
        <img
          src={job.clientAvatar}
          alt={job.clientName}
          className={styles.pinCustomerAvatar}
        />
        <span className={styles.pinLabel}>Customer</span>
      </div>
      {/* Specialist pin */}
      <div
        className={`${styles.pinSpecialist} ${isMoving ? styles.pinSpecialistMoving : ""}`}
      >
        <div className={styles.pinSpecialistDot} />
        <span className={styles.pinLabel}>You</span>
      </div>
      <span className={styles.mapLabel} style={{ top: "18%", left: "12%" }}>
        Bancod
      </span>
      <span className={styles.mapLabel} style={{ top: "55%", left: "20%" }}>
        Indang
      </span>
      <span
        className={styles.mapLabel}
        style={{ top: "38%", right: "8%", textAlign: "right" }}
      >
        Cavite State{"\n"}University
      </span>
      <span className={styles.mapLabelRoad} style={{ top: "39%", left: "22%" }}>
        404
      </span>
    </div>
  );
}

/* ------------------------------------------------------------------ */
/*  Slide-to-complete                                                   */
/* ------------------------------------------------------------------ */
function SlideToComplete({ onComplete }: { onComplete: () => void }) {
  const trackRef = useRef<HTMLDivElement>(null);
  const thumbRef = useRef<HTMLDivElement>(null);
  const isDragging = useRef(false);
  const startX = useRef(0);
  const [progress, setProgress] = useState(0);
  const [done, setDone] = useState(false);

  const onDown = (e: React.PointerEvent) => {
    isDragging.current = true;
    startX.current = e.clientX - progress * getTrackWidth();
    (e.currentTarget as HTMLElement).setPointerCapture(e.pointerId);
  };

  const getTrackWidth = () =>
    (trackRef.current?.offsetWidth ?? 0) -
    (thumbRef.current?.offsetWidth ?? 56);

  const onMove = (e: React.PointerEvent) => {
    if (!isDragging.current) return;
    const raw = (e.clientX - startX.current) / getTrackWidth();
    const clamped = Math.max(0, Math.min(1, raw));
    setProgress(clamped);
    if (clamped >= 0.92) {
      isDragging.current = false;
      setProgress(1);
      setDone(true);
      setTimeout(onComplete, 400);
    }
  };

  const onUp = () => {
    if (!done) {
      isDragging.current = false;
      setProgress(0);
    }
  };

  return (
    <div
      ref={trackRef}
      className={`${styles.slideTrack} ${done ? styles.slideTrackDone : ""}`}
    >
      <span
        className={`${styles.slideLabel} ${done ? styles.slideLabelHidden : ""}`}
      >
        Slide to complete job
        <ChevronRight size={14} strokeWidth={2.5} />
      </span>
      <div
        ref={thumbRef}
        className={`${styles.slideThumb} ${done ? styles.slideThumbDone : ""}`}
        style={{ transform: `translateX(${progress * getTrackWidth()}px)` }}
        onPointerDown={onDown}
        onPointerMove={onMove}
        onPointerUp={onUp}
        onPointerCancel={onUp}
        role="slider"
        aria-valuenow={Math.round(progress * 100)}
        aria-valuemin={0}
        aria-valuemax={100}
        aria-label="Slide to complete job"
      >
        {done ? (
          <CheckCircle2 size={22} strokeWidth={2} />
        ) : (
          <ChevronRight size={22} strokeWidth={2.5} />
        )}
      </div>
    </div>
  );
}

/* ------------------------------------------------------------------ */
/*  Rate customer screen                                                */
/* ------------------------------------------------------------------ */
function RateCustomer({
  job,
  onSubmit,
}: {
  job: JobData;
  onSubmit: (happy: boolean) => void;
}) {
  const [selected, setSelected] = useState<boolean | null>(null);
  const clientFirstName = job.clientName.split(" ")[0];

  return (
    <div className={styles.rateScreen}>
      <div className={styles.rateIconWrap}>
        <div className={styles.rateIconRing2} />
        <div className={styles.rateIconRing1} />
        <div className={styles.rateIconCenter}>
          <CheckCircle2
            size={28}
            strokeWidth={1.5}
            className={styles.rateIconCheck}
          />
        </div>
      </div>

      <h2 className={styles.rateTitle}>Job complete!</h2>
      <p className={styles.rateSub}>
        How was your experience with {clientFirstName}?
      </p>

      <div className={styles.rateOptions}>
        <button
          className={`${styles.rateOption} ${selected === true ? styles.rateOptionHappy : ""}`}
          onClick={() => setSelected(true)}
          aria-pressed={selected === true}
        >
          <Smile
            size={36}
            strokeWidth={1.5}
            className={styles.rateOptionIcon}
          />
          <span>Happy</span>
        </button>
        <button
          className={`${styles.rateOption} ${selected === false ? styles.rateOptionSad : ""}`}
          onClick={() => setSelected(false)}
          aria-pressed={selected === false}
        >
          <Frown
            size={36}
            strokeWidth={1.5}
            className={styles.rateOptionIcon}
          />
          <span>Not happy</span>
        </button>
      </div>

      <button
        className={`${styles.submitRateBtn} ${selected === null ? styles.submitRateBtnDisabled : ""}`}
        onClick={() => selected !== null && onSubmit(selected)}
        disabled={selected === null}
      >
        Submit & go to dashboard
      </button>
    </div>
  );
}

/* ================================================================== */
/*  Page                                                                */
/* ================================================================== */
export default function SpecialistJobPage() {
  const router = useRouter();
  const params = useParams();
  const jobId = params.jobId as string;

  const [job, setJob] = useState<JobData | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [status, setStatus] = useState<JobStatus>("heading");
  const [etaRemaining, setEtaRemaining] = useState(20);
  const [elapsed, setElapsed] = useState(0);

  // Fetch job data on mount
  useEffect(() => {
    const fetchJob = async () => {
      try {
        // Get job details
        const { data: jobData, error: jobError } = await supabase
          .from("jobs")
          .select("*")
          .eq("id", jobId)
          .single();

        if (jobError || !jobData) {
          console.error("Error fetching job:", jobError);
          return;
        }

        // Get customer profile
        const { data: customerData } = await supabase
          .from("profiles")
          .select("full_name, avatar_url")
          .eq("id", jobData.customer_id)
          .single();

        // Get quote for this job (to get the rate)
        const { data: quoteData } = await supabase
          .from("quotes")
          .select("proposed_rate")
          .eq("job_id", jobId)
          .order("created_at", { ascending: false })
          .limit(1)
          .single();

        const location = [
          jobData.street_address,
          jobData.barangay,
          jobData.municipality,
          jobData.province,
        ]
          .filter(Boolean)
          .join(", ");

        setJob({
          id: jobData.id,
          clientName: customerData?.full_name || "Customer",
          clientAvatar:
            customerData?.avatar_url || "https://i.pravatar.cc/80?img=5",
          service: jobData.profession,
          description: jobData.description,
          location: location || "Location not specified",
          distance: "2.1 km",
          eta: 20,
          rate: quoteData?.proposed_rate || 500,
          currency: "₱",
          images: jobData.photos || [],
          customer_id: jobData.customer_id,
        });
      } catch (error) {
        console.error("Error fetching job:", error);
      } finally {
        setIsLoading(false);
      }
    };

    if (jobId) {
      fetchJob();
    }
  }, [jobId]);

  /* Draggable sheet */
  const sheetRef = useRef<HTMLDivElement>(null);
  const peekRef = useRef<HTMLDivElement>(null);
  const isDrag = useRef(false);
  const startY = useRef(0);
  const startTop = useRef(0);
  const currentTop = useRef(0);
  const rafId = useRef<number | null>(null);

  const getBottomY = useCallback(() => {
    const vh = window.innerHeight;
    const barH = 180;
    const handleH = 44;
    const peekH = peekRef.current?.offsetHeight ?? 120;
    return vh - handleH - peekH - barH;
  }, []);

  useEffect(() => {
    const init = () => {
      const y = getBottomY();
      currentTop.current = y;
      if (sheetRef.current) {
        sheetRef.current.style.transition = "none";
        sheetRef.current.style.top = `${y}px`;
        sheetRef.current.style.borderRadius = "24px 24px 0 0";
      }
    };
    requestAnimationFrame(init);
    window.addEventListener("resize", init);
    return () => window.removeEventListener("resize", init);
  }, [getBottomY]);

  const onDown = useCallback((e: React.PointerEvent) => {
    isDrag.current = true;
    startY.current = e.clientY;
    startTop.current = currentTop.current;
    if (sheetRef.current) sheetRef.current.style.transition = "none";
    (e.currentTarget as HTMLElement).setPointerCapture(e.pointerId);
    e.preventDefault();
  }, []);

  const onMove = useCallback((e: React.PointerEvent) => {
    if (!isDrag.current) return;
    const t = Math.max(0, startTop.current + (e.clientY - startY.current));
    if (rafId.current) cancelAnimationFrame(rafId.current);
    rafId.current = requestAnimationFrame(() => {
      if (!sheetRef.current) return;
      sheetRef.current.style.top = `${t}px`;
      currentTop.current = t;
      const r = Math.min(24, (t / window.innerHeight) * 80);
      sheetRef.current.style.borderRadius = `${r}px ${r}px 0 0`;
    });
  }, []);

  const onUp = useCallback(() => {
    if (!isDrag.current) return;
    isDrag.current = false;
    const spring =
      "top 0.42s cubic-bezier(0.16,1,0.3,1), border-radius 0.42s cubic-bezier(0.16,1,0.3,1)";
    if (sheetRef.current) sheetRef.current.style.transition = spring;
    const y = currentTop.current,
      vh = window.innerHeight;
    if (y <= SNAP_TOP_THRESHOLD) {
      currentTop.current = 0;
      if (sheetRef.current) {
        sheetRef.current.style.top = "0px";
        sheetRef.current.style.borderRadius = "0";
      }
    } else if (y >= vh - SNAP_BOTTOM_THRESHOLD) {
      const b = getBottomY();
      currentTop.current = b;
      if (sheetRef.current) {
        sheetRef.current.style.top = `${b}px`;
        sheetRef.current.style.borderRadius = "24px 24px 0 0";
      }
    } else {
      const r = Math.min(24, (y / vh) * 80);
      if (sheetRef.current)
        sheetRef.current.style.borderRadius = `${r}px ${r}px 0 0`;
    }
  }, [getBottomY]);

  /* Timers */
  useEffect(() => {
    if (status !== "heading") return;
    const tick = setInterval(
      () => setEtaRemaining((n) => Math.max(0, n - 1)),
      1000,
    );
    return () => clearInterval(tick);
  }, [status]);

  useEffect(() => {
    if (status !== "working") return;
    const tick = setInterval(() => setElapsed((n) => n + 1), 1000);
    return () => clearInterval(tick);
  }, [status]);

  const handleRateSubmit = async (happy: boolean) => {
    try {
      // Update job status to completed
      await supabase
        .from("jobs")
        .update({
          status: "completed",
          completed_at: new Date().toISOString(),
        })
        .eq("id", jobId);

      // Update specialist stats
      const { data: specialistData } = await supabase
        .from("specialists")
        .select("jobs_completed")
        .eq("user_id", (await supabase.auth.getUser()).data.user?.id)
        .single();

      if (specialistData) {
        await supabase
          .from("specialists")
          .update({
            jobs_completed: (specialistData.jobs_completed || 0) + 1,
          })
          .eq("user_id", (await supabase.auth.getUser()).data.user?.id);
      }
    } catch (error) {
      console.error("Error completing job:", error);
    }
    router.push("/specialist/dashboard");
  };

  /* ---- Sheet content differs by status ---- */
  const showMap = status === "heading" || status === "arrived";
  const showWorking = status === "working";
  const showRate = status === "rate_customer";

  const elapsedMins = Math.floor(elapsed / 60);
  const elapsedSecs = elapsed % 60;

  // Show loading while fetching job data
  if (isLoading || !job) {
    return (
      <div className={styles.page}>
        <div className={styles.emptyState}>
          <Clock size={32} strokeWidth={1.5} />
          <span>Loading job details...</span>
        </div>
      </div>
    );
  }

  /* Rate screen — no map, full page */
  if (showRate) {
    return (
      <div className={styles.ratePage}>
        <RateCustomer job={job} onSubmit={handleRateSubmit} />
      </div>
    );
  }

  /* Working screen */
  if (showWorking) {
    return (
      <div className={styles.workPage}>
        <header className={styles.workHeader}>
          <span className={styles.workHeaderTitle}>In Progress</span>
        </header>
        <main className={styles.workMain}>
          <div className={styles.spinnerWrap}>
            <div className={styles.spinnerRing3} />
            <div className={styles.spinnerRing2} />
            <div className={styles.spinnerRing1} />
            <div className={styles.spinnerCenter}>
              <Zap size={28} strokeWidth={1.5} className={styles.spinnerIcon} />
            </div>
          </div>
          <div className={styles.workStatusText}>
            <h1 className={styles.workTitle}>You're on the job</h1>
            <p className={styles.workSub}>
              Do great work — {job.clientName.split(" ")[0]} is counting on you.
            </p>
          </div>
          <div className={styles.workTimer}>
            <Clock size={14} strokeWidth={2} />
            <span>
              {elapsedMins > 0 ? `${elapsedMins}m ` : ""}
              {String(elapsedSecs).padStart(2, "0")}s elapsed
            </span>
          </div>
          <div className={styles.workClientCard}>
            <img
              src={job.clientAvatar}
              alt={job.clientName}
              className={styles.workClientAvatar}
            />
            <div className={styles.workClientInfo}>
              <span className={styles.workClientName}>{job.clientName}</span>
              <div className={styles.workClientMeta}>
                <Zap
                  size={12}
                  strokeWidth={2}
                  className={styles.workClientIcon}
                />
                <span>{job.service}</span>
              </div>
            </div>
            <span className={styles.workClientRate}>
              {job.currency}
              {job.rate.toLocaleString()}
            </span>
          </div>
        </main>
        <div className={styles.workBottom}>
          <div className={styles.workChatRow}>
            <input
              type="text"
              className={styles.chatInput}
              placeholder="Message customer"
              aria-label="Message"
            />
            <button className={styles.callBtn} aria-label="Call">
              <Phone size={18} strokeWidth={2} />
            </button>
          </div>
          <SlideToComplete onComplete={() => setStatus("rate_customer")} />
        </div>
      </div>
    );
  }

  /* Heading + Arrived — map + draggable sheet */
  return (
    <div className={styles.page}>
      <div className={styles.mapLayer}>
        <FakeMap status={status} job={job} />
      </div>

      <div ref={sheetRef} className={styles.sheet} aria-label="Job details">
        <div
          className={styles.handleArea}
          onPointerDown={onDown}
          onPointerMove={onMove}
          onPointerUp={onUp}
          onPointerCancel={onUp}
        >
          <div className={styles.handle} aria-hidden />
        </div>

        <div ref={peekRef} className={styles.peekZone}>
          <div className={styles.clientRow}>
            <img
              src={job.clientAvatar}
              alt={job.clientName}
              className={styles.clientAvatar}
            />
            <div className={styles.clientInfo}>
              <span className={styles.clientName}>{job.clientName}</span>
              <div className={styles.clientMeta}>
                <Zap size={12} strokeWidth={2} className={styles.roleIcon} />
                <span>{job.service}</span>
              </div>
            </div>
            <span className={styles.clientRate}>
              {job.currency}
              {job.rate.toLocaleString()}
            </span>
          </div>
        </div>

        <div className={styles.profileScroll}>
          <div className={styles.profileDivider} />

          {status === "heading" && (
            <>
              <div className={styles.section}>
                <span className={styles.sectionLabel}>Problem</span>
                <p className={styles.sectionBody}>{job.description}</p>
                {job.images.length > 0 && (
                  <div className={styles.imageStrip}>
                    {job.images.map((src, i) => (
                      <img
                        key={i}
                        src={src}
                        alt={`Photo ${i + 1}`}
                        className={styles.stripImage}
                      />
                    ))}
                  </div>
                )}
              </div>
              <div className={styles.profileDivider} />
              <div className={styles.section}>
                <span className={styles.sectionLabel}>Location</span>
                <div className={styles.infoRow}>
                  <MapPin
                    size={14}
                    strokeWidth={2}
                    className={styles.infoIcon}
                  />
                  <span className={styles.infoText}>{job.location}</span>
                </div>
                <div className={styles.infoRow}>
                  <Navigation
                    size={14}
                    strokeWidth={2}
                    className={styles.infoIcon}
                  />
                  <span className={styles.infoSubText}>
                    {job.distance} away
                  </span>
                </div>
              </div>
            </>
          )}

          {status === "arrived" && (
            <>
              <div className={styles.section}>
                <span className={styles.sectionLabel}>Your task</span>
                <p className={styles.sectionBody}>
                  You've arrived at {job.clientName.split(" ")[0]}'s location.
                  Assess the problem, agree on the scope of work, then start the
                  job.
                </p>
              </div>
              <div className={styles.profileDivider} />
              <div className={styles.section}>
                <span className={styles.sectionLabel}>Job description</span>
                <p className={styles.sectionBody}>{job.description}</p>
                {job.images.length > 0 && (
                  <div className={styles.imageStrip}>
                    {job.images.map((src, i) => (
                      <img
                        key={i}
                        src={src}
                        alt={`Photo ${i + 1}`}
                        className={styles.stripImage}
                      />
                    ))}
                  </div>
                )}
              </div>
              <div className={styles.profileDivider} />
              <div className={styles.section}>
                <span className={styles.sectionLabel}>
                  Your rate for this job
                </span>
                <div className={styles.rateDisplay}>
                  <span className={styles.rateDisplayCurrency}>
                    {job.currency}
                  </span>
                  <span className={styles.rateDisplayValue}>
                    {job.rate.toLocaleString()}
                  </span>
                </div>
              </div>
            </>
          )}

          <div style={{ height: 160 }} />
        </div>
      </div>

      <div className={styles.stickyBottom}>
        <div className={styles.statusRow}>
          <div className={styles.statusLeft}>
            <span className={styles.statusLabel}>
              {status === "heading" ? "Heading to customer" : "You've arrived"}
            </span>
            {status === "heading" && (
              <span className={styles.statusEta}>{etaRemaining} min away</span>
            )}
            {status === "arrived" && (
              <span className={styles.statusArrived}>
                <CheckCircle2 size={12} strokeWidth={2} /> At the location
              </span>
            )}
          </div>
          <div className={styles.ratePill}>
            <span className={styles.rateCurrency}>{job.currency}</span>
            <span className={styles.rateValue}>
              {job.rate.toLocaleString()}
            </span>
          </div>
        </div>

        <div className={styles.bottomActions}>
          <input
            type="text"
            className={styles.chatInput}
            placeholder="Message customer"
            aria-label="Message"
          />
          <button className={styles.callBtn} aria-label="Call customer">
            <Phone size={18} strokeWidth={2} />
          </button>
        </div>

        <button
          className={`${styles.actionBtn} ${status === "arrived" ? styles.actionBtnGreen : ""}`}
          onClick={() =>
            setStatus(status === "heading" ? "arrived" : "working")
          }
        >
          {status === "heading" ? "I've arrived" : "Start working"}
        </button>
      </div>
    </div>
  );
}
