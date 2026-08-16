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
} from "./types";

import {
	getRandomName,
	getAvatarColor,
	getStoredRooms,
	saveRoomVisit,
	DEFAULT_CHANNELS,
	sounds,
} from "./utils/helpers";

import { Header } from "./components/Header";
import { Sidebar } from "./components/Sidebar";
import { ChatArea } from "./components/ChatArea";
import { MessageInput } from "./components/MessageInput";
import { DetailsDrawer } from "./components/DetailsDrawer";
import { ToastContainer } from "./components/Toast";
import {
	ProfileModal,
	NewRoomModal,
	AttachmentModal,
	ImageViewerModal,
	ShortcutsModal,
	SearchModal,
} from "./components/Modals";

function DurableChatApp() {
	const navigate = useNavigate();
	const { room = "general" } = useParams();

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
		addToast(`Profil berhasil diperbarui: ${updated.name}`, "success");
	}, []);

	// -------------------------------------------------------------
	// Rooms & Navigation
	// -------------------------------------------------------------
	const [recentRooms, setRecentRooms] = useState<RoomInfo[]>(() => getStoredRooms());

	useEffect(() => {
		const currentRoomInfo: RoomInfo = {
			id: room,
			name: room,
			topic: `Ruang diskusi #${room}`,
			lastMessageTime: Date.now(),
		};
		saveRoomVisit(currentRoomInfo);
		setRecentRooms(getStoredRooms());
	}, [room]);

	const handleSelectRoom = useCallback(
		(roomId: string) => {
			navigate(`/${roomId}`);
		},
		[navigate],
	);

	const handleCreateRoom = useCallback(
		(roomId: string, name?: string, topic?: string) => {
			const newRoom: RoomInfo = {
				id: roomId,
				name: name || roomId,
				topic: topic || `Saluran #${roomId}`,
				lastMessageTime: Date.now(),
			};
			saveRoomVisit(newRoom);
			setRecentRooms(getStoredRooms());
			navigate(`/${roomId}`);
			addToast(`Berhasil masuk ke saluran #${roomId}`, "info");
		},
		[navigate],
	);

	// -------------------------------------------------------------
	// Toast Notifications
	// -------------------------------------------------------------
	const [toasts, setToasts] = useState<ToastItem[]>([]);

	const addToast = useCallback(
		(message: string, type: "info" | "success" | "warning" | "error" = "info", duration = 3000) => {
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
	// Messages & WebSocket Sync
	// -------------------------------------------------------------
	const [messages, setMessages] = useState<ChatMessage[]>([]);
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
		onMessage: (evt) => {
			try {
				const message = JSON.parse(evt.data as string) as Message;
				if (message.type === "add") {
					setMessages((prev) => {
						const exists = prev.some((m) => m.id === message.id);
						if (exists) {
							return prev.map((m) => (m.id === message.id ? message : m));
						}
						if (message.user !== profile.name) {
							sounds.playReceive();
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
					if (message.user !== profile.name) {
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

	// Send message
	const handleSendMessage = useCallback(
		(text: string) => {
			const newMessage: ChatMessage = {
				id: nanoid(8),
				content: text,
				user: profile.name,
				role: "user",
				timestamp: Date.now(),
				replyTo: activeReply,
			};

			setMessages((prev) => [...prev, newMessage]);
			sounds.playSend();

			if (socket) {
				socket.send(
					JSON.stringify({
						type: "add",
						...newMessage,
					} satisfies Message),
				);
			}

			setActiveReply(null);
		},
		[socket, profile.name, activeReply],
	);

	// Save edited message
	const handleSaveEdit = useCallback(
		(newContent: string) => {
			if (!editingMessage) return;
			const updated: ChatMessage = {
				...editingMessage,
				content: newContent,
				edited: true,
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

			setEditingMessage(null);
			addToast("Pesan berhasil diperbarui", "info");
		},
		[socket, editingMessage, addToast],
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
			addToast("Pesan telah dihapus", "info");
		},
		[socket, addToast],
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
				updated.pinned ? "Pesan disematkan di ruangan ini 📌" : "Pesan dilepas dari sematan",
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

	// Send Attachment simulation
	const handleSendAttachment = useCallback(
		(type: "image" | "file" | "audio") => {
			let attachment: Attachment;
			let content = "";

			if (type === "image") {
				attachment = {
					type: "image",
					url: "https://images.unsplash.com/photo-1558494949-ef010cbdcc31?auto=format&fit=crop&w=1000&q=80",
					name: "Cloudflare_Edge_Cluster.png",
					size: "1.8 MB",
				};
				content = "Membagikan diagram topologi jaringan edge 🖼️";
			} else if (type === "file") {
				attachment = {
					type: "file",
					url: "#",
					name: "Durable_Objects_Architecture_v2.pdf",
					size: "2.4 MB",
				};
				content = "Membagikan spesifikasi arsitektur Durable Objects 📄";
			} else {
				attachment = {
					type: "audio",
					url: "#",
					name: "Voice_Note_Edge_Update.mp3",
					duration: "0:24",
				};
				content = "Pesan suara dari pengembang 🎙️";
			}

			const newMessage: ChatMessage = {
				id: nanoid(8),
				content,
				user: profile.name,
				role: "user",
				timestamp: Date.now(),
				attachment,
			};

			setMessages((prev) => [...prev, newMessage]);
			sounds.playSend();

			if (socket) {
				socket.send(
					JSON.stringify({
						type: "add",
						...newMessage,
					} satisfies Message),
				);
			}

			setIsAttachmentOpen(false);
			addToast("Lampiran berhasil dikirim ke saluran", "success");
		},
		[socket, profile.name, addToast],
	);

	// Copy room link
	const handleCopyRoomLink = useCallback(() => {
		navigator.clipboard.writeText(window.location.href);
		setLinkCopied(true);
		addToast("Tautan saluran berhasil disalin ke papan klip! 🔗", "success");
		setTimeout(() => setLinkCopied(false), 2000);
	}, [addToast]);

	// -------------------------------------------------------------
	// UI Modals & Panels State
	// -------------------------------------------------------------
	const [isSidebarOpen, setIsSidebarOpen] = useState(false);
	const [isDetailsOpen, setIsDetailsOpen] = useState(false);
	const [isProfileOpen, setIsProfileOpen] = useState(false);
	const [isNewRoomOpen, setIsNewRoomOpen] = useState(false);
	const [isAttachmentOpen, setIsAttachmentOpen] = useState(false);
	const [isShortcutsOpen, setIsShortcutsOpen] = useState(false);
	const [isSearchOpen, setIsSearchOpen] = useState(false);
	const [selectedImageUrl, setSelectedImageUrl] = useState<string | null>(null);

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

			// Escape -> Close all modals/panels
			if (e.key === "Escape") {
				setIsProfileOpen(false);
				setIsNewRoomOpen(false);
				setIsAttachmentOpen(false);
				setIsShortcutsOpen(false);
				setIsSearchOpen(false);
				setSelectedImageUrl(null);
				setActiveReply(null);
				setEditingMessage(null);
			}
		};

		window.addEventListener("keydown", handleGlobalKeyDown);
		return () => window.removeEventListener("keydown", handleGlobalKeyDown);
	}, []);

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
				onOpenNewRoomModal={() => setIsNewRoomOpen(true)}
				onOpenShortcuts={() => setIsShortcutsOpen(true)}
				rooms={recentRooms}
			/>

			{/* Center / Main Chat Container */}
			<main className="app-main-viewport">
				<Header
					room={room}
					onToggleSidebar={() => setIsSidebarOpen(!isSidebarOpen)}
					onToggleDetails={() => setIsDetailsOpen(!isDetailsOpen)}
					detailsOpen={isDetailsOpen}
					onOpenSearch={() => setIsSearchOpen(true)}
					onOpenShortcuts={() => setIsShortcutsOpen(true)}
					theme={theme}
					onToggleTheme={toggleTheme}
					pinnedCount={pinnedCount}
					onTogglePinnedOnly={() => setIsShowingPinnedOnly(!isShowingPinnedOnly)}
					isShowingPinnedOnly={isShowingPinnedOnly}
					typingText={typingText}
					connectionStats={connectionStats}
					onCopyLink={handleCopyRoomLink}
					linkCopied={linkCopied}
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
					onSendPrompt={handleSendMessage}
					highlightedMsgId={highlightedMsgId}
					pinnedOnlyFilter={isShowingPinnedOnly}
				/>

				<MessageInput
					currentUserName={profile.name}
					onSendMessage={handleSendMessage}
					activeReply={activeReply}
					onCancelReply={() => setActiveReply(null)}
					editingMessage={editingMessage}
					onCancelEdit={() => setEditingMessage(null)}
					onSaveEdit={handleSaveEdit}
					onOpenAttachmentModal={() => setIsAttachmentOpen(true)}
					onTyping={handleUserTyping}
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
			/>

			<AttachmentModal
				isOpen={isAttachmentOpen}
				onClose={() => setIsAttachmentOpen(false)}
				onSendAttachment={handleSendAttachment}
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
