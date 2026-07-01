"use client";

import { useState, useEffect, useRef } from "react";
import { supabase } from "../utils/supabase/client";
import { X, ArrowRight, Mail, Fingerprint, Loader2, User, KeyRound } from "lucide-react";

interface AuthModalProps {
  onClose: () => void;
  onSuccess: () => void;
  initialMode?: "login" | "signup";
}

export function AuthModal({ onClose, onSuccess, initialMode = "signup" }: AuthModalProps) {
  const [mounted, setMounted] = useState(false);
  const [mode, setMode] = useState<"login" | "signup">(initialMode);
  const [step, setStep] = useState<"email" | "otp">("email");
  const [email, setEmail] = useState("");
  const [otp, setOtp] = useState(["", "", "", "", "", ""]);
  const [name, setName] = useState("");
  const [preferredLanguage, setPreferredLanguage] = useState("Hinglish");
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    const t = setTimeout(() => setMounted(true), 10);
    return () => clearTimeout(t);
  }, []);

  useEffect(() => {
    const fn = (e: KeyboardEvent) => { if (e.key === "Escape") onClose(); };
    window.addEventListener("keydown", fn);
    return () => window.removeEventListener("keydown", fn);
  }, [onClose]);

  const handleEmailSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!email || (mode === "signup" && !name.trim())) return;
    setIsLoading(true);
    setError(null);
    try {
      const { error } = await supabase.auth.signInWithOtp({
        email,
        options: { 
          shouldCreateUser: mode === "signup",
          data: mode === "signup" ? { full_name: name.trim(), preferred_language: preferredLanguage } : undefined
        },
      });
      if (error) throw error;
      setStep("otp");
    } catch (err: any) {
      if (err.message && err.message.toLowerCase().includes("signups not allowed")) {
        setError("Account not found. Please sign up first.");
      } else {
        setError(err.message || "Failed to send code.");
      }
    } finally {
      setIsLoading(false);
    }
  };

  const handleOtpChange = (index: number, value: string) => {
    if (!/^\d*$/.test(value)) return;
    const newOtp = [...otp];
    newOtp[index] = value;
    setOtp(newOtp);
    if (value && index < 5) {
      document.getElementById(`otp-${index + 1}`)?.focus();
    }
  };

  const handleOtpKeyDown = (index: number, e: React.KeyboardEvent<HTMLInputElement>) => {
    if (e.key === "Backspace" && !otp[index] && index > 0) {
      document.getElementById(`otp-${index - 1}`)?.focus();
    }
  };

  const handleOtpSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    const token = otp.join("");
    if (token.length !== 6) return;
    setIsLoading(true);
    setError(null);
    try {
      const { data, error } = await supabase.auth.verifyOtp({
        email,
        token,
        type: "email",
      });
      if (error) throw error;
      onSuccess();
    } catch (err: any) {
      setError(err.message || "Invalid code.");
    } finally {
      setIsLoading(false);
    }
  };

  const handleOAuthLogin = async (provider: 'google' | 'github') => {
    setIsLoading(true);
    setError(null);
    try {
      const { error } = await supabase.auth.signInWithOAuth({
        provider: provider,
        options: { redirectTo: window.location.origin + '/' }
      });
      if (error) throw error;
    } catch (err: any) {
      setError(err.message || "Failed to authenticate.");
      setIsLoading(false);
    }
  };

  return (
    <div className="fixed inset-0 z-[100] flex items-center justify-center p-4">
      <div
        onClick={onClose}
        className="absolute inset-0 cursor-pointer bg-black/90 backdrop-blur-md"
      />

      <div
        className={`relative w-full max-w-[420px] max-h-[90dvh] overflow-y-auto no-scrollbar bg-black border border-white/[0.08] rounded-[24px] flex flex-col transition-all duration-[500ms] ${
          mounted ? "opacity-100 translate-y-0 scale-100" : "opacity-0 translate-y-8 scale-[0.96]"
        }`}
        style={{
          boxShadow: "0 40px 100px -20px rgba(0,0,0,1)",
          transitionTimingFunction: "cubic-bezier(0.2, 0.8, 0.2, 1)",
        }}
      >
        <div className="flex justify-between items-center px-6 pt-6 pb-2">
          <div className="size-8 rounded-full bg-white/5 border border-white/10 grid place-items-center">
            <Fingerprint className="size-4 text-[#a1a1aa]" />
          </div>
          <button 
            onClick={onClose}
            className="text-[#52525b] hover:text-white transition-colors"
          >
            <X className="size-5" />
          </button>
        </div>

        <div className="px-6 py-4 md:px-8 md:pb-8">
          <div className="mb-8 mt-2">
            <h2 className="text-[26px] font-semibold text-white tracking-tight mb-2 font-display">
              {step === "otp" ? "Check your email." : (mode === "signup" ? "Create an account." : "Welcome back.")}
            </h2>
            <p className="text-[15px] text-[#a1a1aa] leading-relaxed">
              {step === "otp" 
                ? `We sent a confirmation link to ${email}. Click the link to log in instantly. If you received a 6-digit code instead, enter it below.`
                : (mode === "signup" ? "Enter your details to start executing." : "Enter your email to log in.")}
            </p>
          </div>

          <div className="animate-message-reveal">
            {step === "email" && (
              <form onSubmit={handleEmailSubmit} className="flex flex-col gap-4">
                {mode === "signup" && (
                  <>
                    <div className="relative flex items-center bg-white/[0.03] border border-white/[0.05] focus-within:bg-white/[0.06] focus-within:border-white/[0.15] focus-within:shadow-[0_0_20px_rgba(255,255,255,0.05)] rounded-2xl transition-all duration-300">
                      <User className="size-5 text-[#71717a] absolute left-4" />
                      <input 
                        type="text" 
                        value={name}
                        onChange={(e) => setName(e.target.value)}
                        placeholder="Full name"
                        className="w-full bg-transparent border-none outline-none text-white text-[15px] pl-12 pr-4 py-4 placeholder:text-[#71717a]"
                        required
                        autoFocus
                      />
                    </div>
                    
                    <div className="relative flex items-center bg-white/[0.03] border border-white/[0.05] focus-within:bg-white/[0.06] focus-within:border-white/[0.15] focus-within:shadow-[0_0_20px_rgba(255,255,255,0.05)] rounded-2xl transition-all duration-300">
                      <svg xmlns="http://www.w3.org/2000/svg" width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" className="size-5 text-[#71717a] absolute left-4">
                        <circle cx="12" cy="12" r="10"/><path d="M12 2a14.5 14.5 0 0 0 0 20 14.5 14.5 0 0 0 0-20"/><path d="M2 12h20"/>
                      </svg>
                      <select
                        value={preferredLanguage}
                        onChange={(e) => setPreferredLanguage(e.target.value)}
                        className="w-full bg-transparent border-none outline-none text-white text-[15px] pl-12 pr-4 py-4 appearance-none cursor-pointer"
                        required
                      >
                        <option value="Hinglish" className="bg-[#0f0f0f] text-white">Hinglish (Default Mentor)</option>
                        <option value="English" className="bg-[#0f0f0f] text-white">English (Global)</option>
                        <option value="Hindi" className="bg-[#0f0f0f] text-white">Hindi (Pure)</option>
                        <option value="Spanish" className="bg-[#0f0f0f] text-white">Spanish</option>
                        <option value="French" className="bg-[#0f0f0f] text-white">French</option>
                        <option value="German" className="bg-[#0f0f0f] text-white">German</option>
                      </select>
                    </div>
                  </>
                )}
                <div className="relative flex items-center bg-white/[0.03] border border-white/[0.05] focus-within:bg-white/[0.06] focus-within:border-white/[0.15] focus-within:shadow-[0_0_20px_rgba(255,255,255,0.05)] rounded-2xl transition-all duration-300">
                  <Mail className="size-5 text-[#71717a] absolute left-4" />
                  <input 
                    type="email" 
                    value={email}
                    onChange={(e) => setEmail(e.target.value)}
                    placeholder="Email address"
                    className="w-full bg-transparent border-none outline-none text-white text-[15px] pl-12 pr-4 py-4 placeholder:text-[#71717a]"
                    required
                    autoFocus={mode === "login"}
                  />
                </div>
                {error && <div className="text-[#ff3333] text-[13px] font-mono px-2">{error}</div>}
                <button 
                  type="submit"
                  disabled={isLoading}
                  className="mt-2 flex items-center justify-center gap-2 w-full bg-white text-black font-semibold py-4 rounded-2xl hover:scale-[0.98] transition-transform duration-300 disabled:opacity-50 disabled:hover:scale-100 shadow-[0_0_30px_rgba(255,255,255,0.15)]"
                >
                  {isLoading ? <Loader2 className="size-5 animate-spin" /> : "Continue"}
                  {!isLoading && <ArrowRight className="size-4" />}
                </button>
              </form>
            )}

            {step === "otp" && (
              <form onSubmit={handleOtpSubmit} className="flex flex-col gap-5">
                <div className="flex justify-between items-center gap-2 mb-2">
                  {otp.map((digit, idx) => (
                    <input
                      key={idx}
                      id={`otp-${idx}`}
                      type="text"
                      inputMode="numeric"
                      maxLength={1}
                      value={digit}
                      onChange={(e) => handleOtpChange(idx, e.target.value)}
                      onKeyDown={(e) => handleOtpKeyDown(idx, e)}
                      className="w-12 h-14 bg-white/[0.03] border border-white/[0.05] focus:bg-white/[0.08] focus:border-white/[0.2] focus:shadow-[0_0_15px_rgba(255,255,255,0.1)] rounded-xl text-center text-xl font-mono text-white outline-none transition-all duration-300"
                      autoFocus={idx === 0}
                      required
                    />
                  ))}
                </div>
                {error && <div className="text-[#ff3333] text-[13px] font-mono px-2">{error}</div>}
                <button 
                  type="submit"
                  disabled={isLoading || otp.join("").length !== 6}
                  className="mt-2 flex items-center justify-center gap-2 w-full bg-white text-black font-semibold py-4 rounded-2xl hover:scale-[0.98] transition-transform duration-300 disabled:opacity-50 disabled:hover:scale-100 shadow-[0_0_30px_rgba(255,255,255,0.15)]"
                >
                  {isLoading ? <Loader2 className="size-5 animate-spin" /> : "Verify Code"}
                  {!isLoading && <ArrowRight className="size-4" />}
                </button>
                <button 
                  type="button"
                  onClick={() => setStep("email")}
                  className="text-[#a1a1aa] text-[13px] hover:text-white transition-colors"
                >
                  Back to email
                </button>
              </form>
            )}

            {step === "email" && (
              <>
                <div className="flex items-center gap-4 my-8">
                  <div className="h-[1px] flex-1 bg-[#18181b]" />
                  <span className="text-[11px] font-mono text-[#52525b] uppercase tracking-widest">Or connect via</span>
                  <div className="h-[1px] flex-1 bg-[#18181b]" />
                </div>
                <div className="flex flex-col gap-3">
                  <button 
                    onClick={() => handleOAuthLogin('google')}
                    disabled={isLoading}
                    className="flex items-center justify-center gap-3 w-full bg-white/[0.03] border border-white/[0.05] text-white hover:bg-white/[0.08] hover:border-white/[0.15] font-medium py-3.5 transition-all cursor-pointer disabled:opacity-50 rounded-2xl group"
                  >
                    <svg className="size-4" viewBox="0 0 24 24">
                      <path d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92c-.26 1.37-1.04 2.53-2.21 3.31v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.09z" fill="#4285F4"/>
                      <path d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z" fill="#34A853"/>
                      <path d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.07H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.93l2.85-2.22.81-.62z" fill="#FBBC05"/>
                      <path d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.07l3.66 2.84c.87-2.6 3.3-4.53 6.16-4.53z" fill="#EA4335"/>
                    </svg>
                    Continue with Google
                  </button>
                  <button 
                    onClick={() => handleOAuthLogin('github')}
                    disabled={isLoading}
                    className="flex items-center justify-center gap-3 w-full bg-white/[0.03] border border-white/[0.05] text-white hover:bg-white/[0.08] hover:border-white/[0.15] font-medium py-3.5 transition-all cursor-pointer disabled:opacity-50 rounded-2xl group"
                  >
                    <svg className="size-4" viewBox="0 0 24 24" fill="currentColor">
                      <path d="M12 2C6.477 2 2 6.477 2 12c0 4.42 2.865 8.166 6.839 9.489.5.092.682-.217.682-.482 0-.237-.008-.866-.013-1.7-2.782.603-3.369-1.34-3.369-1.34-.454-1.156-1.11-1.462-1.11-1.462-.908-.62.069-.608.069-.608 1.003.07 1.531 1.03 1.531 1.03.892 1.529 2.341 1.087 2.91.831.092-.646.35-1.086.636-1.336-2.22-.253-4.555-1.11-4.555-4.943 0-1.091.39-1.984 1.029-2.683-.103-.253-.446-1.27.098-2.647 0 0 .84-.268 2.75 1.022A9.606 9.606 0 0112 6.82c.85.004 1.705.114 2.504.336 1.909-1.29 2.747-1.022 2.747-1.022.546 1.377.203 2.394.1 2.647.64.699 1.028 1.592 1.028 2.683 0 3.842-2.339 4.687-4.566 4.935.359.309.678.919.678 1.852 0 1.336-.012 2.415-.012 2.743 0 .267.18.578.688.48C19.138 20.161 22 16.418 22 12c0-5.523-4.477-10-10-10z" />
                    </svg>
                    Continue with GitHub
                  </button>
                </div>

                <div className="mt-8 flex items-center justify-center text-[13px] font-medium text-[#52525b]">
                  {mode === "signup" ? (
                    <>
                      Already have an account? 
                      <button 
                        type="button"
                        onClick={() => { setMode("login"); setError(null); }}
                        className="ml-2 text-white hover:underline transition-all"
                      >
                        Log in
                      </button>
                    </>
                  ) : (
                    <>
                      Don't have an account? 
                      <button 
                        type="button"
                        onClick={() => { setMode("signup"); setError(null); }}
                        className="ml-2 text-white hover:underline transition-all"
                      >
                        Sign up
                      </button>
                    </>
                  )}
                </div>
              </>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}
