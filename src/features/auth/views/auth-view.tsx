import { useState } from "react";
import { useForm } from "react-hook-form";
import { z } from "zod";
import { zodResolver } from "@hookform/resolvers/zod";
import { toast } from "sonner";
import { useNavigate } from "react-router-dom";
import { Eye, EyeOff } from "lucide-react";
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
import {
  Form,
  FormControl,
  FormField,
  FormItem,
  FormLabel,
  FormMessage,
} from "@/common/components/ui/form";
import { Input } from "@/common/components/ui/input";
import { Separator } from "@/common/components/ui/separator";
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

function GoogleIcon() {
  return (
    <svg
      xmlns="http://www.w3.org/2000/svg"
      viewBox="0 0 24 24"
      className="size-4"
      aria-hidden="true"
    >
      <path
        d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92c-.26 1.37-1.04 2.53-2.21 3.31v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.09z"
        fill="#4285F4"
      />
      <path
        d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z"
        fill="#34A853"
      />
      <path
        d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.07H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.93l2.85-2.22.81-.62z"
        fill="#FBBC05"
      />
      <path
        d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.07l3.66 2.84c.87-2.6 3.3-4.53 6.16-4.53z"
        fill="#EA4335"
      />
    </svg>
  );
}

export function AuthView() {
  const [mode, setMode] = useState<AuthMode>("sign-in");
  const [isOAuthLoading, setIsOAuthLoading] = useState(false);
  const [showPassword, setShowPassword] = useState(false);
  const navigate = useNavigate();

  const form = useForm<AuthFormValues>({
    resolver: zodResolver(authSchema),
    defaultValues: { email: "", password: "" },
  });

  const { isSubmitting } = form.formState;
  const isLoading = isSubmitting || isOAuthLoading;

  const onSubmit = async (values: AuthFormValues) => {
    if (mode === "sign-in") {
      const { error } = await signInWithPassword(values.email, values.password);
      if (error) { toast.error(error.message); return; }
      toast.success("Welcome back!");
      void navigate("/");
      return;
    }

    const { data, error } = await signUpWithPassword(values.email, values.password);
    if (error) { toast.error(error.message); return; }

    if (data.session) {
      toast.success("Account created!");
      void navigate("/");
      return;
    }

    toast.success("Check your email to verify your account, then sign in.");
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

  const handleModeChange = (value: string) => {
    setMode(value as AuthMode);
    form.clearErrors();
  };

  return (
    <div className="flex min-h-screen w-full items-center justify-center bg-muted/40 px-4 py-12">
      <div className="w-full max-w-sm space-y-6">
        <div className="space-y-1 text-center">
          <h1 className="text-2xl font-bold tracking-tight">Hackathon 2026</h1>
          <p className="text-sm text-muted-foreground">Team registration portal</p>
        </div>

        <Card className="shadow-md">
          <CardHeader className="pb-4">
            <CardTitle className="text-lg">
              {mode === "sign-in" ? "Sign in to your account" : "Create an account"}
            </CardTitle>
            <CardDescription>
              {mode === "sign-in"
                ? "Enter your credentials to continue."
                : "Fill in your details to register."}
            </CardDescription>
          </CardHeader>

          <CardContent className="space-y-5">
            <Tabs value={mode} onValueChange={handleModeChange}>
              <TabsList className="grid w-full grid-cols-2">
                <TabsTrigger value="sign-in">Sign in</TabsTrigger>
                <TabsTrigger value="sign-up">Sign up</TabsTrigger>
              </TabsList>
            </Tabs>

            <Form {...form}>
              <form
                className="space-y-4"
                onSubmit={(e) => { void form.handleSubmit(onSubmit)(e); }}
              >
                <FormField
                  control={form.control}
                  name="email"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>Email</FormLabel>
                      <FormControl>
                        <Input
                          type="email"
                          placeholder="you@example.com"
                          autoComplete="email"
                          disabled={isLoading}
                          {...field}
                        />
                      </FormControl>
                      <FormMessage />
                    </FormItem>
                  )}
                />

                <FormField
                  control={form.control}
                  name="password"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>Password</FormLabel>
                      <FormControl>
                        <div className="relative">
                          <Input
                            type={showPassword ? "text" : "password"}
                            placeholder={mode === "sign-up" ? "Min. 8 characters" : "••••••••"}
                            autoComplete={mode === "sign-in" ? "current-password" : "new-password"}
                            disabled={isLoading}
                            className="pr-10"
                            {...field}
                          />
                          <button
                            type="button"
                            tabIndex={-1}
                            className="absolute right-3 top-1/2 -translate-y-1/2 text-muted-foreground transition-colors hover:text-foreground"
                            onClick={() => setShowPassword((v) => !v)}
                            aria-label={showPassword ? "Hide password" : "Show password"}
                          >
                            {showPassword ? <EyeOff className="size-4" /> : <Eye className="size-4" />}
                          </button>
                        </div>
                      </FormControl>
                      <FormMessage />
                    </FormItem>
                  )}
                />

                <Button className="w-full" type="submit" disabled={isLoading}>
                  {isSubmitting
                    ? "Please wait…"
                    : mode === "sign-in"
                      ? "Sign in"
                      : "Create account"}
                </Button>
              </form>
            </Form>

            <div className="flex items-center gap-3">
              <Separator className="flex-1" />
              <span className="shrink-0 text-xs text-muted-foreground">or</span>
              <Separator className="flex-1" />
            </div>

            <Button
              className="w-full gap-2"
              type="button"
              variant="outline"
              disabled={isLoading}
              onClick={() => void handleGoogleSignIn()}
            >
              <GoogleIcon />
              {isOAuthLoading ? "Redirecting…" : "Continue with Google"}
            </Button>

            {mode === "sign-up" && (
              <p className="text-center text-xs text-muted-foreground">
                Email verification is required for email/password sign-up.
              </p>
            )}
          </CardContent>
        </Card>
      </div>
    </div>
  );
}
