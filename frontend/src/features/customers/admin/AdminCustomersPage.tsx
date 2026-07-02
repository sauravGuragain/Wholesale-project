import { useEffect, useMemo, useState } from "react";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { z } from "zod";
import { toast } from "sonner";
import { Plus, Search, Pencil, KeyRound, Ban, CheckCircle2 } from "lucide-react";
import { Button } from "@/components/ui/Button";
import { Badge } from "@/components/ui/Card";
import { Input, Field } from "@/components/ui/Input";
import { Modal, ConfirmDialog } from "@/components/ui/Modal";
import { DataTable, Pagination, type Column } from "@/components/ui/DataTable";
import {
  useCustomers,
  useCreateCustomer,
  useUpdateCustomer,
  useResetCustomerPassword,
} from "./api";
import { apiErrorMessage } from "@/lib/axios";
import { formatCurrency } from "@/lib/utils";
import type { Customer } from "@/types/api";

const PAGE_SIZE = 15;

function useDebounced<T>(value: T, delay = 350): T {
  const [v, setV] = useState(value);
  useEffect(() => {
    const id = setTimeout(() => setV(value), delay);
    return () => clearTimeout(id);
  }, [value, delay]);
  return v;
}

const createSchema = z.object({
  username: z.string().min(3, "At least 3 characters"),
  password: z.string().min(8, "At least 8 characters"),
  business_name: z.string().min(1, "Required"),
  contact_person: z.string().optional(),
  phone: z.string().optional(),
  address: z.string().optional(),
  credit_limit: z.string().optional(),
});
type CreateForm = z.infer<typeof createSchema>;

