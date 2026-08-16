import React from "react";
import {
	MenuIcon,
	HashIcon,
	CopyIcon,
	SearchIcon,
	PinIcon,
	SunIcon,
	MoonIcon,
	InfoIcon,
	KeyboardIcon,
	CheckIcon,
} from "./Icons";
import type { EdgeConnectionStats } from "../types";

interface HeaderProps {
	room: string;
	onToggleSidebar: () => void;
	onToggleDetails: () => void;
	detailsOpen: boolean;
	onOpenSearch: () => void;
	onOpenShortcuts: () => void;
	theme: "dark" | "light";
	onToggleTheme: () => void;
	pinnedCount: number;
	onTogglePinnedOnly?: () => void;
	isShowingPinnedOnly?: boolean;
	typingText: string | null;
	connectionStats: EdgeConnectionStats;
	onCopyLink: () => void;
	linkCopied: boolean;
}

export const Header: React.FC<HeaderProps> = ({
	room,
	onToggleSidebar,
	onToggleDetails,
	detailsOpen,
	onOpenSearch,
	onOpenShortcuts,
	theme,
	onToggleTheme,
	pinnedCount,
	onTogglePinnedOnly,
	isShowingPinnedOnly,
	typingText,
	connectionStats,
	onCopyLink,
	linkCopied,
}) => {
	return (
		<header className="app-header">
			<div className="header-left">
				<button
					type="button"
					className="header-btn-icon sidebar-toggle-btn"
					onClick={onToggleSidebar}
					aria-label="Buka Navigasi"
					title="Buka Navigasi"
				>
					<MenuIcon size={20} />
				</button>

				<div className="channel-info-block">
					<div className="channel-title-row">
						<div className="channel-icon-pill">
							<HashIcon size={16} />
						</div>
						<h1 className="channel-title">
							{room}
						</h1>
						<button
							type="button"
							className={`channel-copy-btn ${linkCopied ? "copied" : ""}`}
							onClick={onCopyLink}
							title="Salin tautan ruangan"
						>
							{linkCopied ? <CheckIcon size={14} /> : <CopyIcon size={14} />}
							<span className="channel-copy-label">
								{linkCopied ? "Tersalin!" : "Salin Link"}
							</span>
						</button>
					</div>

					<div className="channel-meta-row">
						<div className="edge-status-pill">
							<span className={`status-dot dot-${connectionStats.status}`} />
							<span className="status-label">
								{connectionStats.status === "connected"
									? `Edge DO (${connectionStats.region || "Global"}) • ${connectionStats.latencyMs || 16}ms`
									: connectionStats.status === "reconnecting"
									? "Menyambung ulang..."
									: "Menghubungkan"}
							</span>
						</div>

						{typingText && (
							<div className="header-typing-pill">
								<span className="typing-pulse" />
								<span className="typing-text">{typingText}</span>
							</div>
						)}
					</div>
				</div>
			</div>

			<div className="header-right">
				{/* Quick Search Button */}
				<button
					type="button"
					className="header-btn-icon search-trigger-btn"
					onClick={onOpenSearch}
					title="Cari percakapan (Ctrl+K)"
				>
					<SearchIcon size={18} />
					<span className="kbd-badge">⌘K</span>
				</button>

				{/* Pinned Messages Filter Toggle */}
				{pinnedCount > 0 && onTogglePinnedOnly && (
					<button
						type="button"
						className={`header-btn-icon ${isShowingPinnedOnly ? "active" : ""}`}
						onClick={onTogglePinnedOnly}
						title={isShowingPinnedOnly ? "Tampilkan semua pesan" : "Filter pesan disematkan"}
					>
						<PinIcon size={18} />
						<span className="badge-count">{pinnedCount}</span>
					</button>
				)}

				{/* Theme Switcher */}
				<button
					type="button"
					className="header-btn-icon"
					onClick={onToggleTheme}
					title={theme === "dark" ? "Ganti ke Tema Terang" : "Ganti ke Tema Gelap"}
					aria-label="Ganti Tema"
				>
					{theme === "dark" ? <SunIcon size={18} /> : <MoonIcon size={18} />}
				</button>

				{/* Keyboard Shortcuts */}
				<button
					type="button"
					className="header-btn-icon desktop-only"
					onClick={onOpenShortcuts}
					title="Pintasan Keyboard (?)"
					aria-label="Pintasan Keyboard"
				>
					<KeyboardIcon size={18} />
				</button>

				{/* Details Panel Toggle */}
				<button
					type="button"
					className={`header-btn-icon ${detailsOpen ? "active" : ""}`}
					onClick={onToggleDetails}
					title="Informasi & Anggota Ruangan"
					aria-label="Informasi Ruangan"
				>
					<InfoIcon size={18} />
				</button>
			</div>
		</header>
	);
};
