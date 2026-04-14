import { createClient, type SupabaseClient, type RealtimeChannel } from "@supabase/supabase-js";

let client: SupabaseClient | null = null;
let channel: RealtimeChannel | null = null;

export function getClient(url: string, key: string): SupabaseClient {
	if (!client) {
		client = createClient(url, key);
	}
	return client;
}

export function resetClient(): void {
	if (channel) {
		client?.removeChannel(channel);
		channel = null;
	}
	client = null;
}

export function getChannel(): RealtimeChannel | null {
	return channel;
}

export function setChannel(ch: RealtimeChannel | null): void {
	channel = ch;
}

export function isCloudActive(syncMode: string, url: string, key: string): boolean {
	return syncMode === "supabase" && !!url && !!key;
}

export function sbHeaders(key: string): Record<string, string> {
	return {
		apikey: key,
		Authorization: "Bearer " + key,
		"Content-Type": "application/json",
		Prefer: "resolution=merge-duplicates",
	};
}
