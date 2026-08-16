import React, { useState } from "react";
import type { UserProfile, ChatMessage } from "../types";
import { AVATAR_PALETTES, getInitial } from "../utils/helpers";
import {
	CloseIcon,
	ImageIcon,
	FileTextIcon,
	MicIcon,
	SearchIcon,
	CheckIcon,
	CodeIcon,
} from "./Icons";

// -------------------------------------------------------------
// Profile Modal
// -------------------------------------------------------------
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
	const [avatarColor, setAvatarColor] = useState(profile.avatarColor);
	const [statusMessage, setStatusMessage] = useState(profile.statusMessage || "");

	if (!isOpen) return null;

	const handleSubmit = (e: React.FormEvent) => {
		e.preventDefault();
		const trimmed = name.trim();
		if (!trimmed) return;
		onSave({
			...profile,
			name: trimmed,
			avatarColor,
			statusMessage: statusMessage.trim() || undefined,
		});
		onClose();
	};

	return (
		<div className="modal-backdrop" onClick={onClose}>
			<div className="modal-card" onClick={(e) => e.stopPropagation()} role="dialog" aria-modal="true">
				<div className="modal-header">
					<h3 className="modal-title">Pengaturan Profil Pengguna</h3>
					<button type="button" className="modal-close-btn" onClick={onClose} aria-label="Tutup">
						<CloseIcon size={18} />
					</button>
				</div>

				<form onSubmit={handleSubmit} className="modal-form">
					{/* Avatar Preview */}
					<div className="avatar-preview-section">
						<div className="avatar-large" style={{ backgroundColor: avatarColor, color: "#FFFFFF" }}>
							{getInitial(name || "U")}
						</div>
						<div className="avatar-color-options">
							<span className="field-label">Pilih Warna Avatar:</span>
							<div className="color-swatches-grid">
								{AVATAR_PALETTES.map((p) => (
									<button
										key={p.bg}
										type="button"
										className={`swatch-btn ${avatarColor === p.bg ? "selected" : ""}`}
										style={{ backgroundColor: p.bg }}
										onClick={() => setAvatarColor(p.bg)}
										title={p.name}
									>
										{avatarColor === p.bg && <CheckIcon size={14} />}
									</button>
								))}
							</div>
						</div>
					</div>

					<div className="form-group">
						<label className="field-label" htmlFor="profile-name">Nama Tampilan</label>
						<input
							id="profile-name"
							type="text"
							className="text-input"
							value={name}
							onChange={(e) => setName(e.target.value)}
							placeholder="Masukkan nama..."
							required
							maxLength={32}
						/>
					</div>

					<div className="form-group">
						<label className="field-label" htmlFor="profile-status">Status / Bio Singkat</label>
						<input
							id="profile-status"
							type="text"
							className="text-input"
							value={statusMessage}
							onChange={(e) => setStatusMessage(e.target.value)}
							placeholder="Contoh: Frontend Engineer • Cloudflare Edge"
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

// -------------------------------------------------------------
// New Room Modal
// -------------------------------------------------------------
interface NewRoomModalProps {
	isOpen: boolean;
	onClose: () => void;
	onCreateRoom: (roomId: string, name?: string, topic?: string) => void;
}

const ROOM_SUGGESTIONS = [
	{ id: "frontend-dev", name: "frontend-dev", topic: "Pengembangan antarmuka & UI" },
	{ id: "edge-infra", name: "edge-infra", topic: "Worker routings & KV caching" },
	{ id: "ai-experiments", name: "ai-experiments", topic: "Eksperimen model & prompt engineering" },
];

export const NewRoomModal: React.FC<NewRoomModalProps> = ({
	isOpen,
	onClose,
	onCreateRoom,
}) => {
	const [roomSlug, setRoomSlug] = useState("");
	const [topic, setTopic] = useState("");

	if (!isOpen) return null;

	const handleFormSubmit = (e: React.FormEvent) => {
		e.preventDefault();
		const cleanSlug = roomSlug.trim().toLowerCase().replace(/[^a-z0-9-_]/g, "-");
		if (!cleanSlug) return;
		onCreateRoom(cleanSlug, cleanSlug, topic.trim() || undefined);
		onClose();
	};

	return (
		<div className="modal-backdrop" onClick={onClose}>
			<div className="modal-card" onClick={(e) => e.stopPropagation()} role="dialog" aria-modal="true">
				<div className="modal-header">
					<h3 className="modal-title">Buat atau Gabung Ruangan</h3>
					<button type="button" className="modal-close-btn" onClick={onClose} aria-label="Tutup">
						<CloseIcon size={18} />
					</button>
				</div>

				<form onSubmit={handleFormSubmit} className="modal-form">
					<div className="form-group">
						<label className="field-label" htmlFor="room-name">Nama / ID Ruangan (Slug)</label>
						<div className="slug-input-wrapper">
							<span className="slug-prefix">#</span>
							<input
								id="room-name"
								type="text"
								className="text-input slug-input"
								value={roomSlug}
								onChange={(e) => setRoomSlug(e.target.value)}
								placeholder="contoh: project-titan"
								required
								autoFocus
							/>
						</div>
						<span className="field-hint">Hanya huruf kecil, angka, dan tanda hubung (-).</span>
					</div>

					<div className="form-group">
						<label className="field-label" htmlFor="room-topic">Topik Percakapan (Opsional)</label>
						<input
							id="room-topic"
							type="text"
							className="text-input"
							value={topic}
							onChange={(e) => setTopic(e.target.value)}
							placeholder="Topik diskusi atau deskripsi tim..."
							maxLength={80}
						/>
					</div>

					<div className="suggestions-box">
						<span className="field-label">Rekomendasi Saluran Populer:</span>
						<div className="suggestions-chips">
							{ROOM_SUGGESTIONS.map((s) => (
								<button
									key={s.id}
									type="button"
									className="suggestion-chip"
									onClick={() => {
										onCreateRoom(s.id, s.name, s.topic);
										onClose();
									}}
								>
									#{s.name}
								</button>
							))}
						</div>
					</div>

					<div className="modal-footer">
						<button type="button" className="btn-ghost" onClick={onClose}>
							Batal
						</button>
						<button type="submit" className="btn-solid-primary">
							Buka Ruangan
						</button>
					</div>
				</form>
			</div>
		</div>
	);
};

// -------------------------------------------------------------
// Attachment Modal
// -------------------------------------------------------------
interface AttachmentModalProps {
	isOpen: boolean;
	onClose: () => void;
	onSendAttachment: (type: "image" | "file" | "audio") => void;
}

export const AttachmentModal: React.FC<AttachmentModalProps> = ({
	isOpen,
	onClose,
	onSendAttachment,
}) => {
	if (!isOpen) return null;

	return (
		<div className="modal-backdrop" onClick={onClose}>
			<div className="modal-card" onClick={(e) => e.stopPropagation()} role="dialog" aria-modal="true">
				<div className="modal-header">
					<h3 className="modal-title">Kirim Lampiran</h3>
					<button type="button" className="modal-close-btn" onClick={onClose} aria-label="Tutup">
						<CloseIcon size={18} />
					</button>
				</div>

				<div className="attachment-options-grid">
					<button
						type="button"
						className="attachment-option-card"
						onClick={() => onSendAttachment("image")}
					>
						<div className="option-icon-box image-bg">
							<ImageIcon size={26} />
						</div>
						<div className="option-title">Foto & Gambar</div>
						<div className="option-desc">Kirim tangkapan layar atau gambar arsitektur</div>
					</button>

					<button
						type="button"
						className="attachment-option-card"
						onClick={() => onSendAttachment("file")}
					>
						<div className="option-icon-box doc-bg">
							<FileTextIcon size={26} />
						</div>
						<div className="option-title">Dokumen & Berkas</div>
						<div className="option-desc">PDF, JSON schema, spek API, atau lembar kerja</div>
					</button>

					<button
						type="button"
						className="attachment-option-card"
						onClick={() => onSendAttachment("audio")}
					>
						<div className="option-icon-box audio-bg">
							<MicIcon size={26} />
						</div>
						<div className="option-title">Pesan Suara</div>
						<div className="option-desc">Rekaman audio singkat dengan visual waveform</div>
					</button>
				</div>

				<div className="modal-footer">
					<button type="button" className="btn-ghost" onClick={onClose}>
						Batal
					</button>
				</div>
			</div>
		</div>
	);
};

// -------------------------------------------------------------
// Image Viewer Modal
// -------------------------------------------------------------
interface ImageViewerModalProps {
	imageUrl: string | null;
	onClose: () => void;
}

export const ImageViewerModal: React.FC<ImageViewerModalProps> = ({ imageUrl, onClose }) => {
	if (!imageUrl) return null;

	return (
		<div className="lightbox-backdrop" onClick={onClose}>
			<div className="lightbox-container" onClick={(e) => e.stopPropagation()}>
				<button type="button" className="lightbox-close-btn" onClick={onClose} aria-label="Tutup Tampilan">
					<CloseIcon size={22} />
				</button>
				<img src={imageUrl} alt="Pratinjau Gambar" className="lightbox-img" />
			</div>
		</div>
	);
};

// -------------------------------------------------------------
// Shortcuts Cheatsheet Modal
// -------------------------------------------------------------
interface ShortcutsModalProps {
	isOpen: boolean;
	onClose: () => void;
}

export const ShortcutsModal: React.FC<ShortcutsModalProps> = ({ isOpen, onClose }) => {
	if (!isOpen) return null;

	const shortcuts = [
		{ key: "Enter", desc: "Kirim pesan" },
		{ key: "Shift + Enter", desc: "Baris baru pada pesan" },
		{ key: "Ctrl + K / ⌘K", desc: "Buka pencarian pesan" },
		{ key: "Ctrl + B / ⌘B", desc: "Format teks tebal (**teks**)" },
		{ key: "Ctrl + I / ⌘I", desc: "Format teks miring (*teks*)" },
		{ key: "Esc", desc: "Tutup dialog / Batalkan balasan / mode edit" },
		{ key: "?", desc: "Buka bantuan pintasan keyboard ini" },
	];

	return (
		<div className="modal-backdrop" onClick={onClose}>
			<div className="modal-card" onClick={(e) => e.stopPropagation()} role="dialog" aria-modal="true">
				<div className="modal-header">
					<h3 className="modal-title">Pintasan Keyboard</h3>
					<button type="button" className="modal-close-btn" onClick={onClose} aria-label="Tutup">
						<CloseIcon size={18} />
					</button>
				</div>

				<div className="shortcuts-table">
					{shortcuts.map((s, idx) => (
						<div key={idx} className="shortcut-row">
							<span className="shortcut-desc">{s.desc}</span>
							<kbd className="shortcut-key">{s.key}</kbd>
						</div>
					))}
				</div>

				<div className="modal-footer">
					<button type="button" className="btn-solid-primary" onClick={onClose}>
						Mengerti
					</button>
				</div>
			</div>
		</div>
	);
};

// -------------------------------------------------------------
// Search Messages Modal
// -------------------------------------------------------------
interface SearchModalProps {
	isOpen: boolean;
	onClose: () => void;
	messages: ChatMessage[];
	onJumpToMessage: (id: string) => void;
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
		? messages.filter(
				(m) =>
					m.content.toLowerCase().includes(query.toLowerCase()) ||
					m.user.toLowerCase().includes(query.toLowerCase()),
		  )
		: [];

	return (
		<div className="modal-backdrop" onClick={onClose}>
			<div className="modal-card search-modal-card" onClick={(e) => e.stopPropagation()} role="dialog" aria-modal="true">
				<div className="search-input-header">
					<SearchIcon size={20} className="search-icon-field" />
					<input
						type="text"
						className="search-main-input"
						placeholder="Ketik kata kunci untuk mencari di percakapan..."
						value={query}
						onChange={(e) => setQuery(e.target.value)}
						autoFocus
					/>
					<button type="button" className="modal-close-btn" onClick={onClose} aria-label="Tutup">
						<CloseIcon size={18} />
					</button>
				</div>

				<div className="search-results-viewport">
					{query.trim() === "" ? (
						<div className="search-empty-state">
							<p>Cari pesan berdasarkan teks percakapan atau nama pengirim.</p>
						</div>
					) : results.length === 0 ? (
						<div className="search-empty-state">
							<p>Tidak ditemukan pesan yang cocok dengan "<strong>{query}</strong>"</p>
						</div>
					) : (
						<div className="search-results-list">
							<div className="search-results-count">Ditemukan {results.length} pesan</div>
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
										<time className="search-item-time">
											{m.timestamp ? new Date(m.timestamp).toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" }) : ""}
										</time>
									</div>
									<div className="search-item-snippet">{m.content}</div>
								</div>
							))}
						</div>
					)}
				</div>
			</div>
		</div>
	);
};
