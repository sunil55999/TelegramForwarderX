import { useQuery } from "@tanstack/react-query";
import DashboardLayout from "@/components/layout/sidebar";
import WorkerCard from "@/components/workers/worker-card";

export default function Workers() {
  const { data: workers, isLoading } = useQuery({
    queryKey: ["/api/workers"],
  });

  return (
    <DashboardLayout>
      <div className="p-6">
        <div className="mb-6">
          <h2 className="text-2xl font-medium text-gray-900" data-testid="text-workers-title">
            Worker Management
          </h2>
          <p className="text-gray-600 mt-1" data-testid="text-workers-subtitle">
            Monitor and manage forwarding workers
          </p>
        </div>

        {isLoading ? (
          <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
            {[1, 2, 3].map((i) => (
              <div key={i} className="bg-white rounded-lg shadow-sm border p-6 animate-pulse">
                <div className="h-6 bg-gray-200 rounded mb-4"></div>
                <div className="space-y-3">
                  <div className="h-4 bg-gray-200 rounded"></div>
                  <div className="h-2 bg-gray-200 rounded"></div>
                  <div className="h-4 bg-gray-200 rounded"></div>
                  <div className="h-2 bg-gray-200 rounded"></div>
                </div>
              </div>
            ))}
          </div>
        ) : (
          <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
            {(workers as any[] || []).map((worker: any) => (
              <WorkerCard key={worker.id} worker={worker} data-testid={`card-worker-${worker.id}`} />
            ))}
          </div>
        )}
      </div>
    </DashboardLayout>
  );
}
