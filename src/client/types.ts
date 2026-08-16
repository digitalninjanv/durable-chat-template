import type { ChatMessage, Message, ReplyInfo, Attachment, Reaction } from "../shared";

export type { ChatMessage, Message, ReplyInfo, Attachment, Reaction };

export type ThemeMode = "dark" | "light" | "system";

export interface UserProfile {
	name: string;
	avatarColor: string;
	statusMessage?: string;
	role?: string;
}

export interface RoomInfo {
	id: string;
	name: string;
	topic?: string;
	createdAt?: number;
	lastMessage?: string;
	lastMessageTime?: number;
	unreadCount?: number;
}

export interface ToastItem {
	id: string;
	message: string;
	type?: "info" | "success" | "warning" | "error";
	duration?: number;
}

export interface EdgeConnectionStats {
	status: "connected" | "connecting" | "disconnected" | "reconnecting";
	latencyMs: number;
	region: string;
	durableObjectId: string;
}
