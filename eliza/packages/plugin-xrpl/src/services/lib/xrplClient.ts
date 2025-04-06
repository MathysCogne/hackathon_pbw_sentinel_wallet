import { Client } from "xrpl";
import { CONFIG_KEYS } from "../../environment";
import { elizaLogger } from "@elizaos/core";

class XRPLClientService {
	private static instance: XRPLClientService;
	private client: Client | null = null;
	private connectionPromise: Promise<void> | null = null;

	private constructor() {}

	public static getInstance(): XRPLClientService {
		if (!XRPLClientService.instance) {
			XRPLClientService.instance = new XRPLClientService();
		}
		return XRPLClientService.instance;
	}

	public async getClient(): Promise<Client> {
		if (!this.client) {
			this.client = new Client(process.env[CONFIG_KEYS.XRPL_API_URL] || "wss://s.altnet.rippletest.net:51233");
		}

		if (!this.connectionPromise) {
			this.connectionPromise = this.connect();
		}

		await this.connectionPromise;
		return this.client;
	}

	private async connect(): Promise<void> {
		try {
			if (this.client && !this.client.isConnected()) {
				await this.client.connect();
				elizaLogger.log("Connected to XRPL");
			}
		} catch (error) {
			elizaLogger.error("Error connecting to XRPL:", error);
			this.connectionPromise = null;
			throw error;
		}
	}

	public async disconnect(): Promise<void> {
		if (this.client && this.client.isConnected()) {
			await this.client.disconnect();
			elizaLogger.log("Disconnected from XRPL");
		}
		this.connectionPromise = null;
	}
}

export const xrplClient = XRPLClientService.getInstance(); 