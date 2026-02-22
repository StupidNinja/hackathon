import { useEffect } from "react";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { zodResolver } from "@hookform/resolvers/zod";
import { useForm, useWatch } from "react-hook-form";
import { Link, useNavigate } from "react-router-dom";
import { toast } from "sonner";
import { z } from "zod";
import {
  getActiveSchools,
  getProfile,
  upsertProfile,
} from "@/common/api/supabase";
import { useAuthStore } from "@/common/auth/authStore";
import { ErrorScreen, LoadingScreen } from "@/common/components/loading-screen";
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
  FormDescription,
  FormField,
  FormItem,
  FormLabel,
  FormMessage,
} from "@/common/components/ui/form";
import { Input } from "@/common/components/ui/input";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/common/components/ui/select";

const OTHER_SCHOOL_VALUE = "__other__";

const profileFormSchema = z
  .object({
    firstName: z.string().trim().min(1, "First name is required"),
    lastName: z.string().trim().min(1, "Last name is required"),
    phone: z.string().trim().max(32, "Phone is too long"),
    telegram: z.string().trim().max(64, "Telegram handle is too long"),
    grade: z.enum(["10", "11"], {
      error: "Select grade 10 or 11",
    }),
    schoolSelection: z.string().min(1, "Select a school or choose Other"),
    customSchoolName: z.string().trim().max(120, "School name is too long"),
  })
  .superRefine((value, context) => {
    if (
      value.schoolSelection === OTHER_SCHOOL_VALUE &&
      value.customSchoolName.trim().length === 0
    ) {
      context.addIssue({
        code: "custom",
        path: ["customSchoolName"],
        message: "Custom school name is required",
      });
    }
  });

type ProfileFormValues = z.infer<typeof profileFormSchema>;

const emptyProfileFormValues: ProfileFormValues = {
  firstName: "",
  lastName: "",
  phone: "",
  telegram: "",
  grade: "10",
  schoolSelection: "",
  customSchoolName: "",
};

