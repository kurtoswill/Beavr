"use client";

import { useState, useEffect, Suspense } from "react";
import dynamic from "next/dynamic";
import { useRouter } from "next/navigation";
import { ArrowRight, Check, ArrowLeft } from "lucide-react";
import { createClient } from "@supabase/supabase-js";
import styles from "../page.module.css";

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL!;
const supabaseKey = process.env.NEXT_PUBLIC_SUPABASE_PUBLISHABLE_DEFAULT_KEY!;
const supabase = createClient(supabaseUrl, supabaseKey);

interface PSGCItem {
  code: string;
  name: string;
}

const REGION_DEFAULT = "CALABARZON (Region IV-A)";
const REGION_CODE_DEFAULT = "040000000";

const LeafletPinMap = dynamic(
  () => import("../../onboard/LeafletMap").then((mod) => mod.LeafletPinMap),
  { ssr: false },
);

function LocationForm() {
  const router = useRouter();

  const [regions, setRegions] = useState<PSGCItem[]>([]);
  const [provinces, setProvinces] = useState<PSGCItem[]>([]);
  const [municipalities, setMunicipalities] = useState<PSGCItem[]>([]);
  const [barangays, setBarangays] = useState<PSGCItem[]>([]);

  const [mapCoords, setMapCoords] = useState<{ lat: number; lon: number }>({
    lat: 14.2819,
    lon: 120.9106,
  });

  const [form, setForm] = useState({
    region: REGION_DEFAULT,
    regionCode: REGION_CODE_DEFAULT,
    province: "",
    provinceCode: "",
    city: "",
    cityCode: "",
    barangay: "",
    barangayCode: "",
    street: "",
    landmarks: "",
    latitude: "",
    longitude: "",
  });

  const [errors, setErrors] = useState<Record<string, string>>({});
  const [loading, setLoading] = useState(false);
  const [done, setDone] = useState(false);
  const [gettingLocation, setGettingLocation] = useState(false);

  const fetchPSGCResource = async (
    level: string,
    code?: string,
  ): Promise<PSGCItem[]> => {
    const params = new URLSearchParams({ level });
    if (code) params.set("code", code);

    try {
      const res = await fetch(`/api/psgc?${params.toString()}`);
      if (!res.ok) {
        console.error(`PSGC API error (${level}):`, res.status, await res.text());
        return [];
      }
      const data = await res.json();
      const list = Array.isArray(data)
        ? data
        : Array.isArray(data?.value)
          ? data.value
          : [];
      return list.map((item: { code: string; name: string }) => ({
        code: item.code,
        name: item.name,
      }));
    } catch (err) {
      console.error(`Failed to fetch ${level}:`, err);
      return [];
    }
  };

  useEffect(() => {
    (async () => {
      const list = await fetchPSGCResource("regions");
      setRegions(list);
    })();
  }, []);

  useEffect(() => {
    if (!form.regionCode) return;

    (async () => {
      const list = await fetchPSGCResource("provinces", form.regionCode);
      setProvinces(list);
      setMunicipalities([]);
      setBarangays([]);
    })();
  }, [form.regionCode]);

  useEffect(() => {
    if (!form.provinceCode) return;

    (async () => {
      const list = await fetchPSGCResource(
        "cities-municipalities",
        form.provinceCode,
      );
      setMunicipalities(list);
      setBarangays([]);
    })();
  }, [form.provinceCode]);

  useEffect(() => {
    if (!form.cityCode) return;

    (async () => {
      const list = await fetchPSGCResource("barangays", form.cityCode);
      setBarangays(list);
    })();
  }, [form.cityCode]);

  const set = (k: keyof typeof form, v: string) => {
    setForm((f) => ({ ...f, [k]: v }));
    setErrors((e) => {
      const n = { ...e };
      delete n[k];
      return n;
    });
  };

  const validate = (): boolean => {
    const e: Record<string, string> = {};
    if (!form.regionCode) e.region = "Please select your region";
    if (!form.provinceCode) e.province = "Please select your province";
    if (!form.cityCode) e.city = "Please select your municipality/city";
    if (!form.barangayCode) e.barangay = "Please select your barangay";
    if (!form.street.trim()) e.street = "Please enter your street address";
    setErrors(e);
    return Object.keys(e).length === 0;
  };

  const handleSubmit = async () => {
    if (!validate()) return;

    const pending = window.sessionStorage.getItem("beavr_signup_data");
    if (!pending) {
      setErrors({ general: "Signup session lost. Please start again." });
      return;
    }

    let pendingUser: { email: string; password: string; full_name: string; role?: string };
    try {
      pendingUser = JSON.parse(pending);
    } catch (parseError) {
      console.error("Failed to parse signup data:", parseError);
      setErrors({ general: "Invalid signup data. Please start again." });
      return;
    }

    if (!pendingUser || !pendingUser.email || !pendingUser.password) {
      setErrors({ general: "Incomplete signup data. Please start again." });
      return;
    }

    setLoading(true);

    try {
      // STEP 1: Create auth user with the stored credentials
      const { data: authData, error: authError } = await supabase.auth.signUp({
        email: pendingUser.email,
        password: pendingUser.password,
        options: {
          data: {
            full_name: pendingUser.full_name,
            role: pendingUser.role || "customer",
          },
        },
      });

      if (authError) {
        // Check if error is "User already registered" - user might have signed up before
        if (authError.message?.includes("already")) {
          // Try to sign in instead
          const signInResult = await supabase.auth.signInWithPassword({
            email: pendingUser.email,
            password: pendingUser.password,
          });

          if (signInResult.error) {
            setErrors({ general: signInResult.error.message });
            setLoading(false);
            return;
          }

          // User already exists, just update profile with location
          const { error: updateError } = await supabase.from("profiles").upsert(
            {
              id: signInResult.data.user.id,
              email: pendingUser.email,
              full_name: pendingUser.full_name,
              role: pendingUser.role || "customer",
              province: form.province,
              municipality: form.city,
              barangay: form.barangay,
              street_address: form.street,
              landmarks: form.landmarks,
              latitude: form.latitude ? parseFloat(form.latitude) : null,
              longitude: form.longitude ? parseFloat(form.longitude) : null,
              updated_at: new Date().toISOString(),
            },
            { onConflict: "id" },
          );

          if (updateError) {
            setErrors({ general: updateError.message });
            setLoading(false);
            return;
          }

          window.sessionStorage.removeItem("beavr_signup_data");
          setDone(true);
          await new Promise((r) => setTimeout(r, 700));
          router.push("/");
          return;
        }

        setErrors({ general: authError.message });
        setLoading(false);
        return;
      }

      if (!authData.user) {
        setErrors({ general: "Failed to create user" });
        setLoading(false);
        return;
      }

      // STEP 2: Insert profile with location data
      const { error: profileError } = await supabase.from("profiles").insert({
        id: authData.user.id,
        email: pendingUser.email,
        full_name: pendingUser.full_name,
        role: pendingUser.role || "customer",
        province: form.province || null,
        municipality: form.city || null,
        barangay: form.barangay || null,
        street_address: form.street || null,
        landmarks: form.landmarks || null,
        latitude: form.latitude ? parseFloat(form.latitude) : null,
        longitude: form.longitude ? parseFloat(form.longitude) : null,
      });

      if (profileError) {
        console.error("Profile creation error:", profileError);
        console.error("Profile error code:", profileError.code);
        console.error("Profile error details:", profileError.details);
        console.error("Profile error hint:", profileError.hint);
        setErrors({
          general: profileError.message || "Failed to create profile",
        });
        setLoading(false);
        return;
      }

      // STEP 3: Sign in the user
      const { data: signInData, error: signInError } =
        await supabase.auth.signInWithPassword({
          email: pendingUser.email,
          password: pendingUser.password,
        });

      if (signInError) {
        console.error("Sign-in error:", signInError);
        setErrors({ general: `Login failed: ${signInError.message}` });
        setLoading(false);
        return;
      }

      window.sessionStorage.removeItem("beavr_signup_data");
      setDone(true);
      await new Promise((r) => setTimeout(r, 700));

      // Redirect based on user role
      const userRole = signInData.user.user_metadata?.role || "customer";
      const destination =
        userRole === "specialist" ? "/specialist/dashboard" : "/";
      router.push(destination);
    } catch (err) {
      setLoading(false);
      const message = err instanceof Error ? err.message : "Signup failed";
      console.error("Signup exception:", err);
      setErrors({ general: `Signup failed: ${message}` });
    }
  };

  const onRegionSelect = (code: string, name: string) => {
    set("region", name);
    set("regionCode", code);
    set("province", "");
    set("provinceCode", "");
    set("city", "");
    set("cityCode", "");
    set("barangay", "");
    set("barangayCode", "");
    setProvinces([]);
    setMunicipalities([]);
    setBarangays([]);
  };

  const onProvinceSelect = (code: string, name: string) => {
    set("province", name);
    set("provinceCode", code);
    set("city", "");
    set("cityCode", "");
    set("barangay", "");
    set("barangayCode", "");
    setMunicipalities([]);
    setBarangays([]);
  };

  const onCitySelect = (code: string, name: string) => {
    set("city", name);
    set("cityCode", code);
    set("barangay", "");
    set("barangayCode", "");
    setBarangays([]);
  };

  const onBarangaySelect = (code: string, name: string) => {
    set("barangay", name);
    set("barangayCode", code);
  };

  const onCoordsChange = (lat: number, lon: number) => {
    setMapCoords({ lat, lon });
    setForm((f) => ({
      ...f,
      latitude: lat.toString(),
      longitude: lon.toString(),
    }));
  };

  const getUserLocation = () => {
    if (!navigator.geolocation) {
      setErrors({ general: "Geolocation is not supported by your browser" });
      return;
    }

    setGettingLocation(true);
    navigator.geolocation.getCurrentPosition(
      async (position) => {
        const lat = position.coords.latitude;
        const lon = position.coords.longitude;
        setMapCoords({ lat, lon });
        setForm((f) => ({
          ...f,
          latitude: lat.toString(),
          longitude: lon.toString(),
        }));

        // Reverse geocode to get address
        try {
          const res = await fetch(
            `https://nominatim.openstreetmap.org/reverse?format=json&lat=${lat}&lon=${lon}`,
            { headers: { "Accept-Language": "en" } },
          );
          const data = await res.json();
          const addr = data.address || {};

          // Try to match PSGC items if we get location data
          if (addr.province) {
            const prov = provinces.find((p) =>
              p.name.toLowerCase().includes(addr.province.toLowerCase()),
            );
            if (prov) {
              set("province", prov.name);
              set("provinceCode", prov.code);
            }
          }
          if (addr.city || addr.town || addr.municipality) {
            const cityName = (addr.city || addr.town || addr.municipality || "").toLowerCase();
            const mun = municipalities.find((m) =>
              m.name.toLowerCase().includes(cityName),
            );
            if (mun) {
              set("city", mun.name);
              set("cityCode", mun.code);
            }
          }
          if (addr.barangay) {
            const brgy = barangays.find((b) =>
              b.name.toLowerCase().includes(addr.barangay.toLowerCase()),
            );
            if (brgy) {
              set("barangay", brgy.name);
              set("barangayCode", brgy.code);
            }
          }
        } catch (err) {
          console.warn("Reverse geocoding failed:", err);
        }

        setGettingLocation(false);
      },
      (error) => {
        console.error("Geolocation error:", error);
        setGettingLocation(false);
        setErrors({ general: "Unable to get your location. Please enter manually." });
      },
      { enableHighAccuracy: true, timeout: 10000, maximumAge: 300000 },
    );
  };

  const address = [
    form.street,
    form.barangay,
    form.city,
    form.province,
    form.region,
  ]
    .filter(Boolean)
    .join(", ");

  useEffect(() => {
    if (!address) {
      return;
    }

    const controller = new AbortController();
    const url = `https://nominatim.openstreetmap.org/search?format=json&q=${encodeURIComponent(address)}&limit=1`;

    fetch(url, {
      signal: controller.signal,
      headers: { "Accept-Language": "en" },
    })
      .then((res) => {
        if (!res.ok) {
          console.warn("Geocoding failed:", res.status);
          return null;
        }
        return res.json();
      })
      .then((items) => {
        if (!items) return;
        if (Array.isArray(items) && items.length > 0) {
          const item = items[0];
          const lat = Number(item.lat);
          const lon = Number(item.lon);
          if (!Number.isNaN(lat) && !Number.isNaN(lon)) {
            setMapCoords({ lat, lon });
            setForm((f) => ({
              ...f,
              latitude: lat.toString(),
              longitude: lon.toString(),
            }));
          }
        }
      })
      .catch((err) => {
        if (err.name !== "AbortError") {
          console.warn("Geocoding error:", err);
        }
      });

    return () => controller.abort();
  }, [address]);

  return (
    <div className={styles.page}>
      <div className={styles.glow1} aria-hidden />
      <div className={styles.glow2} aria-hidden />

      <button
        className={styles.backBtn}
        onClick={() => router.back()}
        aria-label="Go back"
      >
        <ArrowLeft size={20} strokeWidth={2} />
      </button>

      <div className={styles.card}>
        <div className={styles.logo}>
          <div className={styles.logoMark}>⚡</div>
          <span className={styles.logoText}>Beavr</span>
        </div>

        <div className={styles.headline}>
          <h1 className={styles.title}>Set your location</h1>
          <p className={styles.subtitle}>Help us find specialists near you.</p>
        </div>

        <div className={styles.form}>
          {/* Region — default to CALABARZON */}
          <div className={styles.field}>
            <label className={styles.label} htmlFor="region">
              Region
            </label>
            <select
              id="region"
              className={`${styles.input} ${errors.region ? styles.inputError : ""}`}
              value={form.regionCode}
              onChange={(e) => {
                const selected = regions.find((r) => r.code === e.target.value);
                if (selected) onRegionSelect(selected.code, selected.name);
              }}
            >
              <option value="">Select region</option>
              {regions.map((r) => (
                <option key={r.code} value={r.code}>
                  {r.name}
                </option>
              ))}
            </select>
            {errors.region && (
              <span className={styles.errMsg}>{errors.region}</span>
            )}
          </div>

          {/* Province */}
          <div className={styles.field}>
            <label className={styles.label} htmlFor="province">
              Province
            </label>
            <select
              id="province"
              className={`${styles.input} ${errors.province ? styles.inputError : ""}`}
              value={form.provinceCode}
              onChange={(e) => {
                const selected = provinces.find(
                  (p) => p.code === e.target.value,
                );
                if (selected) onProvinceSelect(selected.code, selected.name);
              }}
              disabled={!form.regionCode}
            >
              <option value="">Select province</option>
              {provinces.map((p) => (
                <option key={p.code} value={p.code}>
                  {p.name}
                </option>
              ))}
            </select>
            {errors.province && (
              <span className={styles.errMsg}>{errors.province}</span>
            )}
          </div>

          {/* Municipality/City */}
          <div className={styles.field}>
            <label className={styles.label} htmlFor="city">
              Municipality/City
            </label>
            <select
              id="city"
              className={`${styles.input} ${errors.city ? styles.inputError : ""}`}
              value={form.cityCode}
              onChange={(e) => {
                const selected = municipalities.find(
                  (m) => m.code === e.target.value,
                );
                if (selected) onCitySelect(selected.code, selected.name);
              }}
              disabled={!form.provinceCode}
            >
              <option value="">Select municipality/city</option>
              {municipalities.map((m) => (
                <option key={m.code} value={m.code}>
                  {m.name}
                </option>
              ))}
            </select>
            {errors.city && (
              <span className={styles.errMsg}>{errors.city}</span>
            )}
          </div>

          {/* Barangay */}
          <div className={styles.field}>
            <label className={styles.label} htmlFor="barangay">
              Barangay
            </label>
            <select
              id="barangay"
              className={`${styles.input} ${errors.barangay ? styles.inputError : ""}`}
              value={form.barangayCode}
              onChange={(e) => {
                const selected = barangays.find(
                  (b) => b.code === e.target.value,
                );
                if (selected) onBarangaySelect(selected.code, selected.name);
              }}
              disabled={!form.cityCode}
            >
              <option value="">Select barangay</option>
              {barangays.map((b) => (
                <option key={b.code} value={b.code}>
                  {b.name}
                </option>
              ))}
            </select>
            {errors.barangay && (
              <span className={styles.errMsg}>{errors.barangay}</span>
            )}
          </div>

          {/* Street Address */}
          <div className={styles.field}>
            <label className={styles.label} htmlFor="street">
              Street Address
            </label>
            <input
              id="street"
              type="text"
              className={`${styles.input} ${errors.street ? styles.inputError : ""}`}
              placeholder="e.g. 123 Main St, Brgy. Example"
              value={form.street}
              onChange={(e) => set("street", e.target.value)}
            />
            {errors.street && (
              <span className={styles.errMsg}>{errors.street}</span>
            )}
          </div>

          {/* Landmarks */}
          <div className={styles.field}>
            <label className={styles.label} htmlFor="landmarks">
              Landmarks (optional)
            </label>
            <input
              id="landmarks"
              type="text"
              className={styles.input}
              placeholder="e.g. Near the church"
              value={form.landmarks}
              onChange={(e) => set("landmarks", e.target.value)}
            />
          </div>

          {/* Map location */}
          <div className={styles.field}>
            <label className={styles.label}>Pin Location</label>
            <div style={{ display: "flex", gap: 8, marginBottom: 8 }}>
              <button
                type="button"
                className={styles.locationBtn}
                onClick={getUserLocation}
                disabled={gettingLocation}
                style={{
                  padding: "8px 12px",
                  fontSize: 13,
                  background: gettingLocation ? "#ccc" : "#007AFF",
                  color: "white",
                  border: "none",
                  borderRadius: 6,
                  cursor: gettingLocation ? "not-allowed" : "pointer",
                }}
              >
                {gettingLocation ? "Getting location..." : "Use my current location"}
              </button>
            </div>
            <div style={{ minHeight: 240 }}>
              <LeafletPinMap
                current={mapCoords}
                onCoordsChange={onCoordsChange}
              />
            </div>
          </div>

          {errors.general && (
            <span className={styles.errMsg}>{errors.general}</span>
          )}

          {/* Submit */}
          <button
            className={`${styles.submitBtn} ${done ? styles.submitDone : ""}`}
            onClick={handleSubmit}
            disabled={loading || done}
            aria-busy={loading}
          >
            {done ? (
              <>
                <Check size={18} strokeWidth={2.5} /> Location set!
              </>
            ) : loading ? (
              <span className={styles.spinner} />
            ) : (
              <>
                Set location <ArrowRight size={16} strokeWidth={2.5} />
              </>
            )}
          </button>
        </div>
      </div>
    </div>
  );
}

export default function LocationPage() {
  return (
    <Suspense fallback={<div>Loading...</div>}>
      <LocationForm />
    </Suspense>
  );
}
