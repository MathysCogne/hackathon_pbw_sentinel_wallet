import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";

interface StatCardProps {
  title: string;
  value: string;
  description: string;
  trend?: "up" | "down" | "neutral";
}

export function StatCard({ title, value, description, trend = "neutral" }: StatCardProps) {
  return (
    <Card className="bg-[#0F172A] border-[#2C3E50] text-white overflow-hidden shadow-lg">
      <CardHeader className="border-b border-[#2C3E50] bg-[#1A202C]">
        <CardTitle className="flex items-center justify-between">
          <span>{title}</span>
          {trend !== "neutral" && (
            <div className={`flex items-center text-xs ${trend === "up" ? 'text-emerald-500' : 'text-red-500'}`}>
              {trend === "up" ? (
                <svg xmlns="http://www.w3.org/2000/svg" className="h-4 w-4" viewBox="0 0 20 20" fill="currentColor">
                  <path fillRule="evenodd" d="M3.293 9.707a1 1 0 010-1.414l6-6a1 1 0 011.414 0l6 6a1 1 0 01-1.414 1.414L11 5.414V17a1 1 0 11-2 0V5.414L4.707 9.707a1 1 0 01-1.414 0z" clipRule="evenodd" />
                </svg>
              ) : (
                <svg xmlns="http://www.w3.org/2000/svg" className="h-4 w-4" viewBox="0 0 20 20" fill="currentColor">
                  <path fillRule="evenodd" d="M16.707 10.293a1 1 0 010 1.414l-6 6a1 1 0 01-1.414 0l-6-6a1 1 0 111.414-1.414L9 14.586V3a1 1 0 012 0v11.586l4.293-4.293a1 1 0 011.414 0z" clipRule="evenodd" />
                </svg>
              )}
            </div>
          )}
        </CardTitle>
      </CardHeader>
      <CardContent className="p-4">
        <p className="text-3xl font-bold text-white mb-1">{value}</p>
        <CardDescription className="text-gray-400">{description}</CardDescription>
      </CardContent>
    </Card>
  );
} 