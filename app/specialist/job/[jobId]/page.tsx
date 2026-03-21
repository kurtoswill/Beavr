"use client";

import { useState, useEffect, useRef, useCallback, useMemo } from "react";
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
  ChevronRight,
  ArrowLeft,
} from "lucide-react";
import styles from "./page.module.css";
import { MapContainer, TileLayer, Marker, Popup, Polyline } from "react-leaflet";
import L from "leaflet";
import "leaflet/dist/leaflet.css";

/* ------------------------------------------------------------------ *//*  Route interpolation utility                                        */
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

/* ------------------------------------------------------------------ *//*  Supabase Client                                                     */
/* ------------------------------------------------------------------ */
const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL!;
const supabaseKey = process.env.NEXT_PUBLIC_SUPABASE_PUBLISHABLE_DEFAULT_KEY!;
const supabase = createClient(supabaseUrl, supabaseKey);

/* ------------------------------------------------------------------ */
/*  Types & constants                                                   */
/* ------------------------------------------------------------------ */
type JobStatus = "heading" | "arrived" | "working";

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
  location_lat?: number | null;
  location_lng?: number | null;
  specialist_id?: string;
}

// Fix Leaflet icon paths
L.Icon.Default.mergeOptions({
  iconRetinaUrl: "//unpkg.com/leaflet@1.9.4/dist/images/marker-icon-2x.png",
  iconUrl: "//unpkg.com/leaflet@1.9.4/dist/images/marker-icon.png",
  shadowUrl: "//unpkg.com/leaflet@1.9.4/dist/images/marker-shadow.png",
});

