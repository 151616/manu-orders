import { NewOrderForm } from "@/app/orders/new/new-order-form";
import { requireAdmin } from "@/lib/auth";

export default async function NewOrderPage() {
  const user = await requireAdmin();

  return (
    <section className="space-y-4">
      <NewOrderForm
        defaults={{
          title: "",
          description: "",
          requesterName: user.name,
          priority: 3,
          etaDays: "10",
          vendor: "",
          orderNumber: "",
          orderUrl: "",
          quantity: "",
          category: "OTHER",
        }}
      />
    </section>
  );
}
