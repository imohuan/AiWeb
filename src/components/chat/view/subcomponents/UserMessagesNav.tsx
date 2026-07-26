import { useCallback, useMemo, useState } from "react";

import type { ChatMessage } from "../../types/types";

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

  const [hoveredIdx, setHoveredIdx] = useState<number | null>(null);

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

  if (userMessages.length === 0) return null;

  return (
    <div className="pointer-events-auto absolute left-3 top-5 z-30 flex max-h-[calc(100%-1.5rem)] flex-col overflow-visible">
      {userMessages.map((msg, idx) => {
        const text = (msg.content ?? "").trim();
        const preview =
          text.length > MAX_PREVIEW_LENGTH
            ? text.slice(0, MAX_PREVIEW_LENGTH) + "\u2026"
            : text;
        const active = hoveredIdx === idx;

        return (
          <div
            key={idx}
            className="relative flex h-3 w-10 cursor-pointer items-end"
            onClick={() => handleClick(msg)}
            onMouseEnter={() => setHoveredIdx(idx)}
            onMouseLeave={() => setHoveredIdx(null)}
          >
            <div
              className={`mb-[5px] h-[3px] rounded-full transition-all duration-300 ease-out
                ${active ? "w-6 bg-blue-500/80" : "w-2.5 bg-blue-500/40"}`}
            />

            {active && (
              <div className="pointer-events-none absolute left-8 top-0 z-40 w-80 rounded-lg border border-border/60 bg-card px-3 py-2 text-xs leading-relaxed text-foreground shadow-lg whitespace-normal break-words line-clamp-4">
                {preview}
              </div>
            )}
          </div>
        );
      })}
    </div>
  );
};

export default UserMessagesNav;
