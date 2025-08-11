import { useState } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Textarea } from '@/components/ui/textarea';
import { Label } from '@/components/ui/label';
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle, DialogTrigger } from '@/components/ui/dialog';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Checkbox } from '@/components/ui/checkbox';
import { useToast } from '@/hooks/use-toast';
import { Check, X, Clock, MessageSquare, Filter, CheckSquare } from 'lucide-react';

interface PendingMessage {
  id: string;
  user_id: string;
  mapping_id: string;
  source_chat_id: string;
  message_id: string;
  original_text: string;
  processed_text: string;
  media_type?: string;
  status: 'pending' | 'approved' | 'rejected';
  created_at: string;
  approved_by?: string;
  approved_at?: string;
  rejection_reason?: string;
  source_name?: string;
  destination_name?: string;
  mapping_priority?: number;
}

export default function PendingMessages() {
  const [selectedTab, setSelectedTab] = useState('pending');
  const [selectedMessages, setSelectedMessages] = useState<string[]>([]);
  const [isApprovalDialogOpen, setIsApprovalDialogOpen] = useState(false);
  const [isRejectionDialogOpen, setIsRejectionDialogOpen] = useState(false);
  const [isBulkActionDialogOpen, setIsBulkActionDialogOpen] = useState(false);
  const [currentMessage, setCurrentMessage] = useState<PendingMessage | null>(null);
  const [comment, setComment] = useState('');
  const [bulkAction, setBulkAction] = useState<'approve' | 'reject'>('approve');

  const { toast } = useToast();
  const queryClient = useQueryClient();

  const { data: messages = [], isLoading } = useQuery({
    queryKey: ['/api/pending-messages', selectedTab],
    queryFn: async () => {
      const response = await fetch(`/api/pending-messages?status=${selectedTab}`, {
        headers: {
          'Authorization': `Bearer ${localStorage.getItem('token')}`
        }
      });
      if (!response.ok) throw new Error('Failed to fetch pending messages');
      return response.json();
    }
  });

  const { data: stats } = useQuery({
    queryKey: ['/api/pending-messages/stats/summary'],
    queryFn: async () => {
      const response = await fetch('/api/pending-messages/stats/summary', {
        headers: {
          'Authorization': `Bearer ${localStorage.getItem('token')}`
        }
      });
      if (!response.ok) throw new Error('Failed to fetch stats');
      return response.json();
    }
  });

  const approveMutation = useMutation({
    mutationFn: async ({ id, comment }: { id: string; comment?: string }) => {
      const response = await fetch(`/api/pending-messages/${id}/approve`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${localStorage.getItem('token')}`
        },
        body: JSON.stringify({ action: 'approve', comment })
      });
      if (!response.ok) throw new Error('Failed to approve message');
      return response.json();
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['/api/pending-messages'] });
      queryClient.invalidateQueries({ queryKey: ['/api/pending-messages/stats/summary'] });
      setIsApprovalDialogOpen(false);
      setCurrentMessage(null);
      setComment('');
      toast({ description: 'Message approved successfully' });
    },
    onError: () => {
      toast({ variant: 'destructive', description: 'Failed to approve message' });
    }
  });

  const rejectMutation = useMutation({
    mutationFn: async ({ id, comment }: { id: string; comment?: string }) => {
      const response = await fetch(`/api/pending-messages/${id}/reject`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${localStorage.getItem('token')}`
        },
        body: JSON.stringify({ action: 'reject', comment })
      });
      if (!response.ok) throw new Error('Failed to reject message');
      return response.json();
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['/api/pending-messages'] });
      queryClient.invalidateQueries({ queryKey: ['/api/pending-messages/stats/summary'] });
      setIsRejectionDialogOpen(false);
      setCurrentMessage(null);
      setComment('');
      toast({ description: 'Message rejected successfully' });
    },
    onError: () => {
      toast({ variant: 'destructive', description: 'Failed to reject message' });
    }
  });

  const bulkActionMutation = useMutation({
    mutationFn: async ({ action, messageIds, comment }: { action: string; messageIds: string[]; comment?: string }) => {
      const response = await fetch('/api/pending-messages/bulk-action', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${localStorage.getItem('token')}`
        },
        body: JSON.stringify({ action, message_ids: messageIds, comment })
      });
      if (!response.ok) throw new Error('Failed to perform bulk action');
      return response.json();
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['/api/pending-messages'] });
      queryClient.invalidateQueries({ queryKey: ['/api/pending-messages/stats/summary'] });
      setIsBulkActionDialogOpen(false);
      setSelectedMessages([]);
      setComment('');
      toast({ description: 'Bulk action completed successfully' });
    },
    onError: () => {
      toast({ variant: 'destructive', description: 'Failed to perform bulk action' });
    }
  });

  const handleApprove = (message: PendingMessage) => {
    setCurrentMessage(message);
    setComment('');
    setIsApprovalDialogOpen(true);
  };

  const handleReject = (message: PendingMessage) => {
    setCurrentMessage(message);
    setComment('');
    setIsRejectionDialogOpen(true);
  };

  const handleBulkAction = (action: 'approve' | 'reject') => {
    if (selectedMessages.length === 0) {
      toast({ variant: 'destructive', description: 'Please select messages first' });
      return;
    }
    setBulkAction(action);
    setComment('');
    setIsBulkActionDialogOpen(true);
  };

  const toggleMessageSelection = (messageId: string) => {
    setSelectedMessages(prev => 
      prev.includes(messageId) 
        ? prev.filter(id => id !== messageId)
        : [...prev, messageId]
    );
  };

  const toggleSelectAll = () => {
    if (selectedMessages.length === messages.length) {
      setSelectedMessages([]);
    } else {
      setSelectedMessages(messages.map((m: PendingMessage) => m.id));
    }
  };

  const getStatusBadge = (status: string) => {
    switch (status) {
      case 'pending':
        return <Badge variant="outline" className="text-orange-600 border-orange-600"><Clock className="w-3 h-3 mr-1" />Pending</Badge>;
      case 'approved':
        return <Badge variant="outline" className="text-green-600 border-green-600"><Check className="w-3 h-3 mr-1" />Approved</Badge>;
      case 'rejected':
        return <Badge variant="outline" className="text-red-600 border-red-600"><X className="w-3 h-3 mr-1" />Rejected</Badge>;
      default:
        return <Badge variant="secondary">{status}</Badge>;
    }
  };

  const getMediaTypeBadge = (mediaType?: string) => {
    if (!mediaType || mediaType === 'text') return null;
    return <Badge variant="secondary" className="ml-2">{mediaType}</Badge>;
  };

  if (isLoading) {
    return (
      <div className="container mx-auto p-6">
        <div className="flex items-center justify-center h-64">
          <div className="text-lg">Loading pending messages...</div>
        </div>
      </div>
    );
  }

  return (
    <div className="container mx-auto p-6">
      <div className="flex justify-between items-center mb-6">
        <div>
          <h1 className="text-3xl font-bold">Pending Messages</h1>
          <p className="text-gray-600">Review and approve messages that require manual approval</p>
        </div>
        {selectedMessages.length > 0 && selectedTab === 'pending' && (
          <div className="flex items-center space-x-2">
            <span className="text-sm text-gray-500">{selectedMessages.length} selected</span>
            <Button
              variant="outline"
              size="sm"
              onClick={() => handleBulkAction('approve')}
            >
              <Check className="w-4 h-4 mr-1" />
              Bulk Approve
            </Button>
            <Button
              variant="outline"
              size="sm"
              onClick={() => handleBulkAction('reject')}
            >
              <X className="w-4 h-4 mr-1" />
              Bulk Reject
            </Button>
          </div>
        )}
      </div>

      {/* Statistics Cards */}
      {stats && (
        <div className="grid grid-cols-1 md:grid-cols-4 gap-4 mb-6">
          {stats.status_breakdown?.map((stat: any) => (
            <Card key={stat.status}>
              <CardContent className="p-4">
                <div className="flex items-center justify-between">
                  <div>
                    <p className="text-sm font-medium text-gray-600 capitalize">{stat.status}</p>
                    <p className="text-2xl font-bold">{stat.count}</p>
                  </div>
                  <div className="text-gray-400">
                    {stat.status === 'pending' && <Clock className="h-8 w-8" />}
                    {stat.status === 'approved' && <Check className="h-8 w-8" />}
                    {stat.status === 'rejected' && <X className="h-8 w-8" />}
                  </div>
                </div>
              </CardContent>
            </Card>
          ))}
        </div>
      )}

      <Tabs value={selectedTab} onValueChange={setSelectedTab}>
        <TabsList>
          <TabsTrigger value="pending">Pending</TabsTrigger>
          <TabsTrigger value="approved">Approved</TabsTrigger>
          <TabsTrigger value="rejected">Rejected</TabsTrigger>
        </TabsList>

        <TabsContent value="pending" className="mt-6">
          {messages.length > 0 && (
            <div className="flex items-center justify-between mb-4">
              <div className="flex items-center space-x-2">
                <Checkbox
                  checked={selectedMessages.length === messages.length}
                  onCheckedChange={toggleSelectAll}
                />
                <Label className="text-sm">Select all</Label>
              </div>
              <div className="text-sm text-gray-500">
                {messages.length} pending messages
              </div>
            </div>
          )}
          
          <div className="space-y-4">
            {messages.map((message: PendingMessage) => (
              <Card key={message.id}>
                <CardHeader>
                  <div className="flex items-center justify-between">
                    <div className="flex items-center space-x-3">
                      <Checkbox
                        checked={selectedMessages.includes(message.id)}
                        onCheckedChange={() => toggleMessageSelection(message.id)}
                      />
                      <div>
                        <CardTitle className="text-lg flex items-center">
                          <MessageSquare className="w-4 h-4 mr-2" />
                          {message.source_name || `Chat ${message.source_chat_id}`}
                          {getMediaTypeBadge(message.media_type)}
                        </CardTitle>
                        <CardDescription>
                          To: {message.destination_name || `Chat ${message.mapping_id}`} • 
                          {new Date(message.created_at).toLocaleString()}
                        </CardDescription>
                      </div>
                    </div>
                    <div className="flex items-center space-x-2">
                      {getStatusBadge(message.status)}
                      <Button
                        variant="outline"
                        size="sm"
                        onClick={() => handleApprove(message)}
                        className="text-green-600 hover:text-green-700"
                      >
                        <Check className="w-4 h-4" />
                      </Button>
                      <Button
                        variant="outline"
                        size="sm"
                        onClick={() => handleReject(message)}
                        className="text-red-600 hover:text-red-700"
                      >
                        <X className="w-4 h-4" />
                      </Button>
                    </div>
                  </div>
                </CardHeader>
                <CardContent>
                  <div className="space-y-4">
                    <div>
                      <Label className="text-sm font-medium text-gray-500">Original Message</Label>
                      <div className="mt-1 p-3 bg-gray-50 rounded border">
                        <pre className="whitespace-pre-wrap text-sm">{message.original_text}</pre>
                      </div>
                    </div>
                    {message.processed_text !== message.original_text && (
                      <div>
                        <Label className="text-sm font-medium text-gray-500">Processed Message</Label>
                        <div className="mt-1 p-3 bg-blue-50 rounded border">
                          <pre className="whitespace-pre-wrap text-sm">{message.processed_text}</pre>
                        </div>
                      </div>
                    )}
                  </div>
                </CardContent>
              </Card>
            ))}
          </div>
        </TabsContent>

        <TabsContent value="approved" className="mt-6">
          <div className="space-y-4">
            {messages.map((message: PendingMessage) => (
              <Card key={message.id}>
                <CardHeader>
                  <div className="flex items-center justify-between">
                    <div>
                      <CardTitle className="text-lg flex items-center">
                        <MessageSquare className="w-4 h-4 mr-2" />
                        {message.source_name || `Chat ${message.source_chat_id}`}
                        {getMediaTypeBadge(message.media_type)}
                      </CardTitle>
                      <CardDescription>
                        Approved by {message.approved_by} • {new Date(message.approved_at || '').toLocaleString()}
                      </CardDescription>
                    </div>
                    {getStatusBadge(message.status)}
                  </div>
                </CardHeader>
                <CardContent>
                  <div className="p-3 bg-green-50 rounded border">
                    <pre className="whitespace-pre-wrap text-sm">{message.processed_text}</pre>
                  </div>
                </CardContent>
              </Card>
            ))}
          </div>
        </TabsContent>

        <TabsContent value="rejected" className="mt-6">
          <div className="space-y-4">
            {messages.map((message: PendingMessage) => (
              <Card key={message.id}>
                <CardHeader>
                  <div className="flex items-center justify-between">
                    <div>
                      <CardTitle className="text-lg flex items-center">
                        <MessageSquare className="w-4 h-4 mr-2" />
                        {message.source_name || `Chat ${message.source_chat_id}`}
                        {getMediaTypeBadge(message.media_type)}
                      </CardTitle>
                      <CardDescription>
                        Rejected by {message.approved_by} • {new Date(message.approved_at || '').toLocaleString()}
                      </CardDescription>
                    </div>
                    {getStatusBadge(message.status)}
                  </div>
                </CardHeader>
                <CardContent>
                  <div className="space-y-4">
                    <div className="p-3 bg-red-50 rounded border">
                      <pre className="whitespace-pre-wrap text-sm">{message.original_text}</pre>
                    </div>
                    {message.rejection_reason && (
                      <div>
                        <Label className="text-sm font-medium text-gray-500">Rejection Reason</Label>
                        <div className="mt-1 p-2 bg-gray-100 rounded">
                          <p className="text-sm">{message.rejection_reason}</p>
                        </div>
                      </div>
                    )}
                  </div>
                </CardContent>
              </Card>
            ))}
          </div>
        </TabsContent>
      </Tabs>

      {messages.length === 0 && (
        <Card>
          <CardContent className="text-center py-12">
            <MessageSquare className="w-12 h-12 mx-auto text-gray-400 mb-4" />
            <p className="text-gray-500 mb-2">No {selectedTab} messages found</p>
            <p className="text-sm text-gray-400">
              {selectedTab === 'pending' && 'Messages requiring approval will appear here'}
              {selectedTab === 'approved' && 'Approved messages will appear here'}
              {selectedTab === 'rejected' && 'Rejected messages will appear here'}
            </p>
          </CardContent>
        </Card>
      )}

      {/* Approval Dialog */}
      <Dialog open={isApprovalDialogOpen} onOpenChange={setIsApprovalDialogOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Approve Message</DialogTitle>
            <DialogDescription>
              Are you sure you want to approve this message for forwarding?
            </DialogDescription>
          </DialogHeader>
          <div className="py-4">
            <Label htmlFor="approve-comment">Comment (optional)</Label>
            <Textarea
              id="approve-comment"
              value={comment}
              onChange={(e) => setComment(e.target.value)}
              placeholder="Add a comment about this approval..."
              rows={3}
            />
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setIsApprovalDialogOpen(false)}>
              Cancel
            </Button>
            <Button
              onClick={() => currentMessage && approveMutation.mutate({ id: currentMessage.id, comment })}
              disabled={approveMutation.isPending}
              className="text-green-600 hover:text-green-700"
            >
              {approveMutation.isPending ? 'Approving...' : 'Approve'}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Rejection Dialog */}
      <Dialog open={isRejectionDialogOpen} onOpenChange={setIsRejectionDialogOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Reject Message</DialogTitle>
            <DialogDescription>
              Are you sure you want to reject this message?
            </DialogDescription>
          </DialogHeader>
          <div className="py-4">
            <Label htmlFor="reject-comment">Rejection reason</Label>
            <Textarea
              id="reject-comment"
              value={comment}
              onChange={(e) => setComment(e.target.value)}
              placeholder="Why are you rejecting this message?"
              rows={3}
            />
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setIsRejectionDialogOpen(false)}>
              Cancel
            </Button>
            <Button
              onClick={() => currentMessage && rejectMutation.mutate({ id: currentMessage.id, comment })}
              disabled={rejectMutation.isPending}
              className="text-red-600 hover:text-red-700"
            >
              {rejectMutation.isPending ? 'Rejecting...' : 'Reject'}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Bulk Action Dialog */}
      <Dialog open={isBulkActionDialogOpen} onOpenChange={setIsBulkActionDialogOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>
              Bulk {bulkAction === 'approve' ? 'Approve' : 'Reject'} Messages
            </DialogTitle>
            <DialogDescription>
              Are you sure you want to {bulkAction} {selectedMessages.length} selected messages?
            </DialogDescription>
          </DialogHeader>
          <div className="py-4">
            <Label htmlFor="bulk-comment">
              {bulkAction === 'approve' ? 'Comment' : 'Rejection reason'} (optional)
            </Label>
            <Textarea
              id="bulk-comment"
              value={comment}
              onChange={(e) => setComment(e.target.value)}
              placeholder={`Enter ${bulkAction === 'approve' ? 'comment' : 'rejection reason'}...`}
              rows={3}
            />
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setIsBulkActionDialogOpen(false)}>
              Cancel
            </Button>
            <Button
              onClick={() => bulkActionMutation.mutate({ action: bulkAction, messageIds: selectedMessages, comment })}
              disabled={bulkActionMutation.isPending}
              className={bulkAction === 'approve' ? 'text-green-600 hover:text-green-700' : 'text-red-600 hover:text-red-700'}
            >
              {bulkActionMutation.isPending ? `${bulkAction === 'approve' ? 'Approving' : 'Rejecting'}...` : `Bulk ${bulkAction === 'approve' ? 'Approve' : 'Reject'}`}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}