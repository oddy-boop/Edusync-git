"use client";

import * as React from "react";

export function AuthFooterNote({ children }: { children: React.ReactNode }) {
  return (
    <p className="text-xs text-muted-foreground text-center">{children}</p>
  );
}

export default AuthFooterNote;
