import React, { useState } from "react";
import { CheckIcon, CopyIcon, CodeIcon, ExternalLinkIcon } from "../components/Icons";

interface CodeBlockProps {
	language: string;
	code: string;
}

const CodeBlock: React.FC<CodeBlockProps> = ({ language, code }) => {
	const [copied, setCopied] = useState(false);

	const handleCopy = (e: React.MouseEvent) => {
		e.stopPropagation();
		navigator.clipboard.writeText(code);
		setCopied(true);
		setTimeout(() => setCopied(false), 2000);
	};

	const displayLanguage = language || "plaintext";

	return (
		<div className="code-block-wrapper">
			<div className="code-block-header">
				<div className="code-block-lang">
					<CodeIcon size={14} />
					<span>{displayLanguage}</span>
				</div>
				<button
					type="button"
					className={`code-copy-btn ${copied ? "copied" : ""}`}
					onClick={handleCopy}
					title="Salin kode"
				>
					{copied ? (
						<>
							<CheckIcon size={13} />
							<span>Tersalin</span>
						</>
					) : (
						<>
							<CopyIcon size={13} />
							<span>Salin</span>
						</>
					)}
				</button>
			</div>
			<pre className="code-block-content">
				<code>{code}</code>
			</pre>
		</div>
	);
};

// Render inline markdown elements: links, bold, italic, inline code, strike
export function renderInlineMarkdown(text: string): React.ReactNode[] {
	const nodes: React.ReactNode[] = [];
	let remaining = text;
	let keyIndex = 0;

	// Regex for link [text](url) or naked URL, bold **text**, italic *text*, strike ~~text~~, code `code`
	const tokenRegex = /(\[(.+?)\]\((https?:\/\/[^\s)]+)\)|(https?:\/\/[^\s]+)|(`[^`]+`)|(\*\*[^*]+\*\*)|(\*[^*]+\*)|(~~[^~]+~~))/g;

	let match: RegExpExecArray | null;
	let lastIndex = 0;

	while ((match = tokenRegex.exec(text)) !== null) {
		// Push preceding text
		if (match.index > lastIndex) {
			nodes.push(text.slice(lastIndex, match.index));
		}

		const fullMatch = match[0];

		if (match[2] && match[3]) {
			// [text](url)
			const label = match[2];
			const url = match[3];
			nodes.push(
				<a
					key={keyIndex++}
					href={url}
					target="_blank"
					rel="noopener noreferrer"
					className="markdown-link"
					onClick={(e) => e.stopPropagation()}
				>
					{label}
					<ExternalLinkIcon size={12} className="inline-link-icon" />
				</a>,
			);
		} else if (match[4]) {
			// naked URL
			const url = match[4];
			nodes.push(
				<a
					key={keyIndex++}
					href={url}
					target="_blank"
					rel="noopener noreferrer"
					className="markdown-link"
					onClick={(e) => e.stopPropagation()}
				>
					{url.length > 38 ? url.slice(0, 35) + "..." : url}
					<ExternalLinkIcon size={12} className="inline-link-icon" />
				</a>,
			);
		} else if (fullMatch.startsWith("`") && fullMatch.endsWith("`")) {
			// inline code
			const codeContent = fullMatch.slice(1, -1);
			nodes.push(
				<code key={keyIndex++} className="inline-code">
					{codeContent}
				</code>,
			);
		} else if (fullMatch.startsWith("**") && fullMatch.endsWith("**")) {
			// bold
			nodes.push(<strong key={keyIndex++}>{fullMatch.slice(2, -2)}</strong>);
		} else if (fullMatch.startsWith("*") && fullMatch.endsWith("*")) {
			// italic
			nodes.push(<em key={keyIndex++}>{fullMatch.slice(1, -1)}</em>);
		} else if (fullMatch.startsWith("~~") && fullMatch.endsWith("~~")) {
			// strikethrough
			nodes.push(<del key={keyIndex++}>{fullMatch.slice(2, -2)}</del>);
		}

		lastIndex = match.index + fullMatch.length;
	}

	if (lastIndex < text.length) {
		nodes.push(text.slice(lastIndex));
	}

	return nodes.length > 0 ? nodes : [text];
}

interface MarkdownContentProps {
	content: string;
}

export const MarkdownContent: React.FC<MarkdownContentProps> = ({ content }) => {
	if (!content) return null;

	// Split by code blocks first
	const parts: React.ReactNode[] = [];
	const codeBlockRegex = /```([a-zA-Z0-9_-]*)\n([\s\S]*?)```/g;

	let lastIndex = 0;
	let match: RegExpExecArray | null;
	let partIndex = 0;

	while ((match = codeBlockRegex.exec(content)) !== null) {
		const prefix = content.substring(lastIndex, match.index);
		if (prefix) {
			parts.push(renderNormalBlocks(prefix, `text-${partIndex++}`));
		}

		const lang = match[1] || "";
		const code = match[2].trimEnd();
		parts.push(<CodeBlock key={`code-${partIndex++}`} language={lang} code={code} />);

		lastIndex = match.index + match[0].length;
	}

	const remaining = content.substring(lastIndex);
	if (remaining) {
		parts.push(renderNormalBlocks(remaining, `text-${partIndex++}`));
	}

	return <div className="markdown-body">{parts}</div>;
};

function renderNormalBlocks(text: string, keyPrefix: string): React.ReactNode {
	const lines = text.split("\n");
	const elements: React.ReactNode[] = [];
	let currentList: { type: "ul" | "ol"; items: string[] } | null = null;
	let currentQuote: string[] = [];

	const flushList = () => {
		if (currentList) {
			const ListTag = currentList.type;
			elements.push(
				<ListTag key={`${keyPrefix}-list-${elements.length}`} className="markdown-list">
					{currentList.items.map((it, i) => (
						<li key={i}>{renderInlineMarkdown(it)}</li>
					))}
				</ListTag>,
			);
			currentList = null;
		}
	};

	const flushQuote = () => {
		if (currentQuote.length > 0) {
			elements.push(
				<blockquote key={`${keyPrefix}-quote-${elements.length}`} className="markdown-blockquote">
					{currentQuote.map((line, i) => (
						<p key={i}>{renderInlineMarkdown(line)}</p>
					))}
				</blockquote>,
			);
			currentQuote = [];
		}
	};

	lines.forEach((line, index) => {
		const trimmed = line.trim();

		// Check Blockquote
		if (trimmed.startsWith(">")) {
			flushList();
			currentQuote.push(trimmed.replace(/^>\s*/, ""));
			return;
		} else {
			flushQuote();
		}

		// Check unordered list
		if (trimmed.startsWith("- ") || trimmed.startsWith("* ")) {
			if (!currentList || currentList.type !== "ul") {
				flushList();
				currentList = { type: "ul", items: [] };
			}
			currentList.items.push(trimmed.substring(2));
			return;
		}

		// Check ordered list
		const numMatch = trimmed.match(/^(\d+)\.\s+(.*)$/);
		if (numMatch) {
			if (!currentList || currentList.type !== "ol") {
				flushList();
				currentList = { type: "ol", items: [] };
			}
			currentList.items.push(numMatch[2]);
			return;
		}

		flushList();

		if (trimmed === "") {
			elements.push(<div key={`${keyPrefix}-space-${index}`} className="markdown-paragraph-gap" />);
		} else {
			elements.push(
				<p key={`${keyPrefix}-p-${index}`} className="markdown-paragraph">
					{renderInlineMarkdown(line)}
				</p>,
			);
		}
	});

	flushList();
	flushQuote();

	return <React.Fragment key={keyPrefix}>{elements}</React.Fragment>;
}
