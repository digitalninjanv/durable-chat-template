import React from "react";
import { TerminalIcon, CloseIcon } from "./Icons";

interface DecoyScreenProps {
	isActive: boolean;
	onExit: () => void;
}

export const DecoyScreen: React.FC<DecoyScreenProps> = ({ isActive, onExit }) => {
	if (!isActive) return null;

	return (
		<div className="decoy-screen-overlay" onClick={onExit} role="dialog" aria-modal="true">
			<div className="decoy-window" onClick={(e) => e.stopPropagation()}>
				<div className="decoy-header">
					<div className="decoy-controls">
						<span className="decoy-dot red" onClick={onExit} />
						<span className="decoy-dot yellow" />
						<span className="decoy-dot green" />
					</div>
					<div className="decoy-title">
						<TerminalIcon size={14} />
						<span>bash — cf-edge-worker-cluster (production)</span>
					</div>
					<button type="button" className="decoy-exit-btn" onClick={onExit} title="Keluar dari mode samaran">
						<CloseIcon size={14} />
					</button>
				</div>
				<div className="decoy-terminal-body">
					<p><span className="t-green">root@cf-edge-node</span>:<span className="t-blue">/var/log/workers</span># systemctl status durable-object-sqlite</p>
					<p className="t-dim">● durable-object-sqlite.service - Cloudflare Regional Edge Storage</p>
					<p className="t-dim">&nbsp;&nbsp;Loaded: loaded (/etc/systemd/system/durable-object-sqlite.service; enabled)</p>
					<p>&nbsp;&nbsp;Active: <span className="t-green">active (running)</span> since Sun 2026-08-16 06:20:14 UTC</p>
					<p className="t-dim">&nbsp;&nbsp;Main PID: 49204 (wrangler-edge)</p>
					<p className="t-dim">&nbsp;&nbsp;Tasks: 8 (limit: 4915)</p>
					<p className="t-dim">&nbsp;&nbsp;Memory: 24.8M (limit: 128.0M)</p>
					<p className="t-dim">&nbsp;&nbsp;CPU: 12ms per request (Sub-ms ACID sync)</p>
					<br />
					<p><span className="t-green">root@cf-edge-node</span>:<span className="t-blue">/var/log/workers</span># tail -n 12 /var/log/nginx/access.log</p>
					<p className="t-cyan">[2026-08-16T06:38:11Z] 172.68.24.18 - "GET /events HTTP/2.0" 200 4892 "WebSocket/PartyKit" 0.012</p>
					<p className="t-cyan">[2026-08-16T06:38:19Z] 172.68.24.19 - "POST /graphql HTTP/2.0" 200 1204 "Edge-Worker" 0.008</p>
					<p className="t-cyan">[2026-08-16T06:38:25Z] 172.68.24.22 - "GET /api/v2/metrics HTTP/2.0" 200 512 "Prometheus/2.45" 0.004</p>
					<p className="t-cyan">[2026-08-16T06:38:32Z] 172.68.24.30 - "GET /healthz HTTP/2.0" 200 64 "Kubelet" 0.001</p>
					<br />
					<p><span className="t-green">root@cf-edge-node</span>:<span className="t-blue">/var/log/workers</span># <span className="decoy-cursor">█</span></p>
				</div>
				<div className="decoy-footer">
					<span>[Mode Samaran Aktif] Klik di mana saja atau tekan <strong>ESC</strong> untuk kembali ke obrolan</span>
				</div>
			</div>
		</div>
	);
};
