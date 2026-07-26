import { useCallback, useMemo, useState } from "react";

import type { ChatMessage } from "../../types/types";

// ---------------------------------------------------------------------------
// UserMessagesNav
// ---------------------------------------------------------------------------
// A compact, fixed-position timeline of user messages shown as short lines.
// Each line sits inside a larger transparent "hit area" so hovering is easy.
// On group-hover the line extends with animation and a tooltip reveals the
// truncated message. Clicking scrolls the chat pane to the corresponding
// message.
// ---------------------------------------------------------------------------

interface UserMessagesNavProps {
  messages: ChatMessage[];
  scrollContainerRef: React.RefObject<HTMLDivElement>;
}

const MAX_PREVIEW_LENGTH = 100;

const UserMessagesNav: React.FC<UserMessagesNavProps> = ({
  messages,
  scrollContainerRef,
}) => {
  const userMessages = useMemo(
    () =>
      messages.filter(
        (m) => m.type === "user" && (m.content ?? "").trim().length > 0,
      ),
    [messages],
  );

  const handleClick = useCallback(
    (msg: ChatMessage) => {
      if (!scrollContainerRef.current) return;
      const ts =
        typeof msg.timestamp === "string"
          ? msg.timestamp
          : String(msg.timestamp ?? "");
      const selector = `[data-message-timestamp="${CSS.escape(ts)}"]`;
      const el = scrollContainerRef.current.querySelector(selector);
      if (el) {
        el.scrollIntoView({ behavior: "smooth", block: "center" });
      }
    },
    [scrollContainerRef],
  );

  if (userMessages.length <= 1) return null;

  return (
    <div className="pointer-events-auto absolute left-3 top-3 z-30 flex max-h-[calc(100%-1.5rem)] flex-col overflow-visible">
      {userMessages.map((msg, idx) => {
        const text = (msg.content ?? "").trim();
        const preview =
          text.length > MAX_PREVIEW_LENGTH
            ? text.slice(0, MAX_PREVIEW_LENGTH) + "\u2026"
            : text;

        return (
          <div
            key={idx}
            // --- transparent hit area (the "green box") ---
            className="group relative flex items-end h-3 w-8 cursor-pointer"
            onClick={() => handleClick(msg)}
            title={preview}
          >
            {/* --- the visible line, anchored at the bottom of the hit area --- */}
            <div
              className={`mb-[3px] h-[3px] flex-shrink-0 rounded-full transition-all duration-300 ease-out
                w-2.5 bg-blue-500/40
                group-hover:w-6 group-hover:bg-blue-500/80`}
            />

            {/* --- hover tooltip --- */}
            <div className="pointer-events-none absolute left-8 top-0 z-40 hidden w-72 max-w-72 rounded-lg border border-border/60 bg-card px-3 py-2 text-xs leading-relaxed text-foreground shadow-lg whitespace-normal break-words line-clamp-4 group-hover:block">
              {preview}
            </div>
          </div>
        );
      })}
    </div>
  );
};

export default UserMessagesNav;
