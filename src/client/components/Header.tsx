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
	LockIcon,
	UnlockIcon,
	TerminalIcon,
	AlertTriangleIcon,
	FileCodeIcon,
	BotIcon,
} from "./Icons";
import type { EdgeConnectionStats } from "../types";

interface HeaderProps {
	room: string;
	onToggleSidebar: () => void;
	onToggleDetails: () => void;
	detailsOpen: boolean;
	onToggleScratchpad: () => void;
	scratchpadOpen: boolean;
	onOpenSearch: () => void;
	onOpenShortcuts: () => void;
	onTriggerDecoy: () => void;
	onTriggerNuke: () => void;
	onOpenAIHelp: () => void;
	theme: "dark" | "light";
	onToggleTheme: () => void;
	pinnedCount: number;
	onTogglePinnedOnly?: () => void;
	isShowingPinnedOnly?: boolean;
	typingText: string | null;
	connectionStats: EdgeConnectionStats;
	onCopyLink: () => void;
	linkCopied: boolean;
	isE2EE: boolean;
	onToggleE2EE: () => void;
}

export const Header: React.FC<HeaderProps> = ({
	room,
	onToggleSidebar,
	onToggleDetails,
	detailsOpen,
	onToggleScratchpad,
	scratchpadOpen,
	onOpenSearch,
	onOpenShortcuts,
	onTriggerDecoy,
	onTriggerNuke,
	onOpenAIHelp,
	theme,
	onToggleTheme,
	pinnedCount,
	onTogglePinnedOnly,
	isShowingPinnedOnly,
	typingText,
	connectionStats,
	onCopyLink,
	linkCopied,
	isE2EE,
	onToggleE2EE,
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
						<h1 className="channel-title">{room}</h1>

						{/* E2EE Lock Badge */}
						<button
							type="button"
							className={`e2ee-header-pill ${isE2EE ? "active" : ""}`}
							onClick={onToggleE2EE}
							title={isE2EE ? "Enkripsi E2EE Aktif (WebCrypto AES-256)" : "Klik untuk pasang Kunci Enkripsi E2EE"}
						>
							{isE2EE ? <LockIcon size={13} /> : <UnlockIcon size={13} />}
							<span className="e2ee-label">{isE2EE ? "E2EE Terkunci" : "Publik"}</span>
						</button>

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
									? `Edge DO (${connectionStats.region || "Global"}) • ${connectionStats.latencyMs || 14}ms`
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
				{/* AI Assistant Quick Prompt */}
				<button
					type="button"
					className="header-btn-icon"
					onClick={onOpenAIHelp}
					title="Panggil Cloudflare Workers AI (/ai /summarize)"
					aria-label="Cloudflare AI"
				>
					<BotIcon size={18} />
				</button>

				{/* Collaborative Scratchpad Canvas */}
				<button
					type="button"
					className={`header-btn-icon ${scratchpadOpen ? "active" : ""}`}
					onClick={onToggleScratchpad}
					title="Buka Canvas Catatan Bersama"
					aria-label="Catatan Bersama"
				>
					<FileCodeIcon size={18} />
				</button>

				{/* Quick Search */}
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

				{/* Panic Decoy Screen Trigger */}
				<button
					type="button"
					className="header-btn-icon stealth-trigger-btn"
					onClick={onTriggerDecoy}
					title="Mode Samaran Terminal (Esc Esc)"
					aria-label="Mode Samaran"
				>
					<TerminalIcon size={18} />
				</button>

				{/* Panic Room Nuke */}
				<button
					type="button"
					className="header-btn-icon nuke-trigger-btn"
					onClick={onTriggerNuke}
					title="Pemusnahan Ruangan (Nuke / Wipe SQLite)"
					aria-label="Musnahkan Ruangan"
				>
					<AlertTriangleIcon size={18} />
				</button>

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
