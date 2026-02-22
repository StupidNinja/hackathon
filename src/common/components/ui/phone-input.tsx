import { IMaskInput } from "react-imask";
import { cn } from "@/common/lib/utils";

interface PhoneInputProps {
  value?: string;
  onChange?: (value: string) => void;
  onBlur?: () => void;
  disabled?: boolean;
  placeholder?: string;
  className?: string;
  name?: string;
}

export function PhoneInput({
  value,
  onChange,
  onBlur,
  disabled,
  placeholder = "+7 (700) 000-00-00",
  className,
  name,
}: PhoneInputProps) {
  return (
    <IMaskInput
      mask="+0 (000) 000-00-00"
      value={value ?? ""}
      onAccept={(val: string) => onChange?.(val)}
      onBlur={onBlur}
      disabled={disabled}
      placeholder={placeholder}
      name={name}
      className={cn(
        "border-input file:text-foreground placeholder:text-muted-foreground focus-visible:ring-ring flex h-9 w-full rounded-md border bg-transparent px-3 py-1 text-base shadow-sm transition-colors file:border-0 file:bg-transparent file:text-sm file:font-medium focus-visible:outline-none focus-visible:ring-1 disabled:cursor-not-allowed disabled:opacity-50 md:text-sm",
        className,
      )}
    />
  );
}
