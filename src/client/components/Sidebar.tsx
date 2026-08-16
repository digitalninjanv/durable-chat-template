import React, { useState } from "react";
import {
	CloudflareIcon,
	HashIcon,
	PlusIcon,
	EditIcon,
	DatabaseIcon,
	ShieldCheckIcon,
	CloseIcon,
	KeyboardIcon,
	LockIcon,
	UsersIcon,
	TerminalIcon,
	AlertTriangleIcon,
} from "./Icons";
import type { UserProfile, RoomInfo, RoomCategory } from "../types";
import { getAvatarColor, getInitial } from "../utils/helpers";

interface SidebarProps {
	isOpen: boolean;
	onClose: () => void;
	activeRoom: string;
	onSelectRoom: (roomId: string) => void;
	userProfile: UserProfile;
	onOpenProfileModal: () => void;
	onOpenNewRoomModal: (category?: RoomCategory) => void;
	onOpenShortcuts: () => void;
	onTriggerDecoy: () => void;
	onTriggerNuke: () => void;
	rooms: RoomInfo[];
}

export const Sidebar: React.FC<SidebarProps> = ({
	isOpen,
	onClose,
	activeRoom,
	onSelectRoom,
	userProfile,
	onOpenProfileModal,
	onOpenNewRoomModal,
	onOpenShortcuts,
	onTriggerDecoy,
	onTriggerNuke,
	rooms,
}) => {
	const [activeCategory, setActiveCategory] = useState<RoomCategory>("public");

	const avatarStyle = {
		backgroundColor: userProfile.avatarColor || getAvatarColor(userProfile.name).bg,
		color: "#FFFFFF",
	};

	const filteredRooms = rooms.filter((r) => {
		if (activeCategory === "private") return r.type === "private" || r.e2eeEnabled;
		if (activeCategory === "direct") return r.type === "direct" || r.id.startsWith("dm-");
		return r.type !== "private" && r.type !== "direct" && !r.id.startsWith("dm-");
	});

	return (
		<>
			{/* Mobile Backdrop Overlay */}
			<div
				className={`sidebar-backdrop ${isOpen ? "open" : ""}`}
				onClick={onClose}
				aria-hidden="true"
			/>

			<aside className={`app-sidebar ${isOpen ? "open" : ""}`}>
				{/* Top App Branding */}
				<div className="sidebar-brand-header">
					<div className="brand-badge-container">
						<div className="brand-logo-icon">
							<CloudflareIcon size={20} />
						</div>
						<div className="brand-text-block">
							<div className="brand-title">Durable Edge</div>
							<div className="brand-sub">Cloudflare DO • Zero-Log</div>
						</div>
					</div>

					<button
						type="button"
						className="sidebar-close-mobile-btn"
						onClick={onClose}
						aria-label="Tutup Menu"
					>
						<CloseIcon size={18} />
					</button>
				</div>

				{/* User Profile Bar */}
				<div className="sidebar-user-card">
					<div className="user-profile-meta" onClick={onOpenProfileModal}>
						<div className="user-avatar-badge" style={avatarStyle}>
							{getInitial(userProfile.name)}
							<span className="user-online-pip" />
						</div>
						<div className="user-text-info">
							<div className="user-display-name">{userProfile.name}</div>
							<div className="user-presence-tag">
								{userProfile.statusMessage || "Anonim • Online di Edge"}
							</div>
						</div>
					</div>

					<button
						type="button"
						className="user-edit-btn"
						onClick={onOpenProfileModal}
						title="Edit Profil & Avatar"
						aria-label="Edit Profil"
					>
						<EditIcon size={16} />
					</button>
				</div>

				{/* Room Categories Tab Switcher */}
				<div className="sidebar-category-nav">
					<button
						type="button"
						className={`category-tab-btn ${activeCategory === "public" ? "active" : ""}`}
						onClick={() => setActiveCategory("public")}
						title="Saluran Publik"
					>
						<HashIcon size={14} />
						<span>Publik</span>
					</button>
					<button
						type="button"
						className={`category-tab-btn ${activeCategory === "private" ? "active" : ""}`}
						onClick={() => setActiveCategory("private")}
						title="Ruang Privat Terkunci E2EE"
					>
						<LockIcon size={13} />
						<span>Privat E2EE</span>
					</button>
					<button
						type="button"
						className={`category-tab-btn ${activeCategory === "direct" ? "active" : ""}`}
						onClick={() => setActiveCategory("direct")}
						title="Pesan Langsung (DM)"
					>
						<UsersIcon size={14} />
						<span>DM</span>
					</button>
				</div>

				{/* Rooms & Channels List */}
				<div className="sidebar-section-container">
					<div className="sidebar-section-header">
						<span className="section-label">
							{activeCategory === "public"
								? "SALURAN PUBLIK"
								: activeCategory === "private"
								? "RUANGAN PRIVAT (E2EE)"
								: "PESAN LANGSUNG (DM)"}
						</span>
						<button
							type="button"
							className="create-room-btn"
							onClick={() => onOpenNewRoomModal(activeCategory)}
							title={
								activeCategory === "public"
									? "Buat Saluran Publik"
									: activeCategory === "private"
									? "Buat Ruang Terkunci E2EE"
									: "Mulai Chat Langsung"
							}
						>
							<PlusIcon size={14} />
							<span>Baru</span>
						</button>
					</div>

					<nav className="room-nav-list" aria-label="Daftar Ruangan">
						{filteredRooms.length === 0 ? (
							<div className="sidebar-empty-hint">
								{activeCategory === "private"
									? "Belum ada ruangan terkunci. Buat ruang E2EE baru."
									: activeCategory === "direct"
									? "Belum ada pesan langsung. Mulai chat baru."
									: "Belum ada saluran."}
							</div>
						) : (
							filteredRooms.map((r) => {
								const isActive = r.id === activeRoom;
								const isPrivateRoom = r.type === "private" || r.e2eeEnabled;
								const isDirectChat = r.type === "direct" || r.id.startsWith("dm-");

								return (
									<button
										key={r.id}
										type="button"
										className={`room-nav-item ${isActive ? "active" : ""}`}
										onClick={() => {
											onSelectRoom(r.id);
											onClose();
										}}
									>
										<div className="room-nav-icon">
											{isPrivateRoom ? (
												<LockIcon size={14} />
											) : isDirectChat ? (
												<UsersIcon size={15} />
											) : (
												<HashIcon size={15} />
											)}
										</div>
										<div className="room-nav-label-box">
											<span className="room-nav-name">{r.name || r.id}</span>
											{r.topic && <span className="room-nav-topic">{r.topic}</span>}
										</div>
										{isActive && <div className="room-active-indicator" />}
									</button>
								);
							})
						)}
					</nav>
				</div>

				{/* Quick Stealth & Nuke Actions */}
				<div className="sidebar-stealth-bar">
					<button
						type="button"
						className="stealth-action-pill"
						onClick={onTriggerDecoy}
						title="Mode Samaran Terminal (Esc Esc)"
					>
						<TerminalIcon size={14} />
						<span>Samaran Terminal</span>
					</button>

					<button
						type="button"
						className="stealth-action-pill danger"
						onClick={onTriggerNuke}
						title="Hapus Bersih Riwayat Ruangan (Nuke)"
					>
						<AlertTriangleIcon size={14} />
						<span>Nuke Room</span>
					</button>
				</div>

				{/* Edge Storage & Architecture Status Info */}
				<div className="sidebar-footer">
					<div className="edge-storage-card">
						<div className="storage-card-header">
							<DatabaseIcon size={14} />
							<span>Durable Objects SQLite (2026)</span>
						</div>
						<p className="storage-card-desc">
							Sinkronisasi ACID di edge regional tanpa sentral server. End-to-End Encryption & Ephemeral TTL siap pakai.
						</p>
						<div className="storage-features">
							<span className="feature-tag">
								<ShieldCheckIcon size={12} /> WebCrypto E2EE
							</span>
							<span className="feature-tag">Workers AI Ready</span>
						</div>
					</div>

					<button
						type="button"
						className="sidebar-shortcuts-link"
						onClick={onOpenShortcuts}
					>
						<KeyboardIcon size={14} />
						<span>Pintasan Keyboard</span>
						<span className="kbd-badge">?</span>
					</button>
				</div>
			</aside>
		</>
	);
};
