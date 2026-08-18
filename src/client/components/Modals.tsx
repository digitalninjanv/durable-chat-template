import React, { useState, useRef } from "react";
import type { UserProfile, ChatMessage, Attachment, RoomCategory } from "../types";
import {
	AVATAR_COLORS,
	compressImageFile,
	processDocumentFile,
	formatBytes,
} from "../utils/helpers";
import { generateRoomKey } from "../utils/crypto";
import {
	CloseIcon,
	CheckIcon,
	ImageIcon,
	FileTextIcon,
	MicIcon,
	SearchIcon,
	PlayIcon,
	PauseIcon,
	LockIcon,
	AlertTriangleIcon,
	KeyIcon,
	UsersIcon,
	HashIcon,
	DownloadIcon,
	ExternalLinkIcon,
} from "./Icons";

// ============================================================================
// 1. Profile Edit Modal
// ============================================================================
interface ProfileModalProps {
	isOpen: boolean;
	onClose: () => void;
	profile: UserProfile;
	onSave: (updated: UserProfile) => void;
}

export const ProfileModal: React.FC<ProfileModalProps> = ({
	isOpen,
	onClose,
	profile,
	onSave,
}) => {
	const [name, setName] = useState(profile.name);
	const [status, setStatus] = useState(profile.statusMessage || "");
	const [selectedColor, setSelectedColor] = useState(profile.avatarColor || AVATAR_COLORS[0]);

	if (!isOpen) return null;

	const handleSubmit = (e: React.FormEvent) => {
		e.preventDefault();
		if (!name.trim()) return;
		onSave({
			name: name.trim(),
			statusMessage: status.trim() || undefined,
			avatarColor: selectedColor,
		});
		onClose();
	};

	return (
		<div className="modal-backdrop" onClick={onClose}>
			<div className="modal-card" onClick={(e) => e.stopPropagation()}>
				<div className="modal-header">
					<h3 className="modal-title">Pengaturan Profil Pengguna</h3>
					<button type="button" className="modal-close-btn" onClick={onClose}>
						<CloseIcon size={18} />
					</button>
				</div>

				<form onSubmit={handleSubmit} className="modal-form">
					<div className="avatar-preview-section">
						<div
							className="avatar-large"
							style={{ backgroundColor: selectedColor, color: "#FFFFFF" }}
						>
							{name.trim() ? name.trim()[0].toUpperCase() : "?"}
						</div>
						<div className="avatar-color-options">
							<span className="field-label">Pilih Warna Avatar</span>
							<div className="color-swatches-grid">
								{AVATAR_COLORS.map((c) => (
									<button
										key={c}
										type="button"
										className={`swatch-btn ${selectedColor === c ? "selected" : ""}`}
										style={{ backgroundColor: c }}
										onClick={() => setSelectedColor(c)}
									>
										{selectedColor === c && <CheckIcon size={12} />}
									</button>
								))}
							</div>
						</div>
					</div>

					<div className="form-group">
						<label htmlFor="display-name" className="field-label">
							Nama Tampilan (Username)
						</label>
						<input
							id="display-name"
							type="text"
							className="text-input"
							value={name}
							onChange={(e) => setName(e.target.value)}
							placeholder="Contoh: Alex, Sarah, Cipher"
							maxLength={24}
							required
						/>
					</div>

					<div className="form-group">
						<label htmlFor="status-message" className="field-label">
							Status / Bio Singkat
						</label>
						<input
							id="status-message"
							type="text"
							className="text-input"
							value={status}
							onChange={(e) => setStatus(e.target.value)}
							placeholder="Contoh: Edge Architect, Coding, AFK"
							maxLength={60}
						/>
					</div>

					<div className="modal-footer">
						<button type="button" className="btn-ghost" onClick={onClose}>
							Batal
						</button>
						<button type="submit" className="btn-solid-primary">
							Simpan Profil
						</button>
					</div>
				</form>
			</div>
		</div>
	);
};

// ============================================================================
// 2. New Room Modal (Public, Private E2EE, DM)
// ============================================================================
interface NewRoomModalProps {
	isOpen: boolean;
	onClose: () => void;
	onCreateRoom: (roomId: string, name?: string, topic?: string, category?: RoomCategory, e2eeKey?: string) => void;
	initialCategory?: RoomCategory;
}

