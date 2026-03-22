"use client";

import { useState, useEffect, useRef, useCallback, useMemo } from "react";
import { useRouter } from "next/navigation";
import { useParams } from "next/navigation";
import { supabase } from "@/lib/supabase";
import {
  Phone,
  MapPin,
  Navigation,
  Zap,
  Clock,
  CheckCircle2,
  ChevronRight,
  ArrowLeft,
  Loader2, // Added for loading state
} from "lucide-react";
import styles from "./page.module.css";
import { MapContainer, TileLayer, Marker, Popup, Polyline } from "react-leaflet";
import L from "leaflet";
import "leaflet/dist/leaflet.css";

/* ------------------------------------------------------------------ */
/* Route interpolation utility                                        */
/* ------------------------------------------------------------------ */
function interpolatePositionAlongRoute(
  routeCoordinates: [number, number][] | null,
  progress: number
): { lat: number; lon: number } | null {
  if (!routeCoordinates || routeCoordinates.length < 2) return null;
  const clampedProgress = Math.max(0, Math.min(1, progress));
  let totalDistance = 0;
  const segments: { distance: number; cumulativeDistance: number }[] = [];
  for (let i = 1; i < routeCoordinates.length; i++) {
    const [lat1, lng1] = routeCoordinates[i - 1];
    const [lat2, lng2] = routeCoordinates[i];
    const distance = Math.sqrt(Math.pow(lat2 - lat1, 2) + Math.pow(lng2 - lng1, 2));
    totalDistance += distance;
    segments.push({ distance, cumulativeDistance: totalDistance });
  }
  const targetDistance = clampedProgress * totalDistance;
  for (let i = 0; i < segments.length; i++) {
    if (targetDistance <= segments[i].cumulativeDistance) {
      const [lat1, lng1] = routeCoordinates[i];
      const [lat2, lng2] = routeCoordinates[i + 1];
      const segmentStartDistance = i === 0 ? 0 : segments[i - 1].cumulativeDistance;
      const segmentProgress = (targetDistance - segmentStartDistance) / segments[i].distance;
      return {
        lat: lat1 + (lat2 - lat1) * segmentProgress,
        lon: lng1 + (lng2 - lng1) * segmentProgress,
      };
    }
  }
  const [lat, lng] = routeCoordinates[routeCoordinates.length - 1];
  return { lat, lon: lng };
}

/* ------------------------------------------------------------------ */
/* Types & constants                                                  */
/* ------------------------------------------------------------------ */
type JobStatus = "heading" | "arrived" | "working" | "completed" | "paid";

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

L.Icon.Default.mergeOptions({
  iconRetinaUrl: "//unpkg.com/leaflet@1.9.4/dist/images/marker-icon-2x.png",
  iconUrl: "//unpkg.com/leaflet@1.9.4/dist/images/marker-icon.png",
  shadowUrl: "//unpkg.com/leaflet@1.9.4/dist/images/marker-shadow.png",
});

