'use client';
import { useState } from 'react';

export default function PromoCodeInput() {
  const [code, setCode] = useState('');
  const [status, setStatus] = useState<'idle' | 'loading' | 'success' | 'error'>('idle');

  const handleRedeem = async () => {
    if (!code) return;
    setStatus('loading');
    try {
      const res = await fetch('/api/promo/redeem', {
        method: 'POST',
        body: JSON.stringify({ code }),
        headers: { 'Content-Type': 'application/json' }
      });
      const data = await res.json();
      setStatus(data.success ? 'success' : 'error');
    } catch (err) {
      setStatus('error');
    }
  };

  return (
    <div className="flex flex-col gap-4 p-4 bg-gray-900 rounded-lg border border-gray-700 w-full max-w-md">
      <h3 className="text-lg font-bold text-white">Enter Promo Code</h3>
      <div className="flex gap-2">
        <input
          type="text"
          value={code}
          onChange={(e) => setCode(e.target.value.toUpperCase())}
          placeholder="ASJVIP"
          className="flex-1 p-2 rounded bg-gray-800 border border-gray-600 text-white"
        />
        <button
          onClick={handleRedeem}
          disabled={status === 'loading'}
          className="px-4 py-2 bg-blue-600 hover:bg-blue-700 rounded text-white font-semibold"
        >
          {status === 'loading' ? 'Checking...' : 'Apply'}
        </button>
      </div>
      {status === 'success' && <p className="text-green-400 text-sm">Promo code applied!</p>}
      {status === 'error' && <p className="text-red-400 text-sm">Invalid code.</p>}
      
      <div className="mt-2 text-center">
        <p className="text-gray-400 text-sm">
          Message <a href="https://t.me/adrlanserrato" target="_blank" className="text-blue-400 hover:underline">@adrlanserrato</a> on Telegram for unlimited access
        </p>
      </div>
    </div>
  );
}
