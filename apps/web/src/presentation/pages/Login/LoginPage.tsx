import { useState } from 'react';
import { useNavigate } from 'react-router-dom';

export function LoginPage() {
  const navigate = useNavigate();
  const [email, setEmail] = useState('operator@local.test');
  const [password, setPassword] = useState('spraybot123');
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);
  const [showPassword, setShowPassword] = useState(false);
  const valid = email.includes('@') && password.length >= 6;

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!valid) return;
    setLoading(true);
    setTimeout(() => { setLoading(false); navigate('/dashboard'); }, 400);
  };

  return (
    <main className="grid min-h-screen place-items-center bg-canvas px-5 py-10">
      <section className="w-full max-w-[460px] rounded-xl border border-border-default bg-surface p-8 shadow-[0_18px_55px_rgba(28,66,98,0.09)] md:p-10">
        <div className="mb-8">
          <img src="/branding/paragon-logo.jpg" alt="Paragon Technology and Innovation" className="h-10 w-auto object-contain mix-blend-multiply" />
        </div>
        <form onSubmit={handleSubmit} className="space-y-5">
          <div>
            <h1 className="mt-2 text-[30px] font-bold leading-[38px] tracking-[-0.03em]">Masuk ke Spraybot</h1>
            <p className="mt-2 text-sm leading-[22px] text-text-secondary">Akses stasiun analisis pengujian lokal.</p>
          </div>
          <label className="block text-sm font-semibold">
            Email
            <input 
              value={email} 
              onChange={e => { setEmail(e.target.value); setError(''); }} 
              className="mt-2 w-full rounded-sm border border-border-default bg-subtle px-3.5 py-3 outline-none focus:border-primary focus:bg-white" 
              type="email" 
              required 
            />
          </label>
          <label className="block text-sm font-semibold">
            Kata Sandi
            <div className="relative">
              <input 
                value={password} 
                onChange={e => { setPassword(e.target.value); setError(''); }} 
                type={showPassword ? 'text' : 'password'} 
                className="mt-2 w-full rounded-sm border border-border-default bg-subtle px-3.5 py-3 pr-14 outline-none focus:border-primary focus:bg-white" 
                required 
                minLength={6} 
              />
              <button 
                type="button" 
                onClick={() => setShowPassword(!showPassword)} 
                className="absolute right-3 top-[22px] text-xs font-semibold text-text-muted hover:text-primary" 
                aria-label={showPassword ? 'Sembunyikan kata sandi' : 'Tampilkan kata sandi'}
              >
                {showPassword ? 'Tutup' : 'Lihat'}
              </button>
            </div>
          </label>
          {error && <p className="text-sm font-semibold text-semantic-danger">{error}</p>}
          <button 
            type="submit" 
            disabled={!valid || loading} 
            aria-label="Masuk"
            className="w-full rounded-sm bg-primary px-4 py-3 font-bold text-white shadow-[0_7px_18px_rgba(29,143,255,0.2)] hover:bg-primary-hover disabled:cursor-not-allowed disabled:opacity-50"
          >
            {loading ? 'Masuk...' : 'Masuk'}
          </button>
        </form>
      </section>
    </main>
  );
}
