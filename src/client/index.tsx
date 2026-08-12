import { createRoot } from "react-dom/client";
import { usePartySocket } from "partysocket/react";
import React, { useState, useEffect, useRef } from "react";
import {
	BrowserRouter,
	Routes,
	Route,
	Navigate,
	useParams,
	useNavigate,
} from "react-router";
import { nanoid } from "nanoid";

import { names, type ChatMessage, type Message, type ReplyInfo } from "../shared";

// Color presets for avatars and usernames
const AVATAR_GRADIENTS = [
	"linear-gradient(135deg, #FF6B6B 0%, #FF8E53 100%)",
	"linear-gradient(135deg, #4E65FF 0%, #92EFFD 100%)",
	"linear-gradient(135deg, #764BA2 0%, #667EEA 100%)",
	"linear-gradient(135deg, #F355DA 0%, #6E0DD0 100%)",
	"linear-gradient(135deg, #11998E 0%, #38EF7D 100%)",
	"linear-gradient(135deg, #FC466B 0%, #3F5EFB 100%)",
	"linear-gradient(135deg, #F9D423 0%, #FF4E50 100%)",
	"linear-gradient(135deg, #00B4DB 0%, #0083B0 100%)",
];

const SENDER_COLORS = [
	"#e57373", "#f06292", "#ba68c8", "#9575cd",
	"#7986cb", "#64b5f6", "#4fc3f7", "#4dd0e1",
	"#4db6ac", "#81c784", "#aed581", "#ffb74d"
];

function hashString(str: string): number {
	let hash = 0;
	for (let i = 0; i < str.length; i++) {
		hash = str.charCodeAt(i) + ((hash << 5) - hash);
	}
	return Math.abs(hash);
}

function getAvatarBackground(name: string) {
	return AVATAR_GRADIENTS[hashString(name) % AVATAR_GRADIENTS.length];
}

function getSenderColor(name: string) {
	return SENDER_COLORS[hashString(name) % SENDER_COLORS.length];
}

function formatTime(timestamp?: number) {
	if (!timestamp) return "";
	const date = new Date(timestamp);
	return date.toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" });
}

function formatDateHeader(timestamp?: number) {
	if (!timestamp) return "";
	const date = new Date(timestamp);
	const today = new Date();
	if (date.toDateString() === today.toDateString()) {
		return "Hari ini";
	}
	return date.toLocaleDateString("id-ID", {
		day: "numeric",
		month: "long",
		year: "numeric",
	});
}

