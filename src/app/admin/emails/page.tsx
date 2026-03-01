"use client";

import { useEffect, useState, useRef, useCallback } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
  DialogFooter,
} from "@/components/ui/dialog";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { Badge } from "@/components/ui/badge";
import { 
  Mail, 
  MailOpen, 
  Reply, 
  Archive, 
  Trash2, 
  Search, 
  Send,
  Loader2,
  RefreshCw,
  Clock,
  User,
  ArrowLeft
} from "lucide-react";
import { useToast } from "@/hooks/use-toast";
import { useRouter } from "next/navigation";
import { format } from "date-fns";
import { useAuth } from "@/lib/auth-context";
import { createClient } from "@/lib/supabase/client";

interface Email {
  id: string;
  subject: string;
  sender_name: string;
  sender_email: string;
  recipient_email?: string;
  message: string;
  html_content?: string;
  status: 'unread' | 'read' | 'replied' | 'archived';
  thread_id: string;
  parent_email_id?: string;
  source: 'contact_form' | 'admin_reply' | 'system';
  email_type: 'incoming' | 'outgoing';
  sent_at: string;
  read_at?: string;
  replied_at?: string;
  created_at: string;
  updated_at: string;
  submitted_by?: string;
}

interface ReplyFormData {
  to: string;
  subject: string;
  message: string;
}

