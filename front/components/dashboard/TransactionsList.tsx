'use client';

import { useState, useEffect } from "react";
import Link from "next/link";
import { TransactionAnalysis, getUserTransactions } from "@/lib/supabase";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { FileText, ShieldCheck, ChevronRight, RefreshCw } from "lucide-react";
import { useUser } from "@/hooks/useUser";

export function TransactionsList() {
  const { user } = useUser();
  const [transactions, setTransactions] = useState<TransactionAnalysis[]>([]);
  const [isLoading, setIsLoading] = useState(true);

  // Charger les transactions initialement et configurer le rafraîchissement
  useEffect(() => {
    if (user?.id) {
      loadTransactions(user.id);

      // Rafraîchir les transactions toutes les 5 secondes (5000ms)
      const refreshInterval = setInterval(() => {
        // Utiliser un try/catch pour éviter que les erreurs n'arrêtent l'intervalle
        try {
          loadTransactions(user.id, false).catch(err => {
            console.warn("Silent refresh failed:", err);
          });
        } catch (error) {
          console.warn("Error in refresh interval:", error);
        }
      }, 5000);

      return () => clearInterval(refreshInterval);
    }
  }, [user]);

  // Fonction pour charger les transactions
  const loadTransactions = async (userId: string, setLoadingState = true): Promise<TransactionAnalysis[]> => {
    if (setLoadingState) setIsLoading(true);
    
    try {
      const userTransactions = await getUserTransactions(userId);
      setTransactions(userTransactions);
      return userTransactions;
    } catch (error) {
      console.error("Error loading transactions:", error);
      return [];
    } finally {
      if (setLoadingState) setIsLoading(false);
    }
  };

  // Fonction pour rafraîchir manuellement les transactions
  const handleRefresh = async () => {
    if (!user?.id) return;
    
    try {
      await loadTransactions(user.id, true);
    } catch (error) {
      console.error("Manual refresh failed:", error);
    }
  };

  // Contenu pour l'état de chargement
  if (isLoading) {
    return (
      <Card className="h-full bg-[#101827] border-0 shadow-md overflow-hidden">
        <CardHeader className="">
          <div className="flex items-center justify-between">
            <div>
              <CardTitle className="text-white text-base sm:text-lg font-medium">Recent Transactions</CardTitle>
              <CardDescription className="text-gray-400 text-xs sm:text-sm">
                Multi-signed transactions secured by Sentinel
              </CardDescription>
            </div>
            <div className="flex items-center gap-2">
              <div className="bg-blue-900/20 py-1 px-2 rounded-md flex items-center text-blue-400 text-xs">
                <ShieldCheck className="h-3 w-3 mr-1" /> AI Signed
              </div>
              <button 
                disabled
                className="p-1 rounded-full opacity-50 cursor-not-allowed"
                title="Loading transactions..."
              >
                <RefreshCw className="h-4 w-4 text-gray-400 animate-spin" />
              </button>
            </div>
          </div>
        </CardHeader>
        <CardContent className="p-2 sm:p-3">
          <div className="flex flex-col items-center justify-center h-[200px]">
            <RefreshCw className="h-8 w-8 text-blue-500/50 animate-spin mb-4" />
            <div className="text-gray-400 text-sm">Loading transactions...</div>
          </div>
        </CardContent>
      </Card>
    );
  }

  // Contenu pour absence de transactions
  if (!transactions || transactions.length === 0) {
    return (
      <Card className="h-full bg-[#101827] border-0 shadow-md overflow-hidden">
        <CardHeader className="">
          <div className="flex items-center justify-between">
            <div>
              <CardTitle className="text-white text-base sm:text-lg font-medium">Recent Transactions</CardTitle>
              <CardDescription className="text-gray-400 text-xs sm:text-sm">
                Multi-signed transactions secured by Sentinel
              </CardDescription>
            </div>
            <div className="flex items-center gap-2">
              <div className="bg-blue-900/20 py-1 px-2 rounded-md flex items-center text-blue-400 text-xs">
                <ShieldCheck className="h-3 w-3 mr-1" /> AI Signed
              </div>
              <button 
                onClick={handleRefresh}
                className="p-1 rounded-full hover:bg-gray-800 transition-colors"
                title="Refresh transactions"
              >
                <RefreshCw className="h-4 w-4 text-gray-400" />
              </button>
            </div>
          </div>
        </CardHeader>
        <CardContent className="p-2 sm:p-3 h-[calc(100%-70px)] flex flex-col overflow-hidden">
          <div className="flex-1 flex items-center justify-center">
            <div className="text-center p-6">
              <div className="mx-auto w-10 h-10 rounded-full bg-[#1a2234] flex items-center justify-center mb-2">
                <FileText className="h-5 w-5 text-blue-400" />
              </div>
              <p className="text-gray-300 text-xs sm:text-sm mb-1">No signed transactions yet</p>
              <p className="text-gray-500 text-[10px] sm:text-xs max-w-[250px]">
                Transactions will appear here once they are multi-signed by Sentinel AI
              </p>
            </div>
          </div>
        </CardContent>
      </Card>
    );
  }

  // Format date
  const formatDate = (dateString: string) => {
    const date = new Date(dateString);
    return new Intl.DateTimeFormat('en-US', {
      day: '2-digit',
      month: '2-digit',
      year: 'numeric',
      hour: '2-digit',
      minute: '2-digit',
      hour12: false
    }).format(date);
  };

  // Determine recommendation style
  const getRecommendationStyle = (recommendation: string) => {
    switch (recommendation) {
      case 'SIGN':
        return {
          text: 'APPROVED & SIGNED',
          icon: '✅',
          className: 'text-green-500',
          borderClass: 'border-l-green-500'
        };
      case 'REJECT':
        return {
          text: 'REJECTED',
          icon: '❌',
          className: 'text-red-500',
          borderClass: 'border-l-red-500'
        };
      case 'REVIEW':
        return {
          text: 'REJECTED',
          icon: '⚠️',
          className: 'text-yellow-500',
          borderClass: 'border-l-amber-500'
        };
      default:
        return {
          text: 'UNKNOWN',
          icon: '❓',
          className: 'text-gray-500',
          borderClass: 'border-l-gray-500'
        };
    }
  };

  // Get status indicator
  const getStatusIndicator = (recommendation: string) => {
    switch (recommendation) {
      case 'SIGN':
        return <div className="w-2 h-2 rounded-full bg-green-500"></div>;
      case 'REJECT':
        return <div className="w-2 h-2 rounded-full bg-red-500"></div>;
      case 'REVIEW':
        return <div className="w-2 h-2 rounded-full bg-yellow-500"></div>;
      default:
        return <div className="w-2 h-2 rounded-full bg-gray-500"></div>;
    }
  };

  // Limiter à 4 transactions maximum
  const displayTransactions = transactions.slice(0, 4);
  const hasMoreTransactions = transactions.length > 4;

  return (
    <Card className="h-full bg-[#101827] border-0 shadow-md overflow-hidden">
      <CardHeader className="">
        <div className="flex items-center justify-between">
          <div>
            <CardTitle className="text-white text-base sm:text-lg font-medium">Recent Transactions</CardTitle>
            <CardDescription className="text-gray-400 text-xs sm:text-sm">
              Multi-signed transactions secured by Sentinel
            </CardDescription>
          </div>
          <div className="flex items-center gap-2">
            <div className="bg-blue-900/20 py-1 px-2 rounded-md flex items-center text-blue-400 text-xs">
              <ShieldCheck className="h-3 w-3 mr-1" /> AI Signed
            </div>
            <button 
              onClick={handleRefresh}
              className="p-1 rounded-full hover:bg-gray-800 transition-colors"
              title="Refresh transactions"
            >
              <RefreshCw className="h-4 w-4 text-gray-400" />
            </button>
          </div>
        </div>
      </CardHeader>
      <CardContent className="p-2 sm:p-3 h-[calc(100%-70px)] flex flex-col overflow-hidden">
        <div className="flex-1 overflow-y-auto">
          <div className="space-y-2 sm:space-y-3">
            {displayTransactions.map((tx) => {
              const recommendation = getRecommendationStyle(tx.recommendation);
              return (
                <Link 
                  key={tx.tx_hash} 
                  href={`/tx/${tx.tx_hash}`}
                  className="block"
                >
                  <div 
                    className={`bg-[#151d2e] rounded-md overflow-hidden border-l-2 ${recommendation.borderClass} hover:bg-[#1a2234] transition-colors`}
                  >
                    <div className="p-2 sm:p-3">
                      <div className="flex items-center justify-between">
                        <div className="flex items-center gap-2 sm:gap-3">
                          <div className="flex-shrink-0">
                            {tx.recommendation === 'SIGN' ? 
                              <ShieldCheck className="w-4 h-4 text-green-400" /> : 
                              <FileText className="w-4 h-4 text-blue-400" />}
                          </div>
                          <div className="min-w-0 flex-1">
                            <h3 className="text-white text-xs sm:text-sm font-medium truncate max-w-[180px] sm:max-w-[250px]">
                              {tx.tx_hash}
                            </h3>
                            <div className="flex items-center gap-2 mt-1">
                              <div className="flex items-center">
                                <span className="text-gray-400 text-[10px] sm:text-xs">Amount:</span>
                                <span className="font-medium text-white ml-1 text-[10px] sm:text-xs">
                                  {tx.amount ? parseFloat(tx.amount).toLocaleString('en-US', { maximumFractionDigits: 6 }) : 'N/A'} {tx.currency || 'XRP'}
                                </span>
                              </div>
                            </div>
                          </div>
                        </div>
                        
                        <div className="flex flex-col items-end text-[10px]">
                          <div className="flex items-center mb-1">
                            {getStatusIndicator(tx.recommendation)}
                            <span className="text-[9px] text-gray-400 ml-1">{recommendation.text}</span>
                          </div>
                          <div className="flex items-center text-gray-400">
                            <span className="mr-1">Date:</span> {formatDate(tx.timestamp).split(',')[0]}
                          </div>
                          <div className="text-gray-400">
                            Score: {tx.confidence_score ? Math.round(tx.confidence_score) : 'N/A'}/100
                          </div>
                        </div>
                      </div>
                    </div>
                  </div>
                </Link>
              );
            })}
          </div>
        </div>
        
        {hasMoreTransactions && (
          <Link href="/transactions" className="mt-2 block">
            <div className="flex items-center justify-end text-[10px] text-blue-400 pr-2 hover:underline">
              <span>View all transactions</span>
              <ChevronRight className="h-3 w-3 ml-0.5" />
              <span className="text-gray-400 ml-1">({transactions.length} total)</span>
            </div>
          </Link>
        )}
      </CardContent>
    </Card>
  );
} 