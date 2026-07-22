"use client";

import { useState } from "react";
import { MoreVertical, Pencil, Trash2 } from "lucide-react";
import { AppDialog } from "@/components/ui/app-dialog";
import { cn } from "@/lib/utils";

type ChatSessionMenuProps = {
  sessionId: string;
  title: string;
  onRename: (sessionId: string, title: string) => Promise<void>;
  onDelete: (sessionId: string) => Promise<void>;
};

const iconBtnClass = cn(
  "inline-flex items-center justify-center min-w-11 min-h-11 rounded-lg",
  "hover:bg-bg-secondary text-text-tertiary touch-manipulation",
  "focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-line-green/30"
);

const menuItemClass = cn(
  "w-full min-h-11 flex items-center gap-2 px-3 py-2.5 text-sm text-text-primary",
  "hover:bg-bg-tertiary touch-manipulation",
  "focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-inset focus-visible:ring-line-green/30"
);

export function ChatSessionMenu({
  sessionId,
  title,
  onRename,
  onDelete,
}: ChatSessionMenuProps) {
  const [open, setOpen] = useState(false);
  const [renaming, setRenaming] = useState(false);
  const [draft, setDraft] = useState(title);
  const [confirmDelete, setConfirmDelete] = useState(false);
  const [deleting, setDeleting] = useState(false);

  const handleRename = async () => {
    const next = draft.trim();
    if (next) {
      await onRename(sessionId, next);
    }
    setRenaming(false);
    setOpen(false);
  };

  const handleConfirmDelete = async () => {
    setDeleting(true);
    try {
      await onDelete(sessionId);
      setConfirmDelete(false);
      setOpen(false);
    } finally {
      setDeleting(false);
    }
  };

  if (renaming) {
    return (
      <div className="absolute right-2 top-2 z-10 w-[min(100vw-2rem,13rem)] rounded-xl border border-border-light bg-bg-primary p-3 shadow-sm">
        <input
          value={draft}
          onChange={(e) => setDraft(e.target.value)}
          className="mb-2 w-full min-h-11 rounded-lg border border-border-light px-3 py-2 text-base focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-line-green/30"
          autoFocus
          aria-label="ชื่อแชทใหม่"
          onKeyDown={(e) => {
            if (e.key === "Enter") void handleRename();
            if (e.key === "Escape") setRenaming(false);
          }}
        />
        <div className="flex gap-2">
          <button
            type="button"
            onClick={() => void handleRename()}
            className="min-h-11 flex-1 rounded-full bg-line-green-cta text-sm font-medium text-white touch-manipulation focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-line-green/30"
          >
            บันทึก
          </button>
          <button
            type="button"
            onClick={() => setRenaming(false)}
            className="min-h-11 flex-1 rounded-full bg-bg-tertiary text-sm font-medium text-text-primary touch-manipulation focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-line-green/30"
          >
            ยกเลิก
          </button>
        </div>
      </div>
    );
  }

  return (
    <div className="relative">
      <button
        type="button"
        onClick={() => setOpen((v) => !v)}
        className={iconBtnClass}
        aria-label="เมนูแชท"
        aria-expanded={open}
        aria-haspopup="menu"
      >
        <MoreVertical className="h-4 w-4" aria-hidden />
      </button>
      {open ? (
        <>
          <div className="fixed inset-0 z-10" onClick={() => setOpen(false)} aria-hidden />
          <div
            role="menu"
            className="absolute right-0 top-full z-20 mt-1 min-w-[10rem] rounded-xl border border-border-light bg-bg-primary py-1 shadow-sm"
          >
            <button
              type="button"
              role="menuitem"
              onClick={() => {
                setDraft(title);
                setRenaming(true);
              }}
              className={menuItemClass}
            >
              <Pencil className="h-4 w-4 shrink-0" aria-hidden />
              เปลี่ยนชื่อ
            </button>
            <button
              type="button"
              role="menuitem"
              onClick={() => {
                setOpen(false);
                setConfirmDelete(true);
              }}
              className={cn(menuItemClass, "text-status-error hover:bg-status-error-light/50")}
            >
              <Trash2 className="h-4 w-4 shrink-0" aria-hidden />
              ลบแชท
            </button>
          </div>
        </>
      ) : null}

      <AppDialog
        open={confirmDelete}
        title="ลบแชทนี้?"
        message="การลบจะลบประวัติแชทนี้อย่างถาวร และกู้คืนไม่ได้"
        variant="error"
        confirmLabel={deleting ? "กำลังลบ…" : "ลบแชท"}
        cancelLabel="ยกเลิก"
        showCancel
        onConfirm={() => {
          if (!deleting) void handleConfirmDelete();
        }}
        onCancel={() => {
          if (!deleting) setConfirmDelete(false);
        }}
      />
    </div>
  );
}
