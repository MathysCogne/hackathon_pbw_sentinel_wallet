import { Client } from 'xrpl';
import dotenv from 'dotenv';

dotenv.config();

// Utilisation du TestNet pour le développement, peut être changé en production
const XRPL_SERVER = 'wss://s.altnet.rippletest.net:51233';

export const createXrplClient = async () => {
  const client = new Client(XRPL_SERVER);
  await client.connect();
  return client;
};

export const disconnectXrplClient = async (client: Client) => {
  if (client.isConnected()) {
    await client.disconnect();
  }
}; 