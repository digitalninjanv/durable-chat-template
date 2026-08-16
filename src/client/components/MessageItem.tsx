import React, { useState, useRef, useEffect } from "react";
import type { ChatMessage, Reaction, Attachment } from "../types";
import { MarkdownContent } from "../utils/markdown";
import {
	getAvatarColor,
	getSenderAccentColor,
	formatMessageTime,
	getInitial,
} from "../utils/helpers";
import {
	DoubleCheckIcon,
	ReplyIcon,
	EditIcon,
	TrashIcon,
	CopyIcon,
	PinIcon,
	PlayIcon,
	PauseIcon,
	FileTextIcon,
	ImageIcon,
	DownloadIcon,
	LockIcon,
	FlameIcon,
	BotIcon,
} from "./Icons";

interface MessageItemProps {
	message: ChatMessage;
	currentUserName: string;
	onReply: (message: ChatMessage) => void;
	onEdit: (message: ChatMessage) => void;
	onDelete: (id: string) => void;
	onTogglePin: (message: ChatMessage) => void;
	onAddReaction: (message: ChatMessage, emoji: string) => void;
	onImageClick: (url: string) => void;
	onJumpToReply: (messageId: string) => void;
	isHighlighted?: boolean;
	e2eePassphrase?: string;
}

const QUICK_EMOJIS = ["👍", "❤️", "🔥", "🎉", "🚀", "💡"];

