import Image from "next/image";
import { parseHelpBody } from "@/lib/help/types";
import { cn } from "@/lib/utils";

type GuideSectionProps = {
  title: string;
  body: string;
  imageUrl?: string | null;
  stepNumber?: number;
  className?: string;
};

export function GuideSection({
  title,
  body,
  imageUrl,
  stepNumber,
  className,
}: GuideSectionProps) {
  const blocks = parseHelpBody(body);

  return (
    <article
      className={cn(
        "rounded-2xl border border-border-light bg-bg-primary p-5 md:p-6",
        className
      )}
    >
      <div className="flex items-start gap-3">
        {typeof stepNumber === "number" && (
          <span
            className="flex h-8 w-8 shrink-0 items-center justify-center rounded-full bg-line-green-light text-sm font-semibold text-line-green-link"
            aria-hidden
          >
            {stepNumber}
          </span>
        )}
        <div className="min-w-0 flex-1 space-y-3">
          <h2 className="text-balance text-xl font-semibold leading-[1.3] text-text-primary">
            {title}
          </h2>
          <div className="space-y-3 text-base leading-[1.5] text-text-primary">
            {blocks.map((block, index) =>
              block.type === "list" ? (
                <ul key={index} className="list-disc space-y-1.5 pl-5 text-text-secondary">
                  {block.items.map((item) => (
                    <li key={item}>{item}</li>
                  ))}
                </ul>
              ) : (
                <p key={index} className="text-pretty text-text-secondary">
                  {block.text}
                </p>
              )
            )}
          </div>
          {imageUrl ? (
            <div className="overflow-hidden rounded-xl border border-border-light bg-bg-secondary">
              <Image
                src={imageUrl}
                alt=""
                width={960}
                height={640}
                className="h-auto w-full object-contain"
                unoptimized={imageUrl.startsWith("http")}
              />
            </div>
          ) : null}
        </div>
      </div>
    </article>
  );
}
