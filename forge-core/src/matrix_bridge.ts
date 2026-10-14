import { EventEmitter } from 'events';

export interface MatrixMessageEvent {
    roomId: string;
    sender: string;
    body: string;
    channelOrigin?: 'whatsapp' | 'telegram' | 'discord' | 'signal' | 'matrix';
}

export class ForgeMatrixBridge extends EventEmitter {
    private homeserverUrl: string;
    private accessToken: string;
    private isConnected: boolean = false;

    constructor(homeserverUrl = process.env.MATRIX_HOMESERVER || "https://matrix.org", accessToken = process.env.MATRIX_ACCESS_TOKEN || "") {
        super();
        this.homeserverUrl = homeserverUrl;
        this.accessToken = accessToken;
    }

    public detectChannelOrigin(sender: string): 'whatsapp' | 'telegram' | 'discord' | 'signal' | 'matrix' {
        // Standard mautrix / matrix-appservice puppet prefixes
        if (sender.includes("@whatsapp_") || sender.includes(":whatsapp")) return 'whatsapp';
        if (sender.includes("@telegram_") || sender.includes(":telegram")) return 'telegram';
        if (sender.includes("@discord_") || sender.includes(":discord")) return 'discord';
        if (sender.includes("@signal_") || sender.includes(":signal")) return 'signal';
        return 'matrix';
    }

    public async dispatchAutopsyToMatrix(roomId: string, formattedAutopsy: string) {
        if (!this.accessToken) {
            console.log(`[Matrix Bridge] No access token configured. Queued offline: ${formattedAutopsy.slice(0, 60)}...`);
            return;
        }

        try {
            const url = `${this.homeserverUrl}/_matrix/client/v3/rooms/${encodeURIComponent(roomId)}/send/m.room.message/${Date.now()}`;
            const res = await fetch(url, {
                method: "PUT",
                headers: {
                    "Authorization": `Bearer ${this.accessToken}`,
                    "Content-Type": "application/json"
                },
                body: JSON.stringify({
                    msgtype: "m.text",
                    body: formattedAutopsy
                })
            });
            console.log(`[Matrix Bridge] Transmitted autopsy to Matrix room ${roomId} (HTTP ${res.status})`);
        } catch (e: any) {
            console.error(`[Matrix Bridge] Delivery failed: ${e.message}`);
        }
    }
}