/* ------------------------------------------------------------------ */
/* Map                                                                */
/* ------------------------------------------------------------------ */
function RealMap({ job, journeyProgress, status }: { job: JobData; journeyProgress: number; status: JobStatus }) {
  const customerLocation = useMemo(() => {
    return job?.location_lat && job?.location_lng
      ? { lat: job.location_lat, lon: job.location_lng }
      : { lat: 14.2819, lon: 120.9106 };
  }, [job]);

  const [specialistLocation, setSpecialistLocation] = useState<{ lat: number; lon: number } | null>(null);

  useEffect(() => {
    const fetchSpecialist = async () => {
      if (!job?.specialist_id) {
        setSpecialistLocation({ lat: customerLocation.lat + 0.045, lon: customerLocation.lon + 0.045 });
        return;
      }
      try {
        const { data: specialist } = await supabase
          .from("specialists")
          .select("location_lat, location_lng")
          .eq("id", job.specialist_id)
          .single() as { data: { location_lat: number; location_lng: number } | null; error: unknown };

        if (specialist && typeof specialist.location_lat === "number" && typeof specialist.location_lng === "number") {
          setSpecialistLocation({ lat: specialist.location_lat, lon: specialist.location_lng });
        } else {
          setSpecialistLocation({ lat: customerLocation.lat + 0.045, lon: customerLocation.lon + 0.045 });
        }
      } catch {
        setSpecialistLocation({ lat: customerLocation.lat + 0.045, lon: customerLocation.lon + 0.045 });
      }
    };
    fetchSpecialist();
  }, [job?.specialist_id, customerLocation.lat, customerLocation.lon]);

  const workerIcon = useMemo(() => L.divIcon({
    className: "worker-marker",
    html: `<div style="position:relative;width:48px;height:48px;"><div style="position:absolute;top:0;left:0;width:100%;height:100%;border-radius:50%;background:#337df9;opacity:0.3;animation:pulse 2s infinite;"></div><div style="position:absolute;top:2px;left:2px;width:44px;height:44px;border-radius:50%;background:white;border:3px solid #337df9;overflow:hidden;display:flex;align-items:center;justify-content:center;"><img src="https://images.unsplash.com/photo-1621905251918-48416bd8575a?w=800&q=80" style="width:100%;height:100%;object-fit:cover;" /></div></div>`,
    iconSize: [48, 48], iconAnchor: [24, 24],
  }), []);

  const customerIcon = useMemo(() => L.divIcon({
    className: "customer-marker",
    html: `<div style="position:relative;width:32px;height:32px;"><div style="position:absolute;top:0;left:0;width:100%;height:100%;border-radius:50%;background:#3B82F6;opacity:0.2;animation:pulse 2s infinite;"></div><div style="position:absolute;top:4px;left:4px;width:24px;height:24px;border-radius:50%;background:#3B82F6;border:3px solid white;box-shadow:0 2px 8px rgba(59,130,246,0.5);"></div></div>`,
    iconSize: [32, 32], iconAnchor: [16, 16],
  }), []);

  const [localRouteCoordinates, setLocalRouteCoordinates] = useState<[number, number][] | null>(null);

  useEffect(() => {
    if (!customerLocation || !specialistLocation) return;
    const fetchRoute = async () => {
      try {
        const res = await fetch(
          `https://router.project-osrm.org/route/v1/driving/${specialistLocation.lon},${specialistLocation.lat};${customerLocation.lon},${customerLocation.lat}?overview=full&geometries=geojson`
        );
        const data = await res.json();
        if (data.routes?.[0]) {
          setLocalRouteCoordinates(data.routes[0].geometry.coordinates.map(([lng, lat]: [number, number]) => [lat, lng] as [number, number]));
        } else {
          setLocalRouteCoordinates([[specialistLocation.lat, specialistLocation.lon], [customerLocation.lat, customerLocation.lon]]);
        }
      } catch {
        setLocalRouteCoordinates([[specialistLocation.lat, specialistLocation.lon], [customerLocation.lat, customerLocation.lon]]);
      }
    };
    fetchRoute();
  }, [customerLocation, specialistLocation]);

  const currentSpecialistLocation = useMemo(() => {
    if (status === "heading" && localRouteCoordinates && specialistLocation) {
      const interpolated = interpolatePositionAlongRoute(localRouteCoordinates, journeyProgress);
      if (interpolated && !isNaN(interpolated.lat) && !isNaN(interpolated.lon)) {
        return interpolated;
      }
      return specialistLocation;
    }
    return specialistLocation;
  }, [status, localRouteCoordinates, journeyProgress, specialistLocation]);

  const isValidLocation = (loc: { lat: number; lon: number } | null) => {
    return loc !== null && typeof loc.lat === "number" && typeof loc.lon === "number" && !isNaN(loc.lat) && !isNaN(loc.lon);
  };

  const center = useMemo(() => {
    if (customerLocation && currentSpecialistLocation) {
      return {
        lat: (customerLocation.lat + currentSpecialistLocation.lat) / 2,
        lon: (customerLocation.lon + currentSpecialistLocation.lon) / 2,
      };
    }
    return customerLocation || { lat: 14.2819, lon: 120.9106 };
  }, [customerLocation, currentSpecialistLocation]);

  return (
    <MapContainer center={[center.lat, center.lon]} zoom={13} scrollWheelZoom zoomControl={false} style={{ height: "100%", width: "100%" }}>
      <TileLayer url="https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png" attribution='&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a> contributors' />
      <Marker position={[customerLocation.lat, customerLocation.lon]} icon={customerIcon}>
        <Popup>Customer location</Popup>
      </Marker>
      {isValidLocation(currentSpecialistLocation) && (
        <Marker position={[currentSpecialistLocation.lat, currentSpecialistLocation.lon]} icon={workerIcon}>
          <Popup>Your location</Popup>
        </Marker>
      )}
      {localRouteCoordinates && (
        <Polyline positions={localRouteCoordinates} color="#337df9" weight={4} opacity={0.8} dashArray="10, 10" />
      )}
    </MapContainer>
  );
}

