import React, { useState, useEffect, useRef } from "react";
import { FileCodeIcon, CloseIcon, CopyIcon, DownloadIcon, CheckIcon } from "./Icons";

interface ScratchpadDrawerProps {
	isOpen: boolean;
	onClose: () => void;
	content: string;
	onUpdate: (newContent: string) => void;
	room: string;
}

export const ScratchpadDrawer: React.FC<ScratchpadDrawerProps> = ({
	isOpen,
	onClose,
	content,
	onUpdate,
	room,
}) => {
	const [localText, setLocalText] = useState(content);
	const [copied, setCopied] = useState(false);
	const debounceTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);

	// Sync incoming remote changes if not currently typing
	useEffect(() => {
		setLocalText(content);
	}, [content]);

	if (!isOpen) return null;

	const handleChange = (e: React.ChangeEvent<HTMLTextAreaElement>) => {
		const next = e.target.value;
		setLocalText(next);

		if (debounceTimerRef.current) clearTimeout(debounceTimerRef.current);
		debounceTimerRef.current = setTimeout(() => {
			onUpdate(next);
		}, 300);
	};

	const handleCopy = () => {
		navigator.clipboard.writeText(localText);
		setCopied(true);
		setTimeout(() => setCopied(false), 2000);
	};

	const handleDownload = () => {
		const blob = new Blob([localText], { type: "text/markdown" });
		const url = URL.createObjectURL(blob);
		const a = document.createElement("a");
		a.href = url;
		a.download = `scratchpad-${room}-${new Date().toISOString().slice(0, 10)}.md`;
		document.body.appendChild(a);
		a.click();
		document.body.removeChild(a);
		URL.revokeObjectURL(url);
	};

	return (
		<aside className="scratchpad-drawer-panel" aria-label="Catatan Bersama">
			<div className="drawer-header-row">
				<div className="drawer-title-box">
					<div className="drawer-title-with-icon">
						<FileCodeIcon size={18} />
						<h2 className="drawer-title">Canvas Catatan Bersama</h2>
					</div>
					<span className="drawer-subtitle">Tersinkronisasi Real-Time di Edge</span>
				</div>
				<button type="button" className="drawer-close-btn" onClick={onClose} aria-label="Tutup Canvas">
					<CloseIcon size={18} />
				</button>
			</div>

			<div className="scratchpad-toolbar">
				<button type="button" className="scratchpad-tool-btn" onClick={handleCopy}>
					{copied ? <CheckIcon size={14} /> : <CopyIcon size={14} />}
					<span>{copied ? "Tersalin!" : "Salin Teks"}</span>
				</button>
				<button type="button" className="scratchpad-tool-btn" onClick={handleDownload}>
					<DownloadIcon size={14} />
					<span>Ekspor (.md)</span>
				</button>
				<span className="scratchpad-sync-tag">⚡ Live Sync SQLite</span>
			</div>

			<div className="scratchpad-editor-wrapper">
				<textarea
					className="scratchpad-textarea"
					value={localText}
					onChange={handleChange}
					placeholder={`# Catatan Bersama #${room}\n\nTulis ide arsitektur, potongan kode, atau to-do list di sini. Semua perubahan tersinkronisasi otomatis secara real-time ke semua peserta di ruangan ini.`}
					autoFocus
				/>
			</div>
		</aside>
	);
};
