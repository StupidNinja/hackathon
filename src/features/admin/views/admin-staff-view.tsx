import { useMemo, useState } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { z } from "zod";
import { toast } from "sonner";
import { UserPlus, Copy, Check } from "lucide-react";
import { getStaffUsers } from "@/common/api/supabase";
import { createStaffUser } from "@/common/api/supabase";
import { useAdminContext } from "@/common/layouts/admin-guard-layout/admin-guard-layout";
import { Button } from "@/common/components/ui/button";
import {
  Card,
  CardContent,
  CardHeader,
  CardTitle,
} from "@/common/components/ui/card";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogFooter,
} from "@/common/components/ui/dialog";
import {
  Form,
  FormControl,
  FormField,
  FormItem,
  FormLabel,
  FormMessage,
} from "@/common/components/ui/form";
import { Input } from "@/common/components/ui/input";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/common/components/ui/table";
import { Skeleton } from "@/common/components/ui/skeleton";
import { usePageTitle } from "@/common/hooks/use-page-title";
import { useI18n } from "@/common/i18n/use-i18n";

const dateFormatter = new Intl.DateTimeFormat("ru-RU", {
  dateStyle: "short",
  timeStyle: "short",
});

function formatDate(value: string): string {
  const d = new Date(value);
  return Number.isNaN(d.getTime()) ? value : dateFormatter.format(d);
}

type StaffRole = "admin" | "jury";

type AddFormValues = {
  email: string;
  firstName: string;
  lastName: string;
};

function useAddSchema() {
  const { t } = useI18n();
  return useMemo(
    () =>
      z.object({
        email: z
          .string()
          .min(1, t("validation.emailRequired"))
          .email(t("validation.validEmail"))
          .max(255, t("validation.emailTooLong")),
        firstName: z.string().min(1, t("validation.firstNameRequired")).max(100),
        lastName: z.string().min(1, t("validation.lastNameRequired")).max(100),
      }),
    [t],
  );
}

