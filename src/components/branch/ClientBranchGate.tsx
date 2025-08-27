"use client";

import React from 'react';
import BranchPicker, { BranchGate } from './BranchPicker';

export default function ClientBranchGate({ children }: { children: React.ReactNode }) {
  return <BranchGate>{children}</BranchGate>;
}
