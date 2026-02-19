import { useState } from "react";
import { useForm } from "react-hook-form";
import { z } from "zod";
import { zodResolver } from "@hookform/resolvers/zod";
import { toast } from "sonner";
import { useNavigate } from "react-router-dom";
import {
  signInWithGoogle,
  signInWithPassword,
  signUpWithPassword,
} from "@/common/api/supabase";
import { Button } from "@/common/components/ui/button";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/common/components/ui/card";
import { Input } from "@/common/components/ui/input";
import { Tabs, TabsList, TabsTrigger } from "@/common/components/ui/tabs";

const authSchema = z.object({
  email: z.string().email("Enter a valid email"),
  password: z
    .string()
    .min(8, "Password must be at least 8 characters")
    .max(128, "Password is too long"),
});

type AuthFormValues = z.infer<typeof authSchema>;
type AuthMode = "sign-in" | "sign-up";

export function AuthView() {
  const [mode, setMode] = useState<AuthMode>("sign-in");
  const [isOAuthLoading, setIsOAuthLoading] = useState(false);
  const navigate = useNavigate();

  const {
    register,
    handleSubmit,
    formState: { errors, isSubmitting },
  } = useForm<AuthFormValues>({
    resolver: zodResolver(authSchema),
    defaultValues: {
      email: "",
      password: "",
    },
  });

  const onSubmit = async (values: AuthFormValues) => {
    if (mode === "sign-in") {
      const { error } = await signInWithPassword(values.email, values.password);

      if (error) {
        toast.error(error.message);
        return;
      }

      toast.success("You are signed in");
      navigate("/");
      return;
    }

    const { data, error } = await signUpWithPassword(values.email, values.password);

    if (error) {
      toast.error(error.message);
      return;
    }

    if (data.session) {
      toast.success("Registration complete");
      navigate("/");
      return;
    }

    toast.success("Check your email to verify your account, then sign in");
    setMode("sign-in");
  };

  const handleGoogleSignIn = async () => {
    setIsOAuthLoading(true);

    const { error } = await signInWithGoogle(`${window.location.origin}/`);

    if (error) {
      toast.error(error.message);
      setIsOAuthLoading(false);
    }
  };

  return (
    <div className="mx-auto flex min-h-screen w-full max-w-md items-center px-4">
      <Card className="w-full">
        <CardHeader>
          <CardTitle>Welcome</CardTitle>
          <CardDescription>
            Use email/password or continue with Google.
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          <Tabs value={mode} onValueChange={(value) => setMode(value as AuthMode)}>
            <TabsList className="grid w-full grid-cols-2">
              <TabsTrigger value="sign-in">Sign in</TabsTrigger>
              <TabsTrigger value="sign-up">Sign up</TabsTrigger>
            </TabsList>
          </Tabs>

          <form className="space-y-3" onSubmit={handleSubmit(onSubmit)}>
            <div className="space-y-1">
              <label className="text-sm font-medium" htmlFor="email">
                Email
              </label>
              <Input id="email" type="email" autoComplete="email" {...register("email")} />
              {errors.email && (
                <p className="text-sm text-destructive">{errors.email.message}</p>
              )}
            </div>

            <div className="space-y-1">
              <label className="text-sm font-medium" htmlFor="password">
                Password
              </label>
              <Input
                id="password"
                type="password"
                autoComplete={mode === "sign-in" ? "current-password" : "new-password"}
                {...register("password")}
              />
              {errors.password && (
                <p className="text-sm text-destructive">{errors.password.message}</p>
              )}
            </div>

            <Button className="w-full" type="submit" disabled={isSubmitting || isOAuthLoading}>
              {isSubmitting
                ? "Please wait..."
                : mode === "sign-in"
                  ? "Sign in"
                  : "Create account"}
            </Button>
          </form>

          <div className="relative py-1 text-center text-xs text-muted-foreground">
            <span className="bg-card px-2">or</span>
          </div>

          <Button
            className="w-full"
            type="button"
            variant="outline"
            disabled={isSubmitting || isOAuthLoading}
            onClick={() => void handleGoogleSignIn()}
          >
            {isOAuthLoading ? "Redirecting..." : "Continue with Google"}
          </Button>

          <p className="text-xs text-muted-foreground">
            Email verification is required only for email/password registration.
          </p>
        </CardContent>
      </Card>
    </div>
  );
}
