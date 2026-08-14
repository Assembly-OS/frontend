import { redirect } from "next/navigation";
import { hasAdminSession, isConfigured } from "@/lib/admin-auth";
import { Icon } from "@/components/icons";
import { AdminLoginForm } from "./admin-login-form";

export const dynamic = "force-dynamic";

export default async function AdminLoginPage() {
  if (await hasAdminSession()) redirect("/admin");

  return (
    <main className="grid min-h-dvh place-items-center bg-navy-950 px-6 py-12">
      <div className="w-full max-w-sm">
        <div className="mb-8 flex items-center gap-3">
          <span className="grid size-11 place-items-center rounded-xl bg-gold-500 text-navy-950">
            <Icon name="shield" className="size-5" />
          </span>
          <div>
            <p className="text-sm font-bold tracking-[0.2em] text-white">
              ADMIN
            </p>
            <p className="text-xs text-white/50">Assembly OS</p>
          </div>
        </div>

        <AdminLoginForm configured={isConfigured()} />
      </div>
    </main>
  );
}
