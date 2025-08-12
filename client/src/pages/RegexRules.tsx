import { useState, useEffect } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { Button } from "@/components/ui/button";
import { Card, CardHeader, CardTitle, CardContent } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Switch } from "@/components/ui/switch";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { useToast } from "@/hooks/use-toast";
import { Badge } from "@/components/ui/badge";
import { Collapsible, CollapsibleContent, CollapsibleTrigger } from "@/components/ui/collapsible";
import { Plus, Trash2, ChevronDown, ChevronUp, Save, RotateCcw, Crown } from "lucide-react";
import { useLocation } from "wouter";

interface RegexRule {
  id: string;
  findPattern: string;
  replaceWith: string;
  isEnabled: boolean;
  flags: string;
}

interface AdvancedRules {
  regexRules: RegexRule[];
  blockWords: string[];
  includeKeywords: string[];
  excludeKeywords: string[];
  keywordMatchMode: string;
  caseSensitive: boolean;
  headerText: string;
  footerText: string;
  removeMentions: boolean;
  removeUrls: boolean;
  mediaFilter: string;
  forwardingMode: string;
  delayEnabled: boolean;
  delaySeconds: number;
  autoReplyRules: Array<{pattern: string; reply: string; isEnabled: boolean}>;
  schedulingEnabled: boolean;
  scheduleStartTime: string;
  scheduleEndTime: string;
  scheduleDays: string[];
}

