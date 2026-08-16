import { createRoot } from "react-dom/client";
import { usePartySocket } from "partysocket/react";
import React, { useState, useEffect, useRef, useMemo, useCallback } from "react";
import {
	BrowserRouter,
	Routes,
	Route,
	Navigate,
	useParams,
	useNavigate,
} from "react-router";
import { nanoid } from "nanoid";

import type {
	ChatMessage,
	Message,
	ReplyInfo,
	Attachment,
	Reaction,
	UserProfile,
	RoomInfo,
	ToastItem,
	EdgeConnectionStats,
	RoomCategory,
	TTLOption,
} from "./types";

import {
	getRandomName,
	getAvatarColor,
	getStoredRooms,
	saveRoomVisit,
	sounds,
} from "./utils/helpers";

import { encryptText, decryptText } from "./utils/crypto";

import { Header } from "./components/Header";
import { Sidebar } from "./components/Sidebar";
import { ChatArea } from "./components/ChatArea";
import { MessageInput } from "./components/MessageInput";
import { DetailsDrawer } from "./components/DetailsDrawer";
import { ScratchpadDrawer } from "./components/ScratchpadDrawer";
import { DecoyScreen } from "./components/DecoyScreen";
import { ToastContainer } from "./components/Toast";
import {
	ProfileModal,
	NewRoomModal,
	AttachmentModal,
	ImageViewerModal,
	ShortcutsModal,
	SearchModal,
	E2EEKeyModal,
	NukeConfirmModal,
} from "./components/Modals";

