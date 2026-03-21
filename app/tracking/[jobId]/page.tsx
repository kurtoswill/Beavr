"use client";

import { useState, useEffect, useRef, useCallback, useMemo } from "react";
import { useRouter } from "next/navigation";
import {
  Phone,
  Navigation,
  Zap,
  BadgeCheck,
  CheckCircle2,
  Search,
  X,
  Lock,
  Star,
} from "lucide-react";
import { MapContainer, TileLayer, Marker, Popup, Polyline } from "react-leaflet";
import L from "leaflet";
import "leaflet/dist/leaflet.css";
import styles from "./page.module.css";

// Fix Leaflet icon paths - use protocol-relative URLs for better compatibility
L.Icon.Default.mergeOptions({
  iconRetinaUrl: "//unpkg.com/leaflet@1.9.4/dist/images/marker-icon-2x.png",
  iconUrl: "//unpkg.com/leaflet@1.9.4/dist/images/marker-icon.png",
  shadowUrl: "//unpkg.com/leaflet@1.9.4/dist/images/marker-shadow.png",
});

/* ------------------------------------------------------------------ */
/*  Route interpolation utility                                        */
/* ------------------------------------------------------------------ */
function interpolatePositionAlongRoute(
  routeCoordinates: [number, number][] | null,
  progress: number
): { lat: number; lon: number } | null {
  if (!routeCoordinates || routeCoordinates.length < 2) return null;

  // Clamp progress between 0 and 1
  const clampedProgress = Math.max(0, Math.min(1, progress));

  // Calculate total distance along route
  let totalDistance = 0;
  const segments: { distance: number; cumulativeDistance: number }[] = [];

  for (let i = 1; i < routeCoordinates.length; i++) {
    const [lat1, lng1] = routeCoordinates[i - 1];
    const [lat2, lng2] = routeCoordinates[i];

    // Simple Euclidean distance (not great circle, but fine for visualization)
    const distance = Math.sqrt(Math.pow(lat2 - lat1, 2) + Math.pow(lng2 - lng1, 2));
    totalDistance += distance;
    segments.push({ distance, cumulativeDistance: totalDistance });
  }

  const targetDistance = clampedProgress * totalDistance;

  // Find which segment the target distance falls into
  for (let i = 0; i < segments.length; i++) {
    if (targetDistance <= segments[i].cumulativeDistance) {
      const [lat1, lng1] = routeCoordinates[i];
      const [lat2, lng2] = routeCoordinates[i + 1];

      // Interpolate within this segment
      const segmentStartDistance = i === 0 ? 0 : segments[i - 1].cumulativeDistance;
      const segmentProgress = (targetDistance - segmentStartDistance) / segments[i].distance;

      const lat = lat1 + (lat2 - lat1) * segmentProgress;
      const lng = lng1 + (lng2 - lng1) * segmentProgress;

      return { lat, lon: lng };
    }
  }

  // If we get here, return the end point
  const [lat, lng] = routeCoordinates[routeCoordinates.length - 1];
  return { lat, lon: lng };
}

/* ------------------------------------------------------------------ */
/*  Types                                                               */
/* ------------------------------------------------------------------ */
type TrackingStatus = "waiting" | "on_the_way" | "arrived" | "no_response";

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
  location_lat?: number | null;
  location_lng?: number | null;
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
const WARN_AFTER_S = 7;
const SNAP_TOP_THRESHOLD = 750;
const SNAP_BOTTOM_THRESHOLD = 250;

/* ------------------------------------------------------------------ */
/*  Map Components                                                      */
/* ------------------------------------------------------------------ */

