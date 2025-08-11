import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Progress } from "@/components/ui/progress";

interface SystemHealthData {
  cpuUsage: number;
  memoryUsage: number;
  dbLoad: number;
  ramUsage: number;
}

interface SystemHealthProps {
  healthData?: SystemHealthData;
  isLoading?: boolean;
}

export default function SystemHealth({ healthData, isLoading = false }: SystemHealthProps) {
  const getProgressColor = (value: number) => {
    if (value > 80) return "bg-red-500";
    if (value > 60) return "bg-yellow-500";
    return "bg-green-500";
  };

  const getProgressColorClass = (value: number) => {
    if (value > 80) return "bg-red-500";
    if (value > 60) return "bg-yellow-500";
    return "bg-green-500";
  };

  if (isLoading) {
    return (
      <Card>
        <CardHeader>
          <CardTitle>System Health</CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          {[1, 2, 3].map((i) => (
            <div key={i} className="animate-pulse">
              <div className="flex justify-between text-sm mb-2">
                <div className="h-4 bg-gray-200 rounded w-20"></div>
                <div className="h-4 bg-gray-200 rounded w-10"></div>
              </div>
              <div className="h-2 bg-gray-200 rounded-full"></div>
            </div>
          ))}
        </CardContent>
      </Card>
    );
  }

  // Use sample data if none provided
  const health = healthData || {
    cpuUsage: 45,
    memoryUsage: 68,
    dbLoad: 32,
    ramUsage: 68
  };

  const healthMetrics = [
    { label: "CPU Usage", value: health.cpuUsage, key: "cpu" },
    { label: "Memory Usage", value: health.memoryUsage, key: "memory" },
    { label: "Database Load", value: health.dbLoad, key: "database" }
  ];

  return (
    <Card>
      <CardHeader>
        <CardTitle data-testid="text-system-health-title">System Health</CardTitle>
      </CardHeader>
      <CardContent className="space-y-4">
        {healthMetrics.map((metric) => (
          <div key={metric.key}>
            <div className="flex justify-between text-sm">
              <span className="font-medium text-gray-700" data-testid={`text-${metric.key}-label`}>
                {metric.label}
              </span>
              <span data-testid={`text-${metric.key}-value`}>
                {metric.value}%
              </span>
            </div>
            <div className="mt-2 bg-gray-200 rounded-full h-2">
              <div 
                className={`h-2 rounded-full transition-all duration-300 ${getProgressColorClass(metric.value)}`}
                style={{ width: `${metric.value}%` }}
                data-testid={`progress-${metric.key}`}
              ></div>
            </div>
          </div>
        ))}
      </CardContent>
    </Card>
  );
}
