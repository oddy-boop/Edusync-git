
"use client";

import React from 'react';
import dynamic from 'next/dynamic';
import { Loader2 } from 'lucide-react';

const QRCodeScanner = dynamic(
  () => import('@/components/shared/QRCodeScanner'),
  { 
    ssr: false,
    loading: () => (
      <div className="flex justify-center items-center py-10">
        <Loader2 className="h-8 w-8 animate-spin" />
        <p className="ml-2">Loading Scanner...</p>
      </div>
    )
  }
);

export default function TeacherAttendancePage() {
  return <QRCodeScanner />;
}
