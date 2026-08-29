/**
 * Root-layout auth providers stay mounted across a server-action login.
 * If we do not already have a user, hold authReady=false while the new
 * route re-reads the session from cookies — Dashboard then waits instead
 * of rendering an empty guest tree.
 */
export function holdAuthReadyUntilSessionRecheck(hasUser: boolean): boolean {
  return !hasUser;
}
