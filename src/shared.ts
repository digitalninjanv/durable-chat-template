export type ReplyInfo = {
	id: string;
	user: string;
	content: string;
};

export type ChatMessage = {
	id: string;
	content: string;
	user: string;
	role: "user" | "assistant";
	timestamp?: number;
	replyTo?: ReplyInfo | null;
	edited?: boolean;
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
	  }
	| {
			type: "delete";
			id: string;
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
