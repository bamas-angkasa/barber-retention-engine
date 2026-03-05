'use client';

import { useEffect, useState, use } from 'react';
import { Scissors, Pause } from 'lucide-react';
import type { QueueItemPopulated, QueueStats } from '@/lib/types';
import { normalizeStats, getTicketNumber } from '@/lib/types';

interface QueueData {
  stats: QueueStats;
  items: QueueItemPopulated[];
}

export default function DisplayPage({ params }: { params: Promise<{ tenant: string }> }) {
  const { tenant: slug } = use(params);
  const [shopName, setShopName] = useState('');
  const [queueData, setQueueData] = useState<QueueData | null>(null);

  // Load tenant name once
  useEffect(() => {
    fetch(`/api/tenants/${slug}`)
      .then(r => r.ok ? r.json() : null)
      .then(d => {
        if (d) {
          const t = d.data?.tenant ?? d.tenant;
          if (t) setShopName(t.name);
        }
      })
      .catch(() => {});
  }, [slug]);

  // SSE for real-time updates
  useEffect(() => {
    let es: EventSource | null = null;
    let pollInterval: ReturnType<typeof setInterval> | null = null;

    function poll() {
      fetch(`/api/tenants/${slug}/queue`)
        .then(r => r.ok ? r.json() : null)
        .then(d => { if (d) setQueueData(d.data ?? d); })
        .catch(() => {});
    }

    try {
      es = new EventSource(`/api/tenants/${slug}/queue/stream`);
      es.onmessage = (e) => {
        try {
          const event = JSON.parse(e.data);
          if (event.type === 'QUEUE_UPDATE') {
            setQueueData({ stats: event.stats, items: event.items });
          }
        } catch {}
      };
      es.onerror = () => {
        es?.close();
        poll();
        pollInterval = setInterval(poll, 5000);
      };
    } catch {
      poll();
      pollInterval = setInterval(poll, 5000);
    }

    return () => {
      es?.close();
      if (pollInterval) clearInterval(pollInterval);
    };
  }, [slug]);

  const items = queueData?.items ?? [];
  const inService = items.filter(i => i.status === 'IN_SERVICE');
  const waiting = items.filter(i => i.status === 'WAITING').slice(0, 3);
  const stats = queueData ? normalizeStats(queueData.stats) : null;

  return (
    <div className="min-h-screen bg-background flex flex-col select-none" style={{ fontFamily: 'monospace' }}>
      {/* Header bar */}
      <header className={`text-primary-foreground px-8 py-4 flex items-center justify-between ${stats?.isPaused ? 'bg-destructive' : 'bg-primary'}`}>
        <div className="flex items-center gap-3">
          <Scissors className="w-8 h-8" strokeWidth={2.5} />
          <div>
            <div className="text-2xl font-black uppercase tracking-tight leading-none">
              {shopName || slug}
            </div>
            <div className="text-sm font-bold opacity-80 uppercase tracking-widest">
              {stats?.isPaused ? (
                <span className="flex items-center gap-1"><Pause className="w-3 h-3" /> Queue Paused</span>
              ) : 'Queue Display'}
            </div>
          </div>
        </div>
        {stats && (
          <div className="text-right">
            <div className="text-4xl font-black">{stats.isPaused ? '—' : stats.waiting}</div>
            <div className="text-sm font-bold opacity-80 uppercase tracking-widest">Waiting</div>
          </div>
        )}
      </header>

      <div className="flex-1 grid grid-cols-2 gap-0">
        {/* NOW SERVING */}
        <div className="p-8 border-r-2 border-border">
          <h2 className="text-sm font-black uppercase tracking-[0.3em] text-muted-foreground mb-6">
            Now Serving
          </h2>
          {inService.length === 0 ? (
            <div className="flex items-center justify-center h-48">
              <p className="text-2xl font-black text-muted-foreground">—</p>
            </div>
          ) : (
            <div className="space-y-4">
              {inService.map(item => (
                <div
                  key={item.id}
                  className="border-4 border-primary rounded-xl p-6 flex items-center gap-6"
                >
                  <div className="text-8xl font-black text-primary leading-none">
                    {String(getTicketNumber(item)).padStart(3, '0')}
                  </div>
                  <div className="flex-1 min-w-0">
                    <div className="text-2xl font-black truncate">{item.customer?.name}</div>
                    <div className="text-muted-foreground font-bold mt-1">{item.service?.name}</div>
                    {item.barber && (
                      <div className="text-sm font-bold text-primary mt-1">✂ {item.barber.name}</div>
                    )}
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>

        {/* NEXT UP */}
        <div className="p-8">
          <h2 className="text-sm font-black uppercase tracking-[0.3em] text-muted-foreground mb-6">
            Next Up
          </h2>
          {waiting.length === 0 ? (
            <div className="flex items-center justify-center h-48">
              <p className="text-2xl font-black text-muted-foreground">—</p>
            </div>
          ) : (
            <div className="space-y-3">
              {waiting.map((item, idx) => (
                <div
                  key={item.id}
                  className={`border-2 rounded-xl p-5 flex items-center gap-5 ${
                    idx === 0 ? 'border-foreground' : 'border-border'
                  }`}
                >
                  <div className={`text-5xl font-black leading-none ${idx === 0 ? 'text-foreground' : 'text-muted-foreground'}`}>
                    {String(getTicketNumber(item)).padStart(3, '0')}
                  </div>
                  <div className="flex-1 min-w-0">
                    <div className="text-xl font-black truncate">{item.customer?.name}</div>
                    <div className="text-sm text-muted-foreground font-bold">{item.service?.name}</div>
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>
      </div>

      {/* Footer */}
      <footer className="border-t-2 border-border px-8 py-3 flex items-center justify-between text-muted-foreground text-sm font-bold">
        <span className="uppercase tracking-widest">Queue Hub</span>
        <Clock />
      </footer>
    </div>
  );
}

function Clock() {
  const [time, setTime] = useState(() => new Date().toLocaleTimeString('id-ID', { hour: '2-digit', minute: '2-digit' }));
  useEffect(() => {
    const id = setInterval(() => {
      setTime(new Date().toLocaleTimeString('id-ID', { hour: '2-digit', minute: '2-digit' }));
    }, 1000);
    return () => clearInterval(id);
  }, []);
  return <span>{time}</span>;
}
