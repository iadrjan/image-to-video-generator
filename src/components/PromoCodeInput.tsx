'use client';

import { useState, useEffect, useRef } from 'react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Card, CardContent } from '@/components/ui/card';
import { useToast } from '@/hooks/use-toast';
import { Ticket, Loader2, Sparkles, MessageCircle } from 'lucide-react';

interface UsageInfo {
  canGenerate: boolean;
  reason?: string;
  remaining: number;
  total: number;
  hasUnlimited: boolean;
}

export function PromoCodeInput() {
  const { toast } = useToast();
  const [code, setCode] = useState('');
  const [loading, setLoading] = useState(false);
  const [usage, setUsage] = useState<UsageInfo | null>(null);
  const [sessionId, setSessionId] = useState<string>('');
  const hasFetchedRef = useRef(false);

  // Generate or get session ID
  useEffect(() => {
    if (typeof window !== 'undefined') {
      let sid = localStorage.getItem('sessionId');
      if (!sid) {
        sid = `session_${Date.now()}_${Math.random().toString(36).substring(2, 9)}`;
        localStorage.setItem('sessionId', sid);
      }
      // Defer setState to avoid lint error
      const timer = setTimeout(() => setSessionId(sid), 0);
      return () => clearTimeout(timer);
    }
  }, []);

  // Fetch usage info
  useEffect(() => {
    if (sessionId && !hasFetchedRef.current) {
      hasFetchedRef.current = true;
      fetchUsage();
    }
  }, [sessionId]);

  const fetchUsage = async () => {
    try {
      const res = await fetch(`/api/promo/usage?sessionId=${sessionId}`);
      if (res.ok) {
        const data = await res.json();
        setUsage(data);
      }
    } catch (error) {
      console.error('Failed to fetch usage:', error);
    }
  };

  const handleRedeem = async () => {
    if (!code.trim() || !sessionId) return;

    setLoading(true);
    try {
      const res = await fetch('/api/promo/redeem', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          code: code.trim().toUpperCase(),
          sessionId,
        }),
      });

      const data = await res.json();

      if (data.success) {
        toast({
          title: 'Code Redeemed!',
          description: data.message,
        });
        setCode('');
        fetchUsage();
      } else {
        toast({
          variant: 'destructive',
          title: 'Invalid Code',
          description: data.message,
        });
      }
    } catch (error) {
      toast({
        variant: 'destructive',
        title: 'Error',
        description: 'Failed to redeem code',
      });
    } finally {
      setLoading(false);
    }
  };

  return (
    <Card>
      <CardContent className="pt-4 space-y-4">
        {/* Usage Status */}
        {usage && (
          <div className="flex items-center justify-between p-3 rounded-lg bg-muted/50">
            <div className="flex items-center gap-2">
              {usage.hasUnlimited ? (
                <Sparkles className="w-5 h-5 text-yellow-500" />
              ) : (
                <Ticket className="w-5 h-5 text-muted-foreground" />
              )}
              <span className="font-medium">
                {usage.hasUnlimited
                  ? 'Unlimited Generations'
                  : `${usage.remaining} videos remaining`}
              </span>
            </div>
            {!usage.hasUnlimited && (
              <span className="text-sm text-muted-foreground">
                {usage.total} daily limit
              </span>
            )}
          </div>
        )}

        {/* Promo Code Input */}
        <div className="flex gap-2">
          <Input
            placeholder="Enter promo code"
            value={code}
            onChange={(e) => setCode(e.target.value.toUpperCase())}
            onKeyDown={(e) => e.key === 'Enter' && handleRedeem()}
            disabled={loading}
            className="font-mono"
          />
          <Button onClick={handleRedeem} disabled={loading || !code.trim()}>
            {loading ? (
              <Loader2 className="w-4 h-4 animate-spin" />
            ) : (
              'Apply'
            )}
          </Button>
        </div>

        <p className="text-xs text-muted-foreground text-center">
          Have a promo code? Enter it above to unlock more videos
        </p>

        {/* Telegram Contact Link */}
        <a
          href="https://t.me/adrlanserrato"
          target="_blank"
          rel="noopener noreferrer"
          className="flex items-center justify-center gap-2 p-3 rounded-lg bg-blue-500/10 hover:bg-blue-500/20 transition-colors text-blue-500 text-sm font-medium"
        >
          <MessageCircle className="w-4 h-4" />
          Message @adrlanserrato on Telegram for unlimited access
        </a>
      </CardContent>
    </Card>
  );
}
