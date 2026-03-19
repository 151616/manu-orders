import { redirect } from "next/navigation";
import { getSession, clearSession } from "@/lib/auth";
import { PendingClient } from "@/app/pending/pending-client";

export default async function PendingPage() {
  const user = await getSession();

  if (!user) {
    redirect("/login");
  }

  // If already approved (level 1-4), go to queue
  if (user.permissionLevel <= 4) {
    redirect("/queue");
  }

  return <PendingClient userName={user.name} />;
}
