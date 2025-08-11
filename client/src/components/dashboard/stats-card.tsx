import { cn } from "@/lib/utils";

interface StatsCardProps {
  title: string;
  value: number | string;
  icon: string;
  color: "green" | "blue" | "purple" | "yellow";
  isLoading?: boolean;
}

export default function StatsCard({ title, value, icon, color, isLoading = false }: StatsCardProps) {
  const colorClasses = {
    green: "bg-green-100 text-green-600",
    blue: "bg-blue-100 text-[#1976D2]", 
    purple: "bg-purple-100 text-purple-600",
    yellow: "bg-yellow-100 text-yellow-600",
  };

  if (isLoading) {
    return (
      <div className="bg-white rounded-lg shadow-sm p-6 border animate-pulse">
        <div className="flex items-center">
          <div className="rounded-lg p-3 w-12 h-12 bg-gray-200"></div>
          <div className="ml-4 flex-1">
            <div className="h-4 bg-gray-200 rounded mb-2"></div>
            <div className="h-6 bg-gray-200 rounded w-16"></div>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="bg-white rounded-lg shadow-sm p-6 border">
      <div className="flex items-center">
        <div className={cn("rounded-lg p-3", colorClasses[color])}>
          <i className={`${icon} text-xl`}></i>
        </div>
        <div className="ml-4">
          <p className="text-sm font-medium text-gray-600" data-testid={`text-${title.toLowerCase().replace(/\s+/g, '-')}-label`}>
            {title}
          </p>
          <p className="text-2xl font-bold text-gray-900" data-testid={`text-${title.toLowerCase().replace(/\s+/g, '-')}-value`}>
            {typeof value === 'number' ? value.toLocaleString() : value}
          </p>
        </div>
      </div>
    </div>
  );
}
