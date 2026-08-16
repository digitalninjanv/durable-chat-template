export type ReplyInfo = {
	id: string;
	user: string;
	content: string;
};

export type Attachment = {
	type: "image" | "file" | "audio";
	url: string;
	name: string;
	size?: string;
	duration?: string;
	isEncrypted?: boolean;
};

export type Reaction = {
	emoji: string;
	count: number;
	users: string[];
};

export type ChatMessage = {
	id: string;
	content: string;
	user: string;
	role: "user" | "assistant" | "system";
	timestamp?: number;
	replyTo?: ReplyInfo | null;
	edited?: boolean;
	pinned?: boolean;
	attachment?: Attachment | null;
	reactions?: Reaction[];
	isEncrypted?: boolean;
	expiresAt?: number;
	burnOnRead?: boolean;
};

export type Message =
	| {
			type: "add";
			id: string;
			content: string;
			user: string;
			role: "user" | "assistant" | "system";
			timestamp?: number;
			replyTo?: ReplyInfo | null;
			edited?: boolean;
			pinned?: boolean;
			attachment?: Attachment | null;
			reactions?: Reaction[];
			isEncrypted?: boolean;
			expiresAt?: number;
			burnOnRead?: boolean;
	  }
	| {
			type: "update";
			id: string;
			content: string;
			user: string;
			role: "user" | "assistant" | "system";
			timestamp?: number;
			replyTo?: ReplyInfo | null;
			edited?: boolean;
			pinned?: boolean;
			attachment?: Attachment | null;
			reactions?: Reaction[];
			isEncrypted?: boolean;
			expiresAt?: number;
			burnOnRead?: boolean;
	  }
	| {
			type: "delete";
			id: string;
	  }
	| {
			type: "nuke";
			user: string;
	  }
	| {
			type: "scratchpad";
			content: string;
			updatedBy: string;
			updatedAt: number;
	  }
	| {
			type: "typing";
			user: string;
			isTyping: boolean;
	  }
	| {
			type: "all";
			messages: ChatMessage[];
			scratchpad?: string;
	  };

export const names = [
	"Cipher",
	"Vortex",
	"Shadow",
	"Nexus",
	"Phantom",
	"Specter",
	"Echo",
	"Matrix",
	"Apex",
	"Zero",
	"Titan",
	"Nova",
	"Zenith",
	"Aegis",
	"Sentinel",
	"Quantum",
	"Orion",
	"Hyperion",
	"Helix",
	"Valkyrie",
	"Cobalt",
	"Krypton",
	"Mirage",
	"Vector",
	"Solstice",
];
