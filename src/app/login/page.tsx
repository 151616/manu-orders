import { redirect } from "next/navigation";
import { LoginForm } from "@/app/login/login-form";
import { getSession } from "@/lib/auth";

export default async function LoginPage() {
  const user = await getSession();

  if (user) {
    redirect("/queue");
  }

  return (
    <div className="flex min-h-screen items-center justify-center px-4 py-10">
      <div className="w-full max-w-4xl rounded-2xl border border-slate-200/80 bg-white/85 p-4 shadow-lg backdrop-blur-sm sm:p-6">
        <div className="grid gap-6 md:grid-cols-[1.1fr_1fr] md:items-center">
          <section className="space-y-3 rounded-xl bg-slate-50/80 p-5">
            <p className="text-xs font-semibold uppercase tracking-[0.16em] text-slate-500">
              ManuQueue
            </p>
            <h1 className="text-3xl font-bold tracking-tight text-slate-900">
              Manufacturing Orders, organized.
            </h1>
            <p className="text-sm leading-relaxed text-slate-700">
              Track priorities, ETA, bookmarks, and activity in one workflow.
            </p>
          </section>
          <LoginForm />
        </div>
      </div>
    </div>
  );
}
