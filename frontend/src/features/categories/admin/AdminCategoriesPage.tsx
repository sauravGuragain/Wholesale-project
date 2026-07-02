import { useState } from "react";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { z } from "zod";
import { toast } from "sonner";
import { Plus, Pencil, Trash2, Tag } from "lucide-react";
import { Card, CardBody, CardHeader, CardTitle, Badge } from "@/components/ui/Card";
import { Button } from "@/components/ui/Button";
import { Modal, ConfirmDialog } from "@/components/ui/Modal";
import { Field, Input, Select } from "@/components/ui/Input";
import { DataTable, type Column } from "@/components/ui/DataTable";
import { useCategories, useBrands } from "@/features/products/api";
import {
  useCreateCategory,
  useUpdateCategory,
  useDeleteCategory,
  useCreateBrand,
} from "./api";
import { apiErrorMessage } from "@/lib/axios";
import { formatDate } from "@/lib/utils";
import type { Category } from "@/types/api";

const catSchema = z.object({
  name: z.string().min(1, "Name is required"),
  parent_id: z.string().optional(),
});
type CatForm = z.infer<typeof catSchema>;

export function AdminCategoriesPage() {
  const categories = useCategories();
  const brands = useBrands();
  const createCat = useCreateCategory();
  const updateCat = useUpdateCategory();
  const deleteCat = useDeleteCategory();
  const createBrand = useCreateBrand();

  const [formOpen, setFormOpen] = useState(false);
  const [editing, setEditing] = useState<Category | null>(null);
  const [deleting, setDeleting] = useState<Category | null>(null);
  const [brandName, setBrandName] = useState("");

  const { register, handleSubmit, reset, formState: { errors } } = useForm<CatForm>({
    resolver: zodResolver(catSchema),
  });

  const openCreate = () => {
    setEditing(null);
    reset({ name: "", parent_id: "" });
    setFormOpen(true);
  };
  const openEdit = (c: Category) => {
    setEditing(c);
    reset({ name: c.name, parent_id: c.parent_id ?? "" });
    setFormOpen(true);
  };

  const onSubmit = async (values: CatForm) => {
    const payload = { name: values.name, parent_id: values.parent_id || null };
    try {
      if (editing) {
        await updateCat.mutateAsync({ id: editing.id, payload });
        toast.success("Category updated");
      } else {
        await createCat.mutateAsync(payload);
        toast.success("Category created");
      }
      setFormOpen(false);
    } catch (err) {
      toast.error(apiErrorMessage(err, "Couldn't save category"));
    }
  };

  const confirmDelete = async () => {
    if (!deleting) return;
    try {
      await deleteCat.mutateAsync(deleting.id);
      toast.success("Category deleted");
      setDeleting(null);
    } catch (err) {
      toast.error(apiErrorMessage(err, "Couldn't delete category"));
    }
  };

  const addBrand = async () => {
    if (!brandName.trim()) return;
    try {
      await createBrand.mutateAsync(brandName.trim());
      toast.success("Brand added");
      setBrandName("");
    } catch (err) {
      toast.error(apiErrorMessage(err, "Couldn't add brand"));
    }
  };

  const nameById = (id: string | null) =>
    id ? categories.data?.find((c) => c.id === id)?.name ?? "—" : "—";

  const columns: Column<Category>[] = [
    { key: "name", header: "Category", sortValue: (c) => c.name.toLowerCase(), cell: (c) => <span className="font-medium text-content">{c.name}</span> },
    { key: "parent", header: "Parent", cell: (c) => <span className="text-muted">{nameById(c.parent_id)}</span> },
    { key: "slug", header: "Slug", cell: (c) => <code className="text-xs text-muted">{c.slug}</code> },
    { key: "created", header: "Created", cell: (c) => <span className="text-muted">{formatDate(c.created_at)}</span> },
    {
      key: "actions",
      header: "",
      align: "right",
      cell: (c) => (
        <div className="flex justify-end gap-1">
          <button onClick={(e) => { e.stopPropagation(); openEdit(c); }} className="rounded-md p-1.5 text-muted hover:bg-surface-2 hover:text-primary" aria-label="Edit">
            <Pencil className="h-4 w-4" />
          </button>
          <button onClick={(e) => { e.stopPropagation(); setDeleting(c); }} className="rounded-md p-1.5 text-muted hover:bg-surface-2 hover:text-danger" aria-label="Delete">
            <Trash2 className="h-4 w-4" />
          </button>
        </div>
      ),
    },
  ];

  return (
    <div className="grid grid-cols-1 gap-6 lg:grid-cols-3">
      <div className="space-y-4 lg:col-span-2">
        <div className="flex justify-end">
          <Button onClick={openCreate}>
            <Plus className="h-4 w-4" /> New category
          </Button>
        </div>
        <DataTable
          columns={columns}
          rows={categories.data ?? []}
          rowKey={(c) => c.id}
          loading={categories.isLoading}
          error={categories.isError ? "Couldn't load categories." : null}
          onRetry={() => categories.refetch()}
          onRowClick={openEdit}
          empty={{ title: "No categories", description: "Create categories to organise your catalog." }}
        />
      </div>

      {/* Brands panel */}
      <Card className="h-fit">
        <CardHeader>
          <CardTitle>
            <span className="inline-flex items-center gap-2">
              <Tag className="h-4 w-4 text-accent" /> Brands
            </span>
          </CardTitle>
        </CardHeader>
        <CardBody className="space-y-3">
          <div className="flex gap-2">
            <Input
              value={brandName}
              onChange={(e) => setBrandName(e.target.value)}
              placeholder="New brand name"
              onKeyDown={(e) => e.key === "Enter" && addBrand()}
            />
            <Button onClick={addBrand} loading={createBrand.isPending}>
              Add
            </Button>
          </div>
          <div className="flex flex-wrap gap-2">
            {brands.data?.length ? (
              brands.data.map((b) => (
                <Badge key={b.id} tone="neutral">
                  {b.name}
                </Badge>
              ))
            ) : (
              <p className="text-sm text-muted">No brands yet.</p>
            )}
          </div>
        </CardBody>
      </Card>

      <Modal
        open={formOpen}
        onClose={() => setFormOpen(false)}
        title={editing ? "Edit category" : "New category"}
        footer={
          <>
            <Button variant="outline" onClick={() => setFormOpen(false)}>Cancel</Button>
            <Button onClick={handleSubmit(onSubmit)} loading={createCat.isPending || updateCat.isPending}>
              {editing ? "Save" : "Create"}
            </Button>
          </>
        }
      >
        <form onSubmit={handleSubmit(onSubmit)} className="space-y-4">
          <Field label="Name" error={errors.name?.message} required>
            <Input placeholder="e.g. Beverages" {...register("name")} />
          </Field>
          <Field label="Parent category" hint="Optional — leave as none for a top-level category.">
            <Select {...register("parent_id")}>
              <option value="">None (top level)</option>
              {categories.data?.filter((c) => c.id !== editing?.id).map((c) => (
                <option key={c.id} value={c.id}>{c.name}</option>
              ))}
            </Select>
          </Field>
        </form>
      </Modal>

      <ConfirmDialog
        open={Boolean(deleting)}
        onClose={() => setDeleting(null)}
        onConfirm={confirmDelete}
        title="Delete category"
        message={`"${deleting?.name}" will be removed. Categories with subcategories can't be deleted.`}
        confirmLabel="Delete"
        danger
        loading={deleteCat.isPending}
      />
    </div>
  );
}
