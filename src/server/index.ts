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
	scratchpadContent = "";

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
				reactions TEXT,
				is_encrypted INTEGER,
				expires_at INTEGER,
				burn_on_read INTEGER
			)`,
		);

		// create scratchpad table
		this.ctx.storage.sql.exec(
			`CREATE TABLE IF NOT EXISTS scratchpad (
				id TEXT PRIMARY KEY,
				content TEXT,
				updated_at INTEGER,
				updated_by TEXT
			)`,
		);

		// ensure optional columns exist if migrating from older schema
		const migrations = [
			"timestamp INTEGER",
			"reply_to TEXT",
			"edited INTEGER",
			"pinned INTEGER",
			"attachment TEXT",
			"reactions TEXT",
			"is_encrypted INTEGER",
			"expires_at INTEGER",
			"burn_on_read INTEGER",
		];

		for (const col of migrations) {
			try {
				this.ctx.storage.sql.exec(`ALTER TABLE messages ADD COLUMN ${col}`);
			} catch {}
		}

		// load the messages from the database
		try {
			const now = Date.now();
			// Clean expired messages
			this.ctx.storage.sql.exec(
				`DELETE FROM messages WHERE expires_at IS NOT NULL AND expires_at > 0 AND expires_at <= ?`,
				now,
			);

			const rows = this.ctx.storage.sql
				.exec(`SELECT * FROM messages ORDER BY timestamp ASC`)
				.toArray() as Record<string, any>[];

			this.messages = rows.map((r) => ({
				id: String(r.id),
				user: String(r.user || "Anonymous"),
				role: (r.role as "user" | "assistant" | "system") || "user",
				content: String(r.content || ""),
				timestamp: r.timestamp ? Number(r.timestamp) : Date.now(),
				replyTo: r.reply_to ? JSON.parse(String(r.reply_to)) : undefined,
				edited: Boolean(r.edited),
				pinned: Boolean(r.pinned),
				attachment: r.attachment ? JSON.parse(String(r.attachment)) : undefined,
				reactions: r.reactions ? JSON.parse(String(r.reactions)) : undefined,
				isEncrypted: Boolean(r.is_encrypted),
				expiresAt: r.expires_at ? Number(r.expires_at) : undefined,
				burnOnRead: Boolean(r.burn_on_read),
			}));

			// Load scratchpad
			const padRows = this.ctx.storage.sql
				.exec(`SELECT * FROM scratchpad WHERE id = 'default' LIMIT 1`)
				.toArray() as Record<string, any>[];
			if (padRows.length > 0) {
				this.scratchpadContent = String(padRows[0].content || "");
			}
		} catch (e) {
			console.error("Failed to load data from SQLite:", e);
			this.messages = [];
		}
	}

	onConnect(connection: Connection) {
		connection.send(
			JSON.stringify({
				type: "all",
				messages: this.messages,
				scratchpad: this.scratchpadContent,
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
		const encryptedVal = message.isEncrypted ? 1 : 0;
		const burnVal = message.burnOnRead ? 1 : 0;
		const expiresAtVal = message.expiresAt || null;

		this.ctx.storage.sql.exec(
			`INSERT INTO messages (id, user, role, content, timestamp, reply_to, edited, pinned, attachment, reactions, is_encrypted, expires_at, burn_on_read) 
			 VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
			 ON CONFLICT (id) DO UPDATE SET 
				content = excluded.content, 
				user = excluded.user, 
				role = excluded.role,
				timestamp = excluded.timestamp, 
				reply_to = excluded.reply_to, 
				edited = excluded.edited,
				pinned = excluded.pinned,
				attachment = excluded.attachment,
				reactions = excluded.reactions,
				is_encrypted = excluded.is_encrypted,
				expires_at = excluded.expires_at,
				burn_on_read = excluded.burn_on_read`,
			message.id,
			message.user,
			message.role || "user",
			message.content,
			timestamp,
			replyToJSON,
			editedVal,
			pinnedVal,
			attachmentJSON,
			reactionsJSON,
			encryptedVal,
			expiresAtVal,
			burnVal,
		);
	}

	deleteMessage(id: string) {
		this.messages = this.messages.filter((m) => m.id !== id);
		this.ctx.storage.sql.exec(`DELETE FROM messages WHERE id = ?`, id);
	}

	nukeRoom(user: string) {
		this.messages = [];
		this.scratchpadContent = "";
		this.ctx.storage.sql.exec(`DELETE FROM messages`);
		this.ctx.storage.sql.exec(`DELETE FROM scratchpad`);

		const sysMessage: ChatMessage = {
			id: `nuke-${Date.now()}`,
			content: `⚠️ Seluruh riwayat percakapan dan catatan ruangan telah dimusnahkan (*Nuked*) tanpa jejak oleh @${user}.`,
			user: "System Security",
			role: "system",
			timestamp: Date.now(),
		};

		this.saveMessage(sysMessage);
		this.broadcast(
			JSON.stringify({
				type: "all",
				messages: [sysMessage],
				scratchpad: "",
			} satisfies Message),
		);
	}

	saveScratchpad(content: string, updatedBy: string) {
		this.scratchpadContent = content;
		this.ctx.storage.sql.exec(
			`INSERT INTO scratchpad (id, content, updated_at, updated_by)
			 VALUES ('default', ?, ?, ?)
			 ON CONFLICT (id) DO UPDATE SET
				content = excluded.content,
				updated_at = excluded.updated_at,
				updated_by = excluded.updated_by`,
			content,
			Date.now(),
			updatedBy,
		);
	}

	async handleAIQuery(prompt: string, user: string, isSummarize = false) {
		try {
			let aiResponse = "";

			if (this.env.AI) {
				const messagesContext = isSummarize
					? `Berikut ringkasan riwayat percakapan:\n` +
					  this.messages
							.slice(-15)
							.map((m) => `${m.user}: ${m.content}`)
							.join("\n") +
					  `\n\nBuat ringkasan poin-poin penting dalam bahasa Indonesia yang ringkas dan padat.`
					: prompt;

				const res = (await this.env.AI.run("@cf/meta/llama-3-8b-instruct" as any, {
					prompt: messagesContext,
					max_tokens: 512,
				})) as any;

				aiResponse = res.response || "Tidak ada respons dari AI.";
			} else {
				// Local / fallback intelligent synthesis
				if (isSummarize) {
					const count = this.messages.length;
					const users = Array.from(new Set(this.messages.map((m) => m.user)));
					aiResponse = `📊 **Ringkasan Ruangan Edge**: Terdapat ${count} pesan dari peserta: ${users.join(
						", ",
					)}. Topik berfokus pada kolaborasi real-time dan arsitektur edge Durable Objects.`;
				} else {
					aiResponse = `🤖 **Cloudflare Edge Assistant**: Terima kasih atas pertanyaan "${prompt}". Sistem berjalan pada Cloudflare Workers + Durable Objects SQLite dengan latensi sub-millisecond.`;
				}
			}

			const aiMsg: ChatMessage = {
				id: `ai-${Date.now()}`,
				content: aiResponse,
				user: "Cloudflare Edge AI",
				role: "assistant",
				timestamp: Date.now(),
			};

			this.saveMessage(aiMsg);
			this.broadcast(
				JSON.stringify({
					type: "add",
					...aiMsg,
				} satisfies Message),
			);
		} catch (err) {
			console.error("AI execution error:", err);
		}
	}

	onMessage(connection: Connection, message: WSMessage) {
		// broadcast the raw message to everyone else
		this.broadcast(message);

		// update local store
		try {
			const parsed = JSON.parse(message as string) as Message;
			if (parsed.type === "add" || parsed.type === "update") {
				this.saveMessage(parsed);

				// Check for AI commands: /ai, /summarize
				if (parsed.type === "add" && parsed.content && !parsed.isEncrypted) {
					const trimmed = parsed.content.trim();
					if (trimmed.startsWith("/ai ")) {
						const query = trimmed.substring(4);
						this.handleAIQuery(query, parsed.user, false);
					} else if (trimmed === "/summarize" || trimmed.startsWith("/summarize ")) {
						this.handleAIQuery("", parsed.user, true);
					}
				}
			} else if (parsed.type === "delete") {
				this.deleteMessage(parsed.id);
			} else if (parsed.type === "nuke") {
				this.nukeRoom(parsed.user);
			} else if (parsed.type === "scratchpad") {
				this.saveScratchpad(parsed.content, parsed.updatedBy);
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
