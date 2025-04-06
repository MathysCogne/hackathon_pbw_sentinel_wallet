import { Metadata } from "next";
import Link from "next/link";
import { notFound } from "next/navigation";
import { getTransactionAnalysis } from '@/lib/supabase';
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import Markdown from 'react-markdown';

export const dynamic = 'force-dynamic';

type Props = {
  params: Promise<{ hash: string }>;
  searchParams: Promise<{ [key: string]: string | string[] | undefined }>;
};

export async function generateMetadata({ params }: Props): Promise<Metadata> {
  const resolvedParams = await params;
  return {
    title: `Transaction ${resolvedParams.hash.substring(0, 8)}... | Sentinel Wallet`,
    description: "Detailed transaction analysis by Sentinel AI",
  };
}

export default async function TransactionPage({ params }: Props) {
  const resolvedParams = await params;
  const { hash } = resolvedParams;
  const transaction = await getTransactionAnalysis(hash);
  
  if (!transaction) {
    notFound();
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
  
  // Determine recommendation CSS class and badge
  const getRecommendationInfo = (recommendation: string) => {
    switch (recommendation) {
      case 'SIGN':
        return {
          class: 'bg-green-500/20 text-green-500 border-green-500/50',
          text: 'APPROVED',
          icon: '✅'
        };
      case 'REJECT':
        return {
          class: 'bg-red-500/20 text-red-500 border-red-500/50',
          text: 'REJECTED',
          icon: '❌'
        };
      case 'REVIEW':
        return {
          class: 'bg-yellow-500/20 text-yellow-500 border-yellow-500/50',
          text: 'REVIEW NEEDED',
          icon: '⚠️'
        };
      default:
        return {
          class: 'bg-gray-500/20 text-gray-500 border-gray-500/50',
          text: 'UNKNOWN',
          icon: '❓'
        };
    }
  };
  
  // Format amount
  const formatAmount = (amount: string | null, currency: string | null) => {
    if (!amount) return 'N/A';
    return `${parseFloat(amount).toLocaleString('en-US', { maximumFractionDigits: 6 })} ${currency || 'XRP'}`;
  };

  // Generate AI analysis markdown
  const generateAiAnalysisMarkdown = () => {
    if (!transaction.ai_response) return "No analysis available";
    
    // Convert the AI response to a more readable markdown format
    const lines = transaction.ai_response.split('\n');
    let markdown = '';
    
    markdown += `## Detailed Analysis\n`;
    markdown += transaction.ai_response
    return markdown;
  };
  
  const recommendationInfo = getRecommendationInfo(transaction.recommendation);
  const aiAnalysisMarkdown = generateAiAnalysisMarkdown();
  
  return (
    <div className="flex-1 p-6 bg-[#0B0F19] min-h-screen">
      {/* Header with Badge */}
      <div className="mb-6 flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4">
        <div>
          <h1 className="text-3xl font-bold text-white mb-1">Transaction Analysis</h1>
          <p className="text-gray-400">ID: {hash.substring(0, 12)}...{hash.substring(hash.length - 8)}</p>
        </div>
        
        <div className="flex gap-3 items-center">
          <div className={`px-4 py-1.5 rounded-full border ${recommendationInfo.class} font-semibold flex items-center`}>
            <span className="mr-1.5">{recommendationInfo.icon}</span>
            {recommendationInfo.text}
          </div>
          
          <Link href="/dashboard">
            <Button variant="outline" className="bg-[#1A202C] border-[#2C3E50] text-white hover:bg-[#1E293B] transition-colors">
              Return to Dashboard
            </Button>
          </Link>
        </div>
      </div>
      
      {/* Transaction Cards Row */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-6 mb-6">
        {/* Transaction Info Card */}
        <Card className="bg-[#0F172A] border-[#2C3E50] text-white shadow-md overflow-hidden">
          <CardHeader className="pb-4">
            <CardTitle>Transaction Details</CardTitle>
          </CardHeader>
          <CardContent className="space-y-5">
            <div>
              <h3 className="text-sm font-medium text-gray-400 mb-1">Transaction Hash</h3>
              <p className="font-mono text-sm break-all bg-[#131C2E] p-3 rounded border border-[#2C3E50]">
                {transaction.tx_hash}
              </p>
            </div>
            
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              <div>
                <h3 className="text-sm font-medium text-gray-400 mb-1">Sender</h3>
                <div className="font-mono text-sm break-all bg-[#131C2E] p-3 rounded border border-[#2C3E50] h-20 overflow-auto">
                  {transaction.sender_address || 'Not available'}
                </div>
              </div>
              
              <div>
                <h3 className="text-sm font-medium text-gray-400 mb-1">Recipient</h3>
                <div className="font-mono text-sm break-all bg-[#131C2E] p-3 rounded border border-[#2C3E50] h-20 overflow-auto">
                  {transaction.recipient_address || 'Not available'}
                </div>
              </div>
            </div>
            
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              <div>
                <h3 className="text-sm font-medium text-gray-400 mb-1">Amount</h3>
                <div className="bg-[#131C2E] p-3 rounded border border-[#2C3E50]">
                  <p className="text-xl font-bold text-white">
                    {formatAmount(transaction.amount, transaction.currency)}
                  </p>
                </div>
              </div>
              
              <div>
                <h3 className="text-sm font-medium text-gray-400 mb-1">Analysis Date</h3>
                <div className="bg-[#131C2E] p-3 rounded border border-[#2C3E50]">
                  <p className="text-white">{formatDate(transaction.timestamp)}</p>
                </div>
              </div>
            </div>
          </CardContent>
        </Card>
        
        {/* Confidence Score Card */}
        <Card className="bg-[#0F172A] border-[#2C3E50] text-white shadow-md overflow-hidden">
          <CardHeader className="pb-4">
            <CardTitle>Confidence Score</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="flex flex-col items-center justify-center h-full py-6">
              <div className="w-48 h-48 relative flex items-center justify-center mb-6">
                <svg viewBox="0 0 100 100" className="w-full h-full">
                  {/* Background circle */}
                  <circle 
                    cx="50" 
                    cy="50" 
                    r="45" 
                    fill="none" 
                    stroke="#2C3E50" 
                    strokeWidth="10"
                  />
                  
                  {/* Score circle with appropriate color */}
                  <circle 
                    cx="50" 
                    cy="50" 
                    r="45" 
                    fill="none" 
                    stroke={
                      transaction.confidence_score && transaction.confidence_score >= 80 
                        ? '#10B981' 
                        : transaction.confidence_score && transaction.confidence_score >= 50 
                          ? '#F59E0B' 
                          : '#EF4444'
                    }
                    strokeWidth="10"
                    strokeDasharray={`${(transaction.confidence_score || 0) * 2.83} 283`}
                    strokeDashoffset="0"
                    strokeLinecap="round"
                    transform="rotate(-90 50 50)"
                  />
                </svg>
                
                <div className="absolute flex flex-col items-center">
                  <span className="text-3xl font-bold">
                    {transaction.confidence_score ? Math.round(transaction.confidence_score) : 'N/A'}
                  </span>
                  <span className="text-gray-400 text-sm">out of 100</span>
                </div>
              </div>
              
              {transaction.risk_factors && transaction.risk_factors.length > 0 && (
                <div className="w-full">
                  <h3 className="text-base font-semibold text-white mb-2">Main Risk Factors</h3>
                  <ul className="space-y-1.5">
                    {transaction.risk_factors.slice(0, 6).map((factor, index) => (
                      <li key={index} className="flex items-start">
                        <span className="text-red-400 mr-2">•</span>
                        <span className="text-gray-300 text-sm">{factor}</span>
                      </li>
                    ))}
                    {transaction.risk_factors.length > 6 && (
                      <li className="text-sm text-gray-400 italic mt-1">
                        + {transaction.risk_factors.length - 3} more factors
                      </li>
                    )}
                  </ul>
                </div>
              )}
            </div>
          </CardContent>
        </Card>
      </div>
      
      {/* Full Analysis Card */}
      <Card className="bg-[#0F172A] border-[#2C3E50] text-white shadow-md overflow-hidden">
        <CardHeader className="pb-4">
          <CardTitle>Complete Sentinel AI Analysis</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="bg-[#131C2E] rounded-md border border-[#2C3E50] p-4 overflow-auto prose prose-invert max-w-none">
            {/* Markdown content */}
            <div className="prose prose-sm md:prose-base prose-invert max-w-none markdown-content">
              <Markdown>{aiAnalysisMarkdown}</Markdown>
            </div>
          </div>
        </CardContent>
      </Card>
    </div>
  );
} 