import { redirect } from "next/navigation";
import { currentUser } from "@/lib/session";
import LoginPage from "./login/page";

/**
 * The root.
 *
 * Signed in, it forwards to the dashboard. Signed out, it *renders* the login
 * page rather than redirecting to it — and that difference matters only in one
 * place, which is exactly the place it kept breaking.
 *
 * Telegram strips the path from a Mini App menu button: set it to `/login` and
 * Telegram stores the origin, so every launch lands here. Telegram then hands
 * the page its identity in the URL fragment (`#tgWebAppData=…`), and a
 * fragment is the one part of a URL a redirect can lose. Serving the page
 * directly keeps the launch on a single request, with nothing to lose in
 * transit.
 */
export default async function Home() {
  if (await currentUser()) redirect("/dashboard");
  return <LoginPage />;
}
