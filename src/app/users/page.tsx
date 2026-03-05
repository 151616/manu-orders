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
        <h1 className="text-2xl font-semibold text-black">Users</h1>
        <p className="text-sm text-black/70">
          User records are no longer part of authentication.
        </p>
      </header>

      <div className="rounded-lg border border-black/10 bg-white p-4 text-sm text-black/75">
        Team roles are granted by shared access codes and session claims. There is
        no editable user table in this build.
      </div>
    </section>
  );
}