export const NewRoomModal: React.FC<NewRoomModalProps> = ({
	isOpen,
	onClose,
	onCreateRoom,
	initialCategory = "public",
}) => {
	const [category, setCategory] = useState<RoomCategory>(initialCategory);
	const [roomSlug, setRoomSlug] = useState("");
	const [topic, setTopic] = useState("");
	const [e2eeKey, setE2eeKey] = useState("");

	if (!isOpen) return null;

	const handleSlugChange = (e: React.ChangeEvent<HTMLInputElement>) => {
		const formatted = e.target.value
			.toLowerCase()
			.replace(/\s+/g, "-")
			.replace(/[^a-z0-9-_]/g, "");
		setRoomSlug(formatted);
	};

	const handleGenerateKey = () => {
		setE2eeKey(generateRoomKey());
	};

	const handleSubmit = (e: React.FormEvent) => {
		e.preventDefault();
		const finalSlug = category === "direct" && !roomSlug.startsWith("dm-") ? `dm-${roomSlug.trim()}` : roomSlug.trim();
		if (!finalSlug) return;

		onCreateRoom(
			finalSlug,
			roomSlug.trim(),
			topic.trim() || undefined,
			category,
			category === "private" ? e2eeKey.trim() || undefined : undefined,
		);
		onClose();
		setRoomSlug("");
		setTopic("");
		setE2eeKey("");
	};

	return (
		<div className="modal-backdrop" onClick={onClose}>
			<div className="modal-card" onClick={(e) => e.stopPropagation()}>
				<div className="modal-header">
					<h3 className="modal-title">Buat Ruangan Baru di Edge</h3>
					<button type="button" className="modal-close-btn" onClick={onClose}>
						<CloseIcon size={18} />
					</button>
				</div>

				<form onSubmit={handleSubmit} className="modal-form">
					{/* Category Selector */}
					<div className="form-group">
						<label className="field-label">Tipe Ruangan</label>
						<div className="room-type-picker-grid">
							<button
								type="button"
								className={`type-picker-card ${category === "public" ? "selected" : ""}`}
								onClick={() => setCategory("public")}
							>
								<HashIcon size={18} />
								<div className="type-picker-title">Saluran Publik</div>
								<div className="type-picker-desc">Bisa diakses siapa saja dengan tautan</div>
							</button>

							<button
								type="button"
								className={`type-picker-card ${category === "private" ? "selected" : ""}`}
								onClick={() => {
									setCategory("private");
									if (!e2eeKey) handleGenerateKey();
								}}
							>
								<LockIcon size={18} />
								<div className="type-picker-title">Privat E2EE</div>
								<div className="type-picker-desc">Enkripsi WebCrypto AES-256 sisi klien</div>
							</button>

							<button
								type="button"
								className={`type-picker-card ${category === "direct" ? "selected" : ""}`}
								onClick={() => setCategory("direct")}
							>
								<UsersIcon size={18} />
								<div className="type-picker-title">Pesan DM</div>
								<div className="type-picker-desc">Ruang obrolan langsung 1-on-1</div>
							</button>
						</div>
					</div>

					<div className="form-group">
						<label htmlFor="room-id" className="field-label">
							{category === "direct" ? "Nama / Token Penerima" : "Slug / ID Ruangan"}
						</label>
						<div className="slug-input-wrapper">
							<span className="slug-prefix">
								{category === "direct" ? "@" : category === "private" ? "🔒 #" : "#"}
							</span>
							<input
								id="room-id"
								type="text"
								className="text-input slug-input"
								value={roomSlug}
								onChange={handleSlugChange}
								placeholder={
									category === "direct" ? "nama-kontak" : category === "private" ? "rahasia-tim" : "nama-saluran"
								}
								maxLength={32}
								required
							/>
						</div>
					</div>

					{category === "private" && (
						<div className="form-group e2ee-key-group">
							<div className="field-label-row">
								<label htmlFor="e2ee-key" className="field-label">
									Kunci Enkripsi Ruangan (Passphrase)
								</label>
								<button
									type="button"
									className="generate-key-btn"
									onClick={handleGenerateKey}
								>
									Acak Kunci
								</button>
							</div>
							<div className="slug-input-wrapper">
								<span className="slug-prefix"><KeyIcon size={14} /></span>
								<input
									id="e2ee-key"
									type="text"
									className="text-input slug-input"
									value={e2eeKey}
									onChange={(e) => setE2eeKey(e.target.value)}
									placeholder="Kunci rahasia untuk membaca pesan..."
									required
								/>
							</div>
							<span className="field-hint">
								Penerima harus memasukkan kunci yang sama untuk mendekripsi pesan.
							</span>
						</div>
					)}

					<div className="form-group">
						<label htmlFor="room-topic" className="field-label">
							Deskripsi / Topik Singkat
						</label>
						<input
							id="room-topic"
							type="text"
							className="text-input"
							value={topic}
							onChange={(e) => setTopic(e.target.value)}
							placeholder="Contoh: Diskusi teknis arsitektur 2026"
							maxLength={80}
						/>
					</div>

					<div className="modal-footer">
						<button type="button" className="btn-ghost" onClick={onClose}>
							Batal
						</button>
						<button type="submit" className="btn-solid-primary">
							{category === "private"
								? "Buat Ruang Terenkripsi"
								: category === "direct"
								? "Mulai Chat Langsung"
								: "Buat Saluran"}
						</button>
					</div>
				</form>
			</div>
		</div>
	);
};

