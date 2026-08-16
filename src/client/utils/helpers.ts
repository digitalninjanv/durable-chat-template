import { names } from "../../shared";
import type { ChatMessage, RoomInfo, Attachment } from "../types";

export const AVATAR_PALETTES = [
	{ bg: "#3B82F6", text: "#FFFFFF", name: "Blue" },
	{ bg: "#10B981", text: "#FFFFFF", name: "Emerald" },
	{ bg: "#6366F1", text: "#FFFFFF", name: "Indigo" },
	{ bg: "#EC4899", text: "#FFFFFF", name: "Pink" },
	{ bg: "#F59E0B", text: "#FFFFFF", name: "Amber" },
	{ bg: "#8B5CF6", text: "#FFFFFF", name: "Purple" },
	{ bg: "#06B6D4", text: "#FFFFFF", name: "Cyan" },
	{ bg: "#14B8A6", text: "#FFFFFF", name: "Teal" },
	{ bg: "#F97316", text: "#FFFFFF", name: "Orange" },
	{ bg: "#64748B", text: "#FFFFFF", name: "Slate" },
];

export function hashString(str: string): number {
	let hash = 0;
	for (let i = 0; i < str.length; i++) {
		hash = str.charCodeAt(i) + ((hash << 5) - hash);
	}
	return Math.abs(hash);
}

export function getAvatarColor(name: string): { bg: string; text: string } {
	const index = hashString(name) % AVATAR_PALETTES.length;
	return AVATAR_PALETTES[index];
}

export function getSenderAccentColor(name: string): string {
	const colors = [
		"#3B82F6", "#10B981", "#8B5CF6", "#F59E0B",
		"#EC4899", "#06B6D4", "#6366F1", "#14B8A6",
		"#F97316", "#84CC16"
	];
	return colors[hashString(name) % colors.length];
}

export function formatMessageTime(timestamp?: number): string {
	if (!timestamp) return "";
	const date = new Date(timestamp);
	return date.toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" });
}

export function formatDateHeader(timestamp?: number): string {
	if (!timestamp) return "";
	const date = new Date(timestamp);
	const today = new Date();
	const yesterday = new Date();
	yesterday.setDate(yesterday.getDate() - 1);

	if (date.toDateString() === today.toDateString()) {
		return "Hari ini";
	}
	if (date.toDateString() === yesterday.toDateString()) {
		return "Kemarin";
	}
	return date.toLocaleDateString("id-ID", {
		weekday: "short",
		day: "numeric",
		month: "short",
		year: "numeric",
	});
}

export function getInitial(name: string): string {
	if (!name) return "?";
	return name.trim().charAt(0).toUpperCase();
}

export function getRandomName(): string {
	return names[Math.floor(Math.random() * names.length)];
}

export function formatBytes(bytes: number): string {
	if (bytes === 0) return "0 B";
	const k = 1024;
	const sizes = ["B", "KB", "MB", "GB"];
	const i = Math.floor(Math.log(bytes) / Math.log(k));
	return parseFloat((bytes / Math.pow(k, i)).toFixed(1)) + " " + sizes[i];
}

// -------------------------------------------------------------
// Real Free File & Image Processing (Client-Side Encoding)
// -------------------------------------------------------------

export function readFileAsDataUrl(file: File | Blob): Promise<string> {
	return new Promise((resolve, reject) => {
		const reader = new FileReader();
		reader.onload = () => resolve(reader.result as string);
		reader.onerror = (e) => reject(e);
		reader.readAsDataURL(file);
	});
}

/**
 * Free Smart Image Compressor:
 * Resizes large photos client-side to max 1280px maintaining aspect ratio
 * and encodes as lightweight JPEG/WebP data URL (< 150KB) for instant edge transmission.
 */
export async function compressImageFile(
	file: File,
	maxDimension = 1280,
	quality = 0.82,
): Promise<{ dataUrl: string; size: string; name: string }> {
	const rawDataUrl = await readFileAsDataUrl(file);

	return new Promise((resolve) => {
		const img = new Image();
		img.onload = () => {
			let width = img.width;
			let height = img.height;

			if (width > maxDimension || height > maxDimension) {
				if (width > height) {
					height = Math.round((height * maxDimension) / width);
					width = maxDimension;
				} else {
					width = Math.round((width * maxDimension) / height);
					height = maxDimension;
				}
			}

			const canvas = document.createElement("canvas");
			canvas.width = width;
			canvas.height = height;
			const ctx = canvas.getContext("2d");

			if (ctx) {
				ctx.imageSmoothingEnabled = true;
				ctx.imageSmoothingQuality = "high";
				ctx.drawImage(img, 0, 0, width, height);

				// Export as JPEG Data URL
				const compressedUrl = canvas.toDataURL("image/jpeg", quality);
				// Calculate approximate compressed size in bytes
				const base64Len = compressedUrl.length - compressedUrl.indexOf(",") - 1;
				const byteSize = Math.round((base64Len * 3) / 4);

				resolve({
					dataUrl: compressedUrl,
					size: formatBytes(byteSize),
					name: file.name,
				});
			} else {
				// Fallback to raw if canvas fails
				resolve({
					dataUrl: rawDataUrl,
					size: formatBytes(file.size),
					name: file.name,
				});
			}
		};

		img.onerror = () => {
			resolve({
				dataUrl: rawDataUrl,
				size: formatBytes(file.size),
				name: file.name,
			});
		};

		img.src = rawDataUrl;
	});
}

