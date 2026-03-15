import { redirect } from "next/navigation";
import { requireAuth } from "@/lib/auth";

export default async function NewTrackingRequestPage() {
  const user = await requireAuth();

  if (user.role === "ADMIN") {
    redirect("/tracking");
  }

  redirect("/requests");
}
