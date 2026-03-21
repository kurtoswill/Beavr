"use client";

import { useState, useEffect, useRef, useCallback, useMemo } from "react";
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
  Star,
} from "lucide-react";
import { MapContainer, TileLayer, Marker, Popup, useMap, Polyline } from "react-leaflet";
import L from "leaflet";
import "leaflet/dist/leaflet.css";
import styles from "./page.module.css";

// Fix Leaflet icon paths
L.Icon.Default.mergeOptions({
  iconRetinaUrl: "https://unpkg.com/leaflet@1.9.4/dist/images/marker-icon-2x.png",
  iconUrl: "https://unpkg.com/leaflet@1.9.4/dist/images/marker-icon.png",
  shadowUrl: "https://unpkg.com/leaflet@1.9.4/dist/images/marker-shadow.png",
});

/* ------------------------------------------------------------------ */
/*  Types                                                               */
/* ------------------------------------------------------------------ */
type TrackingStatus = "waiting" | "on_the_way" | "no_response";

interface Job {
  id: string;
  customer_id: string;
  profession: string;
  description: string;
  street_address: string;
  province: string | null;
  municipality: string | null;
  barangay: string | null;
  landmarks: string | null;
  location_lat: number | null;
  location_lng: number | null;
  photos: string[] | null;
  status: string;
  specialist_id: string | null;
  created_at: string;
  accepted_at: string | null;
}

interface Specialist {
  id: string;
  full_name: string | null;
  email: string | null;
  avatar_url: string | null;
  phone: string | null;
  role: string | null;
  province: string | null;
  municipality: string | null;
  rating?: number;
  reviews_count?: number;
  jobs_completed?: number;
  rate?: number;
}

interface Review {
  id: string;
  name: string;
  avatar: string;
  rating: number;
  text: string;
  images?: string[];
}

/* ------------------------------------------------------------------ */
/*  Constants                                                           */
/* ------------------------------------------------------------------ */
const WAITING_TIMEOUT_MS = 10_000;
const WARN_AFTER_S = 7;
const SNAP_TOP_THRESHOLD = 750;
const SNAP_BOTTOM_THRESHOLD = 250;

/* ------------------------------------------------------------------ */
/*  Map Components                                                      */
/* ------------------------------------------------------------------ */
function RecenterMap({ coords }: { coords: { lat: number; lon: number } | null }) {
  const map = useMap();

  useEffect(() => {
    if (coords && map) {
      map.setView([coords.lat, coords.lon], map.getZoom());
    }
  }, [coords, map]);

  return null;
}

