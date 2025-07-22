import { useToast } from "@/hooks/use-toast";
import { useAuth } from "@/lib/auth-context";

export function useAdminAction() {
  const { isAdmin, isLoading } = useAuth();
  const { toast } = useToast();

  return async function ensureAdmin<T>(action: () => Promise<T>, actionName: string): Promise<T> {
    if (isLoading) {
      toast({
        title: "System Busy",
        description: "Verifying permissions...",
        variant: "default"
      });
      throw new Error("AUTH_STATE_PENDING");
    }
    
    if (!isAdmin) {
      toast({
        title: "Admin Required",
        description: "You need admin privileges for this action",
        variant: "destructive"
      });
      throw new Error("CURRENT_ADMIN_NOT_AUTHENTICATED");
    }

    return action();
  };
}