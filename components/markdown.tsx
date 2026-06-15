"use client";

import ReactMarkdown from "react-markdown";
import remarkGfm from "remark-gfm";

// Renders model output as markdown with the local .prose-cp styles.
export function Markdown({ children }: { children: string }) {
  return (
    <div className="prose-cp">
      <ReactMarkdown remarkPlugins={[remarkGfm]}>{children}</ReactMarkdown>
    </div>
  );
}
