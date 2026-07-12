import type { ReactNode } from "react";

/**
 * @modal is a parallel route slot: empty by default (see @modal/default.tsx),
 * and filled with the intercepted task-detail route when a card is clicked
 * from the board. Direct navigation/refresh on /tasks/[id] bypasses this
 * entirely and renders the full page instead (see app/(dashboard)/tasks).
 */
export default function BoardLayout({
  children,
  modal,
}: {
  children: ReactNode;
  modal: ReactNode;
}) {
  return (
    <>
      {children}
      {modal}
    </>
  );
}
