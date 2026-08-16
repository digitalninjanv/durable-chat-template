import React, { useState, useRef, useEffect } from "react";
import type { ReplyInfo, ChatMessage, Attachment, TTLOption } from "../types";
import { compressImageFile } from "../utils/helpers";
import {
	SendIcon,
	PaperclipIcon,
	SmileIcon,
	BoldIcon,
	ItalicIcon,
	CodeIcon,
	QuoteIcon,
	CloseIcon,
	EditIcon,
	ReplyIcon,
	FlameIcon,
	BotIcon,
	LockIcon,
} from "./Icons";

interface MessageInputProps {
	currentUserName: string;
	onSendMessage: (text: string, ttl?: TTLOption, burnOnRead?: boolean) => void;
	onSendAttachment: (attachment: Attachment, caption?: string, ttl?: TTLOption) => void;
	activeReply: ReplyInfo | null;
	onCancelReply: () => void;
	editingMessage: ChatMessage | null;
	onCancelEdit: () => void;
	onSaveEdit: (newContent: string) => void;
	onOpenAttachmentModal: () => void;
	onTyping: () => void;
	isE2EE?: boolean;
}

const COMMON_EMOJIS = ["😀", "🔥", "👍", "🚀", "❤️", "🎉", "💡", "✨", "👏", "💯", "👀", "🤖", "⚡", "💻", "☕", "🔒", "🛡️"];

const TTL_PRESETS: { label: string; value: TTLOption; isBurn?: boolean }[] = [
	{ label: "Tanpa batas waktu", value: 0 },
	{ label: "10 Detik ⏱️", value: 10 },
	{ label: "1 Menit ⏱️", value: 60 },
	{ label: "5 Menit ⏱️", value: 300 },
	{ label: "1 Jam ⏱️", value: 3600 },
	{ label: "24 Jam ⏱️", value: 86400 },
	{ label: "Hancur Setelah Dibaca (Dead Drop) 🔥", value: -1, isBurn: true },
];