export function AdminStaffView() {
  const { t } = useI18n();
  const { isSuperAdmin } = useAdminContext();
  usePageTitle(t("admin.staff.pageTitle"));

  const queryClient = useQueryClient();
  const staffQuery = useQuery({
    queryKey: ["staff-users"],
    queryFn: getStaffUsers,
  });

  // Dialog state
  const [addDialogRole, setAddDialogRole] = useState<StaffRole | null>(null);
  const [passwordResult, setPasswordResult] = useState<{
    email: string;
    firstName: string;
    lastName: string;
    role: StaffRole;
    password: string;
  } | null>(null);
  const [copied, setCopied] = useState(false);

  const schema = useAddSchema();
  const form = useForm<AddFormValues>({
    resolver: zodResolver(schema),
    defaultValues: { email: "", firstName: "", lastName: "" },
  });

  const createMutation = useMutation({
    mutationFn: (values: AddFormValues & { role: StaffRole }) =>
      createStaffUser(values),
    onSuccess: (result) => {
      setAddDialogRole(null);
      form.reset();
      setPasswordResult({
        email: result.email,
        firstName: result.firstName,
        lastName: result.lastName,
        role: result.role,
        password: result.password,
      });
      void queryClient.invalidateQueries({ queryKey: ["staff-users"] });
    },
    onError: (error) => {
      toast.error(error instanceof Error ? error.message : t("admin.staff.create.error"));
    },
  });

  const openAdd = (role: StaffRole) => {
    form.reset();
    setAddDialogRole(role);
  };

  const handleCopy = async () => {
    if (!passwordResult) return;
    await navigator.clipboard.writeText(passwordResult.password);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  const juryUsers = staffQuery.data?.filter((u) => u.role === "jury") ?? [];
  const adminUsers = staffQuery.data?.filter((u) => u.role === "admin") ?? [];

  const roleLabel = (role: StaffRole) =>
    role === "admin" ? t("admin.staff.roles.admin") : t("admin.staff.roles.jury");

  return (
    <div className="space-y-5">
      {/* Jury section */}
      <StaffSection
        title={t("admin.staff.roles.jury")}
        users={juryUsers}
        isLoading={staffQuery.isPending}
        isError={staffQuery.isError}
        onAdd={() => openAdd("jury")}
      />

      {/* Admin section — only for super admins */}
      {isSuperAdmin && (
        <StaffSection
          title={t("admin.staff.roles.admin")}
          users={adminUsers}
          isLoading={staffQuery.isPending}
          isError={staffQuery.isError}
          onAdd={() => openAdd("admin")}
        />
      )}

      {/* Add user Dialog */}
      <Dialog
        open={addDialogRole !== null}
        onOpenChange={(open) => {
          if (!open) {
            setAddDialogRole(null);
            form.reset();
          }
        }}
      >
        <DialogContent className="sm:max-w-md">
          <DialogHeader>
            <DialogTitle>
              {t("admin.staff.create.title", {
                role: addDialogRole ? roleLabel(addDialogRole) : "",
              })}
            </DialogTitle>
          </DialogHeader>
          <Form {...form}>
            <form
              className="space-y-4"
              onSubmit={(e) =>
                void form.handleSubmit((values) => {
                  if (createMutation.isPending) return;
                  createMutation.mutate({ ...values, role: addDialogRole! });
                })(e)
              }
            >
              <FormField
                control={form.control}
                name="email"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>{t("admin.staff.table.email")}</FormLabel>
                    <FormControl>
                      <Input
                        type="email"
                        placeholder="example@email.com"
                        autoComplete="off"
                        disabled={createMutation.isPending}
                        {...field}
                      />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />
              <FormField
                control={form.control}
                name="firstName"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>{t("admin.staff.form.firstName")}</FormLabel>
                    <FormControl>
                      <Input
                        placeholder={t("admin.staff.form.firstNamePlaceholder")}
                        disabled={createMutation.isPending}
                        {...field}
                      />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />
              <FormField
                control={form.control}
                name="lastName"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>{t("admin.staff.form.lastName")}</FormLabel>
                    <FormControl>
                      <Input
                        placeholder={t("admin.staff.form.lastNamePlaceholder")}
                        disabled={createMutation.isPending}
                        {...field}
                      />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />
              <DialogFooter>
                <Button
                  type="button"
                  variant="outline"
                  onClick={() => {
                    setAddDialogRole(null);
                    form.reset();
                  }}
                  disabled={createMutation.isPending}
                >
                  {t("common.cancel")}
                </Button>
                <Button type="submit" disabled={createMutation.isPending}>
                  {createMutation.isPending
                    ? t("admin.staff.create.submitting")
                    : t("admin.staff.create.submit")}
                </Button>
              </DialogFooter>
            </form>
          </Form>
        </DialogContent>
      </Dialog>

      {/* Password reveal Dialog — intentionally not dismissable via outside click or Escape
           because the password cannot be recovered if accidentally closed. */}
      <Dialog
        open={passwordResult !== null}
        onOpenChange={(open) => {
          if (!open) {
            setPasswordResult(null);
            setCopied(false);
          }
        }}
      >
        <DialogContent
          className="sm:max-w-md"
          onPointerDownOutside={(e) => e.preventDefault()}
          onEscapeKeyDown={(e) => e.preventDefault()}
        >
          <DialogHeader>
            <DialogTitle>{t("admin.staff.password.title")}</DialogTitle>
          </DialogHeader>
          <div className="space-y-3 py-2">
            <p className="text-sm text-muted-foreground">
              {t("admin.staff.password.desc", {
                name: passwordResult
                  ? `${passwordResult.firstName} ${passwordResult.lastName}`
                  : "",
              })}
            </p>
            <div className="flex items-center gap-2 rounded-md border bg-muted px-3 py-2">
              <code className="flex-1 select-all font-mono text-sm">
                {passwordResult?.password}
              </code>
              <Button
                variant="ghost"
                size="icon"
                className="h-7 w-7 shrink-0"
                onClick={() => void handleCopy()}
              >
                {copied ? (
                  <Check className="size-4 text-green-600" />
                ) : (
                  <Copy className="size-4" />
                )}
              </Button>
            </div>
            <p className="text-xs text-muted-foreground">{t("admin.staff.password.warning")}</p>
          </div>
          <DialogFooter>
            <Button
              onClick={() => {
                setPasswordResult(null);
                setCopied(false);
              }}
            >
              {t("common.close")}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}

type StaffSectionProps = {
  title: string;
  users: Array<{
    id: string;
    email: string | null;
    first_name: string | null;
    last_name: string | null;
    role: string;
    created_at: string;
  }>;
  isLoading: boolean;
  isError: boolean;
  onAdd: () => void;
};

function StaffSection({ title, users, isLoading, isError, onAdd }: StaffSectionProps) {
  const { t } = useI18n();
  return (
    <Card>
      <CardHeader className="pb-3">
        <div className="flex items-center justify-between">
          <CardTitle className="text-base">{title}</CardTitle>
          <Button size="sm" variant="outline" onClick={onAdd}>
            <UserPlus className="mr-2 size-4" />
            {t("admin.staff.create.add")}
          </Button>
        </div>
      </CardHeader>
      <CardContent>
        {isLoading && (
          <div className="space-y-2">
            {[0, 1, 2].map((i) => (
              <Skeleton key={i} className="h-8 w-full" />
            ))}
          </div>
        )}
        {isError && (
          <p className="text-sm text-destructive">{t("admin.staff.list.error")}</p>
        )}
        {!isLoading && !isError && users.length === 0 && (
          <p className="text-sm text-muted-foreground">{t("admin.staff.list.empty")}</p>
        )}
        {!isLoading && !isError && users.length > 0 && (
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>{t("admin.staff.table.name")}</TableHead>
                <TableHead>{t("admin.staff.table.email")}</TableHead>
                <TableHead className="hidden sm:table-cell">
                  {t("admin.staff.table.created")}
                </TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {users.map((user) => (
                <TableRow key={user.id}>
                  <TableCell className="font-medium">
                    {[user.first_name, user.last_name].filter(Boolean).join(" ") || "—"}
                  </TableCell>
                  <TableCell className="text-muted-foreground">{user.email ?? "—"}</TableCell>
                  <TableCell className="hidden text-sm text-muted-foreground sm:table-cell">
                    {formatDate(user.created_at)}
                  </TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
        )}
      </CardContent>
    </Card>
  );
}

