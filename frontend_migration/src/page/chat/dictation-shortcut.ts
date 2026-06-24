export type DictationShortcutPresentation = {
  ariaKeyShortcuts: string;
  label: string;
};

export const DICTATION_SHORTCUT = {
  ariaKeyShortcuts: "Control+Shift+M Meta+Shift+M",
  label: "Ctrl+Shift+M / Cmd+Shift+M",
} as const satisfies DictationShortcutPresentation;

export function isDictationShortcut(event: KeyboardEvent) {
  const isMKey = event.key.toLowerCase() === "m" || event.code === "KeyM";

  return (
    isMKey &&
    event.shiftKey &&
    (event.ctrlKey || event.metaKey) &&
    !event.altKey &&
    !event.repeat
  );
}
