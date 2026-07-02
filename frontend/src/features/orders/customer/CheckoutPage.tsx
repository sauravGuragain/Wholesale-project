import { useState } from "react";
import { useNavigate } from "react-router-dom";
import { toast } from "sonner";
import { Banknote, QrCode, ArrowRight, ImageOff } from "lucide-react";
import { Card, CardBody, Spinner } from "@/components/ui/Card";
import { Button } from "@/components/ui/Button";
import { Field } from "@/components/ui/Input";
import { useCartStore } from "@/stores/cart";
import { usePlaceOrder, usePaymentQr } from "../api";
import { apiErrorMessage } from "@/lib/axios";
import { formatCurrency } from "@/lib/utils";
import type { PaymentMethod } from "@/types/api";
import { cn } from "@/lib/utils";

export function CheckoutPage() {
  const navigate = useNavigate();
  const lines = useCartStore((s) => s.lines);
  const clear = useCartStore((s) => s.clear);
  const subtotal = lines.reduce((sum, l) => sum + Number(l.price) * l.quantity, 0);

  const [method, setMethod] = useState<PaymentMethod>("cod");
  const [address, setAddress] = useState("");
  const [notes, setNotes] = useState("");

  const qr = usePaymentQr();
  const placeOrder = usePlaceOrder();

  // Guard: an empty cart shouldn't reach checkout.
  if (lines.length === 0) {
    navigate("/shop/cart", { replace: true });
    return null;
  }

  const handlePlaceOrder = async () => {
    try {
      const order = await placeOrder.mutateAsync({
        items: lines.map((l) => ({ product_id: l.product_id, quantity: l.quantity })),
        payment_method: method,
        delivery_address: address || null,
        notes: notes || null,
      });
      clear();
      toast.success("Order placed");
      // For QR, land the customer on the order page where they upload proof.
      navigate(`/shop/orders/${order.id}`, { replace: true });
    } catch (err) {
      toast.error(apiErrorMessage(err, "Couldn't place your order"));
    }
  };

  const methods: { value: PaymentMethod; title: string; desc: string; icon: typeof Banknote }[] = [
    { value: "cod", title: "Cash on Delivery", desc: "Pay in cash when your order arrives.", icon: Banknote },
    { value: "static_qr", title: "QR Payment", desc: "Scan the QR, pay, then upload your receipt.", icon: QrCode },
  ];

  return (
    <div className="grid grid-cols-1 gap-6 lg:grid-cols-3">
      <div className="space-y-6 lg:col-span-2">
        {/* Payment method */}
        <Card>
          <CardBody className="space-y-4">
            <h3 className="font-display font-bold text-content">Payment method</h3>
            <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
              {methods.map((m) => (
                <button
                  key={m.value}
                  onClick={() => setMethod(m.value)}
                  className={cn(
                    "flex items-start gap-3 rounded-xl border p-4 text-left transition-colors",
                    method === m.value
                      ? "border-primary bg-primary-soft"
                      : "border-border hover:bg-surface-2"
                  )}
                >
                  <span
                    className={cn(
                      "flex h-9 w-9 items-center justify-center rounded-lg",
                      method === m.value ? "bg-primary text-primary-fg" : "bg-surface-2 text-muted"
                    )}
                  >
                    <m.icon className="h-5 w-5" />
                  </span>
                  <span className="min-w-0">
                    <span className="block font-medium text-content">{m.title}</span>
                    <span className="block text-xs text-muted">{m.desc}</span>
                  </span>
                </button>
              ))}
            </div>

            {/* QR preview shown inline when QR is selected */}
            {method === "static_qr" && (
              <div className="rounded-xl border border-dashed border-border bg-surface-2/50 p-4">
                <p className="mb-3 text-sm font-medium text-content">Scan to pay</p>
                {qr.isLoading ? (
                  <div className="flex h-40 items-center justify-center">
                    <Spinner />
                  </div>
                ) : qr.data?.url ? (
                  <img
                    src={qr.data.url}
                    alt="Payment QR code"
                    className="mx-auto h-48 w-48 rounded-lg border border-border bg-white object-contain p-2"
                  />
                ) : (
                  <div className="flex h-40 flex-col items-center justify-center gap-2 text-muted">
                    <ImageOff className="h-6 w-6" />
                    <p className="text-sm">No QR configured yet.</p>
                    <p className="text-xs">You can still place the order and upload proof once available.</p>
                  </div>
                )}
                <p className="mt-3 text-center text-xs text-muted">
                  After placing your order, upload the payment screenshot on the order page.
                </p>
              </div>
            )}
          </CardBody>
        </Card>

        {/* Delivery details */}
        <Card>
          <CardBody className="space-y-4">
            <h3 className="font-display font-bold text-content">Delivery details</h3>
            <Field label="Delivery address" hint="Leave blank to use your account's default address.">
              <textarea
                value={address}
                onChange={(e) => setAddress(e.target.value)}
                rows={2}
                placeholder="Shop name, street, city…"
                className="w-full rounded-lg border border-border bg-surface px-3 py-2 text-sm text-content placeholder:text-muted focus:border-primary focus:outline-none"
              />
            </Field>
            <Field label="Order notes" hint="Optional. Anything the packing team should know.">
              <textarea
                value={notes}
                onChange={(e) => setNotes(e.target.value)}
                rows={2}
                placeholder="e.g. deliver before noon"
                className="w-full rounded-lg border border-border bg-surface px-3 py-2 text-sm text-content placeholder:text-muted focus:border-primary focus:outline-none"
              />
            </Field>
          </CardBody>
        </Card>
      </div>

      {/* Summary */}
      <div>
        <Card className="sticky top-20">
          <CardBody className="space-y-4">
            <h3 className="font-display font-bold text-content">Summary</h3>
            <ul className="space-y-2 text-sm">
              {lines.map((l) => (
                <li key={l.product_id} className="flex justify-between gap-2">
                  <span className="min-w-0 truncate text-muted">
                    {l.name} × {l.quantity}
                  </span>
                  <span className="shrink-0 text-content">
                    {formatCurrency(Number(l.price) * l.quantity)}
                  </span>
                </li>
              ))}
            </ul>
            <div className="border-t border-border pt-3">
              <div className="flex justify-between text-sm">
                <span className="text-muted">Subtotal</span>
                <span className="font-medium text-content">{formatCurrency(subtotal)}</span>
              </div>
              <p className="mt-1 text-xs text-muted">Tax added per product rate on the final order.</p>
            </div>
            <Button
              size="lg"
              className="w-full"
              onClick={handlePlaceOrder}
              loading={placeOrder.isPending}
            >
              Place order <ArrowRight className="h-4 w-4" />
            </Button>
          </CardBody>
        </Card>
      </div>
    </div>
  );
}
