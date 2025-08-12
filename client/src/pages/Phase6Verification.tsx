import { useState, useEffect } from 'react';
import { useQuery } from '@tanstack/react-query';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Progress } from '@/components/ui/progress';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { CheckCircle, XCircle, Clock, Play, RefreshCw } from 'lucide-react';

interface VerificationResult {
  test_id: number;
  feature_tested: string;
  result: string;
  notes: string;
  timestamp: string;
  execution_time: number;
  details: any;
}

interface VerificationReport {
  verification_summary: {
    total_tests: number;
    passed_tests: number;
    failed_tests: number;
    pass_rate_percentage: number;
    total_execution_time_seconds: number;
    report_generated: string;
  };
  test_results: VerificationResult[];
}

const Phase6Verification = () => {
  const [isRunning, setIsRunning] = useState(false);
  const [currentTest, setCurrentTest] = useState<number | null>(null);

  // Query for verification report
  const { data: report, isLoading, refetch } = useQuery({
    queryKey: ['/api/verification/phase6/report'],
    enabled: false, // Only fetch when explicitly requested
  });

  // Query for system status
  const { data: systemStatus } = useQuery({
    queryKey: ['/api/workers/system/status'],
    refetchInterval: 5000, // Refresh every 5 seconds
  });

  // Query for available workers
  const { data: workers } = useQuery({
    queryKey: ['/api/workers/available'],
    refetchInterval: 5000,
  });

  const runVerification = async () => {
    setIsRunning(true);
    setCurrentTest(1);
    
    // Simulate running tests with progress updates
    for (let i = 1; i <= 9; i++) {
      setCurrentTest(i);
      await new Promise(resolve => setTimeout(resolve, 2000)); // 2 second delay per test
    }
    
    setCurrentTest(null);
    setIsRunning(false);
    refetch(); // Fetch the results
  };

  const getStatusIcon = (result: string) => {
    switch (result) {
      case 'PASS':
        return <CheckCircle className="w-5 h-5 text-green-500" />;
      case 'FAIL':
        return <XCircle className="w-5 h-5 text-red-500" />;
      default:
        return <Clock className="w-5 h-5 text-yellow-500" />;
    }
  };

  const getStatusBadge = (result: string) => {
    const variant = result === 'PASS' ? 'default' : result === 'FAIL' ? 'destructive' : 'secondary';
    return (
      <Badge variant={variant} className="flex items-center gap-1">
        {getStatusIcon(result)}
        {result}
      </Badge>
    );
  };

  const testDescriptions = [
    { id: 1, name: "Worker Registration & Monitoring", description: "Tests worker registration, heartbeat monitoring, and failure detection" },
    { id: 2, name: "Session Assignment Based on RAM", description: "Validates intelligent load balancing with premium prioritization" },
    { id: 3, name: "Worker Overflow & Fallback Handling", description: "Tests system behavior when all workers at capacity" },
    { id: 4, name: "RAM Efficiency - Idle Session Management", description: "Verifies efficient resource usage for idle sessions" },
    { id: 5, name: "RAM Cleanup & Session Recycling", description: "Tests memory management and session lifecycle" },
    { id: 6, name: "Task Execution Between Server & Worker", description: "Validates inter-service communication" },
    { id: 7, name: "Admin Dashboard Verification", description: "Tests administrative interface functionality" },
    { id: 8, name: "Crash Recovery & Reassignment", description: "Tests system resilience and recovery" },
    { id: 9, name: "Security & Communication Integrity", description: "Validates security measures" }
  ];

  return (
    <div className="container mx-auto p-6 space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold">Phase 6 Verification</h1>
          <p className="text-muted-foreground">
            AutoForwardX Worker Scaling & RAM Optimization Testing Suite
          </p>
        </div>
        <Button 
          onClick={runVerification} 
          disabled={isRunning}
          className="flex items-center gap-2"
        >
          {isRunning ? (
            <>
              <RefreshCw className="w-4 h-4 animate-spin" />
              Running Tests...
            </>
          ) : (
            <>
              <Play className="w-4 h-4" />
              Run Verification
            </>
          )}
        </Button>
      </div>

      {/* System Overview */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-sm">System Status</CardTitle>
          </CardHeader>
          <CardContent>
            {systemStatus ? (
              <div className="space-y-2">
                <div className="flex justify-between">
                  <span className="text-sm">Total Workers:</span>
                  <span className="font-semibold">{systemStatus.totalWorkers}</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-sm">Online Workers:</span>
                  <span className="font-semibold text-green-600">{systemStatus.onlineWorkers}</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-sm">RAM Usage:</span>
                  <span className="font-semibold">
                    {systemStatus.systemCapacity?.utilizationPercent || 0}%
                  </span>
                </div>
              </div>
            ) : (
              <div className="text-sm text-muted-foreground">Loading...</div>
            )}
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-sm">Workers Available</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{workers?.length || 0}</div>
            <p className="text-sm text-muted-foreground">
              Active worker nodes
            </p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-sm">Verification Status</CardTitle>
          </CardHeader>
          <CardContent>
            {isRunning ? (
              <div className="space-y-2">
                <div className="text-sm">Running Test {currentTest}/9</div>
                <Progress value={(currentTest || 0) / 9 * 100} className="h-2" />
              </div>
            ) : report ? (
              <div className="space-y-2">
                <div className="text-2xl font-bold text-green-600">
                  {report.verification_summary.pass_rate_percentage}%
                </div>
                <p className="text-sm text-muted-foreground">
                  {report.verification_summary.passed_tests}/{report.verification_summary.total_tests} tests passed
                </p>
              </div>
            ) : (
              <div className="text-sm text-muted-foreground">
                Ready to run verification
              </div>
            )}
          </CardContent>
        </Card>
      </div>

      <Tabs defaultValue="overview" className="space-y-4">
        <TabsList>
          <TabsTrigger value="overview">Overview</TabsTrigger>
          <TabsTrigger value="results">Test Results</TabsTrigger>
          <TabsTrigger value="details">Details</TabsTrigger>
        </TabsList>

        <TabsContent value="overview" className="space-y-4">
          <Card>
            <CardHeader>
              <CardTitle>Test Suite Overview</CardTitle>
              <CardDescription>
                Comprehensive verification of Phase 6 distributed worker system features
              </CardDescription>
            </CardHeader>
            <CardContent>
              <div className="grid gap-4">
                {testDescriptions.map((test) => (
                  <div key={test.id} className="flex items-start gap-3 p-3 border rounded-lg">
                    <div className="flex-shrink-0 w-8 h-8 rounded-full bg-primary/10 flex items-center justify-center">
                      <span className="text-sm font-semibold">{test.id}</span>
                    </div>
                    <div className="flex-1">
                      <h4 className="font-semibold">{test.name}</h4>
                      <p className="text-sm text-muted-foreground">{test.description}</p>
                    </div>
                    {isRunning && currentTest === test.id && (
                      <RefreshCw className="w-4 h-4 animate-spin text-primary" />
                    )}
                  </div>
                ))}
              </div>
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="results" className="space-y-4">
          {report ? (
            <Card>
              <CardHeader>
                <CardTitle>Verification Results</CardTitle>
                <CardDescription>
                  Generated: {new Date(report.verification_summary.report_generated).toLocaleString()}
                </CardDescription>
              </CardHeader>
              <CardContent>
                <div className="space-y-4">
                  {report.test_results.map((result) => (
                    <div key={result.test_id} className="flex items-center gap-4 p-4 border rounded-lg">
                      <div className="flex-shrink-0">
                        {getStatusBadge(result.result)}
                      </div>
                      <div className="flex-1">
                        <h4 className="font-semibold">{result.feature_tested}</h4>
                        <p className="text-sm text-muted-foreground">{result.notes}</p>
                        <p className="text-xs text-muted-foreground">
                          Executed in {result.execution_time.toFixed(2)}s
                        </p>
                      </div>
                    </div>
                  ))}
                </div>
              </CardContent>
            </Card>
          ) : (
            <Card>
              <CardContent className="py-12 text-center">
                <p className="text-muted-foreground">
                  Run verification to see detailed results
                </p>
              </CardContent>
            </Card>
          )}
        </TabsContent>

        <TabsContent value="details" className="space-y-4">
          {report ? (
            <Card>
              <CardHeader>
                <CardTitle>Technical Details</CardTitle>
                <CardDescription>
                  Raw verification data and system metrics
                </CardDescription>
              </CardHeader>
              <CardContent>
                <pre className="text-xs bg-muted p-4 rounded-lg overflow-auto max-h-96">
                  {JSON.stringify(report, null, 2)}
                </pre>
              </CardContent>
            </Card>
          ) : (
            <Card>
              <CardContent className="py-12 text-center">
                <p className="text-muted-foreground">
                  No verification data available
                </p>
              </CardContent>
            </Card>
          )}
        </TabsContent>
      </Tabs>
    </div>
  );
};

export default Phase6Verification;