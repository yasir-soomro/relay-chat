import { MessageActions } from "@/features/messaging/components/message-actions";
import type { MessageRecord } from "@/features/messaging/types";

type MessageBubbleProps = {
  message: MessageRecord;
  isOwn: boolean;
  onEdit: (messageId: string, content: string) => Promise<void>;
  onDelete: (messageId: string) => Promise<void>;
};

function formatTime(value: string) {
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) {
    return "Time unavailable";
  }
  return new Intl.DateTimeFormat(undefined, {
    dateStyle: "medium",
    timeStyle: "short",
  }).format(date);
}

export function MessageBubble({
  message,
  isOwn,
  onEdit,
  onDelete,
}: MessageBubbleProps) {
  const isDeleted = message.deleted_at !== null;
  const wasEdited =
    !isDeleted &&
    Date.parse(message.updated_at) > Date.parse(message.created_at);

  return (
    <li
      className={`flex min-w-0 ${isOwn ? "justify-end" : "justify-start"}`}
      data-message-id={message.id}
    >
      <article
        aria-label={isOwn ? "Your message" : "Message from participant"}
        className={`min-w-0 max-w-[90%] rounded-2xl px-4 py-3 sm:max-w-[75%] ${
          isOwn
            ? "rounded-br-md bg-ink text-white"
            : "rounded-bl-md border border-line bg-surface text-ink"
        }`}
      >
        {isDeleted ? (
          <p className="whitespace-pre-wrap break-words text-sm italic opacity-75">
            Message deleted
          </p>
        ) : (
          <p className="whitespace-pre-wrap break-words text-sm leading-6">
            {message.content}
          </p>
        )}
        <div
          className={`mt-2 flex flex-wrap items-center gap-x-2 gap-y-1 text-[11px] ${
            isOwn ? "text-white/75" : "text-muted"
          }`}
        >
          <time dateTime={message.sent_at}>{formatTime(message.sent_at)}</time>
          {wasEdited ? <span>Edited</span> : null}
          {!isDeleted ? (
            <span aria-label={`Message status: ${message.status}`}>
              · {message.status === "sent"
                ? "Sent"
                : message.status === "delivered"
                  ? "Delivered"
                  : "Read"}
            </span>
          ) : null}
        </div>
        {isOwn && !isDeleted ? (
          <MessageActions
            message={message}
            onDelete={onDelete}
            onEdit={onEdit}
          />
        ) : null}
      </article>
    </li>
  );
}