export default function AdminEmailsPage() {
  const { user, schoolId, role } = useAuth();
  const { toast } = useToast();
  const router = useRouter();
  const supabase = createClient();
  const isMounted = useRef(true);

  // State management
  const [emails, setEmails] = useState<Email[]>([]);
  const [selectedEmail, setSelectedEmail] = useState<Email | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [searchQuery, setSearchQuery] = useState("");
  const [filterStatus, setFilterStatus] = useState<string>("all");
  
  // Reply dialog state
  const [isReplyDialogOpen, setIsReplyDialogOpen] = useState(false);
  const [isReplying, setIsReplying] = useState(false);
  const [replyForm, setReplyForm] = useState<ReplyFormData>({
    to: "",
    subject: "",
    message: ""
  });

  useEffect(() => {
    return () => {
      isMounted.current = false;
    };
  }, []);

  const fetchEmails = async () => {
    if (!schoolId) return;

    try {
      setIsLoading(true);
      
      let query = supabase
        .from('emails')
        .select('*')
        .eq('school_id', schoolId)
        .order('sent_at', { ascending: false });

      if (filterStatus !== "all") {
        query = query.eq('status', filterStatus);
      }

      if (searchQuery.trim()) {
        query = query.or(`subject.ilike.%${searchQuery}%,sender_name.ilike.%${searchQuery}%,sender_email.ilike.%${searchQuery}%,message.ilike.%${searchQuery}%`);
      }

      const { data, error } = await query;
      
      if (error) throw error;

      if (isMounted.current) {
        setEmails(data || []);
      }
    } catch (error: any) {
      console.error("Error fetching emails:", error);
      toast({
        title: "Error",
        description: `Failed to load emails: ${error.message}`,
        variant: "destructive",
      });
    } finally {
      if (isMounted.current) {
        setIsLoading(false);
      }
    }
  };

  // CAREFUL: Restore one useEffect at a time to identify the issue
  useEffect(() => {
    console.log('Single useEffect triggered', { 
      hasUser: !!user, 
      hasSchoolId: !!schoolId, 
      role,
      isAuthorized: user && schoolId && (role === "admin" || role === "super_admin" || role === "accountant")
    });
    
    if (!user || !schoolId) {
      console.log('Missing user or schoolId, skipping fetch');
      return;
    }
    
    if (role !== "admin" && role !== "super_admin" && role !== "accountant") {
      console.log('Unauthorized role, redirecting');
      router.push("/");
      return;
    }
    
    console.log('Calling fetchEmails...');
    fetchEmails();
    
  }, [user, schoolId, role]); // Only these essential dependencies

  const markAsRead = async (emailId: string) => {
    try {
      const { error } = await supabase
        .from('emails')
        .update({ 
          status: 'read', 
          read_at: new Date().toISOString() 
        })
        .eq('id', emailId);

      if (error) throw error;

      // Update local state
      setEmails(prev => prev.map(email => 
        email.id === emailId 
          ? { ...email, status: 'read' as const, read_at: new Date().toISOString() }
          : email
      ));
    } catch (error: any) {
      console.error("Error marking email as read:", error);
    }
  };

  const openEmail = (email: Email) => {
    setSelectedEmail(email);
    if (email.status === 'unread') {
      markAsRead(email.id);
    }
  };

  const openReplyDialog = (email: Email) => {
    setReplyForm({
      to: email.sender_email,
      subject: email.subject.startsWith('Re: ') ? email.subject : `Re: ${email.subject}`,
      message: ""
    });
    setIsReplyDialogOpen(true);
  };

  const sendReply = async () => {
    if (!selectedEmail || !replyForm.to || !replyForm.message.trim()) {
      toast({
        title: "Error",
        description: "Please fill in all required fields",
        variant: "destructive",
      });
      return;
    }

    try {
      setIsReplying(true);

      // Send email via API route
      const response = await fetch('/api/send-email', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          to: replyForm.to,
          subject: replyForm.subject,
          message: replyForm.message,
          thread_id: selectedEmail.thread_id,
          parent_email_id: selectedEmail.id,
          school_id: schoolId
        }),
      });

      const result = await response.json();

      if (!response.ok) {
        throw new Error(result.error || 'Failed to send email');
      }
      
      toast({
        title: "Success",
        description: "Reply sent successfully!",
      });

      setIsReplyDialogOpen(false);
      setReplyForm({ to: "", subject: "", message: "" });
      await fetchEmails(); // Refresh emails

    } catch (error: any) {
      console.error("Error sending reply:", error);
      toast({
        title: "Error",
        description: `Failed to send reply: ${error.message}`,
        variant: "destructive",
      });
    } finally {
      setIsReplying(false);
    }
  };

  const archiveEmail = async (emailId: string) => {
    try {
      const { error } = await supabase
        .from('emails')
        .update({ status: 'archived' })
        .eq('id', emailId);

      if (error) throw error;

      setEmails(prev => prev.map(email => 
        email.id === emailId 
          ? { ...email, status: 'archived' as const }
          : email
      ));

      toast({
        title: "Success",
        description: "Email archived successfully",
      });
    } catch (error: any) {
      console.error("Error archiving email:", error);
      toast({
        title: "Error",
        description: `Failed to archive email: ${error.message}`,
        variant: "destructive",
      });
    }
  };

  const filteredEmails = emails.filter(email => {
    const matchesSearch = 
      email.subject.toLowerCase().includes(searchQuery.toLowerCase()) ||
      email.sender_name.toLowerCase().includes(searchQuery.toLowerCase()) ||
      email.sender_email.toLowerCase().includes(searchQuery.toLowerCase()) ||
      email.message.toLowerCase().includes(searchQuery.toLowerCase());
    
    return matchesSearch;
  });

  const getStatusBadge = (status: string) => {
    switch (status) {
      case 'unread':
        return <Badge variant="destructive">Unread</Badge>;
      case 'read':
        return <Badge variant="secondary">Read</Badge>;
      case 'replied':
        return <Badge variant="default">Replied</Badge>;
      case 'archived':
        return <Badge variant="outline">Archived</Badge>;
      default:
        return <Badge variant="secondary">{status}</Badge>;
    }
  };

  if (isLoading) {
    return (
      <div className="flex items-center justify-center h-64">
        <div className="text-center">
          <Loader2 className="h-8 w-8 animate-spin mx-auto mb-4" />
          <p className="text-muted-foreground">Loading emails...</p>
        </div>
      </div>
    );
  }

  return (
    <div className="container mx-auto p-6 max-w-7xl">
      <div className="mb-6">
        <h1 className="text-3xl font-bold tracking-tight">Email Management</h1>
        <p className="text-muted-foreground">
          Manage and respond to emails from your contact form and other communications.
        </p>
      </div>

      {/* Email Controls */}
      <div className="flex flex-col sm:flex-row gap-4 mb-6">
        <div className="flex-1">
          <div className="relative">
            <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 text-muted-foreground h-4 w-4" />
            <Input
              placeholder="Search emails..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="pl-10"
            />
          </div>
        </div>
        
        <div className="flex gap-2">
          <select
            value={filterStatus}
            onChange={(e) => setFilterStatus(e.target.value)}
            className="px-3 py-2 border border-input bg-background rounded-md text-sm"
          >
            <option value="all">All Status</option>
            <option value="unread">Unread</option>
            <option value="read">Read</option>
            <option value="replied">Replied</option>
            <option value="archived">Archived</option>
          </select>
          
          <Button onClick={fetchEmails} variant="outline" size="sm">
            <RefreshCw className="h-4 w-4 mr-2" />
            Refresh
          </Button>
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Email List */}
        <div className="lg:col-span-1">
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <Mail className="h-5 w-5" />
                Emails ({filteredEmails.length})
              </CardTitle>
            </CardHeader>
            <CardContent className="p-0">
              <div className="max-h-[600px] overflow-y-auto">
                {filteredEmails.length === 0 ? (
                  <div className="p-6 text-center text-muted-foreground">
                    <Mail className="h-12 w-12 mx-auto mb-4 opacity-50" />
                    <p>No emails found</p>
                  </div>
                ) : (
                  <div className="divide-y">
                    {filteredEmails.map((email) => (
                      <div
                        key={email.id}
                        className={`p-4 cursor-pointer hover:bg-muted/50 transition-colors ${
                          selectedEmail?.id === email.id ? 'bg-muted' : ''
                        }`}
                        onClick={() => openEmail(email)}
                      >
                        <div className="flex items-start justify-between gap-2 mb-2">
                          <div className="flex items-center gap-2">
                            {email.status === 'unread' ? (
                              <Mail className="h-4 w-4 text-blue-600" />
                            ) : (
                              <MailOpen className="h-4 w-4 text-muted-foreground" />
                            )}
                            <span className={`font-medium text-sm ${
                              email.status === 'unread' ? 'font-bold' : ''
                            }`}>
                              {email.sender_name}
                            </span>
                          </div>
                          {getStatusBadge(email.status)}
                        </div>
                        
                        <h4 className={`text-sm mb-1 line-clamp-1 ${
                          email.status === 'unread' ? 'font-semibold' : ''
                        }`}>
                          {email.subject}
                        </h4>
                        
                        <p className="text-xs text-muted-foreground line-clamp-2 mb-2">
                          {email.message}
                        </p>
                        
                        <div className="flex items-center gap-2 text-xs text-muted-foreground">
                          <Clock className="h-3 w-3" />
                          {format(new Date(email.sent_at), 'MMM d, yyyy h:mm a')}
                        </div>
                      </div>
                    ))}
                  </div>
                )}
              </div>
            </CardContent>
          </Card>
        </div>

        {/* Email Detail */}
        <div className="lg:col-span-2">
          {selectedEmail ? (
            <Card>
              <CardHeader>
                <div className="flex items-start justify-between">
                  <div className="flex-1">
                    <CardTitle className="text-xl mb-2">{selectedEmail.subject}</CardTitle>
                    <div className="flex items-center gap-4 text-sm text-muted-foreground">
                      <div className="flex items-center gap-2">
                        <User className="h-4 w-4" />
                        <span>{selectedEmail.sender_name}</span>
                        <span className="text-xs">({selectedEmail.sender_email})</span>
                      </div>
                      <div className="flex items-center gap-2">
                        <Clock className="h-4 w-4" />
                        {format(new Date(selectedEmail.sent_at), 'MMMM d, yyyy at h:mm a')}
                      </div>
                      {getStatusBadge(selectedEmail.status)}
                    </div>
                  </div>
                  
                  <div className="flex gap-2">
                    <Button 
                      onClick={() => openReplyDialog(selectedEmail)}
                      size="sm"
                      variant="outline"
                    >
                      <Reply className="h-4 w-4 mr-2" />
                      Reply
                    </Button>
                    <Button 
                      onClick={() => archiveEmail(selectedEmail.id)}
                      size="sm"
                      variant="outline"
                    >
                      <Archive className="h-4 w-4 mr-2" />
                      Archive
                    </Button>
                  </div>
                </div>
              </CardHeader>
              
              <CardContent>
                <div className="prose max-w-none">
                  <div className="whitespace-pre-wrap text-sm">
                    {selectedEmail.message}
                  </div>
                </div>
              </CardContent>
            </Card>
          ) : (
            <Card>
              <CardContent className="flex items-center justify-center h-64">
                <div className="text-center text-muted-foreground">
                  <Mail className="h-12 w-12 mx-auto mb-4 opacity-50" />
                  <p>Select an email to view its contents</p>
                </div>
              </CardContent>
            </Card>
          )}
        </div>
      </div>

      {/* Reply Dialog */}
      <Dialog open={isReplyDialogOpen} onOpenChange={setIsReplyDialogOpen}>
        <DialogContent className="max-w-2xl">
          <DialogHeader>
            <DialogTitle>Reply to Email</DialogTitle>
            <DialogDescription>
              Send a reply to {replyForm.to}
            </DialogDescription>
          </DialogHeader>
          
          <div className="space-y-4">
            <div>
              <Label htmlFor="reply-to">To</Label>
              <Input
                id="reply-to"
                value={replyForm.to}
                onChange={(e) => setReplyForm(prev => ({ ...prev, to: e.target.value }))}
                placeholder="Recipient email"
              />
            </div>
            
            <div>
              <Label htmlFor="reply-subject">Subject</Label>
              <Input
                id="reply-subject"
                value={replyForm.subject}
                onChange={(e) => setReplyForm(prev => ({ ...prev, subject: e.target.value }))}
                placeholder="Email subject"
              />
            </div>
            
            <div>
              <Label htmlFor="reply-message">Message</Label>
              <Textarea
                id="reply-message"
                value={replyForm.message}
                onChange={(e) => setReplyForm(prev => ({ ...prev, message: e.target.value }))}
                placeholder="Type your reply here..."
                rows={8}
              />
            </div>
          </div>

          <DialogFooter>
            <Button
              variant="outline"
              onClick={() => setIsReplyDialogOpen(false)}
              disabled={isReplying}
            >
              Cancel
            </Button>
            <Button 
              onClick={sendReply}
              disabled={isReplying || !replyForm.message.trim()}
            >
              {isReplying ? (
                <>
                  <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                  Sending...
                </>
              ) : (
                <>
                  <Send className="h-4 w-4 mr-2" />
                  Send Reply
                </>
              )}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
