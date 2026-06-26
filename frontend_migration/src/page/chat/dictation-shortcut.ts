export type DictationShortcutPresentation = {
  ariaKeyShortcuts: string;
  label: string;
};

export const DICTATION_SHORTCUT = {
  ariaKeyShortcuts: "PageDown",
  label: "PgDn / Page Down",
} as const satisfies DictationShortcutPresentation;

export function isDictationShortcut(event: KeyboardEvent) {
  const isPageDownKey = event.key === "PageDown" || event.code === "PageDown";

  return (
    isPageDownKey &&
    !event.altKey &&
    !event.ctrlKey &&
    !event.metaKey &&
    !event.shiftKey &&
    !event.repeat
  );
}
