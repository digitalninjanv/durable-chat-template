import type { ChatMessage, Message, ReplyInfo, Attachment, Reaction } from "../shared";

export type { ChatMessage, Message, ReplyInfo, Attachment, Reaction };

export type ThemeMode = "dark" | "light" | "system";

export interface UserProfile {
	name: string;
	avatarColor: string;
	statusMessage?: string;
	role?: string;
}

export type RoomCategory = "public" | "private" | "direct";

export interface RoomInfo {
	id: string;
	name: string;
	topic?: string;
	type?: RoomCategory;
	e2eeEnabled?: boolean;
	roomKey?: string;
	createdAt?: number;
	lastMessage?: string;
	lastMessageTime?: number;
	unreadCount?: number;
}

export type TTLOption = 0 | 10 | 60 | 300 | 3600 | 86400 | -1;

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
