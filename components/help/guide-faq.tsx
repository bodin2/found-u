import { CollapsibleSection } from "@/components/ui/collapsible-section";
import { parseHelpBody } from "@/lib/help/types";
import type { HelpSection } from "@/lib/help/types";

type GuideFaqProps = {
  sections: HelpSection[];
};

export function GuideFaq({ sections }: GuideFaqProps) {
  if (sections.length === 0) return null;

  return (
    <section className="space-y-3" aria-labelledby="help-faq-heading">
      <h2
        id="help-faq-heading"
        className="text-balance text-xl font-semibold leading-[1.3] text-text-primary"
      >
        คำถามที่พบบ่อย
      </h2>
      <div className="space-y-2">
        {sections.map((section) => {
          const blocks = parseHelpBody(section.body);
          return (
            <CollapsibleSection key={section.id} title={section.title}>
              <div className="space-y-2 pt-3 text-base leading-[1.5] text-text-secondary">
                {blocks.map((block, index) =>
                  block.type === "list" ? (
                    <ul key={index} className="list-disc space-y-1 pl-5">
                      {block.items.map((item) => (
                        <li key={item}>{item}</li>
                      ))}
                    </ul>
                  ) : (
                    <p key={index} className="text-pretty">
                      {block.text}
                    </p>
                  )
                )}
              </div>
            </CollapsibleSection>
          );
        })}
      </div>
    </section>
  );
}
