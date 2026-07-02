import { useState } from "react";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { z } from "zod";
import { useNavigate } from "react-router-dom";
import { toast } from "sonner";
import { Boxes, LogIn } from "lucide-react";
import { Button } from "@/components/ui/Button";
import { Field, Input } from "@/components/ui/Input";
import { ThemeToggle } from "@/components/ui/ThemeToggle";
import { login } from "./api";
import { apiErrorMessage } from "@/lib/axios";

const schema = z.object({
  username: z.string().min(1, "Enter your username"),
  password: z.string().min(1, "Enter your password"),
});
type FormValues = z.infer<typeof schema>;

export function LoginPage() {
  const navigate = useNavigate();
  const [submitting, setSubmitting] = useState(false);
  const {
    register,
    handleSubmit,
    formState: { errors },
  } = useForm<FormValues>({ resolver: zodResolver(schema) });

  const onSubmit = async (values: FormValues) => {
    setSubmitting(true);
    try {
      const { role } = await login(values.username, values.password);
      toast.success("Signed in");
      navigate(role === "admin" ? "/admin" : "/shop", { replace: true });
    } catch (err) {
      toast.error(apiErrorMessage(err, "Could not sign in"));
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <div className="relative flex min-h-full items-center justify-center bg-canvas px-4">
      <div className="absolute right-4 top-4">
        <ThemeToggle />
      </div>

      {/* Left brand rail is hidden on small screens; the card carries the identity there. */}
      <div className="grid w-full max-w-4xl overflow-hidden rounded-2xl border border-border bg-surface shadow-pop md:grid-cols-2">
        <div className="hidden flex-col justify-between bg-primary p-10 text-primary-fg md:flex">
          <div className="flex items-center gap-2">
            <Boxes className="h-7 w-7" />
            <span className="font-display text-lg font-extrabold">Wholesale Console</span>
          </div>
          <div>
            <h1 className="font-display text-3xl font-extrabold leading-tight">
              Ordering, stock, and payments — in one place.
            </h1>
            <p className="mt-3 max-w-sm text-sm text-primary-fg/80">
              The operations hub for your FMCG distribution business. Sign in with the credentials
              your administrator provided.
            </p>
          </div>
          <p className="text-xs text-primary-fg/60">Access is invite-only. There is no public signup.</p>
        </div>

        <div className="p-8 md:p-10">
          <div className="mb-6 flex items-center gap-2 md:hidden">
            <Boxes className="h-6 w-6 text-primary" />
            <span className="font-display text-lg font-extrabold">Wholesale Console</span>
          </div>
          <h2 className="font-display text-2xl font-bold text-content">Sign in</h2>
          <p className="mt-1 text-sm text-muted">Welcome back. Enter your details to continue.</p>

          <form onSubmit={handleSubmit(onSubmit)} className="mt-6 space-y-4">
            <Field label="Username" htmlFor="username" error={errors.username?.message} required>
              <Input id="username" autoComplete="username" placeholder="e.g. acme_traders" {...register("username")} />
            </Field>
            <Field label="Password" htmlFor="password" error={errors.password?.message} required>
              <Input
                id="password"
                type="password"
                autoComplete="current-password"
                placeholder="••••••••"
                {...register("password")}
              />
            </Field>
            <Button type="submit" size="lg" className="w-full" loading={submitting}>
              {!submitting && <LogIn className="h-4 w-4" />}
              Sign in
            </Button>
          </form>
        </div>
      </div>
    </div>
  );
}