function RealMap({ job, journeyProgress, status }: { job: JobData; journeyProgress: number; status: JobStatus }) {
  // Use real customer and specialist locations if available
  const customerLocation = useMemo(() => {
    return job && job.location_lat && job.location_lng
      ? { lat: job.location_lat, lon: job.location_lng }
      : { lat: 14.2819, lon: 120.9106 };
  }, [job]);

  // Fetch specialist location from DB
  const [specialistLocation, setSpecialistLocation] = useState<{ lat: number; lon: number } | null>(null);
  useEffect(() => {
    const fetchSpecialist = async () => {
      if (!job || !job.specialist_id) {
        console.log("No job or specialist_id to fetch:", { job: !!job, specialist_id: job?.specialist_id });
        setSpecialistLocation({ lat: customerLocation.lat + 0.045, lon: customerLocation.lon + 0.045 });
        return;
      }
      try {
        const { data: specialist, error } = await supabase
          .from("specialists")
          .select("location_lat, location_lng")
          .eq("id", job.specialist_id)
          .single();
        
        if (error) {/* location unavailable, use fallback */
          setSpecialistLocation({ lat: customerLocation.lat + 0.045, lon: customerLocation.lon + 0.045 });
          return;
        }
        
        if (specialist && typeof specialist.location_lat === "number" && typeof specialist.location_lng === "number") {
          setSpecialistLocation({ lat: specialist.location_lat, lon: specialist.location_lng });
        } else {
          setSpecialistLocation({ lat: customerLocation.lat + 0.045, lon: customerLocation.lon + 0.045 });
        }
      } catch (err) {
        console.error("Fetch specialist error:", err);
        setSpecialistLocation({ lat: customerLocation.lat + 0.045, lon: customerLocation.lon + 0.045 });
      }
    };
    fetchSpecialist();
  }, [job, job?.specialist_id, customerLocation.lat, customerLocation.lon]);

  // Custom marker icons (reuse from tracking page)
  const workerIcon = useMemo(
    () =>
      L.divIcon({
        className: "worker-marker",
        html: `
          <div style="position: relative; width: 48px; height: 48px;">
            <div style="position: absolute; top: 0; left: 0; width: 100%; height: 100%; border-radius: 50%; background: #337df9; opacity: 0.3; animation: pulse 2s infinite;"></div>
            <div style="position: absolute; top: 2px; left: 2px; width: 44px; height: 44px; border-radius: 50%; background: white; border: 3px solid #337df9; overflow: hidden; display: flex; align-items: center; justify-content: center;">
              <img src="https://images.unsplash.com/photo-1621905251918-48416bd8575a?w=800&q=80" style="width: 100%; height: 100%; object-fit: cover;" />
            </div>
          </div>
        `,
        iconSize: [48, 48],
        iconAnchor: [24, 24],
      }),
    []
  );
  const customerIcon = useMemo(
    () =>
      L.divIcon({
        className: "customer-marker",
        html: `
          <div style="position: relative; width: 32px; height: 32px;">
            <div style="position: absolute; top: 0; left: 0; width: 100%; height: 100%; border-radius: 50%; background: #3B82F6; opacity: 0.2; animation: pulse 2s infinite;"></div>
            <div style="position: absolute; top: 4px; left: 4px; width: 24px; height: 24px; border-radius: 50%; background: #3B82F6; border: 3px solid white; box-shadow: 0 2px 8px rgba(59, 130, 246, 0.5);"></div>
          </div>
        `,
        iconSize: [32, 32],
        iconAnchor: [16, 16],
      }),
    []
  );

  // Route state
  const [localRouteCoordinates, setLocalRouteCoordinates] = useState<[number, number][] | null>(null);

  useEffect(() => {
    const fetchRoute = async () => {
      if (!customerLocation || !specialistLocation) {
        setLocalRouteCoordinates(null);
        return;
      }
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
          setLocalRouteCoordinates(coordinates);
        } else {
          setLocalRouteCoordinates([
            [specialistLocation.lat, specialistLocation.lon],
            [customerLocation.lat, customerLocation.lon],
          ]);
        }
      } catch {/* error ignored, use fallback route */
        setLocalRouteCoordinates([
          [specialistLocation.lat, specialistLocation.lon],
          [customerLocation.lat, customerLocation.lon],
        ]);
      }
    };
    fetchRoute();
  }, [customerLocation, specialistLocation]);

  // Calculate interpolated position during journey
  const currentSpecialistLocation = useMemo(() => {
    if (status === "heading" && localRouteCoordinates && specialistLocation) {
      // During journey, interpolate position along route
      const interpolated = interpolatePositionAlongRoute(localRouteCoordinates, journeyProgress);
      return interpolated || specialistLocation;
    }
    // When arrived or working, use actual location
    return specialistLocation;
  }, [status, localRouteCoordinates, journeyProgress, specialistLocation]);

  // Center map between both points
  const center = useMemo(() => {
    if (customerLocation && currentSpecialistLocation) {
      return {
        lat: (customerLocation.lat + currentSpecialistLocation.lat) / 2,
        lon: (customerLocation.lon + currentSpecialistLocation.lon) / 2,
      };
    }
    return customerLocation || { lat: 14.2819, lon: 120.9106 };
  }, [customerLocation, currentSpecialistLocation]);

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
      {/* Customer marker */}
      <Marker position={[customerLocation.lat, customerLocation.lon]} icon={customerIcon}>
        <Popup>Customer location</Popup>
      </Marker>
      {/* Specialist marker */}
      {currentSpecialistLocation && (
        <Marker position={[currentSpecialistLocation.lat, currentSpecialistLocation.lon]} icon={workerIcon}>
          <Popup>Your location</Popup>
        </Marker>
      )}
      {/* Route polyline */}
      {localRouteCoordinates && (
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
/*  Slide-to-complete                                                   */
/* ------------------------------------------------------------------ */
function SlideToComplete({ onComplete }: { onComplete: () => void }) {
  const trackRef = useRef<HTMLDivElement>(null);
  const thumbRef = useRef<HTMLDivElement>(null);
  const isDragging = useRef(false);
  const startX = useRef(0);
  const [progress, setProgress] = useState(0);
  const [done, setDone] = useState(false);
  const [trackWidth, setTrackWidth] = useState(0);

  useEffect(() => {
    const updateWidth = () => {
      const tWid = (trackRef.current?.offsetWidth ?? 0) - (thumbRef.current?.offsetWidth ?? 56);
      setTrackWidth(tWid);
    };
    updateWidth();
    window.addEventListener("resize", updateWidth);
    return () => window.removeEventListener("resize", updateWidth);
  }, []);

  const getTrackWidth = useCallback(() => trackWidth, [trackWidth]);

  const onDown = (e: React.PointerEvent) => {
    isDragging.current = true;
    startX.current = e.clientX - progress * getTrackWidth();
    (e.currentTarget as HTMLElement).setPointerCapture(e.pointerId);
  };

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
  const [journeyProgress, setJourneyProgress] = useState(0); // 0-1 progress along route

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
          location_lat: jobData.location_lat || null,
          location_lng: jobData.location_lng || null,
          specialist_id: jobData.specialist_id || undefined,
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
      () => setEtaRemaining((n) => {
        const newEta = Math.max(0, n - 1);
        // When ETA reaches 0, change status to arrived
        if (newEta === 0 && status === "heading") {
          setStatus("arrived");
        }
        return newEta;
      }),
      1000,
    );
    return () => clearInterval(tick);
  }, [status]);

  /* Journey progress simulation */
  useEffect(() => {
    if (status !== "heading") {
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

  useEffect(() => {
    if (status !== "working") return;
    const tick = setInterval(() => setElapsed((n) => n + 1), 1000);
    return () => clearInterval(tick);
  }, [status]);

  // eslint-disable-next-line @typescript-eslint/no-unused-vars
  const handleRateSubmit = async (_happy: boolean) => {
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
    } catch {// error ignored
      console.error("Error completing job");
    }
    router.push("/specialist/dashboard");
  };

  const handleJobComplete = async () => {
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
    } catch {// error ignored
      console.error("Error completing job");
    }
    router.push("/specialist/dashboard");
  };

  /* ---- Sheet content differs by status ---- */
  const showWorking = status === "working";

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

  /* Working screen */
  if (showWorking) {
    return (
      <div className={styles.workPage}>
        <header className={styles.pageHeader}>
          <button
            className={styles.backBtn}
            onClick={() => router.push("/specialist/dashboard")}
            aria-label="Back to dashboard"
          >
            <ArrowLeft size={20} strokeWidth={2} />
          </button>
          <span className={styles.headerTitle}>In Progress</span>
          <div style={{ width: 40 }} />
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
            <h1 className={styles.workTitle}>You&apos;re on the job</h1>
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
          <SlideToComplete onComplete={handleJobComplete} />
        </div>
      </div>
    );
  }

  /* Heading + Arrived — map + draggable sheet */
  return (
    <div className={styles.page}>
      <header className={styles.pageHeader}>
        <button
          className={styles.backBtn}
          onClick={() => router.push("/specialist/dashboard")}
          aria-label="Back to dashboard"
        >
          <ArrowLeft size={20} strokeWidth={2} />
        </button>
        <span className={styles.headerTitle}>Job Details</span>
        <div style={{ width: 40 }} />
      </header>

      <div className={styles.mapLayer}>
        <RealMap job={job} journeyProgress={journeyProgress} status={status} />
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
                  You&apos;ve arrived at {job.clientName.split(" ")[0]}&apos;s location.
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
          disabled={status !== "arrived"}
          onClick={async () => {
            // Update backend status to working when starting work
            try {
              await supabase
                .from("jobs")
                .update({ status: "working" })
                .eq("id", jobId);
            } catch (error) {
              console.error("Error updating job status:", error);
            }
            setStatus("working");
          }}
        >
          Start working
        </button>
      </div>
    </div>
  );
}
