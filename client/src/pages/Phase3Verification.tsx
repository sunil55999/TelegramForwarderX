import { useState, useEffect } from "react";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { CheckCircle, XCircle, Clock, Play, Download, RotateCcw, AlertTriangle } from "lucide-react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { apiRequest } from "@/lib/queryClient";

interface TestResult {
  test_name: string;
  passed: boolean;
  details: string;
  execution_time: number;
  expected: string;
  actual: string;
  error?: string;
}

interface VerificationReport {
  timestamp: string;
  duration: number;
  total_tests: number;
  passed_tests: number;
  failed_tests: number;
  pass_rate: number;
  results: TestResult[];
}

interface TestCategory {
  name: string;
  description: string;
  tests: TestResult[];
  passed: number;
  total: number;
}

const Phase3Verification = () => {
  const [isRunning, setIsRunning] = useState(false);
  const [currentTest, setCurrentTest] = useState<string>("");
  const [progress, setProgress] = useState(0);
  
  const queryClient = useQueryClient();
  
  // Fetch latest verification report
  const { data: report, isLoading: reportLoading } = useQuery({
    queryKey: ["/api/phase3-verification/latest"],
    enabled: true,
  });
  
  // Run verification mutation
  const runVerification = useMutation({
    mutationFn: () => apiRequest("/api/phase3-verification/run", "POST"),
    onMutate: () => {
      setIsRunning(true);
      setProgress(0);
      setCurrentTest("Initializing...");
    },
    onSuccess: () => {
      setIsRunning(false);
      setCurrentTest("");
      setProgress(100);
      queryClient.invalidateQueries({ queryKey: ["/api/phase3-verification/latest"] });
    },
    onError: () => {
      setIsRunning(false);
      setCurrentTest("");
    },
  });
  
  // Group tests by category
  const categorizeTests = (results: TestResult[]): TestCategory[] => {
    const categories = new Map<string, TestResult[]>();
    
    results.forEach(result => {
      const category = result.test_name.includes(":")
        ? result.test_name.split(":")[0].trim()
        : "General";
      
      if (!categories.has(category)) {
        categories.set(category, []);
      }
      categories.get(category)!.push(result);
    });
    
    return Array.from(categories.entries()).map(([name, tests]) => ({
      name: getCategoryDisplayName(name),
      description: getCategoryDescription(name),
      tests,
      passed: tests.filter(t => t.passed).length,
      total: tests.length,
    }));
  };
  
  const getCategoryDisplayName = (category: string): string => {
    const displayNames: { [key: string]: string } = {
      "Enable Message Update Syncing": "Message Update Syncing",
      "Enable Message Deletion Syncing": "Message Deletion Syncing",
      "Create Regex Editing Rule": "Advanced Editing Rules",
      "Multi-Layer Filter Configuration": "Multi-Layer Filtering",
      "Configure Message Delay": "Message Preview & Delay",
      "System Statistics Retrieval": "Monitoring & Statistics",
      "Settings Persistence Check": "Persistence Testing",
      "Bulk Message Processing": "Performance Testing",
      "General": "General Tests",
    };
    
    return displayNames[category] || category;
  };
  
  const getCategoryDescription = (category: string): string => {
    const descriptions: { [key: string]: string } = {
      "Message Update Syncing": "Test real-time message editing propagation across channels",
      "Message Deletion Syncing": "Verify automatic deletion syncing with toggle functionality",
      "Advanced Editing Rules": "Test regex-based content transformation rules",
      "Multi-Layer Filtering": "Verify keyword and message type filtering logic",
      "Message Preview & Delay": "Test admin approval workflow and message delays",
      "Monitoring & Statistics": "Validate system metrics and dashboard data",
      "Persistence Testing": "Ensure settings survive system restarts",
      "Performance Testing": "Check system performance under load",
      "General Tests": "Basic functionality and integration tests",
    };
    
    return descriptions[category] || "Test category";
  };
  
  const getStatusIcon = (passed: boolean) => {
    return passed ? (
      <CheckCircle className="h-4 w-4 text-green-500" />
    ) : (
      <XCircle className="h-4 w-4 text-red-500" />
    );
  };
  
  const getStatusBadge = (passed: boolean) => {
    return (
      <Badge variant={passed ? "default" : "destructive"} className="ml-2">
        {passed ? "PASS" : "FAIL"}
      </Badge>
    );
  };
  
  const getCategoryStatusBadge = (category: TestCategory) => {
    const passRate = (category.passed / category.total) * 100;
    
    if (passRate === 100) {
      return <Badge variant="default">All Pass</Badge>;
    } else if (passRate >= 75) {
      return <Badge variant="secondary">Mostly Pass</Badge>;
    } else if (passRate >= 50) {
      return <Badge variant="outline">Partial Pass</Badge>;
    } else {
      return <Badge variant="destructive">Critical Issues</Badge>;
    }
  };
  
  const downloadReport = () => {
    if (!report) return;
    
    const blob = new Blob([JSON.stringify(report, null, 2)], {
      type: "application/json",
    });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = `phase3-verification-${new Date().toISOString()}.json`;
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
    URL.revokeObjectURL(url);
  };
  
  const formatDuration = (seconds: number) => {
    return `${seconds.toFixed(2)}s`;
  };
  
  const formatTimestamp = (timestamp: string) => {
    return new Date(timestamp).toLocaleString();
  };
  
  if (reportLoading) {
    return (
      <div className="container mx-auto p-6">
        <div className="flex items-center justify-center h-64">
          <div className="text-center">
            <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-600 mx-auto"></div>
            <p className="mt-2 text-muted-foreground">Loading verification report...</p>
          </div>
        </div>
      </div>
    );
  }
  
  const categories = report ? categorizeTests(report.results) : [];
  const overallPassRate = report ? report.pass_rate : 0;
  
  return (
    <div className="container mx-auto p-6 space-y-6" data-testid="phase3-verification-page">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold">Phase 3 Verification</h1>
          <p className="text-muted-foreground">
            Comprehensive testing suite for advanced message forwarding features
          </p>
        </div>
        <div className="flex gap-2">
          <Button
            onClick={() => runVerification.mutate()}
            disabled={isRunning}
            data-testid="button-run-verification"
          >
            {isRunning ? (
              <>
                <Clock className="mr-2 h-4 w-4 animate-spin" />
                Running...
              </>
            ) : (
              <>
                <Play className="mr-2 h-4 w-4" />
                Run Verification
              </>
            )}
          </Button>
          {report && (
            <Button variant="outline" onClick={downloadReport} data-testid="button-download-report">
              <Download className="mr-2 h-4 w-4" />
              Download Report
            </Button>
          )}
        </div>
      </div>
      
      {/* Running Status */}
      {isRunning && (
        <Card className="border-blue-200 bg-blue-50">
          <CardContent className="pt-6">
            <div className="space-y-4">
              <div className="flex items-center gap-2">
                <div className="animate-spin rounded-full h-4 w-4 border-2 border-blue-600 border-t-transparent"></div>
                <span className="font-medium">Verification in progress...</span>
              </div>
              <div className="space-y-2">
                <div className="flex justify-between text-sm">
                  <span>Current test: {currentTest}</span>
                  <span>{progress.toFixed(0)}%</span>
                </div>
                <div className="w-full bg-gray-200 rounded-full h-2">
                  <div 
                    className="bg-blue-600 h-2 rounded-full transition-all duration-300" 
                    style={{ width: `${progress}%` }}
                  ></div>
                </div>
              </div>
            </div>
          </CardContent>
        </Card>
      )}
      
      {/* Summary */}
      {report && (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
          <Card>
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="text-sm font-medium">Overall Pass Rate</CardTitle>
              <CheckCircle className="h-4 w-4 text-muted-foreground" />
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold" data-testid="text-pass-rate">
                {overallPassRate.toFixed(1)}%
              </div>
              <p className="text-xs text-muted-foreground">
                {report.passed_tests} of {report.total_tests} tests passed
              </p>
            </CardContent>
          </Card>
          
          <Card>
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="text-sm font-medium">Total Tests</CardTitle>
              <RotateCcw className="h-4 w-4 text-muted-foreground" />
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold" data-testid="text-total-tests">
                {report.total_tests}
              </div>
              <p className="text-xs text-muted-foreground">
                Across {categories.length} categories
              </p>
            </CardContent>
          </Card>
          
          <Card>
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="text-sm font-medium">Execution Time</CardTitle>
              <Clock className="h-4 w-4 text-muted-foreground" />
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold" data-testid="text-execution-time">
                {formatDuration(report.duration)}
              </div>
              <p className="text-xs text-muted-foreground">
                Last run: {formatTimestamp(report.timestamp)}
              </p>
            </CardContent>
          </Card>
          
          <Card>
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="text-sm font-medium">Status</CardTitle>
              <AlertTriangle className="h-4 w-4 text-muted-foreground" />
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold">
                {overallPassRate >= 90 ? (
                  <Badge variant="default" className="text-base">Excellent</Badge>
                ) : overallPassRate >= 75 ? (
                  <Badge variant="secondary" className="text-base">Good</Badge>
                ) : overallPassRate >= 50 ? (
                  <Badge variant="outline" className="text-base">Partial</Badge>
                ) : (
                  <Badge variant="destructive" className="text-base">Critical</Badge>
                )}
              </div>
              <p className="text-xs text-muted-foreground mt-1">
                {overallPassRate >= 90 && "Highly functional!"}
                {overallPassRate >= 75 && overallPassRate < 90 && "Minor issues detected"}
                {overallPassRate >= 50 && overallPassRate < 75 && "Significant gaps found"}
                {overallPassRate < 50 && "Major work needed"}
              </p>
            </CardContent>
          </Card>
        </div>
      )}
      
      {/* Test Categories */}
      {report && (
        <Tabs defaultValue="overview" className="space-y-4">
          <TabsList className="grid w-full grid-cols-3">
            <TabsTrigger value="overview">Overview</TabsTrigger>
            <TabsTrigger value="categories">By Category</TabsTrigger>
            <TabsTrigger value="detailed">Detailed Results</TabsTrigger>
          </TabsList>
          
          <TabsContent value="overview" className="space-y-4">
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              {categories.map((category) => (
                <Card key={category.name} data-testid={`card-category-${category.name.toLowerCase().replace(/\s+/g, '-')}`}>
                  <CardHeader>
                    <div className="flex items-center justify-between">
                      <CardTitle className="text-lg">{category.name}</CardTitle>
                      {getCategoryStatusBadge(category)}
                    </div>
                    <CardDescription>{category.description}</CardDescription>
                  </CardHeader>
                  <CardContent>
                    <div className="flex items-center justify-between mb-2">
                      <span className="text-sm text-muted-foreground">
                        {category.passed} / {category.total} tests passed
                      </span>
                      <span className="text-sm font-medium">
                        {((category.passed / category.total) * 100).toFixed(1)}%
                      </span>
                    </div>
                    <div className="w-full bg-gray-200 rounded-full h-2">
                      <div 
                        className="bg-green-500 h-2 rounded-full transition-all duration-300" 
                        style={{ width: `${(category.passed / category.total) * 100}%` }}
                      ></div>
                    </div>
                  </CardContent>
                </Card>
              ))}
            </div>
          </TabsContent>
          
          <TabsContent value="categories" className="space-y-4">
            {categories.map((category) => (
              <Card key={category.name}>
                <CardHeader>
                  <div className="flex items-center justify-between">
                    <div>
                      <CardTitle>{category.name}</CardTitle>
                      <CardDescription>{category.description}</CardDescription>
                    </div>
                    {getCategoryStatusBadge(category)}
                  </div>
                </CardHeader>
                <CardContent>
                  <div className="space-y-3">
                    {category.tests.map((test, index) => (
                      <div
                        key={index}
                        className="flex items-start gap-3 p-3 rounded-lg border"
                        data-testid={`test-${test.test_name.toLowerCase().replace(/\s+/g, '-')}`}
                      >
                        {getStatusIcon(test.passed)}
                        <div className="flex-1 min-w-0">
                          <div className="flex items-center justify-between mb-1">
                            <h4 className="font-medium truncate">{test.test_name}</h4>
                            {getStatusBadge(test.passed)}
                          </div>
                          <p className="text-sm text-muted-foreground mb-2">
                            {test.details}
                          </p>
                          <div className="text-xs space-y-1">
                            <div>
                              <span className="font-medium">Expected: </span>
                              <span className="text-muted-foreground">{test.expected}</span>
                            </div>
                            <div>
                              <span className="font-medium">Actual: </span>
                              <span className="text-muted-foreground">{test.actual}</span>
                            </div>
                            <div>
                              <span className="font-medium">Time: </span>
                              <span className="text-muted-foreground">
                                {formatDuration(test.execution_time)}
                              </span>
                            </div>
                            {test.error && (
                              <div className="text-red-600">
                                <span className="font-medium">Error: </span>
                                <span>{test.error}</span>
                              </div>
                            )}
                          </div>
                        </div>
                      </div>
                    ))}
                  </div>
                </CardContent>
              </Card>
            ))}
          </TabsContent>
          
          <TabsContent value="detailed" className="space-y-4">
            <Card>
              <CardHeader>
                <CardTitle>Detailed Test Results</CardTitle>
                <CardDescription>
                  Complete breakdown of all verification tests with execution details
                </CardDescription>
              </CardHeader>
              <CardContent>
                <div className="space-y-4">
                  {report.results.map((result, index) => (
                    <div
                      key={index}
                      className={`p-4 rounded-lg border-l-4 ${
                        result.passed
                          ? "border-l-green-500 bg-green-50 dark:bg-green-900/10"
                          : "border-l-red-500 bg-red-50 dark:bg-red-900/10"
                      }`}
                      data-testid={`detailed-test-${index}`}
                    >
                      <div className="flex items-start justify-between mb-2">
                        <h4 className="font-medium">{result.test_name}</h4>
                        <div className="flex items-center gap-2">
                          <span className="text-sm text-muted-foreground">
                            {formatDuration(result.execution_time)}
                          </span>
                          {getStatusBadge(result.passed)}
                        </div>
                      </div>
                      
                      <p className="text-sm text-muted-foreground mb-3">
                        {result.details}
                      </p>
                      
                      <div className="grid grid-cols-1 md:grid-cols-2 gap-4 text-sm">
                        <div>
                          <span className="font-medium text-green-700 dark:text-green-400">
                            Expected:
                          </span>
                          <p className="mt-1 p-2 bg-green-100 dark:bg-green-900/20 rounded">
                            {result.expected}
                          </p>
                        </div>
                        <div>
                          <span className={`font-medium ${
                            result.passed
                              ? "text-green-700 dark:text-green-400"
                              : "text-red-700 dark:text-red-400"
                          }`}>
                            Actual:
                          </span>
                          <p className={`mt-1 p-2 rounded ${
                            result.passed
                              ? "bg-green-100 dark:bg-green-900/20"
                              : "bg-red-100 dark:bg-red-900/20"
                          }`}>
                            {result.actual}
                          </p>
                        </div>
                      </div>
                      
                      {result.error && (
                        <div className="mt-3">
                          <span className="font-medium text-red-700 dark:text-red-400">
                            Error:
                          </span>
                          <p className="mt-1 p-2 bg-red-100 dark:bg-red-900/20 rounded font-mono text-sm">
                            {result.error}
                          </p>
                        </div>
                      )}
                    </div>
                  ))}
                </div>
              </CardContent>
            </Card>
          </TabsContent>
        </Tabs>
      )}
      
      {/* No Report State */}
      {!report && !reportLoading && (
        <Card className="text-center py-12">
          <CardContent>
            <AlertTriangle className="mx-auto h-12 w-12 text-muted-foreground mb-4" />
            <h3 className="text-lg font-medium mb-2">No Verification Report Available</h3>
            <p className="text-muted-foreground mb-4">
              Run the verification suite to generate a comprehensive test report
            </p>
            <Button onClick={() => runVerification.mutate()} disabled={isRunning}>
              <Play className="mr-2 h-4 w-4" />
              Run Verification Now
            </Button>
          </CardContent>
        </Card>
      )}
    </div>
  );
};

export default Phase3Verification;