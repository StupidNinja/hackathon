import { useEffect } from "react";
import { useFieldArray, useForm } from "react-hook-form";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { zodResolver } from "@hookform/resolvers/zod";
import { Link, Navigate, useNavigate } from "react-router-dom";
import { toast } from "sonner";
import { Trash2, UserPlus } from "lucide-react";
import { z } from "zod";
import {
  getProfile,
  getTeamWithMembers,
  saveTeamWithMembers,
} from "@/common/api/supabase";
import { useAuthStore } from "@/common/auth/authStore";
import { ErrorScreen, LoadingScreen } from "@/common/components/loading-screen";
import { Badge } from "@/common/components/ui/badge";
import { Button } from "@/common/components/ui/button";
import { usePageTitle } from "@/common/hooks/use-page-title";
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

const optionalEmailSchema = z
  .string()
  .trim()
  .max(254, "Email is too long")
  .refine((value) => value.length === 0 || z.email().safeParse(value).success, {
    message: "Enter a valid email",
  });

const memberSchema = z.object({
  firstName: z.string().trim().min(1, "First name is required"),
  lastName: z.string().trim().min(1, "Last name is required"),
  email: optionalEmailSchema,
  phone: z.string().trim().max(32, "Phone is too long"),
  telegram: z.string().trim().max(64, "Telegram handle is too long"),
});

const teamFormSchema = z.object({
  teamName: z.string().trim().min(1, "Team name is required"),
  members: z
    .array(memberSchema)
    .min(1, "Add at least one additional member (2 total including captain)")
    .max(3, "A team can have at most 4 members including captain"),
});

type TeamFormValues = z.infer<typeof teamFormSchema>;

const createEmptyMember = () => ({
  firstName: "",
  lastName: "",
  email: "",
  phone: "",
  telegram: "",
});

const emptyTeamFormValues: TeamFormValues = {
  teamName: "",
  members: [createEmptyMember()],
};