export function AdminCustomersPage() {
  const [search, setSearch] = useState("");
  const [page, setPage] = useState(1);
  const debounced = useDebounced(search);
  useEffect(() => setPage(1), [debounced]);

  const params = useMemo(() => ({ search: debounced || undefined, page, page_size: PAGE_SIZE }), [debounced, page]);
  const { data, isLoading, isError, refetch } = useCustomers(params);
  const createMut = useCreateCustomer();
  const updateMut = useUpdateCustomer();
  const resetMut = useResetCustomerPassword();

  const [createOpen, setCreateOpen] = useState(false);
  const [editing, setEditing] = useState<Customer | null>(null);
  const [resetting, setResetting] = useState<Customer | null>(null);
  const [toggling, setToggling] = useState<Customer | null>(null);

  const columns: Column<Customer>[] = [
    {
      key: "business",
      header: "Business",
      sortValue: (c) => c.business_name.toLowerCase(),
      cell: (c) => (
        <div>
          <p className="font-medium text-content">{c.business_name}</p>
          <p className="text-xs text-muted">{c.contact_person || "—"}{c.phone ? ` · ${c.phone}` : ""}</p>
        </div>
      ),
    },
    { key: "credit", header: "Credit limit", align: "right", cell: (c) => formatCurrency(c.credit_limit) },
    { key: "balance", header: "Outstanding", align: "right", cell: (c) => <span className={Number(c.outstanding_balance) > 0 ? "text-warning" : "text-muted"}>{formatCurrency(c.outstanding_balance)}</span> },
    {
      key: "status",
      header: "Status",
      align: "center",
      cell: (c) => (c.is_active ? <Badge tone="success">Active</Badge> : <Badge tone="danger">Disabled</Badge>),
    },
    {
      key: "actions",
      header: "",
      align: "right",
      cell: (c) => (
        <div className="flex justify-end gap-1">
          <button onClick={(e) => { e.stopPropagation(); setEditing(c); }} className="rounded-md p-1.5 text-muted hover:bg-surface-2 hover:text-primary" aria-label="Edit">
            <Pencil className="h-4 w-4" />
          </button>
          <button onClick={(e) => { e.stopPropagation(); setResetting(c); }} className="rounded-md p-1.5 text-muted hover:bg-surface-2 hover:text-accent" aria-label="Reset password">
            <KeyRound className="h-4 w-4" />
          </button>
          <button onClick={(e) => { e.stopPropagation(); setToggling(c); }} className="rounded-md p-1.5 text-muted hover:bg-surface-2 hover:text-danger" aria-label={c.is_active ? "Disable" : "Enable"}>
            {c.is_active ? <Ban className="h-4 w-4" /> : <CheckCircle2 className="h-4 w-4" />}
          </button>
        </div>
      ),
    },
  ];

  return (
    <div className="space-y-4">
      <div className="flex flex-col gap-3 sm:flex-row sm:items-center">
        <div className="relative flex-1">
          <Search className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted" />
          <Input value={search} onChange={(e) => setSearch(e.target.value)} placeholder="Search customers…" className="pl-9" />
        </div>
        <Button onClick={() => setCreateOpen(true)}>
          <Plus className="h-4 w-4" /> New customer
        </Button>
      </div>

      <DataTable
        columns={columns}
        rows={data?.items ?? []}
        rowKey={(c) => c.id}
        loading={isLoading}
        error={isError ? "Couldn't load customers." : null}
        onRetry={() => refetch()}
        onRowClick={(c) => setEditing(c)}
        empty={{ title: "No customers", description: "Create customer accounts so they can log in and order." }}
      />

      {data && data.total > PAGE_SIZE && (
        <Pagination page={page} pageSize={PAGE_SIZE} total={data.total} onPageChange={setPage} />
      )}

      {createOpen && <CreateCustomerModal onClose={() => setCreateOpen(false)} createMut={createMut} />}
      {editing && <EditCustomerModal customer={editing} onClose={() => setEditing(null)} updateMut={updateMut} />}
      {resetting && <ResetPasswordModal customer={resetting} onClose={() => setResetting(null)} resetMut={resetMut} />}

      <ConfirmDialog
        open={Boolean(toggling)}
        onClose={() => setToggling(null)}
        onConfirm={async () => {
          if (!toggling) return;
          try {
            await updateMut.mutateAsync({ id: toggling.id, payload: { is_active: !toggling.is_active } });
            toast.success(toggling.is_active ? "Customer disabled" : "Customer enabled");
            setToggling(null);
          } catch (err) {
            toast.error(apiErrorMessage(err));
          }
        }}
        title={toggling?.is_active ? "Disable customer" : "Enable customer"}
        message={
          toggling?.is_active
            ? `"${toggling?.business_name}" will be logged out and blocked from signing in.`
            : `"${toggling?.business_name}" will be able to sign in again.`
        }
        confirmLabel={toggling?.is_active ? "Disable" : "Enable"}
        danger={toggling?.is_active}
        loading={updateMut.isPending}
      />
    </div>
  );
}

function CreateCustomerModal({ onClose, createMut }: { onClose: () => void; createMut: ReturnType<typeof useCreateCustomer> }) {
  const { register, handleSubmit, formState: { errors } } = useForm<CreateForm>({ resolver: zodResolver(createSchema) });
  const onSubmit = async (v: CreateForm) => {
    try {
      await createMut.mutateAsync({
        username: v.username,
        password: v.password,
        business_name: v.business_name,
        contact_person: v.contact_person || null,
        phone: v.phone || null,
        address: v.address || null,
        credit_limit: v.credit_limit || "0",
      });
      toast.success("Customer created");
      onClose();
    } catch (err) {
      toast.error(apiErrorMessage(err, "Couldn't create customer"));
    }
  };
  return (
    <Modal
      open
      onClose={onClose}
      title="New customer"
      description="Creates a login and business profile. There is no public signup."
      size="lg"
      footer={
        <>
          <Button variant="outline" onClick={onClose}>Cancel</Button>
          <Button onClick={handleSubmit(onSubmit)} loading={createMut.isPending}>Create customer</Button>
        </>
      }
    >
      <form onSubmit={handleSubmit(onSubmit)} className="grid grid-cols-1 gap-4 sm:grid-cols-2">
        <Field label="Login username" error={errors.username?.message} required>
          <Input placeholder="acme_traders" {...register("username")} />
        </Field>
        <Field label="Temporary password" error={errors.password?.message} required>
          <Input type="text" placeholder="Min 8 characters" {...register("password")} />
        </Field>
        <Field label="Business name" error={errors.business_name?.message} required className="sm:col-span-2">
          <Input placeholder="Acme Traders Pvt Ltd" {...register("business_name")} />
        </Field>
        <Field label="Contact person"><Input {...register("contact_person")} /></Field>
        <Field label="Phone"><Input {...register("phone")} /></Field>
        <Field label="Address" className="sm:col-span-2"><Input {...register("address")} /></Field>
        <Field label="Credit limit"><Input type="number" step="0.01" placeholder="0.00" {...register("credit_limit")} /></Field>
      </form>
    </Modal>
  );
}

