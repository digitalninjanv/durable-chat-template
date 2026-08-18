import React, { useState, useRef, useEffect } from "react";
import {
	MenuIcon,
	HashIcon,
	CopyIcon,
	SearchIcon,
	PinIcon,
	SunIcon,
	MoonIcon,
	InfoIcon,
	CheckIcon,
	LockIcon,
	UnlockIcon,
	TerminalIcon,
	AlertTriangleIcon,
	FileCodeIcon,
	BotIcon,
	MoreHorizontalIcon,
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
	const [isMobileMenuOpen, setIsMobileMenuOpen] = useState(false);
	const menuRef = useRef<HTMLDivElement>(null);

	// Close mobile menu on click outside
	useEffect(() => {
		const handleClickOutside = (e: MouseEvent) => {
			if (menuRef.current && !menuRef.current.contains(e.target as Node)) {
				setIsMobileMenuOpen(false);
			}
		};

		if (isMobileMenuOpen) {
			document.addEventListener("mousedown", handleClickOutside);
		}
		return () => document.removeEventListener("mousedown", handleClickOutside);
	}, [isMobileMenuOpen]);

	return (
		<header className="app-header">
			{/* Left: Navigation & Channel Identity */}
			<div className="header-left">
				<button
					type="button"
					className="header-btn-icon sidebar-toggle-btn"
					onClick={onToggleSidebar}
					aria-label="Buka Menu Saluran"
					title="Buka Menu"
				>
					<MenuIcon size={20} />
				</button>

				<div className="channel-info-block" onClick={onToggleDetails} role="button" tabIndex={0} title="Klik untuk info ruangan">
					<div className="channel-title-row">
						<div className="channel-icon-pill">
							{isE2EE ? <LockIcon size={14} /> : <HashIcon size={15} />}
						</div>
						<h1 className="channel-title">{room}</h1>

						{/* E2EE Lock Badge (Desktop & Tablet) */}
						<button
							type="button"
							className={`e2ee-header-pill ${isE2EE ? "active" : ""}`}
							onClick={(e) => {
								e.stopPropagation();
								onToggleE2EE();
							}}
							title={isE2EE ? "Enkripsi E2EE Aktif (AES-256-GCM)" : "Klik untuk pasang Kunci Enkripsi E2EE"}
						>
							{isE2EE ? <LockIcon size={12} /> : <UnlockIcon size={12} />}
							<span className="e2ee-label">{isE2EE ? "E2EE" : "Publik"}</span>
						</button>

						{/* Copy Link Button (Desktop) */}
						<button
							type="button"
							className={`channel-copy-btn desktop-only ${linkCopied ? "copied" : ""}`}
							onClick={(e) => {
								e.stopPropagation();
								onCopyLink();
							}}
							title="Salin tautan ruangan"
						>
							{linkCopied ? <CheckIcon size={13} /> : <CopyIcon size={13} />}
							<span className="channel-copy-label">
								{linkCopied ? "Tersalin!" : "Salin Link"}
							</span>
						</button>
					</div>

					<div className="channel-meta-row">
						{typingText ? (
							<div className="header-typing-pill">
								<span className="typing-pulse" />
								<span className="typing-text">{typingText}</span>
							</div>
						) : (
							<div className="edge-status-pill">
								<span className={`status-dot dot-${connectionStats.status}`} />
								<span className="status-label">
									{connectionStats.status === "connected"
										? `Edge DO • ${connectionStats.latencyMs || 14}ms`
										: connectionStats.status === "reconnecting"
										? "Menyambung..."
										: "Menghubungkan"}
								</span>
							</div>
						)}
					</div>
				</div>
			</div>

			{/* Right: Actions (Desktop Bar & Mobile Overflow) */}
			<div className="header-right">
				{/* Desktop Action Buttons */}
				<div className="desktop-header-actions">
					{/* AI Assistant Quick Prompt */}
					<button
						type="button"
						className="header-btn-icon"
						onClick={onOpenAIHelp}
						title="Panggil Google Gemma 4 AI (/ai /summarize)"
						aria-label="Google Gemma 4 AI"
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
						<SearchIcon size={17} />
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
							<PinIcon size={17} />
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
						<TerminalIcon size={17} />
					</button>

					{/* Panic Room Nuke */}
					<button
						type="button"
						className="header-btn-icon nuke-trigger-btn"
						onClick={onTriggerNuke}
						title="Pemusnahan Ruangan (Nuke / Wipe SQLite)"
						aria-label="Musnahkan Ruangan"
					>
						<AlertTriangleIcon size={17} />
					</button>

					{/* Theme Switcher */}
					<button
						type="button"
						className="header-btn-icon"
						onClick={onToggleTheme}
						title={theme === "dark" ? "Ganti ke Tema Terang" : "Ganti ke Tema Gelap"}
						aria-label="Ganti Tema"
					>
						{theme === "dark" ? <SunIcon size={17} /> : <MoonIcon size={17} />}
					</button>
				</div>

				{/* Mobile & Compact Actions */}
				<button
					type="button"
					className="header-btn-icon mobile-only"
					onClick={onOpenSearch}
					title="Cari Pesan"
					aria-label="Cari"
				>
					<SearchIcon size={18} />
				</button>

				{/* Details Panel Toggle (Visible on all screens) */}
				<button
					type="button"
					className={`header-btn-icon ${detailsOpen ? "active" : ""}`}
					onClick={onToggleDetails}
					title="Informasi & Anggota Ruangan"
					aria-label="Informasi Ruangan"
				>
					<InfoIcon size={18} />
				</button>

				{/* Mobile Overflow Menu Dropdown */}
				<div className="mobile-header-menu-container mobile-only" ref={menuRef}>
					<button
						type="button"
						className={`header-btn-icon ${isMobileMenuOpen ? "active" : ""}`}
						onClick={() => setIsMobileMenuOpen(!isMobileMenuOpen)}
						title="Menu Alat & Opsi Ruangan"
						aria-label="Menu Opsi"
						aria-expanded={isMobileMenuOpen}
					>
						<MoreHorizontalIcon size={20} />
						{pinnedCount > 0 && <span className="badge-dot" />}
					</button>

					{isMobileMenuOpen && (
						<div className="header-mobile-dropdown">
							<div className="dropdown-section-title">Alat & Fitur Ruangan</div>

							<button
								type="button"
								className="dropdown-menu-item"
								onClick={() => {
									setIsMobileMenuOpen(false);
									onOpenAIHelp();
								}}
							>
								<div className="item-icon-box text-blue">
									<BotIcon size={16} />
								</div>
								<div className="item-text-box">
									<span className="item-title">Tanya Google Gemma 4</span>
									<span className="item-sub">Asisten AI Edge (/ai)</span>
								</div>
							</button>

							<button
								type="button"
								className="dropdown-menu-item"
								onClick={() => {
									setIsMobileMenuOpen(false);
									onToggleScratchpad();
								}}
							>
								<div className="item-icon-box text-emerald">
									<FileCodeIcon size={16} />
								</div>
								<div className="item-text-box">
									<span className="item-title">Canvas Catatan Bersama</span>
									<span className="item-sub">Sinkronisasi Markdown Real-Time</span>
								</div>
							</button>

							{pinnedCount > 0 && onTogglePinnedOnly && (
								<button
									type="button"
									className="dropdown-menu-item"
									onClick={() => {
										setIsMobileMenuOpen(false);
										onTogglePinnedOnly();
									}}
								>
									<div className="item-icon-box text-amber">
										<PinIcon size={16} />
									</div>
									<div className="item-text-box">
										<span className="item-title">Pesan Disematkan</span>
										<span className="item-sub">{pinnedCount} pesan penting</span>
									</div>
								</button>
							)}

							<button
								type="button"
								className="dropdown-menu-item"
								onClick={() => {
									setIsMobileMenuOpen(false);
									onCopyLink();
								}}
							>
								<div className="item-icon-box">
									<CopyIcon size={16} />
								</div>
								<div className="item-text-box">
									<span className="item-title">Salin Tautan Ruangan</span>
									<span className="item-sub">{linkCopied ? "Tersalin!" : "Bagikan link chat"}</span>
								</div>
							</button>

							<button
								type="button"
								className="dropdown-menu-item"
								onClick={() => {
									setIsMobileMenuOpen(false);
									onToggleE2EE();
								}}
							>
								<div className="item-icon-box text-indigo">
									<LockIcon size={16} />
								</div>
								<div className="item-text-box">
									<span className="item-title">Enkripsi E2EE</span>
									<span className="item-sub">{isE2EE ? "Status: Terkunci (Aktif)" : "Status: Saluran Publik"}</span>
								</div>
							</button>

							<button
								type="button"
								className="dropdown-menu-item"
								onClick={() => {
									setIsMobileMenuOpen(false);
									onToggleTheme();
								}}
							>
								<div className="item-icon-box">
									{theme === "dark" ? <SunIcon size={16} /> : <MoonIcon size={16} />}
								</div>
								<div className="item-text-box">
									<span className="item-title">Ganti Tema</span>
									<span className="item-sub">{theme === "dark" ? "Aktifkan Tema Terang" : "Aktifkan Tema Gelap"}</span>
								</div>
							</button>

							<div className="dropdown-divider" />

							<button
								type="button"
								className="dropdown-menu-item"
								onClick={() => {
									setIsMobileMenuOpen(false);
									onTriggerDecoy();
								}}
							>
								<div className="item-icon-box">
									<TerminalIcon size={16} />
								</div>
								<div className="item-text-box">
									<span className="item-title">Mode Samaran Terminal</span>
									<span className="item-sub">Pintasan: Tekan ESC 2x</span>
								</div>
							</button>

							<button
								type="button"
								className="dropdown-menu-item item-danger"
								onClick={() => {
									setIsMobileMenuOpen(false);
									onTriggerNuke();
								}}
							>
								<div className="item-icon-box text-danger">
									<AlertTriangleIcon size={16} />
								</div>
								<div className="item-text-box">
									<span className="item-title">Musnahkan Ruangan (Nuke)</span>
									<span className="item-sub">Hapus bersih database SQLite</span>
								</div>
							</button>
						</div>
					)}
				</div>
			</div>
		</header>
	);
};