function TrackingMap({
  customerLocation,
  specialistLocation,
  status,
}: {
  customerLocation: { lat: number; lon: number } | null;
  specialistLocation: { lat: number; lon: number } | null;
  status: TrackingStatus;
}) {
  // Custom worker marker icon
  const workerIcon = useMemo(
    () =>
      L.divIcon({
        className: "worker-marker",
        html: `
          <div style="
            position: relative;
            width: 48px;
            height: 48px;
          ">
            <div style="
              position: absolute;
              top: 0;
              left: 0;
              width: 100%;
              height: 100%;
              border-radius: 50%;
              background: ${status === "on_the_way" ? "#22C55E" : "#3B82F6"};
              opacity: 0.3;
              animation: pulse 2s infinite;
            "></div>
            <div style="
              position: absolute;
              top: 2px;
              left: 2px;
              width: 44px;
              height: 44px;
              border-radius: 50%;
              background: white;
              border: 3px solid ${status === "on_the_way" ? "#22C55E" : "#3B82F6"};
              overflow: hidden;
              display: flex;
              align-items: center;
              justify-content: center;
            ">
              <img 
                src="https://images.unsplash.com/photo-1621905251918-48416bd8575a?w=800&q=80" 
                style="width: 100%; height: 100%; object-fit: cover;"
              />
            </div>
          </div>
        `,
        iconSize: [48, 48],
        iconAnchor: [24, 24],
      }),
    [status]
  );

  // Customer location marker
  const customerIcon = useMemo(
    () =>
      L.divIcon({
        className: "customer-marker",
        html: `
          <div style="
            position: relative;
            width: 32px;
            height: 32px;
          ">
            <div style="
              position: absolute;
              top: 0;
              left: 0;
              width: 100%;
              height: 100%;
              border-radius: 50%;
              background: #3B82F6;
              opacity: 0.2;
              animation: pulse 2s infinite;
            "></div>
            <div style="
              position: absolute;
              top: 4px;
              left: 4px;
              width: 24px;
              height: 24px;
              border-radius: 50%;
              background: #3B82F6;
              border: 3px solid white;
              box-shadow: 0 2px 8px rgba(59, 130, 246, 0.5);
            "></div>
          </div>
        `,
        iconSize: [32, 32],
        iconAnchor: [16, 16],
      }),
    []
  );

  // Calculate route line
  const routePath = useMemo(() => {
    if (!customerLocation || !specialistLocation) return null;
    return [
      [customerLocation.lat, customerLocation.lon] as [number, number],
      [specialistLocation.lat, specialistLocation.lon] as [number, number],
    ];
  }, [customerLocation, specialistLocation]);

  // Center the map between both points
  const center = useMemo(() => {
    if (customerLocation && specialistLocation) {
      return {
        lat: (customerLocation.lat + specialistLocation.lat) / 2,
        lon: (customerLocation.lon + specialistLocation.lon) / 2,
      };
    }
    return customerLocation || { lat: 14.2819, lon: 120.9106 };
  }, [customerLocation, specialistLocation]);

  if (!customerLocation) {
    return (
      <div className={styles.map}>
        <div className={styles.mapLoading}>Loading map...</div>
      </div>
    );
  }

  return (
    <MapContainer
      center={[center.lat, center.lon]}
      zoom={13}
      scrollWheelZoom={true}
      zoomControl={false}
      style={{ height: "100%", width: "100%" }}
    >
      <TileLayer
        url="https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png"
        attribution='&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a> contributors'
      />
      <RecenterMap coords={center} />

      {/* Customer location marker */}
      <Marker position={[customerLocation.lat, customerLocation.lon]} icon={customerIcon}>
        <Popup>Your location</Popup>
      </Marker>

      {/* Specialist location marker (if available) */}
      {specialistLocation && (
        <Marker position={[specialistLocation.lat, specialistLocation.lon]} icon={workerIcon}>
        </Marker>
      )}

      {/* Route line between customer and specialist */}
      {routePath && (
        <Polyline
          positions={routePath}
          color="#22C55E"
          weight={4}
          opacity={0.8}
          dashArray="10, 10"
        />
      )}
    </MapContainer>
  );
}

