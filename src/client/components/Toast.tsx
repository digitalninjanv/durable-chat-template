import React from "react";
import type { ToastItem } from "../types";
import { CheckIcon, InfoIcon, CloseIcon } from "./Icons";

interface ToastProps {
	toasts: ToastItem[];
	onDismiss: (id: string) => void;
}

export const ToastContainer: React.FC<ToastProps> = ({ toasts, onDismiss }) => {
	if (toasts.length === 0) return null;

	return (
		<div className="toast-container" role="region" aria-live="polite">
			{toasts.map((toast) => (
				<div key={toast.id} className={`toast-card toast-${toast.type || "info"}`}>
					<div className="toast-icon">
						{toast.type === "success" ? (
							<CheckIcon size={16} />
						) : (
							<InfoIcon size={16} />
						)}
					</div>
					<div className="toast-text">{toast.message}</div>
					<button
						type="button"
						className="toast-close-btn"
						onClick={() => onDismiss(toast.id)}
						aria-label="Tutup notifikasi"
					>
						<CloseIcon size={14} />
					</button>
				</div>
			))}
		</div>
	);
};
