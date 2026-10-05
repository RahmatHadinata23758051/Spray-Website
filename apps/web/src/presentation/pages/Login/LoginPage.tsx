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
    <main 
      className="relative flex min-h-screen items-center justify-center px-4 py-8 md:p-10"
      style={{
        backgroundImage: "url('/background-login.png')",
        backgroundSize: 'cover',
        backgroundPosition: 'center',
        backgroundRepeat: 'no-repeat',
      }}
    >
      {/* Precision Instrument Panel */}
      <section className="relative w-full max-w-[520px] overflow-hidden rounded-[14px] border border-slate-200 bg-white shadow-[0_4px_24px_rgba(15,23,42,0.06)] md:translate-x-2">
        {/* Vertical Datum Rail */}
        <div className="absolute left-0 top-0 bottom-4 w-[3px] rounded-b-[2px] bg-[#1D8FFF]" aria-hidden="true" />

        {/* Zone A: Identity Header */}
        <header className="flex items-center justify-between border-b border-slate-200 bg-[#FAFCFD] px-8 py-4.5 pl-9">
          <div className="flex items-center">
            <img 
              src="/branding/paragon-logo.jpg" 
              alt="Paragon Technology and Innovation" 
              className="h-[38px] w-auto object-contain mix-blend-multiply" 
            />
          </div>
          <div className="text-right">
            <span className="text-[11px] font-bold tracking-[0.18em] text-slate-500 uppercase select-none font-sans">
              SPRAYBOT
            </span>
          </div>
        </header>

        {/* Zone B: Authentication */}
        <div className="relative p-8 pl-9 md:p-10 md:pl-11">
          {/* Header Title */}
          <div className="mb-8">
            <h1 className="text-[24px] font-bold leading-tight tracking-tight text-slate-900">
              Masuk ke Spraybot
            </h1>
            <p className="mt-1.5 text-[14px] leading-relaxed text-slate-500">
              Sistem Pengujian dan Analisis Spray
            </p>
          </div>

          {/* Form */}
          <form onSubmit={handleSubmit} className="space-y-5">
            {/* Email Field */}
            <div>
              <label className="block text-[13px] font-semibold text-slate-700 mb-2">
                Email
              </label>
              <input 
                value={email} 
                onChange={e => { setEmail(e.target.value); setError(''); }} 
                className="w-full h-[54px] rounded-[8px] border border-slate-200 bg-[#F8FAFC] px-4 text-[14px] text-slate-900 outline-none transition-colors focus:border-[#1D8FFF] focus:bg-white focus:ring-1 focus:ring-[#1D8FFF]" 
                type="email" 
                required 
              />
            </div>

            {/* Kata Sandi Field */}
            <div>
              <label className="block text-[13px] font-semibold text-slate-700 mb-2">
                Kata Sandi
              </label>
              <div className="relative">
                <input 
                  value={password} 
                  onChange={e => { setPassword(e.target.value); setError(''); }} 
                  type={showPassword ? 'text' : 'password'} 
                  className="w-full h-[54px] rounded-[8px] border border-slate-200 bg-[#F8FAFC] px-4 pr-[110px] text-[14px] text-slate-900 outline-none transition-colors focus:border-[#1D8FFF] focus:bg-white focus:ring-1 focus:ring-[#1D8FFF]" 
                  required 
                  minLength={6} 
                />
                <button 
                  type="button" 
                  onClick={() => setShowPassword(!showPassword)} 
                  className="absolute right-4 top-1/2 -translate-y-1/2 text-[12px] font-semibold text-slate-500 transition-colors hover:text-[#1D8FFF]" 
                  aria-label={showPassword ? 'Sembunyikan kata sandi' : 'Tampilkan kata sandi'}
                >
                  {showPassword ? 'Sembunyikan' : 'Tampilkan'}
                </button>
              </div>
            </div>

            {/* Error Message */}
            {error && (
              <p className="text-[13px] font-medium text-red-600">{error}</p>
            )}

            {/* Primary Action Button */}
            <div className="pt-2">
              <button 
                type="submit" 
                disabled={!valid || loading} 
                aria-label="Masuk"
                className="w-full h-[54px] rounded-[8px] bg-[#1D8FFF] px-4 text-[15px] font-semibold text-white transition-all hover:bg-[#1677D9] disabled:cursor-not-allowed disabled:bg-slate-200 disabled:text-slate-400"
              >
                {loading ? 'Memproses...' : 'Masuk'}
              </button>
            </div>
          </form>

          {/* Corner Structural Datum Mark */}
          <div 
            className="pointer-events-none absolute bottom-3 right-3 h-3 w-3 border-b-2 border-r-2 border-slate-300/80" 
            aria-hidden="true" 
          />
        </div>
      </section>
    </main>
  );
}
