import { useEffect } from "react";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { z } from "zod";
import { toast } from "sonner";
import { Modal } from "@/components/ui/Modal";
import { Button } from "@/components/ui/Button";
import { Field, Input, Select } from "@/components/ui/Input";
import { useCategories, useBrands, useCreateProduct, useUpdateProduct, type ProductPayload } from "../api";
import { apiErrorMessage } from "@/lib/axios";
import type { Product } from "@/types/api";

const schema = z.object({
  name: z.string().min(1, "Name is required"),
  sku: z.string().min(1, "SKU is required"),
  barcode: z.string().optional(),
  category_id: z.string().min(1, "Choose a category"),
  brand_id: z.string().optional(),
  unit: z.string().min(1, "Unit is required"),
  cost_price: z.string().min(1, "Required"),
  selling_price: z.string().min(1, "Required"),
  tax_rate: z.string().min(1, "Required"),
  is_active: z.boolean(),
});
type FormValues = z.infer<typeof schema>;

interface Props {
  open: boolean;
  onClose: () => void;
  product?: Product | null; // present => edit mode
}

export function ProductFormModal({ open, onClose, product }: Props) {
  const isEdit = Boolean(product);
  const categories = useCategories();
  const brands = useBrands();
  const createMut = useCreateProduct();
  const updateMut = useUpdateProduct();

  const {
    register,
    handleSubmit,
    reset,
    formState: { errors },
  } = useForm<FormValues>({
    resolver: zodResolver(schema),
    defaultValues: {
      unit: "pcs",
      cost_price: "0",
      tax_rate: "0",
      is_active: true,
    },
  });

  // Load values when opening in edit mode; reset to blanks for create.
  useEffect(() => {
    if (!open) return;
    if (product) {
      reset({
        name: product.name,
        sku: product.sku,
        barcode: product.barcode ?? "",
        category_id: product.category_id,
        brand_id: product.brand_id ?? "",
        unit: product.unit,
        cost_price: product.cost_price,
        selling_price: product.selling_price,
        tax_rate: product.tax_rate,
        is_active: product.is_active,
      });
    } else {
      reset({ name: "", sku: "", barcode: "", category_id: "", brand_id: "", unit: "pcs", cost_price: "0", selling_price: "", tax_rate: "0", is_active: true });
    }
  }, [open, product, reset]);

  const onSubmit = async (values: FormValues) => {
    const payload: ProductPayload = {
      ...values,
      barcode: values.barcode || null,
      brand_id: values.brand_id || null,
    };
    try {
      if (isEdit && product) {
        await updateMut.mutateAsync({ id: product.id, payload });
        toast.success("Product updated");
      } else {
        await createMut.mutateAsync(payload);
        toast.success("Product created");
      }
      onClose();
    } catch (err) {
      toast.error(apiErrorMessage(err, "Couldn't save product"));
    }
  };

  const saving = createMut.isPending || updateMut.isPending;

  return (
    <Modal
      open={open}
      onClose={onClose}
      title={isEdit ? "Edit product" : "New product"}
      description={isEdit ? "Update the product details below." : "Add a product to your catalog."}
      size="lg"
      footer={
        <>
          <Button variant="outline" onClick={onClose} type="button">
            Cancel
          </Button>
          <Button onClick={handleSubmit(onSubmit)} loading={saving}>
            {isEdit ? "Save changes" : "Create product"}
          </Button>
        </>
      }
    >
      <form onSubmit={handleSubmit(onSubmit)} className="grid grid-cols-1 gap-4 sm:grid-cols-2">
        <Field label="Name" error={errors.name?.message} required className="sm:col-span-2">
          <Input placeholder="e.g. Basmati Rice 5kg" {...register("name")} />
        </Field>
        <Field label="SKU" error={errors.sku?.message} required>
          <Input placeholder="RICE-5KG" disabled={isEdit} {...register("sku")} />
        </Field>
        <Field label="Barcode" error={errors.barcode?.message}>
          <Input placeholder="Optional" {...register("barcode")} />
        </Field>
        <Field label="Category" error={errors.category_id?.message} required>
          <Select {...register("category_id")}>
            <option value="">Select…</option>
            {categories.data?.map((c) => (
              <option key={c.id} value={c.id}>
                {c.name}
              </option>
            ))}
          </Select>
        </Field>
        <Field label="Brand" error={errors.brand_id?.message}>
          <Select {...register("brand_id")}>
            <option value="">None</option>
            {brands.data?.map((b) => (
              <option key={b.id} value={b.id}>
                {b.name}
              </option>
            ))}
          </Select>
        </Field>
        <Field label="Unit" error={errors.unit?.message} required>
          <Input placeholder="pcs, kg, pack, box" {...register("unit")} />
        </Field>
        <Field label="Tax rate (%)" error={errors.tax_rate?.message} required>
          <Input type="number" step="0.01" {...register("tax_rate")} />
        </Field>
        <Field label="Cost price" error={errors.cost_price?.message} required>
          <Input type="number" step="0.01" {...register("cost_price")} />
        </Field>
        <Field label="Selling price" error={errors.selling_price?.message} required>
          <Input type="number" step="0.01" placeholder="0.00" {...register("selling_price")} />
        </Field>
        <label className="flex items-center gap-2 sm:col-span-2">
          <input type="checkbox" className="h-4 w-4 rounded border-border" {...register("is_active")} />
          <span className="text-sm text-content">Active (visible to customers)</span>
        </label>
      </form>
    </Modal>
  );
}
