import { GraduationCap } from 'lucide-react';
import Link from 'next/link';

interface LogoProps {
  size?: 'sm' | 'md' | 'lg';
  className?: string;
}

export function Logo({ size = 'md', className }: LogoProps) {
  const textSizeClass = size === 'lg' ? 'text-3xl' : size === 'md' ? 'text-2xl' : 'text-xl';
  const iconSizeClass = size === 'lg' ? 'h-8 w-8' : size === 'md' ? 'h-6 w-6' : 'h-5 w-5';

  return (
    <Link href="/" className={`flex items-center gap-2 text-primary hover:opacity-80 transition-opacity ${className}`}>
      <GraduationCap className={iconSizeClass} />
      <span className={`font-headline font-semibold ${textSizeClass}`}>St. Joseph's EdTech</span>
    </Link>
  );
}
