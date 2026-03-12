import React, { useState, useEffect } from 'react';
import { Head } from '@inertiajs/react';
import toast from 'react-hot-toast';
import AuthLayout from '../components/AuthLayout';
import { Mail, Smartphone, Shield, ArrowLeft, Loader2, ShieldCheck } from 'lucide-react';

export default function TwoFactorVerify({ 
  email_2fa_enabled, 
  authenticator_2fa_enabled, 
  user_email,
  user_name
}) {
  const [selectedMethod, setSelectedMethod] = useState(null);
  const [step, setStep] = useState('select'); // 'select', 'verify'
  const [code, setCode] = useState(['', '', '', '', '', '']);
  const [sending, setSending] = useState(false);
  const [verifying, setVerifying] = useState(false);
  const [codeSent, setCodeSent] = useState(false);

  // Auto-select if only one method is available
  useEffect(() => {
    if (email_2fa_enabled && !authenticator_2fa_enabled) {
      setSelectedMethod('email');
      setStep('verify');
    } else if (!email_2fa_enabled && authenticator_2fa_enabled) {
      setSelectedMethod('authenticator');
      setStep('verify');
    }
  }, [email_2fa_enabled, authenticator_2fa_enabled]);

  const handleCodeInput = (index, value) => {
    if (value.length > 1) {
      // Handle paste
      const pastedCode = value.slice(0, 6).split('');
      const newCode = [...code];
      pastedCode.forEach((char, i) => {
        if (i < 6) newCode[i] = char;
      });
      setCode(newCode);
      return;
    }

    if (!/^\d*$/.test(value)) return;

    const newCode = [...code];
    newCode[index] = value;
    setCode(newCode);

    if (value && index < 5) {
      const nextInput = document.getElementById(`2fa-code-${index + 1}`);
      nextInput?.focus();
    }
  };

  const handleKeyDown = (index, e) => {
    if (e.key === 'Backspace' && !code[index] && index > 0) {
      const prevInput = document.getElementById(`2fa-code-${index - 1}`);
      prevInput?.focus();
    }
  };

  const selectMethod = (method) => {
    setSelectedMethod(method);
    setStep('verify');
    setCode(['', '', '', '', '', '']);
    setCodeSent(false);
  };

  const goBack = () => {
    if (email_2fa_enabled && authenticator_2fa_enabled) {
      setStep('select');
      setSelectedMethod(null);
      setCode(['', '', '', '', '', '']);
      setCodeSent(false);
    } else {
      // Go back to login
      window.location.href = '/login/';
    }
  };

  const sendCode = async () => {
    setSending(true);
    try {
      const response = await fetch('/2fa-verify/send-code/', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'X-CSRFToken': window.csrfToken || '',
        },
      });

      const data = await response.json();
      if (data.success) {
        setCodeSent(true);
        toast.success('Verification code sent to your email');
      } else {
        toast.error(data.message || 'Failed to send code');
      }
    } catch (error) {
      toast.error('Failed to send verification code');
    } finally {
      setSending(false);
    }
  };

  const verifyCode = async () => {
    const codeStr = code.join('');
    if (codeStr.length !== 6) {
      toast.error('Please enter the 6-digit code');
      return;
    }

    setVerifying(true);
    try {
      const response = await fetch('/2fa-verify/verify/', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'X-CSRFToken': window.csrfToken || '',
        },
        body: JSON.stringify({ 
          code: codeStr, 
          method: selectedMethod 
        }),
      });

      const data = await response.json();
      if (data.success) {
        toast.success('Verification successful!');
        window.location.href = data.redirect || '/dashboard/';
      } else {
        toast.error(data.message || 'Invalid verification code');
      }
    } catch (error) {
      toast.error('Verification failed');
    } finally {
      setVerifying(false);
    }
  };

  const CodeInput = () => (
    <div className="flex gap-2 justify-center">
      {code.map((digit, index) => (
        <input
          key={index}
          id={`2fa-code-${index}`}
          type="text"
          inputMode="numeric"
          maxLength={6}
          value={digit}
          onChange={(e) => handleCodeInput(index, e.target.value)}
          onKeyDown={(e) => handleKeyDown(index, e)}
          className="w-12 h-14 text-center text-2xl font-semibold border-2 border-gray-300 rounded-lg focus:border-[#4a154b] focus:ring-2 focus:ring-[#4a154b]/20 outline-none transition-all"
        />
      ))}
    </div>
  );

  return (
    <AuthLayout
      title="Two-Factor Authentication"
      subtitle="Verify your identity to continue securely"
      features={[
        'Extra layer of security for your account',
        'Protect against unauthorized access',
        'Quick and easy verification'
      ]}
    >
      <Head title="Two-Factor Verification" />
      
      <div className="max-w-md mx-auto">
        {/* Method Selection */}
        {step === 'select' && email_2fa_enabled && authenticator_2fa_enabled && (
          <>
            <div className="text-center mb-8">
              <div className="mx-auto w-16 h-16 rounded-full bg-purple-50 flex items-center justify-center mb-4">
                <Shield className="w-8 h-8 text-[#4a154b]" />
              </div>
              <h1 className="text-2xl sm:text-3xl font-bold text-gray-900 mb-2">
                Choose Verification Method
              </h1>
              <p className="text-gray-500">
                Hi {user_name}, select how you'd like to verify your identity
              </p>
            </div>

            <div className="space-y-4">
              <button
                onClick={() => selectMethod('email')}
                className="w-full p-4 border-2 border-gray-200 rounded-xl hover:border-[#4a154b] hover:bg-purple-50 transition-all flex items-center gap-4 group"
              >
                <div className="p-3 rounded-xl bg-purple-50 group-hover:bg-[#4a154b] transition-colors">
                  <Mail className="w-6 h-6 text-[#4a154b] group-hover:text-white transition-colors" />
                </div>
                <div className="text-left flex-1">
                  <h3 className="font-semibold text-gray-900">Email Verification</h3>
                  <p className="text-sm text-gray-500">Send a code to {user_email}</p>
                </div>
              </button>

              <button
                onClick={() => selectMethod('authenticator')}
                className="w-full p-4 border-2 border-gray-200 rounded-xl hover:border-[#4a154b] hover:bg-purple-50 transition-all flex items-center gap-4 group"
              >
                <div className="p-3 rounded-xl bg-purple-50 group-hover:bg-[#4a154b] transition-colors">
                  <Smartphone className="w-6 h-6 text-[#4a154b] group-hover:text-white transition-colors" />
                </div>
                <div className="text-left flex-1">
                  <h3 className="font-semibold text-gray-900">Authenticator App</h3>
                  <p className="text-sm text-gray-500">Use your authenticator app</p>
                </div>
              </button>
            </div>

            <div className="mt-6 text-center">
              <a href="/login/" className="text-sm text-gray-500 hover:text-[#4a154b] flex items-center justify-center gap-1">
                <ArrowLeft className="w-4 h-4" />
                Back to login
              </a>
            </div>
          </>
        )}

        {/* Email Verification */}
        {step === 'verify' && selectedMethod === 'email' && (
          <>
            <div className="text-center mb-8">
              <div className="mx-auto w-16 h-16 rounded-full bg-purple-50 flex items-center justify-center mb-4">
                <Mail className="w-8 h-8 text-[#4a154b]" />
              </div>
              <h1 className="text-2xl sm:text-3xl font-bold text-gray-900 mb-2">
                Email Verification
              </h1>
              <p className="text-gray-500">
                {codeSent 
                  ? `Enter the 6-digit code sent to ${user_email}`
                  : `We'll send a verification code to ${user_email}`
                }
              </p>
            </div>

            {!codeSent ? (
              <div className="space-y-4">
                <button
                  onClick={sendCode}
                  disabled={sending}
                  className="w-full bg-[#4a154b] text-white py-3 rounded-lg font-semibold hover:bg-[#5a235c] transition-colors disabled:opacity-50 flex items-center justify-center gap-2"
                >
                  {sending && <Loader2 className="w-5 h-5 animate-spin" />}
                  {sending ? 'Sending...' : 'Send Verification Code'}
                </button>
              </div>
            ) : (
              <div className="space-y-6">
                <CodeInput />
                
                <button
                  onClick={verifyCode}
                  disabled={verifying || code.join('').length !== 6}
                  className="w-full bg-[#4a154b] text-white py-3 rounded-lg font-semibold hover:bg-[#5a235c] transition-colors disabled:opacity-50 flex items-center justify-center gap-2"
                >
                  {verifying && <Loader2 className="w-5 h-5 animate-spin" />}
                  {verifying ? 'Verifying...' : 'Verify & Sign In'}
                </button>

                <div className="text-center">
                  <button
                    onClick={sendCode}
                    disabled={sending}
                    className="text-sm text-[#4a154b] hover:underline"
                  >
                    Didn't receive the code? Send again
                  </button>
                </div>
              </div>
            )}

            <div className="mt-6 text-center">
              <button 
                onClick={goBack}
                className="text-sm text-gray-500 hover:text-[#4a154b] flex items-center justify-center gap-1 mx-auto"
              >
                <ArrowLeft className="w-4 h-4" />
                {email_2fa_enabled && authenticator_2fa_enabled ? 'Choose different method' : 'Back to login'}
              </button>
            </div>
          </>
        )}

        {/* Authenticator Verification */}
        {step === 'verify' && selectedMethod === 'authenticator' && (
          <>
            <div className="text-center mb-8">
              <div className="mx-auto w-16 h-16 rounded-full bg-purple-50 flex items-center justify-center mb-4">
                <Smartphone className="w-8 h-8 text-[#4a154b]" />
              </div>
              <h1 className="text-2xl sm:text-3xl font-bold text-gray-900 mb-2">
                Authenticator Verification
              </h1>
              <p className="text-gray-500">
                Enter the 6-digit code from your authenticator app
              </p>
            </div>

            <div className="space-y-6">
              <CodeInput />
              
              <button
                onClick={verifyCode}
                disabled={verifying || code.join('').length !== 6}
                className="w-full bg-[#4a154b] text-white py-3 rounded-lg font-semibold hover:bg-[#5a235c] transition-colors disabled:opacity-50 flex items-center justify-center gap-2"
              >
                {verifying && <Loader2 className="w-5 h-5 animate-spin" />}
                {verifying ? 'Verifying...' : 'Verify & Sign In'}
              </button>
            </div>

            <div className="mt-6 text-center">
              <button 
                onClick={goBack}
                className="text-sm text-gray-500 hover:text-[#4a154b] flex items-center justify-center gap-1 mx-auto"
              >
                <ArrowLeft className="w-4 h-4" />
                {email_2fa_enabled && authenticator_2fa_enabled ? 'Choose different method' : 'Back to login'}
              </button>
            </div>
          </>
        )}
      </div>
    </AuthLayout>
  );
}
