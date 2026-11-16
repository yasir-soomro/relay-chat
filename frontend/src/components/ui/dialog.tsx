"use client";

import { useEffect, useId, useRef, type ReactNode } from "react";

type DialogProps = {
  children: ReactNode;
  description?: string;
  onClose: () => void;
  open: boolean;
  title: string;
};

export function Dialog({
  children,
  description,
  onClose,
  open,
  title,
}: DialogProps) {
  const dialogRef = useRef<HTMLDialogElement>(null);
  const id = useId();
  const titleId = `${id}-title`;
  const descriptionId = `${id}-description`;

  useEffect(() => {
    const dialog = dialogRef.current;
    if (!dialog) {
      return;
    }

    if (open && !dialog.open) {
      dialog.showModal();
    } else if (!open && dialog.open) {
      dialog.close();
    }
  }, [open]);

  return (
    <dialog
      aria-describedby={description ? descriptionId : undefined}
      aria-labelledby={titleId}
      className="w-[calc(100%_-_2rem)] max-w-[34rem] rounded-dialog border border-line bg-surface p-0 text-ink shadow-dialog backdrop:bg-black/50"
      onCancel={(event) => {
        event.preventDefault();
        onClose();
      }}
      onClick={(event) => {
        if (event.target === event.currentTarget) {
          onClose();
        }
      }}
      ref={dialogRef}
    >
      <div className="p-6 sm:p-8">
        <div className="flex items-start justify-between gap-5">
          <div>
            <h2 className="text-heading font-semibold" id={titleId}>
              {title}
            </h2>
            {description ? (
              <p
                className="mt-2 text-sm leading-6 text-muted"
                id={descriptionId}
              >
                {description}
              </p>
            ) : null}
          </div>
          <button
            aria-label="Close dialog"
            className="grid size-11 shrink-0 place-items-center rounded-full text-muted hover:bg-soft hover:text-ink focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-focus"
            onClick={onClose}
            type="button"
          >
            <span aria-hidden="true" className="text-xl leading-none">
              &times;
            </span>
          </button>
        </div>
        <div className="mt-6">{children}</div>
      </div>
    </dialog>
  );
}
