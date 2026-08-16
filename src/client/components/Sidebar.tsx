import React from "react";
import {
	CloudflareIcon,
	HashIcon,
	PlusIcon,
	EditIcon,
	DatabaseIcon,
	ShieldCheckIcon,
	CloseIcon,
	KeyboardIcon,
} from "./Icons";
import type { UserProfile, RoomInfo } from "../types";
import { getAvatarColor, getInitial } from "../utils/helpers";

interface SidebarProps {
	isOpen: boolean;
	onClose: () => void;
	activeRoom: string;
	onSelectRoom: (roomId: string) => void;
	userProfile: UserProfile;
	onOpenProfileModal: () => void;
	onOpenNewRoomModal: () => void;
	onOpenShortcuts: () => void;
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
	rooms,
}) => {
	const avatarStyle = {
		backgroundColor: userProfile.avatarColor || getAvatarColor(userProfile.name).bg,
		color: "#FFFFFF",
	};

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
							<div className="brand-title">Durable Chat</div>
							<div className="brand-sub">Cloudflare Workers • DO</div>
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
								{userProfile.statusMessage || "Online di Edge"}
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

				{/* Rooms & Channels List */}
				<div className="sidebar-section-container">
					<div className="sidebar-section-header">
						<span className="section-label">SALURAN & RUANGAN</span>
						<button
							type="button"
							className="create-room-btn"
							onClick={onOpenNewRoomModal}
							title="Buat Ruangan Baru"
						>
							<PlusIcon size={15} />
							<span>Ruangan Baru</span>
						</button>
					</div>

					<nav className="room-nav-list" aria-label="Daftar Ruangan">
						{rooms.map((r) => {
							const isActive = r.id === activeRoom;
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
										<HashIcon size={16} />
									</div>
									<div className="room-nav-label-box">
										<span className="room-nav-name">{r.name || r.id}</span>
										{r.topic && <span className="room-nav-topic">{r.topic}</span>}
									</div>
									{isActive && <div className="room-active-indicator" />}
								</button>
							);
						})}
					</nav>
				</div>

				{/* Edge Storage & Architecture Status Info */}
				<div className="sidebar-footer">
					<div className="edge-storage-card">
						<div className="storage-card-header">
							<DatabaseIcon size={15} />
							<span>Durable Objects SQLite</span>
						</div>
						<p className="storage-card-desc">
							Pesan disinkronkan langsung via WebSocket dan tersimpan terisolasi di database SQLite edge regional.
						</p>
						<div className="storage-features">
							<span className="feature-tag">
								<ShieldCheckIcon size={12} /> Sub-ms Sync
							</span>
							<span className="feature-tag">Hibernated DO</span>
						</div>
					</div>

					<button
						type="button"
						className="sidebar-shortcuts-link"
						onClick={onOpenShortcuts}
					>
						<KeyboardIcon size={15} />
						<span>Pintasan Keyboard</span>
						<span className="kbd-badge">?</span>
					</button>
				</div>
			</aside>
		</>
	);
};
