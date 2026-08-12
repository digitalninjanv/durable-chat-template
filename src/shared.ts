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
	role: "user" | "assistant";
	timestamp?: number;
	replyTo?: ReplyInfo | null;
	edited?: boolean;
	pinned?: boolean;
	attachment?: Attachment | null;
	reactions?: Reaction[];
};

export type Message =
	| {
			type: "add";
			id: string;
			content: string;
			user: string;
			role: "user" | "assistant";
			timestamp?: number;
			replyTo?: ReplyInfo | null;
			edited?: boolean;
			pinned?: boolean;
			attachment?: Attachment | null;
			reactions?: Reaction[];
	  }
	| {
			type: "update";
			id: string;
			content: string;
			user: string;
			role: "user" | "assistant";
			timestamp?: number;
			replyTo?: ReplyInfo | null;
			edited?: boolean;
			pinned?: boolean;
			attachment?: Attachment | null;
			reactions?: Reaction[];
	  }
	| {
			type: "delete";
			id: string;
	  }
	| {
			type: "typing";
			user: string;
			isTyping: boolean;
	  }
	| {
			type: "all";
			messages: ChatMessage[];
	  };

export const names = [
	"Alice",
	"Bob",
	"Charlie",
	"David",
	"Eve",
	"Frank",
	"Grace",
	"Heidi",
	"Ivan",
	"Judy",
	"Kevin",
	"Linda",
	"Mallory",
	"Nancy",
	"Oscar",
	"Peggy",
	"Quentin",
	"Randy",
	"Steve",
	"Trent",
	"Ursula",
	"Victor",
	"Walter",
	"Xavier",
	"Yvonne",
	"Zoe",
];
