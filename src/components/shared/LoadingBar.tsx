
'use client';

import { motion } from 'framer-motion';

export function LoadingBar() {
  return (
    <div className="fixed top-0 left-0 w-full h-1 z-[999] bg-primary/20 overflow-hidden">
      <motion.div
        className="h-full bg-primary"
        initial={{ x: '-100%' }}
        animate={{ x: '100%' }}
        transition={{
          repeat: Infinity,
          repeatType: 'loop',
          duration: 1.5,
          ease: 'linear',
        }}
      />
    </div>
  );
}
