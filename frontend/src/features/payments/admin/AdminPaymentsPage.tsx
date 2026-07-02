import { useState } from "react";
import { toast } from "sonner";
import { CheckCircle2, XCircle, Wallet, ExternalLink } from "lucide-react";
import { Link } from "react-router-dom";
import { Card, CardBody, CenteredSpinner, EmptyState, ErrorState, Badge } from "@/components/ui/Card";
import { Button } from "@/components/ui/Button";
import { Modal } from "@/components/ui/Modal";
import { Field } from "@/components/ui/Input";
import { usePendingPayments, useVerifyPayment, useRejectPayment } from "../../orders/api";
import { formatCurrency, formatDateTime } from "@/lib/utils";
import { apiErrorMessage } from "@/lib/axios";
import type { Payment } from "@/types/api";

export function AdminPaymentsPage() {
  const { data, isLoading, isError, refetch } = usePendingPayments();
  const verify = useVerifyPayment();
  const reject = useRejectPayment();

  const [rejecting, setRejecting] = useState<Payment | null>(null);
  const [reason, setReason] = useState("");
  const [lightbox, setLightbox] = useState<string | null>(null);

  const handleVerify = async (p: Payment) => {
    try {
      await verify.mutateAsync(p.id);
      toast.success("Payment verified — order confirmed");
    } catch (err) {
      toast.error(apiErrorMessage(err, "Couldn't verify payment"));
    }
  };

  const handleReject = async () => {
    if (!rejecting || !reason.trim()) return;
    try {
      await reject.mutateAsync({ paymentId: rejecting.id, reason: reason.trim() });
      toast.success("Payment rejected");
      setRejecting(null);
      setReason("");
    } catch (err) {
      toast.error(apiErrorMessage(err, "Couldn't reject payment"));
    }
  };

  if (isLoading) return <CenteredSpinner label="Loading pending payments…" />;
  if (isError) return <ErrorState message="Couldn't load payments." onRetry={() => refetch()} />;

  const payments = data ?? [];

  if (payments.length === 0) {
    return (
      <Card>
        <EmptyState
          icon={<Wallet className="h-6 w-6" />}
          title="No payments awaiting review"
          description="QR payment proofs uploaded by customers will appear here for verification."
        />
      </Card>
    );
  }

  return (
    <>
      <div className="grid grid-cols-1 gap-4 md:grid-cols-2 xl:grid-cols-3">
        {payments.map((p) => (
          <Card key={p.id}>
            <CardBody className="space-y-3">
              <div className="flex items-center justify-between">
                <Badge tone="accent">QR Payment</Badge>
                <span className="font-display text-lg font-extrabold text-content">
                  {formatCurrency(p.amount)}
                </span>
              </div>

              {p.proofs.length > 0 ? (
                <div className="flex flex-wrap gap-2">
                  {p.proofs.map((proof) => (
                    <button
                      key={proof.id}
                      onClick={() => setLightbox(proof.url)}
                      className="relative block h-24 w-24 overflow-hidden rounded-lg border border-border"
                    >
                      <img src={proof.url} alt="Payment proof" className="h-full w-full object-cover" />
                    </button>
                  ))}
                </div>
              ) : (
                <p className="rounded-lg bg-surface-2 px-3 py-2 text-xs text-muted">
                  No proof uploaded yet — customer may still be paying.
                </p>
              )}

              <div className="flex items-center justify-between text-xs text-muted">
                <span>Uploaded {p.proofs[0] ? formatDateTime(p.proofs[0].created_at) : "—"}</span>
                <Link
                  to={`/admin/orders/${p.order_id}`}
                  className="inline-flex items-center gap-1 text-primary hover:underline"
                >
                  Order <ExternalLink className="h-3 w-3" />
                </Link>
              </div>

              <div className="flex gap-2 pt-1">
                <Button
                  className="flex-1"
                  onClick={() => handleVerify(p)}
                  loading={verify.isPending && verify.variables === p.id}
                  disabled={p.proofs.length === 0}
                >
                  <CheckCircle2 className="h-4 w-4" /> Verify
                </Button>
                <Button variant="outline" className="flex-1" onClick={() => setRejecting(p)}>
                  <XCircle className="h-4 w-4" /> Reject
                </Button>
              </div>
            </CardBody>
          </Card>
        ))}
      </div>

      {/* Reject reason modal */}
      <Modal
        open={Boolean(rejecting)}
        onClose={() => {
          setRejecting(null);
          setReason("");
        }}
        title="Reject payment"
        description="The customer will see this reason and can re-upload a corrected receipt."
        footer={
          <>
            <Button
              variant="outline"
              onClick={() => {
                setRejecting(null);
                setReason("");
              }}
            >
              Cancel
            </Button>
            <Button variant="danger" onClick={handleReject} loading={reject.isPending} disabled={!reason.trim()}>
              Reject payment
            </Button>
          </>
        }
      >
        <Field label="Reason" required>
          <textarea
            value={reason}
            onChange={(e) => setReason(e.target.value)}
            rows={3}
            placeholder="e.g. Amount doesn't match, or the screenshot is unclear."
            className="w-full rounded-lg border border-border bg-surface px-3 py-2 text-sm text-content placeholder:text-muted focus:border-primary focus:outline-none"
          />
        </Field>
      </Modal>

      {/* Proof lightbox */}
      {lightbox && (
        <div
          className="fixed inset-0 z-50 flex items-center justify-center bg-slate-950/80 p-4"
          onClick={() => setLightbox(null)}
        >
          <img src={lightbox} alt="Payment proof" className="max-h-[85vh] max-w-full rounded-lg" />
        </div>
      )}
    </>
  );
}
