"use client";

import {
  useState,
  useEffect,
  useRef,
  useCallback,
} from "react";
import { useRouter } from "next/navigation";
import {
  Phone,
  MapPin,
  Navigation,
  Zap,
  BadgeCheck,
  CheckCircle2,
  Search,
  X,
  Lock,
  MessageCircle,
} from "lucide-react";
import StarRating from "@/components/StarRating/StarRating";
import ReviewCard, { type Review } from "@/components/ReviewCard/ReviewCard";
import styles from "./page.module.css";

/* ------------------------------------------------------------------ */
/*  Constants                                                           */
/* ------------------------------------------------------------------ */
type TrackingStatus = "waiting" | "on_the_way" | "no_response";

const WAITING_TIMEOUT_MS = 10_000;
const WARN_AFTER_S       = 7;
/** px from top: if sheet reaches above this, snap to full screen */
const SNAP_TOP_THRESHOLD    = 750;
/** px from bottom: if sheet goes below this, snap to collapsed peek */
const SNAP_BOTTOM_THRESHOLD = 250;

const WORKER = {
  name:      "Kurt Oswill McCarver",
  avatar:    "https://images.unsplash.com/photo-1621905251918-48416bd8575a?w=800&q=80",
  role:      "Electrician",
  rating:    4.2,
  reviews:   203,
  eta:       20,
  area:      "Green Valley Field Subdivision",
  distance:  "6 km",
  rate:      500,
  currency:  "₱",
  certified: "TESDA Certified",
  jobsDone:  203,
};

const SELECTED_PAYMENT = { label: "Cash once done", badge: "COD", badgeColor: "#22C55E" };

const REVIEWS: Review[] = [
  {
    id: "1",
    name:   "Kazel Arwen Jane Tuazon",
    avatar: "https://i.pravatar.cc/80?img=5",
    rating: 3.5,
    text:   "I thought we lost our electricity. Turns out my cat chewed on the wires. Thank you for the fast repair!! 🙏🙏🙏",
    images: [
      "https://images.unsplash.com/photo-1558618666-fcd25c85cd64?w=400&q=80",
      "https://images.unsplash.com/photo-1565193566173-7a0ee3dbe261?w=400&q=80",
    ],
  },
  {
    id: "2",
    name:   "Mark Santos",
    avatar: "https://i.pravatar.cc/80?img=12",
    rating: 5,
    text:   "Very professional and on time. Fixed our panel box in under an hour. Highly recommend!",
  },
];

/* ================================================================== */
/*  Fake map                                                            */
/* ================================================================== */
function FakeMap({ status }: { status: TrackingStatus }) {
  return (
    <div className={styles.map}>
      <div className={styles.mapBg} />
      <svg className={styles.mapRoads} viewBox="0 0 390 700" aria-hidden>
        <line x1="0"   y1="280" x2="390" y2="310" stroke="#4a5568" strokeWidth="6" />
        <line x1="0"   y1="420" x2="390" y2="400" stroke="#4a5568" strokeWidth="4" />
        <line x1="195" y1="0"   x2="210" y2="700" stroke="#4a5568" strokeWidth="6" />
        <line x1="80"  y1="0"   x2="90"  y2="700" stroke="#374151" strokeWidth="3" />
        <line x1="310" y1="0"   x2="300" y2="700" stroke="#374151" strokeWidth="3" />
        <line x1="0"   y1="150" x2="390" y2="160" stroke="#374151" strokeWidth="2" opacity="0.5" />
        <line x1="0"   y1="530" x2="390" y2="545" stroke="#374151" strokeWidth="2" opacity="0.5" />
        <text x="20"  y="272" fill="#6b7280" fontSize="9" fontFamily="sans-serif">National Road</text>
        <text x="215" y="200" fill="#6b7280" fontSize="9" fontFamily="sans-serif" transform="rotate(90,215,200)">Indang Rd</text>
      </svg>
      <svg className={styles.routeSvg} viewBox="0 0 390 700" fill="none" aria-hidden>
        <path d="M200 110 C205 160, 185 220, 200 295 C210 350, 192 410, 198 500"
          stroke="#22C55E" strokeWidth="14" strokeLinecap="round" opacity="0.15" />
        <path d="M200 110 C205 160, 185 220, 200 295 C210 350, 192 410, 198 500"
          stroke="#22C55E" strokeWidth="5" strokeLinecap="round" strokeDasharray="10 5" />
      </svg>
      <div className={styles.pinYou}>
        <div className={styles.pinYouRing} />
        <div className={styles.pinYouDot} />
        <span className={styles.pinYouLabel}>You</span>
      </div>
      <div className={`${styles.pinWorker} ${status === "on_the_way" ? styles.pinWorkerMoving : ""}`}>
        <img src={WORKER.avatar} alt={WORKER.name} className={styles.pinWorkerAvatar} />
        <span className={styles.pinWorkerEta}>{WORKER.eta} min</span>
      </div>
      <span className={styles.mapLabel} style={{ top: "18%", left: "12%" }}>Bancod</span>
      <span className={styles.mapLabel} style={{ top: "55%", left: "20%" }}>Indang</span>
      <span className={styles.mapLabel} style={{ top: "38%", right: "8%", textAlign: "right" }}>Cavite State{"\n"}University</span>
      <span className={styles.mapLabelRoad} style={{ top: "39%", left: "22%" }}>404</span>
    </div>
  );
}

