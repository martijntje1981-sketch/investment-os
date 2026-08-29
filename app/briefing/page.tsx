import { redirect } from "next/navigation";

import { resolveLegacyBriefingRedirect } from "@/lib/navigation/newsHubRoutes";

export default function LegacyBriefingRedirectPage() {
  redirect(resolveLegacyBriefingRedirect());
}