export function EditProfileView() {
  usePageTitle("Edit Profile");
  const user = useAuthStore((state) => state.user);
  const userId = user?.id;
  const navigate = useNavigate();
  const queryClient = useQueryClient();

  const form = useForm<ProfileFormValues>({
    resolver: zodResolver(profileFormSchema),
    defaultValues: emptyProfileFormValues,
  });

  const {
    control,
    reset,
    formState: { isSubmitting },
  } = form;

  const profileQuery = useQuery({
    queryKey: ["onboarding", "profile", userId],
    queryFn: () => getProfile(userId!),
    enabled: Boolean(userId),
  });

  const schoolsQuery = useQuery({
    queryKey: ["schools", "active"],
    queryFn: getActiveSchools,
    enabled: Boolean(userId),
  });

  useEffect(() => {
    if (!profileQuery.isSuccess) return;
    const profile = profileQuery.data;
    if (!profile) { reset(emptyProfileFormValues); return; }

    const schoolSelection =
      profile.school_id ??
      (profile.custom_school_name ? OTHER_SCHOOL_VALUE : "");

    reset({
      firstName: profile.first_name ?? "",
      lastName: profile.last_name ?? "",
      phone: profile.phone ?? "",
      telegram: profile.telegram ?? "",
      grade: profile.grade === 11 ? "11" : "10",
      schoolSelection,
      customSchoolName: profile.custom_school_name ?? "",
    });
  }, [profileQuery.data, profileQuery.isSuccess, reset]);

  const schoolSelection = useWatch({ control, name: "schoolSelection" });
  const showCustomSchoolInput = schoolSelection === OTHER_SCHOOL_VALUE;

  const onSubmit = async (values: ProfileFormValues) => {
    if (!userId) {
      toast.error("Your session is not available. Please sign in again.");
      return;
    }

    try {
      await upsertProfile(userId, {
        firstName: values.firstName,
        lastName: values.lastName,
        phone: values.phone,
        telegram: values.telegram,
        grade: values.grade === "11" ? 11 : 10,
        schoolId:
          values.schoolSelection === OTHER_SCHOOL_VALUE ? null : values.schoolSelection,
        customSchoolName:
          values.schoolSelection === OTHER_SCHOOL_VALUE ? values.customSchoolName : null,
        role: profileQuery.data?.role ?? "team",
      });

      await queryClient.invalidateQueries({ queryKey: ["onboarding"] });
      toast.success("Profile saved!");
      void navigate("/dashboard");
    } catch (error) {
      const message = error instanceof Error ? error.message : "Failed to save profile";
      toast.error(message);
    }
  };

  if (!userId) return null;

  if (profileQuery.isPending || schoolsQuery.isPending) {
    return <LoadingScreen message="Loading profile…" />;
  }

  if (profileQuery.isError || schoolsQuery.isError) {
    return <ErrorScreen message="Failed to load profile data." />;
  }

  const schools = schoolsQuery.data ?? [];

  return (
    <div className="space-y-6">
      <Card className="shadow-sm">
        <CardHeader>
          <CardTitle>Personal information</CardTitle>
          <CardDescription>
            Update your personal details and school information.
          </CardDescription>
        </CardHeader>
        <CardContent>
          <Form {...form}>
            <form
              className="grid gap-5"
              onSubmit={(e) => { void form.handleSubmit(onSubmit)(e); }}
            >
              <div className="grid gap-4 sm:grid-cols-2">
                <FormField
                  control={control}
                  name="firstName"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>First name</FormLabel>
                      <FormControl>
                        <Input placeholder="Alex" disabled={isSubmitting} {...field} />
                      </FormControl>
                      <FormMessage />
                    </FormItem>
                  )}
                />
                <FormField
                  control={control}
                  name="lastName"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>Last name</FormLabel>
                      <FormControl>
                        <Input placeholder="Johnson" disabled={isSubmitting} {...field} />
                      </FormControl>
                      <FormMessage />
                    </FormItem>
                  )}
                />
              </div>

              <div className="grid gap-4 sm:grid-cols-2">
                <FormField
                  control={control}
                  name="phone"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>
                        Phone{" "}
                        <span className="font-normal text-muted-foreground">(optional)</span>
                      </FormLabel>
                      <FormControl>
                        <Input placeholder="+7 700 000 0000" disabled={isSubmitting} {...field} />
                      </FormControl>
                      <FormMessage />
                    </FormItem>
                  )}
                />
                <FormField
                  control={control}
                  name="telegram"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>
                        Telegram{" "}
                        <span className="font-normal text-muted-foreground">(optional)</span>
                      </FormLabel>
                      <FormControl>
                        <Input placeholder="@username" disabled={isSubmitting} {...field} />
                      </FormControl>
                      <FormDescription>Without the @ is also fine.</FormDescription>
                      <FormMessage />
                    </FormItem>
                  )}
                />
              </div>

              <FormField
                control={control}
                name="grade"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Grade</FormLabel>
                    <Select
                      value={field.value}
                      onValueChange={field.onChange}
                      disabled={isSubmitting}
                    >
                      <FormControl>
                        <SelectTrigger className="w-full">
                          <SelectValue placeholder="Select grade" />
                        </SelectTrigger>
                      </FormControl>
                      <SelectContent>
                        <SelectItem value="10">10</SelectItem>
                        <SelectItem value="11">11</SelectItem>
                      </SelectContent>
                    </Select>
                    <FormMessage />
                  </FormItem>
                )}
              />

              <FormField
                control={control}
                name="schoolSelection"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>School</FormLabel>
                    <Select
                      value={field.value}
                      onValueChange={field.onChange}
                      disabled={isSubmitting}
                    >
                      <FormControl>
                        <SelectTrigger className="w-full">
                          <SelectValue placeholder="Select your school" />
                        </SelectTrigger>
                      </FormControl>
                      <SelectContent>
                        {schools.map((school) => (
                          <SelectItem key={school.id} value={school.id}>
                            {school.name_ru}
                          </SelectItem>
                        ))}
                        <SelectItem value={OTHER_SCHOOL_VALUE}>Other school</SelectItem>
                      </SelectContent>
                    </Select>
                    <FormMessage />
                  </FormItem>
                )}
              />

              {showCustomSchoolInput && (
                <FormField
                  control={control}
                  name="customSchoolName"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>School name</FormLabel>
                      <FormControl>
                        <Input
                          placeholder="Enter your school name"
                          disabled={isSubmitting}
                          {...field}
                        />
                      </FormControl>
                      <FormMessage />
                    </FormItem>
                  )}
                />
              )}

              <div className="flex flex-wrap gap-3">
                <Button type="submit" disabled={isSubmitting}>
                  {isSubmitting ? "Saving…" : "Save changes"}
                </Button>
                <Button type="button" variant="outline" asChild>
                  <Link to="/dashboard">Cancel</Link>
                </Button>
              </div>
            </form>
          </Form>
        </CardContent>
      </Card>
    </div>
  );
}
