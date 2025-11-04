import { useMemo } from "react";
import type { ReactNode } from "react";
import Prism from 'prismjs';
import 'prismjs/themes/prism-tomorrow.css';
import 'prismjs/components/prism-javascript';
import 'prismjs/components/prism-typescript';
import 'prismjs/components/prism-python';
import 'prismjs/components/prism-java';
import 'prismjs/components/prism-c';
import 'prismjs/components/prism-cpp';
import 'prismjs/components/prism-csharp';
import 'prismjs/components/prism-go';
import 'prismjs/components/prism-rust';
import 'prismjs/components/prism-sql';
import 'prismjs/components/prism-json';
import 'prismjs/components/prism-yaml';
import 'prismjs/components/prism-bash';
import 'prismjs/components/prism-css';
import 'prismjs/components/prism-markup';

type BlockType = "paragraph" | "heading" | "list" | "code-block" | "list-item";

interface Block {
  type: BlockType;
  content: string;
  level?: number;
  language?: string;
  ordered?: boolean;
}

type InlineSegmentType = "text" | "bold" | "italic" | "code";

interface InlineSegment {
  type: InlineSegmentType;
  content: string;
  segments?: InlineSegment[];
}

const parseInlineSegments = (text: string): InlineSegment[] => {
  const segments: InlineSegment[] = [];
  let buffer = "";

  const flushBuffer = () => {
    if (buffer) {
      segments.push({ type: "text", content: buffer });
      buffer = "";
    }
  };

  let index = 0;
  const pushText = () => {
    if (buffer) {
      segments.push({ type: "text", content: buffer });
      buffer = "";
    }
  };

  while (index < text.length) {
    const char = text[index];

    // Inline code has highest priority to prevent bold/italic wrapping it
    if (char === "`") {
      const end = text.indexOf("`", index + 1);
      if (end !== -1) {
        pushText();
        segments.push({ type: "code", content: text.slice(index + 1, end) });
        index = end + 1;
        continue;
      }
    }

    // Bold (**text**)
    if (char === "*" && text[index + 1] === "*") {
      const end = text.indexOf("**", index + 2);
      const content = end !== -1 ? text.slice(index + 2, end) : "";
      if (end !== -1 && content.trim().length > 0) {
        pushText();
        segments.push({ type: "bold", content, segments: parseInlineSegments(content) });
        index = end + 2;
        continue;
      }
    }

    // Italic (*text*)
    if (char === "*" && text[index + 1] !== "*") {
      const end = text.indexOf("*", index + 1);
      const content = end !== -1 ? text.slice(index + 1, end) : "";
      if (
        end !== -1 &&
        content.trim().length > 0 &&
        text[index + 1] !== " " &&
        text[end - 1] !== " "
      ) {
        pushText();
        segments.push({ type: "italic", content, segments: parseInlineSegments(content) });
        index = end + 1;
        continue;
      }
    }

    buffer += char;
    index += 1;
  }

  pushText();
  return segments;
};

