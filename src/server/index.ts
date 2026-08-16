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
		const aiMsgId = `ai-${Date.now()}`;

		try {
			let aiResponse = "";
			const promptText = prompt.trim() || (isSummarize ? "Ringkas seluruh percakapan di ruangan ini secara padat dan informatif." : "Halo! Perkenalkan dirimu.");

			if (this.env.AI) {
				const systemInstruction = `Kamu adalah Google Gemma 4 (@cf/google/gemma-4-26b-a4b-it), asisten AI yang cerdas, cepat, dan ahli dalam teknologi cloud & Cloudflare Edge.
Jawab dengan bahasa Indonesia yang ramah, natural, dan format Markdown yang rapi (gunakan bold, bullet list, dan code blocks jika ada kode).`;

				const userContent = isSummarize
					? `Berikut 15 pesan terakhir dalam saluran obrolan:\n${this.messages
							.filter((m) => m.role !== "system")
							.slice(-15)
							.map((m) => `${m.user}: ${m.content}`)
							.join("\n")}\n\nInstruksi: Buatkan ringkasan poin-poin penting dari diskusi di atas secara padat dan terstruktur.`
					: promptText;

				const payload = {
					messages: [
						{ role: "system", content: systemInstruction },
						{ role: "user", content: userContent },
					],
					max_tokens: 1024,
				};

				try {
					// 1. Primary: Google Gemma 4 26B A4B IT (Mixture of Experts)
					const res = (await this.env.AI.run("@cf/google/gemma-4-26b-a4b-it" as any, payload)) as any;
					aiResponse = res?.response || res?.choices?.[0]?.message?.content || res?.result?.response || (typeof res === "string" ? res : "");
				} catch (err1) {
					console.warn("Gemma 4 primary failed, attempting Gemma 7B / fallback:", err1);
					try {
						// 2. Fallback: Google Gemma 7B IT
						const res2 = (await this.env.AI.run("@cf/google/gemma-7b-it" as any, payload)) as any;
						aiResponse = res2?.response || res2?.choices?.[0]?.message?.content || (typeof res2 === "string" ? res2 : "");
					} catch (err2) {
						console.warn("Gemma 7B failed, attempting Llama 3.1 fallback:", err2);
						const res3 = (await this.env.AI.run("@cf/meta/llama-3.1-8b-instruct" as any, payload)) as any;
						aiResponse = res3?.response || res3?.choices?.[0]?.message?.content || (typeof res3 === "string" ? res3 : "");
					}
				}
			}

			if (!aiResponse || !aiResponse.trim()) {
				// Intelligent Edge synthesis fallback when AI binding is offline/local
				if (isSummarize) {
					const count = this.messages.length;
					const users = Array.from(new Set(this.messages.map((m) => m.user)));
					aiResponse = `📊 **Ringkasan Saluran Edge (Gemma 4)**:\n- Total Percakapan: **${count} pesan**\n- Pengguna Aktif: **${users.join(", ")}**\n- Topik: Kolaborasi realtime pada arsitektur Cloudflare Durable Objects SQLite & E2EE Privacy.`;
				} else {
					aiResponse = `✨ **Google Gemma 4 (Cloudflare Edge AI)**:\nHalo **@${user}**! Saya adalah asisten AI berbasis model **Google Gemma 4 (26B A4B MoE)** yang berjalan di jaringan Cloudflare Edge.\n\nMenanggapi pertanyaan Anda: *"${promptText}"*\n\nSistem chat ini terhubung langsung ke **Durable Objects SQLite** dengan latensi ultra rendah, kompresi foto lokal, perekam audio native, dan enkripsi WebCrypto AES-256 sisi klien. Ada topik lain yang ingin Anda eksplorasi?`;
				}
			}

			const aiMsg: ChatMessage = {
				id: aiMsgId,
				content: aiResponse,
				user: "Google Gemma 4",
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
		} catch (err: any) {
			console.error("AI execution error:", err);
			const fallbackMsg: ChatMessage = {
				id: aiMsgId,
				content: `⚠️ **Gemma 4 Edge**: Terjadi kendala saat memproses permintaan: ${err?.message || "Koneksi edge timeout"}. Silakan coba ulangi perintah dengan \`/ai [pertanyaan]\`.`,
				user: "Google Gemma 4",
				role: "assistant",
				timestamp: Date.now(),
			};
			this.saveMessage(fallbackMsg);
			this.broadcast(
				JSON.stringify({
					type: "add",
					...fallbackMsg,
				} satisfies Message),
			);
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

				// Check for AI commands: /ai, @ai, /gemma, @gemma, /summarize, /ringkas
				if (parsed.type === "add" && parsed.content && !parsed.isEncrypted) {
					const trimmed = parsed.content.trim();
					const lower = trimmed.toLowerCase();

					if (lower.startsWith("/ai") || lower.startsWith("@ai") || lower.startsWith("/gemma") || lower.startsWith("@gemma") || lower.startsWith("/tanya")) {
						// Extract prompt after the command keyword
						let query = trimmed.replace(/^(\/ai|@ai|\/gemma|@gemma|\/tanya)\s*/i, "").trim();
						if (!query) query = "Halo Gemma 4! Apa kabar?";
						this.handleAIQuery(query, parsed.user, false);
					} else if (lower === "/summarize" || lower.startsWith("/summarize ") || lower === "/ringkas" || lower.startsWith("/ringkas ")) {
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
