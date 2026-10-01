import React, { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { AlertCircle, Lock, Mail } from 'lucide-react';
import { supabase } from '../../shared/lib/supabase';

export const Login: React.FC = () => {
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);
  const navigate = useNavigate();

  const handleLogin = async (event: React.FormEvent) => {
    event.preventDefault();
    setLoading(true);
    setError(null);
    try {
      const { error: loginError } = await supabase.auth.signInWithPassword({ email, password });
      if (loginError) throw loginError;
      navigate('/dashboard');
    } catch (err) {
      setError(err instanceof Error ? err.message : 'No fue posible iniciar sesión.');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="flex min-h-screen items-center justify-center bg-[#f7f7f5] p-4">
      <div className="w-full max-w-sm space-y-8 border border-gray-200 bg-white p-8">
        <div className="space-y-2 text-center">
          <div className="text-lg font-semibold tracking-[0.18em] text-gray-950">ALTIX</div>
          <p className="text-sm text-gray-500">Plataforma comercial</p>
        </div>

        {error && <div className="flex items-center gap-2 border border-red-200 bg-red-50 p-3 text-xs text-red-700"><AlertCircle size={16} /><span>{error}</span></div>}

        <form onSubmit={handleLogin} className="space-y-5">
          <label className="block text-xs font-medium text-gray-600">
            Correo electrónico
            <span className="relative mt-1 block">
              <Mail className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400" size={17} />
              <input type="email" required value={email} onChange={(event) => setEmail(event.target.value)} placeholder="admin@altix.gt" className="w-full border border-gray-300 py-2.5 pl-10 pr-4 text-sm text-gray-900 outline-none focus:border-blue-600" />
            </span>
          </label>
          <label className="block text-xs font-medium text-gray-600">
            Contraseña
            <span className="relative mt-1 block">
              <Lock className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400" size={17} />
              <input type="password" required value={password} onChange={(event) => setPassword(event.target.value)} placeholder="Contraseña" className="w-full border border-gray-300 py-2.5 pl-10 pr-4 text-sm text-gray-900 outline-none focus:border-blue-600" />
            </span>
          </label>
          <button type="submit" disabled={loading} className="w-full bg-blue-700 py-3 text-sm font-medium text-white transition hover:bg-blue-800 disabled:opacity-50">
            {loading ? 'Iniciando sesión...' : 'Ingresar'}
          </button>
        </form>
      </div>
    </div>
  );
};
