import * as React from "react";
import { useQuery } from "@tanstack/react-query";
import { Check, ChevronsUpDown, Loader2 } from "lucide-react";
import { searchActiveSchools, type SchoolRow } from "@/common/api/supabase";
import { Button } from "@/common/components/ui/button";
import {
  Command,
  CommandGroup,
  CommandInput,
  CommandItem,
  CommandList,
  CommandSeparator,
} from "@/common/components/ui/command";
import {
  Popover,
  PopoverContent,
  PopoverTrigger,
} from "@/common/components/ui/popover";
import { useDebouncedValue } from "@/common/hooks/use-debounced-value";
import { useI18n } from "@/common/i18n/use-i18n";
import { cn } from "@/common/lib/utils";

type SchoolFallback = Pick<SchoolRow, "id" | "name_ru">;

type SchoolSearchSelectProps = {
  value: string;
  onChange: (value: string) => void;
  disabled?: boolean;
  placeholder?: string;
  selectedSchoolFallback?: SchoolFallback | null;
  otherOptionValue?: string;
  otherOptionLabel?: string;
  className?: string;
} & Omit<
  React.ComponentPropsWithoutRef<"button">,
  "value" | "onChange" | "disabled" | "className"
>;

const DEFAULT_OTHER_OPTION_VALUE = "__other__";
const EMPTY_SCHOOLS: SchoolRow[] = [];

export const SchoolSearchSelect = React.forwardRef<
  HTMLButtonElement,
  SchoolSearchSelectProps
