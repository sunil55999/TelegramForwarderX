import { useState } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { Plus, Trash2, Power, PowerOff, ArrowRight, Settings, Filter } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import { Form, FormControl, FormDescription, FormField, FormItem, FormLabel, FormMessage } from "@/components/ui/form";
import { Input } from "@/components/ui/input";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Badge } from "@/components/ui/badge";
import { Checkbox } from "@/components/ui/checkbox";
import { Textarea } from "@/components/ui/textarea";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Separator } from "@/components/ui/separator";
import { useToast } from "@/hooks/use-toast";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { z } from "zod";
import { apiRequest } from "@/lib/queryClient";

const createMappingSchema = z.object({
  pairName: z.string().min(1, "Pair name is required"),
  pairType: z.enum(["channel-to-channel", "channel-to-group", "group-to-channel", "group-to-group"]),
  sourceId: z.string().min(1, "Source is required"),
  destinationId: z.string().min(1, "Destination is required"),
  priority: z.number().min(1).max(10).default(1),
  
  // New source creation (optional)
  newSource: z.object({
    chatTitle: z.string().min(1, "Chat title is required"),
    chatType: z.enum(["channel", "group"]),
    phoneNumber: z.string().min(1, "Phone number is required"),
    apiId: z.string().min(1, "API ID is required"),
    apiHash: z.string().min(1, "API Hash is required"),
  }).optional(),
  
  // New destination creation (optional)
  newDestination: z.object({
    chatTitle: z.string().min(1, "Chat title is required"),
    chatType: z.enum(["channel", "group"]),
    phoneNumber: z.string().min(1, "Phone number is required"),
    apiId: z.string().min(1, "API ID is required"),
    apiHash: z.string().min(1, "API Hash is required"),
  }).optional(),
  
  // Filters
  includeKeywords: z.string().optional(),
  excludeKeywords: z.string().optional(),
  keywordMatchMode: z.enum(["any", "all"]).default("any"),
  caseSensitive: z.boolean().default(false),
  allowedMessageTypes: z.array(z.string()).optional(),
  blockUrls: z.boolean().default(false),
  blockForwards: z.boolean().default(false),
  minMessageLength: z.number().min(0).default(0),
  maxMessageLength: z.number().min(1).default(4096),
  
  // Editing
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
  sourceId: string;
  destinationId: string;
  sourceName: string;
  destinationName: string;
  isActive: boolean;
  priority: number;
  filters: {
    includeKeywords: string[];
    excludeKeywords: string[];
    keywordMatchMode: string;
    caseSensitive: boolean;
    allowedMessageTypes: string[];
    blockUrls: boolean;
    blockForwards: boolean;
    minMessageLength: number;
    maxMessageLength: number;
  };
  editing: {
    headerText?: string;
    footerText?: string;
    removeSenderInfo: boolean;
    removeUrls: boolean;
    removeHashtags: boolean;
    removeMentions: boolean;
    preserveFormatting: boolean;
  };
  createdAt: string;
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
  const [showNewSourceForm, setShowNewSourceForm] = useState(false);
  const [showNewDestinationForm, setShowNewDestinationForm] = useState(false);
  const { toast } = useToast();
  const queryClient = useQueryClient();

  const form = useForm<CreateMappingFormData>({
    resolver: zodResolver(createMappingSchema),
    defaultValues: {
      pairName: "",
      pairType: "channel-to-channel",
      sourceId: "",
      destinationId: "",
      priority: 1,
      keywordMatchMode: "any",
      caseSensitive: false,
      blockUrls: false,
      blockForwards: false,
      minMessageLength: 0,
      maxMessageLength: 4096,
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

  const { data: sources = [] } = useQuery<Source[]>({
    queryKey: ["/api/sources"],
  });

  const { data: destinations = [] } = useQuery<Destination[]>({
    queryKey: ["/api/destinations"],
  });

  const createMappingMutation = useMutation({
    mutationFn: (data: CreateMappingFormData) => {
      // Transform form data to API format with support for new source/destination
      const apiData = {
        pairName: data.pairName,
        pairType: data.pairType,
        sourceId: data.sourceId,
        destinationId: data.destinationId,
        priority: data.priority,
        newSource: data.newSource,
        newDestination: data.newDestination,
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
      queryClient.invalidateQueries({ queryKey: ["/api/sources"] });
      queryClient.invalidateQueries({ queryKey: ["/api/destinations"] });
      setIsCreateDialogOpen(false);
      setShowAdvanced(false);
      setShowNewSourceForm(false);
      setShowNewDestinationForm(false);
      form.reset();
      toast({
        title: "Success",
        description: "Forwarding mapping created successfully",
      });
    },
    onError: (error) => {
      toast({
        title: "Error",
        description: error.message || "Failed to create mapping",
        variant: "destructive",
      });
    },
  });

  const deleteMappingMutation = useMutation({
    mutationFn: (mappingId: string) => apiRequest(`/api/forwarding/mappings/${mappingId}`, {
      method: "DELETE",
    }),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/forwarding/mappings"] });
      toast({
        title: "Success",
        description: "Mapping deleted successfully",
      });
    },
    onError: (error) => {
      toast({
        title: "Error",
        description: error.message || "Failed to delete mapping",
        variant: "destructive",
      });
    },
  });

  const toggleMappingMutation = useMutation({
    mutationFn: (mappingId: string) => apiRequest(`/api/forwarding/mappings/${mappingId}/toggle`, {
      method: "PATCH",
    }),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/forwarding/mappings"] });
    },
  });

  const onSubmit = (data: CreateMappingFormData) => {
    createMappingMutation.mutate(data);
  };

  const handleDelete = (mappingId: string, sourceName: string, destinationName: string) => {
    if (confirm(`Are you sure you want to delete the mapping from "${sourceName}" to "${destinationName}"?`)) {
      deleteMappingMutation.mutate(mappingId);
    }
  };

  const handleToggle = (mappingId: string) => {
    toggleMappingMutation.mutate(mappingId);
  };

  if (isLoading) {
    return (
      <div className="space-y-4">
        <div className="flex justify-between items-center">
          <h1 className="text-2xl font-bold">Forwarding Rules</h1>
        </div>
        <div>Loading forwarding rules...</div>
      </div>
    );
  }

  return (
    <div className="space-y-4">
      <div className="flex justify-between items-center">
        <div>
          <h1 className="text-2xl font-bold">Forwarding Rules</h1>
          <p className="text-muted-foreground">
            Create and manage forwarding mappings with filters and editing rules
          </p>
        </div>
        
        <Dialog open={isCreateDialogOpen} onOpenChange={setIsCreateDialogOpen}>
          <DialogTrigger asChild>
            <Button>
              <Plus className="w-4 h-4 mr-2" />
              Create Mapping
            </Button>
          </DialogTrigger>
          <DialogContent className="sm:max-w-[600px] max-h-[80vh] overflow-y-auto">
            <DialogHeader>
              <DialogTitle>Create Forwarding Mapping</DialogTitle>
              <DialogDescription>
                Set up a new forwarding rule with filters and editing options
              </DialogDescription>
            </DialogHeader>
            <Form {...form}>
              <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-6">
                {/* Pair Details Section */}
                <div className="space-y-4">
                  <h3 className="text-lg font-semibold text-[#E0E0E0] border-b border-[#333333] pb-2">
                    Pair Details
                  </h3>
                  <div className="grid grid-cols-2 gap-4">
                    <FormField
                      control={form.control}
                      name="pairName"
                      render={({ field }) => (
                        <FormItem>
                          <FormLabel>Pair Name *</FormLabel>
                          <FormControl>
                            <Input placeholder="e.g., News to Community" {...field} />
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
                          <FormLabel>Pair Type</FormLabel>
                          <Select onValueChange={field.onChange} defaultValue={field.value}>
                            <FormControl>
                              <SelectTrigger>
                                <SelectValue />
                              </SelectTrigger>
                            </FormControl>
                            <SelectContent>
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
                  <FormField
                    control={form.control}
                    name="priority"
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel>Priority (1-10)</FormLabel>
                        <FormControl>
                          <Input 
                            type="number" 
                            min="1" 
                            max="10" 
                            className="w-24"
                            {...field}
                            onChange={(e) => field.onChange(parseInt(e.target.value))}
                          />
                        </FormControl>
                        <FormDescription>
                          Higher numbers = higher priority
                        </FormDescription>
                        <FormMessage />
                      </FormItem>
                    )}
                  />
                </div>

                {/* Source Setup Section */}
                <div className="space-y-4">
                  <h3 className="text-lg font-semibold text-[#E0E0E0] border-b border-[#333333] pb-2">
                    Source Setup
                  </h3>
                  <FormField
                    control={form.control}
                    name="sourceId"
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel>Source Channel *</FormLabel>
                        <div className="flex gap-2">
                          <Select 
                            onValueChange={(value) => {
                              if (value === "add-new") {
                                setShowNewSourceForm(true);
                              } else {
                                field.onChange(value);
                                setShowNewSourceForm(false);
                              }
                            }} 
                            defaultValue={field.value}
                          >
                            <FormControl>
                              <SelectTrigger className="flex-1">
                                <SelectValue placeholder="Select or add new source..." />
                              </SelectTrigger>
                            </FormControl>
                            <SelectContent>
                              {sources.filter(s => s.isActive).map((source) => (
                                <SelectItem key={source.id} value={source.id}>
                                  {source.chatTitle} ({source.chatType})
                                </SelectItem>
                              ))}
                              <Separator />
                              <SelectItem value="add-new">+ Add New Source</SelectItem>
                            </SelectContent>
                          </Select>
                        </div>
                        <FormMessage />
                      </FormItem>
                    )}
                  />
                  
                  {showNewSourceForm && (
                    <Card className="p-4 border-[#00B4D8]/30 bg-[#00B4D8]/5">
                      <div className="space-y-3">
                        <h4 className="font-medium text-[#00B4D8]">New Source Details</h4>
                        <div className="grid grid-cols-2 gap-3">
                          <FormField
                            control={form.control}
                            name="newSource.chatTitle"
                            render={({ field }) => (
                              <FormItem>
                                <FormLabel>Chat Title *</FormLabel>
                                <FormControl>
                                  <Input placeholder="Channel/Group name" {...field} />
                                </FormControl>
                                <FormMessage />
                              </FormItem>
                            )}
                          />
                          <FormField
                            control={form.control}
                            name="newSource.chatType"
                            render={({ field }) => (
                              <FormItem>
                                <FormLabel>Type *</FormLabel>
                                <Select onValueChange={field.onChange} defaultValue={field.value}>
                                  <FormControl>
                                    <SelectTrigger>
                                      <SelectValue placeholder="Select type" />
                                    </SelectTrigger>
                                  </FormControl>
                                  <SelectContent>
                                    <SelectItem value="channel">Channel</SelectItem>
                                    <SelectItem value="group">Group</SelectItem>
                                  </SelectContent>
                                </Select>
                                <FormMessage />
                              </FormItem>
                            )}
                          />
                        </div>
                        <div className="grid grid-cols-3 gap-3">
                          <FormField
                            control={form.control}
                            name="newSource.phoneNumber"
                            render={({ field }) => (
                              <FormItem>
                                <FormLabel>Phone *</FormLabel>
                                <FormControl>
                                  <Input placeholder="+1234567890" {...field} />
                                </FormControl>
                                <FormMessage />
                              </FormItem>
                            )}
                          />
                          <FormField
                            control={form.control}
                            name="newSource.apiId"
                            render={({ field }) => (
                              <FormItem>
                                <FormLabel>API ID *</FormLabel>
                                <FormControl>
                                  <Input placeholder="123456" {...field} />
                                </FormControl>
                                <FormMessage />
                              </FormItem>
                            )}
                          />
                          <FormField
                            control={form.control}
                            name="newSource.apiHash"
                            render={({ field }) => (
                              <FormItem>
                                <FormLabel>API Hash *</FormLabel>
                                <FormControl>
                                  <Input placeholder="abcdef123456..." {...field} />
                                </FormControl>
                                <FormMessage />
                              </FormItem>
                            )}
                          />
                        </div>
                      </div>
                    </Card>
                  )}
                </div>

                {/* Destination Setup Section */}
                <div className="space-y-4">
                  <h3 className="text-lg font-semibold text-[#E0E0E0] border-b border-[#333333] pb-2">
                    Destination Setup
                  </h3>
                  <FormField
                    control={form.control}
                    name="destinationId"
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel>Destination Channel *</FormLabel>
                        <div className="flex gap-2">
                          <Select 
                            onValueChange={(value) => {
                              if (value === "add-new") {
                                setShowNewDestinationForm(true);
                              } else {
                                field.onChange(value);
                                setShowNewDestinationForm(false);
                              }
                            }} 
                            defaultValue={field.value}
                          >
                            <FormControl>
                              <SelectTrigger className="flex-1">
                                <SelectValue placeholder="Select or add new destination..." />
                              </SelectTrigger>
                            </FormControl>
                            <SelectContent>
                              {destinations.filter(d => d.isActive).map((destination) => (
                                <SelectItem key={destination.id} value={destination.id}>
                                  {destination.chatTitle} ({destination.chatType})
                                </SelectItem>
                              ))}
                              <Separator />
                              <SelectItem value="add-new">+ Add New Destination</SelectItem>
                            </SelectContent>
                          </Select>
                        </div>
                        <FormMessage />
                      </FormItem>
                    )}
                  />
                  
                  {showNewDestinationForm && (
                    <Card className="p-4 border-[#00B4D8]/30 bg-[#00B4D8]/5">
                      <div className="space-y-3">
                        <h4 className="font-medium text-[#00B4D8]">New Destination Details</h4>
                        <div className="grid grid-cols-2 gap-3">
                          <FormField
                            control={form.control}
                            name="newDestination.chatTitle"
                            render={({ field }) => (
                              <FormItem>
                                <FormLabel>Chat Title *</FormLabel>
                                <FormControl>
                                  <Input placeholder="Channel/Group name" {...field} />
                                </FormControl>
                                <FormMessage />
                              </FormItem>
                            )}
                          />
                          <FormField
                            control={form.control}
                            name="newDestination.chatType"
                            render={({ field }) => (
                              <FormItem>
                                <FormLabel>Type *</FormLabel>
                                <Select onValueChange={field.onChange} defaultValue={field.value}>
                                  <FormControl>
                                    <SelectTrigger>
                                      <SelectValue placeholder="Select type" />
                                    </SelectTrigger>
                                  </FormControl>
                                  <SelectContent>
                                    <SelectItem value="channel">Channel</SelectItem>
                                    <SelectItem value="group">Group</SelectItem>
                                  </SelectContent>
                                </Select>
                                <FormMessage />
                              </FormItem>
                            )}
                          />
                        </div>
                        <div className="grid grid-cols-3 gap-3">
                          <FormField
                            control={form.control}
                            name="newDestination.phoneNumber"
                            render={({ field }) => (
                              <FormItem>
                                <FormLabel>Phone *</FormLabel>
                                <FormControl>
                                  <Input placeholder="+1234567890" {...field} />
                                </FormControl>
                                <FormMessage />
                              </FormItem>
                            )}
                          />
                          <FormField
                            control={form.control}
                            name="newDestination.apiId"
                            render={({ field }) => (
                              <FormItem>
                                <FormLabel>API ID *</FormLabel>
                                <FormControl>
                                  <Input placeholder="123456" {...field} />
                                </FormControl>
                                <FormMessage />
                              </FormItem>
                            )}
                          />
                          <FormField
                            control={form.control}
                            name="newDestination.apiHash"
                            render={({ field }) => (
                              <FormItem>
                                <FormLabel>API Hash *</FormLabel>
                                <FormControl>
                                  <Input placeholder="abcdef123456..." {...field} />
                                </FormControl>
                                <FormMessage />
                              </FormItem>
                            )}
                          />
                        </div>
                      </div>
                    </Card>
                  )}
                </div>

                {/* Advanced Settings Toggle */}
                <div className="space-y-4">
                  <div className="flex items-center gap-3">
                    <Checkbox
                      checked={showAdvanced}
                      onCheckedChange={setShowAdvanced}
                      id="advanced-settings"
                    />
                    <label htmlFor="advanced-settings" className="text-sm font-medium text-[#E0E0E0] cursor-pointer">
                      Advanced Settings (Filters & Editing)
                    </label>
                  </div>
                  
                  {showAdvanced && (
                    <Tabs defaultValue="filters" className="w-full">
                      <TabsList className="grid w-full grid-cols-2">
                        <TabsTrigger value="filters">Filters</TabsTrigger>
                        <TabsTrigger value="editing">Editing</TabsTrigger>
                      </TabsList>
                  
                  <TabsContent value="filters" className="space-y-4">
                    <FormField
                      control={form.control}
                      name="includeKeywords"
                      render={({ field }) => (
                        <FormItem>
                          <FormLabel>Include Keywords</FormLabel>
                          <FormControl>
                            <Input placeholder="keyword1, keyword2, keyword3" {...field} />
                          </FormControl>
                          <FormDescription>
                            Comma-separated list. Messages must contain these keywords.
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
                          <FormLabel>Exclude Keywords</FormLabel>
                          <FormControl>
                            <Input placeholder="spam, ads, promotion" {...field} />
                          </FormControl>
                          <FormDescription>
                            Messages containing these keywords will be blocked.
                          </FormDescription>
                          <FormMessage />
                        </FormItem>
                      )}
                    />
                    
                    <div className="grid grid-cols-2 gap-4">
                      <FormField
                        control={form.control}
                        name="keywordMatchMode"
                        render={({ field }) => (
                          <FormItem>
                            <FormLabel>Match Mode</FormLabel>
                            <Select onValueChange={field.onChange} defaultValue={field.value}>
                              <FormControl>
                                <SelectTrigger>
                                  <SelectValue />
                                </SelectTrigger>
                              </FormControl>
                              <SelectContent>
                                <SelectItem value="any">Any keyword</SelectItem>
                                <SelectItem value="all">All keywords</SelectItem>
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
                          <FormItem className="flex flex-row items-start space-x-3 space-y-0 rounded-md border p-4">
                            <FormControl>
                              <Checkbox
                                checked={field.value}
                                onCheckedChange={field.onChange}
                              />
                            </FormControl>
                            <div className="space-y-1 leading-none">
                              <FormLabel>Case Sensitive</FormLabel>
                            </div>
                          </FormItem>
                        )}
                      />
                    </div>
                    
                    <FormField
                      control={form.control}
                      name="allowedMessageTypes"
                      render={({ field }) => (
                        <FormItem>
                          <FormLabel>Allowed Message Types</FormLabel>
                          <div className="grid grid-cols-2 gap-2 mt-2">
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
                                />
                                <label htmlFor={option.value} className="text-sm">
                                  {option.label}
                                </label>
                              </div>
                            ))}
                          </div>
                          <FormDescription>
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
                          <FormItem className="flex flex-row items-start space-x-3 space-y-0 rounded-md border p-4">
                            <FormControl>
                              <Checkbox
                                checked={field.value}
                                onCheckedChange={field.onChange}
                              />
                            </FormControl>
                            <div className="space-y-1 leading-none">
                              <FormLabel>Block URLs</FormLabel>
                              <FormDescription>
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
                          <FormItem className="flex flex-row items-start space-x-3 space-y-0 rounded-md border p-4">
                            <FormControl>
                              <Checkbox
                                checked={field.value}
                                onCheckedChange={field.onChange}
                              />
                            </FormControl>
                            <div className="space-y-1 leading-none">
                              <FormLabel>Block Forwards</FormLabel>
                              <FormDescription>
                                Block forwarded messages
                              </FormDescription>
                            </div>
                          </FormItem>
                        )}
                      />
                    </div>
                  </TabsContent>
                  
                  <TabsContent value="editing" className="space-y-4">
                    <FormField
                      control={form.control}
                      name="headerText"
                      render={({ field }) => (
                        <FormItem>
                          <FormLabel>Header Text</FormLabel>
                          <FormControl>
                            <Textarea placeholder="Text to add at the beginning of messages" {...field} />
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
                          <FormLabel>Footer Text</FormLabel>
                          <FormControl>
                            <Textarea placeholder="Text to add at the end of messages" {...field} />
                          </FormControl>
                          <FormMessage />
                        </FormItem>
                      )}
                    />
                    
                    <div className="grid grid-cols-2 gap-4">
                      <FormField
                        control={form.control}
                        name="removeSenderInfo"
                        render={({ field }) => (
                          <FormItem className="flex flex-row items-start space-x-3 space-y-0 rounded-md border p-4">
                            <FormControl>
                              <Checkbox
                                checked={field.value}
                                onCheckedChange={field.onChange}
                              />
                            </FormControl>
                            <div className="space-y-1 leading-none">
                              <FormLabel>Remove Sender Info</FormLabel>
                            </div>
                          </FormItem>
                        )}
                      />
                      
                      <FormField
                        control={form.control}
                        name="removeUrls"
                        render={({ field }) => (
                          <FormItem className="flex flex-row items-start space-x-3 space-y-0 rounded-md border p-4">
                            <FormControl>
                              <Checkbox
                                checked={field.value}
                                onCheckedChange={field.onChange}
                              />
                            </FormControl>
                            <div className="space-y-1 leading-none">
                              <FormLabel>Remove URLs</FormLabel>
                            </div>
                          </FormItem>
                        )}
                      />
                      
                      <FormField
                        control={form.control}
                        name="removeHashtags"
                        render={({ field }) => (
                          <FormItem className="flex flex-row items-start space-x-3 space-y-0 rounded-md border p-4">
                            <FormControl>
                              <Checkbox
                                checked={field.value}
                                onCheckedChange={field.onChange}
                              />
                            </FormControl>
                            <div className="space-y-1 leading-none">
                              <FormLabel>Remove Hashtags</FormLabel>
                            </div>
                          </FormItem>
                        )}
                      />
                      
                      <FormField
                        control={form.control}
                        name="removeMentions"
                        render={({ field }) => (
                          <FormItem className="flex flex-row items-start space-x-3 space-y-0 rounded-md border p-4">
                            <FormControl>
                              <Checkbox
                                checked={field.value}
                                onCheckedChange={field.onChange}
                              />
                            </FormControl>
                            <div className="space-y-1 leading-none">
                              <FormLabel>Remove Mentions</FormLabel>
                            </div>
                          </FormItem>
                        )}
                      />
                    </div>
                    </TabsContent>
                  </Tabs>
                  )}
                </div>
                
                <div className="flex justify-end space-x-2 pt-6 border-t border-[#333333]">
                  <Button
                    type="button"
                    variant="outline"
                    onClick={() => {
                      setIsCreateDialogOpen(false);
                      setShowAdvanced(false);
                      setShowNewSourceForm(false);
                      setShowNewDestinationForm(false);
                      form.reset();
                    }}
                  >
                    Cancel
                  </Button>
                  <Button 
                    type="submit" 
                    disabled={createMappingMutation.isPending}
                    className="bg-[#00B4D8] hover:bg-[#00B4D8]/80 text-white"
                  >
                    {createMappingMutation.isPending ? "Creating..." : "Create Mapping"}
                  </Button>
                </div>
              </form>
            </Form>
          </DialogContent>
        </Dialog>
      </div>

      <div className="space-y-4">
        {mappings.map((mapping) => (
          <Card key={mapping.id}>
            <CardHeader className="pb-3">
              <div className="flex items-center justify-between">
                <div className="flex items-center space-x-4">
                  <div>
                    <CardTitle className="text-lg flex items-center">
                      {mapping.sourceName}
                      <ArrowRight className="w-4 h-4 mx-2" />
                      {mapping.destinationName}
                    </CardTitle>
                    <CardDescription>
                      Priority: {mapping.priority} • 
                      Created: {new Date(mapping.createdAt).toLocaleDateString()}
                    </CardDescription>
                  </div>
                </div>
                <div className="flex items-center space-x-2">
                  <Badge variant={mapping.isActive ? "default" : "secondary"}>
                    {mapping.isActive ? "Active" : "Inactive"}
                  </Badge>
                  <Button
                    size="sm"
                    variant="ghost"
                    onClick={() => handleToggle(mapping.id)}
                    disabled={toggleMappingMutation.isPending}
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
                  >
                    <Trash2 className="w-4 h-4" />
                  </Button>
                </div>
              </div>
            </CardHeader>
            <CardContent>
              <div className="grid md:grid-cols-2 gap-4">
                <div>
                  <h4 className="font-medium flex items-center mb-2">
                    <Filter className="w-4 h-4 mr-2" />
                    Filters
                  </h4>
                  <div className="space-y-1 text-sm text-muted-foreground">
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
                  </div>
                </div>
                <div>
                  <h4 className="font-medium flex items-center mb-2">
                    <Settings className="w-4 h-4 mr-2" />
                    Editing
                  </h4>
                  <div className="space-y-1 text-sm text-muted-foreground">
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
                  </div>
                </div>
              </div>
            </CardContent>
          </Card>
        ))}
      </div>

      {mappings.length === 0 && (
        <Card>
          <CardContent className="py-8">
            <div className="text-center space-y-4">
              <ArrowRight className="w-12 h-12 mx-auto text-muted-foreground" />
              <div>
                <h3 className="text-lg font-medium">No forwarding mappings</h3>
                <p className="text-muted-foreground">
                  Create your first forwarding mapping to start routing messages
                </p>
              </div>
              <Button onClick={() => setIsCreateDialogOpen(true)}>
                <Plus className="w-4 h-4 mr-2" />
                Create Mapping
              </Button>
            </div>
          </CardContent>
        </Card>
      )}
    </div>
  );
}