function DurableChatApp() {
	const navigate = useNavigate();
	const { room = "general" } = useParams();

	// -------------------------------------------------------------
	// E2EE Key & URL Hash Management
	// -------------------------------------------------------------
	const [e2eeKey, setE2eeKey] = useState<string>(() => {
		// Try from URL hash: #key=xyz
		const hash = window.location.hash;
		if (hash.includes("key=")) {
			const match = hash.match(/key=([^&]+)/);
			if (match) return decodeURIComponent(match[1]);
		}
		// Fallback to localStorage
		return localStorage.getItem(`cf_e2ee_key_${room}`) || "";
	});

	useEffect(() => {
		if (e2eeKey) {
			localStorage.setItem(`cf_e2ee_key_${room}`, e2eeKey);
		} else {
			localStorage.removeItem(`cf_e2ee_key_${room}`);
		}
	}, [e2eeKey, room]);

	const isE2EE = Boolean(e2eeKey && e2eeKey.trim().length > 0);

	// -------------------------------------------------------------
	// Theme State & Lifecycle
	// -------------------------------------------------------------
	const [theme, setTheme] = useState<"dark" | "light">(() => {
		const saved = localStorage.getItem("cf_theme");
		if (saved === "light" || saved === "dark") return saved;
		return window.matchMedia("(prefers-color-scheme: light)").matches ? "light" : "dark";
	});

	useEffect(() => {
		document.documentElement.setAttribute("data-theme", theme);
		localStorage.setItem("cf_theme", theme);
	}, [theme]);

	const toggleTheme = useCallback(() => {
		setTheme((prev) => (prev === "dark" ? "light" : "dark"));
	}, []);

	// -------------------------------------------------------------
	// User Profile State
	// -------------------------------------------------------------
	const [profile, setProfile] = useState<UserProfile>(() => {
		try {
			const saved = localStorage.getItem("cf_user_profile");
			if (saved) return JSON.parse(saved);
		} catch {}

		const defaultName = getRandomName();
		return {
			name: defaultName,
			avatarColor: getAvatarColor(defaultName).bg,
			statusMessage: "Edge Member",
		};
	});

	const handleSaveProfile = useCallback((updated: UserProfile) => {
		setProfile(updated);
		localStorage.setItem("cf_user_profile", JSON.stringify(updated));
		addToast(`Profil diperbarui: @${updated.name}`, "success");
	}, []);

	// -------------------------------------------------------------
	// Rooms & Navigation
	// -------------------------------------------------------------
	const [recentRooms, setRecentRooms] = useState<RoomInfo[]>(() => getStoredRooms());

	useEffect(() => {
		const isPrivate = isE2EE;
		const isDirect = room.startsWith("dm-");
		const currentRoomInfo: RoomInfo = {
			id: room,
			name: isDirect ? `@${room.substring(3)}` : room,
			topic: isDirect ? `Obrolan Langsung` : `Ruang diskusi #${room}`,
			type: isDirect ? "direct" : isPrivate ? "private" : "public",
			e2eeEnabled: isPrivate,
			lastMessageTime: Date.now(),
		};
		saveRoomVisit(currentRoomInfo);
		setRecentRooms(getStoredRooms());
	}, [room, isE2EE]);

	const handleSelectRoom = useCallback(
		(roomId: string) => {
			navigate(`/${roomId}`);
		},
		[navigate],
	);

	const handleCreateRoom = useCallback(
		(roomId: string, name?: string, topic?: string, category: RoomCategory = "public", key?: string) => {
			if (key) {
				setE2eeKey(key);
			}
			const newRoom: RoomInfo = {
				id: roomId,
				name: name || roomId,
				topic: topic || (category === "direct" ? "Obrolan Langsung" : `Saluran #${roomId}`),
				type: category,
				e2eeEnabled: Boolean(key),
				lastMessageTime: Date.now(),
			};
			saveRoomVisit(newRoom);
			setRecentRooms(getStoredRooms());
			navigate(`/${roomId}${key ? `#key=${encodeURIComponent(key)}` : ""}`);
			addToast(
				category === "private"
					? `Ruang privat #${roomId} (E2EE) siap dipakai 🔒`
					: category === "direct"
					? `Membuka obrolan langsung @${name || roomId} 💬`
					: `Berhasil masuk ke saluran #${roomId} 🌍`,
				"success",
			);
		},
		[navigate],
	);

	// -------------------------------------------------------------
	// Toast Notifications
	// -------------------------------------------------------------
	const [toasts, setToasts] = useState<ToastItem[]>([]);

	const addToast = useCallback(
		(message: string, type: "info" | "success" | "warning" | "error" = "info", duration = 3200) => {
			const id = nanoid(6);
			setToasts((prev) => [...prev, { id, message, type, duration }]);
			setTimeout(() => {
				setToasts((prev) => prev.filter((t) => t.id !== id));
			}, duration);
		},
		[],
	);

	const dismissToast = useCallback((id: string) => {
		setToasts((prev) => prev.filter((t) => t.id !== id));
	}, []);

	// -------------------------------------------------------------
	// Messages, Scratchpad & WebSocket Sync
	// -------------------------------------------------------------
	const [messages, setMessages] = useState<ChatMessage[]>([]);
	const [scratchpadContent, setScratchpadContent] = useState<string>("");
	const [activeReply, setActiveReply] = useState<ReplyInfo | null>(null);
	const [editingMessage, setEditingMessage] = useState<ChatMessage | null>(null);
	const [typingUsers, setTypingUsers] = useState<Set<string>>(new Set());
	const [highlightedMsgId, setHighlightedMsgId] = useState<string | null>(null);
	const [isShowingPinnedOnly, setIsShowingPinnedOnly] = useState(false);
	const [linkCopied, setLinkCopied] = useState(false);

	const typingTimeoutRef = useRef<ReturnType<typeof setTimeout> | null>(null);

	// Edge connection stats
	const [connectionStats, setConnectionStats] = useState<EdgeConnectionStats>({
		status: "connecting",
		latencyMs: 14,
		region: "Edge DO",
		durableObjectId: room,
	});

	// Decrypt incoming message helper
	const processIncomingMessage = useCallback(
		async (msg: ChatMessage): Promise<ChatMessage> => {
			if (msg.isEncrypted && msg.content) {
				const decrypted = await decryptText(msg.content, e2eeKey);
				return { ...msg, content: decrypted };
			}
			return msg;
		},
		[e2eeKey],
	);

	const socket = usePartySocket({
		party: "chat",
		room,
		onOpen: () => {
			setConnectionStats((prev) => ({
				...prev,
				status: "connected",
				latencyMs: Math.floor(Math.random() * 12) + 12,
			}));
		},
		onClose: () => {
			setConnectionStats((prev) => ({ ...prev, status: "reconnecting" }));
		},
		onError: () => {
			setConnectionStats((prev) => ({ ...prev, status: "reconnecting" }));
		},
		onMessage: async (evt) => {
			try {
				const message = JSON.parse(evt.data as string) as Message;
				if (message.type === "add") {
					const processed = await processIncomingMessage(message);
					setMessages((prev) => {
						const exists = prev.some((m) => m.id === message.id);
						if (exists) {
							return prev.map((m) => (m.id === message.id ? processed : m));
						}
						if (message.user !== profile.name && message.role !== "system") {
							sounds.playReceive();
						}
						return [...prev, processed];
					});
				} else if (message.type === "update") {
					const processed = await processIncomingMessage(message);
					setMessages((prev) =>
						prev.map((m) => (m.id === message.id ? processed : m)),
					);
				} else if (message.type === "delete") {
					setMessages((prev) => prev.filter((m) => m.id !== message.id));
				} else if (message.type === "scratchpad") {
					setScratchpadContent(message.content);
				} else if (message.type === "typing") {
					if (message.user !== profile.name) {
						setTypingUsers((prev) => {
							const next = new Set(prev);
							if (message.isTyping) next.add(message.user);
							else next.delete(message.user);
							return next;
						});
					}
				} else if (message.type === "all") {
					if (message.scratchpad !== undefined) {
						setScratchpadContent(message.scratchpad);
					}
					const decryptedAll = await Promise.all(
						message.messages.map((m) => processIncomingMessage(m)),
					);
					setMessages(decryptedAll);
				}
			} catch (e) {
				console.error("Error parsing WebSocket message:", e);
			}
		},
	});

	// Broadcast typing status
	const handleUserTyping = useCallback(() => {
		if (socket) {
			socket.send(
				JSON.stringify({
					type: "typing",
					user: profile.name,
					isTyping: true,
				} satisfies Message),
			);

			if (typingTimeoutRef.current) clearTimeout(typingTimeoutRef.current);
			typingTimeoutRef.current = setTimeout(() => {
				socket.send(
					JSON.stringify({
						type: "typing",
						user: profile.name,
						isTyping: false,
					} satisfies Message),
				);
			}, 2000);
		}
	}, [socket, profile.name]);

	// Send message (Plain or E2EE Encrypted)
	const handleSendMessage = useCallback(
		async (text: string, ttl: TTLOption = 0, burnOnRead = false) => {
			const expiresAt = ttl > 0 ? Date.now() + ttl * 1000 : undefined;
			const isAICommand =
				text.trim().startsWith("/ai") ||
				text.trim().startsWith("@ai") ||
				text.trim().startsWith("/gemma") ||
				text.trim().startsWith("@gemma") ||
				text.trim().startsWith("/summarize") ||
				text.trim().startsWith("/ringkas") ||
				text.trim().startsWith("/tanya");

			const shouldEncrypt = isE2EE && !isAICommand;

			const cipherOrPlain = shouldEncrypt
				? await encryptText(text, e2eeKey)
				: text;

			const outgoingPayload: ChatMessage = {
				id: nanoid(8),
				content: cipherOrPlain,
				user: profile.name,
				role: "user",
				timestamp: Date.now(),
				replyTo: activeReply,
				isEncrypted: shouldEncrypt,
				expiresAt,
				burnOnRead,
			};

			// Optimistic UI display with plaintext
			const localDisplay: ChatMessage = {
				...outgoingPayload,
				content: text,
			};

			setMessages((prev) => [...prev, localDisplay]);
			sounds.playSend();

			if (socket) {
				socket.send(
					JSON.stringify({
						type: "add",
						...outgoingPayload,
					} satisfies Message),
				);
			}

			setActiveReply(null);
		},
		[socket, profile.name, activeReply, isE2EE, e2eeKey],
	);

	// Send real attachment (photo, document, or audio)
	const handleSendRealAttachment = useCallback(
		async (attachment: Attachment, caption?: string, ttl: TTLOption = 0) => {
			const content =
				caption ||
				(attachment.type === "image"
					? "Membagikan gambar 🖼️"
					: attachment.type === "file"
					? `Membagikan berkas: ${attachment.name}`
					: "Pesan Suara 🎙️");

			const expiresAt = ttl > 0 ? Date.now() + ttl * 1000 : undefined;
			const shouldEncrypt = isE2EE;

			const cipherOrPlain = shouldEncrypt
				? await encryptText(content, e2eeKey)
				: content;

			const outgoingPayload: ChatMessage = {
				id: nanoid(8),
				content: cipherOrPlain,
				user: profile.name,
				role: "user",
				timestamp: Date.now(),
				attachment,
				replyTo: activeReply,
				isEncrypted: shouldEncrypt,
				expiresAt,
			};

			const localDisplay: ChatMessage = {
				...outgoingPayload,
				content,
			};

			setMessages((prev) => [...prev, localDisplay]);
			sounds.playSend();

			if (socket) {
				socket.send(
					JSON.stringify({
						type: "add",
						...outgoingPayload,
					} satisfies Message),
				);
			}

			setActiveReply(null);
			setIsAttachmentOpen(false);
			addToast("Lampiran berhasil dikirim!", "success");
		},
		[socket, profile.name, activeReply, isE2EE, e2eeKey, addToast],
	);

	// Save edited message
	const handleSaveEdit = useCallback(
		async (newContent: string) => {
			if (!editingMessage) return;

			const shouldEncrypt = isE2EE;
			const cipherOrPlain = shouldEncrypt
				? await encryptText(newContent, e2eeKey)
				: newContent;

			const updated: ChatMessage = {
				...editingMessage,
				content: cipherOrPlain,
				edited: true,
				isEncrypted: shouldEncrypt,
			};

			setMessages((prev) =>
				prev.map((m) =>
					m.id === updated.id ? { ...updated, content: newContent } : m,
				),
			);

			if (socket) {
				socket.send(
					JSON.stringify({
						type: "update",
						...updated,
					} satisfies Message),
				);
			}

			setEditingMessage(null);
			addToast("Pesan berhasil diperbarui", "info");
		},
		[socket, editingMessage, isE2EE, e2eeKey, addToast],
	);

	// Delete message
	const handleDeleteMessage = useCallback(
		(id: string) => {
			setMessages((prev) => prev.filter((m) => m.id !== id));
			if (socket) {
				socket.send(
					JSON.stringify({
						type: "delete",
						id,
					} satisfies Message),
				);
			}
		},
		[socket],
	);

	// Room Nuke Execution
	const handleConfirmNuke = useCallback(() => {
		if (socket) {
			socket.send(
				JSON.stringify({
					type: "nuke",
					user: profile.name,
				} satisfies Message),
			);
			addToast("Ruangan telah dimusnahkan 🔥", "warning");
		}
	}, [socket, profile.name, addToast]);

	// Update Collaborative Scratchpad
	const handleUpdateScratchpad = useCallback(
		(newText: string) => {
			setScratchpadContent(newText);
			if (socket) {
				socket.send(
					JSON.stringify({
						type: "scratchpad",
						content: newText,
						updatedBy: profile.name,
						updatedAt: Date.now(),
					} satisfies Message),
				);
			}
		},
		[socket, profile.name],
	);

	// Toggle pin
	const handleTogglePin = useCallback(
		(message: ChatMessage) => {
			const updated: ChatMessage = {
				...message,
				pinned: !message.pinned,
			};

			setMessages((prev) => prev.map((m) => (m.id === updated.id ? updated : m)));

			if (socket) {
				socket.send(
					JSON.stringify({
						type: "update",
						...updated,
					} satisfies Message),
				);
			}

			addToast(
				updated.pinned ? "Pesan disematkan 📌" : "Pesan dilepas dari sematan",
				"info",
			);
		},
		[socket, addToast],
	);

	// Add or toggle reaction
	const handleAddReaction = useCallback(
		(message: ChatMessage, emoji: string) => {
			const currentReactions = message.reactions || [];
			const existingIndex = currentReactions.findIndex((r) => r.emoji === emoji);

			let updatedReactions: Reaction[];
			if (existingIndex !== -1) {
				const r = currentReactions[existingIndex];
				const hasReacted = r.users.includes(profile.name);
				if (hasReacted) {
					const newUsers = r.users.filter((u) => u !== profile.name);
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
							? { ...item, count: item.count + 1, users: [...item.users, profile.name] }
							: item,
					);
				}
			} else {
				updatedReactions = [
					...currentReactions,
					{ emoji, count: 1, users: [profile.name] },
				];
			}

			const updatedMsg: ChatMessage = {
				...message,
				reactions: updatedReactions,
			};

			setMessages((prev) => prev.map((m) => (m.id === message.id ? updatedMsg : m)));

			if (socket) {
				socket.send(
					JSON.stringify({
						type: "update",
						...updatedMsg,
					} satisfies Message),
				);
			}
		},
		[socket, profile.name],
	);

	// Copy room link with E2EE key if active
	const handleCopyRoomLink = useCallback(() => {
		const url = e2eeKey ? `${window.location.origin}/${room}#key=${encodeURIComponent(e2eeKey)}` : window.location.href;
		navigator.clipboard.writeText(url);
		setLinkCopied(true);
		addToast(isE2EE ? "Tautan dengan Kunci E2EE disalin! 🔒" : "Tautan saluran disalin! 🔗", "success");
		setTimeout(() => setLinkCopied(false), 2000);
	}, [e2eeKey, room, isE2EE, addToast]);

	// -------------------------------------------------------------
	// UI Modals & Panels State
	// -------------------------------------------------------------
	const [isSidebarOpen, setIsSidebarOpen] = useState(false);
	const [isDetailsOpen, setIsDetailsOpen] = useState(false);
	const [isScratchpadOpen, setIsScratchpadOpen] = useState(false);
	const [isDecoyActive, setIsDecoyActive] = useState(false);
	const [isProfileOpen, setIsProfileOpen] = useState(false);
	const [isNewRoomOpen, setIsNewRoomOpen] = useState(false);
	const [newRoomInitialCategory, setNewRoomInitialCategory] = useState<RoomCategory>("public");
	const [isAttachmentOpen, setIsAttachmentOpen] = useState(false);
	const [isShortcutsOpen, setIsShortcutsOpen] = useState(false);
	const [isSearchOpen, setIsSearchOpen] = useState(false);
	const [isE2EEModalOpen, setIsE2EEModalOpen] = useState(false);
	const [isNukeModalOpen, setIsNukeModalOpen] = useState(false);
	const [selectedImageUrl, setSelectedImageUrl] = useState<string | null>(null);

	const lastEscPressTimeRef = useRef<number>(0);

	// Global Keyboard Shortcuts
	useEffect(() => {
		const handleGlobalKeyDown = (e: KeyboardEvent) => {
			// Ctrl+K or Cmd+K -> Search
			if ((e.ctrlKey || e.metaKey) && e.key.toLowerCase() === "k") {
				e.preventDefault();
				setIsSearchOpen(true);
				return;
			}

			// Question mark (?) outside input -> Shortcuts
			if (
				e.key === "?" &&
				!(e.target instanceof HTMLInputElement || e.target instanceof HTMLTextAreaElement)
			) {
				e.preventDefault();
				setIsShortcutsOpen(true);
				return;
			}

			// Esc handling: Double Esc triggers Decoy Mode
			if (e.key === "Escape") {
				if (isDecoyActive) {
					setIsDecoyActive(false);
					return;
				}

				const now = Date.now();
				if (now - lastEscPressTimeRef.current < 450) {
					setIsDecoyActive(true);
					lastEscPressTimeRef.current = 0;
					return;
				}
				lastEscPressTimeRef.current = now;

				// Close other open dialogs
				setIsProfileOpen(false);
				setIsNewRoomOpen(false);
				setIsAttachmentOpen(false);
				setIsShortcutsOpen(false);
				setIsSearchOpen(false);
				setIsE2EEModalOpen(false);
				setIsNukeModalOpen(false);
				setSelectedImageUrl(null);
				setActiveReply(null);
				setEditingMessage(null);
			}
		};

		window.addEventListener("keydown", handleGlobalKeyDown);
		return () => window.removeEventListener("keydown", handleGlobalKeyDown);
	}, [isDecoyActive]);

	// Pinned message count
	const pinnedCount = useMemo(() => messages.filter((m) => m.pinned).length, [messages]);

	// Typing string
	const typingText = useMemo(() => {
		const arr = Array.from(typingUsers);
		if (arr.length === 0) return null;
		if (arr.length === 1) return `${arr[0]} sedang mengetik...`;
		return `${arr.join(", ")} sedang mengetik...`;
	}, [typingUsers]);

	return (
		<div className="app-layout-root">
			{/* Decoy Stealth Screen */}
			<DecoyScreen isActive={isDecoyActive} onExit={() => setIsDecoyActive(false)} />

			{/* Toast system */}
			<ToastContainer toasts={toasts} onDismiss={dismissToast} />

			{/* Left Sidebar */}
			<Sidebar
				isOpen={isSidebarOpen}
				onClose={() => setIsSidebarOpen(false)}
				activeRoom={room}
				onSelectRoom={handleSelectRoom}
				userProfile={profile}
				onOpenProfileModal={() => setIsProfileOpen(true)}
				onOpenNewRoomModal={(cat) => {
					setNewRoomInitialCategory(cat || "public");
					setIsNewRoomOpen(true);
				}}
				onOpenShortcuts={() => setIsShortcutsOpen(true)}
				onTriggerDecoy={() => setIsDecoyActive(true)}
				onTriggerNuke={() => setIsNukeModalOpen(true)}
				rooms={recentRooms}
			/>

			{/* Center / Main Chat Container */}
			<main className="app-main-viewport">
				<Header
					room={room}
					onToggleSidebar={() => setIsSidebarOpen(!isSidebarOpen)}
					onToggleDetails={() => {
						setIsDetailsOpen(!isDetailsOpen);
						setIsScratchpadOpen(false);
					}}
					detailsOpen={isDetailsOpen}
					onToggleScratchpad={() => {
						setIsScratchpadOpen(!isScratchpadOpen);
						setIsDetailsOpen(false);
					}}
					scratchpadOpen={isScratchpadOpen}
					onOpenSearch={() => setIsSearchOpen(true)}
					onOpenShortcuts={() => setIsShortcutsOpen(true)}
					onTriggerDecoy={() => setIsDecoyActive(true)}
					onTriggerNuke={() => setIsNukeModalOpen(true)}
					onOpenAIHelp={() => {
						handleSendMessage("/ai Halo Gemma 4! Tolong jelaskan arsitektur edge Durable Objects & fitur sistem ini.");
					}}
					theme={theme}
					onToggleTheme={toggleTheme}
					pinnedCount={pinnedCount}
					onTogglePinnedOnly={() => setIsShowingPinnedOnly(!isShowingPinnedOnly)}
					isShowingPinnedOnly={isShowingPinnedOnly}
					typingText={typingText}
					connectionStats={connectionStats}
					onCopyLink={handleCopyRoomLink}
					linkCopied={linkCopied}
					isE2EE={isE2EE}
					onToggleE2EE={() => setIsE2EEModalOpen(true)}
				/>

				<ChatArea
					room={room}
					messages={messages}
					currentUserName={profile.name}
					onReply={(msg) => {
						setActiveReply({ id: msg.id, user: msg.user, content: msg.content });
						setEditingMessage(null);
					}}
					onEdit={(msg) => {
						setEditingMessage(msg);
						setActiveReply(null);
					}}
					onDelete={handleDeleteMessage}
					onTogglePin={handleTogglePin}
					onAddReaction={handleAddReaction}
					onImageClick={(url) => setSelectedImageUrl(url)}
					onSendPrompt={(p) => handleSendMessage(p)}
					onSendAttachment={handleSendRealAttachment}
					onError={(msg) => addToast(msg, "error")}
					highlightedMsgId={highlightedMsgId}
					pinnedOnlyFilter={isShowingPinnedOnly}
					e2eePassphrase={e2eeKey}
					typingUsers={typingUsers}
				/>

				<MessageInput
					currentUserName={profile.name}
					onSendMessage={handleSendMessage}
					onSendAttachment={handleSendRealAttachment}
					activeReply={activeReply}
					onCancelReply={() => setActiveReply(null)}
					editingMessage={editingMessage}
					onCancelEdit={() => setEditingMessage(null)}
					onSaveEdit={handleSaveEdit}
					onOpenAttachmentModal={() => setIsAttachmentOpen(true)}
					onTyping={handleUserTyping}
					isE2EE={isE2EE}
				/>
			</main>

			{/* Right Details Drawer */}
			<DetailsDrawer
				isOpen={isDetailsOpen}
				onClose={() => setIsDetailsOpen(false)}
				room={room}
				messages={messages}
				currentUserName={profile.name}
				onJumpToMessage={(id) => {
					setHighlightedMsgId(id);
					setIsDetailsOpen(false);
				}}
				onTogglePin={handleTogglePin}
				onImageClick={(url) => setSelectedImageUrl(url)}
				onCopyLink={handleCopyRoomLink}
				linkCopied={linkCopied}
			/>

			{/* Right Collaborative Scratchpad Drawer */}
			<ScratchpadDrawer
				isOpen={isScratchpadOpen}
				onClose={() => setIsScratchpadOpen(false)}
				content={scratchpadContent}
				onUpdate={handleUpdateScratchpad}
				room={room}
			/>

			{/* Dialog Modals */}
			<ProfileModal
				isOpen={isProfileOpen}
				onClose={() => setIsProfileOpen(false)}
				profile={profile}
				onSave={handleSaveProfile}
			/>

			<NewRoomModal
				isOpen={isNewRoomOpen}
				onClose={() => setIsNewRoomOpen(false)}
				onCreateRoom={handleCreateRoom}
				initialCategory={newRoomInitialCategory}
			/>

			<E2EEKeyModal
				isOpen={isE2EEModalOpen}
				onClose={() => setIsE2EEModalOpen(false)}
				currentKey={e2eeKey}
				onSaveKey={(k) => {
					setE2eeKey(k);
					addToast(k ? "Kunci E2EE diterapkan 🔒" : "E2EE dinonaktifkan", "info");
				}}
				room={room}
			/>

			<NukeConfirmModal
				isOpen={isNukeModalOpen}
				onClose={() => setIsNukeModalOpen(false)}
				onConfirmNuke={handleConfirmNuke}
				room={room}
			/>

			<AttachmentModal
				isOpen={isAttachmentOpen}
				onClose={() => setIsAttachmentOpen(false)}
				onSendAttachment={handleSendRealAttachment}
				onError={(msg) => addToast(msg, "error")}
			/>

			<ImageViewerModal
				imageUrl={selectedImageUrl}
				onClose={() => setSelectedImageUrl(null)}
			/>

			<ShortcutsModal
				isOpen={isShortcutsOpen}
				onClose={() => setIsShortcutsOpen(false)}
			/>

			<SearchModal
				isOpen={isSearchOpen}
				onClose={() => setIsSearchOpen(false)}
				messages={messages}
				onJumpToMessage={(id) => setHighlightedMsgId(id)}
			/>
		</div>
	);
}

const rootElement = document.getElementById("root");
if (rootElement) {
	createRoot(rootElement).render(
		<BrowserRouter>
			<Routes>
				<Route path="/" element={<Navigate to={`/general`} />} />
				<Route path="/:room" element={<DurableChatApp />} />
				<Route path="*" element={<Navigate to="/general" />} />
			</Routes>
		</BrowserRouter>,
	);
}