function TrackingMap({
  customerLocation,
  specialistLocation,
  status,
  routeCoordinates,
  journeyProgress,
}: {
  customerLocation: { lat: number; lon: number } | null;
  specialistLocation: { lat: number; lon: number } | null;
  status: TrackingStatus;
  routeCoordinates: [number, number][] | null;
  journeyProgress: number;
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

  // Calculate route line using OSRM for road routing, but only if status is 'on_the_way'
  const [localRouteCoordinates, setLocalRouteCoordinates] = useState<[number, number][] | null>(null);

  useEffect(() => {
    if (status !== "on_the_way") {
      return;
    }
    const fetchRoute = async () => {
      if (!customerLocation) {
        return;
      }

      // Use specialist location if available, otherwise use a fallback starting point
      const startLocation = specialistLocation || {
        lat: customerLocation.lat + 0.045, // ~5km north
        lon: customerLocation.lon + 0.045  // ~5km east
      };

      try {
        const start = `${startLocation.lon},${startLocation.lat}`;
        const end = `${customerLocation.lon},${customerLocation.lat}`;
        const response = await fetch(
          `https://router.project-osrm.org/route/v1/driving/${start};${end}?overview=full&geometries=geojson`
        );
        const data = await response.json();
        if (data.routes && data.routes.length > 0) {
          const coordinates = data.routes[0].geometry.coordinates.map(
            ([lng, lat]: [number, number]) => [lat, lng] as [number, number]
          );
          setLocalRouteCoordinates(coordinates);
        } else {
          setLocalRouteCoordinates([
            [startLocation.lat, startLocation.lon],
            [customerLocation.lat, customerLocation.lon],
          ]);
        }
      } catch {/* error ignored, fallback to direct line */
        setLocalRouteCoordinates([
          [startLocation.lat, startLocation.lon],
          [customerLocation.lat, customerLocation.lon],
        ]);
      }
    };
    fetchRoute();
  }, [customerLocation, specialistLocation, status]);

  // Calculate interpolated position during journey
  const currentSpecialistLocation = useMemo(() => {
    if (status === "on_the_way" && localRouteCoordinates && customerLocation) {
      // During journey, interpolate position along route
      const interpolated = interpolatePositionAlongRoute(localRouteCoordinates, journeyProgress);
      if (interpolated) return interpolated;

      // Fallback: if interpolation fails, use a position along the direct line
      const startLocation = specialistLocation || {
        lat: customerLocation.lat + 0.045,
        lon: customerLocation.lon + 0.045
      };
      return {
        lat: startLocation.lat + (customerLocation.lat - startLocation.lat) * journeyProgress,
        lon: startLocation.lon + (customerLocation.lon - startLocation.lon) * journeyProgress
      };
    }
    // When waiting or other statuses, use actual location or fallback
    return specialistLocation || (customerLocation ? {
      lat: customerLocation.lat + 0.045,
      lon: customerLocation.lon + 0.045
    } : null);
  }, [status, localRouteCoordinates, journeyProgress, specialistLocation, customerLocation]);

  // Center the map between both points
  const center = useMemo(() => {
    if (customerLocation && currentSpecialistLocation) {
      return {
        lat: (customerLocation.lat + currentSpecialistLocation.lat) / 2,
        lon: (customerLocation.lon + currentSpecialistLocation.lon) / 2,
      };
    }
    return customerLocation || { lat: 14.2819, lon: 120.9106 };
  }, [customerLocation, currentSpecialistLocation]);

  // Always render the map, even if customerLocation is null
  const fallbackCenter = { lat: 14.2819, lon: 120.9106 };
  const mapCenter = center || fallbackCenter;

  return (
    <MapContainer
      center={[mapCenter.lat, mapCenter.lon]}
      zoom={13}
      scrollWheelZoom={true}
      zoomControl={false}
      style={{ height: "100%", width: "100%" }}
    >
      <TileLayer
        url="https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png"
        attribution='&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a> contributors'
      />

      {/* Customer location marker */}
      {customerLocation && (
        <Marker position={[customerLocation.lat, customerLocation.lon]} icon={customerIcon}>
          <Popup>Your location</Popup>
        </Marker>
      )}

      {/* Specialist location marker and route only if status is 'on_the_way' */}
      {status === "on_the_way" && currentSpecialistLocation && (
        <Marker position={[currentSpecialistLocation.lat, currentSpecialistLocation.lon]} icon={workerIcon}>
        </Marker>
      )}
      {status === "on_the_way" && localRouteCoordinates && (
        <Polyline
          positions={localRouteCoordinates}
          color="#337df9"
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
  // Show progress bar for on_the_way, full progress for arrived
  const showProgress = status === "on_the_way" || status === "arrived";
  const progressWidth = status === "arrived" ? 100 : progress;

  if (!showProgress) return null;

  return (
    <div className={styles.progressTrack}>
      <div
        className={`${styles.progressFill} ${status === "on_the_way" ? styles.progressMoving : styles.progressComplete}`}
        style={{ width: `${progressWidth}%` }}
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
  const [customer, setCustomer] = useState<Specialist | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  /* ---- Tracking state ---- */
  const [status, setStatus] = useState<TrackingStatus>("waiting");
  const [progress, setProgress] = useState(0);
  const [etaRemaining, setEtaRemaining] = useState(20);
  const [elapsed, setElapsed] = useState(0);
  const [journeyProgress, setJourneyProgress] = useState(0); // 0-1 progress along route
  const [routeCoordinates, setRouteCoordinates] = useState<[number, number][] | null>(null);

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

        // Fetch customer location from customer profile
        if (jobData.job.customer_id) {
          const custRes = await fetch(`/api/specialists/${jobData.job.customer_id}`);
          if (custRes.ok) {
            const custData = await custRes.json();
            setCustomer(custData.specialist);
          }
        }

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

  /* ---- Poll for job status changes ---- */
  useEffect(() => {
    if (!jobId) return;

    const pollStatus = async () => {
      try {
        const res = await fetch(`/api/jobs/${jobId}`);
        const data = await res.json();

        // If specialist has accepted the job, start ETA simulation immediately
        if (data.job?.status === "bid_accepted" && data.job?.specialist_id) {
          // Update job data and specialist if not already set
          setJob(data.job);
          if (!specialist) {
            const specRes = await fetch(`/api/specialists/${data.job.specialist_id}`);
            if (specRes.ok) {
              const specData = await specRes.json();
              setSpecialist(specData.specialist);
              // Fetch reviews for this specialist
              const reviewsRes = await fetch(`/api/specialists/${data.job.specialist_id}/reviews`);
              if (reviewsRes.ok) {
                const reviewsData = await reviewsRes.json();
                setReviews(reviewsData.reviews || []);
              }
            }
          }
          // Set status to on_the_way and reset progress/eta
          if ((status as TrackingStatus) !== "on_the_way") {
            setStatus("on_the_way");
            setProgress(0);
            setElapsed(0);
            setEtaRemaining(20);
          }
        } else if (data.job?.status === "on_the_way") {
          // (Fallback: if backend is updated to on_the_way, also set status)
          if ((status as TrackingStatus) !== "on_the_way" && (status as TrackingStatus) !== "arrived") {
            setStatus("on_the_way");
            setProgress(0);
            setElapsed(0);
            setEtaRemaining(20);
          }
          // If ETA has reached 0 while on_the_way, transition to arrived
          if ((status as TrackingStatus) === "on_the_way" && etaRemaining === 0) {
            setStatus("arrived");
          }
        } else if (data.job?.status === "working") {
          // Specialist has started working, redirect to working page
          router.push(`/working/${jobId}`);
        } else if (data.job?.status === "completed") {
          // Job is completed, redirect to rate page
          router.push(`/rate/${jobId}`);
        }
      } catch (error) {
        console.error("Error polling job status:", error);
      }
    };

    // Poll every 2 seconds
    const interval = setInterval(pollStatus, 2000);
    return () => clearInterval(interval);
  }, [jobId, status, etaRemaining, specialist, customer, router]);

  /* ---- ETA countdown timer ---- */
  useEffect(() => {
    if (status !== "on_the_way") return;
    const tick = setInterval(
      () => setEtaRemaining((n) => {
        return Math.max(0, n - 1);
      }),
      1000,
    );
    return () => clearInterval(tick);
  }, [status]);

  /* ---- Journey progress simulation ---- */
  useEffect(() => {
    if (status !== "on_the_way") {
      setJourneyProgress(0);
      return;
    }

    const totalTime = 20 * 60; // 20 minutes in seconds
    const tick = setInterval(() => {
      setJourneyProgress((prev) => {
        const newProgress = Math.min(1, prev + (1 / totalTime));
        return newProgress;
      });
    }, 1000);

    return () => clearInterval(tick);
  }, [status]);

  /* ---- Elapsed time timer ---- */
  useEffect(() => {
    if (status !== "waiting") return;
    const tick = setInterval(() => setElapsed((n) => n + 1), 1000);
    return () => clearInterval(tick);
  }, [status]);

  /* ---- Progress bar calculation ---- */
  useEffect(() => {
    if (status === "on_the_way") {
      // Calculate progress as percentage of journey completed
      const initialEta = 20; // 20 minutes
      const progressPercent = ((initialEta - etaRemaining) / initialEta) * 100;
      setProgress(Math.max(0, Math.min(100, progressPercent)));
    } else {
      setProgress(0);
    }
  }, [status, etaRemaining]);

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
    } else if (y >= vh - SNAP_BOTTOM_THRESHOLD) {
      const bottom = getBottomY();
      currentTop.current = bottom;
      if (sheetRef.current) {
        sheetRef.current.style.top = `${bottom}px`;
        sheetRef.current.style.borderRadius = "24px 24px 0 0";
      }
    } else {
      const r = Math.min(24, (y / vh) * 80);
      if (sheetRef.current) sheetRef.current.style.borderRadius = `${r}px ${r}px 0 0`;
    }
  }, [getBottomY]);

  /* ---- Derived data ---- */
  const customerLocation = useMemo(() => {
    // Use customer's profile location if available, otherwise fall back to job location
    if (customer?.location_lat && customer?.location_lng) {
      return { lat: customer.location_lat, lon: customer.location_lng };
    }
    return job?.location_lat && job?.location_lng
      ? { lat: job.location_lat, lon: job.location_lng }
      : null;
  }, [customer?.location_lat, customer?.location_lng, job?.location_lat, job?.location_lng]);

  // Only show specialist location once a specialist has accepted the job
  const specialistLocation = useMemo(() => {
    if (!customerLocation || !specialist) return null;
    // Use real specialist location if available
    if (
      typeof specialist.location_lat === "number" &&
      typeof specialist.location_lng === "number"
    ) {
      return {
        lat: specialist.location_lat,
        lon: specialist.location_lng,
      };
    }
    // fallback: simulate ~5km away
    return {
      lat: customerLocation.lat + 0.045,
      lon: customerLocation.lon + 0.045,
    };
  }, [customerLocation, specialist]);

  /* ---- Fetch route coordinates ---- */
  useEffect(() => {
    if (status !== "on_the_way" || !customerLocation || !specialistLocation) {
      setRouteCoordinates(null);
      return;
    }

    const fetchRoute = async () => {
      try {
        const start = `${specialistLocation.lon},${specialistLocation.lat}`;
        const end = `${customerLocation.lon},${customerLocation.lat}`;
        const response = await fetch(
          `https://router.project-osrm.org/route/v1/driving/${start};${end}?overview=full&geometries=geojson`
        );
        const data = await response.json();
        if (data.routes && data.routes.length > 0) {
          const coordinates = data.routes[0].geometry.coordinates.map(
            ([lng, lat]: [number, number]) => [lat, lng] as [number, number]
          );
          setRouteCoordinates(coordinates);
        } else {
          setRouteCoordinates([
            [specialistLocation.lat, specialistLocation.lon],
            [customerLocation.lat, customerLocation.lon],
          ]);
        }
      } catch {/* error ignored, fallback to direct line */
        setRouteCoordinates([
          [specialistLocation.lat, specialistLocation.lon],
          [customerLocation.lat, customerLocation.lon],
        ]);
      }
    };

    fetchRoute();
  }, [status, customerLocation, specialistLocation]);

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
          routeCoordinates={routeCoordinates}
          journeyProgress={journeyProgress}
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
          {specialist ? (
            <div className={styles.identityRow}>
              <div className={styles.identityAvatar}>
                <img src={specialist.avatar_url || "/default-avatar.png"} alt={specialist.full_name || "Specialist"} />
              </div>
              <div className={styles.identityInfo}>
                <div className={styles.identityTop}>
                  <h2 className={styles.workerName}>{job.profession || "Specialist"}</h2>
                  <span className={styles.workerRate}>
                    ₱{specialist.rate?.toLocaleString() || "500"}
                  </span>
                </div>
                <div className={styles.starRow}>
                  <Star size={13} strokeWidth={2} className={styles.starIcon} fill="#FBBF24" />
                  <span className={styles.ratingText}>{specialist.rating || "4.2"}</span>
                  <span className={styles.reviewsCount}>({specialist.reviews_count || 203} reviews)</span>
                </div>
                <div className={styles.workerRole}>
                  <Zap size={13} strokeWidth={2} className={styles.roleIcon} />
                  <span className={styles.roleText}>{job.profession || "Job"}</span>
                </div>
              </div>
            </div>
          ) : (
            <div className={styles.identityRow} style={{ justifyContent: "center", padding: "20px 16px" }}>
              <div style={{ textAlign: "center", color: "#666" }}>
                <p style={{ fontSize: "16px", fontWeight: "500", marginBottom: "8px" }}>Waiting for specialist...</p>
                <p style={{ fontSize: "13px", color: "#999" }}>Finding the best match for your {job?.profession || "job"}</p>
              </div>
            </div>
          )}
        </div>

        {/* ── Expanded content ── */}
        {specialist ? (
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
                  <span className={styles.badgeTextGray}>{specialist.jobs_completed || 203} jobs completed</span>
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
        ) : (
          <div className={styles.profileScroll} style={{ textAlign: "center", padding: "40px 20px" }}>
            <p style={{ fontSize: "16px", color: "#666", marginBottom: "16px" }}>
              Waiting for a specialist to accept your job...
            </p>
            <p style={{ fontSize: "13px", color: "#999", marginBottom: "20px" }}>
              We&apos;re finding the best match for your {job?.profession || "job"} in your area.
            </p>
          </div>
        )}
      </div>
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
            {status === "arrived" && (
              <div className={styles.statusArrived}>
                <span className={styles.statusLabel}>Worker has arrived</span>
                <span className={styles.statusEtaBadge}>At location</span>
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
          {status === "arrived" && "Your specialist has arrived and is getting ready to start work."}
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
