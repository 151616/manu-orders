import { redirect } from "next/navigation";
import { requireAuth } from "@/lib/auth";

export default async function NewOrderRequestPage() {
  const user = await requireAuth();

  if (user.role === "ADMIN") {
    redirect("/orders/new");
  }

  redirect("/requests");
}
