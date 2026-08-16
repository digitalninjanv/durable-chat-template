import React, { useRef, useEffect, useState } from "react";
import type { ChatMessage, Reaction, ReplyInfo, Attachment } from "../types";
import { MessageItem } from "./MessageItem";
import { formatDateHeader, compressImageFile, processDocumentFile } from "../utils/helpers";
import {
	PinIcon,
	ArrowDownIcon,
	CloseIcon,
	SparklesIcon,
	CloudflareIcon,
	CodeIcon,
	DatabaseIcon,
	ImageIcon,
	FileTextIcon,
	BotIcon,
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
	onSendAttachment: (attachment: Attachment, caption?: string) => void;
	onError: (msg: string) => void;
	highlightedMsgId: string | null;
	pinnedOnlyFilter?: boolean;
	e2eePassphrase?: string;
	typingUsers?: Set<string>;
}

const STARTER_PROMPTS = [
	{
		title: "🤖 Tanya Google Gemma 4",
		text: "/ai Halo Gemma 4! Apa saja keunggulan model Gemma 4 26B A4B MoE di Cloudflare Edge?",
	},
	{
		title: "📊 Minta Ringkasan AI",
		text: "/summarize",
	},
	{
		title: "💻 Kode Contoh Worker",
		text: "```typescript\nexport class ChatServer extends Server {\n  onMessage(conn, msg) {\n    this.broadcast(msg);\n  }\n}\n```",
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
	onSendAttachment,
	onError,
	highlightedMsgId,
	pinnedOnlyFilter = false,
	e2eePassphrase,
	typingUsers,
}) => {
	const messagesEndRef = useRef<HTMLDivElement>(null);
	const scrollContainerRef = useRef<HTMLDivElement>(null);
	const [showScrollBottom, setShowScrollBottom] = useState(false);
	const [localHighlightedId, setLocalHighlightedId] = useState<string | null>(null);
	const [isDraggingOver, setIsDraggingOver] = useState(false);

	const dragCounterRef = useRef(0);

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

	// Auto scroll to bottom on new message or when typing starts
	useEffect(() => {
		if (!showScrollBottom) {
			messagesEndRef.current?.scrollIntoView({ behavior: "smooth" });
		}
	}, [messages.length, typingUsers?.size]);

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

	// Drag and Drop File Handlers
	const handleDragEnter = (e: React.DragEvent) => {
		e.preventDefault();
		e.stopPropagation();
		dragCounterRef.current += 1;
		if (e.dataTransfer.items && e.dataTransfer.items.length > 0) {
			setIsDraggingOver(true);
		}
	};

	const handleDragLeave = (e: React.DragEvent) => {
		e.preventDefault();
		e.stopPropagation();
		dragCounterRef.current -= 1;
		if (dragCounterRef.current <= 0) {
			setIsDraggingOver(false);
			dragCounterRef.current = 0;
		}
	};

	const handleDragOver = (e: React.DragEvent) => {
		e.preventDefault();
		e.stopPropagation();
	};

	const handleDrop = async (e: React.DragEvent) => {
		e.preventDefault();
		e.stopPropagation();
		setIsDraggingOver(false);
		dragCounterRef.current = 0;

		const files = e.dataTransfer.files;
		if (!files || files.length === 0) return;

		for (let i = 0; i < files.length; i++) {
			const file = files[i];

			if (file.type.startsWith("image/")) {
				try {
					const { dataUrl, size, name } = await compressImageFile(file);
					onSendAttachment({
						type: "image",
						url: dataUrl,
						name,
						size,
					});
				} catch (err) {
					console.error("Error processing dropped image:", err);
					onError("Gagal memproses gambar.");
				}
			} else {
				if (file.size > 3.5 * 1024 * 1024) {
					onError(`Berkas "${file.name}" melebihi batas 3.5MB.`);
					continue;
				}
				try {
					const { dataUrl, size, name } = await processDocumentFile(file);
					onSendAttachment({
						type: "file",
						url: dataUrl,
						name,
						size,
					});
				} catch (err) {
					console.error("Error processing dropped file:", err);
					onError("Gagal memproses berkas.");
				}
			}
		}
	};

	const activeTypingList = typingUsers ? Array.from(typingUsers) : [];

	return (
		<div
			className="chat-area-viewport"
			onDragEnter={handleDragEnter}
			onDragLeave={handleDragLeave}
			onDragOver={handleDragOver}
			onDrop={handleDrop}
		>
			{/* Drag & Drop Visual Overlay */}
			{isDraggingOver && (
				<div className="drag-drop-overlay">
					<div className="drag-drop-card">
						<div className="drag-drop-icon">
							<ImageIcon size={36} />
						</div>
						<div className="drag-drop-title">Lepaskan Berkas di Sini</div>
						<div className="drag-drop-sub">
							Foto atau dokumen akan langsung dikompresi dan dikirim ke saluran #{room}
						</div>
					</div>
				</div>
			)}

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
							Ruangan ini terhubung langsung ke instans <strong>Durable Object SQLite</strong> edge regional dengan integrasi <strong>Google Gemma 4 AI</strong>.
						</p>

						<div className="starter-prompts-container">
							<span className="starter-prompts-label">Mulai percakapan atau panggil AI:</span>
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
									e2eePassphrase={e2eePassphrase}
								/>
							</React.Fragment>
						);
					})
				)}

				{/* In-stream Live Typing Indicator */}
				{activeTypingList.length > 0 && (
					<div className="in-chat-typing-row">
						<div className="in-chat-typing-avatar">
							{activeTypingList.some((u) => u.toLowerCase().includes("gemma") || u.toLowerCase().includes("ai")) ? (
								<BotIcon size={16} />
							) : (
								activeTypingList[0][0].toUpperCase()
							)}
						</div>
						<div className="in-chat-typing-bubble">
							<div className="typing-dots-anim">
								<span className="dot dot-1" />
								<span className="dot dot-2" />
								<span className="dot dot-3" />
							</div>
							<span className="typing-user-text">
								{activeTypingList.join(", ")} sedang mengetik...
							</span>
						</div>
					</div>
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
