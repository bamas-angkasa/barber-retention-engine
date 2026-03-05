'use client';

import { useState, use } from 'react';
import { useRouter } from 'next/navigation';
import { toast } from 'sonner';
import { Scissors, Lock } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Card } from '@/components/ui/card';
import { ThemeToggle } from '@/components/theme-toggle';
import { LangToggle } from '@/components/lang-toggle';
import { useLang } from '@/components/lang-provider';

export default function AdminLoginPage({ params }: { params: Promise<{ tenant: string }> }) {
  const { tenant } = use(params);
  const { t } = useLang();
  const router = useRouter();
  const [pin, setPin] = useState('');
  const [loading, setLoading] = useState(false);

  async function handleLogin(e: React.FormEvent) {
    e.preventDefault();
    if (!pin) return;
    setLoading(true);
    try {
      const res = await fetch(`/api/tenants/${tenant}/auth/login`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ pin }),
      });
      const json = await res.json();
      if (!res.ok) {
        toast.error(json.error?.message ?? 'Login failed');
        return;
      }
      const token = json.data?.token;
      if (token) {
        localStorage.setItem(`admin_token_${tenant}`, token);
      }
      router.push(`/${tenant}/admin`);
    } catch {
      toast.error('Login failed');
    } finally {
      setLoading(false);
    }
  }

  return (
    <div className="min-h-screen bg-background flex flex-col">
      {/* Header */}
      <header className="flex items-center justify-between px-4 py-3 border-b border-border">
        <div className="flex items-center gap-2">
          <Scissors className="w-5 h-5 text-primary" />
          <span className="font-black text-sm uppercase tracking-widest">
            {tenant}
          </span>
        </div>
        <div className="flex items-center gap-2">
          <LangToggle />
          <ThemeToggle />
        </div>
      </header>

      {/* Content */}
      <div className="flex-1 flex items-center justify-center p-4">
        <Card className="w-full max-w-sm p-6 space-y-6">
          <div className="text-center space-y-2">
            <div className="flex justify-center">
              <div className="w-12 h-12 rounded-full bg-primary/10 flex items-center justify-center">
                <Lock className="w-6 h-6 text-primary" />
              </div>
            </div>
            <h1 className="text-xl font-black uppercase tracking-tight">
              {t('adminDashboard')}
            </h1>
            <p className="text-sm text-muted-foreground">
              {tenant}
            </p>
          </div>

          <form onSubmit={handleLogin} className="space-y-4">
            <div className="space-y-2">
              <Label htmlFor="pin">PIN</Label>
              <Input
                id="pin"
                type="password"
                inputMode="numeric"
                pattern="[0-9]*"
                maxLength={6}
                placeholder="••••"
                value={pin}
                onChange={e => setPin(e.target.value)}
                className="text-center text-2xl tracking-widest font-black"
                autoFocus
              />
            </div>
            <Button
              type="submit"
              className="w-full font-black uppercase tracking-wider"
              disabled={loading || pin.length < 4}
            >
              {loading ? t('loading') : t('confirm')}
            </Button>
          </form>
        </Card>
      </div>
    </div>
  );
}