>(function SchoolSearchSelect(
  {
    value,
    onChange,
    disabled = false,
    placeholder,
    selectedSchoolFallback = null,
    otherOptionValue = DEFAULT_OTHER_OPTION_VALUE,
    otherOptionLabel,
    className,
    ...buttonProps
  },
  ref,
) {
  const { t } = useI18n();
  const resolvedPlaceholder = placeholder ?? t("common.selectSchool");
  const resolvedOtherOptionLabel = otherOptionLabel ?? t("common.otherSchool");
  const [open, setOpen] = React.useState(false);
  const [searchText, setSearchText] = React.useState("");
  const [selectedSchoolSnapshot, setSelectedSchoolSnapshot] =
    React.useState<SchoolFallback | null>(null);

  const debouncedQuery = useDebouncedValue(searchText, 400);
  const normalizedQuery = debouncedQuery.trim();
  const isTyping = searchText.trim() !== debouncedQuery.trim();
  const canRunSearchQuery = normalizedQuery.length >= 1;

  const schoolsQuery = useQuery({
    queryKey: ["schools", "search", normalizedQuery],
    queryFn: ({ signal }) =>
      searchActiveSchools({ query: normalizedQuery, limit: 20, signal }),
    enabled: open && canRunSearchQuery,
    staleTime: 30_000,
  });

  const schools = schoolsQuery.data ?? EMPTY_SCHOOLS;

  React.useEffect(() => {
    if (!value || value === otherOptionValue) {
      return;
    }

    const schoolFromResults = schools.find((school) => school.id === value);
    if (schoolFromResults) {
      setSelectedSchoolSnapshot({
        id: schoolFromResults.id,
        name_ru: schoolFromResults.name_ru,
      });
      return;
    }

    if (selectedSchoolFallback?.id === value) {
      setSelectedSchoolSnapshot(selectedSchoolFallback);
    }
  }, [otherOptionValue, schools, selectedSchoolFallback, value]);

  const hasSelectedSchoolInResults =
    Boolean(value) &&
    value !== otherOptionValue &&
    schools.some((school) => school.id === value);

  const effectiveFallbackOption: SchoolFallback | null = React.useMemo(() => {
    if (!value || value === otherOptionValue) {
      return null;
    }

    if (selectedSchoolFallback?.id === value) {
      return selectedSchoolFallback;
    }

    if (selectedSchoolSnapshot?.id === value) {
      return selectedSchoolSnapshot;
    }

    return null;
  }, [
    otherOptionValue,
    selectedSchoolFallback,
    selectedSchoolSnapshot,
    value,
  ]);

  const shouldRenderFallbackOption =
    Boolean(value) &&
    value !== otherOptionValue &&
    Boolean(effectiveFallbackOption) &&
    !hasSelectedSchoolInResults;

  const schoolOptions: SchoolFallback[] = React.useMemo(() => {
    const baseOptions = schools.map((school) => ({
      id: school.id,
      name_ru: school.name_ru,
    }));

    if (shouldRenderFallbackOption && effectiveFallbackOption) {
      return [
        effectiveFallbackOption,
        ...baseOptions.filter((school) => school.id !== effectiveFallbackOption.id),
      ];
    }

    return baseOptions;
  }, [effectiveFallbackOption, schools, shouldRenderFallbackOption]);

  const selectedLabel = React.useMemo(() => {
    if (!value) {
      return null;
    }

    if (value === otherOptionValue) {
      return resolvedOtherOptionLabel;
    }

    const schoolFromOptions = schoolOptions.find((school) => school.id === value);
    if (schoolFromOptions) {
      return schoolFromOptions.name_ru;
    }

    if (effectiveFallbackOption?.id === value) {
      return effectiveFallbackOption.name_ru;
    }

    return null;
  }, [
    resolvedOtherOptionLabel,
    otherOptionValue,
    schoolOptions,
    effectiveFallbackOption,
    value,
  ]);

  const closeAndResetSearch = () => {
    setOpen(false);
    setSearchText("");
  };

  const handleSchoolSelect = (school: SchoolFallback) => {
    setSelectedSchoolSnapshot(school);
    onChange(school.id);
    closeAndResetSearch();
  };

  const handleOtherSelect = () => {
    setSelectedSchoolSnapshot(null);
    onChange(otherOptionValue);
    closeAndResetSearch();
  };

  const handleOpenChange = (nextOpen: boolean) => {
    setOpen(nextOpen);

    if (!nextOpen) {
      setSearchText("");
    }
  };

  return (
    <Popover open={open} onOpenChange={handleOpenChange}>
      <PopoverTrigger asChild>
        <Button
          ref={ref}
          type="button"
          variant="outline"
          role="combobox"
          aria-expanded={open}
          disabled={disabled}
          className={cn(
            "w-full justify-between font-normal",
            !selectedLabel && "text-muted-foreground",
            className,
          )}
          {...buttonProps}
        >
          <span className="truncate">{selectedLabel ?? resolvedPlaceholder}</span>
          <ChevronsUpDown className="ml-2 size-4 shrink-0 opacity-50" />
        </Button>
      </PopoverTrigger>
      <PopoverContent className="w-[--radix-popover-trigger-width] p-0" align="start">
        <Command shouldFilter={false}>
          <CommandInput
            placeholder={t("common.searchSchool")}
            value={searchText}
            onValueChange={setSearchText}
            endAdornment={
              isTyping ? (
                <Loader2 className="size-3.5 animate-spin text-muted-foreground" />
              ) : undefined
            }
          />
          <CommandList>
            {normalizedQuery.length === 0 && !isTyping ? (
              <p className="px-3 py-2 text-xs text-muted-foreground">
                {t("common.schoolStartTyping")}
              </p>
            ) : null}

            {schoolsQuery.isPending && canRunSearchQuery ? (
              <div className="flex items-center gap-2 px-3 py-2 text-sm text-muted-foreground">
                <Loader2 className="size-4 animate-spin" />
                <span>{t("common.loadingSchools")}</span>
              </div>
            ) : null}

            {schoolsQuery.isError && canRunSearchQuery ? (
              <p className="px-3 py-2 text-sm text-destructive">
                {t("common.failedSchools")}
              </p>
            ) : null}

            {!schoolsQuery.isPending &&
            !schoolsQuery.isError &&
            canRunSearchQuery &&
            schoolOptions.length === 0 ? (
              <p className="px-3 py-2 text-sm text-muted-foreground">
                {t("common.noSchoolsFound")}
              </p>
            ) : null}

            {!schoolsQuery.isPending && !schoolsQuery.isError && canRunSearchQuery ? (
              <CommandGroup>
                {schoolOptions.map((school) => (
                  <CommandItem
                    key={school.id}
                    value={`${school.id}:${school.name_ru}`}
                    onSelect={() => handleSchoolSelect(school)}
                  >
                    <Check
                      className={cn(
                        "mr-2 size-4",
                        value === school.id ? "opacity-100" : "opacity-0",
                      )}
                    />
                    <span className="truncate">{school.name_ru}</span>
                  </CommandItem>
                ))}
                <CommandSeparator />
                <CommandItem
                  value={otherOptionValue}
                  onSelect={handleOtherSelect}
                >
                  <Check
                    className={cn(
                      "mr-2 size-4",
                      value === otherOptionValue ? "opacity-100" : "opacity-0",
                    )}
                  />
                  <span>{resolvedOtherOptionLabel}</span>
                </CommandItem>
              </CommandGroup>
            ) : null}
          </CommandList>
        </Command>
      </PopoverContent>
    </Popover>
  );
});
