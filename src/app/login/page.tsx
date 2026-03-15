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
      <div className="w-full max-w-sm rounded-2xl border border-slate-200/80 bg-white/85 p-4 shadow-lg backdrop-blur-sm sm:p-6 dark:border-white/10 dark:bg-white/5">
        <LoginForm />
      </div>
    </div>
  );
}
