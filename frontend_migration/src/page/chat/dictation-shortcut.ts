export type DictationShortcutPresentation = {
  ariaKeyShortcuts: string;
  label: string;
};

export const DICTATION_SHORTCUT = {
  ariaKeyShortcuts: "Alt+M",
  label: "Alt+M / Option+M",
} as const satisfies DictationShortcutPresentation;

export function isDictationShortcut(event: KeyboardEvent) {
  const isMKey = event.key.toLowerCase() === "m" || event.code === "KeyM";

  return (
    isMKey &&
    event.altKey &&
    !event.ctrlKey &&
    !event.metaKey &&
    !event.shiftKey &&
    !event.repeat
  );
}
