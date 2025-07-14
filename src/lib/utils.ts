import { clsx, type ClassValue } from "clsx"
import { twMerge } from "tailwind-merge"

export function cn(...inputs: ClassValue[]) {
  return twMerge(clsx(inputs))
}

export function getSubdomain(hostname: string): string | null {
  const parts = hostname.split('.');
  
  // Handle localhost cases, e.g., "sjm.localhost"
  if (parts.length > 1 && parts[parts.length - 1] === 'localhost') {
    if (parts.length > 2) {
      return parts[0];
    }
    return null;
  }
  
  // Handle standard domains like "sjm.example.com"
  if (parts.length > 2) {
    // Avoid common subdomains like 'www'
    if (parts[0] === 'www') {
      return null;
    }
    return parts[0];
  }
  
  return null;
}
