"use client";

import { useEffect, useImperativeHandle, useRef, useState } from "react";
import { createPortal } from "react-dom";

export type SelectOption = { value: string; label: string };

export interface CustomSelectHandle {
  setValue: (v: string) => void;
}

type Props = {
  name: string;
  /** Uncontrolled default */
  defaultValue?: string;
  /** Controlled value */
  value?: string;
  onChange?: (value: string) => void;
  options: SelectOption[];
  disabled?: boolean;
  /** React 19: ref is a regular prop */
  ref?: React.Ref<CustomSelectHandle>;
};

export function CustomSelect({
  name,
  defaultValue = "",
  value: controlledValue,
  onChange,
  options,
  disabled,
  ref,
}: Props) {
  const isControlled = controlledValue !== undefined;
  const [internalValue, setInternalValue] = useState(defaultValue);
  const value = isControlled ? controlledValue : internalValue;

  const [open, setOpen] = useState(false);
  const [dropdownStyle, setDropdownStyle] = useState<React.CSSProperties>({});
  const buttonRef = useRef<HTMLButtonElement>(null);
  const dropdownRef = useRef<HTMLDivElement>(null);

  const selected = options.find((o) => o.value === value);

  useImperativeHandle(ref, () => ({
    setValue: (v: string) => {
      if (!isControlled) setInternalValue(v);
      onChange?.(v);
    },
  }));

  // Calculate portal position when opening
  function handleOpen() {
    if (disabled) return;
    if (!open && buttonRef.current) {
      const rect = buttonRef.current.getBoundingClientRect();
      const spaceBelow = window.innerHeight - rect.bottom;
      const dropdownHeight = options.length * 36 + 8; // rough estimate
      const openAbove = spaceBelow < dropdownHeight && rect.top > spaceBelow;
      setDropdownStyle({
        position: "fixed",
        ...(openAbove
          ? { bottom: window.innerHeight - rect.top + 4 }
          : { top: rect.bottom + 4 }),
        left: rect.left,
        width: rect.width,
        zIndex: 9999,
        maxHeight: openAbove ? rect.top - 8 : spaceBelow - 8,
        overflowY: "auto",
      });
    }
    setOpen((v) => !v);
  }

  useEffect(() => {
    if (!open) return;
    function onOutside(e: MouseEvent) {
      const target = e.target as Node;
      const insideButton = buttonRef.current?.contains(target) ?? false;
      const insideDropdown = dropdownRef.current?.contains(target) ?? false;
      if (!insideButton && !insideDropdown) {
        setOpen(false);
      }
    }
    function onScroll() {
      setOpen(false);
    }
    document.addEventListener("mousedown", onOutside);
    window.addEventListener("scroll", onScroll, true);
    return () => {
      document.removeEventListener("mousedown", onOutside);
      window.removeEventListener("scroll", onScroll, true);
    };
  }, [open]);

  function handleSelect(v: string) {
    if (!isControlled) setInternalValue(v);
    onChange?.(v);
    setOpen(false);
  }

  const dropdown = open ? (
    <div
      ref={dropdownRef}
      style={dropdownStyle}
      className="overflow-hidden rounded-md border border-zinc-200 bg-white shadow-lg dark:border-white/15 dark:bg-zinc-900"
    >
      {options.map((option) => (
        <button
          key={option.value}
          type="button"
          onMouseDown={(e) => e.preventDefault()}
          onClick={() => handleSelect(option.value)}
          className={`w-full px-3 py-2 text-left text-sm transition-colors hover:bg-zinc-50 dark:hover:bg-white/5 ${
            option.value === value
              ? "font-semibold text-black dark:text-white"
              : "text-black/70 dark:text-white/70"
          }`}
        >
          {option.label}
        </button>
      ))}
    </div>
  ) : null;

  return (
    <div className="relative">
      <input type="hidden" name={name} value={value} />
      <button
        ref={buttonRef}
        type="button"
        disabled={disabled}
        onClick={handleOpen}
        className="flex w-full items-center justify-between gap-2 rounded-md border border-zinc-300/80 bg-white px-3 py-2 text-sm text-black outline-none ring-offset-1 focus:border-zinc-500 focus:ring-2 focus:ring-zinc-200 disabled:cursor-not-allowed disabled:opacity-60 dark:border-white/20 dark:bg-zinc-900 dark:text-white dark:focus:border-white/40 dark:focus:ring-white/10"
      >
        <span className={selected ? "" : "text-black/40 dark:text-white/40"}>
          {selected?.label ?? "Select…"}
        </span>
        <svg
          className={`h-4 w-4 shrink-0 text-black/40 transition-transform duration-150 dark:text-white/40 ${
            open ? "rotate-180" : ""
          }`}
          viewBox="0 0 16 16"
          fill="none"
          stroke="currentColor"
          strokeWidth="2"
        >
          <path d="M4 6l4 4 4-4" strokeLinecap="round" strokeLinejoin="round" />
        </svg>
      </button>

      {typeof document !== "undefined" && dropdown
        ? createPortal(dropdown, document.body)
        : null}
    </div>
  );
}
