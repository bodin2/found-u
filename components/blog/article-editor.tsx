"use client";

import { useEditor, EditorContent, type Editor } from "@tiptap/react";
import {
  Bold,
  Italic,
  Heading2,
  Heading3,
  List,
  ListOrdered,
  Quote,
  Link as LinkIcon,
  Image as ImageIcon,
  Code2,
  ListOrdered as StepIcon,
  Video,
  Undo2,
  Redo2,
} from "lucide-react";
import { useEffect } from "react";
import { createBlogEditorExtensions } from "@/lib/blog/extensions";
import { parseVideoEmbedInput } from "@/lib/blog/video-embed";
import { CODE_LANGUAGES, type TipTapDoc } from "@/lib/blog/types";
import { cn } from "@/lib/utils";

type ArticleEditorProps = {
  initialDoc: TipTapDoc;
  onChange: (doc: TipTapDoc) => void;
  onUploadImage: (file: File) => Promise<string | null>;
  className?: string;
};

function ToolbarButton({
  onClick,
  active,
  disabled,
  title,
  children,
}: {
  onClick: () => void;
  active?: boolean;
  disabled?: boolean;
  title: string;
  children: React.ReactNode;
}) {
  return (
    <button
      type="button"
      title={title}
      disabled={disabled}
      onClick={onClick}
      className={cn(
        "inline-flex h-8 w-8 items-center justify-center rounded-lg text-text-secondary hover:bg-bg-tertiary disabled:opacity-40",
        active && "bg-line-green-light text-line-green-link"
      )}
    >
      {children}
    </button>
  );
}

