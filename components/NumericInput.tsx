"use client";

import { useEffect, useState } from "react";
import {
  formatNumericInputDisplay,
  parseNumericInput,
  sanitizeNumericInput,
} from "@/lib/client/numericInput";

type NumericInputProps = {
  value: number;
  onChange: (value: number) => void;
  className?: string;
  placeholder?: string;
  disabled?: boolean;
  required?: boolean;
  min?: number;
  id?: string;
  "aria-label"?: string;
};

export default function NumericInput({
  value,
  onChange,
  className = "",
  placeholder = "0.00",
  disabled = false,
  required = false,
  min,
  id,
  "aria-label": ariaLabel,
}: NumericInputProps) {
  const [text, setText] = useState(() => formatNumericInputDisplay(value));
  const [focused, setFocused] = useState(false);

  useEffect(() => {
    if (!focused) {
      setText(formatNumericInputDisplay(value));
    }
  }, [focused, value]);

  return (
    <input
      id={id}
      aria-label={ariaLabel}
      type="text"
      inputMode="decimal"
      required={required}
      disabled={disabled}
      value={text}
      placeholder={placeholder}
      min={min}
      onFocus={() => setFocused(true)}
      onBlur={() => {
        setFocused(false);
        const parsed = parseNumericInput(text);
        onChange(parsed);
        setText(formatNumericInputDisplay(parsed));
      }}
      onChange={(event) => {
        const next = sanitizeNumericInput(event.target.value);
        setText(next);
        onChange(parseNumericInput(next));
      }}
      className={className}
    />
  );
}
