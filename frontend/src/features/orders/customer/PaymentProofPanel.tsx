import { useRef, useState } from "react";
import { toast } from "sonner";
import { Upload, FileImage, CheckCircle2, XCircle, Clock } from "lucide-react";
import { Button } from "@/components/ui/Button";
import { Badge } from "@/components/ui/Card";
import { useUploadProof } from "../api";
import { apiErrorMessage } from "@/lib/axios";
import { PAYMENT_STATUS_LABEL, PAYMENT_STATUS_TONE } from "../status";
import { formatDateTime } from "@/lib/utils";
import type { Payment } from "@/types/api";

const MAX_BYTES = 5 * 1024 * 1024;
const ALLOWED = ["image/jpeg", "image/png", "image/webp"];

export function PaymentProofPanel({ orderId, payment }: { orderId: string; payment: Payment }) {
  const inputRef = useRef<HTMLInputElement>(null);
  const [preview, setPreview] = useState<string | null>(null);
  const [file, setFile] = useState<File | null>(null);
  const upload = useUploadProof();

  const pickFile = (f: File | undefined) => {
    if (!f) return;
    if (!ALLOWED.includes(f.type)) {
      toast.error("Please upload a JPEG, PNG, or WebP image.");
      return;
    }
    if (f.size > MAX_BYTES) {
      toast.error("File must be under 5 MB.");
      return;
    }
    setFile(f);
    setPreview(URL.createObjectURL(f));
  };

  const submit = async () => {
    if (!file) return;
    try {
      await upload.mutateAsync({ orderId, file });
      toast.success("Payment proof uploaded");
      setFile(null);
      setPreview(null);
    } catch (err) {
      toast.error(apiErrorMessage(err, "Couldn't upload proof"));
    }
  };

  const StatusIcon =
    payment.status === "verified" ? CheckCircle2 : payment.status === "rejected" ? XCircle : Clock;

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-2">
          <StatusIcon
            className={`h-5 w-5 ${
              payment.status === "verified"
                ? "text-success"
                : payment.status === "rejected"
                ? "text-danger"
                : "text-warning"
            }`}
          />
          <span className="font-medium text-content">Payment</span>
        </div>
        <Badge tone={PAYMENT_STATUS_TONE[payment.status]}>
          {PAYMENT_STATUS_LABEL[payment.status]}
        </Badge>
      </div>

      {payment.status === "rejected" && payment.rejection_reason && (
        <div className="rounded-lg border border-danger/20 bg-danger/5 px-3 py-2 text-sm text-danger">
          Rejected: {payment.rejection_reason}. Please upload a corrected receipt.
        </div>
      )}

      {/* Existing proofs */}
      {payment.proofs.length > 0 && (
        <div className="flex flex-wrap gap-3">
          {payment.proofs.map((p) => (
            <a
              key={p.id}
              href={p.url}
              target="_blank"
              rel="noreferrer"
              className="group relative block h-24 w-24 overflow-hidden rounded-lg border border-border"
            >
              <img src={p.url} alt="Payment proof" className="h-full w-full object-cover" />
              <span className="absolute inset-x-0 bottom-0 bg-slate-950/60 px-1 py-0.5 text-center text-[10px] text-white">
                {formatDateTime(p.created_at).split(",")[0]}
              </span>
            </a>
          ))}
        </div>
      )}

      {/* Upload control — hidden once verified */}
      {payment.status !== "verified" && (
        <div>
          <input
            ref={inputRef}
            type="file"
            accept="image/png,image/jpeg,image/webp"
            className="hidden"
            onChange={(e) => pickFile(e.target.files?.[0])}
          />
          {preview ? (
            <div className="space-y-3">
              <img
                src={preview}
                alt="Selected proof preview"
                className="max-h-48 rounded-lg border border-border object-contain"
              />
              <div className="flex gap-2">
                <Button onClick={submit} loading={upload.isPending}>
                  <Upload className="h-4 w-4" /> Upload proof
                </Button>
                <Button
                  variant="outline"
                  onClick={() => {
                    setFile(null);
                    setPreview(null);
                  }}
                >
                  Choose another
                </Button>
              </div>
            </div>
          ) : (
            <button
              onClick={() => inputRef.current?.click()}
              className="flex w-full flex-col items-center justify-center gap-2 rounded-xl border-2 border-dashed border-border bg-surface-2/40 px-4 py-8 text-muted transition-colors hover:border-primary hover:text-content"
            >
              <FileImage className="h-8 w-8" />
              <span className="text-sm font-medium">Click to upload payment screenshot</span>
              <span className="text-xs">JPEG, PNG, or WebP · up to 5 MB</span>
            </button>
          )}
        </div>
      )}
    </div>
  );
}