export const MessageInput: React.FC<MessageInputProps> = ({
	currentUserName,
	onSendMessage,
	onSendAttachment,
	activeReply,
	onCancelReply,
	editingMessage,
	onCancelEdit,
	onSaveEdit,
	onOpenAttachmentModal,
	onTyping,
	isE2EE,
}) => {
	const [text, setText] = useState("");
	const [showEmojiPicker, setShowEmojiPicker] = useState(false);
	const [showTTLMenu, setShowTTLMenu] = useState(false);
	const [selectedTTL, setSelectedTTL] = useState<TTLOption>(0);

	const textareaRef = useRef<HTMLTextAreaElement>(null);

	// Sync editing state
	useEffect(() => {
		if (editingMessage) {
			setText(editingMessage.content);
			textareaRef.current?.focus();
		}
	}, [editingMessage]);

	// Auto-resize textarea
	useEffect(() => {
		const el = textareaRef.current;
		if (el) {
			el.style.height = "auto";
			const scrollHeight = el.scrollHeight;
			el.style.height = `${Math.min(Math.max(scrollHeight, 40), 160)}px`;
		}
	}, [text]);

	const handleSubmit = (e?: React.FormEvent) => {
		if (e) e.preventDefault();
		const trimmed = text.trim();
		if (!trimmed) return;

		if (editingMessage) {
			onSaveEdit(trimmed);
			setText("");
		} else {
			const isBurn = selectedTTL === -1;
			const ttlValue = selectedTTL === -1 ? 0 : selectedTTL;
			onSendMessage(trimmed, ttlValue, isBurn);
			setText("");
		}

		if (textareaRef.current) {
			textareaRef.current.style.height = "40px";
			textareaRef.current.focus();
		}
	};

	const handleKeyDown = (e: React.KeyboardEvent<HTMLTextAreaElement>) => {
		// Enter without Shift -> submit
		if (e.key === "Enter" && !e.shiftKey) {
			e.preventDefault();
			handleSubmit();
			return;
		}

		// Escape -> cancel reply/edit
		if (e.key === "Escape") {
			if (editingMessage) onCancelEdit();
			if (activeReply) onCancelReply();
			setShowEmojiPicker(false);
			setShowTTLMenu(false);
		}

		// Markdown shortcuts: Ctrl+B (Bold), Ctrl+I (Italic)
		if ((e.ctrlKey || e.metaKey) && e.key.toLowerCase() === "b") {
			e.preventDefault();
			insertFormatting("**", "**");
		} else if ((e.ctrlKey || e.metaKey) && e.key.toLowerCase() === "i") {
			e.preventDefault();
			insertFormatting("*", "*");
		}
	};

	// Handle Image Paste from Clipboard (Ctrl+V)
	const handlePaste = async (e: React.ClipboardEvent<HTMLTextAreaElement>) => {
		const items = e.clipboardData?.items;
		if (!items) return;

		for (let i = 0; i < items.length; i++) {
			const item = items[i];
			if (item.type.indexOf("image") !== -1) {
				const file = item.getAsFile();
				if (file) {
					e.preventDefault();
					try {
						const { dataUrl, size, name } = await compressImageFile(file);
						onSendAttachment(
							{
								type: "image",
								url: dataUrl,
								name: name || `Tangkapan_Layar_${Date.now()}.png`,
								size,
							},
							text.trim() || undefined,
							selectedTTL === -1 ? 0 : selectedTTL,
						);
						setText("");
					} catch (err) {
						console.error("Failed to paste image:", err);
					}
					return;
				}
			}
		}
	};

	const handleChange = (e: React.ChangeEvent<HTMLTextAreaElement>) => {
		setText(e.target.value);
		onTyping();
	};

	const insertFormatting = (prefix: string, suffix: string = "") => {
		const el = textareaRef.current;
		if (!el) return;

		const start = el.selectionStart;
		const end = el.selectionEnd;
		const selectedText = text.substring(start, end);
		const replacement = `${prefix}${selectedText || "teks"}${suffix}`;

		const nextText = text.substring(0, start) + replacement + text.substring(end);
		setText(nextText);

		setTimeout(() => {
			el.focus();
			const cursorOffset = selectedText ? start + replacement.length : start + prefix.length + 4;
			el.setSelectionRange(cursorOffset, cursorOffset);
		}, 10);
	};

	const insertEmoji = (emoji: string) => {
		const el = textareaRef.current;
		if (!el) {
			setText((prev) => prev + emoji);
			return;
		}

		const start = el.selectionStart;
		const end = el.selectionEnd;
		const nextText = text.substring(0, start) + emoji + text.substring(end);
		setText(nextText);

		setTimeout(() => {
			el.focus();
			el.setSelectionRange(start + emoji.length, start + emoji.length);
		}, 10);
	};

	const handleInsertAICommand = (cmd: string) => {
		setText(cmd);
		textareaRef.current?.focus();
	};

	const hasContent = text.trim().length > 0;
	const isTTLActive = selectedTTL !== 0;

	return (
		<div className="chat-input-container">
			{/* Active Reply Banner */}
			{activeReply && (
				<div className="input-state-banner reply-banner">
					<div className="banner-icon">
						<ReplyIcon size={16} />
					</div>
					<div className="banner-content">
						<div className="banner-title">Membalas {activeReply.user}</div>
						<div className="banner-snippet">{activeReply.content}</div>
					</div>
					<button
						type="button"
						className="banner-close-btn"
						onClick={onCancelReply}
						title="Batalkan balasan"
					>
						<CloseIcon size={16} />
					</button>
				</div>
			)}

			{/* Active Edit Banner */}
			{editingMessage && (
				<div className="input-state-banner edit-banner">
					<div className="banner-icon">
						<EditIcon size={16} />
					</div>
					<div className="banner-content">
						<div className="banner-title">Mode Edit Pesan</div>
						<div className="banner-snippet">Tekan Enter untuk memperbarui, Esc untuk batal</div>
					</div>
					<button
						type="button"
						className="banner-close-btn"
						onClick={onCancelEdit}
						title="Batalkan edit"
					>
						<CloseIcon size={16} />
					</button>
				</div>
			)}

			<form className="chat-form" onSubmit={handleSubmit}>
				{/* Formatting Toolbar */}
				<div className="input-formatting-bar">
					<div className="format-tools-left">
						<button
							type="button"
							className="format-btn"
							onClick={onOpenAttachmentModal}
							title="Lampirkan Gambar atau Berkas (Foto, PDF, Suara)"
						>
							<PaperclipIcon size={16} />
						</button>

						<div className="format-separator" />

						<button
							type="button"
							className="format-btn"
							onClick={() => insertFormatting("**", "**")}
							title="Tebal (Ctrl+B)"
						>
							<BoldIcon size={14} />
						</button>

						<button
							type="button"
							className="format-btn"
							onClick={() => insertFormatting("*", "*")}
							title="Miring (Ctrl+I)"
						>
							<ItalicIcon size={14} />
						</button>

						<button
							type="button"
							className="format-btn"
							onClick={() => insertFormatting("`", "`")}
							title="Kode inline"
						>
							<CodeIcon size={14} />
						</button>

						<button
							type="button"
							className="format-btn"
							onClick={() => insertFormatting("```javascript\n", "\n```")}
							title="Blok Kode"
						>
							<span className="format-code-block-label">{"{ }"}</span>
						</button>

						<button
							type="button"
							className="format-btn"
							onClick={() => insertFormatting("> ", "")}
							title="Kutipan (Quote)"
						>
							<QuoteIcon size={14} />
						</button>

						<div className="format-separator" />

						{/* Quick AI Commands */}
						<button
							type="button"
							className="format-btn ai-quick-btn"
							onClick={() => handleInsertAICommand("/ai ")}
							title="Panggil Cloudflare Workers AI (/ai)"
						>
							<BotIcon size={15} />
							<span className="ai-btn-text">AI</span>
						</button>
					</div>

					<div className="format-tools-right">
						{/* Ephemeral Self-Destruct Timer */}
						<div className="ttl-picker-container">
							<button
								type="button"
								className={`format-btn ttl-btn ${isTTLActive ? "active" : ""}`}
								onClick={() => setShowTTLMenu(!showTTLMenu)}
								title={
									selectedTTL === -1
										? "Mode Dead Drop (Hancur setelah dibaca)"
										: selectedTTL > 0
										? `Pesan lenyap dalam ${selectedTTL}s`
										: "Atur Timer Pesan Meledak (Self-Destruct)"
								}
							>
								<FlameIcon size={15} />
								{isTTLActive && (
									<span className="ttl-active-label">
										{selectedTTL === -1 ? "Dead-drop" : `${selectedTTL < 60 ? `${selectedTTL}s` : selectedTTL < 3600 ? `${selectedTTL / 60}m` : `${selectedTTL / 3600}h`}`}
									</span>
								)}
							</button>

							{showTTLMenu && (
								<div className="ttl-popover-menu">
									<div className="ttl-menu-header">Timer Pesan Lenyap (TTL)</div>
									{TTL_PRESETS.map((p) => (
										<button
											key={p.value}
											type="button"
											className={`ttl-menu-item ${selectedTTL === p.value ? "selected" : ""}`}
											onClick={() => {
												setSelectedTTL(p.value);
												setShowTTLMenu(false);
											}}
										>
											<span>{p.label}</span>
											{selectedTTL === p.value && <span>✓</span>}
										</button>
									))}
								</div>
							)}
						</div>

						{/* Emoji Picker Trigger */}
						<div className="emoji-picker-container">
							<button
								type="button"
								className={`format-btn ${showEmojiPicker ? "active" : ""}`}
								onClick={() => setShowEmojiPicker(!showEmojiPicker)}
								title="Pilih Emoji"
							>
								<SmileIcon size={16} />
							</button>

							{showEmojiPicker && (
								<div className="emoji-popover-card">
									<div className="emoji-popover-header">
										<span>Pilih Emoji</span>
										<button
											type="button"
											className="emoji-popover-close"
											onClick={() => setShowEmojiPicker(false)}
										>
											<CloseIcon size={14} />
										</button>
									</div>
									<div className="emoji-grid">
										{COMMON_EMOJIS.map((emoji) => (
											<button
												key={emoji}
												type="button"
												className="emoji-grid-btn"
												onClick={() => {
													insertEmoji(emoji);
													setShowEmojiPicker(false);
												}}
											>
												{emoji}
											</button>
										))}
									</div>
								</div>
							)}
						</div>
					</div>
				</div>

				{/* Main Textarea & Send Button */}
				<div className="chat-input-row">
					<textarea
						ref={textareaRef}
						className="chat-textarea"
						rows={1}
						placeholder={
							editingMessage
								? "Perbarui teks pesan..."
								: isE2EE
								? `🔒 [E2EE Aktif] Ketik pesan terenkripsi sebagai ${currentUserName}...`
								: `Ketik pesan sebagai ${currentUserName}... (Ketik /ai atau /summarize untuk AI, paste gambar didukung)`
						}
						value={text}
						onChange={handleChange}
						onKeyDown={handleKeyDown}
						onPaste={handlePaste}
					/>

					<button
						type="submit"
						className={`send-action-btn ${hasContent ? "ready" : ""}`}
						disabled={!hasContent}
						title={editingMessage ? "Simpan Perubahan" : "Kirim Pesan (Enter)"}
					>
						<SendIcon size={16} />
					</button>
				</div>
			</form>
		</div>
	);
};
