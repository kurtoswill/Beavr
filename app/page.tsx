"use client";
import { useState, useRef, useEffect } from "react";
import { useRouter } from "next/navigation";
import { supabase } from "@/lib/supabase";
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
  LogOut,
  User,
} from "lucide-react";
import type { LucideIcon } from "lucide-react";
import ServiceChip from "@/components/ServiceChip/ServiceChip";
import ProfilePictureModal from "@/components/ProfilePictureModal/ProfilePictureModal";
import styles from "./page.module.css";

/* ------------------------------------------------------------------ */
/*  Supabase — imported from shared singleton @ lib/supabase.ts        */
/* ------------------------------------------------------------------ */

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
  file: File;
}

interface Location {
  latitude: number;
  longitude: number;
  address: string;
}

/* ================================================================== */
/*  Page                                                                */
/* ================================================================== */
export default function LandingPage() {
  const router = useRouter();
  const [isLoggedIn, setIsLoggedIn] = useState(false);
  const [userName, setUserName] = useState<string | null>(null);
  const [userAvatar, setUserAvatar] = useState<string>("https://i.pravatar.cc/80?img=5");
  const [isLoadingAuth, setIsLoadingAuth] = useState(true);

  // Profile picture modal state
  const [isProfileModalOpen, setIsProfileModalOpen] = useState(false);
  
  const [query, setQuery] = useState("");
  const [description, setDescription] = useState("");
  const [files, setFiles] = useState<UploadedFile[]>([]);
  const [dragging, setDragging] = useState(false);
  const [errors, setErrors] = useState<{
    query?: string;
    description?: string;
  }>({});
  const [isLoading, setIsLoading] = useState(false);
  const fileInputRef = useRef<HTMLInputElement>(null);

  // Location state
  const [location, setLocation] = useState<Location | null>(null);
  const [isLocating, setIsLocating] = useState(true);
  const [locationError, setLocationError] = useState<string | null>(null);

  // ── NEW: track the job the customer just posted so we can listen to it ──
  const [pendingJobId, setPendingJobId] = useState<string | null>(null);

  // Load cached location on mount
  useEffect(() => {
    const cached = localStorage.getItem("beavr_location");
    if (cached) {
      try {
        const parsed = JSON.parse(cached);
        setLocation(parsed);
        setIsLocating(false);
      } catch (e) {
        console.warn("Failed to parse cached location:", e);
      }
    }
  }, []);

  // Check auth status on mount + look up any active pending job
  useEffect(() => {
    const checkAuth = async () => {
      try {
        const { data: { user } } = await supabase.auth.getUser();

        if (user) {
          setIsLoggedIn(true);
          // Get user's name and avatar from profile
          const { data: profile, error: profileError } = await supabase
            .from("profiles")
            .select("full_name, avatar_url")
            .eq("id", user.id)
            .single();

          if (profileError) {
            console.warn("Could not fetch profile:", profileError);
          }

          setUserName(profile?.full_name || user.email?.split("@")[0] || "User");
          setUserAvatar(profile?.avatar_url || "https://i.pravatar.cc/80?img=5");
        } else {
          setIsLoggedIn(false);
        }
      } catch (error) {
        console.error("Auth check error:", error);
        setIsLoggedIn(false);
      } finally {
        setIsLoadingAuth(false);
      }
    };

    checkAuth();
  }, [router]);

  // Auto-detect location on mount
  useEffect(() => {
    const cached = localStorage.getItem("beavr_location");
    if (cached) {
      try {
        const parsed = JSON.parse(cached);
        if (parsed && parsed.latitude && parsed.longitude) {
          setIsLocating(false);
          return;
        }
      } catch (e) {
        // Ignore parse errors, proceed with geolocation
      }
    }

    if (!navigator.geolocation) {
      setLocationError("Geolocation is not supported by your browser");
      setIsLocating(false);
      return;
    }

    const controller = new AbortController();

    navigator.geolocation.getCurrentPosition(
      async (position) => {
        const { latitude, longitude } = position.coords;
        try {
          const response = await fetch(
            `https://nominatim.openstreetmap.org/reverse?format=json&lat=${latitude}&lon=${longitude}`,
            { headers: { "Accept-Language": "en" }, signal: controller.signal },
          );
          if (!response.ok) throw new Error(`HTTP ${response.status}`);

          const data = await response.json();
          const locationData = {
            latitude,
            longitude,
            address:
              data.address?.barangay ||
              data.address?.suburb ||
              data.address?.city ||
              "Your location",
            province: data.address?.state || data.address?.province || "Cavite",
            city: data.address?.city || data.address?.municipality || "",
            barangay: data.address?.barangay || "",
          };
          setLocation(locationData);
          localStorage.setItem("beavr_location", JSON.stringify(locationData));
        } catch (error) {
          if (error instanceof Error && error.name === "AbortError") return;
          console.error("Reverse geocoding error:", error);
          const locationData = {
            latitude,
            longitude,
            address: "Current location",
            province: "",
            city: "",
            barangay: "",
          };
          setLocation(locationData);
          localStorage.setItem("beavr_location", JSON.stringify(locationData));
        }
        setIsLocating(false);
      },
      (error) => {
        let message = "Unable to get your location";
        if (error.code === 1) message = "Location permission denied. Please allow location access in your browser settings.";
        else if (error.code === 2) message = "Location unavailable. Please check your device settings.";
        else if (error.code === 3) message = "Location request timed out. Please try again.";
        setLocationError(message);
        console.error("Geolocation error:", error);
        setIsLocating(false);
      },
      { enableHighAccuracy: true, timeout: 10000, maximumAge: 300000 },
    );

    return () => controller.abort();
  }, []);

  // ── Realtime listener — sets auth token to keep connection alive ───────────
  useEffect(() => {
    if (!pendingJobId) return;

    let channel: ReturnType<typeof supabase.channel> | null = null;
    let isDestroyed = false;

    const subscribe = async () => {
      if (isDestroyed) return;

      try {
        const { data: { session } } = await supabase.auth.getSession();
        if (session?.access_token) {
          await supabase.realtime.setAuth(session.access_token);
        }
      } catch (err) {
        console.warn("[Realtime] Could not set auth token:", err);
      }

      channel = supabase
        .channel(`landing-job-${pendingJobId}`)
        .on(
          "postgres_changes",
          {
            event: "UPDATE",
            schema: "public",
            table: "jobs",
            filter: `id=eq.${pendingJobId}`,
          },
          (payload) => {
            const updated = payload.new as { id: string; status: string };
            console.log("[Realtime] Job status on landing:", updated.status);

            if (
              updated.status === "bid_accepted" ||
              updated.status === "on_the_way" ||
              updated.status === "working"
            ) {
              router.push(`/tracking/${pendingJobId}`);
            }
          }
        )
        .subscribe((subStatus) => {
          console.log("[Realtime] Landing subscription status:", subStatus);
        });
    };

    subscribe();

    return () => {
      isDestroyed = true;
      if (channel) supabase.removeChannel(channel);
    };
  }, [pendingJobId, router]);
  // ────────────────────────────────────────────────────────────────────────────

  const handleFindSpecialist = () => {
    if (!isLoggedIn) {
      router.push("/auth");
      return;
    }

    const newErrors: { query?: string; description?: string } = {};
    if (!query.trim()) newErrors.query = "Please tell us what you need.";
    if (!description.trim()) newErrors.description = "Please describe the problem.";

    if (Object.keys(newErrors).length) {
      setErrors(newErrors);
      return;
    }

    setErrors({});
    setIsLoading(true);

    supabase.auth.getUser().then(({ data: { user } }) => {
      if (!user) {
        alert("Please sign in to create a job");
        router.push("/auth");
        return;
      }

      Promise.all(files.map((f) => uploadImage(f.file)))
        .then((imageUrls) => createJob(imageUrls, user.id))
        .then((jobId) => {
          // ── CHANGED: set pendingJobId to start the realtime listener,
          //             then redirect to the tracking page as before ──
          setPendingJobId(jobId);
          router.push(`/tracking/${jobId}`);
        })
        .catch((error) => {
          console.error("Error creating job:", error);
          alert("Failed to create job. Please try again.");
        })
        .finally(() => {
          setIsLoading(false);
        });
    });
  };

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
    if (!response.ok) throw new Error(data.error || "Failed to upload image");
    return data.url;
  };

  /* ---- Create job via API ---- */
  const createJob = async (imageUrls: string[], customerId: string): Promise<string> => {
    let customerProfile = null;
    try {
      const { data, error } = await supabase
        .from("profiles")
        .select("latitude, longitude")
        .eq("id", customerId)
        .single() as { data: { latitude: number; longitude: number } | null; error: unknown };

      if (!error && data) {
        customerProfile = data;
      } else {
        console.warn("Could not fetch profile location, using fallback:", error);
      }
    } catch (err) {
      console.warn("Error fetching profile location:", err);
    }

    const response = await fetch("/api/jobs", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        customer_id: customerId,
        profession: query || "General Handyman",
        description,
        street_address: location?.address || "Your location",
        province: "Cavite",
        municipality: "Indang",
        barangay: location?.address || "Your location",
        photos: imageUrls.length > 0 ? imageUrls : null,
        location_lat: customerProfile?.latitude,
        location_lng: customerProfile?.longitude,
      }),
    });

    const data = await response.json();
    if (!response.ok) throw new Error(data.error || "Failed to create job");
    return data.job.id;
  };

  /* ---- File helpers ---- */
  const addFiles = (incoming: FileList | null) => {
    if (!incoming) return;
    const next: UploadedFile[] = Array.from(incoming)
      .filter((f) => f.type.startsWith("image/") || f.type.startsWith("video/"))
      .map((f) => ({ name: f.name, preview: URL.createObjectURL(f), file: f }));
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

  /* ---- Sign out ---- */
  const handleSignOut = async () => {
    await supabase.auth.signOut();
    setIsLoggedIn(false);
    setUserName(null);
    setUserAvatar("https://i.pravatar.cc/80?img=5");
    router.refresh();
  };

  /* ---- Upload profile picture ---- */
  const handleUploadProfilePicture = async (file: File) => {
    const formData = new FormData();
    formData.append("file", file);
    formData.append("bucket", "avatars");

    // Step 1: Upload image to storage
    const uploadResponse = await fetch("/api/upload", {
      method: "POST",
      body: formData,
    });

    const uploadData = await uploadResponse.json();

    if (!uploadResponse.ok) {
      throw new Error(uploadData.error || "Failed to upload image");
    }

    const imageUrl = uploadData.url;

    // Step 2: Update profile with new avatar URL
    const { data: { session } } = await supabase.auth.getSession();
    const accessToken = session?.access_token;

    const profileResponse = await fetch("/api/profile/avatar", {
      method: "PATCH",
      headers: {
        "Content-Type": "application/json",
        Authorization: `Bearer ${accessToken}`,
      },
      body: JSON.stringify({ avatar_url: imageUrl }),
    });

    const profileData = await profileResponse.json();

    if (!profileResponse.ok) {
      throw new Error(profileData.error || "Failed to update profile");
    }

    // Update local state
    setUserAvatar(imageUrl);
  };

  /* ---- Request location ---- */
  const requestLocation = () => {
    if (!navigator.geolocation) {
      setLocationError("Geolocation is not supported by your browser");
      return;
    }

    setIsLocating(true);
    const controller = new AbortController();
    setLocationError(null);

    navigator.geolocation.getCurrentPosition(
      async (position) => {
        const { latitude, longitude } = position.coords;
        try {
          const response = await fetch(
            `https://nominatim.openstreetmap.org/reverse?format=json&lat=${latitude}&lon=${longitude}`,
            { headers: { "Accept-Language": "en" }, signal: controller.signal },
          );
          if (!response.ok) throw new Error(`HTTP ${response.status}`);
          const data = await response.json();
          const locationData = {
            latitude,
            longitude,
            address:
              data.address?.barangay ||
              data.address?.suburb ||
              data.address?.city ||
              "Your location",
            province: data.address?.state || data.address?.province || "Cavite",
            city: data.address?.city || data.address?.municipality || "",
            barangay: data.address?.barangay || "",
          };
          setLocation(locationData);
          localStorage.setItem("beavr_location", JSON.stringify(locationData));
        } catch (error) {
          if (error instanceof Error && error.name === "AbortError") return;
          console.error("Reverse geocoding error:", error);
          const locationData = {
            latitude,
            longitude,
            address: "Current location",
            province: "",
            city: "",
            barangay: "",
          };
          setLocation(locationData);
          localStorage.setItem("beavr_location", JSON.stringify(locationData));
        }
        setIsLocating(false);
      },
      (error) => {
        console.error("Geolocation error:", error);
        setLocationError("Unable to get your location");
        setIsLocating(false);
      },
      { enableHighAccuracy: true, timeout: 10000, maximumAge: 300000 },
    );

    return () => controller.abort();
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
          {isLoggedIn ? (
            <div style={{ display: "flex", alignItems: "center", gap: "0.75rem" }}>
              <button
                className={styles.profileAvatarBtn}
                onClick={() => setIsProfileModalOpen(true)}
                aria-label="Change profile picture"
              >
                <img
                  src={userAvatar}
                  alt={userName || "Profile"}
                  className={styles.profileAvatar}
                />
              </button>
              <span style={{ color: "#9ca3af", fontSize: "0.875rem" }}>
                Hi, {userName}
              </span>
              <button
                className={styles.signInBtn}
                onClick={handleSignOut}
                aria-label="Sign out"
              >
                <LogOut size={14} strokeWidth={2} />
              </button>
            </div>
          ) : (
            <button
              className={styles.signInBtn}
              onClick={() => router.push("/auth")}
              aria-label="Sign in"
            >
              Sign in
            </button>
          )}

          <button
            className={styles.locationPill}
            onClick={requestLocation}
            aria-label="Update location"
            disabled={isLocating}
          >
            <span className={styles.locationLabel}>Your location</span>
            <span className={styles.locationValue}>
              <MapPin size={14} strokeWidth={2.5} />
              {isLocating ? (
                <span className={styles.locationBlank}>Detecting...</span>
              ) : location ? (
                <span style={{ color: "#1f2937" }}>{location.address}</span>
              ) : locationError ? (
                <span className={styles.locationBlank} style={{ color: "#ef4444" }}>
                  {locationError}
                </span>
              ) : (
                <span className={styles.locationBlank}>Set your location</span>
              )}
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
              <CloudUpload size={32} strokeWidth={1.5} className={styles.uploadIcon} />
              <span className={styles.uploadLabel}>
                Upload photos or videos{" "}
                <span className={styles.optionalTag}>(optional)</span>
              </span>
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
                  <CloudUpload size={20} strokeWidth={1.5} />
                </div>
              )}
            </div>
          )}
        </div>

        {/* Primary CTA */}
        <button
          className={styles.ctaPrimary}
          onClick={isLoggedIn ? handleFindSpecialist : () => router.push("/auth")}
          disabled={isLoading}
        >
          {isLoading ? "Creating job..." : isLoggedIn ? "Find a specialist" : "Sign in to continue"}
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
          onClick={() => {
            if (!isLoggedIn) {
              router.push("/auth");
            } else {
              router.push("/onboard");
            }
          }}
        >
          {isLoggedIn ? "Become a specialist" : "Sign in to continue"}
        </button>
      </section>

      {/* Profile Picture Modal */}
      <ProfilePictureModal
        isOpen={isProfileModalOpen}
        onClose={() => setIsProfileModalOpen(false)}
        currentAvatar={userAvatar}
        onUpload={handleUploadProfilePicture}
        userName={userName || "user"}
      />
    </main>
  );
}