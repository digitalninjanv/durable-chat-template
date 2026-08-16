/**
 * Zero-Knowledge Client-Side End-to-End Encryption (E2EE)
 * Powered by WebCrypto API (AES-256-GCM + PBKDF2).
 * Keys are never sent to Cloudflare or stored in SQLite.
 */

// Helper to convert buffer to Base64
function bufferToBase64(buffer: ArrayBuffer): string {
	let binary = "";
	const bytes = new Uint8Array(buffer);
	const len = bytes.byteLength;
	for (let i = 0; i < len; i++) {
		binary += String.fromCharCode(bytes[i]);
	}
	return window.btoa(binary);
}

// Helper to convert Base64 to ArrayBuffer
function base64ToBuffer(base64: string): ArrayBuffer {
	const binaryString = window.atob(base64);
	const len = binaryString.length;
	const bytes = new Uint8Array(len);
	for (let i = 0; i < len; i++) {
		bytes[i] = binaryString.charCodeAt(i);
	}
	return bytes.buffer;
}

// Derive a 256-bit AES-GCM key from a passphrase using PBKDF2
async function deriveKey(passphrase: string, salt: Uint8Array): Promise<CryptoKey> {
	const enc = new TextEncoder();
	const keyMaterial = await window.crypto.subtle.importKey(
		"raw",
		enc.encode(passphrase),
		{ name: "PBKDF2" },
		false,
		["deriveKey"],
	);

	return window.crypto.subtle.deriveKey(
		{
			name: "PBKDF2",
			salt: salt as unknown as BufferSource,
			iterations: 100000,
			hash: "SHA-256",
		},
		keyMaterial,
		{ name: "AES-GCM", length: 256 },
		false,
		["encrypt", "decrypt"],
	);
}

/**
 * Encrypt plain text with a passphrase/room key.
 * Format: `enc:v1:<salt_base64>:<iv_base64>:<ciphertext_base64>`
 */
export async function encryptText(text: string, passphrase?: string): Promise<string> {
	if (!passphrase || !passphrase.trim()) return text;

	try {
		const enc = new TextEncoder();
		const salt = window.crypto.getRandomValues(new Uint8Array(16));
		const iv = window.crypto.getRandomValues(new Uint8Array(12));
		const key = await deriveKey(passphrase, salt);

		const encryptedContent = await window.crypto.subtle.encrypt(
			{
				name: "AES-GCM",
				iv: iv,
			},
			key,
			enc.encode(text),
		);

		const saltB64 = bufferToBase64(salt.buffer);
		const ivB64 = bufferToBase64(iv.buffer);
		const cipherB64 = bufferToBase64(encryptedContent);

		return `enc:v1:${saltB64}:${ivB64}:${cipherB64}`;
	} catch (e) {
		console.error("Encryption failed:", e);
		return text;
	}
}

/**
 * Decrypt cipher text with a passphrase/room key.
 */
export async function decryptText(encryptedText: string, passphrase?: string): Promise<string> {
	if (!encryptedText.startsWith("enc:v1:")) {
		return encryptedText;
	}

	if (!passphrase || !passphrase.trim()) {
		return "🔒 [Pesan Terenkripsi E2EE - Masukkan Kunci Ruangan untuk Membaca]";
	}

	try {
		const parts = encryptedText.split(":");
		if (parts.length !== 5) return encryptedText;

		const salt = new Uint8Array(base64ToBuffer(parts[2]));
		const iv = new Uint8Array(base64ToBuffer(parts[3]));
		const ciphertext = base64ToBuffer(parts[4]);

		const key = await deriveKey(passphrase, salt);

		const decryptedContent = await window.crypto.subtle.decrypt(
			{
				name: "AES-GCM",
				iv: iv,
			},
			key,
			ciphertext,
		);

		const dec = new TextDecoder();
		return dec.decode(decryptedContent);
	} catch (e) {
		return "🔒 [Kunci Enkripsi Salah / Gagal Mendekripsi]";
	}
}

export function generateRoomKey(): string {
	const array = new Uint8Array(18);
	window.crypto.getRandomValues(array);
	return Array.from(array, (byte) => byte.toString(36)).join("").slice(0, 16);
}
