
import Link from 'next/link';
import { cn } from "@/lib/utils";
import Image from "next/image";
import { School } from 'lucide-react';

interface LogoProps {
  size?: 'sm' | 'md' | 'lg';
  className?: string;
  schoolName?: string | null;
  imageUrl?: string | null;
  updated_at?: string;
}

export function Logo({ size = 'md', className, schoolName, imageUrl, updated_at }: LogoProps) {
  let imageSizeClass;
  let textSizeClass;

  switch (size) {
    case 'sm':
      textSizeClass = 'text-xl';
      imageSizeClass = { width: 36, height: 36 }; 
      break;
    case 'lg':
      textSizeClass = 'text-3xl';
      imageSizeClass = { width: 56, height: 56 };
      break;
    case 'md':
    default:
      textSizeClass = 'text-2xl';
      imageSizeClass = { width: 48, height: 48 };
      break;
  }
 
  const displayName = schoolName || "EduSync Platform";
  
  const generateCacheBustingUrl = (url: string | null | undefined, timestamp: string | undefined) => {
    if (!url) return null;
    const cacheKey = timestamp ? `?t=${new Date(timestamp).getTime()}` : '';
    return `${url}${cacheKey}`;
  }
  
  const finalImageUrl = generateCacheBustingUrl(imageUrl, updated_at);

  return (
    <Link href="/" className={cn(
        "flex items-center gap-3 hover:opacity-80 transition-opacity font-headline font-bold text-primary",
        className
      )}
    >
      {finalImageUrl ? (
          <Image
            src={finalImageUrl}
            alt={`${displayName} Logo`}
            width={imageSizeClass.width}
            height={imageSizeClass.height}
            className="object-cover rounded-full"
            priority
          />
      ) : (
        <div className="bg-primary text-primary-foreground p-2 rounded-full">
          <School size={size === 'sm' ? 18 : 24} />
        </div>
      )}
       <span className={cn(textSizeClass)}>
            {displayName}
        </span>
    </Link>
  );
}
