import Image from "next/image";
import { CodeBlockCopy } from "@/components/blog/code-block-copy";
import { ArticleVideo } from "@/components/blog/article-video";
import { highlightCode } from "@/lib/blog/highlight";
import type { VideoProvider } from "@/lib/blog/video-embed";
import type { TipTapDoc, TipTapMark, TipTapNode } from "@/lib/blog/types";
import { cn } from "@/lib/utils";

type ArticleContentProps = {
  doc: TipTapDoc;
  className?: string;
};

function getText(node: TipTapNode): string {
  if (node.text) return node.text;
  return (node.content ?? []).map(getText).join("");
}

function renderInline(nodes: TipTapNode[] | undefined, keyPrefix: string): React.ReactNode[] {
  if (!nodes) return [];
  return nodes.map((node, index) => {
    const key = `${keyPrefix}-${index}`;
    if (node.type === "text") {
      let el: React.ReactNode = node.text ?? "";
      const marks = node.marks ?? [];
      for (const mark of marks) {
        el = applyMark(el, mark, `${key}-${mark.type}`);
      }
      return <span key={key}>{el}</span>;
    }
    if (node.type === "hardBreak") {
      return <br key={key} />;
    }
    return null;
  });
}

function applyMark(
  children: React.ReactNode,
  mark: TipTapMark,
  key: string
): React.ReactNode {
  switch (mark.type) {
    case "bold":
      return <strong key={key}>{children}</strong>;
    case "italic":
      return <em key={key}>{children}</em>;
    case "code":
      return (
        <code
          key={key}
          className="rounded bg-bg-tertiary px-1.5 py-0.5 font-mono text-[0.9em] text-text-primary"
        >
          {children}
        </code>
      );
    case "link": {
      const href = String(mark.attrs?.href ?? "#");
      const target = mark.attrs?.target ? String(mark.attrs.target) : undefined;
      return (
        <a
          key={key}
          href={href}
          target={target}
          rel={target === "_blank" ? "noopener noreferrer" : undefined}
          className="font-medium text-line-green-link underline hover:text-line-green-link-hover"
        >
          {children}
        </a>
      );
    }
    case "strike":
      return <s key={key}>{children}</s>;
    default:
      return children;
  }
}

async function renderBlock(
  node: TipTapNode,
  index: number,
  stepNumber: { current: number }
): Promise<React.ReactNode> {
  const key = `block-${index}`;

  switch (node.type) {
    case "paragraph":
      return (
        <p
          key={key}
          className="text-pretty text-base leading-[1.5] text-text-secondary"
        >
          {renderInline(node.content, key)}
        </p>
      );

    case "heading": {
      const level = Number(node.attrs?.level ?? 2);
      if (level === 3) {
        return (
          <h3
            key={key}
            className="mt-6 text-balance text-base font-medium leading-[1.4] text-text-primary"
          >
            {renderInline(node.content, key)}
          </h3>
        );
      }
      return (
        <h2
          key={key}
          className="mt-8 text-balance text-xl font-semibold leading-[1.3] text-text-primary"
        >
          {renderInline(node.content, key)}
        </h2>
      );
    }

    case "bulletList":
      return (
        <ul
          key={key}
          className="list-disc space-y-1.5 pl-5 text-base leading-[1.5] text-text-secondary"
        >
          {(node.content ?? []).map((item, i) => (
            <li key={`${key}-li-${i}`}>
              {renderInline(item.content?.[0]?.content, `${key}-li-${i}`)}
            </li>
          ))}
        </ul>
      );

    case "orderedList":
      return (
        <ol
          key={key}
          className="list-decimal space-y-1.5 pl-5 text-base leading-[1.5] text-text-secondary"
        >
          {(node.content ?? []).map((item, i) => (
            <li key={`${key}-li-${i}`}>
              {renderInline(item.content?.[0]?.content, `${key}-li-${i}`)}
            </li>
          ))}
        </ol>
      );

    case "blockquote":
      return (
        <blockquote
          key={key}
          className="rounded-xl bg-bg-secondary px-4 py-3 text-text-secondary"
        >
          {(node.content ?? []).map((child, i) => (
            <p key={`${key}-q-${i}`} className="text-pretty leading-relaxed">
              {renderInline(child.content, `${key}-q-${i}`)}
            </p>
          ))}
        </blockquote>
      );

    case "horizontalRule":
      return <hr key={key} className="border-border-light" />;

    case "image": {
      const src = String(node.attrs?.src ?? "");
      const alt = String(node.attrs?.alt ?? "");
      if (!src) return null;
      return (
        <figure key={key} className="overflow-hidden rounded-xl border border-border-light">
          <Image
            src={src}
            alt={alt}
            width={960}
            height={640}
            className="h-auto w-full object-contain"
            unoptimized={src.startsWith("http")}
          />
          {alt ? (
            <figcaption className="border-t border-border-light px-3 py-2 text-center text-xs text-text-secondary">
              {alt}
            </figcaption>
          ) : null}
        </figure>
      );
    }

    case "codeBlock": {
      const code = getText(node);
      const language = String(node.attrs?.language ?? "plaintext");
      const highlightedHtml = await highlightCode(code, language);
      return (
        <CodeBlockCopy
          key={key}
          code={code}
          language={language}
          highlightedHtml={highlightedHtml}
        />
      );
    }

    case "stepHeading": {
      stepNumber.current += 1;
      const title = String(node.attrs?.title ?? "ขั้นตอน");
      return (
        <div
          key={key}
          className="flex items-start gap-3 rounded-2xl border border-border-light bg-bg-primary p-4 md:p-5"
        >
          <span
            className="flex h-8 w-8 shrink-0 items-center justify-center rounded-full bg-line-green-light text-sm font-semibold text-line-green-link"
            aria-hidden
          >
            {stepNumber.current}
          </span>
          <div className="min-w-0 pt-0.5">
            <p className="text-xs font-medium text-text-secondary mb-0.5">
              ขั้นตอน {stepNumber.current}
            </p>
            <h3 className="text-balance text-base font-medium leading-[1.4] text-text-primary">
              {title}
            </h3>
          </div>
        </div>
      );
    }

    case "videoEmbed": {
      const provider = String(node.attrs?.provider ?? "youtube") as VideoProvider;
      const src = String(node.attrs?.src ?? "");
      const title = String(node.attrs?.title ?? "Video");
      if (!src) return null;
      return (
        <ArticleVideo
          key={key}
          provider={
            provider === "bunny" || provider === "file" || provider === "youtube"
              ? provider
              : "youtube"
          }
          src={src}
          title={title}
        />
      );
    }

    default:
      return null;
  }
}

export async function ArticleContent({ doc, className }: ArticleContentProps) {
  const blocks = doc.content ?? [];
  const stepNumber = { current: 0 };
  const rendered: React.ReactNode[] = [];

  for (let i = 0; i < blocks.length; i++) {
    rendered.push(await renderBlock(blocks[i], i, stepNumber));
  }

  return (
    <div className={cn("space-y-4 max-w-[65ch]", className)}>{rendered}</div>
  );
}