function EditCustomerModal({ customer, onClose, updateMut }: { customer: Customer; onClose: () => void; updateMut: ReturnType<typeof useUpdateCustomer> }) {
  const [form, setForm] = useState({
    business_name: customer.business_name,
    contact_person: customer.contact_person ?? "",
    phone: customer.phone ?? "",
    address: customer.address ?? "",
    credit_limit: customer.credit_limit,
  });
  const save = async () => {
    try {
      await updateMut.mutateAsync({
        id: customer.id,
        payload: {
          business_name: form.business_name,
          contact_person: form.contact_person || null,
          phone: form.phone || null,
          address: form.address || null,
          credit_limit: form.credit_limit,
        },
      });
      toast.success("Customer updated");
      onClose();
    } catch (err) {
      toast.error(apiErrorMessage(err));
    }
  };
  const set = (k: keyof typeof form) => (e: React.ChangeEvent<HTMLInputElement>) => setForm({ ...form, [k]: e.target.value });
  return (
    <Modal
      open
      onClose={onClose}
      title="Edit customer"
      size="lg"
      footer={
        <>
          <Button variant="outline" onClick={onClose}>Cancel</Button>
          <Button onClick={save} loading={updateMut.isPending}>Save</Button>
        </>
      }
    >
      <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
        <Field label="Business name" required className="sm:col-span-2"><Input value={form.business_name} onChange={set("business_name")} /></Field>
        <Field label="Contact person"><Input value={form.contact_person} onChange={set("contact_person")} /></Field>
        <Field label="Phone"><Input value={form.phone} onChange={set("phone")} /></Field>
        <Field label="Address" className="sm:col-span-2"><Input value={form.address} onChange={set("address")} /></Field>
        <Field label="Credit limit"><Input type="number" step="0.01" value={form.credit_limit} onChange={set("credit_limit")} /></Field>
      </div>
    </Modal>
  );
}

function ResetPasswordModal({ customer, onClose, resetMut }: { customer: Customer; onClose: () => void; resetMut: ReturnType<typeof useResetCustomerPassword> }) {
  const [pw, setPw] = useState("");
  const save = async () => {
    if (pw.length < 8) {
      toast.error("Password must be at least 8 characters.");
      return;
    }
    try {
      await resetMut.mutateAsync({ id: customer.id, new_password: pw });
      toast.success("Password reset");
      onClose();
    } catch (err) {
      toast.error(apiErrorMessage(err));
    }
  };
  return (
    <Modal
      open
      onClose={onClose}
      title="Reset password"
      description={`Set a new password for ${customer.business_name}.`}
      size="sm"
      footer={
        <>
          <Button variant="outline" onClick={onClose}>Cancel</Button>
          <Button onClick={save} loading={resetMut.isPending}>Reset</Button>
        </>
      }
    >
      <Field label="New password" required>
        <Input type="text" value={pw} onChange={(e) => setPw(e.target.value)} placeholder="Min 8 characters" />
      </Field>
    </Modal>
  );
}
