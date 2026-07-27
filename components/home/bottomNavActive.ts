/**
 * Pure helpers for bottom-navigation active-state resolution.
 * Kept outside the client React module so tests can import without JSX transform issues.
 */

export function isBottomNavItemActive(
  pathname: string | null | undefined,
  href: string,
): boolean {
  const path = pathname ?? "";
  if (href === "/dashboard") {
    return path === "/dashboard";
  }
  return path === href || path.startsWith(`${href}/`);
}
