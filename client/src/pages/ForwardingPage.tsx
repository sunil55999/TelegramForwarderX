import { useState } from "react";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { z } from "zod";
import { Plus, ArrowRight, Power, PowerOff, Trash2, Filter, Settings, ChevronDown, ChevronUp } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Card, CardHeader, CardTitle, CardDescription, CardContent } from "@/components/ui/card";
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import { Form, FormControl, FormDescription, FormField, FormItem, FormLabel, FormMessage } from "@/components/ui/form";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Checkbox } from "@/components/ui/checkbox";
import { Badge } from "@/components/ui/badge";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Separator } from "@/components/ui/separator";
import { useToast } from "@/hooks/use-toast";
import { apiRequest } from "@/lib/queryClient";

// Form schema for the redesigned modal
const createMappingSchema = z.object({
  pairName: z.string().min(1, "Pair name is required"),
  pairType: z.enum(["channel-to-channel", "channel-to-group", "group-to-channel", "group-to-group"]).default("channel-to-channel"),
  // Source details
  sourceTitle: z.string().min(1, "Source title is required"),
  sourceType: z.enum(["channel", "group"]).default("channel"),
  // Destination details
  destinationTitle: z.string().min(1, "Destination title is required"),
  destinationType: z.enum(["channel", "group"]).default("channel"),
  // Advanced filters
  includeKeywords: z.string().optional(),
  excludeKeywords: z.string().optional(),
  keywordMatchMode: z.enum(["any", "all"]).default("any"),
  caseSensitive: z.boolean().default(false),
  allowedMessageTypes: z.array(z.string()).optional(),
  blockUrls: z.boolean().default(false),
  blockForwards: z.boolean().default(false),
  minMessageLength: z.number().default(0),
  maxMessageLength: z.number().default(4096),
  // Advanced editing
  headerText: z.string().optional(),
  footerText: z.string().optional(),
  removeSenderInfo: z.boolean().default(false),
  removeUrls: z.boolean().default(false),
  removeHashtags: z.boolean().default(false),
  removeMentions: z.boolean().default(false),
  preserveFormatting: z.boolean().default(true),
});

type CreateMappingFormData = z.infer<typeof createMappingSchema>;

interface ForwardingMapping {
  id: string;
  sourceName: string;
  destinationName: string;
  priority: number;
  isActive: boolean;
  createdAt: string;
  filters: {
    includeKeywords: string[];
    excludeKeywords: string[];
    allowedMessageTypes: string[];
    blockUrls: boolean;
    blockForwards: boolean;
  };
  editing: {
    headerText?: string;
    footerText?: string;
    removeSenderInfo: boolean;
    removeUrls: boolean;
    removeHashtags: boolean;
    removeMentions: boolean;
  };
}

interface Source {
  id: string;
  chatTitle: string;
  chatType: string;
  isActive: boolean;
}

interface Destination {
  id: string;
  chatTitle: string;
  chatType: string;
  isActive: boolean;
}

const messageTypeOptions = [
  { value: "text", label: "Text Messages" },
  { value: "photo", label: "Photos" },
  { value: "video", label: "Videos" },
  { value: "document", label: "Documents" },
  { value: "voice", label: "Voice Messages" },
  { value: "sticker", label: "Stickers" },
];

