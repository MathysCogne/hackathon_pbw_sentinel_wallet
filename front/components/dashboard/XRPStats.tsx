'use client';

import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import { useState, useEffect } from "react";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { useXRPWallet, WalletHistoryData } from "@/hooks/useXRPWallet";
import { ArrowUpRight, ArrowDownRight, RefreshCw } from "lucide-react";
import { cn } from "@/lib/utils";

export function XRPStats({ className }: { className?: string }) {
  const [isDialogOpen, setIsDialogOpen] = useState(false);
  const [isMobile, setIsMobile] = useState(false);
  const { 
    walletData, 
    activePeriod, 
    setActivePeriod, 
    formatWalletAddress,
    refreshWallet,
    fetchXRPPrice
  } = useXRPWallet();
  
  // Utiliser useEffect pour détecter la taille de l'écran côté client et rafraîchir les données
  useEffect(() => {
    // Fonction pour vérifier si on est sur mobile
    const checkIfMobile = () => {
      setIsMobile(window.innerWidth < 640);
    };
    
    // Vérifier au chargement
    checkIfMobile();
    
    // Ajouter un listener pour les changements de taille d'écran
    window.addEventListener('resize', checkIfMobile);
    
    // Rafraîchir silencieusement les données toutes les 10 secondes
    const intervalId = setInterval(() => {
      // Utiliser un try/catch pour éviter que les erreurs n'arrêtent l'intervalle
      try {
        refreshWallet(false).catch(err => {
          console.warn("Silent refresh failed:", err);
        });
        
        fetchXRPPrice().catch(err => {
          console.warn("Silent price update failed:", err);
        });
      } catch (error) {
        console.warn("Error in refresh interval:", error);
      }
    }, 10000); // 10 secondes
    
    // Nettoyer les listeners et l'intervalle au démontage du composant
    return () => {
      window.removeEventListener('resize', checkIfMobile);
      clearInterval(intervalId);
    };
  }, [refreshWallet, fetchXRPPrice]);

  const handleRefresh = async () => {
    // État de chargement local
    try {
      // Rafraîchir à la fois les données du portefeuille et le prix XRP
      await Promise.all([
        refreshWallet(true), 
        fetchXRPPrice()
      ]);
    } catch (error) {
      console.error("Manual refresh failed:", error);
    }
  };

  return (
    <Card className="bg-[#111827] border-0 shadow-md overflow-hidden">
      <CardHeader className="">
        <CardTitle className="text-white text-base font-medium sm:text-lg">XRP Statistics</CardTitle>
        <CardDescription className="text-gray-400 text-xs sm:text-sm">Overview of your XRP wallet</CardDescription>
      </CardHeader>
      <CardContent className="flex flex-col h-full p-0">
        <Dialog open={isDialogOpen} onOpenChange={setIsDialogOpen}>
          <DialogTrigger asChild>
            <div className="cursor-pointer transition-colors flex flex-col px-3 pb-3 sm:px-5 sm:pb-5 md:px-6 md:pb-6">
              <div className="text-center mt-2">
                <p className="text-base sm:text-lg font-medium text-gray-300">
                  {walletData.loading ? 'Loading...' : formatWalletAddress(walletData.walletAddress)}
                </p>
                <p className="text-2xl sm:text-3xl md:text-4xl font-bold text-white">
                  {walletData.loading ? '...' : `${walletData.balance.toFixed(2)} XRP`}
                </p>
                <p className="text-xs sm:text-sm text-gray-400">
                  {walletData.loading ? '...' : `≈ ${walletData.eurValue.toFixed(2)} EUR`}
                </p>
              </div>
              
              {/* Visualisation en blocks des dernières transactions */}
              <div className="mt-4 max-h-[200px] overflow-hidden">
                {walletData.loading ? (
                  <div className="flex justify-center items-center h-[150px]">
                    <p className="text-gray-400">Loading transaction data...</p>
                  </div>
                ) : walletData.history.length === 0 ? (
                  <div className="flex justify-center items-center h-[150px]">
                    <p className="text-gray-400">No transaction data available</p>
                  </div>
                ) : (
                  <div className="space-y-1">
                    <div className="text-xs text-gray-400 mb-2 text-center">Transaction History</div>
                    <div className="flex items-center justify-center gap-1 overflow-x-auto py-2 px-1 w-full">
                      {walletData.history.map((item, index, arr) => {
                        // On utilise la différence entre deux transactions consécutives pour obtenir le montant réel
                        const transactionAmount = index > 0 
                          ? item.amount - arr[index - 1].amount 
                          : item.amount; // Pour la première transaction, on utilise le montant total
                        
                        const isPositive = transactionAmount >= 0;
                        
                        // Déterminer si c'est la transaction initiale (la plus ancienne)
                        const isInitial = index === 0;
                        
                        // Hauteur basée sur la valeur relative du montant de la transaction avec une base minimum
                        const absTransactionAmount = Math.abs(transactionAmount);
                        
                        // Calculer la hauteur avec une base plus haute
                        let height = 60; // Hauteur par défaut
                        
                        if (isInitial) {
                          // Pour la transaction initiale, hauteur fixe
                          height = 60;
                        } else {
                          // Pour les autres transactions, ajuster en fonction de l'importance
                          const maxNonInitialAmount = Math.max(...walletData.history.map((tx, i) => 
                            i > 0 ? Math.abs(tx.amount - arr[i-1].amount) : 0
                          ));
                          
                          if (maxNonInitialAmount > 0) {
                            // Échelle compressée: base 50 + une partie variable limitée à 50
                            height = 50 + (absTransactionAmount / maxNonInitialAmount) * 50;
                            // Limiter entre 50 et 100
                            height = Math.min(Math.max(height, 50), 100);
                          }
                        }
                        
                        // Calculer la couleur du bloc
                        let blockColor = "bg-blue-500";
                        if (!isInitial) {
                          blockColor = isPositive ? "bg-green-500" : "bg-red-500";
                        }
                        
                        return (
                          <div 
                            key={index} 
                            className="flex flex-col items-center cursor-pointer group flex-shrink-0"
                            title={`${item.date}: ${transactionAmount.toFixed(2)} XRP`}
                          >
                            <div className="h-4 flex justify-center">
                              {!isInitial && (
                                <div className={`text-[10px] font-bold ${isPositive ? 'text-green-500' : 'text-red-500'}`}>
                                  {isPositive ? '↑' : '↓'}
                                  {Math.abs(transactionAmount).toFixed(1)}
                                </div>
                              )}
                            </div>
                            <div 
                              className={`w-6 sm:w-8 rounded-t-sm ${blockColor}`}
                              style={{ height: `${height}px` }}
                            >
                              <div className="invisible group-hover:visible bg-[#0B0F19] text-white text-[10px] p-1 rounded absolute -mt-6 -ml-8 sm:-ml-4 whitespace-nowrap z-10">
                                <div>{item.date}</div>
                                <div>{isInitial ? 'Initial' : (isPositive ? 'Received' : 'Sent')}: {Math.abs(transactionAmount).toFixed(2)} XRP</div>
                                <div>Balance: {item.amount.toFixed(2)} XRP</div>
                              </div>
                            </div>
                            <div className="text-[7px] sm:text-[8px] text-gray-400 mt-1 w-8 text-center truncate">
                              {item.date}
                            </div>
                          </div>
                        );
                      })}
                    </div>
                    <div className="text-center mt-2">
                      <div className="flex justify-center gap-4 text-[10px]">
                        <div className="flex items-center gap-1">
                          <div className="h-2 w-2 rounded-full bg-green-500" />
                          <span className="text-gray-400">Received</span>
                        </div>
                        <div className="flex items-center gap-1">
                          <div className="h-2 w-2 rounded-full bg-red-500" />
                          <span className="text-gray-400">Sent</span>
                        </div>
                        <div className="flex items-center gap-1">
                          <div className="h-2 w-2 rounded-full bg-blue-500" />
                          <span className="text-gray-400">Initial</span>
                        </div>
                      </div>
                    </div>
                  </div>
                )}
              </div>
            </div>
          </DialogTrigger>
          <DialogContent className="max-w-[90vw] sm:max-w-[625px] bg-[#111827] text-white border-0">
            <DialogHeader>
              <DialogTitle className="text-white">Detailed Statistics</DialogTitle>
              <DialogDescription className="text-gray-400">
                Complete analysis of your XRP wallet
              </DialogDescription>
            </DialogHeader>
            <div className="grid gap-4 py-4">
              <div className="bg-[#1F2937] p-4 rounded-md">
                <h3 className="text-white font-medium mb-3">Transaction History</h3>
                
                {walletData.loading ? (
                  <div className="flex justify-center items-center h-[150px]">
                    <p className="text-gray-400">Loading transaction data...</p>
                  </div>
                ) : walletData.history.length === 0 ? (
                  <div className="flex justify-center items-center h-[150px]">
                    <p className="text-gray-400">No transaction data available</p>
                  </div>
                ) : (
                  <div className="space-y-2">
                    {walletData.history.map((item, index, arr) => {
                      // Calculer le montant réel de la transaction (différence entre deux transactions consécutives)
                      const transactionAmount = index > 0 
                        ? item.amount - arr[index - 1].amount 
                        : item.amount; // Pour la première transaction, on utilise le montant total
                      
                      const isPositive = transactionAmount >= 0;
                      
                      return (
                        <div 
                          key={index}
                          className={`flex items-center justify-between p-2 rounded ${index % 2 === 0 ? 'bg-[#151F2E]' : 'bg-[#1A2433]'}`}
                        >
                          <div className="flex items-center">
                            <div className={`p-1 rounded-full ${isPositive ? 'bg-green-500/20' : 'bg-red-500/20'} mr-2`}>
                              {isPositive ? (
                                <ArrowUpRight className="h-4 w-4 text-green-500" />
                              ) : (
                                <ArrowDownRight className="h-4 w-4 text-red-500" />
                              )}
                            </div>
                            <div>
                              <p className="text-sm font-medium text-white">
                                {item.date}
                              </p>
                              <p className="text-xs text-gray-400">
                                {index === 0 ? "Initial balance" : isPositive ? 'Received' : 'Sent'}
                              </p>
                            </div>
                          </div>
                          <div className="text-right">
                            <p className={`text-sm font-medium ${isPositive ? 'text-green-500' : 'text-red-500'}`}>
                              {index === 0 ? item.amount.toFixed(2) : `${isPositive ? '+' : ''}${transactionAmount.toFixed(2)} XRP`}
                            </p>
                            <p className="text-xs text-gray-400">
                              Balance: {item.amount.toFixed(2)} XRP
                            </p>
                          </div>
                        </div>
                      );
                    })}
                  </div>
                )}
              </div>
              
              <div className="grid grid-cols-1 sm:grid-cols-3 gap-2 sm:gap-4">
                <Card className="p-2 sm:p-3 bg-[#1F2937] border-0">
                  <CardTitle className="text-xs sm:text-sm font-medium mb-1 text-white">Current price</CardTitle>
                  <div className="text-xl sm:text-2xl font-bold text-white">
                    {walletData.loading ? '...' : `${walletData.xrpPrice.eur.toFixed(3)} €`}
                  </div>
                  <p className={`text-[10px] sm:text-xs ${walletData.xrpPrice.change24h >= 0 ? 'text-emerald-500' : 'text-red-500'}`}>
                    {walletData.loading ? '...' : `${walletData.xrpPrice.change24h >= 0 ? '+' : ''}${walletData.xrpPrice.change24h.toFixed(2)}% (24h)`}
                  </p>
                </Card>
                <Card className="p-2 sm:p-3 bg-[#1F2937] border-0">
                  <CardTitle className="text-xs sm:text-sm font-medium mb-1 text-white">Total balance</CardTitle>
                  <div className="text-xl sm:text-2xl font-bold text-white">
                    {walletData.loading ? '...' : `${walletData.balance.toFixed(2)} XRP`}
                  </div>
                  <p className="text-[10px] sm:text-xs text-gray-400">
                    {walletData.loading ? '...' : `${walletData.eurValue.toFixed(2)} €`}
                  </p>
                </Card>
                <Card className="p-2 sm:p-3 bg-[#1F2937] border-0">
                  <CardTitle className="text-xs sm:text-sm font-medium mb-1 text-white">Performance</CardTitle>
                  <div className="text-xl sm:text-2xl font-bold text-white">
                    {walletData.loading || walletData.history.length < 2 ? '...' : 
                      (() => {
                        const initialValue = walletData.history[0].amount;
                        const currentValue = walletData.balance;
                        const percentChange = ((currentValue - initialValue) / initialValue) * 100;
                        return `${percentChange >= 0 ? '+' : ''}${percentChange.toFixed(1)}%`;
                      })()
                    }
                  </div>
                  <p className="text-[10px] sm:text-xs text-gray-400">
                    Since first transaction
                  </p>
                </Card>
              </div>
            </div>
          </DialogContent>
        </Dialog>
      </CardContent>
    </Card>
  );
} 