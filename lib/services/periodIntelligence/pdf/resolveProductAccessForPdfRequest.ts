/**
 * Compatibility re-export — PDF routes use the shared auth-user resolver.
 */

export { resolveProductAccessFromAuthUser as resolveProductAccessForPdfRequest } from "@/lib/services/productAccess/resolveFromAuthUser";
