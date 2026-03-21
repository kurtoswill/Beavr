/**
 * Face Verification Component
 * Uses react-webcam for camera access and native FaceDetector API for face detection
 */

"use client";

import { useEffect, useRef, useState, useCallback } from "react";
import Webcam from "react-webcam";
import { Check, X, Loader } from "lucide-react";

interface FaceDetectionAPI {
  detect: (video: HTMLVideoElement, callback: (result: unknown[]) => void) => void;
}

// Define FaceDetector interface
interface FaceDetector {
  detect(video: HTMLVideoElement): Promise<FaceDetectionResult[]>;
}

interface FaceDetectionResult {
  boundingBox: {
    x: number;
    y: number;
    width: number;
    height: number;
  };
}

// Extend window type to include ml5 and FaceDetector
declare global {
  interface Window {
    ml5?: {
      faceDetection: (model: string, callback: () => void) => FaceDetectionAPI;
    };
    FaceDetector?: new (options?: { fastMode?: boolean; maxDetectedFaces?: number }) => FaceDetector;
  }
}



interface FaceVerificationModalProps {
  isOpen: boolean;
  onClose: () => void;
  onSuccess: () => void;
  onError: (error: string) => void;
  autoStart?: boolean;
}

export function FaceVerificationModal({
  isOpen,
  onClose,
  onSuccess,
  onError,
  autoStart = false,
}: FaceVerificationModalProps) {
  const webcamRef = useRef<Webcam>(null);
  const [status, setStatus] = useState<"idle" | "loading" | "detecting" | "success" | "error">("idle");
  const [errorMsg, setErrorMsg] = useState<string>("");
  const detectionIntervalRef = useRef<number | null>(null);
  const faceDetectorRef = useRef<FaceDetector | null>(null);
  const isInitializedRef = useRef(false);

  const startDetecting = useCallback(() => {
    if (!webcamRef.current?.video) return;

    if (window.FaceDetector) {
      const detector = new window.FaceDetector({ fastMode: true, maxDetectedFaces: 1 });
      faceDetectorRef.current = detector;
      setStatus("detecting");

      let consecutive = 0;
      const needed = 3;

      const interval = window.setInterval(async () => {
        if (!webcamRef.current?.video) return;

        try {
          const faces = await detector.detect(webcamRef.current.video);
          if (faces.length > 0) {
            consecutive += 1;
          } else {
            consecutive = 0;
          }

          if (consecutive >= needed) {
            if (detectionIntervalRef.current) {
              window.clearInterval(detectionIntervalRef.current);
            }
            setStatus("success");
            setTimeout(() => {
              onSuccess();
            }, 500);
          }
        } catch (err) {
          console.error("FaceDetector error", err);
          setErrorMsg("Face detection currently unavailable in this browser.");
          setStatus("error");
          onError("Face detection currently unavailable in this browser.");
          if (detectionIntervalRef.current) {
            window.clearInterval(detectionIntervalRef.current);
          }
        }
      }, 800);

      detectionIntervalRef.current = interval;
    } else {
      // No FaceDetector API: allow manual confirmation as fallback
      setStatus("detecting");
    }
  }, [onError, onSuccess]);



  const initCamera = useCallback(async () => {
    const insecureAllowed = process.env.NEXT_PUBLIC_ALLOW_INSECURE_CAMERA === "true";

    if (typeof window !== "undefined" && window.location.protocol !== "https:" && window.location.hostname !== "localhost" && !insecureAllowed) {
      const msg = "Camera access requires HTTPS on most browsers (or use localhost).";
      setErrorMsg(msg);
      setStatus("error");
      onError(msg);
      return;
    }

    // react-webcam handles camera initialization automatically
    // Just set loading state
    setStatus("loading");
    setErrorMsg("");
  }, [onError]);

  useEffect(() => {
    if (!isOpen) {
      if (detectionIntervalRef.current) {
        clearInterval(detectionIntervalRef.current);
      }
      isInitializedRef.current = false;
      return;
    }

    return () => {
      if (detectionIntervalRef.current) {
        clearInterval(detectionIntervalRef.current);
      }
    };
  }, [isOpen]);

  useEffect(() => {
    if (isOpen && autoStart && !isInitializedRef.current) {
      isInitializedRef.current = true;
      const timer = window.setTimeout(() => {
        initCamera();
      }, 0);
      return () => {
        window.clearTimeout(timer);
      };
    }

    return;
  }, [isOpen, autoStart, initCamera]);

  const handleUserMedia = useCallback(() => {
    console.log("✅ Camera permission granted, stream obtained");
    startDetecting();
  }, [startDetecting]);

  const handleUserMediaError = useCallback((error: string | DOMException) => {
    console.error("Camera initialization error:", error);
    let msgError = "Camera access denied. Please allow camera permissions.";
    if (error instanceof DOMException && error.name === "NotAllowedError") {
      msgError = "Camera permission was denied. Please try again and allow camera access.";
    } else if (error instanceof DOMException && error.name === "NotFoundError") {
      msgError = "No camera found on this device.";
    } else if (typeof error === "string") {
      msgError = error;
    } else if (error instanceof Error) {
      msgError = error.message;
    }
    setErrorMsg(msgError);
    setStatus("error");
    onError(msgError);
  }, [onError]);

  const handleRetry = useCallback(() => {
    setStatus("idle");
    setErrorMsg("");
  }, []);

  if (!isOpen) return null;

  return (
    <div
      style={{
        position: "fixed",
        top: 0,
        left: 0,
        right: 0,
        bottom: 0,
        backgroundColor: "rgba(0, 0, 0, 0.7)",
        display: "flex",
        alignItems: "center",
        justifyContent: "center",
        zIndex: 1000,
      }}
    >
      <div
        style={{
          backgroundColor: "white",
          borderRadius: "12px",
          padding: "2rem",
          maxWidth: "500px",
          width: "90%",
          boxShadow: "0 20px 25px rgba(0, 0, 0, 0.15)",
        }}
      >
        <h2 style={{ fontSize: "1.25rem", fontWeight: 600, marginBottom: "1rem" }}>
          Face Verification
        </h2>
        <p style={{ color: "#666", marginBottom: "1.5rem" }}>
          Position your face in the frame and hold steady.
        </p>

        {status === "loading" && (
          <div style={{ textAlign: "center", padding: "2rem" }}>
            <div style={{ display: "flex", justifyContent: "center" }}>
              <Loader size={32} style={{ animation: "spin 1s linear infinite" }} />
            </div>
            <p style={{ marginTop: "1rem", color: "#666" }}>Loading camera...</p>
          </div>
        )}

        {status === "idle" && (
          <div style={{ textAlign: "center", padding: "2rem" }}>
            <p style={{ marginBottom: "0.75rem", color: "#4b5563" }}>Click below to start camera and request permission.</p>
            <button
              onClick={initCamera}
              style={{
                padding: "0.75rem 1rem",
                backgroundColor: "#3b82f6",
                color: "white",
                border: "none",
                borderRadius: "6px",
                cursor: "pointer",
                fontWeight: 600,
              }}
            >
              Open Camera
            </button>
          </div>
        )}

        {status === "detecting" && !("FaceDetector" in window) && (
          <div style={{ textAlign: "center", padding: "1rem", marginBottom: "1rem" }}>
            <p style={{ color: "#4b5563" }}>Face detector not available, please confirm your face is visible below.</p>
            <button
              onClick={() => {
                setStatus("success");
                setTimeout(() => {
                  onSuccess();
                }, 500);
              }}
              style={{
                padding: "0.75rem 1rem",
                backgroundColor: "#10b981",
                color: "white",
                border: "none",
                borderRadius: "6px",
                cursor: "pointer",
                fontWeight: 600,
              }}
            >
              Confirm Face Visible
            </button>
          </div>
        )}

        {(status === "loading" || status === "detecting" || status === "success") && (
          <div
            style={{
              position: "relative",
              width: "100%",
              marginBottom: "1.5rem",
            }}
          >
            <Webcam
              ref={webcamRef}
              audio={false}
              screenshotFormat="image/jpeg"
              videoConstraints={{
                width: 640,
                height: 480,
                facingMode: "user"
              }}
              onUserMedia={handleUserMedia}
              onUserMediaError={handleUserMediaError}
              style={{
                width: "100%",
                borderRadius: "8px",
                backgroundColor: "#000",
                border: status === "success" ? "3px solid #22c55e" : "2px solid #d1d5db",
              }}
            />
            {status === "success" && (
              <div
                style={{
                  position: "absolute",
                  top: "50%",
                  left: "50%",
                  transform: "translate(-50%, -50%)",
                  backgroundColor: "rgba(34, 197, 94, 0.95)",
                  padding: "1rem 1.5rem",
                  borderRadius: "8px",
                  display: "flex",
                  alignItems: "center",
                  gap: "0.5rem",
                  color: "white",
                  fontWeight: 600,
                }}
              >
                <Check size={24} />
                Face Detected!
              </div>
            )}
          </div>
        )}

        {status === "error" && (
          <div
            style={{
              backgroundColor: "#fef2f2",
              border: "2px solid #ef4444",
              borderRadius: "8px",
              padding: "1rem",
              marginBottom: "1.5rem",
              display: "flex",
              gap: "0.75rem",
            }}
          >
            <X size={20} style={{ color: "#ef4444", flexShrink: 0 }} />
            <div>
              <p style={{ fontWeight: 600, color: "#dc2626" }}>Error</p>
              <p style={{ color: "#666", fontSize: "0.875rem" }}>{errorMsg}</p>
            </div>
          </div>
        )}

        <div
          style={{
            display: "flex",
            gap: "1rem",
          }}
        >
          <button
            onClick={() => {
              if (detectionIntervalRef.current) {
                clearInterval(detectionIntervalRef.current);
              }
              onClose();
            }}
            style={{
              flex: 1,
              padding: "0.75rem 1rem",
              backgroundColor: "#f3f4f6",
              border: "1px solid #d1d5db",
              borderRadius: "6px",
              cursor: "pointer",
              fontWeight: 500,
            }}
          >
            Cancel
          </button>
          {status === "error" && (
            <button
              onClick={handleRetry}
              style={{
                flex: 1,
                padding: "0.75rem 1rem",
                backgroundColor: "#3b82f6",
                color: "white",
                border: "none",
                borderRadius: "6px",
                cursor: "pointer",
                fontWeight: 500,
              }}
            >
              Try Again
            </button>
          )}
        </div>
      </div>

      <style>{`
        @keyframes spin {
          from { transform: rotate(0deg); }
          to { transform: rotate(360deg); }
        }
      `}</style>
    </div>
  );
}
