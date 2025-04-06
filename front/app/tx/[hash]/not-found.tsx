import Link from 'next/link';
import { Button } from '@/components/ui/button';

export default function TransactionNotFound() {
  return (
    <>
    <div className="flex-1 flex flex-col items-center justify-center min-h-screen bg-[#0B0F19] p-8 text-center">
      <div className="bg-[#0F172A] border border-[#2C3E50] rounded-lg p-8 max-w-md w-full shadow-md">
        <div className="mb-6">
          <div className="w-16 h-16 mx-auto mb-6 bg-[#131C2E] rounded-full flex items-center justify-center border border-[#2C3E50]">
            <svg xmlns="http://www.w3.org/2000/svg" className="h-8 w-8 text-red-500" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
            </svg>
          </div>
          <h1 className="text-2xl font-bold text-white mb-3">Transaction Not Found</h1>
        </div>
        
        <div className="mb-8">
          <p className="text-gray-300 mb-4">
            The transaction you&apos;re looking for doesn&apos;t exist or hasn&apos;t been analyzed by Sentinel AI yet.
          </p>
          
          <p className="text-gray-400">
            Please verify that you&apos;ve entered the correct transaction hash and try again.
          </p>
        </div>
        
        <Link href="/dashboard">
          <Button className="w-full bg-[#131C2E] hover:bg-[#1A202C] text-white transition-colors border border-[#2C3E50]">
            Return to Dashboard
          </Button>
        </Link>
      </div>
    </div>
    </>
  );
} 