import { useQuery } from "@tanstack/react-query";
import DashboardLayout from "@/components/layout/sidebar";
import StatsCard from "@/components/dashboard/stats-card";
import ActivityFeed from "@/components/dashboard/activity-feed";
import SystemHealth from "@/components/dashboard/system-health";

export default function Dashboard() {
  const { data: stats, isLoading: statsLoading } = useQuery({
    queryKey: ["/api/dashboard/stats"],
  });

  const { data: health, isLoading: healthLoading } = useQuery({
    queryKey: ["/api/dashboard/health"],
  });

  const { data: activity, isLoading: activityLoading } = useQuery({
    queryKey: ["/api/dashboard/activity"],
  });

  const statsCards = [
    {
      title: "Active Sessions",
      value: stats?.activeSessions ?? 0,
      icon: "fas fa-link",
      color: "green",
    },
    {
      title: "Active Workers",
      value: stats?.activeWorkers ?? 0,
      icon: "fas fa-cogs",
      color: "blue",
    },
    {
      title: "Messages Today",
      value: stats?.messagesToday ?? 0,
      icon: "fas fa-paper-plane",
      color: "purple",
    },
    {
      title: "Total Users",
      value: stats?.totalUsers ?? 0,
      icon: "fas fa-users",
      color: "yellow",
    },
  ];

  return (
    <DashboardLayout>
      <div className="p-6">
        <div className="mb-6">
          <h2 className="text-2xl font-medium text-gray-900" data-testid="text-dashboard-title">
            Dashboard Overview
          </h2>
          <p className="text-gray-600 mt-1" data-testid="text-dashboard-subtitle">
            Monitor your Telegram forwarding infrastructure
          </p>
        </div>

        {/* Stats Cards */}
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6 mb-8">
          {statsCards.map((card, index) => (
            <StatsCard
              key={index}
              title={card.title}
              value={card.value}
              icon={card.icon}
              color={card.color}
              isLoading={statsLoading}
              data-testid={`card-stat-${index}`}
            />
          ))}
        </div>

        {/* Recent Activity & System Health */}
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
          <ActivityFeed
            activities={activity || []}
            isLoading={activityLoading}
            data-testid="component-activity-feed"
          />
          <SystemHealth
            healthData={health}
            isLoading={healthLoading}
            data-testid="component-system-health"
          />
        </div>
      </div>
    </DashboardLayout>
  );
}
