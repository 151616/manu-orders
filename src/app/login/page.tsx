import { redirect } from "next/navigation";
import { LoginForm } from "@/app/login/login-form";
import { getSession } from "@/lib/auth";

export default async function LoginPage() {
  const user = await getSession();

  if (user) {
    redirect("/queue");
  }

  return (
    <div className="flex min-h-screen items-center justify-center bg-slate-50 px-4 py-10">
      <LoginForm />
    </div>
  );
}