/* ------------------------------------------------------------------ */
/* Slide-to-complete                                                  */
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
      setTrackWidth((trackRef.current?.offsetWidth ?? 0) - (thumbRef.current?.offsetWidth ?? 56));
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
    const clamped = Math.max(0, Math.min(1, (e.clientX - startX.current) / getTrackWidth()));
    setProgress(clamped);
    if (clamped >= 0.92) {
      isDragging.current = false;
      setProgress(1);
      setDone(true);
      setTimeout(onComplete, 400);
    }
  };

  const onUp = () => {
    if (!done) { isDragging.current = false; setProgress(0); }
  };

  return (
    <div ref={trackRef} className={`${styles.slideTrack} ${done ? styles.slideTrackDone : ""}`}>
      <span className={`${styles.slideLabel} ${done ? styles.slideLabelHidden : ""}`}>
        Slide to complete job <ChevronRight size={14} strokeWidth={2.5} />
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
        {done ? <CheckCircle2 size={22} strokeWidth={2} /> : <ChevronRight size={22} strokeWidth={2.5} />}
      </div>
    </div>
  );
}

/* ================================================================== */
/* Page                                                                */
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
  const [journeyProgress, setJourneyProgress] = useState(0);

  // Fetch job data on mount
  useEffect(() => {
    if (!jobId) return;
    const fetchJob = async () => {
      try {
        const { data: jobData, error: jobError } = await supabase
          .from("jobs")
          .select("*")
          .eq("id", jobId)
          .single() as { data: Record<string, unknown> | null; error: unknown };

        if (jobError || !jobData) { console.error("Error fetching job:", jobError); return; }

        const { data: customerData } = await supabase
          .from("profiles")
          .select("full_name, avatar_url")
          .eq("id", jobData.customer_id as string)
          .single() as { data: { full_name: string; avatar_url: string } | null; error: unknown };

        const { data: quoteData } = await supabase
          .from("quotes")
          .select("proposed_rate")
          .eq("job_id", jobId)
          .order("created_at", { ascending: false })
          .limit(1)
          .single() as { data: { proposed_rate: number } | null; error: unknown };

        const location = [jobData.street_address, jobData.barangay, jobData.municipality, jobData.province]
          .filter(Boolean).join(", ");

        setJob({
          id: jobData.id as string,
          clientName: customerData?.full_name || "Customer",
          clientAvatar: customerData?.avatar_url || "https://i.pravatar.cc/80?img=5",
          service: jobData.profession as string,
          description: jobData.description as string,
          location: location || "Location not specified",
          distance: "2.1 km",
          eta: 20,
          rate: quoteData?.proposed_rate || 500,
          currency: "₱",
          images: (jobData.photos as string[]) || [],
          customer_id: jobData.customer_id as string,
          location_lat: (jobData.location_lat as number) || null,
          location_lng: (jobData.location_lng as number) || null,
          specialist_id: (jobData.specialist_id as string) || undefined,
        });
      } catch (error) {
        console.error("Error fetching job:", error);
      } finally {
        setIsLoading(false);
      }
    };
    fetchJob();
  }, [jobId]);

  /* ---------------------------------------------------------------- */
  /* Realtime Payment Listener - REMOVED: No longer waiting for payment */
  /* ---------------------------------------------------------------- */
  // Removed the payment listener - now redirecting immediately after job completion

  const updateJobStatus = useCallback(async (newStatus: "working" | "completed") => {
    try {
      const res = await fetch(`/api/jobs/${jobId}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ status: newStatus }),
      });
      if (!res.ok) {
        const err = await res.json().catch(() => ({}));
        console.error(`Failed to set status ${newStatus}:`, err);
      }
    } catch (error) {
      console.error("Error updating job status:", error);
    }
  }, [jobId]);

  /* Sheet drag */
  const sheetRef = useRef<HTMLDivElement>(null);
  const peekRef = useRef<HTMLDivElement>(null);
  const isDrag = useRef(false);
  const startY = useRef(0);
  const startTop = useRef(0);
  const currentTop = useRef(0);
  const rafId = useRef<number | null>(null);

  const getBottomY = useCallback(() => {
    const vh = window.innerHeight;
    return vh - 44 - (peekRef.current?.offsetHeight ?? 120) - 180;
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
      sheetRef.current.style.borderRadius = `${Math.min(24, (t / window.innerHeight) * 80)}px ${Math.min(24, (t / window.innerHeight) * 80)}px 0 0`;
    });
  }, []);

  const onUp = useCallback(() => {
    if (!isDrag.current) return;
    isDrag.current = false;
    const spring = "top 0.42s cubic-bezier(0.16,1,0.3,1), border-radius 0.42s cubic-bezier(0.16,1,0.3,1)";
    if (sheetRef.current) sheetRef.current.style.transition = spring;
    const y = currentTop.current, vh = window.innerHeight;
    if (y <= SNAP_TOP_THRESHOLD) {
      currentTop.current = 0;
      if (sheetRef.current) { sheetRef.current.style.top = "0px"; sheetRef.current.style.borderRadius = "0"; }
    } else if (y >= vh - SNAP_BOTTOM_THRESHOLD) {
      const b = getBottomY();
      currentTop.current = b;
      if (sheetRef.current) { sheetRef.current.style.top = `${b}px`; sheetRef.current.style.borderRadius = "24px 24px 0 0"; }
    } else {
      if (sheetRef.current) sheetRef.current.style.borderRadius = `${Math.min(24, (y / vh) * 80)}px ${Math.min(24, (y / vh) * 80)}px 0 0`;
    }
  }, [getBottomY]);

  /* Timers */
  useEffect(() => {
    if (status !== "heading") return;
    const tick = setInterval(() => {
      setEtaRemaining((n) => {
        const next = Math.max(0, n - 1);
        if (next === 0) setStatus("arrived");
        return next;
      });
    }, 1000);
    return () => clearInterval(tick);
  }, [status]);

  useEffect(() => {
    if (status !== "heading") { setJourneyProgress(0); return; }
    const totalTime = 20 * 60;
    const tick = setInterval(() => setJourneyProgress((p) => Math.min(1, p + 1 / totalTime)), 1000);
    return () => clearInterval(tick);
  }, [status]);

  useEffect(() => {
    if (status !== "working") return;
    const tick = setInterval(() => setElapsed((n) => n + 1), 1000);
    return () => clearInterval(tick);
  }, [status]);

  /* Step 1: Mark job as done physically */
  const handleJobComplete = useCallback(async () => {
    await updateJobStatus("completed");

    // Update specialist stats (jobs completed)
    try {
      const { data: { user } } = await supabase.auth.getUser();
      if (user) {
        const { data: specData } = await supabase
          .from("specialists")
          .select("jobs_completed")
          .eq("user_id", user.id)
          .single() as { data: { jobs_completed: number } | null; error: unknown };

        if (specData) {
          // eslint-disable-next-line @typescript-eslint/no-explicit-any
          await (supabase.from("specialists") as any)
            .update({ jobs_completed: (specData.jobs_completed || 0) + 1 })
            .eq("user_id", user.id);
        }
      }
    } catch { /* non-critical */ }

    // Redirect immediately to dashboard - no payment waiting
    router.push("/specialist/dashboard");
  }, [updateJobStatus, router]);

  const elapsedMins = Math.floor(elapsed / 60);
  const elapsedSecs = elapsed % 60;

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

  /* Status: Working or Completed (Waiting for Payment) */
  if (status === "working" || status === "completed") {
    return (
      <div className={styles.workPage}>
        <header className={styles.pageHeader}>
          <button className={styles.backBtn} onClick={() => router.push("/specialist/dashboard")} aria-label="Back">
            <ArrowLeft size={20} strokeWidth={2} />
          </button>
          <span className={styles.headerTitle}>
            {status === "working" ? "In Progress" : "Awaiting Payment"}
          </span>
          <div style={{ width: 40 }} />
        </header>
        <main className={styles.workMain}>
          <div className={styles.spinnerWrap}>
            <div className={styles.spinnerRing3} />
            <div className={styles.spinnerRing2} />
            <div className={styles.spinnerRing1} />
            <div className={styles.spinnerCenter}>
              {status === "working" ? (
                <Zap size={28} strokeWidth={1.5} className={styles.spinnerIcon} />
              ) : (
                <Loader2 size={28} strokeWidth={1.5} className="animate-spin text-blue-500" />
              )}
            </div>
          </div>
          <div className={styles.workStatusText}>
            <h1 className={styles.workTitle}>
               {status === "working" ? "You're on the job" : "Work Submitted"}
            </h1>
            <p className={styles.workSub}>
              {status === "working" 
                ? `Do great work — ${job.clientName.split(" ")[0]} is counting on you.`
                : `Waiting for ${job.clientName.split(" ")[0]} to confirm payment...`}
            </p>
          </div>
          <div className={styles.workTimer}>
            <Clock size={14} strokeWidth={2} />
            <span>{elapsedMins > 0 ? `${elapsedMins}m ` : ""}{String(elapsedSecs).padStart(2, "0")}s elapsed</span>
          </div>
          <div className={styles.workClientCard}>
            <img src={job.clientAvatar} alt={job.clientName} className={styles.workClientAvatar} />
            <div className={styles.workClientInfo}>
              <span className={styles.workClientName}>{job.clientName}</span>
            </div>
            <span className={styles.workClientRate}>{job.currency}{job.rate.toLocaleString()}</span>
          </div>
        </main>
        <div className={styles.workBottom}>
          <div className={styles.workChatRow}>
            <input type="text" className={styles.chatInput} placeholder="Message customer" aria-label="Message" />
            <button className={styles.callBtn} aria-label="Call"><Phone size={18} strokeWidth={2} /></button>
          </div>
          {status === "working" ? (
            <SlideToComplete onComplete={handleJobComplete} />
          ) : (
            <div className={styles.paymentLoadingArea}>
               <Loader2 className="animate-spin text-blue-500 mr-2" size={18} />
               <span>Verifying Transaction...</span>
            </div>
          )}
        </div>
      </div>
    );
  }

  /* Heading + Arrived */
  return (
    <div className={styles.page}>
      <header className={styles.pageHeader}>
        <button className={styles.backBtn} onClick={() => router.push("/specialist/dashboard")} aria-label="Back">
          <ArrowLeft size={20} strokeWidth={2} />
        </button>
        <span className={styles.headerTitle}>Job Details</span>
        <div style={{ width: 40 }} />
      </header>

      <div className={styles.mapLayer}>
        <RealMap job={job} journeyProgress={journeyProgress} status={status} />
      </div>

      <div ref={sheetRef} className={styles.sheet} aria-label="Job details">
        <div className={styles.handleArea} onPointerDown={onDown} onPointerMove={onMove} onPointerUp={onUp} onPointerCancel={onUp}>
          <div className={styles.handle} aria-hidden />
        </div>

        <div ref={peekRef} className={styles.peekZone}>
          <div className={styles.clientRow}>
            <img src={job.clientAvatar} alt={job.clientName} className={styles.clientAvatar} />
            <div className={styles.clientInfo}>
              <span className={styles.clientName}>{job.clientName}</span>
            </div>
            <span className={styles.clientRate}>{job.currency}{job.rate.toLocaleString()}</span>
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
                    {job.images.map((src, i) => <img key={i} src={src} alt={`Photo ${i + 1}`} className={styles.stripImage} />)}
                  </div>
                )}
              </div>
              <div className={styles.profileDivider} />
              <div className={styles.section}>
                <span className={styles.sectionLabel}>Location</span>
                <div className={styles.infoRow}>
                  <MapPin size={14} strokeWidth={2} className={styles.infoIcon} />
                  <span className={styles.infoText}>{job.location}</span>
                </div>
                <div className={styles.infoRow}>
                  <Navigation size={14} strokeWidth={2} className={styles.infoIcon} />
                  <span className={styles.infoSubText}>{job.distance} away</span>
                </div>
              </div>
            </>
          )}
          {status === "arrived" && (
            <>
              <div className={styles.section}>
                <span className={styles.sectionLabel}>Your task</span>
                <p className={styles.sectionBody}>
                  You&apos;ve arrived at {job.clientName.split(" ")[0]}&apos;s location. Assess the problem, agree on the scope, then start.
                </p>
              </div>
              <div className={styles.profileDivider} />
              <div className={styles.section}>
                <span className={styles.sectionLabel}>Job description</span>
                <p className={styles.sectionBody}>{job.description}</p>
                {job.images.length > 0 && (
                  <div className={styles.imageStrip}>
                    {job.images.map((src, i) => <img key={i} src={src} alt={`Photo ${i + 1}`} className={styles.stripImage} />)}
                  </div>
                )}
              </div>
              <div className={styles.profileDivider} />
              <div className={styles.section}>
                <span className={styles.sectionLabel}>Your rate for this job</span>
                <div className={styles.rateDisplay}>
                  <span className={styles.rateDisplayCurrency}>{job.currency}</span>
                  <span className={styles.rateDisplayValue}>{job.rate.toLocaleString()}</span>
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
            {status === "heading" && <span className={styles.statusEta}>{etaRemaining} min away</span>}
            {status === "arrived" && (
              <span className={styles.statusArrived}>
                <CheckCircle2 size={12} strokeWidth={2} /> At the location
              </span>
            )}
          </div>
          <div className={styles.ratePill}>
            <span className={styles.rateCurrency}>{job.currency}</span>
            <span className={styles.rateValue}>{job.rate.toLocaleString()}</span>
          </div>
        </div>

        <div className={styles.bottomActions}>
          <input type="text" className={styles.chatInput} placeholder="Message customer" aria-label="Message" />
          <button className={styles.callBtn} aria-label="Call customer"><Phone size={18} strokeWidth={2} /></button>
        </div>

        <button
          className={`${styles.actionBtn} ${status === "arrived" ? styles.actionBtnGreen : ""}`}
          disabled={status !== "arrived"}
          onClick={async () => {
            await updateJobStatus("working");
            setStatus("working");
          }}
        >
          Start working
        </button>
      </div>
    </div>
  );
}