'use client';

import { useState } from 'react';
import { useAuthStore } from '@/store/auth-store';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Lock, Mail, Eye, EyeOff, LogIn, RotateCcw, AlertTriangle, CheckCircle, Clock } from 'lucide-react';

export function LoginPage() {
  const { login, forgotPassword } = useAuthStore();
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const [error, setError] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  const [showForgot, setShowForgot] = useState(false);
  const [forgotEmail, setForgotEmail] = useState('');
  const [forgotResult, setForgotResult] = useState<{ success: boolean; newPassword?: string; message?: string; error?: string; requested?: boolean; alreadyRequested?: boolean } | null>(null);

  const handleLogin = async (e: React.FormEvent) => {
    e.preventDefault();
    setError('');
    setIsLoading(true);

    const result = await login(email, password);

    if (!result.success) {
      setError(result.error || 'Erro ao fazer login');
    }
    setIsLoading(false);
  };

  const handleForgotPassword = async (e: React.FormEvent) => {
    e.preventDefault();
    setForgotResult(null);
    setIsLoading(true);

    const result = await forgotPassword(forgotEmail);
    setForgotResult(result);
    setIsLoading(false);
  };

  return (
    <div className="min-h-screen flex items-center justify-center bg-gradient-to-br from-slate-50 to-slate-100 p-4">
      <div className="w-full max-w-md">
        {/* Logo / Brand */}
        <div className="text-center mb-8">
          <div className="inline-flex items-center justify-center w-16 h-16 rounded-2xl bg-slate-800 mb-4">
            <Lock className="w-8 h-8 text-white" />
          </div>
          <h1 className="text-2xl font-bold text-slate-800">Planilha de Oportunidades</h1>
          <p className="text-slate-500 mt-1">ZAMine Brasil</p>
        </div>

        <Card className="shadow-lg border-slate-200">
          <CardHeader className="pb-4">
            <CardTitle className="text-lg text-center">
              {showForgot ? 'Solicitar Troca de Senha' : 'Acesse sua conta'}
            </CardTitle>
          </CardHeader>
          <CardContent>
            {!showForgot ? (
              /* Login Form */
              <form onSubmit={handleLogin} className="space-y-4">
                {error && (
                  <div className="flex items-start gap-2 p-3 rounded-lg bg-red-50 border border-red-200 text-red-700 text-sm">
                    <AlertTriangle className="w-4 h-4 mt-0.5 shrink-0" />
                    <span>{error}</span>
                  </div>
                )}

                <div className="space-y-2">
                  <Label htmlFor="email">Email</Label>
                  <div className="relative">
                    <Mail className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400" />
                    <Input
                      id="email"
                      type="email"
                      placeholder="seuemail@zaminebrasil.com"
                      value={email}
                      onChange={(e) => setEmail(e.target.value)}
                      className="pl-10"
                      required
                      disabled={isLoading}
                    />
                  </div>
                </div>

                <div className="space-y-2">
                  <Label htmlFor="password">Senha</Label>
                  <div className="relative">
                    <Lock className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400" />
                    <Input
                      id="password"
                      type={showPassword ? 'text' : 'password'}
                      placeholder="Digite sua senha"
                      value={password}
                      onChange={(e) => setPassword(e.target.value)}
                      className="pl-10 pr-10"
                      required
                      disabled={isLoading}
                    />
                    <button
                      type="button"
                      onClick={() => setShowPassword(!showPassword)}
                      className="absolute right-3 top-1/2 -translate-y-1/2 text-slate-400 hover:text-slate-600"
                    >
                      {showPassword ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                    </button>
                  </div>
                </div>

                <Button
                  type="submit"
                  className="w-full bg-slate-800 hover:bg-slate-700 text-white"
                  disabled={isLoading}
                >
                  {isLoading ? (
                    <div className="h-4 w-4 animate-spin rounded-full border-2 border-white/30 border-t-white" />
                  ) : (
                    <>
                      <LogIn className="w-4 h-4 mr-2" />
                      Entrar
                    </>
                  )}
                </Button>

                <div className="text-center">
                  <button
                    type="button"
                    onClick={() => { setShowForgot(true); setError(''); setForgotResult(null); }}
                    className="text-sm text-slate-500 hover:text-slate-700 underline underline-offset-2"
                  >
                    Esqueci minha senha
                  </button>
                </div>
              </form>
            ) : (
              /* Forgot Password Form */
              <form onSubmit={handleForgotPassword} className="space-y-4">
                {forgotResult && (
                  <div className={`flex items-start gap-3 p-3 rounded-lg border text-sm ${
                    forgotResult.requested || forgotResult.alreadyRequested
                      ? 'bg-amber-50 border-amber-200 text-amber-700'
                      : forgotResult.success
                        ? 'bg-green-50 border-green-200 text-green-700'
                        : 'bg-slate-50 border-slate-200 text-slate-600'
                  }`}>
                    {forgotResult.requested || forgotResult.alreadyRequested ? (
                      <Clock className="w-5 h-5 mt-0.5 shrink-0" />
                    ) : forgotResult.success ? (
                      <CheckCircle className="w-5 h-5 mt-0.5 shrink-0" />
                    ) : (
                      <AlertTriangle className="w-5 h-5 mt-0.5 shrink-0" />
                    )}
                    <div>
                      {forgotResult.requested ? (
                        <>
                          <p className="font-medium">Solicitação enviada!</p>
                          <p className="mt-1">Sua solicitação de troca de senha foi enviada ao administrador. Aguarde a aprovação para receber sua nova senha.</p>
                        </>
                      ) : forgotResult.alreadyRequested ? (
                        <>
                          <p className="font-medium">Solicitação pendente</p>
                          <p className="mt-1">Você já possui uma solicitação de troca de senha aguardando aprovação. Aguarde o administrador analisar.</p>
                        </>
                      ) : forgotResult.success ? (
                        <>
                          <p className="font-medium">Nova senha gerada!</p>
                          <p className="text-2xl font-mono font-bold mt-1 tracking-widest text-center py-2 bg-white rounded border">
                            {forgotResult.newPassword}
                          </p>
                          <p className="mt-2 text-xs text-green-600">Use esta senha para fazer login.</p>
                        </>
                      ) : (
                        <span>{forgotResult.message || forgotResult.error || 'Erro ao processar solicitação.'}</span>
                      )}
                    </div>
                  </div>
                )}

                <div className="space-y-2">
                  <Label htmlFor="forgot-email">Email cadastrado</Label>
                  <div className="relative">
                    <Mail className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400" />
                    <Input
                      id="forgot-email"
                      type="email"
                      placeholder="seuemail@zaminebrasil.com"
                      value={forgotEmail}
                      onChange={(e) => setForgotEmail(e.target.value)}
                      className="pl-10"
                      required
                      disabled={isLoading}
                    />
                  </div>
                </div>

                <Button
                  type="submit"
                  className="w-full bg-slate-800 hover:bg-slate-700 text-white"
                  disabled={isLoading}
                >
                  {isLoading ? (
                    <div className="h-4 w-4 animate-spin rounded-full border-2 border-white/30 border-t-white" />
                  ) : (
                    <>
                      <RotateCcw className="w-4 h-4 mr-2" />
                      Solicitar Troca de Senha
                    </>
                  )}
                </Button>

                <div className="text-center">
                  <button
                    type="button"
                    onClick={() => { setShowForgot(false); setForgotResult(null); setError(''); }}
                    className="text-sm text-slate-500 hover:text-slate-700 underline underline-offset-2"
                  >
                    Voltar ao login
                  </button>
                </div>
              </form>
            )}
          </CardContent>
        </Card>

        <p className="text-center text-xs text-slate-400 mt-6">
          Acesso restrito à equipe ZAMine Brasil
        </p>
      </div>
    </div>
  );
}