const parseBlocks = (text: string): Block[] => {
  const lines = text.split("\n");
  const blocks: Block[] = [];
  let i = 0;

  while (i < lines.length) {
    const line = lines[i];
    const trimmed = line.trim();

    // Code block
    if (trimmed.startsWith("```")) {
      const language = trimmed.slice(3).trim() || "text";
      const codeLines: string[] = [];
      i++;
      while (i < lines.length && !lines[i].trim().startsWith("```")) {
        codeLines.push(lines[i]);
        i++;
      }
      blocks.push({ type: "code-block", content: codeLines.join("\n"), language });
      i++;
      continue;
    }

    // Heading
    if (trimmed.startsWith("#")) {
      const match = trimmed.match(/^(#{1,6})\s+(.+)$/);
      if (match) {
        blocks.push({ type: "heading", content: match[2], level: match[1].length });
        i++;
        continue;
      }
    }

    // Unordered list
    if (trimmed.match(/^[*-]\s+/)) {
      const listItems: string[] = [];
      while (i < lines.length && lines[i].trim().match(/^[*-]\s+/)) {
        listItems.push(lines[i].trim().replace(/^[*-]\s+/, ""));
        i++;
      }
      listItems.forEach((item) => {
        blocks.push({ type: "list-item", content: item, ordered: false });
      });
      continue;
    }

    // Ordered list
    if (trimmed.match(/^\d+\.\s+/)) {
      const listItems: string[] = [];
      while (i < lines.length && lines[i].trim().match(/^\d+\.\s+/)) {
        listItems.push(lines[i].trim().replace(/^\d+\.\s+/, ""));
        i++;
      }
      listItems.forEach((item) => {
        blocks.push({ type: "list-item", content: item, ordered: true });
      });
      continue;
    }

    // Empty line
    if (!trimmed) {
      i++;
      continue;
    }

    // Paragraph
    blocks.push({ type: "paragraph", content: line });
    i++;
  }

  return blocks;
};

const renderInline = (segments: InlineSegment[], key: string): ReactNode[] => {
  return segments.map((segment, index) => {
    const segmentKey = `${key}-${index}`;
    switch (segment.type) {
      case "bold": {
        const childSegments = segment.segments ?? [{ type: "text", content: segment.content }];
        return (
          <strong key={segmentKey} className="font-semibold">
            {renderInline(childSegments, `${segmentKey}-child`)}
          </strong>
        );
      }
      case "italic": {
        const childSegments = segment.segments ?? [{ type: "text", content: segment.content }];
        return (
          <em key={segmentKey} className="italic">
            {renderInline(childSegments, `${segmentKey}-child`)}
          </em>
        );
      }
      case "code":
        return (
          <code
            key={segmentKey}
            className="rounded bg-muted/90 px-1.5 py-0.5 font-mono text-xs text-foreground border border-border"
          >
            {segment.content}
          </code>
        );
      default:
        return <span key={segmentKey}>{segment.content}</span>;
    }
  });
};

const MarkdownMessage = ({ content }: { content: string }) => {
  const blocks = useMemo(() => parseBlocks(content), [content]);

  let currentList: { ordered: boolean; items: ReactNode[] } | null = null;
  const elements: ReactNode[] = [];

  const flushList = () => {
    if (currentList) {
      const ListTag = currentList.ordered ? "ol" : "ul";
      elements.push(
        <ListTag
          key={`list-${elements.length}`}
          className={currentList.ordered ? "list-decimal list-inside space-y-1" : "list-disc list-inside space-y-1 ml-1"}
        >
          {currentList.items}
        </ListTag>
      );
      currentList = null;
    }
  };

  blocks.forEach((block, blockIndex) => {
    const key = `block-${blockIndex}`;

    if (block.type === "list-item") {
      const segments = parseInlineSegments(block.content);
      const itemContent = renderInline(segments, `${key}-inline`);

      if (!currentList || currentList.ordered !== block.ordered) {
        flushList();
        currentList = { ordered: block.ordered!, items: [] };
      }

      currentList.items.push(
        <li key={`${key}-item`} className="text-sm leading-relaxed">
          {itemContent}
        </li>
      );
      return;
    }

    flushList();

    switch (block.type) {
      case "heading":
        const HeadingTag = `h${block.level}` as keyof JSX.IntrinsicElements;
        elements.push(
          <HeadingTag
            key={key}
            className="font-semibold mt-4 mb-2 text-foreground"
            style={{ fontSize: `${1.4 - (block.level! - 1) * 0.1}rem` }}
          >
            {block.content}
          </HeadingTag>
        );
        break;

      case "code-block":
        const language = block.language || 'text';
        const grammar = Prism.languages[language] || Prism.languages.text;
        const highlightedCode = Prism.highlight(block.content, grammar, language);
        
        elements.push(
          <div key={key} className="my-3 rounded-lg overflow-hidden border border-border/50">
            <div className="flex items-center justify-between px-4 py-2 bg-muted/50">
              <span className="text-xs font-mono text-muted-foreground">{language}</span>
              <button
                onClick={() => {
                  navigator.clipboard.writeText(block.content);
                }}
                className="text-xs text-muted-foreground hover:text-foreground transition-colors"
              >
                Copy
              </button>
            </div>
            <pre className="p-4 overflow-x-auto bg-muted/30">
              <code 
                className={`language-${language} text-sm font-mono`}
                dangerouslySetInnerHTML={{ __html: highlightedCode }}
              />
            </pre>
          </div>
        );
        break;

      case "paragraph":
        const segments = parseInlineSegments(block.content);
        const inlineContent = renderInline(segments, `${key}-inline`);
        elements.push(
          <p key={key} className="leading-relaxed">
            {inlineContent}
          </p>
        );
        break;
    }
  });

  flushList();

  return <div className="space-y-2 text-sm">{elements}</div>;
};

export default MarkdownMessage;