/**
 * Read any document or file (PDF, Doc, JSON, etc.) as Data URL for free instant sharing.
 */
export async function processDocumentFile(
	file: File,
): Promise<{ dataUrl: string; size: string; name: string }> {
	const dataUrl = await readFileAsDataUrl(file);
	return {
		dataUrl,
		size: formatBytes(file.size),
		name: file.name,
	};
}

// Storage helpers for Recent Rooms
const RECENT_ROOMS_KEY = "cf_durable_recent_rooms";

export const DEFAULT_CHANNELS: RoomInfo[] = [
	{ id: "general", name: "general", topic: "Diskusi umum dan obrolan tim" },
	{ id: "engineering", name: "engineering", topic: "Arsitektur Cloudflare Workers & DO" },
	{ id: "ai-agents", name: "ai-agents", topic: "Diskusi Model AI dan LLM Tooling" },
	{ id: "random", name: "random", topic: "Santai dan berbagi tautan menarik" },
];

export function getStoredRooms(): RoomInfo[] {
	try {
		const raw = localStorage.getItem(RECENT_ROOMS_KEY);
		if (raw) {
			const parsed = JSON.parse(raw) as RoomInfo[];
			if (Array.isArray(parsed) && parsed.length > 0) {
				return parsed;
			}
		}
	} catch (e) {
		console.warn("Error reading stored rooms:", e);
	}
	return DEFAULT_CHANNELS;
}

export function saveRoomVisit(room: RoomInfo) {
	try {
		const current = getStoredRooms();
		const filtered = current.filter((r) => r.id !== room.id);
		const updated = [room, ...filtered].slice(0, 12);
		localStorage.setItem(RECENT_ROOMS_KEY, JSON.stringify(updated));
	} catch (e) {
		console.warn("Error saving room visit:", e);
	}
}

// Export chat history helper
export function exportChatHistory(room: string, messages: ChatMessage[], format: "json" | "txt") {
	let dataStr = "";
	let mimeType = "text/plain";
	let ext = "txt";

	if (format === "json") {
		dataStr = JSON.stringify(messages, null, 2);
		mimeType = "application/json";
		ext = "json";
	} else {
		dataStr = messages
			.map((m) => {
				const time = m.timestamp ? new Date(m.timestamp).toLocaleString("id-ID") : "";
				const reply = m.replyTo ? ` [Membalas ${m.replyTo.user}: "${m.replyTo.content.slice(0, 30)}..."]` : "";
				const attach = m.attachment ? ` [Lampiran: ${m.attachment.type} - ${m.attachment.name}]` : "";
				return `[${time}] ${m.user}${reply}${attach}:\n${m.content}\n`;
			})
			.join("\n----------------------------------------\n\n");
	}

	const blob = new Blob([dataStr], { type: mimeType });
	const url = URL.createObjectURL(blob);
	const a = document.createElement("a");
	a.href = url;
	a.download = `chat-export-${room}-${new Date().toISOString().slice(0, 10)}.${ext}`;
	document.body.appendChild(a);
	a.click();
	document.body.removeChild(a);
	URL.revokeObjectURL(url);
}

// Subtle Web Audio synthesizer for pleasant micro-feedback
class SoundEffects {
	private ctx: AudioContext | null = null;
	public enabled: boolean = true;

	constructor() {
		try {
			const saved = localStorage.getItem("cf_chat_sound");
			this.enabled = saved !== "false";
		} catch {}
	}

	private getContext(): AudioContext | null {
		if (typeof window === "undefined") return null;
		if (!this.ctx) {
			const AudioContextClass = window.AudioContext || (window as any).webkitAudioContext;
			if (AudioContextClass) {
				this.ctx = new AudioContextClass();
			}
		}
		if (this.ctx && this.ctx.state === "suspended") {
			this.ctx.resume();
		}
		return this.ctx;
	}

	public playSend() {
		if (!this.enabled) return;
		const ctx = this.getContext();
		if (!ctx) return;
		try {
			const osc = ctx.createOscillator();
			const gain = ctx.createGain();
			osc.type = "sine";
			osc.frequency.setValueAtTime(440, ctx.currentTime);
			osc.frequency.exponentialRampToValueAtTime(880, ctx.currentTime + 0.08);
			gain.gain.setValueAtTime(0.04, ctx.currentTime);
			gain.gain.exponentialRampToValueAtTime(0.001, ctx.currentTime + 0.08);
			osc.connect(gain);
			gain.connect(ctx.destination);
			osc.start();
			osc.stop(ctx.currentTime + 0.08);
		} catch {}
	}

	public playReceive() {
		if (!this.enabled) return;
		const ctx = this.getContext();
		if (!ctx) return;
		try {
			const osc = ctx.createOscillator();
			const gain = ctx.createGain();
			osc.type = "sine";
			osc.frequency.setValueAtTime(650, ctx.currentTime);
			osc.frequency.exponentialRampToValueAtTime(980, ctx.currentTime + 0.1);
			gain.gain.setValueAtTime(0.05, ctx.currentTime);
			gain.gain.exponentialRampToValueAtTime(0.001, ctx.currentTime + 0.1);
			osc.connect(gain);
			gain.connect(ctx.destination);
			osc.start();
			osc.stop(ctx.currentTime + 0.1);
		} catch {}
	}
}

export const sounds = new SoundEffects();
