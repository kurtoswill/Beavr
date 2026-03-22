"use client";

import { useState, useEffect, useRef, useCallback, useMemo } from "react";
import { useRouter } from "next/navigation";
import { supabase } from "@/lib/supabase";
import {
  Phone,
  Navigation,
  Zap,
  BadgeCheck,
  CheckCircle2,
  ArrowLeft,
  Search,
  X,
  Lock,
  Star,
} from "lucide-react";
import { MapContainer, TileLayer, Marker, Popup, Polyline } from "react-leaflet";
import L from "leaflet";
import "leaflet/dist/leaflet.css";
import styles from "./page.module.css";

/* ------------------------------------------------------------------ */
/*  Supabase — imported from shared singleton @ lib/supabase.ts        */
/* ------------------------------------------------------------------ */

L.Icon.Default.mergeOptions({
  iconRetinaUrl: "//unpkg.com/leaflet@1.9.4/dist/images/marker-icon-2x.png",
  iconUrl: "//unpkg.com/leaflet@1.9.4/dist/images/marker-icon.png",
  shadowUrl: "//unpkg.com/leaflet@1.9.4/dist/images/marker-shadow.png",
});

/* ------------------------------------------------------------------ */
/*  Route interpolation                                                 */
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
const POLL_INTERVAL_MS = 3000; // fallback poll every 3 seconds

/* ------------------------------------------------------------------ */
/*  Map                                                                 */
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
  const workerIcon = useMemo(
    () =>
      L.divIcon({
        className: "worker-marker",
        html: `<div style="position:relative;width:48px;height:48px;"><div style="position:absolute;top:0;left:0;width:100%;height:100%;border-radius:50%;background:${status === "on_the_way" ? "#22C55E" : "#3B82F6"};opacity:0.3;animation:pulse 2s infinite;"></div><div style="position:absolute;top:2px;left:2px;width:44px;height:44px;border-radius:50%;background:white;border:3px solid ${status === "on_the_way" ? "#22C55E" : "#3B82F6"};overflow:hidden;display:flex;align-items:center;justify-content:center;"><img src="https://images.unsplash.com/photo-1621905251918-48416bd8575a?w=800&q=80" style="width:100%;height:100%;object-fit:cover;" /></div></div>`,
        iconSize: [48, 48],
        iconAnchor: [24, 24],
      }),
    [status]
  );

  const customerIcon = useMemo(
    () =>
      L.divIcon({
        className: "customer-marker",
        html: `<div style="position:relative;width:32px;height:32px;"><div style="position:absolute;top:0;left:0;width:100%;height:100%;border-radius:50%;background:#3B82F6;opacity:0.2;animation:pulse 2s infinite;"></div><div style="position:absolute;top:4px;left:4px;width:24px;height:24px;border-radius:50%;background:#3B82F6;border:3px solid white;box-shadow:0 2px 8px rgba(59,130,246,0.5);"></div></div>`,
        iconSize: [32, 32],
        iconAnchor: [16, 16],
      }),
    []
  );

  const [localRouteCoordinates, setLocalRouteCoordinates] = useState<[number, number][] | null>(null);

  useEffect(() => {
    if (status !== "on_the_way" || !customerLocation) return;
    const startLocation = specialistLocation || {
      lat: customerLocation.lat + 0.045,
      lon: customerLocation.lon + 0.045,
    };
    const fetchRoute = async () => {
      try {
        const res = await fetch(
          `https://router.project-osrm.org/route/v1/driving/${startLocation.lon},${startLocation.lat};${customerLocation.lon},${customerLocation.lat}?overview=full&geometries=geojson`
        );
        const data = await res.json();
        if (data.routes?.[0]) {
          setLocalRouteCoordinates(
            data.routes[0].geometry.coordinates.map(([lng, lat]: [number, number]) => [lat, lng] as [number, number])
          );
        } else {
          setLocalRouteCoordinates([[startLocation.lat, startLocation.lon], [customerLocation.lat, customerLocation.lon]]);
        }
      } catch {
        setLocalRouteCoordinates([[startLocation.lat, startLocation.lon], [customerLocation.lat, customerLocation.lon]]);
      }
    };
    fetchRoute();
  }, [customerLocation, specialistLocation, status]);

  const currentSpecialistLocation = useMemo(() => {
    if (status === "on_the_way" && localRouteCoordinates && customerLocation) {
      const interpolated = interpolatePositionAlongRoute(localRouteCoordinates, journeyProgress);
      if (interpolated) return interpolated;
      const startLocation = specialistLocation || { lat: customerLocation.lat + 0.045, lon: customerLocation.lon + 0.045 };
      return {
        lat: startLocation.lat + (customerLocation.lat - startLocation.lat) * journeyProgress,
        lon: startLocation.lon + (customerLocation.lon - startLocation.lon) * journeyProgress,
      };
    }
    return specialistLocation || (customerLocation ? { lat: customerLocation.lat + 0.045, lon: customerLocation.lon + 0.045 } : null);
  }, [status, localRouteCoordinates, journeyProgress, specialistLocation, customerLocation]);

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
      <TileLayer url="https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png" attribution='&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a>' />
      {customerLocation && (
        <Marker position={[customerLocation.lat, customerLocation.lon]} icon={customerIcon}>
          <Popup>Your location</Popup>
        </Marker>
      )}
      {status === "on_the_way" && currentSpecialistLocation && (
        <Marker position={[currentSpecialistLocation.lat, currentSpecialistLocation.lon]} icon={workerIcon} />
      )}
      {status === "on_the_way" && localRouteCoordinates && (
        <Polyline positions={localRouteCoordinates} color="#337df9" weight={4} opacity={0.8} dashArray="10, 10" />
      )}
    </MapContainer>
  );
}

