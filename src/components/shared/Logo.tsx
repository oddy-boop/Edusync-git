
import Link from 'next/link';
import { cn } from "@/lib/utils";
import Image from "next/image";

interface LogoProps {
  size?: 'sm' | 'md' | 'lg';
  className?: string;
  schoolName?: string | null;
  imageUrl?: string | null;
  updated_at?: string;
}

export function Logo({ size = 'md', className, schoolName, imageUrl, updated_at }: LogoProps) {
  let textSizeClass;
  let imageSizeClass;

  switch (size) {
    case 'sm':
      textSizeClass = 'text-xl';
      imageSizeClass = { width: 100, height: 24 };
      break;
    case 'lg':
      textSizeClass = 'text-3xl';
      imageSizeClass = { width: 140, height: 44 };
      break;
    case 'md':
    default:
      textSizeClass = 'text-2xl';
      imageSizeClass = { width: 120, height: 32 };
      break;
  }

  const displayName = schoolName || "EduSync";
  
  const generateCacheBustingUrl = (url: string | null | undefined, timestamp: string | undefined) => {
    if (!url) return null;
    const cacheKey = timestamp ? `?t=${new Date(timestamp).getTime()}` : '';
    return `${url}${cacheKey}`;
  }
  
  const finalImageUrl = generateCacheBustingUrl(imageUrl, updated_at);

  return (
    <Link href="/" className={cn(
        "flex items-center hover:opacity-80 transition-opacity font-headline font-bold text-primary",
        className
      )}
    >
      {finalImageUrl ? (
        <Image
          src={finalImageUrl}
          alt={`${displayName} Logo`}
          width={imageSizeClass.width}
          height={imageSizeClass.height}
          className="object-contain"
          style={{ width: 'auto', height: 'auto' }}
          priority
        />
      ) : (
        <span className={cn(textSizeClass)}>
          {displayName}
        </span>
      )}
    </Link>
  );
}
