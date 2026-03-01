-- Create emails table for admin email management system
-- This will store emails from contact us page and allow admin replies

CREATE TABLE public.emails (
    id uuid DEFAULT gen_random_uuid() PRIMARY KEY,
    school_id bigint REFERENCES public.schools(id) ON DELETE CASCADE,
    
    -- Email metadata
    subject text NOT NULL,
    sender_name text NOT NULL,
    sender_email text NOT NULL,
    recipient_email text,
    
    -- Email content
    message text NOT NULL,
    html_content text,
    
    -- Email status and thread management
    status text NOT NULL DEFAULT 'unread', -- 'unread', 'read', 'replied', 'archived'
    thread_id uuid, -- For grouping related emails in a conversation
    parent_email_id uuid REFERENCES public.emails(id) ON DELETE SET NULL,
    
    -- Source and type
    source text NOT NULL DEFAULT 'contact_form', -- 'contact_form', 'admin_reply', 'system'
    email_type text NOT NULL DEFAULT 'incoming', -- 'incoming', 'outgoing'
    
    -- Timestamps
    sent_at timestamp with time zone DEFAULT now(),
    read_at timestamp with time zone,
    replied_at timestamp with time zone,
    created_at timestamp with time zone DEFAULT now() NOT NULL,
    updated_at timestamp with time zone DEFAULT now() NOT NULL,
    
    -- Additional metadata
    user_agent text,
    ip_address inet,
    attachments jsonb DEFAULT '[]'::jsonb
);

-- Add indexes for performance
CREATE INDEX IF NOT EXISTS idx_emails_school_id ON public.emails(school_id);
CREATE INDEX IF NOT EXISTS idx_emails_status ON public.emails(status);
CREATE INDEX IF NOT EXISTS idx_emails_thread_id ON public.emails(thread_id);
CREATE INDEX IF NOT EXISTS idx_emails_parent_id ON public.emails(parent_email_id);
CREATE INDEX IF NOT EXISTS idx_emails_sender_email ON public.emails(sender_email);
CREATE INDEX IF NOT EXISTS idx_emails_email_type ON public.emails(email_type);
CREATE INDEX IF NOT EXISTS idx_emails_source ON public.emails(source);
CREATE INDEX IF NOT EXISTS idx_emails_sent_at ON public.emails(sent_at DESC);
CREATE INDEX IF NOT EXISTS idx_emails_created_at ON public.emails(created_at DESC);

-- Enable RLS
ALTER TABLE public.emails ENABLE ROW LEVEL SECURITY;

-- Create RLS policies
CREATE POLICY "Admins can manage their school's emails" ON public.emails 
FOR ALL USING (is_my_school_record(school_id)) WITH CHECK (is_my_school_record(school_id));

CREATE POLICY "Service role can manage emails for AI and system operations" ON public.emails
FOR ALL 
TO service_role
USING (true)
WITH CHECK (true);

-- Create function to auto-generate thread_id for new email threads
CREATE OR REPLACE FUNCTION generate_thread_id()
RETURNS TRIGGER AS $$
BEGIN
    -- If this is a new email without a parent, generate a new thread_id
    IF NEW.parent_email_id IS NULL AND NEW.thread_id IS NULL THEN
        NEW.thread_id = gen_random_uuid();
    END IF;
    
    -- If this is a reply, inherit the thread_id from parent
    IF NEW.parent_email_id IS NOT NULL AND NEW.thread_id IS NULL THEN
        SELECT thread_id INTO NEW.thread_id 
        FROM public.emails 
        WHERE id = NEW.parent_email_id;
    END IF;
    
    -- Update the updated_at timestamp
    NEW.updated_at = now();
    
    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- Create trigger to auto-generate thread_id
CREATE TRIGGER emails_auto_thread_id
    BEFORE INSERT OR UPDATE ON public.emails
    FOR EACH ROW
    EXECUTE FUNCTION generate_thread_id();

-- Add comment explaining the table purpose
COMMENT ON TABLE public.emails IS 
'Email management system for admin portal. Stores contact form submissions and admin replies.';

COMMENT ON COLUMN public.emails.attachments IS 
'JSON array of attachment metadata: [{"name": "file.pdf", "size": 1024, "type": "application/pdf", "url": "..."}]';
