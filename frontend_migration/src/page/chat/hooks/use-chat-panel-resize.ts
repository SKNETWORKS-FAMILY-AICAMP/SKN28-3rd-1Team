"use client";

import type {
  CSSProperties,
  PointerEvent as ReactPointerEvent,
} from "react";
import { useCallback, useState } from "react";

const chatSidebarWidthTokens = {
  default: "--chat-sidebar-width-default",
  max: "--chat-sidebar-width-max",
  min: "--chat-sidebar-width-min",
} as const;

const traceDrawerWidthTokens = {
  default: "--chat-trace-drawer-width-default",
  max: "--chat-trace-drawer-width-max",
  min: "--chat-trace-drawer-width-min",
} as const;

type WidthTokens = {
  default: string;
  max: string;
  min: string;
};

function clampNumber(value: number, min: number, max: number) {
  return Math.min(Math.max(value, min), max);
}

function readPixelCustomProperty(element: Element, propertyName: string) {
  const value = window.getComputedStyle(element).getPropertyValue(propertyName);
  const numericValue = Number.parseFloat(value);

  return Number.isFinite(numericValue) ? numericValue : undefined;
}

function getChatPageElement(target: Element) {
  return target.closest(".chat-page") ?? document.documentElement;
}

function getElementWidth(element: HTMLElement, tokens: WidthTokens) {
  const measuredWidth = element.getBoundingClientRect().width;
  if (measuredWidth > 0) return measuredWidth;

  return (
    readPixelCustomProperty(getChatPageElement(element), tokens.default) ?? 0
  );
}

function clampWidthByCssTokens(
  value: number,
  root: Element,
  tokens: WidthTokens
) {
  const min =
    readPixelCustomProperty(root, tokens.min) ?? Number.NEGATIVE_INFINITY;
  const max =
    readPixelCustomProperty(root, tokens.max) ?? Number.POSITIVE_INFINITY;

  return clampNumber(value, min, max);
}

function toPx(value?: number) {
  return typeof value === "number" ? `${value}px` : undefined;
}

export function useChatPanelResize({
  isTraceExpanded,
}: {
  isTraceExpanded: boolean;
}) {
  const [chatSidebarWidth, setChatSidebarWidth] = useState<number>();
  const [traceDrawerWidth, setTraceDrawerWidth] = useState<number>();
  const sidebarLayoutStyle = {
    "--chat-sidebar-current-width": toPx(chatSidebarWidth),
    "--chat-trace-drawer-current-width": isTraceExpanded
      ? toPx(traceDrawerWidth)
      : undefined,
  } as CSSProperties;
  const resetPanelWidths = useCallback(() => {
    setChatSidebarWidth(undefined);
    setTraceDrawerWidth(undefined);
  }, []);

  const handleChatSidebarResizePointerDown = useCallback(
    (event: ReactPointerEvent<HTMLButtonElement>) => {
      event.preventDefault();
      const sidebar = event.currentTarget.parentElement;
      if (!sidebar) return;

      const startX = event.clientX;
      const startWidth = getElementWidth(sidebar, chatSidebarWidthTokens);
      const root = getChatPageElement(sidebar);
      const previousCursor = document.body.style.cursor;
      const previousUserSelect = document.body.style.userSelect;

      const handlePointerMove = (moveEvent: PointerEvent) => {
        setChatSidebarWidth(
          clampWidthByCssTokens(
            startWidth + moveEvent.clientX - startX,
            root,
            chatSidebarWidthTokens
          )
        );
      };

      const handlePointerUp = () => {
        document.body.style.cursor = previousCursor;
        document.body.style.userSelect = previousUserSelect;
        window.removeEventListener("pointermove", handlePointerMove);
        window.removeEventListener("pointerup", handlePointerUp);
        window.removeEventListener("pointercancel", handlePointerUp);
      };

      document.body.style.cursor = "col-resize";
      document.body.style.userSelect = "none";
      window.addEventListener("pointermove", handlePointerMove);
      window.addEventListener("pointerup", handlePointerUp);
      window.addEventListener("pointercancel", handlePointerUp);
    },
    []
  );

  const handleTraceDrawerResizePointerDown = useCallback(
    (event: ReactPointerEvent<HTMLButtonElement>) => {
      event.preventDefault();
      const drawer = event.currentTarget.parentElement;
      if (!drawer) return;

      const startX = event.clientX;
      const startWidth = getElementWidth(drawer, traceDrawerWidthTokens);
      const root = getChatPageElement(drawer);
      const previousCursor = document.body.style.cursor;
      const previousUserSelect = document.body.style.userSelect;

      const handlePointerMove = (moveEvent: PointerEvent) => {
        setTraceDrawerWidth(
          clampWidthByCssTokens(
            startWidth + moveEvent.clientX - startX,
            root,
            traceDrawerWidthTokens
          )
        );
      };

      const handlePointerUp = () => {
        document.body.style.cursor = previousCursor;
        document.body.style.userSelect = previousUserSelect;
        window.removeEventListener("pointermove", handlePointerMove);
        window.removeEventListener("pointerup", handlePointerUp);
        window.removeEventListener("pointercancel", handlePointerUp);
      };

      document.body.style.cursor = "col-resize";
      document.body.style.userSelect = "none";
      window.addEventListener("pointermove", handlePointerMove);
      window.addEventListener("pointerup", handlePointerUp);
      window.addEventListener("pointercancel", handlePointerUp);
    },
    []
  );

  return {
    chatSidebarWidth,
    handleChatSidebarResizePointerDown,
    handleTraceDrawerResizePointerDown,
    resetPanelWidths,
    sidebarLayoutStyle,
    traceDrawerWidth,
  };
}
