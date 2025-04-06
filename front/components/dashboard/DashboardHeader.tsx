import { Button } from "@/components/ui/button";

export function DashboardHeader({ user }: { user: string }) {
  return (
    <div className="flex items-center justify-between mb-8">
      <div>
        <h2 className="text-2xl font-bold tracking-tight text-white">Welcome back, {user || "User"}</h2>
        <p className="text-gray-400 font-bold mt-1">Not Just a Wallet. A Sentinel.</p>
      </div>
      <div className="flex items-center space-x-3">
        <Button className="bg-[#1F2937] hover:bg-[#2D3748] text-white border-0">Settings</Button>
        <Button variant="outline" className="border-gray-700 text-gray-300 hover:bg-[#1F2937] hover:text-white">Logout</Button>
      </div>
    </div>
  );
} 