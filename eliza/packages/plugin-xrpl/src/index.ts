import { type Plugin } from "@elizaos/core";

import { createNft, getNft, burnNft } from "./actions/NFT";
import getBalance from "./actions/getBalance";
import getTransaction from "./actions/getTransaction";
import sendTransaction from "./actions/sendTransaction";
import createDiD from "./actions/createDiD";
import analyseTransaction  from "./actions/analyseTransaction";
import createTask from "./actions/createTask";

export const xrplPlugin: Plugin = {
	name: "@elizaos-plugins/plugin-xrpl",
	description: "Plugin for interacting with the XRP Ledger",
	config: [],
	actions: [
		createNft,
		getNft,
		burnNft,
		getBalance,
		getTransaction,
		sendTransaction,
		createDiD,
		analyseTransaction,
		createTask
	],
	providers: [],
	evaluators: [],
	services: [],
	clients: [],
	adapters: []
};

export { xrplPlugin as default };
