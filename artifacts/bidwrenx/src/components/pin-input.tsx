import { useRef, useEffect } from "react";
import { cn } from "@/lib/utils";

interface PinInputProps {
  value: string;
  onChange: (value: string) => void;
  onComplete?: (value: string) => void;
  disabled?: boolean;
  error?: boolean;
  autoFocus?: boolean;
}

export function PinInput({ value, onChange, onComplete, disabled, error, autoFocus = true }: PinInputProps) {
  const ref0 = useRef<HTMLInputElement>(null);
  const ref1 = useRef<HTMLInputElement>(null);
  const ref2 = useRef<HTMLInputElement>(null);
  const ref3 = useRef<HTMLInputElement>(null);
  const refs = [ref0, ref1, ref2, ref3];

  useEffect(() => {
    if (autoFocus) ref0.current?.focus();
  }, [autoFocus]);

  const handleChange = (index: number, e: React.ChangeEvent<HTMLInputElement>) => {
    const digit = e.target.value.replace(/\D/g, "").slice(-1);
    const arr = (value + "    ").slice(0, 4).split("");
    arr[index] = digit;
    const result = arr.join("").replace(/ /g, "").slice(0, 4);
    onChange(result);
    if (digit && index < 3) refs[index + 1].current?.focus();
    if (digit && index === 3 && result.length === 4 && onComplete) onComplete(result);
    if (result.length === 4 && index < 3 && onComplete) {
      // already triggered above
    }
  };

  const handleKeyDown = (index: number, e: React.KeyboardEvent<HTMLInputElement>) => {
    if (e.key === "Backspace") {
      if (!value[index] && index > 0) refs[index - 1].current?.focus();
    } else if (e.key === "ArrowLeft" && index > 0) {
      refs[index - 1].current?.focus();
    } else if (e.key === "ArrowRight" && index < 3) {
      refs[index + 1].current?.focus();
    }
  };

  const handlePaste = (e: React.ClipboardEvent) => {
    e.preventDefault();
    const pasted = e.clipboardData.getData("text").replace(/\D/g, "").slice(0, 4);
    onChange(pasted);
    const nextIndex = Math.min(pasted.length, 3);
    refs[nextIndex].current?.focus();
    if (pasted.length === 4 && onComplete) onComplete(pasted);
  };

  return (
    <div className="flex gap-3 justify-center">
      {([0, 1, 2, 3] as const).map((i) => (
        <input
          key={i}
          ref={refs[i]}
          type="text"
          inputMode="numeric"
          pattern="[0-9]*"
          maxLength={1}
          value={value[i] || ""}
          onChange={(e) => handleChange(i, e)}
          onKeyDown={(e) => handleKeyDown(i, e)}
          onPaste={handlePaste}
          disabled={disabled}
          data-testid={`pin-box-${i}`}
          className={cn(
            "w-13 h-13 text-center text-xl font-bold rounded-lg border-2 transition-all",
            "bg-input border-border focus:outline-none focus:border-primary focus:ring-2 focus:ring-primary/20",
            "caret-transparent select-none",
            error && "border-red-500 bg-red-500/5 focus:border-red-500 focus:ring-red-500/20",
            disabled && "opacity-50 cursor-not-allowed",
            value[i] && !error && "border-primary/50"
          )}
        />
      ))}
    </div>
  );
}
