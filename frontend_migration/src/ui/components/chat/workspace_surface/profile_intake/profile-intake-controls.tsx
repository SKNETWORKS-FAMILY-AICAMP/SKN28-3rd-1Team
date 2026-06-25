"use client";

import { MapPinIcon } from "@heroicons/react/24/outline";
import { useState } from "react";

import { cn } from "@/lib/utils";
import type { WorkspaceProfileField } from "@/ui/components/chat/workspace_root/workspace-state";
import { Textarea } from "@/ui/primitives/textarea";

type ProfileIntakeFieldProps = {
  field: WorkspaceProfileField;
  value: string;
  onChange: (value: string) => void;
};

export function ProfileIntakeField({
  field,
  onChange,
  value,
}: ProfileIntakeFieldProps) {
  const isResidence = field.id === "residence";
  const isChoiceField = field.kind === "select";

  return (
    <section className="rounded-[18px] border border-[var(--chat-border)] bg-[var(--chat-surface)] p-5 text-left">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <label
          className="text-xl font-extrabold text-[var(--chat-text-strong)]"
          htmlFor={`profile-${field.id}`}
        >
          {field.label}
        </label>
        {isResidence ? <LocationButton /> : null}
      </div>

      {isChoiceField ? (
        <ProfileOptionPills field={field} onChange={onChange} value={value} />
      ) : (
        <ProfileFieldControl field={field} onChange={onChange} value={value} />
      )}
    </section>
  );
}

function ProfileFieldControl({
  field,
  onChange,
  value,
}: ProfileIntakeFieldProps) {
  const inputClassName =
    "mt-4 min-h-14 w-full rounded-[14px] border border-[var(--chat-border-strong)] bg-[var(--chat-panel)] px-4 text-xl font-bold text-[var(--chat-text-strong)] outline-none transition placeholder:text-[var(--chat-text-soft)] focus-visible:border-[var(--chat-primary)] focus-visible:ring-4 focus-visible:ring-[var(--chat-primary-ring)]";

  if (field.kind === "textarea") {
    return (
      <Textarea
        id={`profile-${field.id}`}
        value={value}
        onChange={(event) => onChange(event.target.value)}
        placeholder={field.placeholder}
        className="mt-4 min-h-32 rounded-[14px] border-[var(--chat-border-strong)] bg-[var(--chat-panel)] px-4 py-4 text-xl font-bold leading-9 text-[var(--chat-text-strong)] placeholder:text-[var(--chat-text-soft)] focus-visible:border-[var(--chat-primary)] focus-visible:ring-4 focus-visible:ring-[var(--chat-primary-ring)] md:text-xl"
      />
    );
  }

  return (
    <input
      id={`profile-${field.id}`}
      value={value}
      onChange={(event) => onChange(event.target.value)}
      inputMode={field.kind === "year" ? "numeric" : undefined}
      maxLength={field.kind === "year" ? 4 : undefined}
      placeholder={field.placeholder}
      className={inputClassName}
    />
  );
}

function ProfileOptionPills({
  field,
  onChange,
  value,
}: ProfileIntakeFieldProps) {
  return (
    <div
      aria-label={field.label}
      className="mt-4 flex flex-wrap gap-2.5"
      role="group"
    >
      {field.options?.map((option) => (
        <button
          key={option}
          type="button"
          aria-pressed={option === value}
          onClick={() => onChange(option)}
          className={cn(
            "min-h-12 rounded-full px-4 py-2 text-lg font-bold transition",
            option === value
              ? "bg-[var(--chat-primary)] text-white shadow-[var(--chat-shadow-primary)]"
              : "bg-[var(--chat-panel)] text-[var(--chat-text-muted)] hover:text-[var(--chat-text-strong)]"
          )}
        >
          {option}
        </button>
      ))}
    </div>
  );
}

function LocationButton() {
  const [confirmed, setConfirmed] = useState(false);

  return (
    <button
      type="button"
      className="inline-flex h-11 items-center gap-2 rounded-full bg-[var(--chat-info-bg)] px-4 text-base font-bold text-[var(--chat-info-text)] transition hover:brightness-95"
      onClick={() => setConfirmed(true)}
    >
      <MapPinIcon className="size-5" />
      {confirmed ? "위치 확인됨" : "내 위치 사용"}
    </button>
  );
}

type ProfileIntakeSummaryProps = {
  fields: WorkspaceProfileField[];
  values: Record<string, string>;
};

export function ProfileIntakeSummary({
  fields,
  values,
}: ProfileIntakeSummaryProps) {
  return (
    <div className="mt-6 space-y-3">
      {fields.slice(0, 5).map((field) => (
        <div
          key={field.id}
          className="rounded-[13px] border border-[var(--chat-border)] bg-[var(--chat-panel)] px-4 py-3"
        >
          <div className="text-base font-extrabold text-[var(--chat-text-muted)]">
            {field.label}
          </div>
          <div className="mt-1 truncate text-lg font-bold text-[var(--chat-text-strong)]">
            {values[field.id] || field.placeholder}
          </div>
        </div>
      ))}
    </div>
  );
}