export function OnboardingTeamView() {
  usePageTitle("Team Setup");
  const user = useAuthStore((state) => state.user);
  const userId = user?.id;
  const navigate = useNavigate();
  const queryClient = useQueryClient();

  const form = useForm<TeamFormValues>({
    resolver: zodResolver(teamFormSchema),
    defaultValues: emptyTeamFormValues,
  });

  const {
    control,
    reset,
    formState: { isSubmitting },
  } = form;

  const { fields, append, remove } = useFieldArray({ control, name: "members" });

  const profileQuery = useQuery({
    queryKey: ["onboarding", "profile", userId],
    queryFn: () => getProfile(userId!),
    enabled: Boolean(userId),
  });

  const teamQuery = useQuery({
    queryKey: ["onboarding", "team", userId],
    queryFn: () => getTeamWithMembers(userId!),
    enabled: Boolean(userId),
  });

  useEffect(() => {
    if (!teamQuery.isSuccess) {
      return;
    }

    const team = teamQuery.data.team;
    const members = teamQuery.data.members
      .filter((member) => !member.is_captain)
      .map((member) => ({
        firstName: member.first_name ?? "",
        lastName: member.last_name ?? "",
        email: member.email ?? "",
        phone: member.phone ?? "",
        telegram: member.telegram ?? "",
      }));

    reset({
      teamName: team?.name ?? "",
      members: members.length > 0 ? members : [createEmptyMember()],
    });
  }, [reset, teamQuery.data, teamQuery.isSuccess]);

  const onSubmit = async (values: TeamFormValues) => {
    if (!user || !userId) {
      toast.error("Your session is not available. Please sign in again.");
      return;
    }

    const profile = profileQuery.data;

    if (!profile) {
      toast.error("Complete your profile first.");
      void navigate("/profile");
      return;
    }

    try {
      await saveTeamWithMembers({
        captainId: userId,
        teamName: values.teamName,
        captain: {
          userId,
          firstName: profile.first_name ?? "",
          lastName: profile.last_name ?? "",
          email: user.email ?? null,
          phone: profile.phone ?? null,
          telegram: profile.telegram ?? null,
        },
        members: values.members.map((member) => ({
          firstName: member.firstName,
          lastName: member.lastName,
          email: member.email,
          phone: member.phone,
          telegram: member.telegram,
        })),
      });

      await queryClient.invalidateQueries({ queryKey: ["onboarding"] });

      toast.success("Team saved");
      void navigate("/dashboard");
    } catch (error) {
      const message =
        error instanceof Error ? error.message : "Failed to save team";
      toast.error(message);
    }
  };

  if (!userId) return null;

  if (profileQuery.isPending || teamQuery.isPending) {
    return <LoadingScreen message="Loading team form…" />;
  }

  if (profileQuery.isError || teamQuery.isError) {
    return <ErrorScreen message="Failed to load team data." />;
  }

  const profile = profileQuery.data;

  if (!profile) return <Navigate to="/profile" replace />;
  if (!profile.first_name || !profile.last_name) return <Navigate to="/profile" replace />;
  if (profile.role !== "team") return <Navigate to="/dashboard" replace />;

  return (
    <div className="space-y-4">
      <Form {...form}>
        <form
          className="space-y-4"
          onSubmit={(e) => { void form.handleSubmit(onSubmit)(e); }}
        >
            {/* Team name */}
            <Card className="shadow-sm">
              <CardHeader>
                <CardTitle>Team details</CardTitle>
                <CardDescription>
                  Set your team name and add 1–3 more participants (2–4 total including you).
                </CardDescription>
              </CardHeader>
              <CardContent>
                <FormField
                  control={control}
                  name="teamName"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>Team name</FormLabel>
                      <FormControl>
                        <Input placeholder="e.g. Quantum Foxes" disabled={isSubmitting} {...field} />
                      </FormControl>
                      <FormMessage />
                    </FormItem>
                  )}
                />
              </CardContent>
            </Card>

            {/* Captain (read-only) */}
            <Card className="shadow-sm">
              <CardHeader className="pb-3">
                <div className="flex items-center justify-between">
                  <CardTitle className="text-base">Captain (you)</CardTitle>
                  <Badge variant="outline">Auto-filled</Badge>
                </div>
              </CardHeader>
              <CardContent>
                <div className="grid gap-3 sm:grid-cols-2">
                  <div className="grid gap-1.5">
                    <span className="text-xs font-medium text-muted-foreground">First name</span>
                    <Input value={profile.first_name ?? ""} disabled />
                  </div>
                  <div className="grid gap-1.5">
                    <span className="text-xs font-medium text-muted-foreground">Last name</span>
                    <Input value={profile.last_name ?? ""} disabled />
                  </div>
                  <div className="grid gap-1.5">
                    <span className="text-xs font-medium text-muted-foreground">Email</span>
                    <Input value={user.email ?? ""} disabled />
                  </div>
                  <div className="grid gap-1.5">
                    <span className="text-xs font-medium text-muted-foreground">Phone</span>
                    <Input value={profile.phone ?? "—"} disabled />
                  </div>
                  {profile.telegram && (
                    <div className="grid gap-1.5 sm:col-span-2">
                      <span className="text-xs font-medium text-muted-foreground">Telegram</span>
                      <Input value={profile.telegram} disabled />
                    </div>
                  )}
                </div>
              </CardContent>
            </Card>

            {/* Additional members */}
            <Card className="shadow-sm">
              <CardHeader className="pb-3">
                <div className="flex items-center justify-between">
                  <div>
                    <CardTitle className="text-base">Additional members</CardTitle>
                    <CardDescription className="mt-0.5 text-xs">
                      {fields.length} of 3 slots used
                    </CardDescription>
                  </div>
                  <Button
                    type="button"
                    variant="outline"
                    size="sm"
                    className="gap-1.5"
                    onClick={() => append(createEmptyMember())}
                    disabled={fields.length >= 3 || isSubmitting}
                  >
                    <UserPlus className="size-3.5" />
                    Add member
                  </Button>
                </div>
              </CardHeader>
              <CardContent className="space-y-4">
                {form.formState.errors.members?.message && (
                  <p className="text-sm text-destructive">
                    {form.formState.errors.members.message}
                  </p>
                )}

                {fields.map((field, index) => (
                  <div key={field.id} className="rounded-lg border p-4 space-y-3">
                    <div className="flex items-center justify-between">
                      <span className="text-sm font-medium">Member {index + 2}</span>
                      <Button
                        type="button"
                        variant="ghost"
                        size="sm"
                        className="h-7 gap-1 text-muted-foreground hover:text-destructive"
                        onClick={() => remove(index)}
                        disabled={fields.length <= 1 || isSubmitting}
                      >
                        <Trash2 className="size-3.5" />
                        Remove
                      </Button>
                    </div>
                    <Separator />
                    <div className="grid gap-3 sm:grid-cols-2">
                      <FormField
                        control={control}
                        name={`members.${index}.firstName`}
                        render={({ field: f }) => (
                          <FormItem>
                            <FormLabel className="text-xs">First name</FormLabel>
                            <FormControl>
                              <Input placeholder="Alex" disabled={isSubmitting} {...f} />
                            </FormControl>
                            <FormMessage />
                          </FormItem>
                        )}
                      />
                      <FormField
                        control={control}
                        name={`members.${index}.lastName`}
                        render={({ field: f }) => (
                          <FormItem>
                            <FormLabel className="text-xs">Last name</FormLabel>
                            <FormControl>
                              <Input placeholder="Kim" disabled={isSubmitting} {...f} />
                            </FormControl>
                            <FormMessage />
                          </FormItem>
                        )}
                      />
                      <FormField
                        control={control}
                        name={`members.${index}.email`}
                        render={({ field: f }) => (
                          <FormItem>
                            <FormLabel className="text-xs">
                              Email{" "}
                              <span className="font-normal text-muted-foreground">(optional)</span>
                            </FormLabel>
                            <FormControl>
                              <Input placeholder="alex@example.com" disabled={isSubmitting} {...f} />
                            </FormControl>
                            <FormMessage />
                          </FormItem>
                        )}
                      />
                      <FormField
                        control={control}
                        name={`members.${index}.phone`}
                        render={({ field: f }) => (
                          <FormItem>
                            <FormLabel className="text-xs">
                              Phone{" "}
                              <span className="font-normal text-muted-foreground">(optional)</span>
                            </FormLabel>
                            <FormControl>
                              <Input placeholder="+7 700 000 0000" disabled={isSubmitting} {...f} />
                            </FormControl>
                            <FormMessage />
                          </FormItem>
                        )}
                      />
                      <FormField
                        control={control}
                        name={`members.${index}.telegram`}
                        render={({ field: f }) => (
                          <FormItem className="sm:col-span-2">
                            <FormLabel className="text-xs">
                              Telegram{" "}
                              <span className="font-normal text-muted-foreground">(optional)</span>
                            </FormLabel>
                            <FormControl>
                              <Input placeholder="@username" disabled={isSubmitting} {...f} />
                            </FormControl>
                            <FormMessage />
                          </FormItem>
                        )}
                      />
                    </div>
                  </div>
                ))}
              </CardContent>
            </Card>

            <div className="flex flex-wrap gap-3">
              <Button type="submit" disabled={isSubmitting}>
                {isSubmitting ? "Saving…" : "Save team"}
              </Button>
              <Button type="button" variant="outline" asChild>
                <Link to="/profile">← Back to profile</Link>
              </Button>
            </div>
          </form>
        </Form>
    </div>
  );
}
