'use client';

import { useState, useEffect } from 'react';
import { Client, rippleTimeToUnixTime, dropsToXrp } from 'xrpl';
import { useUser } from './useUser';

// URL du serveur XRPL TestNet
const XRPL_SERVER = 'wss://s.altnet.rippletest.net:51233';

// Structure des données historiques
export interface WalletHistoryData {
  date: string;
  amount: number;
  timestamp: number;
}

// Structure des données du wallet
export interface WalletData {
  balance: number;
  history: WalletHistoryData[];
  eurValue: number;
  loading: boolean;
  walletAddress: string;
  xrpPrice: {
    eur: number;
    usd: number;
    change24h: number;
  };
}

/**
 * Hook pour gérer les données du wallet XRP
 */
export function useXRPWallet() {
  const { user, loading: userLoading } = useUser();
  const [activePeriod, setActivePeriod] = useState<'day' | 'week' | 'month'>('month');
  const [walletData, setWalletData] = useState<WalletData>({
    balance: 0,
    history: [],
    eurValue: 0,
    loading: true,
    walletAddress: '',
    xrpPrice: {
      eur: 0.63, // Valeur par défaut
      usd: 0.70, // Valeur par défaut
      change24h: 0 // Valeur par défaut
    }
  });
  const [client, setClient] = useState<Client | null>(null);

  // Initialiser le client XRPL
  useEffect(() => {
    async function initClient() {
      if (!client) {
        const newClient = new Client(XRPL_SERVER);
        await newClient.connect();
        console.log('Connected to XRPL');
        setClient(newClient);
      }
    }
    
    initClient();
    
    // Nettoyer à la déconnexion
    return () => {
      if (client && client.isConnected()) {
        client.disconnect().then(() => {
          console.log('Disconnected from XRPL');
        });
      }
    };
  }, []);

  // Formater l'adresse du wallet
  const formatWalletAddress = (address: string) => {
    if (!address) return 'r...';
    return `${address.substring(0, 6)}...${address.substring(address.length - 6)}`;
  };

  // Récupérer le solde du wallet
  async function getWalletBalance(clientInstance: Client, walletAddress: string): Promise<number> {
    try {
      const response = await clientInstance.request({
        command: "account_info",
        account: walletAddress,
        ledger_index: "validated"
      });
      
      // Convertir les drops en XRP
      const xrpBalance = dropsToXrp(response.result.account_data.Balance);
      return typeof xrpBalance === 'string' ? parseFloat(xrpBalance) : xrpBalance;
    } catch (error) {
      console.error('Error getting wallet balance:', error);
      return 0;
    }
  }

  // Récupérer l'historique des transactions
  async function fetchWalletHistory(
    clientInstance: Client,
    walletAddress: string
  ): Promise<WalletHistoryData[]> {
    try {
      console.log('Fetching transaction history for wallet:', walletAddress);
      
      // Récupérer un nombre plus élevé de transactions pour s'assurer d'en avoir au moins 10
      const response = await clientInstance.request({
        command: "account_tx",
        account: walletAddress,
        limit: 30, // Augmenter la limite pour avoir plus de chance de récupérer 10 vraies transactions
        ledger_index_min: -1,
        ledger_index_max: -1
      });
      
      console.log('Transaction response received:', 
        `Total txs: ${response.result.transactions?.length || 0}`);
      
      // Récupérer le solde actuel du wallet pour le point final
      const currentBalance = await getWalletBalance(clientInstance, walletAddress);
      
      // Sécuriser l'accès aux transactions
      const transactions = response.result.transactions || [];
      
      // Déboguer la structure des transactions
      if (transactions.length > 0) {
        console.log('First transaction structure:', JSON.stringify(transactions[0], null, 2));
      }
      
      // Si aucune transaction n'est disponible, retourner uniquement le solde actuel
      if (transactions.length === 0) {
        const now = new Date();
        const dateStr = `${now.getDate()}/${now.getMonth() + 1}/${now.getFullYear().toString().substr(2, 2)}`;
        
        return [{
          date: dateStr,
          amount: currentBalance,
          timestamp: Math.floor(now.getTime() / 1000)
        }];
      }
      
      // Traiter les transactions réelles
      const historyData: WalletHistoryData[] = [];
      let runningBalance = currentBalance;
      
      // Filtrer et traiter les transactions
      const processedTransactions = transactions
        .filter(tx => {
          // Vérifier que la transaction a un objet tx_json et que c'est un paiement
          const isPayment = tx.tx_json && tx.tx_json.TransactionType === 'Payment';
          if (isPayment) {
            console.log('Found Payment transaction:', tx.tx_json);
          }
          return isPayment;
        })
        .map(tx => {
          // Comme nous avons déjà filtré, tx.tx_json existe forcément ici
          const txObj = tx.tx_json as any; // Type assertion pour éviter les erreurs TS
          
          console.log('Processing transaction:', txObj);
          
          // Utiliser une méthode de conversion plus simple pour la date
          let txDate: number;
          try {
            // Utiliser une valeur par défaut si la date est invalide
            txDate = typeof txObj.date === 'number' ? txObj.date : 0;
            console.log('Transaction date:', txDate);
            
            if (txDate > 0) {
              // Convertir du format Ripple (secondes depuis 1er janvier 2000) à Unix (secondes depuis 1970)
              const rippleEpoch = 946684800; // Timestamp Unix du 1er janvier 2000
              txDate = rippleEpoch + txDate;
              console.log('Converted date:', txDate, new Date(txDate * 1000).toISOString());
            }
          } catch (e) {
            console.log('Error converting date, using current time');
            txDate = Math.floor(Date.now() / 1000);
          }
          
          const date = new Date(txDate * 1000);
          const dateStr = `${date.getDate()}/${date.getMonth() + 1}/${date.getFullYear().toString().substr(2, 2)}`;
          console.log('Formatted date:', dateStr);
          
          // Calculer le montant en XRP
          let amount = 0;
          try {
            console.log('Meta info:', tx.meta);
            // Essayer de récupérer le montant livré depuis les métadonnées
            if (tx.meta && typeof tx.meta !== 'string' && tx.meta.delivered_amount) {
              console.log('Found delivered_amount:', tx.meta.delivered_amount);
              const deliveredAmount = tx.meta.delivered_amount;
              if (typeof deliveredAmount === 'string') {
                // Convertir manuellement les drops en XRP (1 XRP = 1,000,000 drops)
                amount = parseInt(deliveredAmount, 10) / 1000000;
                console.log('Converted amount from delivered_amount:', amount);
              }
            } 
            // Ou utiliser le montant de la transaction
            else if (txObj.Amount && typeof txObj.Amount === 'string') {
              console.log('Found Amount in tx_json:', txObj.Amount);
              // Convertir manuellement les drops en XRP (1 XRP = 1,000,000 drops)
              amount = parseInt(txObj.Amount, 10) / 1000000;
              console.log('Converted amount from tx_json.Amount:', amount);
            }
          } catch (e) {
            console.log('Error converting amount:', e);
          }
          
          // Déterminer si c'est une transaction entrante ou sortante
          const isIncoming = txObj.Destination === walletAddress;
          console.log('Transaction direction:', isIncoming ? 'incoming' : 'outgoing');
          
          return {
            date: dateStr,
            amount: amount,
            isIncoming,
            timestamp: txDate
          };
        })
        .sort((a, b) => b.timestamp - a.timestamp) // Du plus récent au plus ancien
        .slice(0, 10); // Limiter aux 10 dernières transactions
      
      console.log(`Processed ${processedTransactions.length} valid transactions`);
      
      // Calculer le solde rétroactivement pour chaque transaction
      for (let i = 0; i < processedTransactions.length; i++) {
        const tx = processedTransactions[i];
        
        if (i === 0) {
          // La transaction la plus récente correspond au solde actuel
          historyData.unshift({
            date: tx.date,
            amount: currentBalance,
            timestamp: tx.timestamp
          });
        } else {
          // Pour les transactions précédentes, calculer le solde en fonction des montants
          const balanceChange = processedTransactions[i-1].isIncoming 
            ? processedTransactions[i-1].amount 
            : -processedTransactions[i-1].amount;
          
          runningBalance -= balanceChange;
          
          historyData.unshift({
            date: tx.date,
            amount: runningBalance,
            timestamp: tx.timestamp
          });
        }
      }
      
      // Si nous avons moins de 2 points, ajouter le solde actuel
      if (historyData.length === 0) {
        const now = new Date();
        const dateStr = `${now.getDate()}/${now.getMonth() + 1}/${now.getFullYear().toString().substr(2, 2)}`;
        
        historyData.push({
          date: dateStr,
          amount: currentBalance,
          timestamp: Math.floor(now.getTime() / 1000)
        });
      }
      
      console.log(`Returning ${historyData.length} history data points`);
      return historyData;
    } catch (error) {
      console.error('Error getting wallet history:', error);
      return [];
    }
  }

  // Récupérer les données du wallet
  useEffect(() => {
    if (userLoading || !user?.walletAddress || !client) return;
    
    let isMounted = true;
    
    // Appel initial
    fetchWalletData(true);
    
    return () => {
      isMounted = false;
    };
  }, [user, userLoading, client]);

  // Fonction pour récupérer les données du wallet
  const fetchWalletData = async (showLoading = true) => {
    if (!user?.walletAddress || !client) return;
    
    try {
      if (showLoading) {
        setWalletData(prev => ({ ...prev, loading: true }));
      }
      
      // Récupérer le solde actuel
      const balance = await getWalletBalance(client, user.walletAddress);
      
      // Récupérer l'historique des 10 dernières transactions indépendamment de la période
      const history = await fetchWalletHistory(client, user.walletAddress);
      
      // Récupérer le prix actuel du XRP
      const xrpPrice = await fetchXRPPrice();
      
      // Calculer la valeur en EUR avec le taux réel
      const eurValue = balance * xrpPrice.eur;
      
      setWalletData({
        balance,
        history,
        eurValue,
        loading: false,
        walletAddress: user.walletAddress,
        xrpPrice
      });
    } catch (error) {
      console.error('Error fetching wallet data:', error);
      setWalletData(prev => ({ 
        ...prev, 
        loading: false 
      }));
    }
  };

  // Récupérer le prix actuel du XRP depuis CoinGecko ou utiliser un fallback
  const fetchXRPPrice = async (): Promise<{eur: number, usd: number, change24h: number}> => {
    try {
      // Option 1: CoinGecko API directe
      const controller = new AbortController();
      const timeoutId = setTimeout(() => controller.abort(), 3000);
      
      try {
        const response = await fetch('https://api.coingecko.com/api/v3/simple/price?ids=ripple&vs_currencies=eur,usd&include_24hr_change=true', {
          method: 'GET',
          headers: {
            'Accept': 'application/json',
          },
          signal: controller.signal
        });
        
        clearTimeout(timeoutId);
        
        if (!response.ok) {
          throw new Error(`API request failed with status ${response.status}`);
        }
        
        const data = await response.json();
        
        if (data && data.ripple) {
          console.log('Successfully fetched XRP price from CoinGecko');
          return {
            eur: data.ripple.eur || 0.63,
            usd: data.ripple.usd || 0.70,
            change24h: data.ripple.usd_24h_change || 0
          };
        }
        
        throw new Error('Invalid data format from CoinGecko API');
      } finally {
        clearTimeout(timeoutId);
      }
    } catch (error) {
      console.error('Error fetching XRP price from primary source:', error);
      
      try {
        // Option 2: Fallback - Essayer l'API alternative de CoinGecko
        console.log('Trying alternate API endpoint...');
        
        const controller = new AbortController();
        const timeoutId = setTimeout(() => controller.abort(), 3000);
        
        try {
          const response = await fetch('https://api.coingecko.com/api/v3/coins/ripple', { 
            signal: controller.signal
          });
          
          clearTimeout(timeoutId);
          
          if (!response.ok) {
            throw new Error(`Alternate API request failed with status ${response.status}`);
          }
          
          const data = await response.json();
          
          if (data && data.market_data && data.market_data.current_price) {
            console.log('Successfully fetched XRP price from alternate endpoint');
            return {
              eur: data.market_data.current_price.eur || 0.63,
              usd: data.market_data.current_price.usd || 0.70,
              change24h: data.market_data.price_change_percentage_24h || 0
            };
          }
          
          throw new Error('Invalid data format from alternate API');
        } finally {
          clearTimeout(timeoutId);
        }
      } catch (fallbackError) {
        console.error('Fallback API also failed:', fallbackError);
        
        try {
          // Option 3: Utiliser une API avec CORS proxy comme dernier recours
          console.log('Trying CORS-friendly endpoint...');
          
          const controller = new AbortController();
          const timeoutId = setTimeout(() => controller.abort(), 3000);
          
          try {
            // Utiliser l'API Crypto Compare qui a généralement moins de problèmes CORS
            const response = await fetch('https://min-api.cryptocompare.com/data/price?fsym=XRP&tsyms=EUR,USD', {
              signal: controller.signal
            });
            
            clearTimeout(timeoutId);
            
            if (!response.ok) {
              throw new Error(`CORS-friendly API request failed with status ${response.status}`);
            }
            
            const data = await response.json();
            
            if (data && data.EUR && data.USD) {
              console.log('Successfully fetched XRP price from CORS-friendly API');
              
              // Nous n'avons pas le changement 24h dans cette API, donc utilisation d'une valeur neutre
              return {
                eur: data.EUR || 0.63,
                usd: data.USD || 0.70,
                change24h: 0
              };
            }
            
            throw new Error('Invalid data format from CORS-friendly API');
          } finally {
            clearTimeout(timeoutId);
          }
        } catch (corsError) {
          console.error('All APIs failed to fetch XRP price:', corsError);
          
          // Option 4: Valeurs statiques comme dernier recours
          console.log('Using default static XRP price values');
          return { 
            eur: 0.63, 
            usd: 0.70, 
            change24h: 0 
          };
        }
      }
    }
  };

  // Retourner les données et fonctions
  return {
    walletData,
    activePeriod,
    setActivePeriod,
    formatWalletAddress,
    refreshWallet: (showLoading = true) => fetchWalletData(showLoading),
    fetchXRPPrice
  };
} 