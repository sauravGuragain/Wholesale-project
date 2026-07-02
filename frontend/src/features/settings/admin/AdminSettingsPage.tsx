import { useEffect, useRef, useState } from "react";
import { toast } from "sonner";
import { Building2, Receipt, QrCode, Upload, ImageOff } from "lucide-react";
import { Card, CardBody, CardHeader, CardTitle, Spinner } from "@/components/ui/Card";
import { Button } from "@/components/ui/Button";
import { Field, Input } from "@/components/ui/Input";
import {
  useSetting,
  useUpsertSetting,
  usePaymentQrUrl,
  useUploadSettingImage,
} from "./api";
import { apiErrorMessage } from "@/lib/axios";

export function AdminSettingsPage() {
  return (
    <div className="grid grid-cols-1 gap-6 lg:grid-cols-2">
      <BusinessInfoCard />
      <TaxCard />
      <PaymentQrCard />
    </div>
  );
}

function BusinessInfoCard() {
  const setting = useSetting("business_info");
  const upsert = useUpsertSetting();
  const [form, setForm] = useState({ name: "", address: "", phone: "", email: "" });

  useEffect(() => {
    if (setting.data?.value) {
      const v = setting.data.value as Record<string, string>;
      setForm({ name: v.name ?? "", address: v.address ?? "", phone: v.phone ?? "", email: v.email ?? "" });
    }
  }, [setting.data]);

  const save = async () => {
    try {
      await upsert.mutateAsync({ key: "business_info", value: form });
      toast.success("Business info saved");
    } catch (err) {
      toast.error(apiErrorMessage(err));
    }
  };

  const set = (k: keyof typeof form) => (e: React.ChangeEvent<HTMLInputElement>) => setForm({ ...form, [k]: e.target.value });

  return (
    <Card>
      <CardHeader>
        <CardTitle>
          <span className="inline-flex items-center gap-2"><Building2 className="h-4 w-4 text-primary" /> Business info</span>
        </CardTitle>
      </CardHeader>
      <CardBody className="space-y-4">
        {setting.isLoading ? (
          <Spinner />
        ) : (
          <>
            <Field label="Business name"><Input value={form.name} onChange={set("name")} placeholder="Your company name" /></Field>
            <Field label="Address"><Input value={form.address} onChange={set("address")} /></Field>
            <div className="grid grid-cols-2 gap-3">
              <Field label="Phone"><Input value={form.phone} onChange={set("phone")} /></Field>
              <Field label="Email"><Input value={form.email} onChange={set("email")} /></Field>
            </div>
            <Button onClick={save} loading={upsert.isPending}>Save</Button>
          </>
        )}
      </CardBody>
    </Card>
  );
}

function TaxCard() {
  const setting = useSetting("tax");
  const upsert = useUpsertSetting();
  const [rate, setRate] = useState("");

  useEffect(() => {
    if (setting.data?.value) {
      const v = setting.data.value as Record<string, unknown>;
      setRate(v.default_rate != null ? String(v.default_rate) : "");
    }
  }, [setting.data]);

  const save = async () => {
    try {
      await upsert.mutateAsync({ key: "tax", value: { default_rate: Number(rate) || 0 } });
      toast.success("Tax settings saved");
    } catch (err) {
      toast.error(apiErrorMessage(err));
    }
  };

  return (
    <Card>
      <CardHeader>
        <CardTitle>
          <span className="inline-flex items-center gap-2"><Receipt className="h-4 w-4 text-accent" /> Tax</span>
        </CardTitle>
      </CardHeader>
      <CardBody className="space-y-4">
        <Field label="Default tax rate (%)" hint="Used as the suggested rate for new products.">
          <Input type="number" step="0.01" value={rate} onChange={(e) => setRate(e.target.value)} placeholder="13" />
        </Field>
        <Button onClick={save} loading={upsert.isPending}>Save</Button>
      </CardBody>
    </Card>
  );
}

function PaymentQrCard() {
  const qr = usePaymentQrUrl();
  const upload = useUploadSettingImage("payment-qr");
  const inputRef = useRef<HTMLInputElement>(null);

  const onFile = async (file: File | undefined) => {
    if (!file) return;
    if (!["image/png", "image/jpeg", "image/webp"].includes(file.type)) {
      toast.error("Please upload a PNG, JPEG, or WebP image.");
      return;
    }
    try {
      await upload.mutateAsync(file);
      toast.success("Payment QR updated");
    } catch (err) {
      toast.error(apiErrorMessage(err, "Couldn't upload QR"));
    }
  };

  return (
    <Card className="lg:col-span-2">
      <CardHeader>
        <CardTitle>
          <span className="inline-flex items-center gap-2"><QrCode className="h-4 w-4 text-primary" /> Payment QR code</span>
        </CardTitle>
      </CardHeader>
      <CardBody className="flex flex-col items-start gap-4 sm:flex-row sm:items-center">
        <div className="flex h-40 w-40 items-center justify-center rounded-xl border border-border bg-surface-2">
          {qr.isLoading ? (
            <Spinner />
          ) : qr.data?.url ? (
            <img src={qr.data.url} alt="Payment QR" className="h-full w-full rounded-xl bg-white object-contain p-2" />
          ) : (
            <div className="flex flex-col items-center gap-2 text-muted">
              <ImageOff className="h-6 w-6" />
              <span className="text-xs">No QR set</span>
            </div>
          )}
        </div>
        <div className="space-y-2">
          <p className="text-sm text-muted">
            Customers scan this code at checkout when paying by QR. Upload a clear PNG or JPEG.
          </p>
          <input
            ref={inputRef}
            type="file"
            accept="image/png,image/jpeg,image/webp"
            className="hidden"
            onChange={(e) => onFile(e.target.files?.[0])}
          />
          <Button onClick={() => inputRef.current?.click()} loading={upload.isPending}>
            <Upload className="h-4 w-4" /> {qr.data?.url ? "Replace QR" : "Upload QR"}
          </Button>
        </div>
      </CardBody>
    </Card>
  );
}
