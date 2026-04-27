/**
 * Form primitives — Ministry of Transport Platform
 *
 * Server-action-compatible (name, defaultValue, aria-invalid pattern).
 * Built on shadcn's Input, Label, Textarea, Checkbox + Tailwind classes.
 * No inline styles — uses Tailwind utilities only.
 */
"use client";

import * as React from "react";
import type { ComponentPropsWithoutRef } from "react";
import { cn } from "@/lib/utils";
import { Input as ShadcnInput } from "@/components/ui/input";
import { Textarea as ShadcnTextarea } from "@/components/ui/textarea";
import { Label as ShadcnLabel } from "@/components/ui/label";
import { Checkbox as ShadcnCheckbox } from "@/components/ui/checkbox";

// ── FormGroup ──────────────────────────────────────────────────────────────────
export function FormGroup({
  children,
  className,
}: {
  children: React.ReactNode;
  className?: string;
}) {
  return (
    <div className={cn("flex flex-col gap-1.5", className)}>{children}</div>
  );
}

// ── Label ──────────────────────────────────────────────────────────────────────
interface LabelProps extends ComponentPropsWithoutRef<"label"> {
  required?: boolean;
}

export function Label({ required, className, children, ...props }: LabelProps) {
  return (
    <ShadcnLabel
      {...props}
      className={cn(
        "text-sm font-semibold text-muted-foreground",
        required && "after:content-['_*'] after:text-destructive",
        className,
      )}>
      {children}
    </ShadcnLabel>
  );
}

// ── Input ──────────────────────────────────────────────────────────────────────
interface InputProps extends React.ComponentProps<"input"> {
  error?: string | string[] | undefined;
}

export function Input({ error, className, ...props }: InputProps) {
  const hasError = Boolean(error);
  return (
    <ShadcnInput
      {...props}
      className={cn(
        hasError && "border-destructive focus-visible:ring-destructive/30",
        className,
      )}
      aria-invalid={hasError || undefined}
      aria-describedby={
        hasError ? `${props.id}-error` : props["aria-describedby"]
      }
    />
  );
}

// ── NativeSelect ───────────────────────────────────────────────────────────────
interface NativeSelectProps extends ComponentPropsWithoutRef<"select"> {
  error?: string | string[] | undefined;
}

export function NativeSelect({
  error,
  className,
  children,
  ...props
}: NativeSelectProps) {
  const hasError = Boolean(error);
  return (
    <select
      {...props}
      className={cn(
        "flex h-10 w-full rounded-md border border-input bg-background px-3 py-2 text-sm",
        "ring-offset-background placeholder:text-muted-foreground",
        "focus:outline-none focus:ring-2 focus:ring-ring focus:ring-offset-2",
        "disabled:cursor-not-allowed disabled:opacity-50",
        "appearance-none pr-9",
        hasError && "border-destructive focus:ring-destructive/30",
        className,
      )}
      aria-invalid={hasError || undefined}
      aria-describedby={
        hasError ? `${props.id}-error` : props["aria-describedby"]
      }>
      {children}
    </select>
  );
}

export const Select = NativeSelect;

// ── Textarea ───────────────────────────────────────────────────────────────────
interface TextareaProps extends ComponentPropsWithoutRef<"textarea"> {
  error?: string | string[] | undefined;
}

export function Textarea({ error, className, ...props }: TextareaProps) {
  const hasError = Boolean(error);
  return (
    <ShadcnTextarea
      {...(props as React.TextareaHTMLAttributes<HTMLTextAreaElement>)}
      className={cn(
        hasError && "border-destructive focus-visible:ring-destructive/30",
        className,
      )}
      aria-invalid={hasError || undefined}
      aria-describedby={
        hasError ? `${props.id}-error` : props["aria-describedby"]
      }
    />
  );
}

// ── Checkbox ───────────────────────────────────────────────────────────────────
interface CheckboxFieldProps {
  id?: string;
  name?: string;
  label: string;
  defaultChecked?: boolean;
  disabled?: boolean;
  className?: string;
}

export function Checkbox({
  id,
  name,
  label,
  defaultChecked,
  disabled,
  className,
}: CheckboxFieldProps) {
  return (
    <div className={cn("flex items-center gap-2", className)}>
      <ShadcnCheckbox
        id={id}
        name={name}
        defaultChecked={defaultChecked}
        disabled={disabled}
      />
      <ShadcnLabel
        htmlFor={id}
        className="text-sm font-medium text-foreground cursor-pointer">
        {label}
      </ShadcnLabel>
    </div>
  );
}

// ── Radio ──────────────────────────────────────────────────────────────────────
interface RadioProps extends ComponentPropsWithoutRef<"input"> {
  label: string;
}

export function Radio({ label, className, id, ...props }: RadioProps) {
  return (
    <label
      className={cn("flex items-center gap-2 cursor-pointer", className)}
      htmlFor={id}>
      <input
        type="radio"
        id={id}
        className="w-4 h-4 accent-primary flex-shrink-0"
        {...props}
      />
      <span className="text-sm font-medium text-foreground">{label}</span>
    </label>
  );
}

// ── FormHint ───────────────────────────────────────────────────────────────────
export function FormHint({
  children,
  className,
}: {
  children: React.ReactNode;
  className?: string;
}) {
  return (
    <p
      className={cn("text-xs text-muted-foreground leading-normal", className)}>
      {children}
    </p>
  );
}

// ── FormError ──────────────────────────────────────────────────────────────────
export function FormError({
  id,
  errors,
}: {
  id?: string;
  errors?: string | string[] | undefined;
}) {
  if (!errors) return null;
  const messages = Array.isArray(errors) ? errors : [errors];
  return (
    <>
      {messages.map((msg, i) => (
        <p
          key={i}
          id={i === 0 ? id : undefined}
          className="text-xs text-destructive leading-normal"
          role="alert">
          {msg}
        </p>
      ))}
    </>
  );
}
