import { useState } from "react";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { z } from "zod";
import { toast } from "sonner";
import { Plus, Pencil, Trash2 } from "lucide-react";
import { Button } from "@/components/ui/Button";
import { Badge } from "@/components/ui/Card";
import { Modal, ConfirmDialog } from "@/components/ui/Modal";
import { Field, Input, Select } from "@/components/ui/Input";
import { DataTable, type Column } from "@/components/ui/DataTable";
import { useOffers, useCreateOffer, useUpdateOffer, useDeleteOffer } from "./api";
import { apiErrorMessage } from "@/lib/axios";
import { formatCurrency, humanize } from "@/lib/utils";
import type { Offer } from "@/types/api";

const schema = z.object({
  name: z.string().min(1, "Name is required"),
  description: z.string().optional(),
  discount_type: z.enum(["percent", "flat"]),
  discount_value: z.string().min(1, "Required"),
  applies_to: z.enum(["order", "product", "category"]),
  min_order_value: z.string().optional(),
  is_active: z.boolean(),
});
type FormValues = z.infer<typeof schema>;

export function AdminOffersPage() {
  const offers = useOffers(false);
  const createMut = useCreateOffer();
  const updateMut = useUpdateOffer();
  const deleteMut = useDeleteOffer();

  const [formOpen, setFormOpen] = useState(false);
  const [editing, setEditing] = useState<Offer | null>(null);
  const [deleting, setDeleting] = useState<Offer | null>(null);

  const { register, handleSubmit, reset, formState: { errors } } = useForm<FormValues>({
    resolver: zodResolver(schema),
    defaultValues: { discount_type: "percent", applies_to: "order", is_active: true },
  });

  const openCreate = () => {
    setEditing(null);
    reset({ name: "", description: "", discount_type: "percent", discount_value: "", applies_to: "order", min_order_value: "", is_active: true });
    setFormOpen(true);
  };
  const openEdit = (o: Offer) => {
    setEditing(o);
    reset({
      name: o.name,
      description: o.description ?? "",
      discount_type: o.discount_type,
      discount_value: o.discount_value,
      applies_to: o.applies_to,
      min_order_value: o.min_order_value ?? "",
      is_active: o.is_active,
    });
    setFormOpen(true);
  };

  const onSubmit = async (values: FormValues) => {
    const payload = {
      ...values,
      description: values.description || null,
      min_order_value: values.min_order_value || null,
      // target_id omitted here; order-scope offers don't need one. Product/category
      // targeting is a follow-up once a target picker is added.
      target_id: null,
    };
    try {
      if (editing) {
        await updateMut.mutateAsync({ id: editing.id, payload });
        toast.success("Offer updated");
      } else {
        await createMut.mutateAsync(payload);
        toast.success("Offer created");
      }
      setFormOpen(false);
    } catch (err) {
      toast.error(apiErrorMessage(err, "Couldn't save offer"));
    }
  };

  const confirmDelete = async () => {
    if (!deleting) return;
    try {
      await deleteMut.mutateAsync(deleting.id);
      toast.success("Offer deleted");
      setDeleting(null);
    } catch (err) {
      toast.error(apiErrorMessage(err, "Couldn't delete offer"));
    }
  };

  const columns: Column<Offer>[] = [
    { key: "name", header: "Offer", cell: (o) => <span className="font-medium text-content">{o.name}</span> },
    {
      key: "discount",
      header: "Discount",
      cell: (o) => (o.discount_type === "percent" ? `${o.discount_value}%` : formatCurrency(o.discount_value)),
    },
    { key: "scope", header: "Applies to", cell: (o) => <span className="text-muted">{humanize(o.applies_to)}</span> },
    {
      key: "min",
      header: "Min order",
      align: "right",
      cell: (o) => <span className="text-muted">{o.min_order_value ? formatCurrency(o.min_order_value) : "—"}</span>,
    },
    {
      key: "status",
      header: "Status",
      align: "center",
      cell: (o) => (o.is_active ? <Badge tone="success">Active</Badge> : <Badge tone="neutral">Inactive</Badge>),
    },
    {
      key: "actions",
      header: "",
      align: "right",
      cell: (o) => (
        <div className="flex justify-end gap-1">
          <button onClick={(e) => { e.stopPropagation(); openEdit(o); }} className="rounded-md p-1.5 text-muted hover:bg-surface-2 hover:text-primary" aria-label="Edit">
            <Pencil className="h-4 w-4" />
          </button>
          <button onClick={(e) => { e.stopPropagation(); setDeleting(o); }} className="rounded-md p-1.5 text-muted hover:bg-surface-2 hover:text-danger" aria-label="Delete">
            <Trash2 className="h-4 w-4" />
          </button>
        </div>
      ),
    },
  ];

  return (
    <div className="space-y-4">
      <div className="flex justify-end">
        <Button onClick={openCreate}>
          <Plus className="h-4 w-4" /> New offer
        </Button>
      </div>

      <DataTable
        columns={columns}
        rows={offers.data ?? []}
        rowKey={(o) => o.id}
        loading={offers.isLoading}
        error={offers.isError ? "Couldn't load offers." : null}
        onRetry={() => offers.refetch()}
        onRowClick={openEdit}
        empty={{ title: "No offers", description: "Create promotional offers for your customers." }}
      />

      <Modal
        open={formOpen}
        onClose={() => setFormOpen(false)}
        title={editing ? "Edit offer" : "New offer"}
        size="lg"
        footer={
          <>
            <Button variant="outline" onClick={() => setFormOpen(false)}>Cancel</Button>
            <Button onClick={handleSubmit(onSubmit)} loading={createMut.isPending || updateMut.isPending}>
              {editing ? "Save" : "Create"}
            </Button>
          </>
        }
      >
        <form onSubmit={handleSubmit(onSubmit)} className="grid grid-cols-1 gap-4 sm:grid-cols-2">
          <Field label="Name" error={errors.name?.message} required className="sm:col-span-2">
            <Input placeholder="e.g. Diwali 10% off" {...register("name")} />
          </Field>
          <Field label="Discount type" required>
            <Select {...register("discount_type")}>
              <option value="percent">Percentage</option>
              <option value="flat">Flat amount</option>
            </Select>
          </Field>
          <Field label="Discount value" error={errors.discount_value?.message} required>
            <Input type="number" step="0.01" {...register("discount_value")} />
          </Field>
          <Field label="Applies to" required>
            <Select {...register("applies_to")}>
              <option value="order">Whole order</option>
              <option value="product">Product</option>
              <option value="category">Category</option>
            </Select>
          </Field>
          <Field label="Min order value" hint="Optional threshold to unlock the offer.">
            <Input type="number" step="0.01" placeholder="0.00" {...register("min_order_value")} />
          </Field>
          <Field label="Description" className="sm:col-span-2">
            <Input placeholder="Shown to customers" {...register("description")} />
          </Field>
          <label className="flex items-center gap-2 sm:col-span-2">
            <input type="checkbox" className="h-4 w-4 rounded border-border" {...register("is_active")} />
            <span className="text-sm text-content">Active</span>
          </label>
        </form>
      </Modal>

      <ConfirmDialog
        open={Boolean(deleting)}
        onClose={() => setDeleting(null)}
        onConfirm={confirmDelete}
        title="Delete offer"
        message={`"${deleting?.name}" will be removed permanently.`}
        confirmLabel="Delete"
        danger
        loading={deleteMut.isPending}
      />
    </div>
  );
}
