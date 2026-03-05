import { redirect } from "next/navigation";
import { requireAuth } from "@/lib/auth";

export default async function UsersPage() {
  const currentUser = await requireAuth();
  if (currentUser.role !== "ADMIN") {
    redirect("/queue");
  }

  return (
    <section className="space-y-4">
      <header className="space-y-1">
        <h1 className="text-2xl font-bold tracking-tight text-black">Users</h1>
        <p className="text-sm text-black/65">
          User records are no longer part of authentication.
        </p>
      </header>

      <div className="rounded-xl border border-slate-200 bg-white/95 p-4 text-sm text-black/75 shadow-sm">
        Team roles are granted by shared access codes and session claims. There is
        no editable user table in this build.
      </div>
    </section>
  );
}
