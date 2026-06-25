"use client";

import { SparklesIcon } from "@heroicons/react/24/outline";
import { useMemo, useState } from "react";

import {
  ProfileIntakeField,
  ProfileIntakeSummary,
} from "@/ui/components/chat/workspace_surface/profile_intake/profile-intake-controls";
import { AnimatedMascot } from "@/ui/components/mascot/animated-mascot";
import type { ChatWorkspaceProfileIntakeSurface } from "@/ui/components/chat/workspace_root/workspace-state";

type ProfileIntakeSurfaceProps = {
  surface: ChatWorkspaceProfileIntakeSurface;
};

export function ProfileIntakeSurface({ surface }: ProfileIntakeSurfaceProps) {
  const initialValues = useMemo(
    () =>
      Object.fromEntries(
        surface.fields.map((field) => [field.id, field.value])
      ),
    [surface.fields]
  );
  const [values, setValues] = useState(initialValues);

  function handleFieldChange(fieldId: string, value: string) {
    setValues((current) => ({ ...current, [fieldId]: value }));
  }

  return (
    <div className="flex min-h-0 flex-1 overflow-y-auto px-5 py-5">
      <div className="grid w-full gap-5 xl:grid-cols-[minmax(0,1fr)_340px]">
        <section className="min-w-0 rounded-[20px] border border-[var(--chat-border)] bg-[var(--chat-panel)] p-7 shadow-[var(--chat-shadow-soft)]">
          <div className="flex flex-wrap items-start justify-between gap-4">
            <div className="min-w-0">
              <p className="text-lg font-extrabold text-[var(--chat-primary)]">
                상담 입력 컨텍스트
              </p>
              <h1 className="mt-2 text-[38px] font-extrabold tracking-normal text-[var(--chat-text-strong)]">
                {surface.title}
              </h1>
              <p className="mt-3 max-w-4xl text-xl leading-9 text-[var(--chat-text-muted)]">
                {surface.description}
              </p>
            </div>
            <span className="inline-flex h-12 items-center gap-2 rounded-[12px] bg-[var(--chat-primary-soft)] px-4 text-lg font-bold text-[var(--chat-primary-strong)]">
              <SparklesIcon className="size-5" />
              상담 정보
            </span>
          </div>

          <div className="mt-7 grid gap-4">
            {surface.fields.map((field) => (
              <ProfileIntakeField
                key={field.id}
                field={field}
                value={values[field.id] ?? field.value}
                onChange={(value) => handleFieldChange(field.id, value)}
              />
            ))}
          </div>
        </section>

        <aside className="flex min-h-0 flex-col rounded-[20px] border border-[var(--chat-border)] bg-[var(--chat-surface)] p-6">
          <div className="flex items-center gap-3">
            <span className="chat-workspace-mascot-float flex size-[104px] shrink-0 items-center justify-center overflow-hidden rounded-full bg-[var(--chat-primary-soft)] shadow-[var(--chat-mascot-shadow-md)]">
              <AnimatedMascot
                animation={surface.mascot.animation}
                className="max-w-[76%]"
                shadow
                size="76%"
              />
            </span>
            <div className="min-w-0">
              <div className="text-2xl font-extrabold text-[var(--chat-text-strong)]">
                입력 요약
              </div>
              <p className="mt-2 text-lg leading-8 text-[var(--chat-text-muted)]">
                상담에 필요한 기본 정보를 한 번에 확인합니다.
              </p>
            </div>
          </div>

          <ProfileIntakeSummary fields={surface.fields} values={values} />

          <div className="mt-auto pt-5">
            <button
              type="button"
              className="flex h-14 w-full items-center justify-center rounded-[12px] bg-[var(--chat-primary)] text-xl font-bold text-white shadow-[var(--chat-shadow-primary)] transition hover:bg-[var(--chat-primary-strong)]"
            >
              {surface.primaryActionLabel}
            </button>
          </div>
        </aside>
      </div>
    </div>
  );
}
