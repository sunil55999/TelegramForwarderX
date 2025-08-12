import { useState, useEffect } from "react";
import { useLocation } from "wouter";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { z } from "zod";
import {
  ArrowLeft,
  Settings,
  Code,
  Filter,
  MessageSquare,
  Clock,
  Bot,
  Calendar,
  Save,
  RotateCcw,
  ChevronDown,
  ChevronUp,
  Plus,
  Trash2,
  AlertCircle,
  CheckCircle,
  Eye,
  EyeOff
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { Card, CardHeader, CardTitle, CardDescription, CardContent } from "@/components/ui/card";
import { Form, FormControl, FormDescription, FormField, FormItem, FormLabel, FormMessage } from "@/components/ui/form";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Checkbox } from "@/components/ui/checkbox";
import { Badge } from "@/components/ui/badge";
import { Separator } from "@/components/ui/separator";
import { Collapsible, CollapsibleContent, CollapsibleTrigger } from "@/components/ui/collapsible";
import { useToast } from "@/hooks/use-toast";
import { apiRequest } from "@/lib/queryClient";

// Form schema for advanced message rules
const advancedRulesSchema = z.object({
  // Regex find & replace rules
  regexRules: z.array(z.object({
    id: z.string().optional(),
    findPattern: z.string().min(1, "Find pattern is required"),
    replaceWith: z.string(),
    isEnabled: z.boolean().default(true),
    flags: z.string().default("gi"),
  })).default([]),
  
  // Block words list
  blockWords: z.array(z.string()).default([]),
  
  // Include/Exclude keyword filters
  includeKeywords: z.array(z.string()).default([]),
  excludeKeywords: z.array(z.string()).default([]),
  keywordMatchMode: z.enum(["any", "all"]).default("any"),
  caseSensitive: z.boolean().default(false),
  
  // Header and Footer text
  headerText: z.string().optional(),
  footerText: z.string().optional(),
  
  // Content modification toggles
  removeMentions: z.boolean().default(false),
  removeUrls: z.boolean().default(false),
  
  // Media type filter
  mediaFilter: z.enum(["all", "text-only", "media-only"]).default("all"),
  
  // Forwarding mode
  forwardingMode: z.enum(["copy", "keep-sender"]).default("copy"),
  
  // Delay forwarding
  delayEnabled: z.boolean().default(false),
  delaySeconds: z.number().min(0).max(3600).default(0),
  
  // Auto-reply patterns
  autoReplyRules: z.array(z.object({
    id: z.string().optional(),
    trigger: z.string().min(1, "Trigger is required"),
    response: z.string().min(1, "Response is required"),
    isEnabled: z.boolean().default(true),
    matchType: z.enum(["exact", "contains", "regex"]).default("contains"),
  })).default([]),
  
  // Scheduling
  schedulingEnabled: z.boolean().default(false),
  scheduleStartTime: z.string().optional(),
  scheduleEndTime: z.string().optional(),
  scheduleDays: z.array(z.string()).default([]),
});

type AdvancedRulesFormData = z.infer<typeof advancedRulesSchema>;

interface ForwardingMapping {
  id: string;
  sourceName: string;
  destinationName: string;
  priority: number;
  isActive: boolean;
}

interface UserPlan {
  type: string;
  features: {
    scheduling: boolean;
    advancedRegex: boolean;
    autoReply: boolean;
  };
}

const dayOptions = [
  { value: "monday", label: "Monday" },
  { value: "tuesday", label: "Tuesday" },
  { value: "wednesday", label: "Wednesday" },
  { value: "thursday", label: "Thursday" },
  { value: "friday", label: "Friday" },
  { value: "saturday", label: "Saturday" },
  { value: "sunday", label: "Sunday" },
];

