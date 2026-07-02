import { Link } from "react-router-dom";
import { Store, ClipboardList, ShoppingCart, ArrowRight } from "lucide-react";
import { Card, CardBody } from "@/components/ui/Card";
import { useCartStore } from "@/stores/cart";
import { formatCurrency } from "@/lib/utils";

export function CustomerDashboard() {
  const count = useCartStore((s) => s.lines.reduce((sum, l) => sum + l.quantity, 0));
  const subtotal = useCartStore((s) => s.lines.reduce((sum, l) => sum + Number(l.price) * l.quantity, 0));

  const tiles = [
    {
      to: "/shop/catalog",
      icon: Store,
      title: "Browse catalog",
      desc: "Explore products and add them to your cart at your agreed prices.",
      tone: "bg-primary-soft text-primary",
    },
    {
      to: "/shop/orders",
      icon: ClipboardList,
      title: "My orders",
      desc: "Track status, view details, and reorder past purchases in one tap.",
      tone: "bg-accent-soft text-accent",
    },
    {
      to: "/shop/cart",
      icon: ShoppingCart,
      title: "My cart",
      desc: count > 0 ? `${count} item${count === 1 ? "" : "s"} · ${formatCurrency(subtotal)}` : "Your cart is empty.",
      tone: "bg-success/10 text-success",
    },
  ];

  return (
    <div className="space-y-6">
      <Card className="overflow-hidden">
        <div className="bg-primary px-6 py-8 text-primary-fg">
          <h2 className="font-display text-2xl font-extrabold">Welcome back</h2>
          <p className="mt-1 max-w-lg text-sm text-primary-fg/80">
            Place orders, track deliveries, and reorder your regulars. Prices shown are the ones
            agreed for your account.
          </p>
          <Link
            to="/shop/catalog"
            className="mt-4 inline-flex items-center gap-2 rounded-lg bg-white/15 px-4 py-2 text-sm font-medium backdrop-blur transition-colors hover:bg-white/25"
          >
            Start an order <ArrowRight className="h-4 w-4" />
          </Link>
        </div>
      </Card>

      <div className="grid grid-cols-1 gap-4 sm:grid-cols-3">
        {tiles.map((t) => (
          <Link key={t.to} to={t.to}>
            <Card className="h-full transition-shadow hover:shadow-pop">
              <CardBody>
                <div className={`flex h-10 w-10 items-center justify-center rounded-lg ${t.tone}`}>
                  <t.icon className="h-5 w-5" />
                </div>
                <h3 className="mt-3 font-display font-bold text-content">{t.title}</h3>
                <p className="mt-1 text-sm text-muted">{t.desc}</p>
              </CardBody>
            </Card>
          </Link>
        ))}
      </div>
    </div>
  );
}
