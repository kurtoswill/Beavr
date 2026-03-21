"use client";

import { useState, useEffect, Suspense } from "react";
import dynamic from "next/dynamic";
import { useRouter } from "next/navigation";
import { ArrowRight, Check, ArrowLeft } from "lucide-react";
import styles from "../page.module.css";
import { completeSignup, signIn } from "../../actions/auth";

interface PSGCItem { code: string; name: string; }

const REGION_DEFAULT = "CALABARZON (Region IV-A)";
const REGION_CODE_DEFAULT = "040000000";

const LeafletPinMap = dynamic(() => import("../../onboard/LeafletMap").then((mod) => mod.LeafletPinMap), { ssr: false });

function LocationForm() {
  const router = useRouter();

  const [regions, setRegions] = useState<PSGCItem[]>([]);
  const [provinces, setProvinces] = useState<PSGCItem[]>([]);
  const [municipalities, setMunicipalities] = useState<PSGCItem[]>([]);
  const [barangays, setBarangays] = useState<PSGCItem[]>([]);

  const [mapCoords, setMapCoords] = useState<{ lat: number; lon: number }>({ lat: 14.2819, lon: 120.9106 });

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
    longitude: ""
  });

  const [errors, setErrors] = useState<Record<string, string>>({});
  const [loading, setLoading] = useState(false);
  const [done, setDone] = useState(false);

  const fetchPSGCResource = async (level: string, code?: string): Promise<PSGCItem[]> => {
    const params = new URLSearchParams({ level });
    if (code) params.set("code", code);

    try {
      const res = await fetch(`/api/psgc?${params.toString()}`);
      if (!res.ok) return [];
      const data = await res.json();
      const list = Array.isArray(data)
        ? data
        : Array.isArray(data?.value)
          ? data.value
          : [];
      return list.map((item: { code: string; name: string }) => ({ code: item.code, name: item.name }));
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
      const list = await fetchPSGCResource("cities-municipalities", form.provinceCode);
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
    setErrors((e) => { const n = { ...e }; delete n[k]; return n; });
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

    const pending = window.sessionStorage.getItem('beavr_signup_data');
    if (!pending) {
      setErrors({ general: 'Signup session lost. Please start again.' });
      return;
    }

    const pendingUser = JSON.parse(pending);
    if (!pendingUser || !pendingUser.id) {
      setErrors({ general: 'Incomplete signup data. Please start again.' });
      return;
    }

    setLoading(true);

    const formData = new FormData();
    formData.append('userId', pendingUser.id);
    formData.append('email', pendingUser.email);
    formData.append('fullName', pendingUser.full_name);
    formData.append('passwordHash', pendingUser.password_hash);
    formData.append('role', pendingUser.role || 'customer');
    formData.append('province', form.province);
    formData.append('municipality', form.city);
    formData.append('barangay', form.barangay);
    formData.append('streetAddress', form.street);
    formData.append('landmarks', form.landmarks);
    if (form.latitude) formData.append('latitude', form.latitude);
    if (form.longitude) formData.append('longitude', form.longitude);

    const result = await completeSignup(formData);
    
    if (result?.error) {
      setLoading(false);
      console.error("Signup error:", result.error);
      setErrors({ general: result.error });
      return;
    }

    // Auto-login after successful signup
    const signInData = new FormData();
    signInData.append('email', pendingUser.email);
    signInData.append('password', pendingUser.password);

    try {
      const signInResult = await signIn(signInData);
      
      if (signInResult?.error) {
        setLoading(false);
        console.error("Sign-in error:", signInResult.error);
        setErrors({ general: `Login failed: ${signInResult.error}` });
        return;
      }

      window.sessionStorage.removeItem('beavr_signup_data');
      setDone(true);
      await new Promise((r) => setTimeout(r, 700));

      // Redirect based on user role
      const userRole = signInResult?.user?.role || 'customer';
      const destination = userRole === 'specialist' ? '/specialist/dashboard' : '/';
      router.push(destination);
    } catch (err) {
      setLoading(false);
      const message = err instanceof Error ? err.message : "Login failed";
      console.error("Sign-in exception:", err);
      setErrors({ general: `Login failed: ${message}` });
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
    setForm((f) => ({ ...f, latitude: lat.toString(), longitude: lon.toString() }));
  };

  const address = [form.street, form.barangay, form.city, form.province, form.region]
    .filter(Boolean)
    .join(", ");

  useEffect(() => {
    if (!address) {
      return;
    }

    const controller = new AbortController();
    const url = `https://nominatim.openstreetmap.org/search?format=json&q=${encodeURIComponent(address)}&limit=1`;

    fetch(url, { signal: controller.signal, headers: { "Accept-Language": "en" } })
      .then((res) => res.json())
      .then((items) => {
        if (Array.isArray(items) && items.length > 0) {
          const item = items[0];
          const lat = Number(item.lat);
          const lon = Number(item.lon);
          if (!Number.isNaN(lat) && !Number.isNaN(lon)) {
            setMapCoords({ lat, lon });
            setForm((f) => ({ ...f, latitude: lat.toString(), longitude: lon.toString() }));
          }
        }
      })
      .catch(() => null);

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
          <p className={styles.subtitle}>
            Help us find specialists near you.
          </p>
        </div>

        <div className={styles.form}>
          {/* Region — default to CALABARZON */}
          <div className={styles.field}>
            <label className={styles.label} htmlFor="region">Region</label>
            <select
              id="region"
              className={`${styles.input} ${errors.region ? styles.inputError : ""}`}
              value={form.regionCode}
              onChange={(e) => {
                const selected = regions.find(r => r.code === e.target.value);
                if (selected) onRegionSelect(selected.code, selected.name);
              }}
            >
              <option value="">Select region</option>
              {regions.map((r) => (
                <option key={r.code} value={r.code}>{r.name}</option>
              ))}
            </select>
            {errors.region && <span className={styles.errMsg}>{errors.region}</span>}
          </div>

          {/* Province */}
          <div className={styles.field}>
            <label className={styles.label} htmlFor="province">Province</label>
            <select
              id="province"
              className={`${styles.input} ${errors.province ? styles.inputError : ""}`}
              value={form.provinceCode}
              onChange={(e) => {
                const selected = provinces.find(p => p.code === e.target.value);
                if (selected) onProvinceSelect(selected.code, selected.name);
              }}
              disabled={!form.regionCode}
            >
              <option value="">Select province</option>
              {provinces.map((p) => (
                <option key={p.code} value={p.code}>{p.name}</option>
              ))}
            </select>
            {errors.province && <span className={styles.errMsg}>{errors.province}</span>}
          </div>

          {/* Municipality/City */}
          <div className={styles.field}>
            <label className={styles.label} htmlFor="city">Municipality/City</label>
            <select
              id="city"
              className={`${styles.input} ${errors.city ? styles.inputError : ""}`}
              value={form.cityCode}
              onChange={(e) => {
                const selected = municipalities.find(m => m.code === e.target.value);
                if (selected) onCitySelect(selected.code, selected.name);
              }}
              disabled={!form.provinceCode}
            >
              <option value="">Select municipality/city</option>
              {municipalities.map((m) => (
                <option key={m.code} value={m.code}>{m.name}</option>
              ))}
            </select>
            {errors.city && <span className={styles.errMsg}>{errors.city}</span>}
          </div>

          {/* Barangay */}
          <div className={styles.field}>
            <label className={styles.label} htmlFor="barangay">Barangay</label>
            <select
              id="barangay"
              className={`${styles.input} ${errors.barangay ? styles.inputError : ""}`}
              value={form.barangayCode}
              onChange={(e) => {
                const selected = barangays.find(b => b.code === e.target.value);
                if (selected) onBarangaySelect(selected.code, selected.name);
              }}
              disabled={!form.cityCode}
            >
              <option value="">Select barangay</option>
              {barangays.map((b) => (
                <option key={b.code} value={b.code}>{b.name}</option>
              ))}
            </select>
            {errors.barangay && <span className={styles.errMsg}>{errors.barangay}</span>}
          </div>

          {/* Street Address */}
          <div className={styles.field}>
            <label className={styles.label} htmlFor="street">Street Address</label>
            <input
              id="street"
              type="text"
              className={`${styles.input} ${errors.street ? styles.inputError : ""}`}
              placeholder="e.g. 123 Main St, Brgy. Example"
              value={form.street}
              onChange={(e) => set("street", e.target.value)}
            />
            {errors.street && <span className={styles.errMsg}>{errors.street}</span>}
          </div>

          {/* Landmarks */}
          <div className={styles.field}>
            <label className={styles.label} htmlFor="landmarks">Landmarks (optional)</label>
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
            <div style={{ minHeight: 240 }}>
              <LeafletPinMap current={mapCoords} onCoordsChange={onCoordsChange} />
            </div>
          </div>

          {errors.general && <span className={styles.errMsg}>{errors.general}</span>}

          {/* Submit */}
          <button
            className={`${styles.submitBtn} ${done ? styles.submitDone : ""}`}
            onClick={handleSubmit}
            disabled={loading || done}
            aria-busy={loading}
          >
            {done ? (
              <><Check size={18} strokeWidth={2.5} /> Location set!</>
            ) : loading ? (
              <span className={styles.spinner} />
            ) : (
              <>Set location <ArrowRight size={16} strokeWidth={2.5} /></>
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