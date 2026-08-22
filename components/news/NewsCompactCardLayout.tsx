import type { ReactNode } from "react";

import {
  newsCompactCardActionClass,
  newsCompactCardBodyClass,
  newsCompactCardLayoutClass,
  newsCompactCardMediaClass,
} from "@/components/news/newsCardStyles";

export function NewsCompactCardLayout({
  media,
  children,
  action,
}: {
  media?: ReactNode;
  children: ReactNode;
  action?: ReactNode;
}) {
  return (
    <div className={newsCompactCardLayoutClass}>
      {media ? <div className={newsCompactCardMediaClass}>{media}</div> : null}
      <div className={newsCompactCardBodyClass}>{children}</div>
      {action ? <div className={newsCompactCardActionClass}>{action}</div> : null}
    </div>
  );
}
