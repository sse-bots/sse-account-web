"use client";

import { useEffect, useRef } from "react";

interface OtpCodeInputProps {
  value: string;
  onChange: (val: string) => void;
  onComplete?: (code: string) => void;
  length?: number;
  disabled?: boolean;
  error?: boolean;
  autoFocus?: boolean;
}

export function OtpCodeInput({
  value,
  onChange,
  onComplete,
  length = 6,
  disabled = false,
  error = false,
  autoFocus = true,
}: OtpCodeInputProps) {
  const inputRefs = useRef<Array<HTMLInputElement | null>>([]);
  const lastCompletedRef = useRef<string>("");

  const digits = Array.from({ length }, (_, idx) => value[idx] || "");

  useEffect(() => {
    if (autoFocus && !disabled) {
      inputRefs.current[0]?.focus();
    }
  }, [autoFocus, disabled]);

  useEffect(() => {
    const clean = value.replace(/\D/g, "");
    if (clean.length === length && clean !== lastCompletedRef.current) {
      lastCompletedRef.current = clean;
      onComplete?.(clean);
    } else if (clean.length < length) {
      lastCompletedRef.current = "";
    }
  }, [value, length, onComplete]);

  function updateAt(index: number, raw: string) {
    const clean = raw.replace(/\D/g, "");
    if (!clean) {
      const next = [...digits];
      next[index] = "";
      onChange(next.join(""));
      return;
    }

    // Handle multi-digit paste or fast autofill (e.g. from password manager)
    if (clean.length > 1) {
      const next = [...digits];
      for (let i = 0; i < clean.length && index + i < length; i++) {
        next[index + i] = clean[i];
      }
      const joined = next.join("").slice(0, length);
      onChange(joined);
      const focusIdx = Math.min(index + clean.length, length - 1);
      inputRefs.current[focusIdx]?.focus();
      return;
    }

    const next = [...digits];
    next[index] = clean[0];
    onChange(next.join(""));
    if (index < length - 1) {
      inputRefs.current[index + 1]?.focus();
    }
  }

  function handleKeyDown(index: number, e: React.KeyboardEvent<HTMLInputElement>) {
    if (e.key === "Backspace") {
      if (digits[index]) {
        const next = [...digits];
        next[index] = "";
        onChange(next.join(""));
      } else if (index > 0) {
        const next = [...digits];
        next[index - 1] = "";
        onChange(next.join(""));
        inputRefs.current[index - 1]?.focus();
      }
      e.preventDefault();
    } else if (e.key === "ArrowLeft" && index > 0) {
      inputRefs.current[index - 1]?.focus();
    } else if (e.key === "ArrowRight" && index < length - 1) {
      inputRefs.current[index + 1]?.focus();
    }
  }

  function handlePaste(e: React.ClipboardEvent<HTMLInputElement>) {
    e.preventDefault();
    const pasted = e.clipboardData.getData("text").replace(/\D/g, "").slice(0, length);
    if (!pasted) return;
    onChange(pasted);
    const focusIdx = Math.min(pasted.length, length - 1);
    inputRefs.current[focusIdx]?.focus();
  }

  return (
    <div
      className={`flex items-center justify-center gap-2 sm:gap-2.5 ${
        error ? "animate-otp-shake" : ""
      }`}
    >
      {digits.map((digit, idx) => (
        <div key={idx} className="flex items-center">
          <input
            ref={(el) => {
              inputRefs.current[idx] = el;
            }}
            type="text"
            inputMode="numeric"
            autoComplete={idx === 0 ? "one-time-code" : "off"}
            maxLength={length}
            disabled={disabled}
            value={digit}
            onChange={(e) => updateAt(idx, e.target.value)}
            onKeyDown={(e) => handleKeyDown(idx, e)}
            onPaste={handlePaste}
            onFocus={(e) => e.currentTarget.select()}
            aria-label={`Verification code digit ${idx + 1}`}
            className={`h-13 w-11 rounded-2xl border-2 bg-slate-950 text-center font-mono text-xl font-extrabold text-white transition-all duration-150 focus:outline-none sm:h-14 sm:w-12 sm:text-2xl ${
              digit ? "animate-otp-pop" : ""
            } ${
              error
                ? "border-rose-500/80 shadow-[0_0_16px_rgba(244,63,94,0.28)]"
                : digit
                  ? "border-indigo-500 shadow-[0_0_18px_var(--accent-glow)]"
                  : "border-slate-800 focus:border-indigo-500 focus:shadow-[0_0_18px_var(--accent-glow)]"
            } disabled:opacity-50`}
          />
          {length === 6 && idx === 2 && (
            <span className="ml-2 text-base font-bold text-slate-500 sm:ml-2.5">
              –
            </span>
          )}
        </div>
      ))}
    </div>
  );
}