function TelegramApp() {
	const navigate = useNavigate();
	const { room } = useParams();

	// Persistent local user nickname
	const [name, setName] = useState<string>(() => {
		const saved = localStorage.getItem("telegram_user_name");
		if (saved) return saved;
		const randomName = names[Math.floor(Math.random() * names.length)];
		localStorage.setItem("telegram_user_name", randomName);
		return randomName;
	});

	const [messages, setMessages] = useState<ChatMessage[]>([]);
	const [inputText, setInputText] = useState("");
	const [activeReply, setActiveReply] = useState<ReplyInfo | null>(null);
	const [editingMessage, setEditingMessage] = useState<ChatMessage | null>(null);
	const [activePopoverId, setActivePopoverId] = useState<string | null>(null);
	const [sidebarOpen, setSidebarOpen] = useState(false);
	const [showNameModal, setShowNameModal] = useState(false);
	const [newNameInput, setNewNameInput] = useState(name);
	const [toastMsg, setToastMsg] = useState<string | null>(null);

	const messagesEndRef = useRef<HTMLDivElement>(null);
	const inputRef = useRef<HTMLInputElement>(null);

	// Auto scroll to bottom
	const scrollToBottom = () => {
		messagesEndRef.current?.scrollIntoView({ behavior: "smooth" });
	};

	useEffect(() => {
		scrollToBottom();
	}, [messages]);

	// Toast helper
	const showToast = (msg: string) => {
		setToastMsg(msg);
		setTimeout(() => {
			setToastMsg((prev) => (prev === msg ? null : prev));
		}, 2500);
	};

	// Close popovers on click outside
	useEffect(() => {
		const handleClickOutside = (e: MouseEvent) => {
			if (!(e.target as HTMLElement).closest(".bubble-actions-trigger") &&
				!(e.target as HTMLElement).closest(".popover-menu")) {
				setActivePopoverId(null);
			}
		};
		window.addEventListener("click", handleClickOutside);
		return () => window.removeEventListener("click", handleClickOutside);
	}, []);

	// PartySocket connection
	const socket = usePartySocket({
		party: "chat",
		room,
		onMessage: (evt) => {
			try {
				const message = JSON.parse(evt.data as string) as Message;
				if (message.type === "add") {
					setMessages((prev) => {
						const exists = prev.some((m) => m.id === message.id);
						if (exists) {
							return prev.map((m) => (m.id === message.id ? message : m));
						}
						return [...prev, message];
					});
				} else if (message.type === "update") {
					setMessages((prev) =>
						prev.map((m) => (m.id === message.id ? message : m)),
					);
				} else if (message.type === "delete") {
					setMessages((prev) => prev.filter((m) => m.id !== message.id));
				} else if (message.type === "all") {
					setMessages(message.messages);
				}
			} catch (e) {
				console.error("Failed parsing message:", e);
			}
		},
	});

	// Send message handler
	const handleSubmit = (e: React.FormEvent) => {
		e.preventDefault();
		const trimmed = inputText.trim();
		if (!trimmed) return;

		if (editingMessage) {
			// Edit mode
			const updated: ChatMessage = {
				...editingMessage,
				content: trimmed,
				edited: true,
			};
			setMessages((prev) => prev.map((m) => (m.id === updated.id ? updated : m)));
			socket.send(
				JSON.stringify({
					type: "update",
					...updated,
				} satisfies Message),
			);
			setEditingMessage(null);
		} else {
			// Add new message
			const newMessage: ChatMessage = {
				id: nanoid(8),
				content: trimmed,
				user: name,
				role: "user",
				timestamp: Date.now(),
				replyTo: activeReply,
			};
			setMessages((prev) => [...prev, newMessage]);
			socket.send(
				JSON.stringify({
					type: "add",
					...newMessage,
				} satisfies Message),
			);
		}

		setInputText("");
		setActiveReply(null);
	};

	// Actions
	const handleCopyText = (content: string) => {
		navigator.clipboard.writeText(content);
		showToast("Teks pesan disalin ke papan klip! 📋");
		setActivePopoverId(null);
	};

	const handleReply = (msg: ChatMessage) => {
		setActiveReply({
			id: msg.id,
			user: msg.user,
			content: msg.content,
		});
		setEditingMessage(null);
		setActivePopoverId(null);
		inputRef.current?.focus();
	};

	const handleEdit = (msg: ChatMessage) => {
		setEditingMessage(msg);
		setInputText(msg.content);
		setActiveReply(null);
		setActivePopoverId(null);
		inputRef.current?.focus();
	};

	const handleDelete = (id: string) => {
		setMessages((prev) => prev.filter((m) => m.id !== id));
		socket.send(
			JSON.stringify({
				type: "delete",
				id,
			} satisfies Message),
		);
		showToast("Pesan telah dihapus 🗑️");
		setActivePopoverId(null);
	};

	const handleCopyRoomLink = () => {
		navigator.clipboard.writeText(window.location.href);
		showToast("Link ruangan berhasil disalin! 🔗");
	};

	const handleSaveName = () => {
		const trimmed = newNameInput.trim();
		if (trimmed) {
			setName(trimmed);
			localStorage.setItem("telegram_user_name", trimmed);
			showToast(`Nama diperbarui ke: ${trimmed}`);
		}
		setShowNameModal(false);
	};

	const handleInsertEmoji = (emoji: string) => {
		setInputText((prev) => prev + emoji);
		inputRef.current?.focus();
	};

	return (
		<div className="telegram-app">
			{/* Toast Notification */}
			{toastMsg && <div className="toast">{toastMsg}</div>}

			{/* Sidebar Drawer */}
			<div className={`chat-sidebar ${sidebarOpen ? "open" : ""}`}>
				<div className="sidebar-header">
					<div className="brand">
						<div className="brand-icon">
							<svg viewBox="0 0 24 24" width="22" height="22" fill="currentColor">
								<path d="M12 2C6.48 2 2 6.48 2 12s4.48 10 10 10 10-4.48 10-10S17.52 2 12 2zm4.64 6.8c-.15 1.58-.8 5.42-1.13 7.19-.14.75-.42 1-.68 1.03-.58.05-1.02-.38-1.58-.75-.88-.58-1.38-.94-2.23-1.5-.99-.65-.35-1.01.22-1.59.15-.15 2.71-2.48 2.76-2.69.01-.03.01-.14-.07-.2-.08-.06-.19-.04-.27-.02-.12.03-1.96 1.25-5.54 3.67-.52.36-1 .54-1.42.53-.47-.01-1.37-.26-2.03-.48-.82-.27-1.47-.42-1.42-.88.03-.25.38-.51 1.07-.78 4.18-1.82 6.97-3.02 8.37-3.61 3.99-1.66 4.82-1.95 5.36-1.96.12 0 .39.03.57.17.15.12.19.28.21.41-.01.06.01.23 0 .36z"/>
							</svg>
						</div>
						<div>
							<div className="brand-title">Telegram Space</div>
							<div className="brand-status">
								<span className="pulse-dot"></span> Online via Cloudflare
							</div>
						</div>
					</div>
					<button
						className="btn-icon mobile-menu-btn"
						onClick={() => setSidebarOpen(false)}
					>
						✕
					</button>
				</div>

				{/* User Card */}
				<div className="sidebar-user-card">
					<div className="user-info">
						<div
							className="avatar"
							style={{ background: getAvatarBackground(name) }}
						>
							{name.charAt(0).toUpperCase()}
						</div>
						<div className="user-details">
							<div className="name">{name}</div>
							<span className="role-badge">Pengguna Aktif</span>
						</div>
					</div>
					<button
						className="btn-icon"
						title="Ubah Nama"
						onClick={() => {
							setNewNameInput(name);
							setShowNameModal(true);
						}}
					>
						<svg viewBox="0 0 24 24" width="18" height="18" fill="none" stroke="currentColor" strokeWidth="2">
							<path d="M11 4H4a2 2 0 0 0-2 2v14a2 2 0 0 0 2 2h14a2 2 0 0 0 2-2v-7"/>
							<path d="M18.5 2.5a2.121 2.121 0 0 1 3 3L12 15l-4 1 1-4 9.5-9.5z"/>
						</svg>
					</button>
				</div>

				{/* Actions */}
				<div className="sidebar-actions">
					<button className="btn-primary" onClick={handleCopyRoomLink}>
						<svg viewBox="0 0 24 24" width="16" height="16" fill="none" stroke="currentColor" strokeWidth="2">
							<circle cx="18" cy="5" r="3"/>
							<circle cx="6" cy="12" r="3"/>
							<circle cx="18" cy="19" r="3"/>
							<line x1="8.59" y1="13.51" x2="15.42" y2="17.49"/>
							<line x1="15.41" y1="6.51" x2="8.59" y2="10.49"/>
						</svg>
						Bagikan Link Ruangan
					</button>
					<button
						className="btn-secondary"
						onClick={() => navigate(`/${nanoid()}`)}
					>
						<svg viewBox="0 0 24 24" width="16" height="16" fill="none" stroke="currentColor" strokeWidth="2">
							<line x1="12" y1="5" x2="12" y2="19"/>
							<line x1="5" y1="12" x2="19" y2="12"/>
						</svg>
						Buat Ruangan Baru
					</button>
				</div>

				<div className="sidebar-info-box">
					💡 <strong>Durable Objects Edge:</strong> Obrolan disinkronkan secara real-time melalui WebSocket dan disimpan di database SQLite Cloudflare.
				</div>
			</div>

			{/* Main Chat Content */}
			<div className="chat-main">
				{/* Top App Bar */}
				<div className="chat-header">
					<div className="header-left">
						<button
							className="btn-icon mobile-menu-btn"
							onClick={() => setSidebarOpen(!sidebarOpen)}
						>
							<svg viewBox="0 0 24 24" width="20" height="20" fill="none" stroke="currentColor" strokeWidth="2">
								<path d="M4 6h16M4 12h16M4 18h16"/>
							</svg>
						</button>
						<div
							className="avatar"
							style={{ background: getAvatarBackground(room || "default") }}
						>
							{(room || "C").charAt(0).toUpperCase()}
						</div>
						<div className="room-meta">
							<div className="room-title">Ruang #{room?.slice(0, 8)}</div>
							<div className="room-sub">Real-time Chat · ID: {room}</div>
						</div>
					</div>

					<div className="header-actions">
						<button
							className="btn-icon"
							title="Salin Link"
							onClick={handleCopyRoomLink}
						>
							<svg viewBox="0 0 24 24" width="18" height="18" fill="none" stroke="currentColor" strokeWidth="2">
								<rect x="9" y="9" width="13" height="13" rx="2" ry="2"/>
								<path d="M5 15H4a2 2 0 0 1-2-2V4a2 2 0 0 1 2-2h9a2 2 0 0 1 2 2v1"/>
							</svg>
						</button>
					</div>
				</div>

				{/* Messages Stream Viewport */}
				<div className="messages-container">
					{messages.length === 0 ? (
						<div className="date-divider">Belum ada pesan. Mulai obrolan sekarang!</div>
					) : (
						messages.map((msg, idx) => {
							const isOwn = msg.user === name;
							const prevMsg = idx > 0 ? messages[idx - 1] : null;
							const showDateDivider =
								!prevMsg ||
								formatDateHeader(prevMsg.timestamp) !==
									formatDateHeader(msg.timestamp);

							return (
								<React.Fragment key={msg.id}>
									{showDateDivider && (
										<div className="date-divider">
											{formatDateHeader(msg.timestamp)}
										</div>
									)}

									<div
										className={`message-row ${
											isOwn ? "outgoing" : "incoming"
										}`}
									>
										{!isOwn && (
											<div
												className="avatar"
												style={{
													background: getAvatarBackground(msg.user),
												}}
											>
												{msg.user.charAt(0).toUpperCase()}
											</div>
										)}

										<div className="message-bubble">
											{/* 3-dots actions trigger */}
											<button
												className={`bubble-actions-trigger ${
													activePopoverId === msg.id ? "active" : ""
												}`}
												onClick={(e) => {
													e.stopPropagation();
													setActivePopoverId(
														activePopoverId === msg.id ? null : msg.id,
													);
												}}
												title="Opsi Pesan"
											>
												<svg viewBox="0 0 24 24" width="16" height="16" fill="currentColor">
													<circle cx="12" cy="5" r="2"/>
													<circle cx="12" cy="12" r="2"/>
													<circle cx="12" cy="19" r="2"/>
												</svg>
											</button>

											{/* Popover Menu */}
											{activePopoverId === msg.id && (
												<div className="popover-menu">
													<div
														className="popover-item"
														onClick={() => handleCopyText(msg.content)}
													>
														<span>📋</span> Salin Teks
													</div>
													<div
														className="popover-item"
														onClick={() => handleReply(msg)}
													>
														<span>💬</span> Balas Pesan
													</div>
													{isOwn && (
														<div
															className="popover-item"
															onClick={() => handleEdit(msg)}
														>
															<span>✏️</span> Edit Pesan
														</div>
													)}
													{isOwn && (
														<div
															className="popover-item danger"
															onClick={() => handleDelete(msg.id)}
														>
															<span>🗑️</span> Hapus Pesan
														</div>
													)}
												</div>
											)}

											{/* Sender name for incoming */}
											{!isOwn && (
												<div
													className="sender-name"
													style={{ color: getSenderColor(msg.user) }}
												>
													{msg.user}
												</div>
											)}

											{/* Quoted Message Preview */}
											{msg.replyTo && (
												<div className="quoted-box">
													<div className="quoted-user">
														{msg.replyTo.user}
													</div>
													<div className="quoted-text">
														{msg.replyTo.content}
													</div>
												</div>
											)}

											{/* Main Message Text */}
											<div className="message-text">{msg.content}</div>

											{/* Time & Meta */}
											<div className="message-meta">
												{msg.edited && (
													<span className="edited-tag">diedit</span>
												)}
												<span>{formatTime(msg.timestamp)}</span>
											</div>
										</div>
									</div>
								</React.Fragment>
							);
						})
					)}
					<div ref={messagesEndRef} />
				</div>

				{/* Quoted Reply Banner above Input */}
				{activeReply && (
					<div className="reply-preview-bar">
						<div className="reply-preview-info">
							<div className="reply-preview-title">
								Membalas {activeReply.user}
							</div>
							<div className="reply-preview-text">{activeReply.content}</div>
						</div>
						<button
							className="btn-icon"
							onClick={() => setActiveReply(null)}
						>
							✕
						</button>
					</div>
				)}

				{/* Edit Mode Banner */}
				{editingMessage && (
					<div className="reply-preview-bar" style={{ borderLeftColor: "#ffb74d" }}>
						<div className="reply-preview-info">
							<div className="reply-preview-title" style={{ color: "#ffb74d" }}>
								Mengedit Pesan
							</div>
							<div className="reply-preview-text">{editingMessage.content}</div>
						</div>
						<button
							className="btn-icon"
							onClick={() => {
								setEditingMessage(null);
								setInputText("");
							}}
						>
							✕
						</button>
					</div>
				)}

				{/* Quick Emoji Bar */}
				<div className="emoji-quick-bar">
					{["👍", "❤️", "🔥", "😂", "🎉", "😮", "🙏", "💯"].map((emoji) => (
						<button
							key={emoji}
							className="emoji-btn"
							type="button"
							onClick={() => handleInsertEmoji(emoji)}
						>
							{emoji}
						</button>
					))}
				</div>

				{/* Bottom Chat Input Form */}
				<form className="chat-input-area" onSubmit={handleSubmit}>
					<div className="chat-input-wrapper">
						<input
							ref={inputRef}
							type="text"
							className="chat-input"
							placeholder={
								editingMessage
									? "Edit pesan..."
									: `Tulis pesan sebagai ${name}...`
							}
							value={inputText}
							onChange={(e) => setInputText(e.target.value)}
							autoComplete="off"
						/>
					</div>
					<button type="submit" className="send-btn" title="Kirim Pesan">
						<svg viewBox="0 0 24 24" width="18" height="18" fill="currentColor">
							<path d="M2.01 21L23 12 2.01 3 2 10l15 2-15 2z"/>
						</svg>
					</button>
				</form>
			</div>

			{/* Change Nickname Modal */}
			{showNameModal && (
				<div className="modal-overlay" onClick={() => setShowNameModal(false)}>
					<div className="modal-content" onClick={(e) => e.stopPropagation()}>
						<div className="modal-title">Ubah Nama Tampilan</div>
						<div className="modal-desc">
							Nama ini akan terlihat oleh pengguna lain di ruang obrolan.
						</div>
						<input
							type="text"
							className="modal-input"
							value={newNameInput}
							onChange={(e) => setNewNameInput(e.target.value)}
							placeholder="Masukkan nama baru..."
							autoFocus
						/>
						<div className="modal-actions">
							<button
								className="btn-secondary"
								style={{ width: "auto" }}
								onClick={() => setShowNameModal(false)}
							>
								Batal
							</button>
							<button
								className="btn-primary"
								style={{ width: "auto" }}
								onClick={handleSaveName}
							>
								Simpan
							</button>
						</div>
					</div>
				</div>
			)}
		</div>
	);
}

const rootElement = document.getElementById("root");
if (rootElement) {
	createRoot(rootElement).render(
		<BrowserRouter>
			<Routes>
				<Route path="/" element={<Navigate to={`/${nanoid()}`} />} />
				<Route path="/:room" element={<TelegramApp />} />
				<Route path="*" element={<Navigate to="/" />} />
			</Routes>
		</BrowserRouter>,
	);
}
