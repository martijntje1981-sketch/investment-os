/**
 * Portfolio update event helpers shared by portfolio surfaces.
 */

export function shouldHandlePortfolioUpdatedEvent(
  eventUserSub: string | undefined,
  currentUserSub: string,
): boolean {
  if (eventUserSub && eventUserSub !== currentUserSub) {
    return false;
  }

  return true;
}

export function createPortfolioUpdatedHandler(
  userSub: string,
  reload: () => void,
): (event: Event) => void {
  return (event: Event) => {
    const detail = (event as CustomEvent<{ userSub?: string }>).detail;
    if (!shouldHandlePortfolioUpdatedEvent(detail?.userSub, userSub)) {
      return;
    }

    reload();
  };
}
