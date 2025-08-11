import { useState } from 'react';
import { useQuery } from '@tanstack/react-query';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Badge } from '@/components/ui/badge';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { LineChart, Line, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, BarChart, Bar, PieChart, Pie, Cell } from 'recharts';
import { Download, TrendingUp, TrendingDown, Activity, MessageSquare, Filter, AlertCircle } from 'lucide-react';
import DashboardLayout from '@/components/layout/sidebar';

interface StatisticsOverview {
  overview: {
    total_forwarded: number;
    total_filtered: number;
    total_errors: number;
    total_bytes_processed: number;
    success_rate: number;
  };
  daily_stats: Array<{
    date: string;
    forwarded: number;
    filtered: number;
    errors: number;
    bytes_processed: number;
  }>;
  top_mappings: Array<{
    id: string;
    source_name: string;
    destination_name: string;
    total_messages: number;
    successful: number;
    filtered: number;
    errors: number;
    avg_processing_time: number;
  }>;
}

export default function Statistics() {
  const [selectedPeriod, setSelectedPeriod] = useState('daily');
  const [selectedDays, setSelectedDays] = useState(7);

  const { data: overview, isLoading } = useQuery<StatisticsOverview>({
    queryKey: ['/api/statistics/overview', selectedPeriod, selectedDays],
    queryFn: async () => {
      const response = await fetch(`/api/statistics/overview?period=${selectedPeriod}&days=${selectedDays}`, {
        headers: {
          'Authorization': `Bearer ${localStorage.getItem('token')}`
        }
      });
      if (!response.ok) throw new Error('Failed to fetch statistics overview');
      return response.json();
    }
  });

  const handleExport = async (format: string) => {
    try {
      const response = await fetch(`/api/statistics/export?format=${format}&period=${selectedPeriod}`, {
        headers: {
          'Authorization': `Bearer ${localStorage.getItem('token')}`
        }
      });
      if (!response.ok) throw new Error('Failed to export statistics');
      
      const data = await response.json();
      const blob = new Blob([JSON.stringify(data, null, 2)], { type: 'application/json' });
      const url = URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = url;
      a.download = `statistics-${format}-${new Date().toISOString().split('T')[0]}.${format}`;
      document.body.appendChild(a);
      a.click();
      document.body.removeChild(a);
      URL.revokeObjectURL(url);
    } catch (error) {
      console.error('Export failed:', error);
    }
  };

  const formatBytes = (bytes: number) => {
    if (bytes === 0) return '0 B';
    const k = 1024;
    const sizes = ['B', 'KB', 'MB', 'GB'];
    const i = Math.floor(Math.log(bytes) / Math.log(k));
    return parseFloat((bytes / Math.pow(k, i)).toFixed(2)) + ' ' + sizes[i];
  };

  const formatNumber = (num: number) => {
    return new Intl.NumberFormat().format(num);
  };

  const getSuccessRateColor = (rate: number) => {
    if (rate >= 95) return 'text-green-600';
    if (rate >= 85) return 'text-yellow-600';
    return 'text-red-600';
  };

  const pieChartColors = ['#10B981', '#F59E0B', '#EF4444', '#8B5CF6'];

  if (isLoading) {
    return (
      <DashboardLayout>
        <div className="p-6">
          <div className="flex items-center justify-center h-64">
            <div className="text-lg">Loading statistics...</div>
          </div>
        </div>
      </DashboardLayout>
    );
  }

  const pieChartData = overview ? [
    { name: 'Forwarded', value: overview.overview.total_forwarded, color: '#10B981' },
    { name: 'Filtered', value: overview.overview.total_filtered, color: '#F59E0B' },
    { name: 'Errors', value: overview.overview.total_errors, color: '#EF4444' }
  ].filter(item => item.value > 0) : [];

  return (
    <DashboardLayout>
      <div className="p-6">
        <div className="flex justify-between items-center mb-6">
          <div>
            <h1 className="text-3xl font-bold">System Statistics</h1>
            <p className="text-gray-600">Monitor message processing performance and trends</p>
          </div>
          <div className="flex items-center space-x-4">
            <Select value={selectedPeriod} onValueChange={setSelectedPeriod}>
              <SelectTrigger className="w-32">
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="hourly">Hourly</SelectItem>
                <SelectItem value="daily">Daily</SelectItem>
                <SelectItem value="weekly">Weekly</SelectItem>
                <SelectItem value="monthly">Monthly</SelectItem>
              </SelectContent>
            </Select>
            <Select value={selectedDays.toString()} onValueChange={(value) => setSelectedDays(parseInt(value))}>
              <SelectTrigger className="w-32">
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="7">Last 7 days</SelectItem>
                <SelectItem value="14">Last 14 days</SelectItem>
                <SelectItem value="30">Last 30 days</SelectItem>
                <SelectItem value="90">Last 90 days</SelectItem>
              </SelectContent>
            </Select>
            <Button variant="outline" onClick={() => handleExport('json')}>
              <Download className="w-4 h-4 mr-2" />
              Export
            </Button>
          </div>
        </div>

        {overview && (
          <>
            {/* Overview Cards */}
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-5 gap-6 mb-8">
              <Card>
                <CardContent className="p-4">
                  <div className="flex items-center justify-between">
                    <div>
                      <p className="text-sm font-medium text-gray-600">Messages Forwarded</p>
                      <p className="text-2xl font-bold text-green-600">
                        {formatNumber(overview.overview.total_forwarded)}
                      </p>
                    </div>
                    <MessageSquare className="h-8 w-8 text-green-600" />
                  </div>
                </CardContent>
              </Card>

              <Card>
                <CardContent className="p-4">
                  <div className="flex items-center justify-between">
                    <div>
                      <p className="text-sm font-medium text-gray-600">Messages Filtered</p>
                      <p className="text-2xl font-bold text-yellow-600">
                        {formatNumber(overview.overview.total_filtered)}
                      </p>
                    </div>
                    <Filter className="h-8 w-8 text-yellow-600" />
                  </div>
                </CardContent>
              </Card>

              <Card>
                <CardContent className="p-4">
                  <div className="flex items-center justify-between">
                    <div>
                      <p className="text-sm font-medium text-gray-600">Errors</p>
                      <p className="text-2xl font-bold text-red-600">
                        {formatNumber(overview.overview.total_errors)}
                      </p>
                    </div>
                    <AlertCircle className="h-8 w-8 text-red-600" />
                  </div>
                </CardContent>
              </Card>

              <Card>
                <CardContent className="p-4">
                  <div className="flex items-center justify-between">
                    <div>
                      <p className="text-sm font-medium text-gray-600">Data Processed</p>
                      <p className="text-2xl font-bold text-blue-600">
                        {formatBytes(overview.overview.total_bytes_processed)}
                      </p>
                    </div>
                    <Activity className="h-8 w-8 text-blue-600" />
                  </div>
                </CardContent>
              </Card>

              <Card>
                <CardContent className="p-4">
                  <div className="flex items-center justify-between">
                    <div>
                      <p className="text-sm font-medium text-gray-600">Success Rate</p>
                      <p className={`text-2xl font-bold ${getSuccessRateColor(overview.overview.success_rate)}`}>
                        {overview.overview.success_rate.toFixed(1)}%
                      </p>
                    </div>
                    {overview.overview.success_rate >= 95 ? (
                      <TrendingUp className="h-8 w-8 text-green-600" />
                    ) : (
                      <TrendingDown className="h-8 w-8 text-red-600" />
                    )}
                  </div>
                </CardContent>
              </Card>
            </div>

            <Tabs defaultValue="timeline" className="space-y-6">
              <TabsList>
                <TabsTrigger value="timeline">Timeline</TabsTrigger>
                <TabsTrigger value="distribution">Distribution</TabsTrigger>
                <TabsTrigger value="mappings">Top Mappings</TabsTrigger>
              </TabsList>

              <TabsContent value="timeline">
                <Card>
                  <CardHeader>
                    <CardTitle>Message Processing Timeline</CardTitle>
                    <CardDescription>
                      Daily message processing activity over the selected period
                    </CardDescription>
                  </CardHeader>
                  <CardContent>
                    <div style={{ width: '100%', height: 400 }}>
                      <ResponsiveContainer>
                        <LineChart data={overview.daily_stats}>
                          <CartesianGrid strokeDasharray="3 3" />
                          <XAxis 
                            dataKey="date" 
                            tick={{ fontSize: 12 }}
                            tickFormatter={(value) => new Date(value).toLocaleDateString()}
                          />
                          <YAxis tick={{ fontSize: 12 }} />
                          <Tooltip 
                            labelFormatter={(value) => new Date(value).toLocaleDateString()}
                            formatter={(value, name) => [formatNumber(value as number), name]}
                          />
                          <Line 
                            type="monotone" 
                            dataKey="forwarded" 
                            stroke="#10B981" 
                            strokeWidth={2}
                            name="Forwarded"
                          />
                          <Line 
                            type="monotone" 
                            dataKey="filtered" 
                            stroke="#F59E0B" 
                            strokeWidth={2}
                            name="Filtered"
                          />
                          <Line 
                            type="monotone" 
                            dataKey="errors" 
                            stroke="#EF4444" 
                            strokeWidth={2}
                            name="Errors"
                          />
                        </LineChart>
                      </ResponsiveContainer>
                    </div>
                  </CardContent>
                </Card>
              </TabsContent>

              <TabsContent value="distribution">
                <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
                  <Card>
                    <CardHeader>
                      <CardTitle>Message Distribution</CardTitle>
                      <CardDescription>
                        Breakdown of message processing results
                      </CardDescription>
                    </CardHeader>
                    <CardContent>
                      <div style={{ width: '100%', height: 300 }}>
                        <ResponsiveContainer>
                          <PieChart>
                            <Pie
                              data={pieChartData}
                              cx="50%"
                              cy="50%"
                              outerRadius={80}
                              dataKey="value"
                              label={({ name, value }) => `${name}: ${formatNumber(value)}`}
                            >
                              {pieChartData.map((entry, index) => (
                                <Cell key={`cell-${index}`} fill={entry.color} />
                              ))}
                            </Pie>
                            <Tooltip formatter={(value) => formatNumber(value as number)} />
                          </PieChart>
                        </ResponsiveContainer>
                      </div>
                    </CardContent>
                  </Card>

                  <Card>
                    <CardHeader>
                      <CardTitle>Daily Totals</CardTitle>
                      <CardDescription>
                        Total messages processed per day
                      </CardDescription>
                    </CardHeader>
                    <CardContent>
                      <div style={{ width: '100%', height: 300 }}>
                        <ResponsiveContainer>
                          <BarChart data={overview.daily_stats}>
                            <CartesianGrid strokeDasharray="3 3" />
                            <XAxis 
                              dataKey="date" 
                              tick={{ fontSize: 12 }}
                              tickFormatter={(value) => new Date(value).toLocaleDateString()}
                            />
                            <YAxis tick={{ fontSize: 12 }} />
                            <Tooltip 
                              labelFormatter={(value) => new Date(value).toLocaleDateString()}
                              formatter={(value) => formatNumber(value as number)}
                            />
                            <Bar dataKey="forwarded" fill="#10B981" name="Forwarded" />
                          </BarChart>
                        </ResponsiveContainer>
                      </div>
                    </CardContent>
                  </Card>
                </div>
              </TabsContent>

              <TabsContent value="mappings">
                <Card>
                  <CardHeader>
                    <CardTitle>Top Performing Mappings</CardTitle>
                    <CardDescription>
                      Most active forwarding mappings with performance metrics
                    </CardDescription>
                  </CardHeader>
                  <CardContent>
                    <div className="space-y-4">
                      {overview.top_mappings.map((mapping, index) => (
                        <div key={mapping.id} className="flex items-center justify-between p-4 bg-gray-50 rounded-lg">
                          <div className="flex-1">
                            <div className="flex items-center space-x-2">
                              <Badge variant="secondary">#{index + 1}</Badge>
                              <h4 className="font-medium">
                                {mapping.source_name} → {mapping.destination_name}
                              </h4>
                            </div>
                            <div className="flex items-center space-x-4 mt-2 text-sm text-gray-600">
                              <span>Total: {formatNumber(mapping.total_messages)}</span>
                              <span className="text-green-600">Success: {formatNumber(mapping.successful)}</span>
                              <span className="text-yellow-600">Filtered: {formatNumber(mapping.filtered)}</span>
                              <span className="text-red-600">Errors: {formatNumber(mapping.errors)}</span>
                              {mapping.avg_processing_time && (
                                <span>Avg Time: {mapping.avg_processing_time.toFixed(2)}ms</span>
                              )}
                            </div>
                          </div>
                          <div className="text-right">
                            <div className="text-lg font-bold">
                              {((mapping.successful / mapping.total_messages) * 100).toFixed(1)}%
                            </div>
                            <div className="text-sm text-gray-500">Success Rate</div>
                          </div>
                        </div>
                      ))}
                      
                      {overview.top_mappings.length === 0 && (
                        <div className="text-center py-8">
                          <p className="text-gray-500">No mapping data available for the selected period</p>
                        </div>
                      )}
                    </div>
                  </CardContent>
                </Card>
              </TabsContent>
            </Tabs>
          </>
        )}

        {!overview && !isLoading && (
          <Card>
            <CardContent className="text-center py-12">
              <Activity className="w-12 h-12 mx-auto text-gray-400 mb-4" />
              <p className="text-gray-500">No statistics data available</p>
              <p className="text-sm text-gray-400 mt-2">
                Statistics will appear here once message processing begins
              </p>
            </CardContent>
          </Card>
        )}
      </div>
    </DashboardLayout>
  );
}