// ============================================================================
// 3. E2EE Passphrase Manager Modal
// ============================================================================
interface E2EEKeyModalProps {
	isOpen: boolean;
	onClose: () => void;
	currentKey: string;
	onSaveKey: (key: string) => void;
	room: string;
}

export const E2EEKeyModal: React.FC<E2EEKeyModalProps> = ({
	isOpen,
	onClose,
	currentKey,
	onSaveKey,
	room,
}) => {
	const [key, setKey] = useState(currentKey);

	if (!isOpen) return null;

	const handleSubmit = (e: React.FormEvent) => {
		e.preventDefault();
		onSaveKey(key.trim());
		onClose();
	};

	return (
		<div className="modal-backdrop" onClick={onClose}>
			<div className="modal-card" onClick={(e) => e.stopPropagation()}>
				<div className="modal-header">
					<div className="modal-title-with-icon">
						<LockIcon size={18} />
						<h3 className="modal-title">Kunci Enkripsi E2EE (#{room})</h3>
					</div>
					<button type="button" className="modal-close-btn" onClick={onClose}>
						<CloseIcon size={18} />
					</button>
				</div>

				<form onSubmit={handleSubmit} className="modal-form">
					<p className="e2ee-modal-explainer">
						Pesan di ruangan ini dienkripsi secara lokal di browser menggunakan <strong>AES-256-GCM</strong>. Kunci tidak pernah dikirim ke server Cloudflare.
					</p>

					<div className="form-group">
						<label htmlFor="room-passphrase" className="field-label">
							Masukkan Kunci / Sandi Dekripsi
						</label>
						<input
							id="room-passphrase"
							type="text"
							className="text-input font-mono"
							value={key}
							onChange={(e) => setKey(e.target.value)}
							placeholder="Masukkan kata sandi enkripsi..."
							autoFocus
						/>
					</div>

					<div className="modal-footer">
						<button
							type="button"
							className="btn-ghost"
							onClick={() => {
								onSaveKey("");
								onClose();
							}}
						>
							Nonaktifkan E2EE
						</button>
						<button type="submit" className="btn-solid-primary">
							Terapkan Kunci
						</button>
					</div>
				</form>
			</div>
		</div>
	);
};

// ============================================================================
// 4. Room Nuke Confirmation Modal
// ============================================================================
interface NukeConfirmModalProps {
	isOpen: boolean;
	onClose: () => void;
	onConfirmNuke: () => void;
	room: string;
}

export const NukeConfirmModal: React.FC<NukeConfirmModalProps> = ({
	isOpen,
	onClose,
	onConfirmNuke,
	room,
}) => {
	if (!isOpen) return null;

	return (
		<div className="modal-backdrop" onClick={onClose}>
			<div className="modal-card modal-danger" onClick={(e) => e.stopPropagation()}>
				<div className="modal-header">
					<div className="modal-title-with-icon text-danger">
						<AlertTriangleIcon size={18} />
						<h3 className="modal-title">Musnahkan Ruangan (Nuke)?</h3>
					</div>
					<button type="button" className="modal-close-btn" onClick={onClose}>
						<CloseIcon size={18} />
					</button>
				</div>

				<div className="modal-form">
					<p className="danger-alert-text">
						Tindakan ini akan <strong>menghapus seluruh riwayat pesan, berkas, dan catatan bersama</strong> di ruangan <code>#{room}</code> dari SQLite Durable Object seketika tanpa bisa dipulihkan.
					</p>
				</div>

				<div className="modal-footer">
					<button type="button" className="btn-ghost" onClick={onClose}>
						Batalkan
					</button>
					<button
						type="button"
						className="btn-solid-danger"
						onClick={() => {
							onConfirmNuke();
							onClose();
						}}
					>
						Ya, Musnahkan Sekarang 🔥
					</button>
				</div>
			</div>
		</div>
	);
};

// ============================================================================
// 5. Attachment & Real Voice Recorder Modal
// ============================================================================
interface AttachmentModalProps {
	isOpen: boolean;
	onClose: () => void;
	onSendAttachment: (attachment: Attachment, caption?: string) => void;
	onError?: (message: string) => void;
}

export const AttachmentModal: React.FC<AttachmentModalProps> = ({
	isOpen,
	onClose,
	onSendAttachment,
	onError,
}) => {
	const [isLoading, setIsLoading] = useState(false);
	const [isRecording, setIsRecording] = useState(false);
	const [recordTime, setRecordTime] = useState(0);

	const imageInputRef = useRef<HTMLInputElement>(null);
	const fileInputRef = useRef<HTMLInputElement>(null);
	const mediaRecorderRef = useRef<MediaRecorder | null>(null);
	const audioChunksRef = useRef<Blob[]>([]);
	const timerRef = useRef<ReturnType<typeof setInterval> | null>(null);

	if (!isOpen) return null;

	const handleImageSelected = async (e: React.ChangeEvent<HTMLInputElement>) => {
		const files = e.target.files;
		if (!files || files.length === 0) return;
		const file = files[0];

		try {
			setIsLoading(true);
			const { dataUrl, size, name } = await compressImageFile(file);
			onSendAttachment({
				type: "image",
				url: dataUrl,
				name: name || file.name,
				size,
			});
			onClose();
		} catch (err: any) {
			if (onError) onError(err.message || "Gagal memproses gambar");
		} finally {
			setIsLoading(false);
			if (imageInputRef.current) imageInputRef.current.value = "";
		}
	};

	const handleFileSelected = async (e: React.ChangeEvent<HTMLInputElement>) => {
		const files = e.target.files;
		if (!files || files.length === 0) return;
		const file = files[0];

		try {
			setIsLoading(true);
			const { dataUrl, size, name } = await processDocumentFile(file);
			onSendAttachment({
				type: "file",
				url: dataUrl,
				name: name || file.name,
				size,
			});
			onClose();
		} catch (err: any) {
			if (onError) onError(err.message || "Gagal membaca berkas");
		} finally {
			setIsLoading(false);
			if (fileInputRef.current) fileInputRef.current.value = "";
		}
	};

	const startVoiceRecording = async () => {
		try {
			const stream = await navigator.mediaDevices.getUserMedia({ audio: true });
			audioChunksRef.current = [];
			const recorder = new MediaRecorder(stream);

			recorder.ondataavailable = (event) => {
				if (event.data.size > 0) audioChunksRef.current.push(event.data);
			};

			recorder.onstop = () => {
				const audioBlob = new Blob(audioChunksRef.current, { type: "audio/webm" });
				const reader = new FileReader();
				reader.onloadend = () => {
					const dataUrl = reader.result as string;
					const minutes = Math.floor(recordTime / 60);
					const seconds = recordTime % 60;
					const durationFormatted = `${minutes}:${seconds < 10 ? "0" : ""}${seconds}`;

					onSendAttachment({
						type: "audio",
						url: dataUrl,
						name: `Pesan_Suara_${Date.now()}.webm`,
						duration: durationFormatted,
						size: formatBytes(audioBlob.size),
					});
					onClose();
				};
				reader.readAsDataURL(audioBlob);
				stream.getTracks().forEach((track) => track.stop());
			};

			recorder.start();
			mediaRecorderRef.current = recorder;
			setIsRecording(true);
			setRecordTime(0);

			timerRef.current = setInterval(() => {
				setRecordTime((prev) => prev + 1);
			}, 1000);
		} catch (err: any) {
			if (onError) onError("Izin mikrofon diperlukan untuk merekam suara.");
		}
	};

	const stopVoiceRecording = () => {
		if (timerRef.current) clearInterval(timerRef.current);
		if (mediaRecorderRef.current && mediaRecorderRef.current.state === "recording") {
			mediaRecorderRef.current.stop();
		}
		setIsRecording(false);
	};

	return (
		<div className="modal-backdrop" onClick={onClose}>
			<div className="modal-card" onClick={(e) => e.stopPropagation()}>
				<div className="modal-header">
					<h3 className="modal-title">Kirim Lampiran ke Saluran</h3>
					<button type="button" className="modal-close-btn" onClick={onClose}>
						<CloseIcon size={18} />
					</button>
				</div>

				<input
					ref={imageInputRef}
					type="file"
					accept="image/*"
					style={{ display: "none" }}
					onChange={handleImageSelected}
				/>

				<input
					ref={fileInputRef}
					type="file"
					accept=".pdf,.doc,.docx,.xls,.xlsx,.txt,.json,.zip,.csv"
					style={{ display: "none" }}
					onChange={handleFileSelected}
				/>

				{isLoading ? (
					<div className="modal-loading-state">
						<div className="spinner-loader" />
						<p>Mengompresi & Mempersiapkan berkas...</p>
					</div>
				) : isRecording ? (
					<div className="voice-recorder-box">
						<div className="recording-indicator-pulse">
							<MicIcon size={32} />
						</div>
						<div className="recording-timer">
							{Math.floor(recordTime / 60)}:{recordTime % 60 < 10 ? "0" : ""}
							{recordTime % 60}
						</div>
						<p className="recording-hint">Sedang merekam suara dari mikrofon...</p>
						<div className="voice-recorder-actions">
							<button type="button" className="btn-ghost" onClick={() => setIsRecording(false)}>
								Batal
							</button>
							<button
								type="button"
								className="btn-solid-primary send-voice-btn"
								onClick={stopVoiceRecording}
							>
								<CheckIcon size={16} /> Selesai & Kirim
							</button>
						</div>
					</div>
				) : (
					<div className="attachment-options-grid">
						<button
							type="button"
							className="attachment-option-card"
							onClick={() => imageInputRef.current?.click()}
						>
							<div className="option-icon-box image-bg">
								<ImageIcon size={22} />
							</div>
							<div className="option-title">Foto / Galeri</div>
							<div className="option-desc">Kompresi otomatis tanpa kuota storage</div>
						</button>

						<button
							type="button"
							className="attachment-option-card"
							onClick={() => fileInputRef.current?.click()}
						>
							<div className="option-icon-box doc-bg">
								<FileTextIcon size={22} />
							</div>
							<div className="option-title">Dokumen / Berkas</div>
							<div className="option-desc">PDF, ZIP, DOCX, TXT, JSON</div>
						</button>

						<button
							type="button"
							className="attachment-option-card"
							onClick={startVoiceRecording}
						>
							<div className="option-icon-box audio-bg">
								<MicIcon size={22} />
							</div>
							<div className="option-title">Pesan Suara</div>
							<div className="option-desc">Rekam mikrofon dengan timer</div>
						</button>
					</div>
				)}
			</div>
		</div>
	);
};

// ============================================================================
// 6. Lightbox Image Viewer Modal
// ============================================================================
interface ImageViewerModalProps {
	imageUrl: string | null;
	onClose: () => void;
}

export const ImageViewerModal: React.FC<ImageViewerModalProps> = ({
	imageUrl,
	onClose,
}) => {
	if (!imageUrl) return null;

	return (
		<div className="lightbox-backdrop" onClick={onClose}>
			<div className="lightbox-container" onClick={(e) => e.stopPropagation()}>
				{/* Top Header Bar with Actions */}
				<div className="lightbox-header-bar">
					<div className="lightbox-title-info">
						<ImageIcon size={16} />
						<span>Pratinjau Gambar</span>
					</div>
					<div className="lightbox-actions-right">
						<a
							href={imageUrl}
							download="gambar-chat.jpg"
							className="lightbox-action-btn primary"
							title="Unduh Gambar Asli"
						>
							<DownloadIcon size={14} />
							<span>Unduh</span>
						</a>
						<a
							href={imageUrl}
							target="_blank"
							rel="noopener noreferrer"
							className="lightbox-action-btn"
							title="Buka di Tab Baru"
						>
							<ExternalLinkIcon size={14} />
							<span>Tab Baru</span>
						</a>
						<button
							type="button"
							className="lightbox-action-btn close"
							onClick={onClose}
							title="Tutup (Esc)"
							aria-label="Tutup"
						>
							<CloseIcon size={16} />
						</button>
					</div>
				</div>

				<div className="lightbox-image-viewport">
					<img src={imageUrl} alt="Tampilan Penuh" className="lightbox-img" />
				</div>
			</div>
		</div>
	);
};

// ============================================================================
// 7. Keyboard Shortcuts Cheatsheet Modal
// ============================================================================
interface ShortcutsModalProps {
	isOpen: boolean;
	onClose: () => void;
}

export const ShortcutsModal: React.FC<ShortcutsModalProps> = ({
	isOpen,
	onClose,
}) => {
	if (!isOpen) return null;

	const shortcuts = [
		{ key: "Enter", desc: "Kirim pesan" },
		{ key: "Shift + Enter", desc: "Baris baru" },
		{ key: "Ctrl + K / ⌘K", desc: "Pencarian pesan instan" },
		{ key: "Esc Esc", desc: "Mode Samaran / Decoy Screen" },
		{ key: "Ctrl + B", desc: "Format teks tebal (Bold)" },
		{ key: "Ctrl + I", desc: "Format teks miring (Italic)" },
		{ key: "Ctrl + V", desc: "Paste tangkapan layar langsung" },
		{ key: "/ai [prompt]", desc: "Panggil asisten Cloudflare Workers AI" },
		{ key: "/summarize", desc: "Meringkas isi obrolan dengan AI" },
		{ key: "Esc", desc: "Batalkan edit / balasan / tutup dialog" },
	];

	return (
		<div className="modal-backdrop" onClick={onClose}>
			<div className="modal-card" onClick={(e) => e.stopPropagation()}>
				<div className="modal-header">
					<h3 className="modal-title">Pintasan Keyboard & Perintah AI</h3>
					<button type="button" className="modal-close-btn" onClick={onClose}>
						<CloseIcon size={18} />
					</button>
				</div>

				<div className="shortcuts-table">
					{shortcuts.map((s) => (
						<div key={s.key} className="shortcut-row">
							<span className="shortcut-desc">{s.desc}</span>
							<kbd className="shortcut-key">{s.key}</kbd>
						</div>
					))}
				</div>
			</div>
		</div>
	);
};

// ============================================================================
// 8. Search Messages Modal
// ============================================================================
interface SearchModalProps {
	isOpen: boolean;
	onClose: () => void;
	messages: ChatMessage[];
	onJumpToMessage: (messageId: string) => void;
}

export const SearchModal: React.FC<SearchModalProps> = ({
	isOpen,
	onClose,
	messages,
	onJumpToMessage,
}) => {
	const [query, setQuery] = useState("");

	if (!isOpen) return null;

	const results = query.trim()
		? messages.filter((m) =>
				m.content.toLowerCase().includes(query.toLowerCase().trim()),
		  )
		: [];

	return (
		<div className="modal-backdrop" onClick={onClose}>
			<div className="modal-card search-modal-card" onClick={(e) => e.stopPropagation()}>
				<div className="search-input-header">
					<SearchIcon size={20} className="search-icon-field" />
					<input
						type="text"
						className="search-main-input"
						placeholder="Cari pesan di saluran ini (Ketik kata kunci)..."
						value={query}
						onChange={(e) => setQuery(e.target.value)}
						autoFocus
					/>
					<button type="button" className="modal-close-btn" onClick={onClose}>
						<CloseIcon size={18} />
					</button>
				</div>

				<div className="search-results-viewport">
					{query.trim() && (
						<div className="search-results-count">
							Ditemukan {results.length} hasil
						</div>
					)}

					{results.length > 0 ? (
						<div className="search-results-list">
							{results.map((m) => (
								<div
									key={m.id}
									className="search-result-item"
									onClick={() => {
										onJumpToMessage(m.id);
										onClose();
									}}
								>
									<div className="search-item-meta">
										<span className="search-item-user">{m.user}</span>
										<span className="search-item-time">
											{new Date(m.timestamp || Date.now()).toLocaleTimeString([], {
												hour: "2-digit",
												minute: "2-digit",
											})}
										</span>
									</div>
									<div className="search-item-snippet">{m.content}</div>
								</div>
							))}
						</div>
					) : query.trim() ? (
						<div className="search-empty-state">
							Tidak ada pesan yang cocok dengan &quot;{query}&quot;
						</div>
					) : (
						<div className="search-empty-state">
							Ketik sesuatu untuk mencari di seluruh riwayat obrolan
						</div>
					)}
				</div>
			</div>
		</div>
	);
};
