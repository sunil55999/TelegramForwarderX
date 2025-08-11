import { useState } from "react";
import { useQuery } from "@tanstack/react-query";
import { Filter, Download, RefreshCw } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Badge } from "@/components/ui/badge";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import DashboardLayout from "@/components/layout/sidebar";

interface ForwardingLog {
  id: string;
  mappingId?: string;
  sourceName?: string;
  destinationName?: string;
  messageType: string;
  originalText?: string;
  processedText?: string;
  status: string;
  filterReason?: string;
  errorMessage?: string;
  processingTime?: number;
  createdAt: string;
}

export default function LogsPage() {
  const [statusFilter, setStatusFilter] = useState<string>("all");

  const { data: logs = [], isLoading, refetch } = useQuery<ForwardingLog[]>({
    queryKey: ["/api/forwarding/logs", { status: statusFilter === "all" ? undefined : statusFilter }],
    refetchInterval: 10000, // Refresh every 10 seconds
  });

  const getStatusBadge = (status: string) => {
    const variants: Record<string, "default" | "secondary" | "destructive" | "outline"> = {
      success: "default",
      filtered: "secondary", 
      error: "destructive",
      test: "outline",
    };
    
    return <Badge variant={variants[status] || "outline"}>{status}</Badge>;
  };

  const formatProcessingTime = (time?: number) => {
    if (!time) return "N/A";
    return `${time}ms`;
  };

  const truncateText = (text?: string, maxLength = 50) => {
    if (!text) return "N/A";
    return text.length > maxLength ? `${text.substring(0, maxLength)}...` : text;
  };

  const exportLogs = () => {
    const csvContent = [
      ["Timestamp", "Source", "Destination", "Type", "Status", "Original Text", "Processed Text", "Processing Time", "Error/Filter Reason"].join(","),
      ...logs.map(log => [
        new Date(log.createdAt).toLocaleString(),
        log.sourceName || "Unknown",
        log.destinationName || "Unknown", 
        log.messageType,
        log.status,
        `"${(log.originalText || "").replace(/"/g, '""')}"`,
        `"${(log.processedText || "").replace(/"/g, '""')}"`,
        log.processingTime || 0,
        `"${(log.filterReason || log.errorMessage || "").replace(/"/g, '""')}"`
      ].join(","))
    ].join("\n");

    const blob = new Blob([csvContent], { type: "text/csv" });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = `forwarding_logs_${new Date().toISOString().split('T')[0]}.csv`;
    a.click();
    URL.revokeObjectURL(url);
  };

  return (
    <DashboardLayout>
      <div className="p-6">
        <div className="flex justify-between items-center mb-6">
          <div>
            <h2 className="text-2xl font-medium text-gray-900">
              Forwarding Logs
            </h2>
            <p className="text-gray-600 mt-1">
              Monitor message processing and forwarding activity
            </p>
          </div>
          
          <div className="flex items-center space-x-2">
            <Select value={statusFilter} onValueChange={setStatusFilter}>
              <SelectTrigger className="w-40">
                <SelectValue placeholder="Filter by status" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">All Status</SelectItem>
                <SelectItem value="success">Success</SelectItem>
                <SelectItem value="filtered">Filtered</SelectItem>
                <SelectItem value="error">Error</SelectItem>
                <SelectItem value="test">Test Mode</SelectItem>
              </SelectContent>
            </Select>
            
            <Button variant="outline" onClick={() => refetch()}>
              <RefreshCw className="w-4 h-4 mr-2" />
              Refresh
            </Button>
            
            <Button variant="outline" onClick={exportLogs}>
              <Download className="w-4 h-4 mr-2" />
              Export CSV
            </Button>
          </div>
        </div>

        <Card>
          <CardHeader>
            <CardTitle className="flex items-center">
              <Filter className="w-5 h-5 mr-2" />
              Processing Logs ({logs.length} entries)
            </CardTitle>
          </CardHeader>
          <CardContent>
            {isLoading ? (
              <div className="text-center py-8">
                <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-600 mx-auto"></div>
                <p className="mt-2 text-gray-600">Loading logs...</p>
              </div>
            ) : logs.length === 0 ? (
              <div className="text-center py-8 text-gray-500">
                <Filter className="w-12 h-12 mx-auto mb-4 text-gray-300" />
                <p>No forwarding logs found</p>
                <p className="text-sm">Logs will appear here once messages start being processed</p>
              </div>
            ) : (
              <div className="overflow-x-auto">
                <Table>
                  <TableHeader>
                    <TableRow>
                      <TableHead>Timestamp</TableHead>
                      <TableHead>Source → Destination</TableHead>
                      <TableHead>Type</TableHead>
                      <TableHead>Status</TableHead>
                      <TableHead>Original Text</TableHead>
                      <TableHead>Processed Text</TableHead>
                      <TableHead>Time</TableHead>
                      <TableHead>Reason/Error</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {logs.map((log) => (
                      <TableRow key={log.id}>
                        <TableCell className="text-sm">
                          {new Date(log.createdAt).toLocaleString()}
                        </TableCell>
                        <TableCell>
                          <div className="text-sm">
                            <div className="font-medium">{log.sourceName || "Unknown"}</div>
                            <div className="text-gray-500">→ {log.destinationName || "Unknown"}</div>
                          </div>
                        </TableCell>
                        <TableCell>
                          <Badge variant="outline">{log.messageType}</Badge>
                        </TableCell>
                        <TableCell>
                          {getStatusBadge(log.status)}
                        </TableCell>
                        <TableCell>
                          <div className="max-w-xs">
                            <span className="text-sm" title={log.originalText}>
                              {truncateText(log.originalText)}
                            </span>
                          </div>
                        </TableCell>
                        <TableCell>
                          <div className="max-w-xs">
                            <span className="text-sm" title={log.processedText}>
                              {truncateText(log.processedText)}
                            </span>
                          </div>
                        </TableCell>
                        <TableCell className="text-sm">
                          {formatProcessingTime(log.processingTime)}
                        </TableCell>
                        <TableCell>
                          {log.filterReason || log.errorMessage ? (
                            <div className="max-w-xs">
                              <span className="text-sm text-gray-600" title={log.filterReason || log.errorMessage}>
                                {truncateText(log.filterReason || log.errorMessage)}
                              </span>
                            </div>
                          ) : (
                            <span className="text-gray-400">-</span>
                          )}
                        </TableCell>
                      </TableRow>
                    ))}
                  </TableBody>
                </Table>
              </div>
            )}
          </CardContent>
        </Card>
      </div>
    </DashboardLayout>
  );
}