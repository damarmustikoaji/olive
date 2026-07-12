import ReactMarkdown from "react-markdown";
import remarkGfm from "remark-gfm";

/** Renders AI-authored text (task descriptions, analysis reports) as formatted markdown instead of one raw text blob. */
export function MarkdownContent({ text }: { text: string }) {
  return (
    <div className="prose prose-sm prose-invert max-w-none prose-p:my-2 prose-headings:mb-2 prose-headings:mt-4 prose-ul:my-2 prose-li:my-0">
      <ReactMarkdown remarkPlugins={[remarkGfm]}>{text}</ReactMarkdown>
    </div>
  );
}