/* ------------------------------------------------------------------ */
/*  Progress bar                                                        */
/* ------------------------------------------------------------------ */
function ProgressBar({ status, progress }: { status: TrackingStatus; progress: number }) {
  if (status !== "on_the_way" && status !== "arrived") return null;
  return (
    <div className={styles.progressTrack}>
      <div
        className={`${styles.progressFill} ${status === "on_the_way" ? styles.progressMoving : styles.progressComplete}`}
        style={{ width: `${status === "arrived" ? 100 : progress}%` }}
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

  const [job, setJob] = useState<Job | null>(null);
  const [specialist, setSpecialist] = useState<Specialist | null>(null);
  const [customer, setCustomer] = useState<Specialist | null>(null);
  const [loading, setLoading] = useState(true);
  const [realtimeStatus, setRealtimeStatus] = useState<'connecting' | 'connected' | 'disconnected'>('connecting');
  const [error, setError] = useState<string | null>(null);

  const [status, setStatus] = useState<TrackingStatus>("waiting");
  const [progress, setProgress] = useState(0);
  const [etaRemaining, setEtaRemaining] = useState(20);
  const [elapsed, setElapsed] = useState(0);
  const [journeyProgress, setJourneyProgress] = useState(0);
  const [routeCoordinates, setRouteCoordinates] = useState<[number, number][] | null>(null);

  const [reviews, setReviews] = useState<Review[]>([]);

  const sheetRef = useRef<HTMLDivElement>(null);
  const peekZoneRef = useRef<HTMLDivElement>(null);
  const isDragging = useRef(false);
  const startY = useRef(0);
  const startTop = useRef(0);
  const currentTop = useRef<number>(0);
  const rafId = useRef<number | null>(null);

  // Track whether we've already transitioned away from "waiting"
  // so we don't repeatedly reset ETA
  const hasTransitioned = useRef(false);

  useEffect(() => {
    params.then(({ jobId }) => setJobId(jobId));
  }, [params]);

  /* ---------------------------------------------------------------- */
  /*  Core: process a job update (used by both poll + realtime)        */
  /* ---------------------------------------------------------------- */
  const processJobUpdate = useCallback(
    async (updatedJob: Job) => {
      setJob(updatedJob);

      const { status: jobStatus, specialist_id } = updatedJob;

      // Fetch specialist profile if newly assigned
      if (specialist_id && !hasTransitioned.current) {
        try {
          // Try fetching by specialist row id first
          const specRes = await fetch(`/api/specialists/${specialist_id}`);
          if (specRes.ok) {
            const specData = await specRes.json();
            if (specData.specialist) {
              setSpecialist(specData.specialist);
              const revRes = await fetch(`/api/specialists/${specialist_id}/reviews`);
              if (revRes.ok) {
                const revData = await revRes.json();
                setReviews(revData.reviews || []);
              }
            }
          }
        } catch (err) {
          console.warn("Could not fetch specialist profile:", err);
        }
      }

      // Handle status transitions
      if (jobStatus === "bid_accepted" || jobStatus === "on_the_way") {
        if (!hasTransitioned.current) {
          console.log("[Tracking] Specialist accepted — transitioning to on_the_way");
          hasTransitioned.current = true;
          setStatus("on_the_way");
          setProgress(0);
          setElapsed(0);
          setEtaRemaining(20);
        }
      } else if (jobStatus === "working") {
        router.push(`/working/${updatedJob.id}`);
      } else if (jobStatus === "completed") {
        router.push(`/rate/${updatedJob.id}`);
      }
    },
    [router]
  );

  /* ---------------------------------------------------------------- */
  /*  Initial data fetch                                               */
  /* ---------------------------------------------------------------- */
  useEffect(() => {
    if (!jobId) return;

    const fetchData = async () => {
      try {
        const jobRes = await fetch(`/api/jobs/${jobId}`);
        const jobData = await jobRes.json();
        if (!jobRes.ok) throw new Error(jobData.error || "Failed to fetch job");

        // Fetch customer location
        if (jobData.job.customer_id) {
          const custRes = await fetch(`/api/specialists/${jobData.job.customer_id}`);
          if (custRes.ok) {
            const custData = await custRes.json();
            setCustomer(custData.specialist);
          }
        }

        // Process the initial job state (will also fetch specialist if already assigned)
        await processJobUpdate(jobData.job);
      } catch (err) {
        console.error("Error fetching data:", err);
        setError(err instanceof Error ? err.message : "Failed to load job");
      } finally {
        setLoading(false);
      }
    };

    fetchData();
  }, [jobId, processJobUpdate]);

  /* ---------------------------------------------------------------- */
  /*  Realtime subscription — sets auth token to keep connection alive */
  /* ---------------------------------------------------------------- */
  useEffect(() => {
    if (!jobId) return;

    let channel: ReturnType<typeof supabase.channel> | null = null;
    let isDestroyed = false;
    let reconnectTimeout: NodeJS.Timeout | null = null;

    const subscribe = async () => {
      if (isDestroyed) return;

      try {
        // Get fresh session each time we subscribe
        const { data: { session }, error: sessionError } = await supabase.auth.getSession();
        if (sessionError) {
          console.warn("[Realtime] Session error:", sessionError);
          return;
        }

        if (!session?.access_token) {
          console.warn("[Realtime] No access token available");
          return;
        }

        // Set the auth token for this connection
        await supabase.realtime.setAuth(session.access_token);

        console.log("[Realtime] Subscribing to job:", jobId);

        channel = supabase
          .channel(`tracking-${jobId}`)
          .on(
            "postgres_changes",
            {
              event: "UPDATE",
              schema: "public",
              table: "jobs",
              filter: `id=eq.${jobId}`,
            },
            async (payload) => {
              console.log("[Realtime] Received update:", payload.new);
              await processJobUpdate(payload.new as Job);
            }
          )
          .subscribe((subStatus, err) => {
            console.log("[Realtime] Subscription status:", subStatus, err ? `Error: ${err}` : '');

            if (subStatus === 'SUBSCRIBED') {
              setRealtimeStatus('connected');
            } else if (subStatus === 'TIMED_OUT' || subStatus === 'CLOSED' || subStatus === 'CHANNEL_ERROR') {
              setRealtimeStatus('disconnected');
              console.log("[Realtime] Connection lost, attempting to reconnect in 5 seconds...");
              if (reconnectTimeout) clearTimeout(reconnectTimeout);
              reconnectTimeout = setTimeout(() => {
                if (!isDestroyed) {
                  // Clean up old channel
                  if (channel) {
                    supabase.removeChannel(channel);
                    channel = null;
                  }
                  subscribe();
                }
              }, 5000);
            } else {
              setRealtimeStatus('connecting');
            }
          });
      } catch (err) {
        console.warn("[Realtime] Could not set up subscription:", err);
        // Try to reconnect after error
        if (reconnectTimeout) clearTimeout(reconnectTimeout);
        reconnectTimeout = setTimeout(() => {
          if (!isDestroyed) subscribe();
        }, 5000);
      }
    };

    subscribe();

    // Listen for auth changes to refresh the connection
    const { data: { subscription: authSubscription } } = supabase.auth.onAuthStateChange((event, session) => {
      if (event === 'TOKEN_REFRESHED' && session?.access_token) {
        console.log("[Realtime] Auth token refreshed, updating connection...");
        if (channel) {
          supabase.realtime.setAuth(session.access_token);
        }
      }
    });

    return () => {
      isDestroyed = true;
      if (reconnectTimeout) clearTimeout(reconnectTimeout);
      if (channel) supabase.removeChannel(channel);
      authSubscription.unsubscribe();
    };
  }, [jobId, processJobUpdate]);

  /* ---------------------------------------------------------------- */
  /*  Fallback poll — catches updates if Realtime isn't enabled yet    */
  /* ---------------------------------------------------------------- */
  useEffect(() => {
    if (!jobId) return;

    let pollInterval: NodeJS.Timeout | null = null;
    let isDestroyed = false;
    let realtimeWorking = true; // Assume realtime works initially
    let consecutiveErrors = 0;

    const poll = async () => {
      if (isDestroyed) return;

      try {
        const res = await fetch(`/api/jobs/${jobId}`);
        if (!res.ok) {
          consecutiveErrors++;
          return;
        }

        const data = await res.json();
        if (data.job) {
          await processJobUpdate(data.job);
          consecutiveErrors = 0;

          // If we successfully got an update via polling, realtime might be down
          if (realtimeWorking) {
            console.log("[Poll] Realtime may be down, increasing poll frequency");
            realtimeWorking = false;
          }
        }
      } catch (err) {
        console.warn("[Poll] Error:", err);
        consecutiveErrors++;
      }
    };

    // Start with normal polling interval
    let currentInterval = POLL_INTERVAL_MS;

    const startPolling = () => {
      if (pollInterval) clearInterval(pollInterval);
      pollInterval = setInterval(poll, currentInterval);
    };

    // Initial poll
    poll();
    startPolling();

    // Monitor realtime status and adjust polling
    const checkRealtimeStatus = () => {
      if (!realtimeWorking && consecutiveErrors === 0) {
        // If polling worked and realtime was down, try slower polling
        realtimeWorking = true;
        currentInterval = POLL_INTERVAL_MS;
        console.log("[Poll] Realtime appears to be working again, slowing poll");
        startPolling();
      } else if (!realtimeWorking) {
        // If realtime is down, poll more frequently
        currentInterval = Math.max(1000, POLL_INTERVAL_MS / 3); // At least 1 second
        startPolling();
      }
    };

    // Check status periodically
    const statusCheckInterval = setInterval(checkRealtimeStatus, 10000); // Check every 10 seconds

    return () => {
      isDestroyed = true;
      if (pollInterval) clearInterval(pollInterval);
      clearInterval(statusCheckInterval);
    };
  }, [jobId, processJobUpdate]);

  /* ---------------------------------------------------------------- */
  /*  Timers                                                           */
  /* ---------------------------------------------------------------- */
  useEffect(() => {
    if (status !== "on_the_way") return;
    const tick = setInterval(() => setEtaRemaining((n) => Math.max(0, n - 1)), 1000);
    return () => clearInterval(tick);
  }, [status]);

  useEffect(() => {
    if (status !== "on_the_way") { setJourneyProgress(0); return; }
    const totalTime = 20 * 60;
    const tick = setInterval(() => setJourneyProgress((p) => Math.min(1, p + 1 / totalTime)), 1000);
    return () => clearInterval(tick);
  }, [status]);

  useEffect(() => {
    if (status !== "waiting") return;
    const tick = setInterval(() => setElapsed((n) => n + 1), 1000);
    return () => clearInterval(tick);
  }, [status]);

  useEffect(() => {
    if (status === "on_the_way") {
      setProgress(Math.max(0, Math.min(100, ((20 - etaRemaining) / 20) * 100)));
    } else {
      setProgress(0);
    }
  }, [status, etaRemaining]);

  const isLate = elapsed >= WARN_AFTER_S && status === "waiting";

  /* ---------------------------------------------------------------- */
  /*  Sheet drag                                                       */
  /* ---------------------------------------------------------------- */
  const getBottomY = useCallback(() => {
    const vh = window.innerHeight;
    const bottomBarH =
      document.querySelector(`.${styles.stickyBottom}`) instanceof HTMLElement
        ? (document.querySelector(`.${styles.stickyBottom}`) as HTMLElement).offsetHeight
        : 160;
    return vh - 44 - (peekZoneRef.current?.offsetHeight ?? 120) - bottomBarH;
  }, []);

  useEffect(() => {
    const init = () => {
      const y = getBottomY();
      currentTop.current = y;
      if (sheetRef.current) {
        sheetRef.current.style.transition = "none";
        sheetRef.current.style.top = `${y}px`;
      }
    };
    const id = requestAnimationFrame(init);
    window.addEventListener("resize", init);
    return () => { cancelAnimationFrame(id); window.removeEventListener("resize", init); };
  }, [getBottomY]);

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
    const target = Math.max(0, startTop.current + (e.clientY - startY.current));
    if (rafId.current) cancelAnimationFrame(rafId.current);
    rafId.current = requestAnimationFrame(() => {
      if (!sheetRef.current) return;
      sheetRef.current.style.top = `${target}px`;
      currentTop.current = target;
      const r = Math.min(24, (target / window.innerHeight) * 80);
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
      if (sheetRef.current) { sheetRef.current.style.top = "0px"; sheetRef.current.style.borderRadius = "0"; }
    } else if (y >= vh - SNAP_BOTTOM_THRESHOLD) {
      const bottom = getBottomY();
      currentTop.current = bottom;
      if (sheetRef.current) { sheetRef.current.style.top = `${bottom}px`; sheetRef.current.style.borderRadius = "24px 24px 0 0"; }
    } else {
      const r = Math.min(24, (y / vh) * 80);
      if (sheetRef.current) sheetRef.current.style.borderRadius = `${r}px ${r}px 0 0`;
    }
  }, [getBottomY]);

  /* ---------------------------------------------------------------- */
  /*  Derived locations                                                */
  /* ---------------------------------------------------------------- */
  const customerLocation = useMemo(() => {
    if (customer?.location_lat && customer?.location_lng)
      return { lat: customer.location_lat, lon: customer.location_lng };
    return job?.location_lat && job?.location_lng
      ? { lat: job.location_lat, lon: job.location_lng }
      : null;
  }, [customer?.location_lat, customer?.location_lng, job?.location_lat, job?.location_lng]);

  const specialistLocation = useMemo(() => {
    if (!customerLocation || !specialist) return null;
    if (typeof specialist.location_lat === "number" && typeof specialist.location_lng === "number")
      return { lat: specialist.location_lat, lon: specialist.location_lng };
    return { lat: customerLocation.lat + 0.045, lon: customerLocation.lon + 0.045 };
  }, [customerLocation, specialist]);

  useEffect(() => {
    if (status !== "on_the_way" || !customerLocation || !specialistLocation) { setRouteCoordinates(null); return; }
    const fetchRoute = async () => {
      try {
        const res = await fetch(
          `https://router.project-osrm.org/route/v1/driving/${specialistLocation.lon},${specialistLocation.lat};${customerLocation.lon},${customerLocation.lat}?overview=full&geometries=geojson`
        );
        const data = await res.json();
        if (data.routes?.[0]) {
          setRouteCoordinates(data.routes[0].geometry.coordinates.map(([lng, lat]: [number, number]) => [lat, lng] as [number, number]));
        } else {
          setRouteCoordinates([[specialistLocation.lat, specialistLocation.lon], [customerLocation.lat, customerLocation.lon]]);
        }
      } catch {
        setRouteCoordinates([[specialistLocation.lat, specialistLocation.lon], [customerLocation.lat, customerLocation.lon]]);
      }
    };
    fetchRoute();
  }, [status, customerLocation, specialistLocation]);

  const displayReviews: Review[] = reviews.length > 0 ? reviews : [
    { id: "1", name: "Kazel Arwen Jane Tuazon", avatar: "https://i.pravatar.cc/80?img=5", rating: 3.5, text: "I thought we lost our electricity. Turns out my cat chewed on the wires. Thank you for the fast repair!! 🙏", images: ["https://images.unsplash.com/photo-1558618666-fcd25c85cd64?w=400&q=80", "https://images.unsplash.com/photo-1565193566173-7a0ee3dbe261?w=400&q=80"] },
    { id: "2", name: "Mark Santos", avatar: "https://i.pravatar.cc/80?img=12", rating: 5, text: "Very professional and on time. Fixed our panel box in under an hour. Highly recommend!" },
  ];

  /* ---------------------------------------------------------------- */
  if (loading) {
    return (
      <div className={styles.page}>
        <div className={styles.mapLayer}><div className={styles.mapLoading}>Loading job details...</div></div>
      </div>
    );
  }

  if (error || !job) {
    return (
      <div className={styles.page}>
        <div className={styles.errorState}>
          <h2>Job not found</h2>
          <p>{error || "The job you're looking for doesn't exist."}</p>
          <button className={styles.homeBtn} onClick={() => router.push("/")}>Go Home</button>
        </div>
      </div>
    );
  }

  /* ================================================================ */
  return (
    <div className={styles.page}>
      {/* Map */}
      <div className={styles.mapLayer}>
        <TrackingMap
          customerLocation={customerLocation}
          specialistLocation={specialistLocation}
          status={status}
          routeCoordinates={routeCoordinates}
          journeyProgress={journeyProgress}
        />
        <button className={styles.backButton} onClick={() => router.back()} aria-label="Go back">
          <ArrowLeft size={20} strokeWidth={2} />
        </button>
        <button
          className={styles.refreshButton}
          onClick={async () => {
            try {
              const res = await fetch(`/api/jobs/${jobId}`);
              if (res.ok) {
                const data = await res.json();
                if (data.job) {
                  await processJobUpdate(data.job);
                }
              }
            } catch (err) {
              console.warn("Manual refresh failed:", err);
            }
          }}
          aria-label="Refresh status"
        >
          ⟳
        </button>
        <div className={`${styles.realtimeIndicator} ${styles[`realtime${realtimeStatus}`]}`} title={`Real-time: ${realtimeStatus}`}>
          <div className={styles.realtimeDot} />
        </div>
      </div>

      {/* Sheet */}
      <div ref={sheetRef} className={styles.sheet} aria-label="Specialist profile">
        <div
          className={styles.handleArea}
          onPointerDown={onHandlePointerDown}
          onPointerMove={onHandlePointerMove}
          onPointerUp={onHandlePointerUp}
          onPointerCancel={onHandlePointerUp}
        >
          <div className={styles.handle} aria-hidden />
        </div>

        <div ref={peekZoneRef} className={styles.peekZone}>
          {specialist ? (
            <div className={styles.identityRow}>
              <div className={styles.identityAvatar}>
                <img src={specialist.avatar_url || "/default-avatar.png"} alt={specialist.full_name || "Specialist"} />
              </div>
              <div className={styles.identityInfo}>
                <div className={styles.identityTop}>
                  <h2 className={styles.workerName}>{job.profession || "Specialist"}</h2>
                  <span className={styles.workerRate}>₱{specialist.rate?.toLocaleString() || "500"}</span>
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

        {specialist ? (
          <div className={styles.profileScroll}>
            <div className={styles.profileDivider} />
            <div className={styles.section}>
              <div className={styles.locationRow}>
                <Navigation size={15} strokeWidth={2} className={styles.locationIcon} />
                <span className={styles.locationDistance}>~5 km</span>
                <span className={styles.locationSep}>·</span>
                <span className={styles.locationArea}>{job.province || "Cavite"}</span>
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
            <div className={styles.section}>
              <div className={styles.paymentTitleRow}>
                <h3 className={styles.sectionTitle}>Payment method</h3>
                <div className={styles.lockedBadge}><Lock size={11} strokeWidth={2.5} /><span>Locked</span></div>
              </div>
              <div className={styles.paymentRowLocked}>
                <span className={styles.paymentBadge} style={{ background: "#22C55E" }}>COD</span>
                <span className={styles.paymentLabel}>Cash once done</span>
                <span className={styles.paymentRadioFilled} />
              </div>
              <p className={styles.paymentLockedNote}>Payment method cannot be changed while the worker is on the way.</p>
            </div>
            <div className={styles.profileDivider} />
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
                            <Star key={star} size={12} strokeWidth={2} className={star <= r.rating ? styles.starFilled : styles.starEmpty} fill={star <= r.rating ? "#FBBF24" : "none"} />
                          ))}
                        </div>
                      </div>
                    </div>
                    <p className={styles.reviewText}>{r.text}</p>
                    {r.images && r.images.length > 0 && (
                      <div className={styles.reviewImages}>
                        {r.images.map((img, i) => <img key={i} src={img} alt="Review" className={styles.reviewImage} />)}
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
            <p style={{ fontSize: "16px", color: "#666", marginBottom: "16px" }}>Waiting for a specialist to accept your job...</p>
            <p style={{ fontSize: "13px", color: "#999", marginBottom: "20px" }}>We&apos;re finding the best match for your {job?.profession || "job"} in your area.</p>
          </div>
        )}
      </div>

      {/* Sticky bottom */}
      <div className={styles.stickyBottom}>
        <div className={styles.stickyTopRow}>
          <div className={styles.statusBlock}>
            {status === "waiting" && <span className={styles.statusLabel}>Waiting for response</span>}
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

        <ProgressBar status={status} progress={progress} />

        <p className={`${styles.statusNote} ${isLate ? styles.statusNoteLate : ""}`}>
          {status === "waiting" && !isLate && "Looking for your specialist to confirm and head your way…"}
          {status === "waiting" && isLate && "Your specialist hasn't responded yet. They usually reply within 10 s."}
          {status === "on_the_way" && (etaRemaining > 1 ? `Your specialist is on the way — ${etaRemaining} min away.` : "Your specialist is almost there!")}
          {status === "arrived" && "Your specialist has arrived and is getting ready to start work."}
          {status === "no_response" && "The worker didn't respond in time."}
        </p>

        {status === "no_response" && (
          <div className={styles.noResponseActions}>
            <button className={styles.findWorkerBtn} onClick={() => router.push("/")}><Search size={15} strokeWidth={2} /> Find a worker</button>
            <button className={styles.cancelBtn} onClick={() => router.push("/")}><X size={15} strokeWidth={2} /> Cancel job</button>
          </div>
        )}

        <div className={styles.chatRow}>
          <input type="text" className={styles.chatInput} placeholder="Chat with the worker" aria-label="Chat with the worker" />
          <button className={styles.callBtn} aria-label="Call worker"><Phone size={18} strokeWidth={2} /></button>
        </div>
      </div>
    </div>
  );
}