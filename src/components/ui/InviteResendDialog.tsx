"use client";

import React, { useEffect, useState, useRef } from 'react';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription, DialogFooter } from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Loader2, RefreshCw, Mail } from 'lucide-react';

type InviteResendDialogProps = {
  email: string;
  open: boolean;
  onClose: () => void;
  resendEndpoint?: string; // defaults to /api/admin/resend-invite
  initialCountdownSeconds?: number; // seconds until resend is enabled
};

export default function InviteResendDialog({ email, open, onClose, resendEndpoint = '/api/admin/resend-invite', initialCountdownSeconds = 30 }: InviteResendDialogProps) {
  const [countdown, setCountdown] = useState<number>(initialCountdownSeconds);
  const [isResending, setIsResending] = useState(false);
  const [lastSentMessage, setLastSentMessage] = useState<string | null>(null);
  const intervalRef = useRef<number | null>(null);

  useEffect(() => {
    setLastSentMessage(null);
    setIsResending(false);
    setCountdown(initialCountdownSeconds);
    if (!open) return;

    // start countdown
    if (intervalRef.current) window.clearInterval(intervalRef.current);
    intervalRef.current = window.setInterval(() => {
      setCountdown((c) => {
        if (c <= 1) {
          if (intervalRef.current) {
            window.clearInterval(intervalRef.current);
            intervalRef.current = null;
          }
          return 0;
        }
        return c - 1;
      });
    }, 1000);

    return () => {
      if (intervalRef.current) {
        window.clearInterval(intervalRef.current);
        intervalRef.current = null;
      }
    };
  }, [open, initialCountdownSeconds]);

  const handleResend = async () => {
    setIsResending(true);
    try {
      const res = await fetch(resendEndpoint, { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ email }) });
      const json = await res.json();
      if (json?.success) {
        setLastSentMessage(json.message || `Invitation resent to ${email}.`);
        // restart cooldown
        setCountdown(initialCountdownSeconds);
        if (intervalRef.current) window.clearInterval(intervalRef.current);
        intervalRef.current = window.setInterval(() => {
          setCountdown((c) => {
            if (c <= 1) {
              if (intervalRef.current) {
                window.clearInterval(intervalRef.current);
                intervalRef.current = null;
              }
              return 0;
            }
            return c - 1;
          });
        }, 1000);
      } else {
        setLastSentMessage(json?.message || 'Could not resend invite.');
      }
    } catch (err: any) {
      setLastSentMessage(err?.message || 'Network error while resending invite.');
    } finally {
      setIsResending(false);
    }
  };

  return (
    <Dialog open={open} onOpenChange={(v) => { if (!v) onClose(); }}>
      <DialogContent className="sm:max-w-[520px]">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2"><Mail className="h-5 w-5"/> Invitation Sent</DialogTitle>
          <DialogDescription>
            An invitation was sent to <strong>{email}</strong>. Ask the recipient to check their email (and spam/junk).
          </DialogDescription>
        </DialogHeader>
        <div className="py-4">
          <p className="text-sm text-muted-foreground">You can resend the invitation after the cooldown finishes.</p>
          <div className="mt-3 flex items-center gap-3">
            <div className="text-lg font-mono">{countdown}s</div>
            <div className="flex-1">
              {lastSentMessage ? <div className="text-sm">{lastSentMessage}</div> : <div className="text-sm text-muted-foreground">Resend is {countdown === 0 ? 'available' : 'disabled'}</div>}
            </div>
          </div>
        </div>
        <DialogFooter>
          <div className="flex gap-2 w-full justify-end">
            <Button variant="ghost" onClick={onClose}>Close</Button>
            <Button onClick={handleResend} disabled={countdown !== 0 || isResending}>
              {isResending ? <><Loader2 className="mr-2 h-4 w-4 animate-spin"/>Resending...</> : <><RefreshCw className="mr-2 h-4 w-4"/>Resend Invite</>}
            </Button>
          </div>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