function EditorToolbar({
  editor,
  onUploadImage,
}: {
  editor: Editor;
  onUploadImage: (file: File) => Promise<string | null>;
}) {
  const setLink = () => {
    const prev = editor.getAttributes("link").href as string | undefined;
    const url = window.prompt("URL", prev || "https://");
    if (url === null) return;
    if (url === "") {
      editor.chain().focus().extendMarkRange("link").unsetLink().run();
      return;
    }
    editor.chain().focus().extendMarkRange("link").setLink({ href: url }).run();
  };

  const insertImage = () => {
    const input = document.createElement("input");
    input.type = "file";
    input.accept = "image/jpeg,image/png,image/webp,image/gif";
    input.onchange = async () => {
      const file = input.files?.[0];
      if (!file) return;
      const url = await onUploadImage(file);
      if (url) {
        editor.chain().focus().setImage({ src: url }).run();
      }
    };
    input.click();
  };

  const insertCode = () => {
    editor
      .chain()
      .focus()
      .toggleCodeBlock({ language: "typescript" })
      .run();
  };

  const insertVideo = () => {
    const pasted = window.prompt(
      "วางลิงก์ YouTube, Bunny Stream embed หรือโค้ด iframe\nตัวอย่าง:\nhttps://youtu.be/…\nhttps://iframe.mediadelivery.net/embed/{libraryId}/{videoId}"
    );
    if (pasted === null || !pasted.trim()) return;
    const parsed = parseVideoEmbedInput(pasted);
    if (!parsed) {
      window.alert(
        "ไม่รองรับลิงก์นี้\nรองรับ: YouTube, Bunny.net embed (iframe.mediadelivery.net), หรือไฟล์ .mp4 / .m3u8"
      );
      return;
    }
    editor.chain().focus().insertVideoEmbed(parsed).run();
  };

  return (
    <div className="sticky top-0 z-10 flex flex-wrap items-center gap-0.5 border-b border-border-light bg-bg-card px-2 py-1.5">
      <ToolbarButton
        title="Bold"
        active={editor.isActive("bold")}
        onClick={() => editor.chain().focus().toggleBold().run()}
      >
        <Bold className="w-4 h-4" />
      </ToolbarButton>
      <ToolbarButton
        title="Italic"
        active={editor.isActive("italic")}
        onClick={() => editor.chain().focus().toggleItalic().run()}
      >
        <Italic className="w-4 h-4" />
      </ToolbarButton>
      <ToolbarButton
        title="Heading 2"
        active={editor.isActive("heading", { level: 2 })}
        onClick={() => editor.chain().focus().toggleHeading({ level: 2 }).run()}
      >
        <Heading2 className="w-4 h-4" />
      </ToolbarButton>
      <ToolbarButton
        title="Heading 3"
        active={editor.isActive("heading", { level: 3 })}
        onClick={() => editor.chain().focus().toggleHeading({ level: 3 }).run()}
      >
        <Heading3 className="w-4 h-4" />
      </ToolbarButton>
      <ToolbarButton
        title="Bullet list"
        active={editor.isActive("bulletList")}
        onClick={() => editor.chain().focus().toggleBulletList().run()}
      >
        <List className="w-4 h-4" />
      </ToolbarButton>
      <ToolbarButton
        title="Ordered list"
        active={editor.isActive("orderedList")}
        onClick={() => editor.chain().focus().toggleOrderedList().run()}
      >
        <ListOrdered className="w-4 h-4" />
      </ToolbarButton>
      <ToolbarButton
        title="Quote"
        active={editor.isActive("blockquote")}
        onClick={() => editor.chain().focus().toggleBlockquote().run()}
      >
        <Quote className="w-4 h-4" />
      </ToolbarButton>
      <ToolbarButton title="Link" active={editor.isActive("link")} onClick={setLink}>
        <LinkIcon className="w-4 h-4" />
      </ToolbarButton>
      <ToolbarButton title="Image" onClick={insertImage}>
        <ImageIcon className="w-4 h-4" />
      </ToolbarButton>
      <ToolbarButton
        title="Code block"
        active={editor.isActive("codeBlock")}
        onClick={insertCode}
      >
        <Code2 className="w-4 h-4" />
      </ToolbarButton>
      <ToolbarButton
        title="Video (YouTube / Bunny)"
        active={editor.isActive("videoEmbed")}
        onClick={insertVideo}
      >
        <Video className="w-4 h-4" />
      </ToolbarButton>
      {editor.isActive("codeBlock") ? (
        <select
          className="ml-1 rounded-lg border border-border-light bg-bg-card text-xs text-text-primary px-2 py-1"
          value={String(editor.getAttributes("codeBlock").language || "plaintext")}
          onChange={(e) =>
            editor
              .chain()
              .focus()
              .updateAttributes("codeBlock", { language: e.target.value })
              .run()
          }
        >
          {CODE_LANGUAGES.map((lang) => (
            <option key={lang.id} value={lang.id}>
              {lang.label}
            </option>
          ))}
        </select>
      ) : null}
      <ToolbarButton
        title="Step section"
        active={editor.isActive("stepHeading")}
        onClick={() => {
          const title = window.prompt("ชื่อขั้นตอน", "ขั้นตอนใหม่");
          if (title === null) return;
          editor.chain().focus().insertStepHeading({ title: title || "ขั้นตอนใหม่" }).run();
        }}
      >
        <StepIcon className="w-4 h-4" />
      </ToolbarButton>
      <div className="mx-1 h-5 w-px bg-border-light" />
      <ToolbarButton
        title="Undo"
        onClick={() => editor.chain().focus().undo().run()}
        disabled={!editor.can().undo()}
      >
        <Undo2 className="w-4 h-4" />
      </ToolbarButton>
      <ToolbarButton
        title="Redo"
        onClick={() => editor.chain().focus().redo().run()}
        disabled={!editor.can().redo()}
      >
        <Redo2 className="w-4 h-4" />
      </ToolbarButton>
    </div>
  );
}