/* ------------------------------------------------------------------ */
/*  Progress bar                                                        */
/* ------------------------------------------------------------------ */
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
export default function TrackingPage({ params }: { params: Promise<{ jobId: string }> }) {
  const router = useRouter();
  const [jobId, setJobId] = useState<string>("");

  /* ---- Data state ---- */
  const [job, setJob] = useState<Job | null>(null);
  const [specialist, setSpecialist] = useState<Specialist | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  /* ---- Tracking state ---- */
  const [status, setStatus] = useState<TrackingStatus>("waiting");
  const [progress, setProgress] = useState(0);
  const [etaRemaining, setEtaRemaining] = useState(15);
  const [elapsed, setElapsed] = useState(0);

  /* ---- Reviews ---- */
  const [reviews, setReviews] = useState<Review[]>([]);

  /* ---- Sheet drag ---- */
  const sheetRef = useRef<HTMLDivElement>(null);
  const peekZoneRef = useRef<HTMLDivElement>(null);
  const isDragging = useRef(false);
  const startY = useRef(0);
  const startTop = useRef(0);
  const currentTop = useRef<number>(0);
  const rafId = useRef<number | null>(null);
  const [isFullScreen, setIsFullScreen] = useState(false);

  // Resolve params
  useEffect(() => {
    params.then(({ jobId }) => {
      setJobId(jobId);
    });
  }, [params]);

  /* ---- Fetch job and specialist data ---- */
  useEffect(() => {
    if (!jobId) return;

    const fetchData = async () => {
      try {
        // Fetch job details
        const jobRes = await fetch(`/api/jobs/${jobId}`);
        const jobData = await jobRes.json();

        if (!jobRes.ok) {
          throw new Error(jobData.error || "Failed to fetch job");
        }

        setJob(jobData.job);

        // Fetch specialist details if assigned
        if (jobData.job.specialist_id) {
          // In a real app, you'd have a /api/specialists/[id] endpoint
          // For now, fetch from profiles
          const specRes = await fetch(`/api/specialists/${jobData.job.specialist_id}`);
          if (specRes.ok) {
            const specData = await specRes.json();
            setSpecialist(specData.specialist);

            // Fetch reviews for this specialist
            const reviewsRes = await fetch(`/api/specialists/${jobData.job.specialist_id}/reviews`);
            if (reviewsRes.ok) {
              const reviewsData = await reviewsRes.json();
              setReviews(reviewsData.reviews || []);
            }
          }
        }
      } catch (err) {
        console.error("Error fetching data:", err);
        setError(err instanceof Error ? err.message : "Failed to load job");
      } finally {
        setLoading(false);
      }
    };

    fetchData();
  }, [jobId]);

  /* ---- Simulate specialist response ---- */
  useEffect(() => {
    if (status !== "waiting") return;

    const TOTAL = WAITING_TIMEOUT_MS / 1000;
    const tick = setInterval(() => {
      setElapsed((e) => {
        const next = e + 0.1;
        setProgress(Math.min((next / TOTAL) * 100, 100));
        return next;
      });
    }, 100);

    const done = setTimeout(() => {
      clearInterval(tick);
      // Simulate specialist accepting (in real app, this would be via WebSocket/polling)
      setStatus("on_the_way");
      setProgress(0);
      setElapsed(0);
    }, WAITING_TIMEOUT_MS);

    return () => {
      clearInterval(tick);
      clearTimeout(done);
    };
  }, [status]);

  /* ---- Simulate worker travel ---- */
  useEffect(() => {
    if (status !== "on_the_way") return;

    const TOTAL = 15; // 15 visual minutes
    const TOTAL_MS = 30_000; // 30s real time for demo
    const TICK_MS = TOTAL_MS / TOTAL;

    let cur = 0;

    const tick = setInterval(() => {
      cur++;
      setProgress(Math.min((cur / TOTAL) * 100, 100));
      setEtaRemaining(Math.max(TOTAL - cur, 0));
    }, TICK_MS);

    const done = setTimeout(() => {
      clearInterval(tick);
      // Redirect to working page when ETA is complete
      router.push(`/working/${jobId}`);
    }, TOTAL_MS);

    return () => {
      clearInterval(tick);
      clearTimeout(done);
    };
  }, [status, router, jobId]);

  const isLate = elapsed >= WARN_AFTER_S && status === "waiting";

  /* ---- Compute snap positions ---- */
  const getBottomY = useCallback(() => {
    const vh = window.innerHeight;
    const bottomBarH = document.querySelector(`.${styles.stickyBottom}`) instanceof HTMLElement
      ? (document.querySelector(`.${styles.stickyBottom}`) as HTMLElement).offsetHeight
      : 160;
    const handleH = 44;
    const peekH = peekZoneRef.current?.offsetHeight ?? 120;
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
    const id = requestAnimationFrame(init);
    window.addEventListener("resize", init);
    return () => {
      cancelAnimationFrame(id);
      window.removeEventListener("resize", init);
    };
  }, [getBottomY]);

  /* ---- Drag handlers ---- */
  const onHandlePointerDown = useCallback((e: React.PointerEvent) => {
    isDragging.current = true;
    startY.current = e.clientY;
    startTop.current = currentTop.current;
    if (sheetRef.current) sheetRef.current.style.transition = "none";
    (e.currentTarget as HTMLElement).setPointerCapture(e.pointerId);
    e.preventDefault();
  }, []);

  const onHandlePointerMove = useCallback((e: React.PointerEvent) => {
    if (!isDragging.current) return;
    const delta = e.clientY - startY.current;
    const target = Math.max(0, startTop.current + delta);
    if (rafId.current) cancelAnimationFrame(rafId.current);
    rafId.current = requestAnimationFrame(() => {
      if (!sheetRef.current) return;
      sheetRef.current.style.top = `${target}px`;
      currentTop.current = target;
      const pct = target / window.innerHeight;
      const r = Math.min(24, pct * 80);
      sheetRef.current.style.borderRadius = `${r}px ${r}px 0 0`;
    });
  }, []);

  const onHandlePointerUp = useCallback(() => {
    if (!isDragging.current) return;
    isDragging.current = false;
    const spring = "top 0.42s cubic-bezier(0.16,1,0.3,1), border-radius 0.42s cubic-bezier(0.16,1,0.3,1)";
    if (sheetRef.current) sheetRef.current.style.transition = spring;

    const y = currentTop.current;
    const vh = window.innerHeight;

    if (y <= SNAP_TOP_THRESHOLD) {
      currentTop.current = 0;
      if (sheetRef.current) {
        sheetRef.current.style.top = "0px";
        sheetRef.current.style.borderRadius = "0";
      }
      setIsFullScreen(true);
    } else if (y >= vh - SNAP_BOTTOM_THRESHOLD) {
      const bottom = getBottomY();
      currentTop.current = bottom;
      if (sheetRef.current) {
        sheetRef.current.style.top = `${bottom}px`;
        sheetRef.current.style.borderRadius = "24px 24px 0 0";
      }
      setIsFullScreen(false);
    } else {
      const r = Math.min(24, (y / vh) * 80);
      if (sheetRef.current) sheetRef.current.style.borderRadius = `${r}px ${r}px 0 0`;
      setIsFullScreen(y < vh * 0.25);
    }
  }, [getBottomY]);

  /* ---- Derived data ---- */
  const customerLocation = job?.location_lat && job?.location_lng
    ? { lat: job.location_lat, lon: job.location_lng }
    : null;

  // In a real app, specialist would have their own location
  // For demo, we simulate it being slightly offset from customer
  const specialistLocation = useMemo(() => {
    if (!customerLocation) return null;
    // Simulate specialist being ~5km away
    return {
      lat: customerLocation.lat + 0.045,
      lon: customerLocation.lon + 0.045,
    };
  }, [customerLocation]);

  const displaySpecialist = specialist || {
    id: "",
    full_name: "Kurt Oswill McCarver",
    avatar_url: "https://images.unsplash.com/photo-1621905251918-48416bd8575a?w=800&q=80",
    role: job?.profession || "Electrician",
    phone: "+63 912 345 6789",
    rating: 4.2,
    reviews_count: 203,
    jobs_completed: 203,
    rate: 500,
  };

  const displayReviews: Review[] = reviews.length > 0 ? reviews : [
    {
      id: "1",
      name: "Kazel Arwen Jane Tuazon",
      avatar: "https://i.pravatar.cc/80?img=5",
      rating: 3.5,
      text: "I thought we lost our electricity. Turns out my cat chewed on the wires. Thank you for the fast repair!! 🙏",
      images: [
        "https://images.unsplash.com/photo-1558618666-fcd25c85cd64?w=400&q=80",
        "https://images.unsplash.com/photo-1565193566173-7a0ee3dbe261?w=400&q=80",
      ],
    },
    {
      id: "2",
      name: "Mark Santos",
      avatar: "https://i.pravatar.cc/80?img=12",
      rating: 5,
      text: "Very professional and on time. Fixed our panel box in under an hour. Highly recommend!",
    },
  ];

  if (loading) {
    return (
      <div className={styles.page}>
        <div className={styles.mapLayer}>
          <div className={styles.mapLoading}>Loading job details...</div>
        </div>
      </div>
    );
  }

  if (error || !job) {
    return (
      <div className={styles.page}>
        <div className={styles.errorState}>
          <h2>Job not found</h2>
          <p>{error || "The job you're looking for doesn't exist."}</p>
          <button className={styles.homeBtn} onClick={() => router.push("/")}>
            Go Home
          </button>
        </div>
      </div>
    );
  }

  return (
    <div className={styles.page}>
      {/* ── Layer 1: Map (full screen background) ─────────────────── */}
      <div className={styles.mapLayer}>
        <TrackingMap
          customerLocation={customerLocation}
          specialistLocation={specialistLocation}
          status={status}
        />
      </div>

      {/* ── Layer 2: Worker profile sheet (draggable) ─────────────── */}
      <div ref={sheetRef} className={styles.sheet} aria-label="Specialist profile">
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

        {/* ── Peek zone — always visible ── */}
        <div ref={peekZoneRef} className={styles.peekZone}>
          <div className={styles.identityRow}>
            <div className={styles.identityAvatar}>
              <img src={displaySpecialist.avatar_url || "/default-avatar.png"} alt={displaySpecialist.full_name || "Specialist"} />
            </div>
            <div className={styles.identityInfo}>
              <div className={styles.identityTop}>
                <h2 className={styles.workerName}>{displaySpecialist.full_name || "Specialist"}</h2>
                <span className={styles.workerRate}>
                  ₱{displaySpecialist.rate?.toLocaleString() || "500"}
                </span>
              </div>
              <div className={styles.starRow}>
                <Star size={13} strokeWidth={2} className={styles.starIcon} fill="#FBBF24" />
                <span className={styles.ratingText}>{displaySpecialist.rating || "4.2"}</span>
                <span className={styles.reviewsCount}>({displaySpecialist.reviews_count || 203} reviews)</span>
              </div>
              <div className={styles.workerRole}>
                <Zap size={13} strokeWidth={2} className={styles.roleIcon} />
                <span className={styles.roleText}>{displaySpecialist.role || "Electrician"}</span>
              </div>
            </div>
          </div>
        </div>

        {/* ── Expanded content ── */}
        <div className={styles.profileScroll}>
          <div className={styles.profileDivider} />

          {/* Distance + location */}
          <div className={styles.section}>
            <div className={styles.locationRow}>
              <Navigation size={15} strokeWidth={2} className={styles.locationIcon} />
              <span className={styles.locationDistance}>~5 km</span>
              <span className={styles.locationSep}>·</span>
              <span className={styles.locationArea}>
                {job.province || "Cavite"}
              </span>
            </div>
            <div className={styles.badges}>
              <div className={styles.badge}>
                <BadgeCheck size={14} strokeWidth={2} className={styles.badgeBlue} />
                <span className={styles.badgeTextBlue}>TESDA Certified</span>
              </div>
              <div className={styles.badge}>
                <CheckCircle2 size={14} strokeWidth={2} className={styles.badgeGray} />
                <span className={styles.badgeTextGray}>{displaySpecialist.jobs_completed || 203} jobs completed</span>
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
              <span className={styles.paymentBadge} style={{ background: "#22C55E" }}>
                COD
              </span>
              <span className={styles.paymentLabel}>Cash once done</span>
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
              {displayReviews.map((r) => (
                <div key={r.id} className={styles.reviewCard}>
                  <div className={styles.reviewHeader}>
                    <img src={r.avatar} alt={r.name} className={styles.reviewAvatar} />
                    <div className={styles.reviewInfo}>
                      <span className={styles.reviewName}>{r.name}</span>
                      <div className={styles.reviewRating}>
                        {[1, 2, 3, 4, 5].map((star) => (
                          <Star
                            key={star}
                            size={12}
                            strokeWidth={2}
                            className={star <= r.rating ? styles.starFilled : styles.starEmpty}
                            fill={star <= r.rating ? "#FBBF24" : "none"}
                          />
                        ))}
                      </div>
                    </div>
                  </div>
                  <p className={styles.reviewText}>{r.text}</p>
                  {r.images && r.images.length > 0 && (
                    <div className={styles.reviewImages}>
                      {r.images.map((img, i) => (
                        <img key={i} src={img} alt="Review" className={styles.reviewImage} />
                      ))}
                    </div>
                  )}
                </div>
              ))}
            </div>
          </div>

          <div style={{ height: 160 }} />
        </div>
      </div>

      {/* ── Layer 3: Sticky bottom bar ────────────────────────────── */}
      <div className={styles.stickyBottom}>
        {/* Row 1: Status + ETA */}
        <div className={styles.stickyTopRow}>
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
              <span className={`${styles.statusLabel} ${styles.statusWarn}`}>Worker didn&apos;t respond</span>
            )}
          </div>
        </div>

        {/* Row 2: Progress bar */}
        <ProgressBar status={status} progress={progress} />

        {/* Status note */}
        <p className={`${styles.statusNote} ${isLate ? styles.statusNoteLate : ""}`}>
          {status === "waiting" && !isLate && "Looking for your specialist to confirm and head your way…"}
          {status === "waiting" && isLate && "Your specialist hasn't responded yet. They usually reply within 10 s."}
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
