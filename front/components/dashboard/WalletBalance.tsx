import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";

interface WalletBalanceProps {
  balance: string;
  change: string;
}

export function WalletBalance({ balance, change }: WalletBalanceProps) {
  // Determine if the change is positive
  const isPositive = change.startsWith('+');
  
  return (
	<>
    <Card className="bg-[#0F172A] border-[#2C3E50] text-white overflow-hidden shadow-lg">
      <CardHeader className="border-b border-[#2C3E50] bg-[#1A202C]">
        <CardTitle>Wallet Balance</CardTitle>
      </CardHeader>
      <CardContent className="p-4">
        <div className="flex items-center justify-between">
          <div>
            <p className="text-3xl font-bold text-white mb-1">{balance}</p>
            <div className={`flex items-center text-sm ${isPositive ? 'text-emerald-500' : 'text-red-500'}`}>
              {isPositive ? (
                <svg xmlns="http://www.w3.org/2000/svg" className="h-4 w-4 mr-1" viewBox="0 0 20 20" fill="currentColor">
                  <path fillRule="evenodd" d="M3.293 9.707a1 1 0 010-1.414l6-6a1 1 0 011.414 0l6 6a1 1 0 01-1.414 1.414L11 5.414V17a1 1 0 11-2 0V5.414L4.707 9.707a1 1 0 01-1.414 0z" clipRule="evenodd" />
                </svg>
              ) : (
                <svg xmlns="http://www.w3.org/2000/svg" className="h-4 w-4 mr-1" viewBox="0 0 20 20" fill="currentColor">
                  <path fillRule="evenodd" d="M16.707 10.293a1 1 0 010 1.414l-6 6a1 1 0 01-1.414 0l-6-6a1 1 0 111.414-1.414L9 14.586V3a1 1 0 012 0v11.586l4.293-4.293a1 1 0 011.414 0z" clipRule="evenodd" />
                </svg>
              )}
              <span>{change} this month</span>
            </div>
          </div>
        </div>
      </CardContent>
    </Card>
	</>
  );
} 