export default function AdvancedMessageRules() {
  const [, setLocation] = useLocation();
  const { toast } = useToast();
  const queryClient = useQueryClient();
  
  // Get mapping ID from URL params (assuming route is /forwarding/:id/rules)
  const mappingId = new URLSearchParams(window.location.search).get("mapping") || "";
  
  // Collapsible states
  const [regexOpen, setRegexOpen] = useState(true); // Open by default
  const [blockWordsOpen, setBlockWordsOpen] = useState(false);
  const [keywordFiltersOpen, setKeywordFiltersOpen] = useState(false);
  const [headerFooterOpen, setHeaderFooterOpen] = useState(false);
  const [contentModOpen, setContentModOpen] = useState(false);
  const [mediaFilterOpen, setMediaFilterOpen] = useState(false);
  const [forwardingModeOpen, setForwardingModeOpen] = useState(false);
  const [delayOpen, setDelayOpen] = useState(false);
  const [autoReplyOpen, setAutoReplyOpen] = useState(false);
  const [schedulingOpen, setSchedulingOpen] = useState(false);

  // New item input states
  const [newBlockWord, setNewBlockWord] = useState("");
  const [newIncludeKeyword, setNewIncludeKeyword] = useState("");
  const [newExcludeKeyword, setNewExcludeKeyword] = useState("");

  const form = useForm<AdvancedRulesFormData>({
    resolver: zodResolver(advancedRulesSchema),
    defaultValues: {
      regexRules: [],
      blockWords: [],
      includeKeywords: [],
      excludeKeywords: [],
      keywordMatchMode: "any",
      caseSensitive: false,
      headerText: "",
      footerText: "",
      removeMentions: false,
      removeUrls: false,
      mediaFilter: "all",
      forwardingMode: "copy",
      delayEnabled: false,
      delaySeconds: 0,
      autoReplyRules: [],
      schedulingEnabled: false,
      scheduleStartTime: "",
      scheduleEndTime: "",
      scheduleDays: [],
    },
  });

  // Fetch mapping details
  const { data: mapping } = useQuery<ForwardingMapping>({
    queryKey: ["/api/forwarding/mappings", mappingId],
    enabled: !!mappingId,
  });

  // Fetch user plan to check feature availability
  const { data: userPlan } = useQuery<UserPlan>({
    queryKey: ["/api/user/plan"],
  });

  // Fetch existing rules
  const { data: existingRules, isLoading } = useQuery<AdvancedRulesFormData>({
    queryKey: ["/api/forwarding/mappings", mappingId, "rules"],
    enabled: !!mappingId,
    onSuccess: (data) => {
      if (data) {
        form.reset(data);
      }
    },
  });

  // Save rules mutation
  const saveRulesMutation = useMutation({
    mutationFn: (data: AdvancedRulesFormData) => 
      apiRequest(`/api/forwarding/mappings/${mappingId}/rules`, "PUT", data),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/forwarding/mappings", mappingId, "rules"] });
      toast({
        title: "Success",
        description: "Advanced rules saved successfully",
      });
    },
    onError: (error: any) => {
      toast({
        title: "Error",
        description: error.message || "Failed to save rules",
        variant: "destructive",
      });
    },
  });

  const onSubmit = (data: AdvancedRulesFormData) => {
    saveRulesMutation.mutate(data);
  };

  const handleReset = () => {
    form.reset(existingRules || {});
    toast({
      title: "Reset",
      description: "Form has been reset to saved values",
    });
  };

  const addRegexRule = () => {
    const currentRules = form.getValues("regexRules");
    form.setValue("regexRules", [
      ...currentRules,
      {
        id: `regex-${Date.now()}`,
        findPattern: "",
        replaceWith: "",
        isEnabled: true,
        flags: "gi",
      }
    ]);
  };

  const removeRegexRule = (index: number) => {
    const currentRules = form.getValues("regexRules");
    form.setValue("regexRules", currentRules.filter((_, i) => i !== index));
  };

  const addAutoReplyRule = () => {
    const currentRules = form.getValues("autoReplyRules");
    form.setValue("autoReplyRules", [
      ...currentRules,
      {
        id: `reply-${Date.now()}`,
        trigger: "",
        response: "",
        isEnabled: true,
        matchType: "contains",
      }
    ]);
  };

  const removeAutoReplyRule = (index: number) => {
    const currentRules = form.getValues("autoReplyRules");
    form.setValue("autoReplyRules", currentRules.filter((_, i) => i !== index));
  };

  const addBlockWord = () => {
    if (newBlockWord.trim()) {
      const current = form.getValues("blockWords");
      form.setValue("blockWords", [...current, newBlockWord.trim()]);
      setNewBlockWord("");
    }
  };

  const removeBlockWord = (index: number) => {
    const current = form.getValues("blockWords");
    form.setValue("blockWords", current.filter((_, i) => i !== index));
  };

  const addIncludeKeyword = () => {
    if (newIncludeKeyword.trim()) {
      const current = form.getValues("includeKeywords");
      form.setValue("includeKeywords", [...current, newIncludeKeyword.trim()]);
      setNewIncludeKeyword("");
    }
  };

  const removeIncludeKeyword = (index: number) => {
    const current = form.getValues("includeKeywords");
    form.setValue("includeKeywords", current.filter((_, i) => i !== index));
  };

  const addExcludeKeyword = () => {
    if (newExcludeKeyword.trim()) {
      const current = form.getValues("excludeKeywords");
      form.setValue("excludeKeywords", [...current, newExcludeKeyword.trim()]);
      setNewExcludeKeyword("");
    }
  };

  const removeExcludeKeyword = (index: number) => {
    const current = form.getValues("excludeKeywords");
    form.setValue("excludeKeywords", current.filter((_, i) => i !== index));
  };

  if (isLoading) {
    return <div className="p-8 text-[#E0E0E0]">Loading advanced rules...</div>;
  }

  if (!mappingId || !mapping) {
    return (
      <div className="p-8 text-center">
        <AlertCircle className="w-12 h-12 mx-auto text-red-400 mb-4" />
        <h2 className="text-xl font-semibold text-[#E0E0E0] mb-2">Mapping Not Found</h2>
        <p className="text-gray-400 mb-4">The requested forwarding mapping could not be found.</p>
        <Button onClick={() => setLocation("/forwarding")} className="bg-[#00B4D8] hover:bg-[#00B4D8]/80 text-white">
          <ArrowLeft className="w-4 h-4 mr-2" />
          Back to Mappings
        </Button>
      </div>
    );
  }

  return (
    <div className="space-y-6 p-4 md:p-6">
      {/* Header with Sticky Buttons */}
      <div className="sticky top-0 z-10 bg-[#121212] pb-4 border-b border-[#333333]">
        <div className="flex flex-col sm:flex-row sm:justify-between sm:items-center gap-4">
          <div className="flex items-center gap-4">
            <Button
              variant="ghost"
              onClick={() => setLocation("/forwarding")}
              className="text-[#E0E0E0] hover:bg-[#333333] rounded-lg p-2"
            >
              <ArrowLeft className="w-4 h-4" />
            </Button>
            <div>
              <h1 className="text-2xl md:text-3xl font-bold text-[#E0E0E0]">Advanced Message Rules</h1>
              <p className="text-gray-400 mt-1">
                {mapping.sourceName} → {mapping.destinationName}
              </p>
            </div>
          </div>
          <div className="flex gap-3">
            <Button
              type="button"
              variant="outline"
              onClick={handleReset}
              className="border-[#333333] text-[#E0E0E0] hover:bg-[#333333] rounded-lg"
            >
              <RotateCcw className="w-4 h-4 mr-2" />
              Reset
            </Button>
            <Button
              type="submit"
              form="advanced-rules-form"
              disabled={saveRulesMutation.isPending}
              className="bg-[#00B4D8] hover:bg-[#00B4D8]/80 text-white rounded-lg"
            >
              <Save className="w-4 h-4 mr-2" />
              {saveRulesMutation.isPending ? "Saving..." : "Save All"}
            </Button>
          </div>
        </div>
      </div>

      <Form {...form}>
        <form id="advanced-rules-form" onSubmit={form.handleSubmit(onSubmit)} className="space-y-6">
          
          {/* Regex Find & Replace Rules - Open by Default */}
          <Card className="bg-[#1A1A1A] border-[#333333] rounded-lg">
            <Collapsible open={regexOpen} onOpenChange={setRegexOpen}>
              <CollapsibleTrigger asChild>
                <CardHeader className="cursor-pointer hover:bg-[#232323] transition-colors rounded-t-lg">
                  <div className="flex items-center justify-between">
                    <div className="flex items-center gap-3">
                      <Code className="w-5 h-5 text-[#00B4D8]" />
                      <div>
                        <CardTitle className="text-lg text-[#E0E0E0]">Regex Find & Replace Rules</CardTitle>
                        <CardDescription className="text-gray-400">
                          Advanced pattern matching and text replacement
                        </CardDescription>
                      </div>
                    </div>
                    {regexOpen ? (
                      <ChevronUp className="w-5 h-5 text-gray-400" />
                    ) : (
                      <ChevronDown className="w-5 h-5 text-gray-400" />
                    )}
                  </div>
                </CardHeader>
              </CollapsibleTrigger>
              <CollapsibleContent>
                <CardContent className="space-y-4">
                  <div className="flex justify-between items-center">
                    <p className="text-sm text-gray-400">
                      Use regular expressions to find and replace text patterns in messages
                    </p>
                    <Button
                      type="button"
                      onClick={addRegexRule}
                      className="bg-[#00B4D8] hover:bg-[#00B4D8]/80 text-white rounded-lg"
                    >
                      <Plus className="w-4 h-4 mr-2" />
                      Add Rule
                    </Button>
                  </div>
                  
                  {form.watch("regexRules").map((rule, index) => (
                    <Card key={rule.id || index} className="bg-[#232323] border-[#444444]">
                      <CardContent className="p-4">
                        <div className="grid grid-cols-1 md:grid-cols-12 gap-4 items-start">
                          <div className="md:col-span-1 flex items-center">
                            <FormField
                              control={form.control}
                              name={`regexRules.${index}.isEnabled`}
                              render={({ field }) => (
                                <FormItem>
                                  <FormControl>
                                    <Checkbox
                                      checked={field.value}
                                      onCheckedChange={field.onChange}
                                      className="border-[#333333] data-[state=checked]:bg-[#00B4D8] data-[state=checked]:border-[#00B4D8]"
                                    />
                                  </FormControl>
                                </FormItem>
                              )}
                            />
                          </div>
                          <div className="md:col-span-4">
                            <FormField
                              control={form.control}
                              name={`regexRules.${index}.findPattern`}
                              render={({ field }) => (
                                <FormItem>
                                  <FormLabel className="text-[#E0E0E0] text-sm">Find Pattern</FormLabel>
                                  <FormControl>
                                    <Input
                                      {...field}
                                      placeholder="Enter regex pattern"
                                      className="bg-[#1E1E1E] border-[#333333] text-[#E0E0E0] focus:border-[#00B4D8] rounded-lg font-mono text-sm"
                                    />
                                  </FormControl>
                                  <FormMessage />
                                </FormItem>
                              )}
                            />
                          </div>
                          <div className="md:col-span-4">
                            <FormField
                              control={form.control}
                              name={`regexRules.${index}.replaceWith`}
                              render={({ field }) => (
                                <FormItem>
                                  <FormLabel className="text-[#E0E0E0] text-sm">Replace With</FormLabel>
                                  <FormControl>
                                    <Input
                                      {...field}
                                      placeholder="Replacement text"
                                      className="bg-[#1E1E1E] border-[#333333] text-[#E0E0E0] focus:border-[#00B4D8] rounded-lg font-mono text-sm"
                                    />
                                  </FormControl>
                                  <FormMessage />
                                </FormItem>
                              )}
                            />
                          </div>
                          <div className="md:col-span-2">
                            <FormField
                              control={form.control}
                              name={`regexRules.${index}.flags`}
                              render={({ field }) => (
                                <FormItem>
                                  <FormLabel className="text-[#E0E0E0] text-sm">Flags</FormLabel>
                                  <FormControl>
                                    <Input
                                      {...field}
                                      placeholder="gi"
                                      className="bg-[#1E1E1E] border-[#333333] text-[#E0E0E0] focus:border-[#00B4D8] rounded-lg font-mono text-sm"
                                    />
                                  </FormControl>
                                  <FormMessage />
                                </FormItem>
                              )}
                            />
                          </div>
                          <div className="md:col-span-1 flex items-end">
                            <Button
                              type="button"
                              variant="ghost"
                              size="sm"
                              onClick={() => removeRegexRule(index)}
                              className="text-red-400 hover:bg-red-500/10 rounded-lg p-2"
                            >
                              <Trash2 className="w-4 h-4" />
                            </Button>
                          </div>
                        </div>
                      </CardContent>
                    </Card>
                  ))}
                  
                  {form.watch("regexRules").length === 0 && (
                    <div className="text-center py-8 text-gray-500">
                      <Code className="w-12 h-12 mx-auto mb-4 opacity-50" />
                      <p>No regex rules configured</p>
                      <p className="text-sm">Click "Add Rule" to create your first pattern</p>
                    </div>
                  )}
                </CardContent>
              </CollapsibleContent>
            </Collapsible>
          </Card>

          {/* Block Words List */}
          <Card className="bg-[#1A1A1A] border-[#333333] rounded-lg">
            <Collapsible open={blockWordsOpen} onOpenChange={setBlockWordsOpen}>
              <CollapsibleTrigger asChild>
                <CardHeader className="cursor-pointer hover:bg-[#232323] transition-colors rounded-t-lg">
                  <div className="flex items-center justify-between">
                    <div className="flex items-center gap-3">
                      <Filter className="w-5 h-5 text-[#00B4D8]" />
                      <div>
                        <CardTitle className="text-lg text-[#E0E0E0]">Block Words List</CardTitle>
                        <CardDescription className="text-gray-400">
                          Block messages containing specific words or phrases
                        </CardDescription>
                      </div>
                    </div>
                    {blockWordsOpen ? (
                      <ChevronUp className="w-5 h-5 text-gray-400" />
                    ) : (
                      <ChevronDown className="w-5 h-5 text-gray-400" />
                    )}
                  </div>
                </CardHeader>
              </CollapsibleTrigger>
              <CollapsibleContent>
                <CardContent className="space-y-4">
                  <div className="flex gap-2">
                    <Input
                      value={newBlockWord}
                      onChange={(e) => setNewBlockWord(e.target.value)}
                      placeholder="Enter word or phrase to block"
                      onKeyPress={(e) => e.key === "Enter" && addBlockWord()}
                      className="bg-[#1E1E1E] border-[#333333] text-[#E0E0E0] focus:border-[#00B4D8] rounded-lg"
                    />
                    <Button
                      type="button"
                      onClick={addBlockWord}
                      className="bg-[#00B4D8] hover:bg-[#00B4D8]/80 text-white rounded-lg"
                    >
                      <Plus className="w-4 h-4" />
                    </Button>
                  </div>
                  
                  <div className="flex flex-wrap gap-2">
                    {form.watch("blockWords").map((word, index) => (
                      <Badge
                        key={index}
                        variant="secondary"
                        className="bg-red-500/20 text-red-300 border-red-500/30 px-3 py-1"
                      >
                        {word}
                        <Button
                          type="button"
                          variant="ghost"
                          size="sm"
                          onClick={() => removeBlockWord(index)}
                          className="ml-2 h-auto p-0 text-red-400 hover:text-red-300"
                        >
                          <Trash2 className="w-3 h-3" />
                        </Button>
                      </Badge>
                    ))}
                  </div>
                  
                  {form.watch("blockWords").length === 0 && (
                    <div className="text-center py-4 text-gray-500">
                      <p>No blocked words configured</p>
                    </div>
                  )}
                </CardContent>
              </CollapsibleContent>
            </Collapsible>
          </Card>

          {/* Include/Exclude Keyword Filters */}
          <Card className="bg-[#1A1A1A] border-[#333333] rounded-lg">
            <Collapsible open={keywordFiltersOpen} onOpenChange={setKeywordFiltersOpen}>
              <CollapsibleTrigger asChild>
                <CardHeader className="cursor-pointer hover:bg-[#232323] transition-colors rounded-t-lg">
                  <div className="flex items-center justify-between">
                    <div className="flex items-center gap-3">
                      <Filter className="w-5 h-5 text-[#00B4D8]" />
                      <div>
                        <CardTitle className="text-lg text-[#E0E0E0]">Include/Exclude Keyword Filters</CardTitle>
                        <CardDescription className="text-gray-400">
                          Filter messages based on keyword presence
                        </CardDescription>
                      </div>
                    </div>
                    {keywordFiltersOpen ? (
                      <ChevronUp className="w-5 h-5 text-gray-400" />
                    ) : (
                      <ChevronDown className="w-5 h-5 text-gray-400" />
                    )}
                  </div>
                </CardHeader>
              </CollapsibleTrigger>
              <CollapsibleContent>
                <CardContent className="space-y-6">
                  {/* Include Keywords */}
                  <div className="space-y-3">
                    <h4 className="text-[#E0E0E0] font-medium">Include Keywords</h4>
                    <div className="flex gap-2">
                      <Input
                        value={newIncludeKeyword}
                        onChange={(e) => setNewIncludeKeyword(e.target.value)}
                        placeholder="Add keyword to include"
                        onKeyPress={(e) => e.key === "Enter" && addIncludeKeyword()}
                        className="bg-[#1E1E1E] border-[#333333] text-[#E0E0E0] focus:border-[#00B4D8] rounded-lg"
                      />
                      <Button
                        type="button"
                        onClick={addIncludeKeyword}
                        className="bg-[#00B4D8] hover:bg-[#00B4D8]/80 text-white rounded-lg"
                      >
                        <Plus className="w-4 h-4" />
                      </Button>
                    </div>
                    <div className="flex flex-wrap gap-2">
                      {form.watch("includeKeywords").map((keyword, index) => (
                        <Badge
                          key={index}
                          variant="secondary"
                          className="bg-green-500/20 text-green-300 border-green-500/30 px-3 py-1"
                        >
                          {keyword}
                          <Button
                            type="button"
                            variant="ghost"
                            size="sm"
                            onClick={() => removeIncludeKeyword(index)}
                            className="ml-2 h-auto p-0 text-green-400 hover:text-green-300"
                          >
                            <Trash2 className="w-3 h-3" />
                          </Button>
                        </Badge>
                      ))}
                    </div>
                  </div>

                  {/* Exclude Keywords */}
                  <div className="space-y-3">
                    <h4 className="text-[#E0E0E0] font-medium">Exclude Keywords</h4>
                    <div className="flex gap-2">
                      <Input
                        value={newExcludeKeyword}
                        onChange={(e) => setNewExcludeKeyword(e.target.value)}
                        placeholder="Add keyword to exclude"
                        onKeyPress={(e) => e.key === "Enter" && addExcludeKeyword()}
                        className="bg-[#1E1E1E] border-[#333333] text-[#E0E0E0] focus:border-[#00B4D8] rounded-lg"
                      />
                      <Button
                        type="button"
                        onClick={addExcludeKeyword}
                        className="bg-[#00B4D8] hover:bg-[#00B4D8]/80 text-white rounded-lg"
                      >
                        <Plus className="w-4 h-4" />
                      </Button>
                    </div>
                    <div className="flex flex-wrap gap-2">
                      {form.watch("excludeKeywords").map((keyword, index) => (
                        <Badge
                          key={index}
                          variant="secondary"
                          className="bg-red-500/20 text-red-300 border-red-500/30 px-3 py-1"
                        >
                          {keyword}
                          <Button
                            type="button"
                            variant="ghost"
                            size="sm"
                            onClick={() => removeExcludeKeyword(index)}
                            className="ml-2 h-auto p-0 text-red-400 hover:text-red-300"
                          >
                            <Trash2 className="w-3 h-3" />
                          </Button>
                        </Badge>
                      ))}
                    </div>
                  </div>

                  {/* Keyword Match Settings */}
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                    <FormField
                      control={form.control}
                      name="keywordMatchMode"
                      render={({ field }) => (
                        <FormItem>
                          <FormLabel className="text-[#E0E0E0]">Match Mode</FormLabel>
                          <Select onValueChange={field.onChange} defaultValue={field.value}>
                            <FormControl>
                              <SelectTrigger className="bg-[#1E1E1E] border-[#333333] text-[#E0E0E0] focus:border-[#00B4D8] rounded-lg">
                                <SelectValue />
                              </SelectTrigger>
                            </FormControl>
                            <SelectContent className="bg-[#1E1E1E] border-[#333333]">
                              <SelectItem value="any">Match Any Keyword</SelectItem>
                              <SelectItem value="all">Match All Keywords</SelectItem>
                            </SelectContent>
                          </Select>
                          <FormMessage />
                        </FormItem>
                      )}
                    />

                    <FormField
                      control={form.control}
                      name="caseSensitive"
                      render={({ field }) => (
                        <FormItem className="flex flex-row items-center space-x-3 space-y-0 rounded-lg border border-[#333333] p-4">
                          <FormControl>
                            <Checkbox
                              checked={field.value}
                              onCheckedChange={field.onChange}
                              className="border-[#333333] data-[state=checked]:bg-[#00B4D8] data-[state=checked]:border-[#00B4D8]"
                            />
                          </FormControl>
                          <div className="space-y-1 leading-none">
                            <FormLabel className="text-[#E0E0E0]">Case Sensitive</FormLabel>
                            <FormDescription className="text-gray-500 text-sm">
                              Match keywords with exact case
                            </FormDescription>
                          </div>
                        </FormItem>
                      )}
                    />
                  </div>
                </CardContent>
              </CollapsibleContent>
            </Collapsible>
          </Card>

          {/* Header and Footer Text */}
          <Card className="bg-[#1A1A1A] border-[#333333] rounded-lg">
            <Collapsible open={headerFooterOpen} onOpenChange={setHeaderFooterOpen}>
              <CollapsibleTrigger asChild>
                <CardHeader className="cursor-pointer hover:bg-[#232323] transition-colors rounded-t-lg">
                  <div className="flex items-center justify-between">
                    <div className="flex items-center gap-3">
                      <MessageSquare className="w-5 h-5 text-[#00B4D8]" />
                      <div>
                        <CardTitle className="text-lg text-[#E0E0E0]">Header & Footer Text</CardTitle>
                        <CardDescription className="text-gray-400">
                          Add custom text before and after messages
                        </CardDescription>
                      </div>
                    </div>
                    {headerFooterOpen ? (
                      <ChevronUp className="w-5 h-5 text-gray-400" />
                    ) : (
                      <ChevronDown className="w-5 h-5 text-gray-400" />
                    )}
                  </div>
                </CardHeader>
              </CollapsibleTrigger>
              <CollapsibleContent>
                <CardContent className="space-y-4">
                  <FormField
                    control={form.control}
                    name="headerText"
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel className="text-[#E0E0E0]">Header Text</FormLabel>
                        <FormControl>
                          <Textarea
                            {...field}
                            placeholder="Text to add at the beginning of messages"
                            className="bg-[#1E1E1E] border-[#333333] text-[#E0E0E0] focus:border-[#00B4D8] rounded-lg resize-none"
                            rows={3}
                          />
                        </FormControl>
                        <FormDescription className="text-gray-500 text-sm">
                          This text will be added to the beginning of every forwarded message
                        </FormDescription>
                        <FormMessage />
                      </FormItem>
                    )}
                  />

                  <FormField
                    control={form.control}
                    name="footerText"
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel className="text-[#E0E0E0]">Footer Text</FormLabel>
                        <FormControl>
                          <Textarea
                            {...field}
                            placeholder="Text to add at the end of messages"
                            className="bg-[#1E1E1E] border-[#333333] text-[#E0E0E0] focus:border-[#00B4D8] rounded-lg resize-none"
                            rows={3}
                          />
                        </FormControl>
                        <FormDescription className="text-gray-500 text-sm">
                          This text will be added to the end of every forwarded message
                        </FormDescription>
                        <FormMessage />
                      </FormItem>
                    )}
                  />
                </CardContent>
              </CollapsibleContent>
            </Collapsible>
          </Card>

          {/* Content Modification Toggles */}
          <Card className="bg-[#1A1A1A] border-[#333333] rounded-lg">
            <Collapsible open={contentModOpen} onOpenChange={setContentModOpen}>
              <CollapsibleTrigger asChild>
                <CardHeader className="cursor-pointer hover:bg-[#232323] transition-colors rounded-t-lg">
                  <div className="flex items-center justify-between">
                    <div className="flex items-center gap-3">
                      <Settings className="w-5 h-5 text-[#00B4D8]" />
                      <div>
                        <CardTitle className="text-lg text-[#E0E0E0]">Content Modification</CardTitle>
                        <CardDescription className="text-gray-400">
                          Remove specific content from messages
                        </CardDescription>
                      </div>
                    </div>
                    {contentModOpen ? (
                      <ChevronUp className="w-5 h-5 text-gray-400" />
                    ) : (
                      <ChevronDown className="w-5 h-5 text-gray-400" />
                    )}
                  </div>
                </CardHeader>
              </CollapsibleTrigger>
              <CollapsibleContent>
                <CardContent className="space-y-4">
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                    <FormField
                      control={form.control}
                      name="removeMentions"
                      render={({ field }) => (
                        <FormItem className="flex flex-row items-center space-x-3 space-y-0 rounded-lg border border-[#333333] p-4">
                          <FormControl>
                            <Checkbox
                              checked={field.value}
                              onCheckedChange={field.onChange}
                              className="border-[#333333] data-[state=checked]:bg-[#00B4D8] data-[state=checked]:border-[#00B4D8]"
                            />
                          </FormControl>
                          <div className="space-y-1 leading-none">
                            <FormLabel className="text-[#E0E0E0]">Remove @mentions</FormLabel>
                            <FormDescription className="text-gray-500 text-sm">
                              Strip @username mentions from messages
                            </FormDescription>
                          </div>
                        </FormItem>
                      )}
                    />

                    <FormField
                      control={form.control}
                      name="removeUrls"
                      render={({ field }) => (
                        <FormItem className="flex flex-row items-center space-x-3 space-y-0 rounded-lg border border-[#333333] p-4">
                          <FormControl>
                            <Checkbox
                              checked={field.value}
                              onCheckedChange={field.onChange}
                              className="border-[#333333] data-[state=checked]:bg-[#00B4D8] data-[state=checked]:border-[#00B4D8]"
                            />
                          </FormControl>
                          <div className="space-y-1 leading-none">
                            <FormLabel className="text-[#E0E0E0]">Remove URLs</FormLabel>
                            <FormDescription className="text-gray-500 text-sm">
                              Remove all URLs from messages
                            </FormDescription>
                          </div>
                        </FormItem>
                      )}
                    />
                  </div>
                </CardContent>
              </CollapsibleContent>
            </Collapsible>
          </Card>

          {/* Media Type Filter */}
          <Card className="bg-[#1A1A1A] border-[#333333] rounded-lg">
            <Collapsible open={mediaFilterOpen} onOpenChange={setMediaFilterOpen}>
              <CollapsibleTrigger asChild>
                <CardHeader className="cursor-pointer hover:bg-[#232323] transition-colors rounded-t-lg">
                  <div className="flex items-center justify-between">
                    <div className="flex items-center gap-3">
                      <Filter className="w-5 h-5 text-[#00B4D8]" />
                      <div>
                        <CardTitle className="text-lg text-[#E0E0E0]">Media Type Filter</CardTitle>
                        <CardDescription className="text-gray-400">
                          Control which message types to forward
                        </CardDescription>
                      </div>
                    </div>
                    {mediaFilterOpen ? (
                      <ChevronUp className="w-5 h-5 text-gray-400" />
                    ) : (
                      <ChevronDown className="w-5 h-5 text-gray-400" />
                    )}
                  </div>
                </CardHeader>
              </CollapsibleTrigger>
              <CollapsibleContent>
                <CardContent>
                  <FormField
                    control={form.control}
                    name="mediaFilter"
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel className="text-[#E0E0E0]">Message Type Filter</FormLabel>
                        <Select onValueChange={field.onChange} defaultValue={field.value}>
                          <FormControl>
                            <SelectTrigger className="bg-[#1E1E1E] border-[#333333] text-[#E0E0E0] focus:border-[#00B4D8] rounded-lg">
                              <SelectValue />
                            </SelectTrigger>
                          </FormControl>
                          <SelectContent className="bg-[#1E1E1E] border-[#333333]">
                            <SelectItem value="all">Forward All Messages</SelectItem>
                            <SelectItem value="text-only">Text Messages Only</SelectItem>
                            <SelectItem value="media-only">Media Messages Only</SelectItem>
                          </SelectContent>
                        </Select>
                        <FormDescription className="text-gray-500 text-sm">
                          Choose which types of messages to forward
                        </FormDescription>
                        <FormMessage />
                      </FormItem>
                    )}
                  />
                </CardContent>
              </CollapsibleContent>
            </Collapsible>
          </Card>

          {/* Forwarding Mode */}
          <Card className="bg-[#1A1A1A] border-[#333333] rounded-lg">
            <Collapsible open={forwardingModeOpen} onOpenChange={setForwardingModeOpen}>
              <CollapsibleTrigger asChild>
                <CardHeader className="cursor-pointer hover:bg-[#232323] transition-colors rounded-t-lg">
                  <div className="flex items-center justify-between">
                    <div className="flex items-center gap-3">
                      <MessageSquare className="w-5 h-5 text-[#00B4D8]" />
                      <div>
                        <CardTitle className="text-lg text-[#E0E0E0]">Forwarding Mode</CardTitle>
                        <CardDescription className="text-gray-400">
                          Choose how messages are forwarded
                        </CardDescription>
                      </div>
                    </div>
                    {forwardingModeOpen ? (
                      <ChevronUp className="w-5 h-5 text-gray-400" />
                    ) : (
                      <ChevronDown className="w-5 h-5 text-gray-400" />
                    )}
                  </div>
                </CardHeader>
              </CollapsibleTrigger>
              <CollapsibleContent>
                <CardContent>
                  <FormField
                    control={form.control}
                    name="forwardingMode"
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel className="text-[#E0E0E0]">Mode</FormLabel>
                        <Select onValueChange={field.onChange} defaultValue={field.value}>
                          <FormControl>
                            <SelectTrigger className="bg-[#1E1E1E] border-[#333333] text-[#E0E0E0] focus:border-[#00B4D8] rounded-lg">
                              <SelectValue />
                            </SelectTrigger>
                          </FormControl>
                          <SelectContent className="bg-[#1E1E1E] border-[#333333]">
                            <SelectItem value="copy">Copy Message</SelectItem>
                            <SelectItem value="keep-sender">Keep Original Sender</SelectItem>
                          </SelectContent>
                        </Select>
                        <FormDescription className="text-gray-500 text-sm">
                          Copy creates new messages, Keep Sender preserves original attribution
                        </FormDescription>
                        <FormMessage />
                      </FormItem>
                    )}
                  />
                </CardContent>
              </CollapsibleContent>
            </Collapsible>
          </Card>

          {/* Delay Forwarding */}
          <Card className="bg-[#1A1A1A] border-[#333333] rounded-lg">
            <Collapsible open={delayOpen} onOpenChange={setDelayOpen}>
              <CollapsibleTrigger asChild>
                <CardHeader className="cursor-pointer hover:bg-[#232323] transition-colors rounded-t-lg">
                  <div className="flex items-center justify-between">
                    <div className="flex items-center gap-3">
                      <Clock className="w-5 h-5 text-[#00B4D8]" />
                      <div>
                        <CardTitle className="text-lg text-[#E0E0E0]">Delay Forwarding</CardTitle>
                        <CardDescription className="text-gray-400">
                          Add delay before forwarding messages
                        </CardDescription>
                      </div>
                    </div>
                    {delayOpen ? (
                      <ChevronUp className="w-5 h-5 text-gray-400" />
                    ) : (
                      <ChevronDown className="w-5 h-5 text-gray-400" />
                    )}
                  </div>
                </CardHeader>
              </CollapsibleTrigger>
              <CollapsibleContent>
                <CardContent className="space-y-4">
                  <FormField
                    control={form.control}
                    name="delayEnabled"
                    render={({ field }) => (
                      <FormItem className="flex flex-row items-center space-x-3 space-y-0 rounded-lg border border-[#333333] p-4">
                        <FormControl>
                          <Checkbox
                            checked={field.value}
                            onCheckedChange={field.onChange}
                            className="border-[#333333] data-[state=checked]:bg-[#00B4D8] data-[state=checked]:border-[#00B4D8]"
                          />
                        </FormControl>
                        <div className="space-y-1 leading-none">
                          <FormLabel className="text-[#E0E0E0]">Enable Delay</FormLabel>
                          <FormDescription className="text-gray-500 text-sm">
                            Add a delay before messages are forwarded
                          </FormDescription>
                        </div>
                      </FormItem>
                    )}
                  />

                  {form.watch("delayEnabled") && (
                    <FormField
                      control={form.control}
                      name="delaySeconds"
                      render={({ field }) => (
                        <FormItem>
                          <FormLabel className="text-[#E0E0E0]">Delay Duration (seconds)</FormLabel>
                          <FormControl>
                            <Input
                              type="number"
                              min="0"
                              max="3600"
                              {...field}
                              onChange={(e) => field.onChange(parseInt(e.target.value) || 0)}
                              className="bg-[#1E1E1E] border-[#333333] text-[#E0E0E0] focus:border-[#00B4D8] rounded-lg"
                            />
                          </FormControl>
                          <FormDescription className="text-gray-500 text-sm">
                            Messages will be delayed by this many seconds (0-3600)
                          </FormDescription>
                          <FormMessage />
                        </FormItem>
                      )}
                    />
                  )}

                  {form.watch("delayEnabled") && form.watch("delaySeconds") > 0 && (
                    <div className="bg-blue-500/10 border border-blue-500/20 rounded-lg p-3">
                      <p className="text-blue-300 text-sm">
                        Messages will be delayed by {form.watch("delaySeconds")} seconds before forwarding.
                        You can remove this delay anytime by unchecking "Enable Delay".
                      </p>
                    </div>
                  )}
                </CardContent>
              </CollapsibleContent>
            </Collapsible>
          </Card>

          {/* Auto-reply Patterns */}
          <Card className="bg-[#1A1A1A] border-[#333333] rounded-lg">
            <Collapsible open={autoReplyOpen} onOpenChange={setAutoReplyOpen}>
              <CollapsibleTrigger asChild>
                <CardHeader className="cursor-pointer hover:bg-[#232323] transition-colors rounded-t-lg">
                  <div className="flex items-center justify-between">
                    <div className="flex items-center gap-3">
                      <Bot className="w-5 h-5 text-[#00B4D8]" />
                      <div>
                        <CardTitle className="text-lg text-[#E0E0E0]">Auto-reply Patterns</CardTitle>
                        <CardDescription className="text-gray-400">
                          Automatic responses to specific message patterns
                        </CardDescription>
                      </div>
                    </div>
                    {autoReplyOpen ? (
                      <ChevronUp className="w-5 h-5 text-gray-400" />
                    ) : (
                      <ChevronDown className="w-5 h-5 text-gray-400" />
                    )}
                  </div>
                </CardHeader>
              </CollapsibleTrigger>
              <CollapsibleContent>
                <CardContent className="space-y-4">
                  <div className="flex justify-between items-center">
                    <p className="text-sm text-gray-400">
                      Set up automatic replies for specific message triggers
                    </p>
                    <Button
                      type="button"
                      onClick={addAutoReplyRule}
                      className="bg-[#00B4D8] hover:bg-[#00B4D8]/80 text-white rounded-lg"
                    >
                      <Plus className="w-4 h-4 mr-2" />
                      Add Rule
                    </Button>
                  </div>

                  {form.watch("autoReplyRules").map((rule, index) => (
                    <Card key={rule.id || index} className="bg-[#232323] border-[#444444]">
                      <CardContent className="p-4">
                        <div className="grid grid-cols-1 gap-4">
                          <div className="flex items-center justify-between">
                            <FormField
                              control={form.control}
                              name={`autoReplyRules.${index}.isEnabled`}
                              render={({ field }) => (
                                <FormItem className="flex flex-row items-center space-x-3 space-y-0">
                                  <FormControl>
                                    <Checkbox
                                      checked={field.value}
                                      onCheckedChange={field.onChange}
                                      className="border-[#333333] data-[state=checked]:bg-[#00B4D8] data-[state=checked]:border-[#00B4D8]"
                                    />
                                  </FormControl>
                                  <FormLabel className="text-[#E0E0E0] text-sm">Enable Rule</FormLabel>
                                </FormItem>
                              )}
                            />
                            <Button
                              type="button"
                              variant="ghost"
                              size="sm"
                              onClick={() => removeAutoReplyRule(index)}
                              className="text-red-400 hover:bg-red-500/10 rounded-lg p-2"
                            >
                              <Trash2 className="w-4 h-4" />
                            </Button>
                          </div>

                          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                            <FormField
                              control={form.control}
                              name={`autoReplyRules.${index}.trigger`}
                              render={({ field }) => (
                                <FormItem>
                                  <FormLabel className="text-[#E0E0E0] text-sm">Trigger</FormLabel>
                                  <FormControl>
                                    <Input
                                      {...field}
                                      placeholder="Message trigger"
                                      className="bg-[#1E1E1E] border-[#333333] text-[#E0E0E0] focus:border-[#00B4D8] rounded-lg"
                                    />
                                  </FormControl>
                                  <FormMessage />
                                </FormItem>
                              )}
                            />

                            <FormField
                              control={form.control}
                              name={`autoReplyRules.${index}.response`}
                              render={({ field }) => (
                                <FormItem>
                                  <FormLabel className="text-[#E0E0E0] text-sm">Response</FormLabel>
                                  <FormControl>
                                    <Input
                                      {...field}
                                      placeholder="Auto-reply message"
                                      className="bg-[#1E1E1E] border-[#333333] text-[#E0E0E0] focus:border-[#00B4D8] rounded-lg"
                                    />
                                  </FormControl>
                                  <FormMessage />
                                </FormItem>
                              )}
                            />

                            <FormField
                              control={form.control}
                              name={`autoReplyRules.${index}.matchType`}
                              render={({ field }) => (
                                <FormItem>
                                  <FormLabel className="text-[#E0E0E0] text-sm">Match Type</FormLabel>
                                  <Select onValueChange={field.onChange} defaultValue={field.value}>
                                    <FormControl>
                                      <SelectTrigger className="bg-[#1E1E1E] border-[#333333] text-[#E0E0E0] focus:border-[#00B4D8] rounded-lg">
                                        <SelectValue />
                                      </SelectTrigger>
                                    </FormControl>
                                    <SelectContent className="bg-[#1E1E1E] border-[#333333]">
                                      <SelectItem value="exact">Exact Match</SelectItem>
                                      <SelectItem value="contains">Contains</SelectItem>
                                      <SelectItem value="regex">Regex Pattern</SelectItem>
                                    </SelectContent>
                                  </Select>
                                  <FormMessage />
                                </FormItem>
                              )}
                            />
                          </div>
                        </div>
                      </CardContent>
                    </Card>
                  ))}

                  {form.watch("autoReplyRules").length === 0 && (
                    <div className="text-center py-8 text-gray-500">
                      <Bot className="w-12 h-12 mx-auto mb-4 opacity-50" />
                      <p>No auto-reply rules configured</p>
                      <p className="text-sm">Click "Add Rule" to create your first auto-reply</p>
                    </div>
                  )}
                </CardContent>
              </CollapsibleContent>
            </Collapsible>
          </Card>

          {/* Scheduling - Show only if user's plan allows */}
          {userPlan?.features?.scheduling && (
            <Card className="bg-[#1A1A1A] border-[#333333] rounded-lg">
              <Collapsible open={schedulingOpen} onOpenChange={setSchedulingOpen}>
                <CollapsibleTrigger asChild>
                  <CardHeader className="cursor-pointer hover:bg-[#232323] transition-colors rounded-t-lg">
                    <div className="flex items-center justify-between">
                      <div className="flex items-center gap-3">
                        <Calendar className="w-5 h-5 text-[#00B4D8]" />
                        <div>
                          <CardTitle className="text-lg text-[#E0E0E0]">Scheduling (Power On/Off)</CardTitle>
                          <CardDescription className="text-gray-400">
                            Schedule when forwarding is active
                          </CardDescription>
                        </div>
                        <Badge className="bg-yellow-500/20 text-yellow-300 border-yellow-500/30">
                          Premium
                        </Badge>
                      </div>
                      {schedulingOpen ? (
                        <ChevronUp className="w-5 h-5 text-gray-400" />
                      ) : (
                        <ChevronDown className="w-5 h-5 text-gray-400" />
                      )}
                    </div>
                  </CardHeader>
                </CollapsibleTrigger>
                <CollapsibleContent>
                  <CardContent className="space-y-4">
                    <FormField
                      control={form.control}
                      name="schedulingEnabled"
                      render={({ field }) => (
                        <FormItem className="flex flex-row items-center space-x-3 space-y-0 rounded-lg border border-[#333333] p-4">
                          <FormControl>
                            <Checkbox
                              checked={field.value}
                              onCheckedChange={field.onChange}
                              className="border-[#333333] data-[state=checked]:bg-[#00B4D8] data-[state=checked]:border-[#00B4D8]"
                            />
                          </FormControl>
                          <div className="space-y-1 leading-none">
                            <FormLabel className="text-[#E0E0E0]">Enable Scheduling</FormLabel>
                            <FormDescription className="text-gray-500 text-sm">
                              Set specific times and days when forwarding is active
                            </FormDescription>
                          </div>
                        </FormItem>
                      )}
                    />

                    {form.watch("schedulingEnabled") && (
                      <>
                        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                          <FormField
                            control={form.control}
                            name="scheduleStartTime"
                            render={({ field }) => (
                              <FormItem>
                                <FormLabel className="text-[#E0E0E0]">Start Time</FormLabel>
                                <FormControl>
                                  <Input
                                    type="time"
                                    {...field}
                                    className="bg-[#1E1E1E] border-[#333333] text-[#E0E0E0] focus:border-[#00B4D8] rounded-lg"
                                  />
                                </FormControl>
                                <FormMessage />
                              </FormItem>
                            )}
                          />

                          <FormField
                            control={form.control}
                            name="scheduleEndTime"
                            render={({ field }) => (
                              <FormItem>
                                <FormLabel className="text-[#E0E0E0]">End Time</FormLabel>
                                <FormControl>
                                  <Input
                                    type="time"
                                    {...field}
                                    className="bg-[#1E1E1E] border-[#333333] text-[#E0E0E0] focus:border-[#00B4D8] rounded-lg"
                                  />
                                </FormControl>
                                <FormMessage />
                              </FormItem>
                            )}
                          />
                        </div>

                        <FormField
                          control={form.control}
                          name="scheduleDays"
                          render={({ field }) => (
                            <FormItem>
                              <FormLabel className="text-[#E0E0E0]">Active Days</FormLabel>
                              <div className="grid grid-cols-2 md:grid-cols-4 gap-3 mt-2">
                                {dayOptions.map((day) => (
                                  <div key={day.value} className="flex items-center space-x-2">
                                    <Checkbox
                                      id={day.value}
                                      checked={field.value?.includes(day.value)}
                                      onCheckedChange={(checked) => {
                                        const current = field.value || [];
                                        if (checked) {
                                          field.onChange([...current, day.value]);
                                        } else {
                                          field.onChange(current.filter((v) => v !== day.value));
                                        }
                                      }}
                                      className="border-[#333333] data-[state=checked]:bg-[#00B4D8] data-[state=checked]:border-[#00B4D8]"
                                    />
                                    <label 
                                      htmlFor={day.value} 
                                      className="text-sm text-[#E0E0E0] cursor-pointer"
                                    >
                                      {day.label}
                                    </label>
                                  </div>
                                ))}
                              </div>
                              <FormDescription className="text-gray-500 text-sm">
                                Select the days when forwarding should be active
                              </FormDescription>
                              <FormMessage />
                            </FormItem>
                          )}
                        />
                      </>
                    )}
                  </CardContent>
                </CollapsibleContent>
              </Collapsible>
            </Card>
          )}

          {/* Save All Button (Sticky at bottom) */}
          <div className="sticky bottom-0 z-10 bg-[#121212] pt-4 border-t border-[#333333]">
            <div className="flex justify-center gap-3">
              <Button
                type="button"
                variant="outline"
                onClick={handleReset}
                className="border-[#333333] text-[#E0E0E0] hover:bg-[#333333] rounded-lg"
              >
                <RotateCcw className="w-4 h-4 mr-2" />
                Reset All Changes
              </Button>
              <Button
                type="submit"
                disabled={saveRulesMutation.isPending}
                className="bg-[#00B4D8] hover:bg-[#00B4D8]/80 text-white rounded-lg px-8"
              >
                <Save className="w-4 h-4 mr-2" />
                {saveRulesMutation.isPending ? "Saving..." : "Save All Rules"}
              </Button>
            </div>
          </div>
        </form>
      </Form>
    </div>
  );
}