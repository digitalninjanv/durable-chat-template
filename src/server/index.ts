import {
	type Connection,
	Server,
	type WSMessage,
	routePartykitRequest,
} from "partyserver";

import type { ChatMessage, Message } from "../shared";

export class Chat extends Server<Env> {
	static options = { hibernate: true };

	messages = [] as ChatMessage[];

	broadcastMessage(message: Message, exclude?: string[]) {
		this.broadcast(JSON.stringify(message), exclude);
	}

	onStart() {
		// create the messages table if it doesn't exist
		this.ctx.storage.sql.exec(
			`CREATE TABLE IF NOT EXISTS messages (
				id TEXT PRIMARY KEY, 
				user TEXT, 
				role TEXT, 
				content TEXT, 
				timestamp INTEGER, 
				reply_to TEXT, 
				edited INTEGER,
				pinned INTEGER,
				attachment TEXT,
				reactions TEXT
			)`,
		);

		// ensure optional columns exist if migrating from old schema
		try {
			this.ctx.storage.sql.exec(`ALTER TABLE messages ADD COLUMN timestamp INTEGER`);
		} catch {}
		try {
			this.ctx.storage.sql.exec(`ALTER TABLE messages ADD COLUMN reply_to TEXT`);
		} catch {}
		try {
			this.ctx.storage.sql.exec(`ALTER TABLE messages ADD COLUMN edited INTEGER`);
		} catch {}
		try {
			this.ctx.storage.sql.exec(`ALTER TABLE messages ADD COLUMN pinned INTEGER`);
		} catch {}
		try {
			this.ctx.storage.sql.exec(`ALTER TABLE messages ADD COLUMN attachment TEXT`);
		} catch {}
		try {
			this.ctx.storage.sql.exec(`ALTER TABLE messages ADD COLUMN reactions TEXT`);
		} catch {}

		// load the messages from the database
		try {
			const rows = this.ctx.storage.sql
				.exec(`SELECT * FROM messages`)
				.toArray() as Record<string, any>[];

			this.messages = rows.map((r) => ({
				id: String(r.id),
				user: String(r.user || "Anonymous"),
				role: (r.role as "user" | "assistant") || "user",
				content: String(r.content || ""),
				timestamp: r.timestamp ? Number(r.timestamp) : Date.now(),
				replyTo: r.reply_to ? JSON.parse(String(r.reply_to)) : undefined,
				edited: Boolean(r.edited),
				pinned: Boolean(r.pinned),
				attachment: r.attachment ? JSON.parse(String(r.attachment)) : undefined,
				reactions: r.reactions ? JSON.parse(String(r.reactions)) : undefined,
			}));
		} catch (e) {
			console.error("Failed to load messages from SQLite:", e);
			this.messages = [];
		}
	}

	onConnect(connection: Connection) {
		connection.send(
			JSON.stringify({
				type: "all",
				messages: this.messages,
			} satisfies Message),
		);
	}

	saveMessage(message: ChatMessage) {
		const existingIndex = this.messages.findIndex((m) => m.id === message.id);
		if (existingIndex !== -1) {
			this.messages[existingIndex] = message;
		} else {
			this.messages.push(message);
		}

		const timestamp = message.timestamp || Date.now();
		const replyToJSON = message.replyTo ? JSON.stringify(message.replyTo) : null;
		const attachmentJSON = message.attachment ? JSON.stringify(message.attachment) : null;
		const reactionsJSON = message.reactions ? JSON.stringify(message.reactions) : null;
		const editedVal = message.edited ? 1 : 0;
		const pinnedVal = message.pinned ? 1 : 0;

		this.ctx.storage.sql.exec(
			`INSERT INTO messages (id, user, role, content, timestamp, reply_to, edited, pinned, attachment, reactions) 
			 VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
			 ON CONFLICT (id) DO UPDATE SET 
				content = excluded.content, 
				user = excluded.user, 
				timestamp = excluded.timestamp, 
				reply_to = excluded.reply_to, 
				edited = excluded.edited,
				pinned = excluded.pinned,
				attachment = excluded.attachment,
				reactions = excluded.reactions`,
			message.id,
			message.user,
			message.role,
			message.content,
			timestamp,
			replyToJSON,
			editedVal,
			pinnedVal,
			attachmentJSON,
			reactionsJSON,
		);
	}

	deleteMessage(id: string) {
		this.messages = this.messages.filter((m) => m.id !== id);
		this.ctx.storage.sql.exec(`DELETE FROM messages WHERE id = ?`, id);
	}

	onMessage(connection: Connection, message: WSMessage) {
		// broadcast the raw message to everyone else
		this.broadcast(message);

		// update local store
		try {
			const parsed = JSON.parse(message as string) as Message;
			if (parsed.type === "add" || parsed.type === "update") {
				this.saveMessage(parsed);
			} else if (parsed.type === "delete") {
				this.deleteMessage(parsed.id);
			}
		} catch (e) {
			console.error("Failed to process message:", e);
		}
	}
}

export default {
	async fetch(request, env) {
		return (
			(await routePartykitRequest(request, { ...env })) ||
			env.ASSETS.fetch(request)
		);
	},
} satisfies ExportedHandler<Env>;
