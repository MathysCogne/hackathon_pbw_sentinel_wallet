interface TransactionParams {
	address: string;
	transactionCount?: number;
	startDate?: string;
	endDate?: string;
}

interface Transaction {
	type: string;
	hash: string;
	date: string;
	amount: string;
	from: string;
	to: string;
	status: string;
}

interface TransactionParams {
	address: string;
	transactionCount?: number;
	startDate?: string;
	endDate?: string;
}

interface Transaction {
	type: string;
	hash: string;
	date: string;
	amount: string;
	from: string;
	to: string;
	status: string;
}

interface NFTDetails {
	tokenId: string;
	uri: string;
	owner: string;
	flags: number;
	transferFee: number;
	serialNumber: number;
	taxon: number;
	mintDate: string;
}

interface NFTParams {
	tokenId?: string;
	address?: string;
	count?: number;
	startDate?: string;
	endDate?: string;
}

interface NFTMintTransaction extends Transaction {
	meta?: {
		nftoken_id?: string;
	};
}

interface NFTMintOptions {
	issuerAddress: string;
	tokenURI: string;
	transferFee?: number;
	isBurnable?: boolean;
	isTransferable?: boolean;
}
