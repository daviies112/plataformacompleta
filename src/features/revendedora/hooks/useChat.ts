import { useState, useEffect, useCallback, useRef } from 'react';
import { useSupabase } from '@/features/revendedora/contexts/SupabaseContext';
import { getResellerId as getStoredResellerId } from '@/features/revendedora/lib/resellerAuth';

export interface ChatMessage {
  id: string;
  thread_id: string;
  company_id: string;
  reseller_id: string;
  message: string;
  type: 'sent' | 'received';
  category: string;
  status: 'pending' | 'sent' | 'delivered' | 'read' | 'failed';
  created_at: string;
  attachments?: any[];
}

export interface ChatThread {
  id: string;
  company_id: string;
  reseller_id: string;
  reseller_phone: string;
  reseller_name: string;
  category: string;
  status: 'open' | 'closed' | 'pending';
  unread_count: number;
  last_message_at: string;
  created_at: string;
}

export interface EvolutionConnection {
  id: string;
  company_id: string;
  instance_name: string;
  status: 'connected' | 'disconnected' | 'connecting';
  phone_number?: string;
  connected_at?: string;
}

export function useChat() {
  const { client: supabase, loading: supabaseLoading, configured } = useSupabase();
  
  const [messages, setMessages] = useState<ChatMessage[]>([]);
  const [thread, setThread] = useState<ChatThread | null>(null);
  const [connection, setConnection] = useState<EvolutionConnection | null>(null);
  const [loading, setLoading] = useState(false);
  const [sending, setSending] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [companyId, setCompanyId] = useState<string | null>(null);
  const [resellerId, setResellerId] = useState<string | null>(null);
  const subscriptionRef = useRef<any>(null);
  const initializedRef = useRef(false);

  const fetchCompanyAndReseller = useCallback(async () => {
    if (!supabase) return { companyId: null, resellerId: null };
    
    try {
      const { data: companies } = await supabase
        .from('companies')
        .select('id')
        .limit(1)
        .single();
      
      const cId = companies?.id || null;
      
      const storedResellerId = getStoredResellerId();
      
      if (!storedResellerId) {
        console.error('[useChat] Reseller ID not found in localStorage. User must be logged in first.');
        setCompanyId(cId);
        setResellerId(null);
        return { companyId: cId, resellerId: null };
      }
      
      console.log('[useChat] Context loaded:', { companyId: cId, resellerId: storedResellerId });
      
      setCompanyId(cId);
      setResellerId(storedResellerId);
      
      return { companyId: cId, resellerId: storedResellerId };
    } catch (err: any) {
      console.log('[useChat] Error fetching company:', err.message);
      return { companyId: null, resellerId: null };
    }
  }, [supabase]);

  const fetchConnection = useCallback(async (cId: string) => {
    if (!supabase || !cId) return;
    
    try {
      const response = await fetch(`/api/evolution/connection?companyId=${cId}`);
      const data = await response.json();
      
      if (data.success && data.connection) {
        setConnection(data.connection);
      }
    } catch (err: any) {
      console.log('[useChat] No Evolution connection found');
    }
  }, [supabase]);

  const fetchOrCreateThread = useCallback(async (cId: string, rId: string) => {
    if (!supabase || !cId || !rId) return null;
    
    try {
      let resellerName = 'Revendedor';
      let resellerPhone = '';
      
      try {
        const { data: resellerData } = await supabase
          .from('resellers')
          .select('name, phone')
          .eq('id', rId)
          .single();
        
        if (resellerData) {
          resellerName = (resellerData as any).name || 'Revendedor';
          resellerPhone = (resellerData as any).phone || '';
        }
      } catch {
        console.log('[useChat] Could not fetch reseller details');
      }
      
      const response = await fetch('/api/chat/thread', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          company_id: cId,
          reseller_id: rId,
          reseller_name: resellerName,
          reseller_phone: resellerPhone,
          category: 'suporte'
        })
      });
      
      const data = await response.json();
      
      if (data.success && data.thread) {
        setThread(data.thread);
        return data.thread;
      }
      
      return null;
    } catch (err: any) {
      console.error('[useChat] Thread error:', err);
      setError(err.message);
      return null;
    }
  }, [supabase]);

  const fetchMessages = useCallback(async (threadId: string) => {
    if (!supabase || !threadId) return;
    
    try {
      const response = await fetch(`/api/chat/messages?threadId=${threadId}`);
      const data = await response.json();
      
      if (data.success) {
        setMessages(data.messages || []);
      }
    } catch (err: any) {
      console.error('[useChat] Messages fetch error:', err);
    }
  }, [supabase]);

  const sendMessage = useCallback(async (messageText: string, category: string = 'suporte') => {
    if (!supabase || !thread || !messageText.trim() || !companyId || !resellerId) return null;
    
    setSending(true);
    setError(null);
    
    const optimisticMessage: ChatMessage = {
      id: `temp-${Date.now()}`,
      thread_id: thread.id,
      company_id: companyId,
      reseller_id: resellerId,
      message: messageText.trim(),
      type: 'sent',
      category,
      status: 'pending',
      created_at: new Date().toISOString()
    };
    
    setMessages(prev => [...prev, optimisticMessage]);
    
    try {
      const response = await fetch('/api/chat/send', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          company_id: companyId,
          reseller_id: resellerId,
          thread_id: thread.id,
          message: messageText.trim(),
          category
        })
      });
      
      const data = await response.json();
      
      if (data.success && data.message) {
        setMessages(prev => 
          prev.map(msg => 
            msg.id === optimisticMessage.id 
              ? { ...data.message, status: 'sent' }
              : msg
          )
        );
        return data.message;
      } else {
        setMessages(prev => 
          prev.map(msg => 
            msg.id === optimisticMessage.id 
              ? { ...msg, status: 'failed' }
              : msg
          )
        );
        setError(data.error || 'Failed to send message');
        return null;
      }
    } catch (err: any) {
      setMessages(prev => 
        prev.map(msg => 
          msg.id === optimisticMessage.id 
            ? { ...msg, status: 'failed' }
            : msg
        )
      );
      setError(err.message);
      return null;
    } finally {
      setSending(false);
    }
  }, [thread, companyId, resellerId, supabase]);

  const subscribeToMessages = useCallback((threadId: string) => {
    if (!supabase || !threadId) return;
    
    if (subscriptionRef.current) {
      subscriptionRef.current.unsubscribe();
    }
    
    const channel = supabase
      .channel(`chat-messages-${threadId}`)
      .on(
        'postgres_changes',
        {
          event: 'INSERT',
          schema: 'public',
          table: 'chat_messages',
          filter: `thread_id=eq.${threadId}`
        },
        (payload: any) => {
          const newMessage = payload.new as ChatMessage;
          setMessages(prev => {
            const exists = prev.some(m => m.id === newMessage.id);
            if (exists) return prev;
            return [...prev, newMessage];
          });
        }
      )
      .on(
        'postgres_changes',
        {
          event: 'UPDATE',
          schema: 'public',
          table: 'chat_messages',
          filter: `thread_id=eq.${threadId}`
        },
        (payload: any) => {
          const updatedMessage = payload.new as ChatMessage;
          setMessages(prev => 
            prev.map(msg => 
              msg.id === updatedMessage.id ? updatedMessage : msg
            )
          );
        }
      )
      .subscribe();
    
    subscriptionRef.current = channel;
  }, [supabase]);

  const initialize = useCallback(async () => {
    if (!supabase || supabaseLoading) {
      console.log('[useChat] Supabase not configured or still loading');
      return;
    }
    
    if (initializedRef.current) return;
    initializedRef.current = true;
    
    setLoading(true);
    
    try {
      const { companyId: cId, resellerId: rId } = await fetchCompanyAndReseller();
      
      if (!cId || !rId) {
        console.log('[useChat] No company or reseller found in database');
        setLoading(false);
        return;
      }
      
      await fetchConnection(cId);
      const chatThread = await fetchOrCreateThread(cId, rId);
      
      if (chatThread) {
        await fetchMessages(chatThread.id);
        subscribeToMessages(chatThread.id);
      }
    } catch (err: any) {
      console.error('[useChat] Initialize error:', err);
      setError(err.message);
    } finally {
      setLoading(false);
    }
  }, [fetchCompanyAndReseller, fetchConnection, fetchOrCreateThread, fetchMessages, subscribeToMessages, supabase, supabaseLoading]);

  useEffect(() => {
    if (supabaseLoading) return;
    if (!supabase) return;
    
    initializedRef.current = false;
    initialize();
    
    return () => {
      if (subscriptionRef.current) {
        subscriptionRef.current.unsubscribe();
      }
    };
  }, [supabase, supabaseLoading]);

  const isConnected = connection?.status === 'connected';
  const hasSupabase = !!supabase && configured;

  return {
    messages,
    thread,
    connection,
    loading: loading || supabaseLoading,
    sending,
    error,
    isConnected,
    hasSupabase,
    sendMessage,
    refresh: initialize
  };
}