export default function RegexRules() {
  const [location] = useLocation();
  const { toast } = useToast();
  const queryClient = useQueryClient();
  
  // Get mapping ID from URL params
  const urlParams = new URLSearchParams(location.split('?')[1] || '');
  const mappingId = urlParams.get('mapping');

  // Collapsible state
  const [regexOpen, setRegexOpen] = useState(true);
  const [keywordOpen, setKeywordOpen] = useState(false);
  const [contentOpen, setContentOpen] = useState(false);
  const [mediaOpen, setMediaOpen] = useState(false);
  const [delayOpen, setDelayOpen] = useState(false);
  const [autoReplyOpen, setAutoReplyOpen] = useState(false);
  const [schedulingOpen, setSchedulingOpen] = useState(false);

  // Form state
  const [rules, setRules] = useState<AdvancedRules>({
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
    scheduleDays: []
  });

  // Get user plan for premium features
  const { data: userPlan } = useQuery({
    queryKey: ['/api/user/plan'],
    queryFn: async () => {
      const response = await fetch('/api/user/plan', {
        headers: {
          'Authorization': `Bearer ${localStorage.getItem('token')}`
        }
      });
      if (!response.ok) throw new Error('Failed to fetch user plan');
      return response.json();
    }
  });

  // Load existing rules if editing a specific mapping
  const { data: existingRules, isLoading } = useQuery({
    queryKey: ['/api/forwarding/mappings', mappingId, 'rules'],
    queryFn: async () => {
      const response = await fetch(`/api/forwarding/mappings/${mappingId}/rules`, {
        headers: {
          'Authorization': `Bearer ${localStorage.getItem('token')}`
        }
      });
      if (!response.ok) throw new Error('Failed to fetch rules');
      return response.json();
    },
    enabled: !!mappingId
  });

  // Update form when existing rules are loaded
  useEffect(() => {
    if (existingRules) {
      setRules(existingRules);
    }
  }, [existingRules]);

  // Save rules mutation
  const saveRulesMutation = useMutation({
    mutationFn: async (rulesData: AdvancedRules) => {
      const response = await fetch(`/api/forwarding/mappings/${mappingId}/rules`, {
        method: 'PUT',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${localStorage.getItem('token')}`
        },
        body: JSON.stringify(rulesData)
      });
      if (!response.ok) throw new Error('Failed to save rules');
      return response.json();
    },
    onSuccess: () => {
      toast({ description: "Advanced rules saved successfully!" });
      queryClient.invalidateQueries({ queryKey: ['/api/forwarding/mappings'] });
    },
    onError: () => {
      toast({ variant: 'destructive', description: "Failed to save rules" });
    }
  });

  const isPremium = userPlan?.features?.scheduling || false;

  // Helper functions
  const addRegexRule = () => {
    setRules(prev => ({
      ...prev,
      regexRules: [...prev.regexRules, {
        id: Date.now().toString(),
        findPattern: "",
        replaceWith: "",
        isEnabled: true,
        flags: "gi"
      }]
    }));
  };

  const updateRegexRule = (index: number, updates: Partial<RegexRule>) => {
    setRules(prev => ({
      ...prev,
      regexRules: prev.regexRules.map((rule, i) => 
        i === index ? { ...rule, ...updates } : rule
      )
    }));
  };

  const removeRegexRule = (index: number) => {
    setRules(prev => ({
      ...prev,
      regexRules: prev.regexRules.filter((_, i) => i !== index)
    }));
  };

  const addAutoReplyRule = () => {
    setRules(prev => ({
      ...prev,
      autoReplyRules: [...prev.autoReplyRules, {
        pattern: "",
        reply: "",
        isEnabled: true
      }]
    }));
  };

  const updateAutoReplyRule = (index: number, updates: any) => {
    setRules(prev => ({
      ...prev,
      autoReplyRules: prev.autoReplyRules.map((rule, i) => 
        i === index ? { ...rule, ...updates } : rule
      )
    }));
  };

  const removeAutoReplyRule = (index: number) => {
    setRules(prev => ({
      ...prev,
      autoReplyRules: prev.autoReplyRules.filter((_, i) => i !== index)
    }));
  };

  const handleSave = () => {
    if (!mappingId) {
      toast({ variant: 'destructive', description: "No mapping selected" });
      return;
    }
    saveRulesMutation.mutate(rules);
  };

  const handleReset = () => {
    if (existingRules) {
      setRules(existingRules);
    } else {
      setRules({
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
        scheduleDays: []
      });
    }
    toast({ description: "Rules reset to last saved state" });
  };

  if (!mappingId) {
    return (
      <div className="p-6">
        <Card className="bg-[#232323] border-gray-600">
          <CardContent className="pt-6">
            <p className="text-gray-400 text-center">
              Please select a forwarding mapping to edit its advanced rules.
            </p>
          </CardContent>
        </Card>
      </div>
    );
  }

  if (isLoading) {
    return (
      <div className="p-6">
        <Card className="bg-[#232323] border-gray-600">
          <CardContent className="pt-6">
            <p className="text-gray-400 text-center">Loading rules...</p>
          </CardContent>
        </Card>
      </div>
    );
  }

  return (
    <div className="p-6 space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-white">Advanced Message Rules</h1>
          <p className="text-gray-400 mt-1">Configure comprehensive message processing rules</p>
        </div>
        <div className="flex gap-3">
          <Button
            variant="outline"
            onClick={handleReset}
            className="border-gray-600 text-gray-300 hover:bg-gray-700"
          >
            <RotateCcw className="w-4 h-4 mr-2" />
            Reset
          </Button>
          <Button
            onClick={handleSave}
            disabled={saveRulesMutation.isPending}
            className="bg-[#00B4D8] hover:bg-[#0090BB] text-white"
          >
            <Save className="w-4 h-4 mr-2" />
            {saveRulesMutation.isPending ? 'Saving...' : 'Apply Rules'}
          </Button>
        </div>
      </div>

      <div className="space-y-4">
        {/* Regex Find/Replace */}
        <Card className="bg-[#232323] border-gray-600">
          <Collapsible open={regexOpen} onOpenChange={setRegexOpen}>
            <CollapsibleTrigger asChild>
              <CardHeader className="cursor-pointer hover:bg-[#2A2A2A] transition-colors">
                <div className="flex items-center justify-between">
                  <CardTitle className="text-[#00B4D8] flex items-center gap-2">
                    Regex Find & Replace
                    <Badge variant="secondary" className="text-xs">
                      {rules.regexRules.length} rules
                    </Badge>
                  </CardTitle>
                  {regexOpen ? <ChevronUp className="w-5 h-5 text-gray-400" /> : <ChevronDown className="w-5 h-5 text-gray-400" />}
                </div>
              </CardHeader>
            </CollapsibleTrigger>
            <CollapsibleContent>
              <CardContent className="space-y-4">
                {rules.regexRules.map((rule, index) => (
                  <div key={rule.id} className="p-4 border border-gray-600 rounded-lg space-y-3">
                    <div className="flex items-center justify-between">
                      <Switch
                        checked={rule.isEnabled}
                        onCheckedChange={(checked) => updateRegexRule(index, { isEnabled: checked })}
                      />
                      <Button
                        variant="ghost"
                        size="sm"
                        onClick={() => removeRegexRule(index)}
                        className="text-red-400 hover:text-red-300 hover:bg-red-900/20"
                      >
                        <Trash2 className="w-4 h-4" />
                      </Button>
                    </div>
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                      <div>
                        <Label className="text-gray-300">Find Pattern</Label>
                        <Input
                          value={rule.findPattern}
                          onChange={(e) => updateRegexRule(index, { findPattern: e.target.value })}
                          placeholder="Enter regex pattern..."
                          className="bg-[#1A1A1A] border-gray-600 text-white mt-1"
                        />
                      </div>
                      <div>
                        <Label className="text-gray-300">Replace With</Label>
                        <Input
                          value={rule.replaceWith}
                          onChange={(e) => updateRegexRule(index, { replaceWith: e.target.value })}
                          placeholder="Replacement text..."
                          className="bg-[#1A1A1A] border-gray-600 text-white mt-1"
                        />
                      </div>
                    </div>
                    <div>
                      <Label className="text-gray-300">Flags</Label>
                      <Select value={rule.flags} onValueChange={(value) => updateRegexRule(index, { flags: value })}>
                        <SelectTrigger className="bg-[#1A1A1A] border-gray-600 text-white mt-1">
                          <SelectValue />
                        </SelectTrigger>
                        <SelectContent className="bg-[#1A1A1A] border-gray-600">
                          <SelectItem value="gi">gi (Global, Case-insensitive)</SelectItem>
                          <SelectItem value="g">g (Global)</SelectItem>
                          <SelectItem value="i">i (Case-insensitive)</SelectItem>
                          <SelectItem value="">None</SelectItem>
                        </SelectContent>
                      </Select>
                    </div>
                  </div>
                ))}
                <Button
                  onClick={addRegexRule}
                  variant="outline"
                  className="w-full border-gray-600 text-gray-300 hover:bg-gray-700"
                >
                  <Plus className="w-4 h-4 mr-2" />
                  Add Regex Rule
                </Button>
              </CardContent>
            </CollapsibleContent>
          </Collapsible>
        </Card>

        {/* Keyword Filtering */}
        <Card className="bg-[#232323] border-gray-600">
          <Collapsible open={keywordOpen} onOpenChange={setKeywordOpen}>
            <CollapsibleTrigger asChild>
              <CardHeader className="cursor-pointer hover:bg-[#2A2A2A] transition-colors">
                <div className="flex items-center justify-between">
                  <CardTitle className="text-[#00B4D8]">Keyword Filtering</CardTitle>
                  {keywordOpen ? <ChevronUp className="w-5 h-5 text-gray-400" /> : <ChevronDown className="w-5 h-5 text-gray-400" />}
                </div>
              </CardHeader>
            </CollapsibleTrigger>
            <CollapsibleContent>
              <CardContent className="space-y-4">
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  <div>
                    <Label className="text-gray-300">Include Keywords</Label>
                    <Textarea
                      value={rules.includeKeywords.join('\n')}
                      onChange={(e) => setRules(prev => ({ ...prev, includeKeywords: e.target.value.split('\n').filter(k => k.trim()) }))}
                      placeholder="One keyword per line..."
                      className="bg-[#1A1A1A] border-gray-600 text-white mt-1 min-h-[100px]"
                    />
                  </div>
                  <div>
                    <Label className="text-gray-300">Exclude Keywords</Label>
                    <Textarea
                      value={rules.excludeKeywords.join('\n')}
                      onChange={(e) => setRules(prev => ({ ...prev, excludeKeywords: e.target.value.split('\n').filter(k => k.trim()) }))}
                      placeholder="One keyword per line..."
                      className="bg-[#1A1A1A] border-gray-600 text-white mt-1 min-h-[100px]"
                    />
                  </div>
                </div>
                <div>
                  <Label className="text-gray-300">Block Words</Label>
                  <Textarea
                    value={rules.blockWords.join('\n')}
                    onChange={(e) => setRules(prev => ({ ...prev, blockWords: e.target.value.split('\n').filter(k => k.trim()) }))}
                    placeholder="Words that block messages (one per line)..."
                    className="bg-[#1A1A1A] border-gray-600 text-white mt-1"
                  />
                </div>
                <div className="flex items-center justify-between">
                  <div>
                    <Label className="text-gray-300">Keyword Match Mode</Label>
                    <Select value={rules.keywordMatchMode} onValueChange={(value) => setRules(prev => ({ ...prev, keywordMatchMode: value }))}>
                      <SelectTrigger className="bg-[#1A1A1A] border-gray-600 text-white mt-1 w-[200px]">
                        <SelectValue />
                      </SelectTrigger>
                      <SelectContent className="bg-[#1A1A1A] border-gray-600">
                        <SelectItem value="any">Match Any Keyword</SelectItem>
                        <SelectItem value="all">Match All Keywords</SelectItem>
                      </SelectContent>
                    </Select>
                  </div>
                  <div className="flex items-center space-x-2">
                    <Switch
                      checked={rules.caseSensitive}
                      onCheckedChange={(checked) => setRules(prev => ({ ...prev, caseSensitive: checked }))}
                    />
                    <Label className="text-gray-300">Case Sensitive</Label>
                  </div>
                </div>
              </CardContent>
            </CollapsibleContent>
          </Collapsible>
        </Card>

        {/* Content Modification */}
        <Card className="bg-[#232323] border-gray-600">
          <Collapsible open={contentOpen} onOpenChange={setContentOpen}>
            <CollapsibleTrigger asChild>
              <CardHeader className="cursor-pointer hover:bg-[#2A2A2A] transition-colors">
                <div className="flex items-center justify-between">
                  <CardTitle className="text-[#00B4D8]">Content Modification</CardTitle>
                  {contentOpen ? <ChevronUp className="w-5 h-5 text-gray-400" /> : <ChevronDown className="w-5 h-5 text-gray-400" />}
                </div>
              </CardHeader>
            </CollapsibleTrigger>
            <CollapsibleContent>
              <CardContent className="space-y-4">
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  <div>
                    <Label className="text-gray-300">Header Text</Label>
                    <Textarea
                      value={rules.headerText}
                      onChange={(e) => setRules(prev => ({ ...prev, headerText: e.target.value }))}
                      placeholder="Text to add at the beginning..."
                      className="bg-[#1A1A1A] border-gray-600 text-white mt-1"
                    />
                  </div>
                  <div>
                    <Label className="text-gray-300">Footer Text</Label>
                    <Textarea
                      value={rules.footerText}
                      onChange={(e) => setRules(prev => ({ ...prev, footerText: e.target.value }))}
                      placeholder="Text to add at the end..."
                      className="bg-[#1A1A1A] border-gray-600 text-white mt-1"
                    />
                  </div>
                </div>
                <div className="grid grid-cols-2 gap-4">
                  <div className="flex items-center space-x-2">
                    <Switch
                      checked={rules.removeMentions}
                      onCheckedChange={(checked) => setRules(prev => ({ ...prev, removeMentions: checked }))}
                    />
                    <Label className="text-gray-300">Remove @mentions</Label>
                  </div>
                  <div className="flex items-center space-x-2">
                    <Switch
                      checked={rules.removeUrls}
                      onCheckedChange={(checked) => setRules(prev => ({ ...prev, removeUrls: checked }))}
                    />
                    <Label className="text-gray-300">Remove URLs</Label>
                  </div>
                </div>
              </CardContent>
            </CollapsibleContent>
          </Collapsible>
        </Card>

        {/* Media & Mode Settings */}
        <Card className="bg-[#232323] border-gray-600">
          <Collapsible open={mediaOpen} onOpenChange={setMediaOpen}>
            <CollapsibleTrigger asChild>
              <CardHeader className="cursor-pointer hover:bg-[#2A2A2A] transition-colors">
                <div className="flex items-center justify-between">
                  <CardTitle className="text-[#00B4D8]">Media & Forwarding Mode</CardTitle>
                  {mediaOpen ? <ChevronUp className="w-5 h-5 text-gray-400" /> : <ChevronDown className="w-5 h-5 text-gray-400" />}
                </div>
              </CardHeader>
            </CollapsibleTrigger>
            <CollapsibleContent>
              <CardContent className="space-y-4">
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  <div>
                    <Label className="text-gray-300">Media Filter</Label>
                    <Select value={rules.mediaFilter} onValueChange={(value) => setRules(prev => ({ ...prev, mediaFilter: value }))}>
                      <SelectTrigger className="bg-[#1A1A1A] border-gray-600 text-white mt-1">
                        <SelectValue />
                      </SelectTrigger>
                      <SelectContent className="bg-[#1A1A1A] border-gray-600">
                        <SelectItem value="all">All Messages</SelectItem>
                        <SelectItem value="text-only">Text Only</SelectItem>
                        <SelectItem value="media-only">Media Only</SelectItem>
                      </SelectContent>
                    </Select>
                  </div>
                  <div>
                    <Label className="text-gray-300">Forwarding Mode</Label>
                    <Select value={rules.forwardingMode} onValueChange={(value) => setRules(prev => ({ ...prev, forwardingMode: value }))}>
                      <SelectTrigger className="bg-[#1A1A1A] border-gray-600 text-white mt-1">
                        <SelectValue />
                      </SelectTrigger>
                      <SelectContent className="bg-[#1A1A1A] border-gray-600">
                        <SelectItem value="copy">Copy Messages</SelectItem>
                        <SelectItem value="keep-sender">Keep Original Sender</SelectItem>
                      </SelectContent>
                    </Select>
                  </div>
                </div>
              </CardContent>
            </CollapsibleContent>
          </Collapsible>
        </Card>

        {/* Message Delay */}
        <Card className="bg-[#232323] border-gray-600">
          <Collapsible open={delayOpen} onOpenChange={setDelayOpen}>
            <CollapsibleTrigger asChild>
              <CardHeader className="cursor-pointer hover:bg-[#2A2A2A] transition-colors">
                <div className="flex items-center justify-between">
                  <CardTitle className="text-[#00B4D8]">Message Delay</CardTitle>
                  {delayOpen ? <ChevronUp className="w-5 h-5 text-gray-400" /> : <ChevronDown className="w-5 h-5 text-gray-400" />}
                </div>
              </CardHeader>
            </CollapsibleTrigger>
            <CollapsibleContent>
              <CardContent className="space-y-4">
                <div className="flex items-center space-x-2">
                  <Switch
                    checked={rules.delayEnabled}
                    onCheckedChange={(checked) => setRules(prev => ({ ...prev, delayEnabled: checked }))}
                  />
                  <Label className="text-gray-300">Enable Message Delay</Label>
                </div>
                {rules.delayEnabled && (
                  <div>
                    <Label className="text-gray-300">Delay (seconds)</Label>
                    <Input
                      type="number"
                      value={rules.delaySeconds}
                      onChange={(e) => setRules(prev => ({ ...prev, delaySeconds: parseInt(e.target.value) || 0 }))}
                      min="0"
                      max="3600"
                      className="bg-[#1A1A1A] border-gray-600 text-white mt-1 w-[200px]"
                    />
                  </div>
                )}
              </CardContent>
            </CollapsibleContent>
          </Collapsible>
        </Card>

        {/* Auto-Reply (Premium) */}
        <Card className="bg-[#232323] border-gray-600">
          <Collapsible open={autoReplyOpen} onOpenChange={setAutoReplyOpen}>
            <CollapsibleTrigger asChild>
              <CardHeader className="cursor-pointer hover:bg-[#2A2A2A] transition-colors">
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-2">
                    <CardTitle className="text-[#00B4D8]">Auto-Reply Patterns</CardTitle>
                    {!isPremium && <Crown className="w-4 h-4 text-yellow-500" />}
                    <Badge variant="secondary" className="text-xs">
                      {rules.autoReplyRules.length} patterns
                    </Badge>
                  </div>
                  {autoReplyOpen ? <ChevronUp className="w-5 h-5 text-gray-400" /> : <ChevronDown className="w-5 h-5 text-gray-400" />}
                </div>
              </CardHeader>
            </CollapsibleTrigger>
            <CollapsibleContent>
              <CardContent className="space-y-4">
                {!isPremium && (
                  <div className="p-4 bg-yellow-900/20 border border-yellow-600 rounded-lg">
                    <p className="text-yellow-300 text-sm">
                      <Crown className="w-4 h-4 inline mr-1" />
                      Auto-Reply is a Premium feature. Upgrade to access this functionality.
                    </p>
                  </div>
                )}
                <div className={!isPremium ? "opacity-50 pointer-events-none" : ""}>
                  {rules.autoReplyRules.map((rule, index) => (
                    <div key={index} className="p-4 border border-gray-600 rounded-lg space-y-3">
                      <div className="flex items-center justify-between">
                        <Switch
                          checked={rule.isEnabled}
                          onCheckedChange={(checked) => updateAutoReplyRule(index, { isEnabled: checked })}
                        />
                        <Button
                          variant="ghost"
                          size="sm"
                          onClick={() => removeAutoReplyRule(index)}
                          className="text-red-400 hover:text-red-300 hover:bg-red-900/20"
                        >
                          <Trash2 className="w-4 h-4" />
                        </Button>
                      </div>
                      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                        <div>
                          <Label className="text-gray-300">Trigger Pattern</Label>
                          <Input
                            value={rule.pattern}
                            onChange={(e) => updateAutoReplyRule(index, { pattern: e.target.value })}
                            placeholder="Keyword or phrase to trigger..."
                            className="bg-[#1A1A1A] border-gray-600 text-white mt-1"
                          />
                        </div>
                        <div>
                          <Label className="text-gray-300">Auto Reply</Label>
                          <Input
                            value={rule.reply}
                            onChange={(e) => updateAutoReplyRule(index, { reply: e.target.value })}
                            placeholder="Response message..."
                            className="bg-[#1A1A1A] border-gray-600 text-white mt-1"
                          />
                        </div>
                      </div>
                    </div>
                  ))}
                  <Button
                    onClick={addAutoReplyRule}
                    variant="outline"
                    className="w-full border-gray-600 text-gray-300 hover:bg-gray-700"
                    disabled={!isPremium}
                  >
                    <Plus className="w-4 h-4 mr-2" />
                    Add Auto-Reply Pattern
                  </Button>
                </div>
              </CardContent>
            </CollapsibleContent>
          </Collapsible>
        </Card>

        {/* Scheduling (Premium) */}
        <Card className="bg-[#232323] border-gray-600">
          <Collapsible open={schedulingOpen} onOpenChange={setSchedulingOpen}>
            <CollapsibleTrigger asChild>
              <CardHeader className="cursor-pointer hover:bg-[#2A2A2A] transition-colors">
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-2">
                    <CardTitle className="text-[#00B4D8]">Scheduling</CardTitle>
                    {!isPremium && <Crown className="w-4 h-4 text-yellow-500" />}
                  </div>
                  {schedulingOpen ? <ChevronUp className="w-5 h-5 text-gray-400" /> : <ChevronDown className="w-5 h-5 text-gray-400" />}
                </div>
              </CardHeader>
            </CollapsibleTrigger>
            <CollapsibleContent>
              <CardContent className="space-y-4">
                {!isPremium && (
                  <div className="p-4 bg-yellow-900/20 border border-yellow-600 rounded-lg">
                    <p className="text-yellow-300 text-sm">
                      <Crown className="w-4 h-4 inline mr-1" />
                      Scheduling is a Premium feature. Upgrade to access this functionality.
                    </p>
                  </div>
                )}
                <div className={!isPremium ? "opacity-50 pointer-events-none" : ""}>
                  <div className="flex items-center space-x-2">
                    <Switch
                      checked={rules.schedulingEnabled}
                      onCheckedChange={(checked) => setRules(prev => ({ ...prev, schedulingEnabled: checked }))}
                      disabled={!isPremium}
                    />
                    <Label className="text-gray-300">Enable Scheduling</Label>
                  </div>
                  {rules.schedulingEnabled && (
                    <div className="space-y-4">
                      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                        <div>
                          <Label className="text-gray-300">Start Time</Label>
                          <Input
                            type="time"
                            value={rules.scheduleStartTime}
                            onChange={(e) => setRules(prev => ({ ...prev, scheduleStartTime: e.target.value }))}
                            className="bg-[#1A1A1A] border-gray-600 text-white mt-1"
                          />
                        </div>
                        <div>
                          <Label className="text-gray-300">End Time</Label>
                          <Input
                            type="time"
                            value={rules.scheduleEndTime}
                            onChange={(e) => setRules(prev => ({ ...prev, scheduleEndTime: e.target.value }))}
                            className="bg-[#1A1A1A] border-gray-600 text-white mt-1"
                          />
                        </div>
                      </div>
                      <div>
                        <Label className="text-gray-300">Active Days</Label>
                        <div className="grid grid-cols-7 gap-2 mt-1">
                          {['Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat', 'Sun'].map((day) => (
                            <Button
                              key={day}
                              variant={rules.scheduleDays.includes(day) ? "default" : "outline"}
                              size="sm"
                              onClick={() => {
                                setRules(prev => ({
                                  ...prev,
                                  scheduleDays: prev.scheduleDays.includes(day)
                                    ? prev.scheduleDays.filter(d => d !== day)
                                    : [...prev.scheduleDays, day]
                                }));
                              }}
                              className={rules.scheduleDays.includes(day) 
                                ? "bg-[#00B4D8] hover:bg-[#0090BB] text-white" 
                                : "border-gray-600 text-gray-300 hover:bg-gray-700"
                              }
                            >
                              {day}
                            </Button>
                          ))}
                        </div>
                      </div>
                    </div>
                  )}
                </div>
              </CardContent>
            </CollapsibleContent>
          </Collapsible>
        </Card>
      </div>

      {/* Sticky footer with action buttons */}
      <div className="sticky bottom-0 bg-[#1A1A1A] border-t border-gray-600 p-4 -m-6 mt-6">
        <div className="flex justify-end gap-3">
          <Button
            variant="outline"
            onClick={handleReset}
            className="border-gray-600 text-gray-300 hover:bg-gray-700"
          >
            <RotateCcw className="w-4 h-4 mr-2" />
            Reset
          </Button>
          <Button
            onClick={handleSave}
            disabled={saveRulesMutation.isPending}
            className="bg-[#00B4D8] hover:bg-[#0090BB] text-white"
          >
            <Save className="w-4 h-4 mr-2" />
            {saveRulesMutation.isPending ? 'Saving...' : 'Apply Rules'}
          </Button>
        </div>
      </div>
    </div>
  );
}