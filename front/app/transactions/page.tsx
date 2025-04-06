import { Metadata } from "next";
import Link from "next/link";
import { redirect } from 'next/navigation';
import { getSession } from '@/app/actions';
import { getUserTransactions } from '@/lib/supabase';
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { ChevronLeft, FileText, ShieldCheck } from "lucide-react";

export const metadata: Metadata = {
  title: "All Transactions | Sentinel Wallet",
  description: "History of all transactions secured by Sentinel AI"
};

export const dynamic = 'force-dynamic';

type Props = {
  params: Promise<{}>;
  searchParams: Promise<{ [key: string]: string | string[] | undefined }>;
};

export default async function TransactionsPage({}: Props) {
  const { user } = await getSession();

  if (!user) {
    redirect('/');
  }

  // Récupérer toutes les transactions de l'utilisateur
  const transactions = await getUserTransactions(user.walletAddress);

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
          text: 'PENDING SIGNATURE',
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

  return (
    <div className="flex-1 space-y-4 sm:space-y-6 p-3 sm:p-4 md:p-6 bg-[#0B0F19] min-h-screen">
      <div className="flex items-center justify-between mb-6">
        <div>
          <h1 className="text-3xl font-bold text-white">Transaction History</h1>
          <p className="text-gray-400 mt-1">All transactions secured by Sentinel AI</p>
        </div>
        <Link href="/dashboard">
          <Button variant="outline" className="bg-[#1A202C] border-[#2C3E50] text-white hover:bg-[#1E293B] transition-colors flex items-center">
            <ChevronLeft className="w-4 h-4 mr-1" />
            Back to Dashboard
          </Button>
        </Link>
      </div>

      <Card className="bg-[#101827] border-0 shadow-md">
        <CardHeader>
          <div className="flex items-center justify-between">
            <div>
              <CardTitle className="text-white text-xl font-medium">All Transactions</CardTitle>
              <CardDescription className="text-gray-400 text-sm">
                Complete history of multi-signed transactions secured by Sentinel
              </CardDescription>
            </div>
            <div className="bg-blue-900/20 py-1 px-3 rounded-md flex items-center text-blue-400 text-xs">
              <ShieldCheck className="h-3 w-3 mr-1" /> AI Signed
            </div>
          </div>
        </CardHeader>
        <CardContent className="p-4">
          {transactions.length === 0 ? (
            <div className="text-center p-10">
              <div className="mx-auto w-12 h-12 rounded-full bg-[#1a2234] flex items-center justify-center mb-3">
                <FileText className="h-6 w-6 text-blue-400" />
              </div>
              <p className="text-gray-300 text-sm mb-1">No transactions found</p>
              <p className="text-gray-500 text-xs max-w-[350px] mx-auto">
                Transactions will appear here once they are analyzed and multi-signed by Sentinel AI
              </p>
            </div>
          ) : (
            <div className="space-y-3">
              {transactions.map((tx) => {
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
                      <div className="p-3 sm:p-4">
                        <div className="flex items-center justify-between">
                          <div className="flex items-center gap-3">
                            <div className="flex-shrink-0">
                              {tx.recommendation === 'SIGN' ? 
                                <ShieldCheck className="w-5 h-5 text-green-400" /> : 
                                <FileText className="w-5 h-5 text-blue-400" />}
                            </div>
                            <div className="min-w-0 flex-1">
                              <h3 className="text-white text-sm font-medium truncate max-w-[300px] sm:max-w-[400px]">
                                {tx.tx_hash}
                              </h3>
                              <div className="flex items-center gap-2 mt-1">
                                <div className="flex items-center">
                                  <span className="text-gray-400 text-xs">Amount:</span>
                                  <span className="font-medium text-white ml-1 text-xs">
                                    {tx.amount ? parseFloat(tx.amount).toLocaleString('en-US', { maximumFractionDigits: 6 }) : 'N/A'} {tx.currency || 'XRP'}
                                  </span>
                                </div>
                              </div>
                            </div>
                          </div>
                          
                          <div className="flex flex-col items-end text-xs">
                            <div className="flex items-center mb-1">
                              {getStatusIndicator(tx.recommendation)}
                              <span className="text-[10px] text-gray-400 ml-1">{recommendation.text}</span>
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
          )}
        </CardContent>
      </Card>
    </div>
  );
} 