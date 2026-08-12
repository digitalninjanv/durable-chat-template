import { createRoot } from "react-dom/client";
import { usePartySocket } from "partysocket/react";
import React, { useState, useEffect, useRef, useMemo } from "react";
import {
	BrowserRouter,
	Routes,
	Route,
	Navigate,
	useParams,
	useNavigate,
} from "react-router";
import { nanoid } from "nanoid";

import {
	names,
	type ChatMessage,
	type Message,
	type ReplyInfo,
	type Attachment,
	type Reaction,
} from "../shared";

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
	const [detailsDrawerOpen, setDetailsDrawerOpen] = useState(false);
	const [showNameModal, setShowNameModal] = useState(false);
	const [showAttachmentModal, setShowAttachmentModal] = useState(false);
	const [selectedImage, setSelectedImage] = useState<string | null>(null);
	const [newNameInput, setNewNameInput] = useState(name);
	const [toastMsg, setToastMsg] = useState<string | null>(null);
	const [searchQuery, setSearchQuery] = useState("");
	const [showSearch, setShowSearch] = useState(false);
	const [highlightedMsgId, setHighlightedMsgId] = useState<string | null>(null);
	const [typingUsers, setTypingUsers] = useState<Set<string>>(new Set());

	const messagesEndRef = useRef<HTMLDivElement>(null);
	const inputRef = useRef<HTMLInputElement>(null);
	const typingTimeoutRef = useRef<ReturnType<typeof setTimeout> | null>(null);

	// Auto scroll to bottom
	const scrollToBottom = () => {
		messagesEndRef.current?.scrollIntoView({ behavior: "smooth" });
	};

	useEffect(() => {
		scrollToBottom();
	}, [messages.length]);

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
			if (
				!(e.target as HTMLElement).closest(".bubble-actions-trigger") &&
				!(e.target as HTMLElement).closest(".popover-menu")
			) {
				setActivePopoverId(null);
			}
		};
		window.addEventListener("click", handleClickOutside);
		return () => window.removeEventListener("click", handleClickOutside);
	}, []);

	// Keyboard shortcut for Escape
	useEffect(() => {
		const handleKeyDown = (e: KeyboardEvent) => {
			if (e.key === "Escape") {
				setActivePopoverId(null);
				setActiveReply(null);
				setEditingMessage(null);
				setShowSearch(false);
				setShowNameModal(false);
				setShowAttachmentModal(false);
				setSelectedImage(null);
			}
		};
		window.addEventListener("keydown", handleKeyDown);
		return () => window.removeEventListener("keydown", handleKeyDown);
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
				} else if (message.type === "typing") {
					if (message.user !== name) {
						setTypingUsers((prev) => {
							const next = new Set(prev);
							if (message.isTyping) next.add(message.user);
							else next.delete(message.user);
							return next;
						});
					}
				} else if (message.type === "all") {
					setMessages(message.messages);
				}
			} catch (e) {
				console.error("Failed parsing message:", e);
			}
		},
	});

	// Broadcast typing status
	const handleInputChange = (e: React.ChangeEvent<HTMLInputElement>) => {
		setInputText(e.target.value);
		if (socket) {
			socket.send(
				JSON.stringify({
					type: "typing",
					user: name,
					isTyping: true,
				} satisfies Message),
			);
			if (typingTimeoutRef.current) clearTimeout(typingTimeoutRef.current);
			typingTimeoutRef.current = setTimeout(() => {
				socket.send(
					JSON.stringify({
						type: "typing",
						user: name,
						isTyping: false,
					} satisfies Message),
				);
			}, 2000);
		}
	};

	// Send message handler
	const handleSubmit = (e: React.FormEvent) => {
		e.preventDefault();
		const trimmed = inputText.trim();
		if (!trimmed) return;

		if (editingMessage) {
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

	const handleTogglePin = (msg: ChatMessage) => {
		const updated: ChatMessage = {
			...msg,
			pinned: !msg.pinned,
		};
		setMessages((prev) => prev.map((m) => (m.id === updated.id ? updated : m)));
		socket.send(
			JSON.stringify({
				type: "update",
				...updated,
			} satisfies Message),
		);
		showToast(updated.pinned ? "Pesan disematkan! 📌" : "Pesan dilepas dari sematan 📌");
		setActivePopoverId(null);
	};

	const handleAddReaction = (msg: ChatMessage, emoji: string) => {
		const currentReactions = msg.reactions || [];
		const existingIndex = currentReactions.findIndex((r) => r.emoji === emoji);

		let updatedReactions: Reaction[];
		if (existingIndex !== -1) {
			const r = currentReactions[existingIndex];
			const hasReacted = r.users.includes(name);
			if (hasReacted) {
				const newUsers = r.users.filter((u) => u !== name);
				if (newUsers.length === 0) {
					updatedReactions = currentReactions.filter((_, idx) => idx !== existingIndex);
				} else {
					updatedReactions = currentReactions.map((item, idx) =>
						idx === existingIndex
							? { ...item, count: newUsers.length, users: newUsers }
							: item,
					);
				}
			} else {
				updatedReactions = currentReactions.map((item, idx) =>
					idx === existingIndex
						? { ...item, count: item.count + 1, users: [...item.users, name] }
						: item,
				);
			}
		} else {
			updatedReactions = [
				...currentReactions,
				{ emoji, count: 1, users: [name] },
			];
		}

		const updatedMsg: ChatMessage = {
			...msg,
			reactions: updatedReactions,
		};

		setMessages((prev) => prev.map((m) => (m.id === msg.id ? updatedMsg : m)));
		socket.send(
			JSON.stringify({
				type: "update",
				...updatedMsg,
			} satisfies Message),
		);
		setActivePopoverId(null);
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

	const handleSendAttachment = (type: "image" | "file" | "audio") => {
		let attachment: Attachment;
		if (type === "image") {
			attachment = {
				type: "image",
				url: "https://images.unsplash.com/photo-1618005182384-a83a8bd57fbe?auto=format&fit=crop&w=800&q=80",
				name: "design_concept.png",
				size: "1.4 MB",
			};
		} else if (type === "file") {
			attachment = {
				type: "file",
				url: "#",
				name: "Project_Proposal_2026.pdf",
				size: "3.8 MB",
			};
		} else {
			attachment = {
				type: "audio",
				url: "#",
				name: "Voice Note",
				duration: "0:14",
			};
		}

		const newMessage: ChatMessage = {
			id: nanoid(8),
			content: type === "image" ? "Membagikan gambar konsep desain 🎨" : type === "file" ? "Membagikan dokumen proposal 📄" : "Pesan Suara 🎙️",
			user: name,
			role: "user",
			timestamp: Date.now(),
			attachment,
		};

		setMessages((prev) => [...prev, newMessage]);
		socket.send(
			JSON.stringify({
				type: "add",
				...newMessage,
			} satisfies Message),
		);

		setShowAttachmentModal(false);
		showToast("Lampiran terkirim! 📎");
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

	// Pinned message
	const pinnedMessage = useMemo(() => {
		return messages.slice().reverse().find((m) => m.pinned);
	}, [messages]);

	// Filtered messages by search
	const filteredMessages = useMemo(() => {
		if (!searchQuery.trim()) return messages;
		return messages.filter(
			(m) =>
				m.content.toLowerCase().includes(searchQuery.toLowerCase()) ||
				m.user.toLowerCase().includes(searchQuery.toLowerCase()),
		);
	}, [messages, searchQuery]);

	// Shared media images
	const sharedImages = useMemo(() => {
		return messages
			.filter((m) => m.attachment && m.attachment.type === "image")
			.map((m) => m.attachment!.url);
	}, [messages]);

	const typingText = useMemo(() => {
		const arr = Array.from(typingUsers);
		if (arr.length === 0) return null;
		if (arr.length === 1) return `${arr[0]} sedang mengetik`;
		return `${arr.join(", ")} sedang mengetik`;
	}, [typingUsers]);

	return (
		<div className="telegram-app">
			<div className="chat-pattern-bg"></div>

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
								<span className="pulse-dot"></span> Cloudflare Durable Edge
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
							<span className="role-badge">Pengguna Online</span>
						</div>
					</div>
					<button
						className="btn-icon"
						title="Ubah Profil Nama"
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
						Salin Link Obrolan
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
					🔒 <strong>Real-time State Sync:</strong> Pesan dan lampiran tersimpan secara terisolasi di instance Durable Object SQLite lokasi edge.
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
							<div className="room-sub">
								{typingText ? (
									<span className="typing-indicator">
										{typingText}
										<span className="typing-dots">
											<span></span><span></span><span></span>
										</span>
									</span>
								) : (
									`Koneksi Aktif · ID: ${room}`
								)}
							</div>
						</div>
					</div>

					<div className="header-actions">
						{/* Search Bar Toggle */}
						{showSearch ? (
							<div className="header-search-bar">
								<input
									type="text"
									className="header-search-input"
									placeholder="Cari pesan..."
									value={searchQuery}
									onChange={(e) => setSearchQuery(e.target.value)}
									autoFocus
								/>
								<button
									className="btn-icon"
									style={{ width: "24px", height: "24px" }}
									onClick={() => {
										setShowSearch(false);
										setSearchQuery("");
									}}
								>
									✕
								</button>
							</div>
						) : (
							<button
								className="btn-icon"
								title="Cari Pesan"
								onClick={() => setShowSearch(true)}
							>
								<svg viewBox="0 0 24 24" width="18" height="18" fill="none" stroke="currentColor" strokeWidth="2">
									<circle cx="11" cy="11" r="8"/>
									<line x1="21" y1="21" x2="16.65" y2="16.65"/>
								</svg>
							</button>
						)}

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

						<button
							className={`btn-icon ${detailsDrawerOpen ? "active" : ""}`}
							title="Detail Ruangan"
							onClick={() => setDetailsDrawerOpen(!detailsDrawerOpen)}
						>
							<svg viewBox="0 0 24 24" width="18" height="18" fill="none" stroke="currentColor" strokeWidth="2">
								<circle cx="12" cy="12" r="10"/>
								<line x1="12" y1="16" x2="12" y2="12"/>
								<line x1="12" y1="8" x2="12.01" y2="8"/>
							</svg>
						</button>
					</div>
				</div>

				{/* Pinned Message Glassmorphism Banner */}
				{pinnedMessage && (
					<div className="pinned-banner">
						<div
							className="pinned-info"
							onClick={() => setHighlightedMsgId(pinnedMessage.id)}
						>
							<div className="pinned-title">📌 Pesan Disematkan</div>
							<div className="pinned-snippet">
								<strong>{pinnedMessage.user}:</strong> {pinnedMessage.content}
							</div>
						</div>
						<button
							className="btn-icon"
							title="Lepas Sematan"
							onClick={() => handleTogglePin(pinnedMessage)}
						>
							✕
						</button>
					</div>
				)}

				{/* Messages Stream Viewport */}
				<div className="messages-container">
					{filteredMessages.length === 0 ? (
						<div className="date-divider">
							{searchQuery ? "Tidak ada pesan yang cocok dengan pencarian" : "Belum ada pesan. Mulai obrolan sekarang!"}
						</div>
					) : (
						filteredMessages.map((msg, idx) => {
							const isOwn = msg.user === name;
							const prevMsg = idx > 0 ? filteredMessages[idx - 1] : null;
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
										id={`msg-${msg.id}`}
										className={`message-row ${
											isOwn ? "outgoing" : "incoming"
										} ${highlightedMsgId === msg.id ? "highlighted" : ""}`}
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
											{msg.pinned && (
												<div className="pinned-indicator">
													📌 Disematkan
												</div>
											)}

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
													{/* Quick Reaction Bar in Popover */}
													<div className="popover-reactions-bar">
														{["❤️", "👍", "🔥", "🎉", "😂"].map((e) => (
															<button
																key={e}
																className="emoji-btn"
																onClick={() => handleAddReaction(msg, e)}
															>
																{e}
															</button>
														))}
													</div>
													<div
														className="popover-item"
														onClick={() => handleCopyText(msg.content)}
													>
														<div className="popover-item-left">
															<span>📋</span> Salin Teks
														</div>
														<span className="popover-shortcut">Ctrl+C</span>
													</div>
													<div
														className="popover-item"
														onClick={() => handleReply(msg)}
													>
														<div className="popover-item-left">
															<span>💬</span> Balas Pesan
														</div>
													</div>
													<div
														className="popover-item"
														onClick={() => handleTogglePin(msg)}
													>
														<div className="popover-item-left">
															<span>📌</span> {msg.pinned ? "Lepas Sematan" : "Sematkan"}
														</div>
													</div>
													{isOwn && (
														<div
															className="popover-item"
															onClick={() => handleEdit(msg)}
														>
															<div className="popover-item-left">
																<span>✏️</span> Edit Pesan
															</div>
														</div>
													)}
													{isOwn && (
														<div
															className="popover-item danger"
															onClick={() => handleDelete(msg.id)}
														>
															<div className="popover-item-left">
																<span>🗑️</span> Hapus Pesan
															</div>
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
												<div
													className="quoted-box"
													onClick={() => setHighlightedMsgId(msg.replyTo!.id)}
												>
													<div className="quoted-user">
														{msg.replyTo.user}
													</div>
													<div className="quoted-text">
														{msg.replyTo.content}
													</div>
												</div>
											)}

											{/* Attachment Preview */}
											{msg.attachment && (
												<div className="attachment-card">
													{msg.attachment.type === "image" && (
														<img
															src={msg.attachment.url}
															alt={msg.attachment.name}
															className="attachment-image"
															onClick={() => setSelectedImage(msg.attachment!.url)}
														/>
													)}
													{msg.attachment.type === "file" && (
														<div className="attachment-file">
															<div className="file-icon">📄</div>
															<div>
																<div className="file-name">{msg.attachment.name}</div>
																<div className="file-size">{msg.attachment.size || "File"}</div>
															</div>
														</div>
													)}
													{msg.attachment.type === "audio" && (
														<div className="audio-player-bubble">
															<button className="btn-icon" style={{ background: "rgba(255,255,255,0.1)" }}>
																▶
															</button>
															<div className="waveform">
																<div className="waveform-bar" style={{ height: "12px" }}></div>
																<div className="waveform-bar" style={{ height: "18px" }}></div>
																<div className="waveform-bar" style={{ height: "8px" }}></div>
																<div className="waveform-bar" style={{ height: "15px" }}></div>
																<div className="waveform-bar" style={{ height: "10px" }}></div>
															</div>
															<span style={{ fontSize: "11px", color: "var(--text-secondary)" }}>{msg.attachment.duration || "0:14"}</span>
														</div>
													)}
												</div>
											)}

											{/* Main Message Text */}
											<div className="message-text">{msg.content}</div>

											{/* Reactions List */}
											{msg.reactions && msg.reactions.length > 0 && (
												<div className="reactions-container">
													{msg.reactions.map((r) => {
														const hasReacted = r.users.includes(name);
														return (
															<div
																key={r.emoji}
																className={`reaction-badge ${
																	hasReacted ? "user-reacted" : ""
																}`}
																onClick={() => handleAddReaction(msg, r.emoji)}
															>
																<span>{r.emoji}</span>
																<span>{r.count}</span>
															</div>
														);
													})}
												</div>
											)}

											{/* Time & Read Receipts */}
											<div className="message-meta">
												{msg.edited && (
													<span className="edited-tag">diedit</span>
												)}
												<span>{formatTime(msg.timestamp)}</span>
												{isOwn && (
													<span className="check-icon" title="Terkirim">
														<svg viewBox="0 0 24 24" width="14" height="14" fill="currentColor">
															<path d="M9 16.17L4.83 12l-1.42 1.41L9 19 21 7l-1.41-1.41L9 16.17z"/>
														</svg>
													</span>
												)}
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
					{["👍", "❤️", "🔥", "😂", "🎉", "😮", "🙏", "💯", "🚀", "✨"].map((emoji) => (
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
					<button
						type="button"
						className="attachment-trigger-btn"
						title="Lampirkan File/Media"
						onClick={() => setShowAttachmentModal(true)}
					>
						<svg viewBox="0 0 24 24" width="20" height="20" fill="none" stroke="currentColor" strokeWidth="2">
							<path d="M21.44 11.05l-9.19 9.19a6 6 0 0 1-8.49-8.49l9.19-9.19a4 4 0 0 1 5.66 5.66l-9.2 9.19a2 2 0 0 1-2.83-2.83l8.49-8.48"/>
						</svg>
					</button>

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
							onChange={handleInputChange}
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

			{/* Right Details Drawer */}
			{detailsDrawerOpen && (
				<div className="chat-details-drawer">
					<div className="drawer-header">
						<span>Info Ruangan</span>
						<button
							className="btn-icon"
							onClick={() => setDetailsDrawerOpen(false)}
						>
							✕
						</button>
					</div>

					<div className="drawer-section">
						<div className="drawer-title">Media Obrolan</div>
						{sharedImages.length === 0 ? (
							<div style={{ fontSize: "12px", color: "var(--text-secondary)" }}>
								Belum ada gambar yang dibagikan.
							</div>
						) : (
							<div className="media-grid">
								{sharedImages.map((imgUrl, i) => (
									<img
										key={i}
										src={imgUrl}
										alt="Media"
										className="media-thumb"
										onClick={() => setSelectedImage(imgUrl)}
									/>
								))}
							</div>
						)}
					</div>

					<div className="drawer-section">
						<div className="drawer-title">Pengguna Aktif</div>
						<div className="user-info" style={{ marginBottom: "8px" }}>
							<div
								className="avatar"
								style={{ background: getAvatarBackground(name) }}
							>
								{name.charAt(0).toUpperCase()}
							</div>
							<div className="user-details">
								<div className="name">{name} (Anda)</div>
								<span className="role-badge">Online</span>
							</div>
						</div>
					</div>
				</div>
			)}

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

			{/* Attachment Picker Modal */}
			{showAttachmentModal && (
				<div className="modal-overlay" onClick={() => setShowAttachmentModal(false)}>
					<div className="modal-content" onClick={(e) => e.stopPropagation()}>
						<div className="modal-title">Kirim Lampiran</div>
						<div className="modal-desc">
							Pilih jenis media yang ingin dikirimkan ke ruang obrolan:
						</div>
						<div className="attachment-type-grid">
							<button
								className="attachment-type-btn"
								onClick={() => handleSendAttachment("image")}
							>
								<span style={{ fontSize: "24px" }}>📸</span>
								<span>Gambar</span>
							</button>
							<button
								className="attachment-type-btn"
								onClick={() => handleSendAttachment("file")}
							>
								<span style={{ fontSize: "24px" }}>📄</span>
								<span>Dokumen</span>
							</button>
							<button
								className="attachment-type-btn"
								onClick={() => handleSendAttachment("audio")}
							>
								<span style={{ fontSize: "24px" }}>🎙️</span>
								<span>Pesan Suara</span>
							</button>
						</div>
						<div className="modal-actions">
							<button
								className="btn-secondary"
								style={{ width: "auto" }}
								onClick={() => setShowAttachmentModal(false)}
							>
								Batal
							</button>
						</div>
					</div>
				</div>
			)}

			{/* Image Viewer Zoom Modal */}
			{selectedImage && (
				<div className="modal-overlay" onClick={() => setSelectedImage(null)}>
					<img
						src={selectedImage}
						alt="Zoom"
						style={{
							maxWidth: "90vw",
							maxHeight: "90vh",
							borderRadius: "12px",
							boxShadow: "0 20px 60px rgba(0,0,0,0.8)",
						}}
						onClick={(e) => e.stopPropagation()}
					/>
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
