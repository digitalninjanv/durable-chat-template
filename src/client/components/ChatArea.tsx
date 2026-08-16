import React, { useRef, useEffect, useState } from "react";
import type { ChatMessage, Reaction, ReplyInfo } from "../types";
import { MessageItem } from "./MessageItem";
import { formatDateHeader } from "../utils/helpers";
import {
	PinIcon,
	ArrowDownIcon,
	CloseIcon,
	SparklesIcon,
	CloudflareIcon,
	CodeIcon,
	DatabaseIcon,
} from "./Icons";

interface ChatAreaProps {
	room: string;
	messages: ChatMessage[];
	currentUserName: string;
	onReply: (message: ChatMessage) => void;
	onEdit: (message: ChatMessage) => void;
	onDelete: (id: string) => void;
	onTogglePin: (message: ChatMessage) => void;
	onAddReaction: (message: ChatMessage, emoji: string) => void;
	onImageClick: (url: string) => void;
	onSendPrompt: (promptText: string) => void;
	highlightedMsgId: string | null;
	pinnedOnlyFilter?: boolean;
}

const STARTER_PROMPTS = [
	{
		title: "💡 Arsitektur Cloudflare",
		text: "Bagaimana cara kerja SQLite storage di dalam Durable Objects untuk chat realtime?",
	},
	{
		title: "💻 Kode Contoh Worker",
		text: "```typescript\nexport class ChatServer extends Server {\n  onMessage(conn, msg) {\n    this.broadcast(msg);\n  }\n}\n```",
	},
	{
		title: "🚀 Status Edge Jaringan",
		text: "Halo tim! Pengujian performa WebSocket edge sub-millisecond berhasil dijalankan. 🌐⚡",
	},
];

export const ChatArea: React.FC<ChatAreaProps> = ({
	room,
	messages,
	currentUserName,
	onReply,
	onEdit,
	onDelete,
	onTogglePin,
	onAddReaction,
	onImageClick,
	onSendPrompt,
	highlightedMsgId,
	pinnedOnlyFilter = false,
}) => {
	const messagesEndRef = useRef<HTMLDivElement>(null);
	const scrollContainerRef = useRef<HTMLDivElement>(null);
	const [showScrollBottom, setShowScrollBottom] = useState(false);
	const [localHighlightedId, setLocalHighlightedId] = useState<string | null>(null);

	// Get latest pinned message
	const latestPinned = messages.slice().reverse().find((m) => m.pinned);

	const displayedMessages = pinnedOnlyFilter
		? messages.filter((m) => m.pinned)
		: messages;

	// Handle Jump to message
	const handleJumpToMessage = (messageId: string) => {
		const target = document.getElementById(`msg-${messageId}`);
		if (target) {
			target.scrollIntoView({ behavior: "smooth", block: "center" });
			setLocalHighlightedId(messageId);
			setTimeout(() => {
				setLocalHighlightedId((curr) => (curr === messageId ? null : curr));
			}, 2500);
		}
	};

	useEffect(() => {
		if (highlightedMsgId) {
			handleJumpToMessage(highlightedMsgId);
		}
	}, [highlightedMsgId]);

	// Auto scroll to bottom on new message
	useEffect(() => {
		if (!showScrollBottom) {
			messagesEndRef.current?.scrollIntoView({ behavior: "smooth" });
		}
	}, [messages.length]);

	const handleScroll = () => {
		const el = scrollContainerRef.current;
		if (!el) return;
		const isNearBottom = el.scrollHeight - el.scrollTop - el.clientHeight < 120;
		setShowScrollBottom(!isNearBottom);
	};

	const scrollToBottom = () => {
		messagesEndRef.current?.scrollIntoView({ behavior: "smooth" });
		setShowScrollBottom(false);
	};

	return (
		<div className="chat-area-viewport">
			{/* Top Pinned Banner */}
			{latestPinned && !pinnedOnlyFilter && (
				<div className="pinned-message-banner">
					<div className="pinned-banner-icon">
						<PinIcon size={16} />
					</div>
					<div
						className="pinned-banner-info"
						onClick={() => handleJumpToMessage(latestPinned.id)}
						role="button"
						tabIndex={0}
					>
						<div className="pinned-banner-title">Pesan Disematkan</div>
						<div className="pinned-banner-snippet">
							<strong>{latestPinned.user}:</strong> {latestPinned.content}
						</div>
					</div>
					<button
						type="button"
						className="pinned-banner-action-btn"
						onClick={() => onTogglePin(latestPinned)}
						title="Lepas Sematan"
					>
						<CloseIcon size={15} />
					</button>
				</div>
			)}

			{/* Filter Notice Banner if in Pinned Only Mode */}
			{pinnedOnlyFilter && (
				<div className="pinned-filter-banner">
					<PinIcon size={15} />
					<span>Menampilkan pesan yang disematkan saja ({displayedMessages.length})</span>
				</div>
			)}

			{/* Main Scrollable Messages Container */}
			<div
				ref={scrollContainerRef}
				className="chat-messages-scroll"
				onScroll={handleScroll}
			>
				{displayedMessages.length === 0 ? (
					<div className="chat-empty-state-card">
						<div className="empty-state-icon-box">
							<CloudflareIcon size={36} />
						</div>
						<h3 className="empty-state-title">
							Selamat datang di #{room}
						</h3>
						<p className="empty-state-desc">
							Ruangan ini terhubung langsung ke instans <strong>Durable Object SQLite</strong> edge regional. Semua pesan dan interaksi disinkronkan secara real-time.
						</p>

						<div className="starter-prompts-container">
							<span className="starter-prompts-label">Mulai percakapan dengan:</span>
							<div className="starter-prompts-grid">
								{STARTER_PROMPTS.map((p, idx) => (
									<button
										key={idx}
										type="button"
										className="starter-prompt-card"
										onClick={() => onSendPrompt(p.text)}
									>
										<div className="prompt-card-title">{p.title}</div>
										<div className="prompt-card-text">{p.text}</div>
									</button>
								))}
							</div>
						</div>
					</div>
				) : (
					displayedMessages.map((msg, idx) => {
						const prevMsg = idx > 0 ? displayedMessages[idx - 1] : null;
						const showDate =
							!prevMsg ||
							formatDateHeader(prevMsg.timestamp) !== formatDateHeader(msg.timestamp);

						return (
							<React.Fragment key={msg.id}>
								{showDate && (
									<div className="date-separator-row">
										<div className="date-separator-line" />
										<span className="date-separator-pill">
											{formatDateHeader(msg.timestamp)}
										</span>
										<div className="date-separator-line" />
									</div>
								)}

								<MessageItem
									message={msg}
									currentUserName={currentUserName}
									onReply={onReply}
									onEdit={onEdit}
									onDelete={onDelete}
									onTogglePin={onTogglePin}
									onAddReaction={onAddReaction}
									onImageClick={onImageClick}
									onJumpToReply={handleJumpToMessage}
									isHighlighted={localHighlightedId === msg.id}
								/>
							</React.Fragment>
						);
					})
				)}
				<div ref={messagesEndRef} />
			</div>

			{/* Scroll To Bottom Button */}
			{showScrollBottom && (
				<button
					type="button"
					className="scroll-bottom-floating-btn"
					onClick={scrollToBottom}
					title="Gulir ke pesan terbaru"
					aria-label="Gulir ke bawah"
				>
					<ArrowDownIcon size={18} />
				</button>
			)}
		</div>
	);
};
