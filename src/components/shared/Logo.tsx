
import Link from 'next/link';
import { cn } from "@/lib/utils";

interface LogoProps {
  size?: 'sm' | 'md' | 'lg';
  className?: string;
  schoolName?: string | null;
}

export function Logo({ size = 'md', className, schoolName }: LogoProps) {
  let textSizeClass;

  switch (size) {
    case 'sm':
      textSizeClass = 'text-xl';
      break;
    case 'lg':
      textSizeClass = 'text-3xl';
      break;
    case 'md':
    default:
      textSizeClass = 'text-2xl';
      break;
  }

  const displayName = schoolName || "EduSync Platform";

  return (
    <Link href="/" className={cn(
        "flex items-center hover:opacity-80 transition-opacity font-headline font-bold text-primary",
        className
      )}
    >
      <span className={cn(textSizeClass)}>
        {displayName}
      </span>
    </Link>
  );
}