export default function ForwardingPage() {
  const [isCreateDialogOpen, setIsCreateDialogOpen] = useState(false);
  const [showAdvanced, setShowAdvanced] = useState(false);
  const { toast } = useToast();
  const queryClient = useQueryClient();

  const form = useForm<CreateMappingFormData>({
    resolver: zodResolver(createMappingSchema),
    defaultValues: {
      pairName: "",
      pairType: "channel-to-channel",
      sourceTitle: "",
      sourceType: "channel",
      destinationTitle: "",
      destinationType: "channel", 
      includeKeywords: "",
      excludeKeywords: "",
      keywordMatchMode: "any",
      caseSensitive: false,
      allowedMessageTypes: [],
      blockUrls: false,
      blockForwards: false,
      minMessageLength: 0,
      maxMessageLength: 4096,
      headerText: "",
      footerText: "",
      removeSenderInfo: false,
      removeUrls: false,
      removeHashtags: false,
      removeMentions: false,
      preserveFormatting: true,
    },
  });

  const { data: mappings = [], isLoading } = useQuery<ForwardingMapping[]>({
    queryKey: ["/api/forwarding/mappings"],
  });

  const createMappingMutation = useMutation({
    mutationFn: (data: CreateMappingFormData) => {
      const apiData = {
        pairName: data.pairName,
        pairType: data.pairType,
        priority: 5, // Set default priority in backend
        // Create new source/destination with the provided details
        newSource: {
          chatTitle: data.sourceTitle,
          chatType: data.sourceType,
          phoneNumber: "+1234567890", // Auto-fill logic or backend default
          apiId: "123456",
          apiHash: "abcdef123456",
          isActive: true,
        },
        newDestination: {
          chatTitle: data.destinationTitle,
          chatType: data.destinationType,
          phoneNumber: "+1234567890", // Auto-fill logic or backend default
          apiId: "123456",
          apiHash: "abcdef123456", 
          isActive: true,
        },
        // Filters and editing
        includeKeywords: data.includeKeywords ? data.includeKeywords.split(",").map(k => k.trim()) : [],
        excludeKeywords: data.excludeKeywords ? data.excludeKeywords.split(",").map(k => k.trim()) : [],
        keywordMatchMode: data.keywordMatchMode,
        caseSensitive: data.caseSensitive,
        allowedMessageTypes: data.allowedMessageTypes || [],
        blockUrls: data.blockUrls,
        blockForwards: data.blockForwards,
        minMessageLength: data.minMessageLength,
        maxMessageLength: data.maxMessageLength,
        headerText: data.headerText,
        footerText: data.footerText,
        removeSenderInfo: data.removeSenderInfo,
        removeUrls: data.removeUrls,
        removeHashtags: data.removeHashtags,
        removeMentions: data.removeMentions,
        preserveFormatting: data.preserveFormatting,
      };

      return apiRequest("/api/forwarding/mappings", "POST", apiData);
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/forwarding/mappings"] });
      setIsCreateDialogOpen(false);
      setShowAdvanced(false);
      form.reset();
      toast({
        title: "Success",
        description: "Forwarding mapping created successfully",
      });
    },
    onError: (error: any) => {
      toast({
        title: "Error",
        description: error.message || "Failed to create mapping",
        variant: "destructive",
      });
    },
  });

  const toggleMappingMutation = useMutation({
    mutationFn: (id: string) => apiRequest(`/api/forwarding/mappings/${id}/toggle`, "PUT"),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/forwarding/mappings"] });
    },
  });

  const deleteMappingMutation = useMutation({
    mutationFn: (id: string) => apiRequest(`/api/forwarding/mappings/${id}`, "DELETE"),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/forwarding/mappings"] });
    },
  });

  const onSubmit = (data: CreateMappingFormData) => {
    createMappingMutation.mutate(data);
  };

  const handleToggle = (id: string) => {
    toggleMappingMutation.mutate(id);
  };

  const handleDelete = (id: string, sourceName: string, destinationName: string) => {
    if (confirm(`Delete mapping from ${sourceName} to ${destinationName}?`)) {
      deleteMappingMutation.mutate(id);
    }
  };

  if (isLoading) {
    return <div className="p-8 text-[#E0E0E0]">Loading...</div>;
  }

  return (
    <div className="space-y-6 p-4 md:p-6">
      <div className="flex flex-col sm:flex-row sm:justify-between sm:items-center gap-4">
        <div>
          <h1 className="text-2xl md:text-3xl font-bold text-[#E0E0E0]">Forwarding Mappings</h1>
          <p className="text-gray-400 mt-1">Manage your message forwarding rules</p>
        </div>
        <Dialog open={isCreateDialogOpen} onOpenChange={setIsCreateDialogOpen}>
          <DialogTrigger asChild>
            <Button className="bg-[#00B4D8] hover:bg-[#00B4D8]/80 text-white rounded-lg px-6 py-2 font-medium w-full sm:w-auto">
              <Plus className="w-4 h-4 mr-2" />
              Create Mapping
            </Button>
          </DialogTrigger>
          <DialogContent className="max-w-4xl max-h-[90vh] overflow-y-auto bg-[#121212] border-[#333333]">
            <DialogHeader>
              <DialogTitle className="text-2xl text-[#E0E0E0]">Create New Mapping</DialogTitle>
              <DialogDescription className="text-gray-400">
                Set up a complete forwarding pair with source, destination, and optional filters
              </DialogDescription>
            </DialogHeader>
            
            <Form {...form}>
              <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-8">
                {/* 1. Pair Details Block */}
                <div className="space-y-4">
                  <div className="flex items-center gap-3 pb-2 border-b border-[#333333]">
                    <h3 className="text-lg font-semibold text-[#E0E0E0]">Pair Details</h3>
                  </div>
                  
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                    <FormField
                      control={form.control}
                      name="pairName"
                      render={({ field }) => (
                        <FormItem>
                          <FormLabel className="text-[#E0E0E0]">Pair Name *</FormLabel>
                          <FormControl>
                            <Input 
                              placeholder="e.g., News to Community" 
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
                      name="pairType"
                      render={({ field }) => (
                        <FormItem>
                          <FormLabel className="text-[#E0E0E0]">Pair Type</FormLabel>
                          <Select onValueChange={field.onChange} defaultValue={field.value}>
                            <FormControl>
                              <SelectTrigger className="bg-[#1E1E1E] border-[#333333] text-[#E0E0E0] focus:border-[#00B4D8] rounded-lg">
                                <SelectValue />
                              </SelectTrigger>
                            </FormControl>
                            <SelectContent className="bg-[#1E1E1E] border-[#333333]">
                              <SelectItem value="channel-to-channel">Channel → Channel</SelectItem>
                              <SelectItem value="channel-to-group">Channel → Group</SelectItem>
                              <SelectItem value="group-to-channel">Group → Channel</SelectItem>
                              <SelectItem value="group-to-group">Group → Group</SelectItem>
                            </SelectContent>
                          </Select>
                          <FormMessage />
                        </FormItem>
                      )}
                    />
                  </div>
                </div>

                <Separator className="bg-[#333333]" />

                {/* 2. Source & Destination Block */}
                <div className="space-y-6">
                  <div className="flex items-center gap-3 pb-2 border-b border-[#333333]">
                    <h3 className="text-lg font-semibold text-[#E0E0E0]">Source & Destination</h3>
                  </div>
                  
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                    {/* Source Input Box */}
                    <Card className="bg-[#1A1A1A] border-[#333333] rounded-lg">
                      <CardHeader className="pb-3">
                        <CardTitle className="text-base text-[#00B4D8]">Source</CardTitle>
                        <CardDescription className="text-gray-400">Where messages come from</CardDescription>
                      </CardHeader>
                      <CardContent className="space-y-4">
                        <FormField
                          control={form.control}
                          name="sourceTitle"
                          render={({ field }) => (
                            <FormItem>
                              <FormLabel className="text-[#E0E0E0]">Chat Title *</FormLabel>
                              <FormControl>
                                <Input 
                                  placeholder="Channel/Group name" 
                                  {...field} 
                                  className="bg-[#232323] border-[#333333] text-[#E0E0E0] focus:border-[#00B4D8] rounded-lg"
                                />
                              </FormControl>
                              <FormMessage />
                            </FormItem>
                          )}
                        />
                        
                        <FormField
                          control={form.control}
                          name="sourceType"
                          render={({ field }) => (
                            <FormItem>
                              <FormLabel className="text-[#E0E0E0]">Type *</FormLabel>
                              <Select onValueChange={field.onChange} defaultValue={field.value}>
                                <FormControl>
                                  <SelectTrigger className="bg-[#232323] border-[#333333] text-[#E0E0E0] focus:border-[#00B4D8] rounded-lg">
                                    <SelectValue />
                                  </SelectTrigger>
                                </FormControl>
                                <SelectContent className="bg-[#1E1E1E] border-[#333333]">
                                  <SelectItem value="channel">Channel</SelectItem>
                                  <SelectItem value="group">Group</SelectItem>
                                </SelectContent>
                              </Select>
                              <FormMessage />
                            </FormItem>
                          )}
                        />
                      </CardContent>
                    </Card>

                    {/* Destination Input Box */}
                    <Card className="bg-[#1A1A1A] border-[#333333] rounded-lg">
                      <CardHeader className="pb-3">
                        <CardTitle className="text-base text-[#00B4D8]">Destination</CardTitle>
                        <CardDescription className="text-gray-400">Where messages go to</CardDescription>
                      </CardHeader>
                      <CardContent className="space-y-4">
                        <FormField
                          control={form.control}
                          name="destinationTitle"
                          render={({ field }) => (
                            <FormItem>
                              <FormLabel className="text-[#E0E0E0]">Chat Title *</FormLabel>
                              <FormControl>
                                <Input 
                                  placeholder="Channel/Group name" 
                                  {...field} 
                                  className="bg-[#232323] border-[#333333] text-[#E0E0E0] focus:border-[#00B4D8] rounded-lg"
                                />
                              </FormControl>
                              <FormMessage />
                            </FormItem>
                          )}
                        />
                        
                        <FormField
                          control={form.control}
                          name="destinationType"
                          render={({ field }) => (
                            <FormItem>
                              <FormLabel className="text-[#E0E0E0]">Type *</FormLabel>
                              <Select onValueChange={field.onChange} defaultValue={field.value}>
                                <FormControl>
                                  <SelectTrigger className="bg-[#232323] border-[#333333] text-[#E0E0E0] focus:border-[#00B4D8] rounded-lg">
                                    <SelectValue />
                                  </SelectTrigger>
                                </FormControl>
                                <SelectContent className="bg-[#1E1E1E] border-[#333333]">
                                  <SelectItem value="channel">Channel</SelectItem>
                                  <SelectItem value="group">Group</SelectItem>
                                </SelectContent>
                              </Select>
                              <FormMessage />
                            </FormItem>
                          )}
                        />
                      </CardContent>
                    </Card>
                  </div>
                </div>

                <Separator className="bg-[#333333]" />

                {/* 3. Optional Advanced Settings */}
                <div className="space-y-4">
                  <div className="flex items-center justify-between pb-2 border-b border-[#333333]">
                    <h3 className="text-lg font-semibold text-[#E0E0E0]">Optional Filters & Settings</h3>
                    <Button
                      type="button"
                      variant="ghost"
                      onClick={() => setShowAdvanced(!showAdvanced)}
                      className="text-[#00B4D8] hover:bg-[#00B4D8]/10 rounded-lg"
                    >
                      {showAdvanced ? (
                        <>
                          <ChevronUp className="w-4 h-4 mr-2" />
                          Hide Advanced Options
                        </>
                      ) : (
                        <>
                          <ChevronDown className="w-4 h-4 mr-2" />
                          Show Advanced Options
                        </>
                      )}
                    </Button>
                  </div>
                  
                  {showAdvanced && (
                    <div>
                      <Tabs defaultValue="filters" className="w-full">
                        <TabsList className="grid w-full grid-cols-2 bg-[#1E1E1E] rounded-lg">
                          <TabsTrigger 
                            value="filters" 
                            className="data-[state=active]:bg-[#00B4D8] data-[state=active]:text-white rounded-lg"
                          >
                            Filters
                          </TabsTrigger>
                          <TabsTrigger 
                            value="editing" 
                            className="data-[state=active]:bg-[#00B4D8] data-[state=active]:text-white rounded-lg"
                          >
                            Editing
                          </TabsTrigger>
                        </TabsList>
                        
                        <TabsContent value="filters" className="mt-6 space-y-4">
                          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                            <FormField
                              control={form.control}
                              name="includeKeywords"
                              render={({ field }) => (
                                <FormItem>
                                  <FormLabel className="text-[#E0E0E0]">Include Keywords</FormLabel>
                                  <FormControl>
                                    <Input 
                                      placeholder="crypto, trading, news" 
                                      {...field} 
                                      className="bg-[#1E1E1E] border-[#333333] text-[#E0E0E0] focus:border-[#00B4D8] rounded-lg"
                                    />
                                  </FormControl>
                                  <FormDescription className="text-gray-500 text-sm">
                                    Comma-separated list of required keywords
                                  </FormDescription>
                                  <FormMessage />
                                </FormItem>
                              )}
                            />
                            
                            <FormField
                              control={form.control}
                              name="excludeKeywords"
                              render={({ field }) => (
                                <FormItem>
                                  <FormLabel className="text-[#E0E0E0]">Exclude Keywords</FormLabel>
                                  <FormControl>
                                    <Input 
                                      placeholder="spam, ads, promotion" 
                                      {...field} 
                                      className="bg-[#1E1E1E] border-[#333333] text-[#E0E0E0] focus:border-[#00B4D8] rounded-lg"
                                    />
                                  </FormControl>
                                  <FormDescription className="text-gray-500 text-sm">
                                    Messages with these keywords will be blocked
                                  </FormDescription>
                                  <FormMessage />
                                </FormItem>
                              )}
                            />
                          </div>

                          <FormField
                            control={form.control}
                            name="allowedMessageTypes"
                            render={({ field }) => (
                              <FormItem>
                                <FormLabel className="text-[#E0E0E0]">Allowed Message Types</FormLabel>
                                <div className="grid grid-cols-2 md:grid-cols-3 gap-3 mt-2">
                                  {messageTypeOptions.map((option) => (
                                    <div key={option.value} className="flex items-center space-x-2">
                                      <Checkbox
                                        id={option.value}
                                        checked={field.value?.includes(option.value)}
                                        onCheckedChange={(checked) => {
                                          const current = field.value || [];
                                          if (checked) {
                                            field.onChange([...current, option.value]);
                                          } else {
                                            field.onChange(current.filter((v) => v !== option.value));
                                          }
                                        }}
                                        className="border-[#333333] data-[state=checked]:bg-[#00B4D8] data-[state=checked]:border-[#00B4D8]"
                                      />
                                      <label 
                                        htmlFor={option.value} 
                                        className="text-sm text-[#E0E0E0] cursor-pointer"
                                      >
                                        {option.label}
                                      </label>
                                    </div>
                                  ))}
                                </div>
                                <FormDescription className="text-gray-500 text-sm">
                                  Leave empty to allow all message types
                                </FormDescription>
                                <FormMessage />
                              </FormItem>
                            )}
                          />
                          
                          <div className="grid grid-cols-2 gap-4">
                            <FormField
                              control={form.control}
                              name="blockUrls"
                              render={({ field }) => (
                                <FormItem className="flex flex-row items-start space-x-3 space-y-0 rounded-lg border border-[#333333] p-4">
                                  <FormControl>
                                    <Checkbox
                                      checked={field.value}
                                      onCheckedChange={field.onChange}
                                      className="border-[#333333] data-[state=checked]:bg-[#00B4D8] data-[state=checked]:border-[#00B4D8]"
                                    />
                                  </FormControl>
                                  <div className="space-y-1 leading-none">
                                    <FormLabel className="text-[#E0E0E0]">Block URLs</FormLabel>
                                    <FormDescription className="text-gray-500 text-sm">
                                      Block messages containing URLs
                                    </FormDescription>
                                  </div>
                                </FormItem>
                              )}
                            />
                            
                            <FormField
                              control={form.control}
                              name="blockForwards"
                              render={({ field }) => (
                                <FormItem className="flex flex-row items-start space-x-3 space-y-0 rounded-lg border border-[#333333] p-4">
                                  <FormControl>
                                    <Checkbox
                                      checked={field.value}
                                      onCheckedChange={field.onChange}
                                      className="border-[#333333] data-[state=checked]:bg-[#00B4D8] data-[state=checked]:border-[#00B4D8]"
                                    />
                                  </FormControl>
                                  <div className="space-y-1 leading-none">
                                    <FormLabel className="text-[#E0E0E0]">Block Forwards</FormLabel>
                                    <FormDescription className="text-gray-500 text-sm">
                                      Block forwarded messages
                                    </FormDescription>
                                  </div>
                                </FormItem>
                              )}
                            />
                          </div>
                        </TabsContent>
                        
                        <TabsContent value="editing" className="mt-6 space-y-4">
                          <div className="grid grid-cols-1 gap-4">
                            <FormField
                              control={form.control}
                              name="headerText"
                              render={({ field }) => (
                                <FormItem>
                                  <FormLabel className="text-[#E0E0E0]">Header Text</FormLabel>
                                  <FormControl>
                                    <Textarea 
                                      placeholder="Text to add at the beginning of messages" 
                                      {...field} 
                                      className="bg-[#1E1E1E] border-[#333333] text-[#E0E0E0] focus:border-[#00B4D8] rounded-lg resize-none"
                                      rows={3}
                                    />
                                  </FormControl>
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
                                      placeholder="Text to add at the end of messages" 
                                      {...field} 
                                      className="bg-[#1E1E1E] border-[#333333] text-[#E0E0E0] focus:border-[#00B4D8] rounded-lg resize-none"
                                      rows={3}
                                    />
                                  </FormControl>
                                  <FormMessage />
                                </FormItem>
                              )}
                            />
                            
                            <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
                              <FormField
                                control={form.control}
                                name="removeSenderInfo"
                                render={({ field }) => (
                                  <FormItem className="flex flex-row items-start space-x-3 space-y-0 rounded-lg border border-[#333333] p-4">
                                    <FormControl>
                                      <Checkbox
                                        checked={field.value}
                                        onCheckedChange={field.onChange}
                                        className="border-[#333333] data-[state=checked]:bg-[#00B4D8] data-[state=checked]:border-[#00B4D8]"
                                      />
                                    </FormControl>
                                    <div className="space-y-1 leading-none">
                                      <FormLabel className="text-[#E0E0E0] text-sm">Remove Sender Info</FormLabel>
                                    </div>
                                  </FormItem>
                                )}
                              />
                              
                              <FormField
                                control={form.control}
                                name="removeUrls"
                                render={({ field }) => (
                                  <FormItem className="flex flex-row items-start space-x-3 space-y-0 rounded-lg border border-[#333333] p-4">
                                    <FormControl>
                                      <Checkbox
                                        checked={field.value}
                                        onCheckedChange={field.onChange}
                                        className="border-[#333333] data-[state=checked]:bg-[#00B4D8] data-[state=checked]:border-[#00B4D8]"
                                      />
                                    </FormControl>
                                    <div className="space-y-1 leading-none">
                                      <FormLabel className="text-[#E0E0E0] text-sm">Remove URLs</FormLabel>
                                    </div>
                                  </FormItem>
                                )}
                              />
                              
                              <FormField
                                control={form.control}
                                name="removeHashtags"
                                render={({ field }) => (
                                  <FormItem className="flex flex-row items-start space-x-3 space-y-0 rounded-lg border border-[#333333] p-4">
                                    <FormControl>
                                      <Checkbox
                                        checked={field.value}
                                        onCheckedChange={field.onChange}
                                        className="border-[#333333] data-[state=checked]:bg-[#00B4D8] data-[state=checked]:border-[#00B4D8]"
                                      />
                                    </FormControl>
                                    <div className="space-y-1 leading-none">
                                      <FormLabel className="text-[#E0E0E0] text-sm">Remove Hashtags</FormLabel>
                                    </div>
                                  </FormItem>
                                )}
                              />
                              
                              <FormField
                                control={form.control}
                                name="removeMentions"
                                render={({ field }) => (
                                  <FormItem className="flex flex-row items-start space-x-3 space-y-0 rounded-lg border border-[#333333] p-4">
                                    <FormControl>
                                      <Checkbox
                                        checked={field.value}
                                        onCheckedChange={field.onChange}
                                        className="border-[#333333] data-[state=checked]:bg-[#00B4D8] data-[state=checked]:border-[#00B4D8]"
                                      />
                                    </FormControl>
                                    <div className="space-y-1 leading-none">
                                      <FormLabel className="text-[#E0E0E0] text-sm">Remove Mentions</FormLabel>
                                    </div>
                                  </FormItem>
                                )}
                              />
                            </div>
                          </div>
                        </TabsContent>
                      </Tabs>
                    </div>
                  )}
                </div>

                {/* Action Buttons */}
                <div className="flex justify-end space-x-3 pt-6 border-t border-[#333333]">
                  <Button
                    type="button"
                    variant="outline"
                    onClick={() => {
                      setIsCreateDialogOpen(false);
                      setShowAdvanced(false);
                      form.reset();
                    }}
                    className="border-[#333333] text-[#E0E0E0] hover:bg-[#1E1E1E] rounded-lg"
                  >
                    Cancel
                  </Button>
                  <Button 
                    type="submit" 
                    disabled={createMappingMutation.isPending}
                    className="bg-[#00B4D8] hover:bg-[#00B4D8]/80 text-white rounded-lg min-w-[140px]"
                  >
                    {createMappingMutation.isPending ? "Creating..." : "Create Mapping"}
                  </Button>
                </div>
              </form>
            </Form>
          </DialogContent>
        </Dialog>
      </div>

      {/* Mappings List */}
      <div className="space-y-4">
        {mappings.map((mapping) => (
          <Card key={mapping.id} className="bg-[#1A1A1A] border-[#333333] rounded-lg">
            <CardHeader className="pb-3">
              <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
                <div className="flex-1 min-w-0">
                  <CardTitle className="text-lg flex items-center text-[#E0E0E0] break-all">
                    <span className="truncate">{mapping.sourceName}</span>
                    <ArrowRight className="w-4 h-4 mx-2 text-[#00B4D8] flex-shrink-0" />
                    <span className="truncate">{mapping.destinationName}</span>
                  </CardTitle>
                  <CardDescription className="text-gray-400 mt-1">
                    Priority: {mapping.priority} • 
                    Created: {new Date(mapping.createdAt).toLocaleDateString()}
                  </CardDescription>
                </div>
                <div className="flex items-center gap-2 flex-shrink-0">
                  <Badge variant={mapping.isActive ? "default" : "secondary"} className={
                    mapping.isActive 
                      ? "bg-[#00B4D8] text-white" 
                      : "bg-gray-600 text-gray-300"
                  }>
                    {mapping.isActive ? "Active" : "Inactive"}
                  </Badge>
                  <Button
                    size="sm"
                    variant="ghost"
                    onClick={() => handleToggle(mapping.id)}
                    disabled={toggleMappingMutation.isPending}
                    className="text-[#E0E0E0] hover:bg-[#333333] rounded-lg p-2"
                    title={mapping.isActive ? "Deactivate" : "Activate"}
                  >
                    {mapping.isActive ? (
                      <PowerOff className="w-4 h-4" />
                    ) : (
                      <Power className="w-4 h-4" />
                    )}
                  </Button>
                  <Button
                    size="sm"
                    variant="ghost"
                    onClick={() => handleDelete(mapping.id, mapping.sourceName, mapping.destinationName)}
                    disabled={deleteMappingMutation.isPending}
                    className="text-red-400 hover:bg-red-500/10 rounded-lg p-2"
                    title="Delete"
                  >
                    <Trash2 className="w-4 h-4" />
                  </Button>
                </div>
              </div>
            </CardHeader>
            <CardContent>
              <div className="grid lg:grid-cols-2 gap-6">
                <div className="space-y-2">
                  <h4 className="font-medium flex items-center text-[#E0E0E0]">
                    <Filter className="w-4 h-4 mr-2 text-[#00B4D8]" />
                    Filters
                  </h4>
                  <div className="space-y-1 text-sm text-gray-400 pl-6">
                    {mapping.filters.includeKeywords.length > 0 && (
                      <div>Include: {mapping.filters.includeKeywords.join(", ")}</div>
                    )}
                    {mapping.filters.excludeKeywords.length > 0 && (
                      <div>Exclude: {mapping.filters.excludeKeywords.join(", ")}</div>
                    )}
                    {mapping.filters.allowedMessageTypes.length > 0 && (
                      <div>Types: {mapping.filters.allowedMessageTypes.join(", ")}</div>
                    )}
                    {mapping.filters.blockUrls && <div>• Blocks URLs</div>}
                    {mapping.filters.blockForwards && <div>• Blocks forwards</div>}
                    {!mapping.filters.includeKeywords.length && 
                     !mapping.filters.excludeKeywords.length && 
                     !mapping.filters.allowedMessageTypes.length && 
                     !mapping.filters.blockUrls && 
                     !mapping.filters.blockForwards && (
                      <div className="text-gray-500 italic">No filters applied</div>
                    )}
                  </div>
                </div>
                <div className="space-y-2">
                  <h4 className="font-medium flex items-center text-[#E0E0E0]">
                    <Settings className="w-4 h-4 mr-2 text-[#00B4D8]" />
                    Editing
                  </h4>
                  <div className="space-y-1 text-sm text-gray-400 pl-6">
                    {mapping.editing.headerText && (
                      <div>Header: "{mapping.editing.headerText}"</div>
                    )}
                    {mapping.editing.footerText && (
                      <div>Footer: "{mapping.editing.footerText}"</div>
                    )}
                    {mapping.editing.removeSenderInfo && <div>• Removes sender info</div>}
                    {mapping.editing.removeUrls && <div>• Removes URLs</div>}
                    {mapping.editing.removeHashtags && <div>• Removes hashtags</div>}
                    {mapping.editing.removeMentions && <div>• Removes mentions</div>}
                    {!mapping.editing.headerText && 
                     !mapping.editing.footerText && 
                     !mapping.editing.removeSenderInfo && 
                     !mapping.editing.removeUrls && 
                     !mapping.editing.removeHashtags && 
                     !mapping.editing.removeMentions && (
                      <div className="text-gray-500 italic">No editing applied</div>
                    )}
                  </div>
                </div>
              </div>
            </CardContent>
          </Card>
        ))}
      </div>

      {mappings.length === 0 && (
        <div className="flex items-center justify-center min-h-[400px]">
          <Card className="bg-[#1A1A1A] border-[#333333] rounded-lg max-w-md w-full">
            <CardContent className="py-12">
              <div className="text-center space-y-6">
                <ArrowRight className="w-16 h-16 mx-auto text-gray-600" />
                <div className="space-y-2">
                  <h3 className="text-xl font-medium text-[#E0E0E0]">Create Your First Mapping</h3>
                  <p className="text-gray-400">Set up message forwarding between channels and groups</p>
                </div>
                <Button 
                  onClick={() => setIsCreateDialogOpen(true)}
                  className="bg-[#00B4D8] hover:bg-[#00B4D8]/80 text-white rounded-lg px-6 py-3"
                >
                  <Plus className="w-5 h-5 mr-2" />
                  Create Mapping
                </Button>
              </div>
            </CardContent>
          </Card>
        </div>
      )}
    </div>
  );
}