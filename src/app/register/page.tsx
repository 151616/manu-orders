import { redirect } from "next/navigation";
import { getSession } from "@/lib/auth";
import { RegisterForm } from "@/app/register/register-form";

export default async function RegisterPage() {
  const user = await getSession();

  // If already logged in, redirect appropriately
  if (user) {
    if (user.permissionLevel === 5) {
      redirect("/pending");
    }
    redirect("/queue");
  }

  return (
    <div className="flex min-h-screen items-center justify-center px-4 py-10">
      <div className="w-full max-w-md rounded-2xl border border-zinc-200/80 bg-white/85 p-4 shadow-lg backdrop-blur-sm sm:p-6 dark:border-white/10 dark:bg-white/5">
        <RegisterForm />
      </div>
    </div>
  );
}
