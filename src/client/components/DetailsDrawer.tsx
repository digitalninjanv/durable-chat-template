import React, { useState, useMemo } from "react";
import type { ChatMessage, Attachment } from "../types";
import {
	CloseIcon,
	DownloadIcon,
	ShareIcon,
	PinIcon,
	ImageIcon,
	FileTextIcon,
	UsersIcon,
	DatabaseIcon,
	CheckIcon,
} from "./Icons";
import {
	exportChatHistory,
	formatMessageTime,
	getAvatarColor,
	getInitial,
} from "../utils/helpers";

interface DetailsDrawerProps {
	isOpen: boolean;
	onClose: () => void;
	room: string;
	messages: ChatMessage[];
	currentUserName: string;
	onJumpToMessage: (id: string) => void;
	onTogglePin: (message: ChatMessage) => void;
	onImageClick: (url: string) => void;
	onCopyLink: () => void;
	linkCopied: boolean;
}

type TabType = "overview" | "media" | "pinned" | "members";

export const DetailsDrawer: React.FC<DetailsDrawerProps> = ({
	isOpen,
	onClose,
	room,
	messages,
	currentUserName,
	onJumpToMessage,
	onTogglePin,
	onImageClick,
	onCopyLink,
	linkCopied,
}) => {
	const [activeTab, setActiveTab] = useState<TabType>("overview");

	// Pinned messages list
	const pinnedMessages = useMemo(() => {
		return messages.filter((m) => m.pinned);
	}, [messages]);

	// Media & Attachments
	const mediaItems = useMemo(() => {
		const list: { msgId: string; user: string; attachment: Attachment }[] = [];
		messages.forEach((m) => {
			if (m.attachment) {
				list.push({ msgId: m.id, user: m.user, attachment: m.attachment });
			}
		});
		return list;
	}, [messages]);

	// Unique members in history
	const uniqueMembers = useMemo(() => {
		const set = new Set<string>();
		set.add(currentUserName);
		messages.forEach((m) => {
			if (m.user) set.add(m.user);
		});
		return Array.from(set);
	}, [messages, currentUserName]);

	if (!isOpen) return null;

	return (
		<aside className="details-drawer-panel" aria-label="Panel Detail Ruangan">
			{/* Drawer Header */}
			<div className="drawer-header-row">
				<div className="drawer-title-box">
					<h2 className="drawer-title">Info Ruangan</h2>
					<span className="drawer-subtitle">#{room}</span>
				</div>
				<button
					type="button"
					className="drawer-close-btn"
					onClick={onClose}
					aria-label="Tutup Panel"
				>
					<CloseIcon size={18} />
				</button>
			</div>

			{/* Navigation Tabs */}
			<div className="drawer-tabs-row" role="tablist">
				<button
					type="button"
					role="tab"
					aria-selected={activeTab === "overview"}
					className={`drawer-tab-btn ${activeTab === "overview" ? "active" : ""}`}
					onClick={() => setActiveTab("overview")}
				>
					Ikhtisar
				</button>
				<button
					type="button"
					role="tab"
					aria-selected={activeTab === "media"}
					className={`drawer-tab-btn ${activeTab === "media" ? "active" : ""}`}
					onClick={() => setActiveTab("media")}
				>
					Media ({mediaItems.length})
				</button>
				<button
					type="button"
					role="tab"
					aria-selected={activeTab === "pinned"}
					className={`drawer-tab-btn ${activeTab === "pinned" ? "active" : ""}`}
					onClick={() => setActiveTab("pinned")}
				>
					Sematan ({pinnedMessages.length})
				</button>
				<button
					type="button"
					role="tab"
					aria-selected={activeTab === "members"}
					className={`drawer-tab-btn ${activeTab === "members" ? "active" : ""}`}
					onClick={() => setActiveTab("members")}
				>
					Anggota ({uniqueMembers.length})
				</button>
			</div>

			{/* Drawer Tab Contents */}
			<div className="drawer-content-scroll">
				{activeTab === "overview" && (
					<div className="drawer-tab-pane">
						{/* Room Summary Box */}
						<div className="drawer-info-card">
							<div className="card-row">
								<span className="card-label">Nama Ruangan</span>
								<span className="card-value font-mono">#{room}</span>
							</div>
							<div className="card-row">
								<span className="card-label">Total Pesan</span>
								<span className="card-value">{messages.length}</span>
							</div>
							<div className="card-row">
								<span className="card-label">Penyimpanan Edge</span>
								<span className="card-value">Cloudflare DO SQLite</span>
							</div>
						</div>

						{/* Quick Actions */}
						<div className="drawer-actions-block">
							<button
								type="button"
								className="drawer-action-btn"
								onClick={onCopyLink}
							>
								{linkCopied ? <CheckIcon size={16} /> : <ShareIcon size={16} />}
								<span>{linkCopied ? "Tautan Berhasil Disalin!" : "Salin Tautan Ruangan"}</span>
							</button>

							<button
								type="button"
								className="drawer-action-btn secondary"
								onClick={() => exportChatHistory(room, messages, "txt")}
							>
								<DownloadIcon size={16} />
								<span>Ekspor Percakapan (.txt)</span>
							</button>

							<button
								type="button"
								className="drawer-action-btn secondary"
								onClick={() => exportChatHistory(room, messages, "json")}
							>
								<DownloadIcon size={16} />
								<span>Ekspor Data Mentah (.json)</span>
							</button>
						</div>

						{/* Edge Technology Explainer */}
						<div className="edge-spec-note">
							<DatabaseIcon size={16} className="spec-icon" />
							<div>
								<strong>Durable Object Isolation:</strong>
								<p>
									Setiap ruangan memiliki instans Durable Object independen yang berjalan di jaringan Cloudflare global, memastikan konsistensi ACID dan latensi rendah.
								</p>
							</div>
						</div>
					</div>
				)}

				{activeTab === "media" && (
					<div className="drawer-tab-pane">
						{mediaItems.length === 0 ? (
							<div className="drawer-empty-state">
								<ImageIcon size={32} />
								<p>Belum ada media atau berkas yang dibagikan di ruangan ini.</p>
							</div>
						) : (
							<div className="drawer-media-section">
								<div className="media-thumbnail-grid">
									{mediaItems
										.filter((it) => it.attachment.type === "image")
										.map((it) => (
											<div
												key={it.msgId}
												className="media-thumbnail-card"
												onClick={() => onImageClick(it.attachment.url)}
											>
												<img
													src={it.attachment.url}
													alt={it.attachment.name}
													loading="lazy"
												/>
											</div>
										))}
								</div>

								{/* Files list */}
								<div className="files-list-section">
									{mediaItems
										.filter((it) => it.attachment.type !== "image")
										.map((it) => (
											<div key={it.msgId} className="drawer-file-item">
												<div className="file-item-icon">
													<FileTextIcon size={18} />
												</div>
												<div className="file-item-info">
													<div className="file-item-name">{it.attachment.name}</div>
													<div className="file-item-meta">
														{it.attachment.size || "Berkas"} • oleh {it.user}
													</div>
												</div>
											</div>
										))}
								</div>
							</div>
						)}
					</div>
				)}

				{activeTab === "pinned" && (
					<div className="drawer-tab-pane">
						{pinnedMessages.length === 0 ? (
							<div className="drawer-empty-state">
								<PinIcon size={32} />
								<p>Belum ada pesan yang disematkan di ruangan ini.</p>
							</div>
						) : (
							<div className="pinned-items-list">
								{pinnedMessages.map((msg) => (
									<div key={msg.id} className="pinned-drawer-card">
										<div className="pinned-card-header">
											<span className="pinned-author">{msg.user}</span>
											<time className="pinned-time">
												{formatMessageTime(msg.timestamp)}
											</time>
										</div>
										<p
											className="pinned-card-content"
											onClick={() => onJumpToMessage(msg.id)}
											role="button"
											tabIndex={0}
										>
											{msg.content}
										</p>
										<div className="pinned-card-footer">
											<button
												type="button"
												className="pinned-jump-btn"
												onClick={() => onJumpToMessage(msg.id)}
											>
												Lompat ke pesan
											</button>
											<button
												type="button"
												className="pinned-unpin-btn"
												onClick={() => onTogglePin(msg)}
												title="Lepas Sematan"
											>
												Lepas
											</button>
										</div>
									</div>
								))}
							</div>
						)}
					</div>
				)}

				{activeTab === "members" && (
					<div className="drawer-tab-pane">
						<div className="members-list-view">
							{uniqueMembers.map((member) => {
								const isSelf = member === currentUserName;
								const style = {
									backgroundColor: getAvatarColor(member).bg,
									color: "#FFFFFF",
								};

								return (
									<div key={member} className="member-row-item">
										<div className="member-avatar" style={style}>
											{getInitial(member)}
											<span className="online-dot" />
										</div>
										<div className="member-details">
											<div className="member-name">
												{member}
												{isSelf && <span className="self-tag">Anda</span>}
											</div>
											<div className="member-role">
												{isSelf ? "Pengguna Aktif" : "Peserta Ruangan"}
											</div>
										</div>
									</div>
								);
							})}
						</div>
					</div>
				)}
			</div>
		</aside>
	);
};
