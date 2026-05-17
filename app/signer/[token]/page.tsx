"use client";

import { useParams } from "next/navigation";
import { useEffect, useRef, useState } from "react";
import { BtnPrimary, BtnSecondary } from "@/components/ui";
import { PC } from "@/lib/locavio-colors";
import { fieldInputStyle } from "@/lib/locavio-field-styles";

const LOCAVIO_LOGO = (
  <svg width="48" height="48" viewBox="0 0 100 100" fill="none" xmlns="http://www.w3.org/2000/svg" aria-hidden>
    <defs>
      <clipPath id="mc">
        <polygon points="50,5 95,50 50,95 5,50" />
      </clipPath>
    </defs>
    <polygon points="50,5 5,50 50,95" fill="#1C1438" clipPath="url(#mc)" />
    <polygon points="50,5 95,50 50,95" fill="#7C5CBF" clipPath="url(#mc)" />
    <line x1="50" y1="5" x2="50" y2="95" stroke="#C4A0FF" strokeWidth="1.6" clipPath="url(#mc)" />
    <polygon points="50,5 95,50 50,95 5,50" stroke="#1C1438" strokeWidth="1.8" fill="none" strokeLinejoin="round" />
    <path
      d="M 34,32 H 42 Q 44,32 44,34 V 53 L 52,61 H 65 Q 67,61 67,63 V 69 Q 67,71 65,71 H 34 Q 32,71 32,69 V 34 Q 32,32 34,32 Z"
      fill="white"
    />
  </svg>
);

type SignerInfo = {
  signer_name: string;
  document_type: string;
};