export const MessageItem: React.FC<MessageItemProps> = ({
	message,
	currentUserName,
	onReply,
	onEdit,
	onDelete,
	onTogglePin,
	onAddReaction,
	onImageClick,
	onJumpToReply,
	isHighlighted,
	e2eePassphrase,
}) => {
	const [isPlayingAudio, setIsPlayingAudio] = useState(false);
	const [audioCurrentTime, setAudioCurrentTime] = useState(0);
	const [audioDuration, setAudioDuration] = useState(0);
	const [isDeadDropRevealed, setIsDeadDropRevealed] = useState(false);
	const [remainingSeconds, setRemainingSeconds] = useState<number | null>(null);

	const audioRef = useRef<HTMLAudioElement | null>(null);
	const isOwn = message.user === currentUserName;
	const isAssistant = message.role === "assistant";
	const isSystem = message.role === "system";

	const avatarStyle = {
		backgroundColor: isAssistant
			? "#2563EB"
			: isSystem
			? "#DC2626"
			: getAvatarColor(message.user).bg,
		color: "#FFFFFF",
	};

	// Live Countdown for TTL Ephemeral messages
	useEffect(() => {
		if (message.expiresAt && message.expiresAt > 0) {
			const updateTimer = () => {
				const diff = Math.max(0, Math.floor((message.expiresAt! - Date.now()) / 1000));
				setRemainingSeconds(diff);
				if (diff <= 0) {
					onDelete(message.id);
				}
			};

			updateTimer();
			const interval = setInterval(updateTimer, 1000);
			return () => clearInterval(interval);
		}
	}, [message.expiresAt, message.id, onDelete]);

	const handleCopy = (e: React.MouseEvent) => {
		e.stopPropagation();
		navigator.clipboard.writeText(message.content);
	};

	const toggleAudio = (e: React.MouseEvent) => {
		e.stopPropagation();
		if (!audioRef.current) return;
		if (isPlayingAudio) {
			audioRef.current.pause();
			setIsPlayingAudio(false);
		} else {
			audioRef.current
				.play()
				.then(() => setIsPlayingAudio(true))
				.catch((err) => console.warn("Audio issue:", err));
		}
	};

	const handleAudioEnded = () => {
		setIsPlayingAudio(false);
		setAudioCurrentTime(0);
	};

	const handleAudioTimeUpdate = () => {
		if (audioRef.current) {
			setAudioCurrentTime(audioRef.current.currentTime);
			if (!audioDuration && audioRef.current.duration) {
				setAudioDuration(audioRef.current.duration);
			}
		}
	};

	// Handle Dead-Drop Reveal & Burn
	const handleRevealDeadDrop = () => {
		setIsDeadDropRevealed(true);
		if (!isOwn) {
			setTimeout(() => {
				onDelete(message.id);
			}, 12000);
		}
	};

	if (isSystem) {
		return (
			<div className="system-notice-row">
				<div className="system-notice-bubble">
					<span>{message.content}</span>
					<time className="system-time">{formatMessageTime(message.timestamp)}</time>
				</div>
			</div>
		);
	}

	return (
		<div
			id={`msg-${message.id}`}
			className={`message-row ${isOwn ? "is-own" : "is-incoming"} ${
				isAssistant ? "is-assistant-row" : ""
			} ${isHighlighted ? "is-highlighted" : ""}`}
		>
			{/* Sender Avatar */}
			{!isOwn && (
				<div className="message-avatar-col">
					<div className="message-avatar" style={avatarStyle} title={message.user}>
						{isAssistant ? <BotIcon size={18} /> : getInitial(message.user)}
					</div>
				</div>
			)}

			<div className="message-body-col">
				{/* Sender Name & Meta Header */}
				<div className="message-meta-header">
					{!isOwn && (
						<span
							className="sender-display-name"
							style={{
								color: isAssistant ? "var(--brand-primary)" : getSenderAccentColor(message.user),
							}}
						>
							{message.user}
						</span>
					)}
					{isOwn && <span className="sender-display-name own-label">Anda</span>}

					{isAssistant && <span className="role-assistant-tag">Edge AI</span>}

					{message.isEncrypted && (
						<span className="e2ee-encrypted-tag" title="Pesan Terenkripsi E2EE">
							<LockIcon size={11} />
							<span>E2EE</span>
						</span>
					)}

					{remainingSeconds !== null && remainingSeconds > 0 && (
						<span className="ttl-countdown-tag" title="Pesan akan terhapus otomatis">
							<FlameIcon size={11} />
							<span>{remainingSeconds}s</span>
						</span>
					)}

					<time className="message-timestamp">{formatMessageTime(message.timestamp)}</time>

					{message.pinned && (
						<span className="pinned-badge" title="Pesan ini disematkan">
							<PinIcon size={12} />
							<span>Disematkan</span>
						</span>
					)}
				</div>

				{/* Bubble Container */}
				<div className="message-bubble-wrapper">
					<div
						className={`message-bubble ${
							isOwn
								? "bubble-own"
								: isAssistant
								? "bubble-assistant"
								: "bubble-incoming"
						}`}
					>
						{/* Dead Drop Locked Warning */}
						{message.burnOnRead && !isDeadDropRevealed && !isOwn ? (
							<div className="dead-drop-gate-box" onClick={handleRevealDeadDrop}>
								<FlameIcon size={20} className="dead-drop-icon" />
								<div className="dead-drop-title">Pesan Sekali Baca (Dead Drop)</div>
								<div className="dead-drop-hint">Klik di sini untuk membuka. Pesan akan lenyap dalam 12 detik setelah dibuka.</div>
							</div>
						) : (
							<>
								{/* Quoted Message */}
								{message.replyTo && (
									<div
										className="quoted-reply-card"
										onClick={() => onJumpToReply(message.replyTo!.id)}
										role="button"
										tabIndex={0}
									>
										<div className="quoted-reply-accent" />
										<div className="quoted-reply-content">
											<div className="quoted-reply-author">{message.replyTo.user}</div>
											<div className="quoted-reply-snippet">{message.replyTo.content}</div>
										</div>
									</div>
								)}

								{/* Attachment Rendering */}
								{message.attachment && (
									<div className="message-attachment-box">
										{/* Image Attachment */}
										{message.attachment.type === "image" && (
											<div
												className="attachment-image-card"
												onClick={() => onImageClick(message.attachment!.url)}
											>
												<img
													src={message.attachment.url}
													alt={message.attachment.name || "Gambar"}
													className="attachment-img"
													loading="lazy"
												/>
												<div className="image-zoom-overlay">
													<ImageIcon size={18} />
													<span>Klik untuk Perbesar</span>
												</div>
											</div>
										)}

										{/* Document / File Attachment */}
										{message.attachment.type === "file" && (
											<div className="attachment-file-card">
												<div className="file-icon-box">
													<FileTextIcon size={20} />
												</div>
												<div className="file-info-box">
													<div className="file-name">{message.attachment.name}</div>
													<div className="file-meta">{message.attachment.size || "Berkas"}</div>
												</div>
												<a
													href={message.attachment.url}
													download={message.attachment.name || "file"}
													className="file-download-action-btn"
													title="Unduh Berkas Ini"
													onClick={(e) => e.stopPropagation()}
												>
													<DownloadIcon size={16} />
												</a>
											</div>
										)}

										{/* Audio Voice Note */}
										{message.attachment.type === "audio" && (
											<div className="attachment-audio-card">
												<audio
													ref={audioRef}
													src={message.attachment.url}
													onEnded={handleAudioEnded}
													onTimeUpdate={handleAudioTimeUpdate}
													preload="metadata"
												/>
												<button
													type="button"
													className="audio-play-btn"
													onClick={toggleAudio}
													aria-label={isPlayingAudio ? "Jeda suara" : "Putar suara"}
												>
													{isPlayingAudio ? <PauseIcon size={16} /> : <PlayIcon size={16} />}
												</button>
												<div className="audio-waveform-container" onClick={toggleAudio}>
													<div className={`waveform-bar bar-1 ${isPlayingAudio ? "animating" : ""}`} />
													<div className={`waveform-bar bar-2 ${isPlayingAudio ? "animating" : ""}`} />
													<div className={`waveform-bar bar-3 ${isPlayingAudio ? "animating" : ""}`} />
													<div className={`waveform-bar bar-4 ${isPlayingAudio ? "animating" : ""}`} />
													<div className={`waveform-bar bar-5 ${isPlayingAudio ? "animating" : ""}`} />
													<div className={`waveform-bar bar-6 ${isPlayingAudio ? "animating" : ""}`} />
													<div className={`waveform-bar bar-7 ${isPlayingAudio ? "animating" : ""}`} />
												</div>
												<span className="audio-duration">
													{isPlayingAudio && audioCurrentTime > 0
														? `0:${Math.floor(audioCurrentTime) < 10 ? "0" : ""}${Math.floor(audioCurrentTime)}`
														: message.attachment.duration || "0:15"}
												</span>
											</div>
										)}
									</div>
								)}

								{/* Main Content Markdown */}
								<div className="message-content-wrapper">
									<MarkdownContent content={message.content} />
								</div>
							</>
						)}

						{/* Footer Details: Edited flag & delivery status */}
						<div className="message-footer-info">
							{message.edited && <span className="edited-indicator">(diedit)</span>}
							<span className="message-time-inline">
								{formatMessageTime(message.timestamp)}
							</span>
							{isOwn && (
								<span className="delivery-status" title="Terkirim ke Edge">
									<DoubleCheckIcon size={14} />
								</span>
							)}
						</div>
					</div>

					{/* Floating Actions Toolbar on Hover */}
					<div className="message-action-toolbar">
						<div className="quick-reactions-strip">
							{QUICK_EMOJIS.slice(0, 4).map((emoji) => (
								<button
									key={emoji}
									type="button"
									className="quick-reaction-btn"
									onClick={() => onAddReaction(message, emoji)}
									title={`Reaksi ${emoji}`}
								>
									{emoji}
								</button>
							))}
						</div>

						<button
							type="button"
							className="action-btn"
							onClick={() => onReply(message)}
							title="Balas pesan"
						>
							<ReplyIcon size={15} />
						</button>

						<button
							type="button"
							className="action-btn"
							onClick={() => onTogglePin(message)}
							title={message.pinned ? "Lepas sematan" : "Sematkan pesan"}
						>
							<PinIcon size={15} />
						</button>

						<button
							type="button"
							className="action-btn"
							onClick={handleCopy}
							title="Salin teks"
						>
							<CopyIcon size={15} />
						</button>

						{isOwn && (
							<button
								type="button"
								className="action-btn"
								onClick={() => onEdit(message)}
								title="Edit pesan"
							>
								<EditIcon size={15} />
							</button>
						)}

						{isOwn && (
							<button
								type="button"
								className="action-btn danger"
								onClick={() => onDelete(message.id)}
								title="Hapus pesan"
							>
								<TrashIcon size={15} />
							</button>
						)}
					</div>
				</div>

				{/* Reactions Bar Below Bubble */}
				{message.reactions && message.reactions.length > 0 && (
					<div className="message-reactions-row">
						{message.reactions.map((r) => {
							const hasReacted = r.users.includes(currentUserName);
							return (
								<button
									key={r.emoji}
									type="button"
									className={`reaction-pill ${hasReacted ? "has-reacted" : ""}`}
									onClick={() => onAddReaction(message, r.emoji)}
									title={r.users.join(", ")}
								>
									<span className="reaction-emoji">{r.emoji}</span>
									<span className="reaction-count">{r.count}</span>
								</button>
							);
						})}
					</div>
				)}
			</div>
		</div>
	);
};