/* ================================================================== */
/*  Progress bar                                                        */
/* ================================================================== */
function ProgressBar({ status, progress }: { status: TrackingStatus; progress: number }) {
  return (
    <div className={styles.progressTrack}>
      <div
        className={`${styles.progressFill} ${status === "on_the_way" ? styles.progressMoving : styles.progressWaiting}`}
        style={{ width: `${progress}%` }}
      />
    </div>
  );
}

/* ================================================================== */
/*  Page                                                                */
/* ================================================================== */
export default function TrackingPage() {
  const router = useRouter();

  /* ---- Job status ---- */
  const [status, setStatus]           = useState<TrackingStatus>("waiting");
  const [progress, setProgress]       = useState(0);
  const [etaRemaining, setEtaRemaining] = useState(WORKER.eta);
  const [elapsed, setElapsed]         = useState(0);

  /* ---- Sheet drag ---- */
  const sheetRef      = useRef<HTMLDivElement>(null);
  const peekZoneRef   = useRef<HTMLDivElement>(null);
  const isDragging    = useRef(false);
  const startY        = useRef(0);
  const startTop      = useRef(0);        // sheet.offsetTop at drag start
  const currentTop    = useRef<number>(0); // live top value
  const rafId         = useRef<number | null>(null);
  const [isFullScreen, setIsFullScreen] = useState(false);

  /* ---- Compute snap positions ---- */
  const getBottomY = useCallback(() => {
    const vh          = window.innerHeight;
    const bottomBarH  = document.querySelector('[class*="stickyBottom"]') instanceof HTMLElement
      ? (document.querySelector('[class*="stickyBottom"]') as HTMLElement).offsetHeight
      : 160;
    // handleArea height ~44px + peekZone content
    const handleH  = 44;
    const peekH    = peekZoneRef.current?.offsetHeight ?? 120;
    return vh - handleH - peekH - bottomBarH;
  }, []);

  const getTopY = useCallback(() => 0, []);

  /* ---- Set initial position ---- */
  useEffect(() => {
    const init = () => {
      const y = getBottomY();
      currentTop.current = y;
      if (sheetRef.current) {
        sheetRef.current.style.transition = "none";
        sheetRef.current.style.top = `${y}px`;
        sheetRef.current.style.borderRadius = "";
      }
    };
    // slight delay so DOM is measured
    const id = requestAnimationFrame(init);
    window.addEventListener("resize", init);
    return () => { cancelAnimationFrame(id); window.removeEventListener("resize", init); };
  }, [getBottomY]);

  /* ---- Drag: down from handle only ---- */
  const onHandlePointerDown = useCallback((e: React.PointerEvent) => {
    isDragging.current = true;
    startY.current     = e.clientY;
    startTop.current   = currentTop.current;
    if (sheetRef.current) sheetRef.current.style.transition = "none";
    (e.currentTarget as HTMLElement).setPointerCapture(e.pointerId);
    e.preventDefault();
  }, []);

  const onHandlePointerMove = useCallback((e: React.PointerEvent) => {
    if (!isDragging.current) return;
    const delta  = e.clientY - startY.current;
    const target = Math.max(0, startTop.current + delta);
    if (rafId.current) cancelAnimationFrame(rafId.current);
    rafId.current = requestAnimationFrame(() => {
      if (!sheetRef.current) return;
      sheetRef.current.style.top = `${target}px`;
      currentTop.current = target;
      // Dynamically remove border-radius when near the top
      const pct = target / window.innerHeight;
      const r   = Math.min(24, pct * 80); // 0px at top, 24px at rest
      sheetRef.current.style.borderRadius = `${r}px ${r}px 0 0`;
    });
  }, []);

  const onHandlePointerUp = useCallback(() => {
    if (!isDragging.current) return;
    isDragging.current = false;
    const spring = "top 0.42s cubic-bezier(0.16,1,0.3,1), border-radius 0.42s cubic-bezier(0.16,1,0.3,1)";
    if (sheetRef.current) sheetRef.current.style.transition = spring;

    const y  = currentTop.current;
    const vh = window.innerHeight;

    if (y <= SNAP_TOP_THRESHOLD) {
      // Snap to full screen
      currentTop.current = 0;
      if (sheetRef.current) {
        sheetRef.current.style.top          = "0px";
        sheetRef.current.style.borderRadius = "0";
      }
      setIsFullScreen(true);
    } else if (y >= vh - SNAP_BOTTOM_THRESHOLD) {
      // Snap to collapsed
      const bottom = getBottomY();
      currentTop.current = bottom;
      if (sheetRef.current) {
        sheetRef.current.style.top          = `${bottom}px`;
        sheetRef.current.style.borderRadius = "24px 24px 0 0";
      }
      setIsFullScreen(false);
    } else {
      // Let it rest where it is; restore radius proportionally
      const r = Math.min(24, (y / vh) * 80);
      if (sheetRef.current) sheetRef.current.style.borderRadius = `${r}px ${r}px 0 0`;
      setIsFullScreen(y < vh * 0.25);
    }
  }, [getBottomY]);

  /* ---- Status timers ---- */
  useEffect(() => {
    if (status !== "waiting") return;
    const TOTAL = WAITING_TIMEOUT_MS / 1000;
    const tick  = setInterval(() => {
      setElapsed((e) => {
        const next = e + 0.1;
        setProgress(Math.min((next / TOTAL) * 100, 100));
        return next;
      });
    }, 100);
    const done  = setTimeout(() => {
      clearInterval(tick);
      setStatus("on_the_way");
      setProgress(0);
      setElapsed(0);
    }, WAITING_TIMEOUT_MS);
    return () => { clearInterval(tick); clearTimeout(done); };
  }, [status]);

  useEffect(() => {
    if (status !== "on_the_way") return;

    const TOTAL       = WORKER.eta;           // 20 visual minutes
    const TOTAL_MS    = 20_000;               // 20 s real time (demo)
    const TICK_MS     = TOTAL_MS / TOTAL;     // 1 s per visual minute

    let cur = 0;

    // Countdown tick — updates progress bar + ETA display
    const tick = setInterval(() => {
      cur++;
      setProgress(Math.min((cur / TOTAL) * 100, 100));
      setEtaRemaining(Math.max(TOTAL - cur, 0));
    }, TICK_MS);

    // Hard deadline — redirect exactly when time is up
    const done = setTimeout(() => {
      clearInterval(tick);
      router.push("/working/job-001");
    }, TOTAL_MS);

    return () => {
      clearInterval(tick);
      clearTimeout(done);
    };
  }, [status, router]);

  const isLate = elapsed >= WARN_AFTER_S && status === "waiting";

  /* ================================================================
     Render
     ================================================================ */
  return (
    <div className={styles.page}>

      {/* ── Layer 1: Map (full screen background) ─────────────────── */}
      <div className={styles.mapLayer}>
        <FakeMap status={status} />
      </div>

      {/* ── Layer 2: Worker profile sheet (draggable) ─────────────── */}
      <div
        ref={sheetRef}
        className={styles.sheet}
        aria-label="Specialist profile"
      >
        {/* Drag handle */}
        <div
          className={styles.handleArea}
          onPointerDown={onHandlePointerDown}
          onPointerMove={onHandlePointerMove}
          onPointerUp={onHandlePointerUp}
          onPointerCancel={onHandlePointerUp}
        >
          <div className={styles.handle} aria-hidden />
        </div>

        {/* ── Peek zone — always visible, identity only ── */}
        <div ref={peekZoneRef} className={styles.peekZone}>
          <div className={styles.identityRow}>
            <div className={styles.identityAvatar}>
              <img src={WORKER.avatar} alt={WORKER.name} />
            </div>
            <div className={styles.identityInfo}>
              <div className={styles.identityTop}>
                <h2 className={styles.workerName}>{WORKER.name}</h2>
                <span className={styles.workerRate}>{WORKER.currency}{WORKER.rate.toLocaleString()}</span>
              </div>
              <StarRating rating={WORKER.rating} reviewCount={WORKER.reviews} size={13} />
              <div className={styles.workerRole}>
                <Zap size={13} strokeWidth={2} className={styles.roleIcon} />
                <span className={styles.roleText}>{WORKER.role}</span>
              </div>
            </div>
          </div>
        </div>

        {/* ── Expanded content — only visible when dragged up ── */}
        <div className={styles.profileScroll}>

          <div className={styles.profileDivider} />

          {/* Distance + location */}
          <div className={styles.section}>
            <div className={styles.locationRow}>
              <Navigation size={15} strokeWidth={2} className={styles.locationIcon} />
              <span className={styles.locationDistance}>{WORKER.distance}</span>
              <span className={styles.locationSep}>·</span>
              <span className={styles.locationArea}>{WORKER.area}</span>
            </div>
            <div className={styles.badges}>
              <div className={styles.badge}>
                <BadgeCheck size={14} strokeWidth={2} className={styles.badgeBlue} />
                <span className={styles.badgeTextBlue}>{WORKER.certified}</span>
              </div>
              <div className={styles.badge}>
                <CheckCircle2 size={14} strokeWidth={2} className={styles.badgeGray} />
                <span className={styles.badgeTextGray}>{WORKER.jobsDone} jobs completed</span>
              </div>
            </div>
          </div>

          <div className={styles.profileDivider} />

          {/* Payment — locked */}
          <div className={styles.section}>
            <div className={styles.paymentTitleRow}>
              <h3 className={styles.sectionTitle}>Payment method</h3>
              <div className={styles.lockedBadge}>
                <Lock size={11} strokeWidth={2.5} />
                <span>Locked</span>
              </div>
            </div>
            <div className={styles.paymentRowLocked}>
              <span className={styles.paymentBadge} style={{ background: SELECTED_PAYMENT.badgeColor }}>
                {SELECTED_PAYMENT.badge}
              </span>
              <span className={styles.paymentLabel}>{SELECTED_PAYMENT.label}</span>
              <span className={styles.paymentRadioFilled} />
            </div>
            <p className={styles.paymentLockedNote}>
              Payment method cannot be changed while the worker is on the way.
            </p>
          </div>

          <div className={styles.profileDivider} />

          {/* Reviews */}
          <div className={styles.section}>
            <h3 className={styles.sectionTitle}>Worker Reviews</h3>
            <div className={styles.reviewsList}>
              {REVIEWS.map((r) => <ReviewCard key={r.id} review={r} />)}
            </div>
          </div>

          <div style={{ height: 160 }} />
        </div>
      </div>

      {/* ── Layer 3: Sticky bottom bar (always on top) ────────────── */}
      <div className={styles.stickyBottom}>

        {/* Row 1: Rate + ETA + status label */}
        <div className={styles.stickyTopRow}>

          {/* Status + ETA */}
          <div className={styles.statusBlock}>
            {status === "waiting" && (
              <span className={styles.statusLabel}>Waiting for response</span>
            )}
            {status === "on_the_way" && (
              <div className={styles.statusOnWay}>
                <span className={styles.statusLabel}>Worker is on the way</span>
                <span className={styles.statusEtaBadge}>{etaRemaining} min</span>
              </div>
            )}
            {status === "no_response" && (
              <span className={`${styles.statusLabel} ${styles.statusWarn}`}>Worker didn't respond</span>
            )}
          </div>
        </div>

        {/* Row 2: Progress bar */}
        <ProgressBar status={status} progress={progress} />

        {/* Status note */}
        <p className={`${styles.statusNote} ${isLate ? styles.statusNoteLate : ""}`}>
          {status === "waiting" && !isLate && "Looking for your specialist to confirm and head your way…"}
          {status === "waiting" && isLate  && "Your specialist hasn't responded yet. They usually reply within 10 s."}
          {status === "on_the_way" && (etaRemaining > 1
            ? `Your specialist is on the way — ${etaRemaining} min away.`
            : "Your specialist is almost there!")}
          {status === "no_response" && "The worker didn't respond in time."}
        </p>

        {/* No response actions */}
        {status === "no_response" && (
          <div className={styles.noResponseActions}>
            <button className={styles.findWorkerBtn} onClick={() => router.push("/")}>
              <Search size={15} strokeWidth={2} /> Find a worker
            </button>
            <button className={styles.cancelBtn} onClick={() => router.push("/")}>
              <X size={15} strokeWidth={2} /> Cancel job
            </button>
          </div>
        )}

        {/* Row 3: Chat input + call */}
        <div className={styles.chatRow}>
          <input
            type="text"
            className={styles.chatInput}
            placeholder="Chat with the worker"
            aria-label="Chat with the worker"
          />
          <button className={styles.callBtn} aria-label="Call worker">
            <Phone size={18} strokeWidth={2} />
          </button>
        </div>
      </div>

    </div>
  );
}