export default function SignerPage() {
  const params = useParams();
  const token = String(params.token ?? "");

  const [step, setStep] = useState<"otp" | "sign" | "done">("otp");
  const [otp, setOtp] = useState("");
  const [otpError, setOtpError] = useState("");
  const [otpLoading, setOtpLoading] = useState(false);
  const [signatureData, setSignatureData] = useState<string | null>(null);
  const [isDrawing, setIsDrawing] = useState(false);
  const [hasDrawn, setHasDrawn] = useState(false);
  const [isSigning, setIsSigning] = useState(false);
  const [signerInfo, setSignerInfo] = useState<SignerInfo | null>(null);
  const [pageError, setPageError] = useState("");
  const [infoLoading, setInfoLoading] = useState(true);
  const canvasRef = useRef<HTMLCanvasElement>(null);

  useEffect(() => {
    if (!token) {
      setPageError("Lien invalide.");
      setInfoLoading(false);
      return;
    }

    let cancelled = false;
    void (async () => {
      try {
        const res = await fetch(`/api/signature/info/${encodeURIComponent(token)}`);
        const data = (await res.json()) as {
          signer_name?: string;
          document_type?: string;
          error?: string;
        };

        if (cancelled) return;

        if (data.error === "already_signed") {
          setStep("done");
          setInfoLoading(false);
          return;
        }

        if (data.error === "not_found" || !res.ok) {
          setPageError("Ce lien de signature est invalide ou a expiré.");
          setInfoLoading(false);
          return;
        }

        setSignerInfo({
          signer_name: String(data.signer_name ?? ""),
          document_type: String(data.document_type ?? ""),
        });
        setInfoLoading(false);
      } catch {
        if (!cancelled) {
          setPageError("Impossible de charger les informations du document.");
          setInfoLoading(false);
        }
      }
    })();

    return () => {
      cancelled = true;
    };
  }, [token]);

  function getPos(canvas: HTMLCanvasElement, e: { clientX: number; clientY: number }) {
    const rect = canvas.getBoundingClientRect();
    const scaleX = canvas.width / rect.width;
    const scaleY = canvas.height / rect.height;
    return {
      x: (e.clientX - rect.left) * scaleX,
      y: (e.clientY - rect.top) * scaleY,
    };
  }

  function startDraw(e: React.MouseEvent<HTMLCanvasElement>) {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext("2d");
    if (!ctx) return;
    const pos = getPos(canvas, e.nativeEvent);
    ctx.beginPath();
    ctx.moveTo(pos.x, pos.y);
    setIsDrawing(true);
    setHasDrawn(true);
  }

  function draw(e: React.MouseEvent<HTMLCanvasElement>) {
    if (!isDrawing) return;
    const canvas = canvasRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext("2d");
    if (!ctx) return;
    const pos = getPos(canvas, e.nativeEvent);
    ctx.lineTo(pos.x, pos.y);
    ctx.strokeStyle = PC.text;
    ctx.lineWidth = 2.5;
    ctx.lineCap = "round";
    ctx.lineJoin = "round";
    ctx.stroke();
  }

  function stopDraw() {
    setIsDrawing(false);
  }

  function startDrawTouch(e: React.TouchEvent<HTMLCanvasElement>) {
    e.preventDefault();
    const canvas = canvasRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext("2d");
    if (!ctx) return;
    const touch = e.touches[0];
    if (!touch) return;
    const pos = getPos(canvas, touch);
    ctx.beginPath();
    ctx.moveTo(pos.x, pos.y);
    setIsDrawing(true);
    setHasDrawn(true);
  }

  function drawTouch(e: React.TouchEvent<HTMLCanvasElement>) {
    e.preventDefault();
    if (!isDrawing) return;
    const canvas = canvasRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext("2d");
    if (!ctx) return;
    const touch = e.touches[0];
    if (!touch) return;
    const pos = getPos(canvas, touch);
    ctx.lineTo(pos.x, pos.y);
    ctx.strokeStyle = PC.text;
    ctx.lineWidth = 2.5;
    ctx.lineCap = "round";
    ctx.lineJoin = "round";
    ctx.stroke();
  }

  function clearCanvas() {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext("2d");
    if (!ctx) return;
    ctx.clearRect(0, 0, canvas.width, canvas.height);
    setHasDrawn(false);
    setSignatureData(null);
  }

  async function handleVerifyOtp() {
    setOtpError("");
    setOtpLoading(true);
    try {
      const res = await fetch("/api/signature/verify-otp", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ token, otp: otp.trim() }),
      });
      const data = (await res.json()) as { success?: boolean; error?: string };
      if (data.success) {
        setStep("sign");
      } else {
        setOtpError(data.error ?? "Code incorrect.");
      }
    } catch {
      setOtpError("Erreur de vérification. Réessayez.");
    } finally {
      setOtpLoading(false);
    }
  }

  async function handleCompleteSignature() {
    const canvas = canvasRef.current;
    if (!canvas || !hasDrawn) return;
    const dataUrl = canvas.toDataURL("image/png");
    setSignatureData(dataUrl);
    setIsSigning(true);
    try {
      const res = await fetch("/api/signature/complete", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ token, signature_data: dataUrl }),
      });
      const data = (await res.json()) as { success?: boolean; error?: string };
      if (data.success) {
        setStep("done");
      } else {
        setOtpError(data.error ?? "Impossible d'enregistrer la signature.");
      }
    } catch {
      setOtpError("Erreur réseau. Réessayez.");
    } finally {
      setIsSigning(false);
    }
  }

  return (
    <div className="flex min-h-screen flex-col items-center justify-center px-4 py-12" style={{ backgroundColor: PC.bg, color: PC.text }}>
      <div className="w-full max-w-lg">
        <div className="mb-8 flex justify-center">{LOCAVIO_LOGO}</div>

        {infoLoading ? (
          <p className="text-center text-sm" style={{ color: PC.muted }}>
            Chargement…
          </p>
        ) : pageError ? (
          <div className="text-center">
            <p className="text-sm" style={{ color: PC.danger }}>
              {pageError}
            </p>
          </div>
        ) : step === "otp" ? (
          <div className="space-y-6 text-center">
            <div>
              <h1 className="text-xl font-semibold">Vérification de votre identité</h1>
              <p className="mt-2 text-sm" style={{ color: PC.muted }}>
                Un code à 6 chiffres a été envoyé à votre adresse email.
              </p>
            </div>
            <div>
              <input
                type="text"
                inputMode="numeric"
                maxLength={6}
                value={otp}
                onChange={(e) => {
                  setOtp(e.target.value.replace(/\D/g, "").slice(0, 6));
                  if (otpError) setOtpError("");
                }}
                className="w-full max-w-xs text-center text-2xl font-bold tracking-widest"
                style={fieldInputStyle}
                placeholder="000000"
                aria-label="Code à 6 chiffres"
              />
              {otpError ? (
                <p className="mt-2 text-sm" style={{ color: PC.danger }}>
                  {otpError}
                </p>
              ) : null}
            </div>
            <BtnPrimary type="button" disabled={otp.length !== 6 || otpLoading} loading={otpLoading} onClick={() => void handleVerifyOtp()}>
              Vérifier →
            </BtnPrimary>
          </div>
        ) : step === "sign" ? (
          <div className="space-y-6">
            <div className="text-center">
              <h1 className="text-xl font-semibold">Signez le document</h1>
              <p className="mt-2 text-sm" style={{ color: PC.muted }}>
                Dessinez votre signature dans le cadre ci-dessous.
              </p>
              {signerInfo?.signer_name ? (
                <p className="mt-3 text-sm font-medium" style={{ color: PC.text }}>
                  {signerInfo.signer_name}
                </p>
              ) : null}
            </div>
            <canvas
              ref={canvasRef}
              width={500}
              height={160}
              className="w-full rounded-xl"
              style={{
                border: `1px solid ${PC.border}`,
                backgroundColor: PC.white,
                cursor: "crosshair",
                maxWidth: 500,
                touchAction: "none",
              }}
              onMouseDown={startDraw}
              onMouseMove={draw}
              onMouseUp={stopDraw}
              onMouseLeave={stopDraw}
              onTouchStart={startDrawTouch}
              onTouchMove={drawTouch}
              onTouchEnd={stopDraw}
            />
            {otpError ? (
              <p className="text-center text-sm" style={{ color: PC.danger }}>
                {otpError}
              </p>
            ) : null}
            <div className="flex flex-wrap justify-center gap-2">
              <BtnSecondary type="button" size="small" onClick={clearCanvas}>
                Effacer
              </BtnSecondary>
              <BtnPrimary
                type="button"
                size="small"
                disabled={!hasDrawn || isSigning}
                loading={isSigning}
                onClick={() => void handleCompleteSignature()}
              >
                Signer le document →
              </BtnPrimary>
            </div>
          </div>
        ) : (
          <div className="space-y-4 text-center">
            <p className="text-6xl" aria-hidden>
              ✅
            </p>
            <h1 className="text-xl font-semibold">Document signé !</h1>
            <p className="text-sm leading-relaxed" style={{ color: PC.muted }}>
              Votre signature a été enregistrée avec succès. Le propriétaire en sera notifié.
            </p>
            <p className="text-xs" style={{ color: PC.muted }}>
              Vous pouvez fermer cette page.
            </p>
          </div>
        )}
      </div>
    </div>
  );
}
