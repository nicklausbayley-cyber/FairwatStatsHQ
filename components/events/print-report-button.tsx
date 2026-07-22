"use client";

import { secondaryButtonClassName } from "../ui/primitives";

export function PrintReportButton() {
  return (
    <button
      type="button"
      onClick={() => window.print()}
      className={`${secondaryButtonClassName} print:hidden`}
    >
      Print Report
    </button>
  );
}
