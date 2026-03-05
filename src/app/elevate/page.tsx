import { redirect } from "next/navigation";
import { ElevateForm } from "@/app/elevate/elevate-form";
import { requireAuth } from "@/lib/auth";

export default async function ElevatePage() {
  const user = await requireAuth();

  if (user.role === "ADMIN") {
    redirect("/queue");
  }

  return (
    <div className="flex min-h-screen items-center justify-center bg-slate-50 px-4 py-10">
      <ElevateForm />
    </div>
  );
}
