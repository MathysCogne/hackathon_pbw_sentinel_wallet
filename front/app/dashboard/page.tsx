import { redirect } from 'next/navigation';
import { getSession } from '@/app/actions';
import { 
  DashboardHeader, 
  StatCard, 
  XRPStats, 
  SentinelSettings, 
  AIAssistant,
  SchedulesSettings,
  TransactionsList
} from "@/components/dashboard";

export default async function DashboardPage() {
  const { user } = await getSession();

  if (!user) {
    redirect('/');
  }

  return (
    <div className="flex-1 space-y-4 sm:space-y-6 p-3 sm:p-4 md:p-6 bg-[#0B0F19] min-h-screen">
      <DashboardHeader user={user.walletAddress} />


      <div className="grid gap-6 grid-rows-2">
        <div className="grid gap-6 md:grid-cols-3">
          {/* First card: XRP Statistics */}
          <XRPStats />

          {/* Second card: Sentinel Settings */}
          <SentinelSettings />

          {/* Third card: Planification */}
          <SchedulesSettings />
        </div>
        <div className="grid gap-6 md:grid-cols-2">
          {/* Third section: AI Chat Bot (full width) */}
          <AIAssistant />

          {/* Fourth section: Transactions List */}
          <TransactionsList />
        </div>
      </div>
    </div>
  );
} 