export function ArticleEditor({
  initialDoc,
  onChange,
  onUploadImage,
  className,
}: ArticleEditorProps) {
  const editor = useEditor({
    immediatelyRender: false,
    extensions: createBlogEditorExtensions(),
    content: initialDoc,
    editorProps: {
      attributes: {
        class:
          "prose-blog min-h-[320px] px-4 py-4 focus:outline-none text-text-primary",
      },
    },
    onUpdate: ({ editor: ed }) => {
      onChange(ed.getJSON() as TipTapDoc);
    },
  });

  useEffect(() => {
    if (!editor) return;
    const current = JSON.stringify(editor.getJSON());
    const next = JSON.stringify(initialDoc);
    if (current !== next) {
      editor.commands.setContent(initialDoc);
    }
    // Only sync when initialDoc identity changes from parent load
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [editor, initialDoc]);

  if (!editor) {
    return (
      <div className="rounded-2xl border border-border-light bg-bg-secondary p-8 text-center text-sm text-text-secondary">
        กำลังโหลดตัวแก้ไข…
      </div>
    );
  }

  return (
    <div
      className={cn(
        "rounded-2xl border border-border-light bg-bg-card overflow-hidden",
        className
      )}
    >
      <EditorToolbar editor={editor} onUploadImage={onUploadImage} />
      <EditorContent editor={editor} />
      <style jsx global>{`
        .prose-blog {
          max-width: 65ch;
        }
        .prose-blog p {
          margin: 0.75rem 0;
          line-height: 1.5;
          font-size: 1rem;
          font-weight: 400;
        }
        .prose-blog h2 {
          font-size: 1.25rem;
          font-weight: 600;
          line-height: 1.3;
          margin: 1.25rem 0 0.5rem;
          text-wrap: balance;
        }
        .prose-blog h3 {
          font-size: 1rem;
          font-weight: 500;
          line-height: 1.4;
          margin: 1rem 0 0.4rem;
          text-wrap: balance;
        }
        .prose-blog ul {
          list-style: disc;
          padding-left: 1.25rem;
          margin: 0.75rem 0;
          line-height: 1.5;
        }
        .prose-blog ol {
          list-style: decimal;
          padding-left: 1.25rem;
          margin: 0.75rem 0;
          line-height: 1.5;
        }
        .prose-blog blockquote {
          background: var(--bg-secondary, #f7f8fa);
          border-radius: 0.75rem;
          padding: 0.75rem 1rem;
          margin: 0.75rem 0;
          color: var(--text-secondary, #6b7280);
          line-height: 1.5;
        }
        .prose-blog pre {
          background: #0d1117;
          color: #e6edf3;
          border-radius: 0.75rem;
          padding: 1rem;
          overflow-x: auto;
          font-family: ui-monospace, monospace;
          font-size: 0.75rem;
          line-height: 1.5;
          margin: 0.75rem 0;
        }
        .prose-blog img {
          max-width: 100%;
          height: auto;
          border-radius: 0.75rem;
          margin: 0.75rem 0;
        }
        .prose-blog .blog-step-heading {
          display: flex;
          align-items: center;
          gap: 0.75rem;
          border: 1px solid var(--border-light, #e5e7eb);
          border-radius: 1rem;
          padding: 0.75rem 1rem;
          margin: 0.75rem 0;
          background: var(--bg-secondary, #f7f8fa);
        }
        .dark .prose-blog .blog-step-heading {
          border-color: var(--border-light, #374151);
          background: var(--bg-tertiary, #1a1a1a);
        }
        .prose-blog .blog-step-heading__label {
          display: inline-flex;
          align-items: center;
          justify-content: center;
          background: var(--line-green-light, #e8f8ef);
          color: var(--line-green-link);
          font-size: 0.75rem;
          font-weight: 500;
          line-height: 1.3;
          border-radius: 999px;
          padding: 0.25rem 0.6rem;
        }
        .prose-blog .blog-step-heading__title {
          font-size: 1rem;
          font-weight: 500;
          line-height: 1.4;
        }
        .prose-blog .blog-video-embed {
          display: flex;
          flex-direction: column;
          gap: 0.35rem;
          border: 1px solid var(--border-light, #e5e7eb);
          border-radius: 1rem;
          padding: 0.85rem 1rem;
          margin: 0.75rem 0;
          background: var(--bg-secondary, #f7f8fa);
        }
        .dark .prose-blog .blog-video-embed {
          background: var(--bg-tertiary, #1a1a1a);
          border-color: var(--border-light, #374151);
        }
        .prose-blog .blog-video-embed__badge {
          display: inline-flex;
          width: fit-content;
          font-size: 0.75rem;
          font-weight: 500;
          line-height: 1.3;
          color: var(--text-secondary, #6b7280);
        }
        .prose-blog .blog-video-embed__title {
          font-size: 1rem;
          font-weight: 500;
          line-height: 1.4;
          color: var(--text-primary, #191919);
        }
        .prose-blog p.is-editor-empty:first-child::before {
          content: attr(data-placeholder);
          float: left;
          color: var(--text-tertiary, #9ca3af);
          pointer-events: none;
          height: 0;
        }
      `}</style>
    </div>
  );
}
