import { useState } from "react";
import { toast } from "sonner";
import { signOut } from "@/common/api/supabase";
import { useAuthStore } from "@/common/auth/authStore";
import { Button } from "@/common/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/common/components/ui/card";

export function HomeProtectedView() {
  const [isSigningOut, setIsSigningOut] = useState(false);
  const user = useAuthStore((state) => state.user);

  const handleSignOut = async () => {
    setIsSigningOut(true);

    const { error } = await signOut();

    if (error) {
      toast.error(error.message);
      setIsSigningOut(false);
      return;
    }

    toast.success("Signed out");
    setIsSigningOut(false);
  };

  return (
    <div className="mx-auto flex min-h-screen w-full max-w-3xl items-center px-4">
      <Card className="w-full">
        <CardHeader>
          <CardTitle>You are signed in</CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          <p className="text-sm text-muted-foreground">
            Logged in as: <span className="font-medium">{user?.email ?? "Unknown user"}</span>
          </p>
          <Button type="button" onClick={() => void handleSignOut()} disabled={isSigningOut}>
            {isSigningOut ? "Signing out..." : "Sign out"}
          </Button>
        </CardContent>
      </Card>
    </div>
  );
}
