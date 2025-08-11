import { useState } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Switch } from '@/components/ui/switch';
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle, DialogTrigger } from '@/components/ui/dialog';
import { Badge } from '@/components/ui/badge';
import { useToast } from '@/hooks/use-toast';
import { Plus, Edit, Trash2, TestTube, Copy, ArrowUp, ArrowDown } from 'lucide-react';

interface RegexRule {
  id: string;
  name: string;
  description?: string;
  pattern: string;
  replacement?: string;
  rule_type: 'find_replace' | 'remove' | 'extract' | 'conditional_replace';
  order_index: number;
  case_sensitive: boolean;
  mapping_id?: string;
  is_active: boolean;
  created_at: string;
  updated_at: string;
}

interface RegexRuleFormData {
  name: string;
  description: string;
  pattern: string;
  replacement: string;
  rule_type: string;
  case_sensitive: boolean;
  is_active: boolean;
}

export default function RegexRules() {
  const [isCreateDialogOpen, setIsCreateDialogOpen] = useState(false);
  const [isEditDialogOpen, setIsEditDialogOpen] = useState(false);
  const [isTestDialogOpen, setIsTestDialogOpen] = useState(false);
  const [editingRule, setEditingRule] = useState<RegexRule | null>(null);
  const [testingRule, setTestingRule] = useState<RegexRule | null>(null);
  const [testText, setTestText] = useState('');
  const [testResult, setTestResult] = useState<any>(null);
  
  const [formData, setFormData] = useState<RegexRuleFormData>({
    name: '',
    description: '',
    pattern: '',
    replacement: '',
    rule_type: 'find_replace',
    case_sensitive: false,
    is_active: true
  });

  const { toast } = useToast();
  const queryClient = useQueryClient();

  const { data: rules = [], isLoading } = useQuery({
    queryKey: ['/api/regex-rules'],
    queryFn: async () => {
      const response = await fetch('/api/regex-rules', {
        headers: {
          'Authorization': `Bearer ${localStorage.getItem('token')}`
        }
      });
      if (!response.ok) throw new Error('Failed to fetch regex rules');
      return response.json();
    }
  });

  const createRuleMutation = useMutation({
    mutationFn: async (data: RegexRuleFormData) => {
      const response = await fetch('/api/regex-rules', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${localStorage.getItem('token')}`
        },
        body: JSON.stringify(data)
      });
      if (!response.ok) throw new Error('Failed to create regex rule');
      return response.json();
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['/api/regex-rules'] });
      setIsCreateDialogOpen(false);
      resetForm();
      toast({ description: 'Regex rule created successfully' });
    },
    onError: () => {
      toast({ variant: 'destructive', description: 'Failed to create regex rule' });
    }
  });

  const updateRuleMutation = useMutation({
    mutationFn: async ({ id, data }: { id: string; data: Partial<RegexRuleFormData> }) => {
      const response = await fetch(`/api/regex-rules/${id}`, {
        method: 'PUT',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${localStorage.getItem('token')}`
        },
        body: JSON.stringify(data)
      });
      if (!response.ok) throw new Error('Failed to update regex rule');
      return response.json();
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['/api/regex-rules'] });
      setIsEditDialogOpen(false);
      setEditingRule(null);
      resetForm();
      toast({ description: 'Regex rule updated successfully' });
    },
    onError: () => {
      toast({ variant: 'destructive', description: 'Failed to update regex rule' });
    }
  });

  const deleteRuleMutation = useMutation({
    mutationFn: async (id: string) => {
      const response = await fetch(`/api/regex-rules/${id}`, {
        method: 'DELETE',
        headers: {
          'Authorization': `Bearer ${localStorage.getItem('token')}`
        }
      });
      if (!response.ok) throw new Error('Failed to delete regex rule');
      return response.json();
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['/api/regex-rules'] });
      toast({ description: 'Regex rule deleted successfully' });
    },
    onError: () => {
      toast({ variant: 'destructive', description: 'Failed to delete regex rule' });
    }
  });

  const testRuleMutation = useMutation({
    mutationFn: async ({ id, text }: { id: string; text: string }) => {
      const response = await fetch(`/api/regex-rules/${id}/test`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${localStorage.getItem('token')}`
        },
        body: JSON.stringify({ text })
      });
      if (!response.ok) throw new Error('Failed to test regex rule');
      return response.json();
    },
    onSuccess: (result) => {
      setTestResult(result);
    },
    onError: () => {
      toast({ variant: 'destructive', description: 'Failed to test regex rule' });
    }
  });

  const resetForm = () => {
    setFormData({
      name: '',
      description: '',
      pattern: '',
      replacement: '',
      rule_type: 'find_replace',
      case_sensitive: false,
      is_active: true
    });
  };

  const handleEdit = (rule: RegexRule) => {
    setEditingRule(rule);
    setFormData({
      name: rule.name,
      description: rule.description || '',
      pattern: rule.pattern,
      replacement: rule.replacement || '',
      rule_type: rule.rule_type,
      case_sensitive: rule.case_sensitive,
      is_active: rule.is_active
    });
    setIsEditDialogOpen(true);
  };

  const handleTest = (rule: RegexRule) => {
    setTestingRule(rule);
    setTestText('');
    setTestResult(null);
    setIsTestDialogOpen(true);
  };

  const runTest = () => {
    if (testingRule && testText) {
      testRuleMutation.mutate({ id: testingRule.id, text: testText });
    }
  };

  const getRuleTypeColor = (type: string) => {
    switch (type) {
      case 'find_replace': return 'bg-blue-100 text-blue-800';
      case 'remove': return 'bg-red-100 text-red-800';
      case 'extract': return 'bg-green-100 text-green-800';
      case 'conditional_replace': return 'bg-purple-100 text-purple-800';
      default: return 'bg-gray-100 text-gray-800';
    }
  };

  if (isLoading) {
    return (
      <div className="container mx-auto p-6">
        <div className="flex items-center justify-center h-64">
          <div className="text-lg">Loading regex rules...</div>
        </div>
      </div>
    );
  }

  return (
    <div className="container mx-auto p-6">
      <div className="flex justify-between items-center mb-6">
        <div>
          <h1 className="text-3xl font-bold">Regex Editing Rules</h1>
          <p className="text-gray-600">Manage advanced message transformation rules using regular expressions</p>
        </div>
        <Dialog open={isCreateDialogOpen} onOpenChange={setIsCreateDialogOpen}>
          <DialogTrigger asChild>
            <Button>
              <Plus className="mr-2 h-4 w-4" />
              Create Rule
            </Button>
          </DialogTrigger>
          <DialogContent className="max-w-2xl">
            <DialogHeader>
              <DialogTitle>Create Regex Rule</DialogTitle>
              <DialogDescription>
                Create a new regular expression rule to transform messages
              </DialogDescription>
            </DialogHeader>
            <div className="grid gap-4 py-4">
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <Label htmlFor="name">Rule Name</Label>
                  <Input
                    id="name"
                    value={formData.name}
                    onChange={(e) => setFormData({ ...formData, name: e.target.value })}
                    placeholder="Enter rule name"
                  />
                </div>
                <div>
                  <Label htmlFor="rule_type">Rule Type</Label>
                  <Select
                    value={formData.rule_type}
                    onValueChange={(value) => setFormData({ ...formData, rule_type: value })}
                  >
                    <SelectTrigger>
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="find_replace">Find & Replace</SelectItem>
                      <SelectItem value="remove">Remove</SelectItem>
                      <SelectItem value="extract">Extract</SelectItem>
                      <SelectItem value="conditional_replace">Conditional Replace</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
              </div>
              <div>
                <Label htmlFor="description">Description</Label>
                <Textarea
                  id="description"
                  value={formData.description}
                  onChange={(e) => setFormData({ ...formData, description: e.target.value })}
                  placeholder="Describe what this rule does"
                  rows={2}
                />
              </div>
              <div>
                <Label htmlFor="pattern">Regex Pattern</Label>
                <Input
                  id="pattern"
                  value={formData.pattern}
                  onChange={(e) => setFormData({ ...formData, pattern: e.target.value })}
                  placeholder="Enter regex pattern (e.g., \b\w+@\w+\.\w+\b)"
                  className="font-mono"
                />
              </div>
              {(formData.rule_type === 'find_replace' || formData.rule_type === 'conditional_replace') && (
                <div>
                  <Label htmlFor="replacement">Replacement Text</Label>
                  <Input
                    id="replacement"
                    value={formData.replacement}
                    onChange={(e) => setFormData({ ...formData, replacement: e.target.value })}
                    placeholder="Enter replacement text"
                  />
                </div>
              )}
              <div className="flex items-center space-x-4">
                <div className="flex items-center space-x-2">
                  <Switch
                    id="case_sensitive"
                    checked={formData.case_sensitive}
                    onCheckedChange={(checked) => setFormData({ ...formData, case_sensitive: checked })}
                  />
                  <Label htmlFor="case_sensitive">Case Sensitive</Label>
                </div>
                <div className="flex items-center space-x-2">
                  <Switch
                    id="is_active"
                    checked={formData.is_active}
                    onCheckedChange={(checked) => setFormData({ ...formData, is_active: checked })}
                  />
                  <Label htmlFor="is_active">Active</Label>
                </div>
              </div>
            </div>
            <DialogFooter>
              <Button variant="outline" onClick={() => setIsCreateDialogOpen(false)}>
                Cancel
              </Button>
              <Button onClick={() => createRuleMutation.mutate(formData)} disabled={createRuleMutation.isPending}>
                {createRuleMutation.isPending ? 'Creating...' : 'Create Rule'}
              </Button>
            </DialogFooter>
          </DialogContent>
        </Dialog>
      </div>

      <div className="grid gap-4">
        {rules.map((rule: RegexRule) => (
          <Card key={rule.id} className={!rule.is_active ? 'opacity-60' : ''}>
            <CardHeader>
              <div className="flex items-center justify-between">
                <div className="flex items-center space-x-3">
                  <CardTitle className="text-lg">{rule.name}</CardTitle>
                  <Badge className={getRuleTypeColor(rule.rule_type)}>
                    {rule.rule_type.replace('_', ' ')}
                  </Badge>
                  {!rule.is_active && <Badge variant="secondary">Inactive</Badge>}
                </div>
                <div className="flex items-center space-x-2">
                  <Button
                    variant="outline"
                    size="sm"
                    onClick={() => handleTest(rule)}
                  >
                    <TestTube className="h-4 w-4" />
                  </Button>
                  <Button
                    variant="outline"
                    size="sm"
                    onClick={() => handleEdit(rule)}
                  >
                    <Edit className="h-4 w-4" />
                  </Button>
                  <Button
                    variant="outline"
                    size="sm"
                    onClick={() => deleteRuleMutation.mutate(rule.id)}
                  >
                    <Trash2 className="h-4 w-4" />
                  </Button>
                </div>
              </div>
              {rule.description && (
                <CardDescription>{rule.description}</CardDescription>
              )}
            </CardHeader>
            <CardContent>
              <div className="space-y-2">
                <div>
                  <span className="text-sm font-medium text-gray-500">Pattern:</span>
                  <code className="ml-2 px-2 py-1 bg-gray-100 rounded text-sm font-mono">
                    {rule.pattern}
                  </code>
                </div>
                {rule.replacement && (
                  <div>
                    <span className="text-sm font-medium text-gray-500">Replacement:</span>
                    <code className="ml-2 px-2 py-1 bg-gray-100 rounded text-sm">
                      {rule.replacement}
                    </code>
                  </div>
                )}
                <div className="flex items-center space-x-4 text-sm text-gray-500">
                  <span>Order: {rule.order_index}</span>
                  <span>Case Sensitive: {rule.case_sensitive ? 'Yes' : 'No'}</span>
                  <span>Created: {new Date(rule.created_at).toLocaleDateString()}</span>
                </div>
              </div>
            </CardContent>
          </Card>
        ))}

        {rules.length === 0 && (
          <Card>
            <CardContent className="text-center py-12">
              <p className="text-gray-500 mb-4">No regex rules created yet</p>
              <Button onClick={() => setIsCreateDialogOpen(true)}>
                <Plus className="mr-2 h-4 w-4" />
                Create Your First Rule
              </Button>
            </CardContent>
          </Card>
        )}
      </div>

      {/* Edit Dialog */}
      <Dialog open={isEditDialogOpen} onOpenChange={setIsEditDialogOpen}>
        <DialogContent className="max-w-2xl">
          <DialogHeader>
            <DialogTitle>Edit Regex Rule</DialogTitle>
            <DialogDescription>
              Update the regex rule configuration
            </DialogDescription>
          </DialogHeader>
          <div className="grid gap-4 py-4">
            <div className="grid grid-cols-2 gap-4">
              <div>
                <Label htmlFor="edit-name">Rule Name</Label>
                <Input
                  id="edit-name"
                  value={formData.name}
                  onChange={(e) => setFormData({ ...formData, name: e.target.value })}
                />
              </div>
              <div>
                <Label htmlFor="edit-rule_type">Rule Type</Label>
                <Select
                  value={formData.rule_type}
                  onValueChange={(value) => setFormData({ ...formData, rule_type: value })}
                >
                  <SelectTrigger>
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="find_replace">Find & Replace</SelectItem>
                    <SelectItem value="remove">Remove</SelectItem>
                    <SelectItem value="extract">Extract</SelectItem>
                    <SelectItem value="conditional_replace">Conditional Replace</SelectItem>
                  </SelectContent>
                </Select>
              </div>
            </div>
            <div>
              <Label htmlFor="edit-description">Description</Label>
              <Textarea
                id="edit-description"
                value={formData.description}
                onChange={(e) => setFormData({ ...formData, description: e.target.value })}
                rows={2}
              />
            </div>
            <div>
              <Label htmlFor="edit-pattern">Regex Pattern</Label>
              <Input
                id="edit-pattern"
                value={formData.pattern}
                onChange={(e) => setFormData({ ...formData, pattern: e.target.value })}
                className="font-mono"
              />
            </div>
            {(formData.rule_type === 'find_replace' || formData.rule_type === 'conditional_replace') && (
              <div>
                <Label htmlFor="edit-replacement">Replacement Text</Label>
                <Input
                  id="edit-replacement"
                  value={formData.replacement}
                  onChange={(e) => setFormData({ ...formData, replacement: e.target.value })}
                />
              </div>
            )}
            <div className="flex items-center space-x-4">
              <div className="flex items-center space-x-2">
                <Switch
                  id="edit-case_sensitive"
                  checked={formData.case_sensitive}
                  onCheckedChange={(checked) => setFormData({ ...formData, case_sensitive: checked })}
                />
                <Label htmlFor="edit-case_sensitive">Case Sensitive</Label>
              </div>
              <div className="flex items-center space-x-2">
                <Switch
                  id="edit-is_active"
                  checked={formData.is_active}
                  onCheckedChange={(checked) => setFormData({ ...formData, is_active: checked })}
                />
                <Label htmlFor="edit-is_active">Active</Label>
              </div>
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setIsEditDialogOpen(false)}>
              Cancel
            </Button>
            <Button
              onClick={() => editingRule && updateRuleMutation.mutate({ id: editingRule.id, data: formData })}
              disabled={updateRuleMutation.isPending}
            >
              {updateRuleMutation.isPending ? 'Updating...' : 'Update Rule'}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Test Dialog */}
      <Dialog open={isTestDialogOpen} onOpenChange={setIsTestDialogOpen}>
        <DialogContent className="max-w-3xl">
          <DialogHeader>
            <DialogTitle>Test Regex Rule</DialogTitle>
            <DialogDescription>
              Test how your regex rule transforms sample text
            </DialogDescription>
          </DialogHeader>
          <div className="grid gap-4 py-4">
            <div>
              <Label htmlFor="test-text">Sample Text</Label>
              <Textarea
                id="test-text"
                value={testText}
                onChange={(e) => setTestText(e.target.value)}
                placeholder="Enter sample text to test the regex rule"
                rows={4}
              />
            </div>
            {testResult && (
              <div className="space-y-4">
                <div>
                  <Label>Original Text</Label>
                  <div className="p-3 bg-gray-50 rounded border">
                    <pre className="whitespace-pre-wrap text-sm">{testResult.original}</pre>
                  </div>
                </div>
                <div>
                  <Label>Transformed Text</Label>
                  <div className="p-3 bg-green-50 rounded border">
                    <pre className="whitespace-pre-wrap text-sm">{testResult.transformed}</pre>
                  </div>
                </div>
                {testResult.matches && testResult.matches.length > 0 && (
                  <div>
                    <Label>Matches Found</Label>
                    <div className="p-3 bg-blue-50 rounded border">
                      <div className="flex flex-wrap gap-2">
                        {testResult.matches.map((match: string, index: number) => (
                          <Badge key={index} variant="secondary">{match}</Badge>
                        ))}
                      </div>
                    </div>
                  </div>
                )}
              </div>
            )}
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setIsTestDialogOpen(false)}>
              Close
            </Button>
            <Button onClick={runTest} disabled={!testText || testRuleMutation.isPending}>
              {testRuleMutation.isPending ? 'Testing...' : 'Run Test'}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}