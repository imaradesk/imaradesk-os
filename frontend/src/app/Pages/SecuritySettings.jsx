import React, { useState } from 'react';
import api from '../../utils/axios';
import SettingsPage, { SettingsSection, SettingsRow, Toggle, Badge, btn } from '../components/settings/SettingsPage';
import Modal from '../components/Modal';
import toast from 'react-hot-toast';
import { Mail, Smartphone, Shield, ShieldCheck, ShieldAlert, ShieldX, Copy, Check, Loader2 } from 'lucide-react';

export default function SecuritySettings({ auth, security_settings: initialSettings }) {
  const [settings] = useState(initialSettings);
  
  // Email 2FA Setup State
  const [showEmailSetup, setShowEmailSetup] = useState(false);
  const [emailCode, setEmailCode] = useState(['', '', '', '', '', '']);
  const [emailStep, setEmailStep] = useState(1);
  const [sendingEmail, setSendingEmail] = useState(false);
  const [verifyingEmail, setVerifyingEmail] = useState(false);
  
  // Authenticator App Setup State
  const [showAuthenticatorSetup, setShowAuthenticatorSetup] = useState(false);
  const [authenticatorStep, setAuthenticatorStep] = useState(1);
  const [qrCode, setQrCode] = useState('');
  const [secretKey, setSecretKey] = useState('');
  const [authenticatorCode, setAuthenticatorCode] = useState(['', '', '', '', '', '']);
  const [loadingQR, setLoadingQR] = useState(false);
  const [verifyingAuth, setVerifyingAuth] = useState(false);
  const [copiedSecret, setCopiedSecret] = useState(false);

  // Disable 2FA State
  const [showDisableEmail, setShowDisableEmail] = useState(false);
  const [showDisableAuth, setShowDisableAuth] = useState(false);
  const [disableCode, setDisableCode] = useState(['', '', '', '', '', '']);
  const [disableStep, setDisableStep] = useState(1);
  const [sendingDisableCode, setSendingDisableCode] = useState(false);
  const [verifyingDisable, setVerifyingDisable] = useState(false);
  const [disableMethod, setDisableMethod] = useState('');

  // Email 2FA Functions
  const openEmailSetup = () => {
    setShowEmailSetup(true);
    setEmailStep(1);
    setEmailCode(['', '', '', '', '', '']);
  };

  const sendEmailCode = async () => {
    setSendingEmail(true);
    try {
      const response = await api.post('/administration/security/2fa/email/send/');

      const data = response.data;
      if (data.success) {
        setEmailStep(2);
        toast.success('Verification code sent to your email');
      } else {
        toast.error(data.message || 'Failed to send code');
      }
    } catch (error) {
      toast.error('Failed to send verification code');
    } finally {
      setSendingEmail(false);
    }
  };

  const verifyEmailCode = async () => {
    const code = emailCode.join('');
    if (code.length !== 6) {
      toast.error('Please enter the 6-digit code');
      return;
    }

    setVerifyingEmail(true);
    try {
      const response = await api.post('/administration/security/2fa/email/verify/', { code });

      const data = response.data;
      if (data.success) {
        toast.success('Email 2FA enabled successfully');
        setShowEmailSetup(false);
        window.location.reload();
      } else {
        toast.error(data.message || 'Invalid verification code');
      }
    } catch (error) {
      toast.error('Failed to verify code');
    } finally {
      setVerifyingEmail(false);
    }
  };

  // Authenticator App Functions
  // Opens on the intro step; the QR code is only generated after "Continue"
  const openAuthenticatorSetup = () => {
    setShowAuthenticatorSetup(true);
    setAuthenticatorStep(0);
    setAuthenticatorCode(['', '', '', '', '', '']);
    setQrCode('');
    setSecretKey('');
  };

  const continueAuthenticatorSetup = async () => {
    setAuthenticatorStep(1);
    setLoadingQR(true);

    try {
      const response = await api.post('/administration/security/2fa/authenticator/setup/');

      const data = response.data;
      if (data.success) {
        setQrCode(data.qr_code);
        setSecretKey(data.secret_key);
      } else {
        toast.error(data.message || 'Failed to generate QR code');
        setShowAuthenticatorSetup(false);
      }
    } catch (error) {
      toast.error('Failed to setup authenticator');
      setShowAuthenticatorSetup(false);
    } finally {
      setLoadingQR(false);
    }
  };

  const verifyAuthenticatorCode = async () => {
    const code = authenticatorCode.join('');
    if (code.length !== 6) {
      toast.error('Please enter the 6-digit code');
      return;
    }

    setVerifyingAuth(true);
    try {
      const response = await api.post('/administration/security/2fa/authenticator/verify/', { code });

      const data = response.data;
      if (data.success) {
        toast.success('Authenticator app enabled successfully');
        setShowAuthenticatorSetup(false);
        window.location.reload();
      } else {
        toast.error(data.message || 'Invalid verification code');
      }
    } catch (error) {
      toast.error('Failed to verify code');
    } finally {
      setVerifyingAuth(false);
    }
  };

  const copySecretKey = () => {
    navigator.clipboard.writeText(secretKey);
    setCopiedSecret(true);
    toast.success('Secret key copied');
    setTimeout(() => setCopiedSecret(false), 2000);
  };

  // Disable 2FA Functions
  const openDisableEmail = () => {
    setShowDisableEmail(true);
    setDisableStep(1);
    setDisableCode(['', '', '', '', '', '']);
    setDisableMethod('email');
  };

  const openDisableAuth = () => {
    setShowDisableAuth(true);
    setDisableStep(1);
    setDisableCode(['', '', '', '', '', '']);
    setDisableMethod('authenticator');
  };

  const sendDisableCode = async (method) => {
    setSendingDisableCode(true);
    try {
      const response = await api.post('/administration/security/2fa/disable/send/', { method });

      const data = response.data;
      if (data.success) {
        setDisableStep(2);
        toast.success('Confirmation code sent to your email');
      } else {
        toast.error(data.message || 'Failed to send code');
      }
    } catch (error) {
      toast.error('Failed to send confirmation code');
    } finally {
      setSendingDisableCode(false);
    }
  };

  const verifyDisableCode = async (method) => {
    const code = disableCode.join('');
    if (code.length !== 6) {
      toast.error('Please enter the 6-digit code');
      return;
    }

    setVerifyingDisable(true);
    const endpoint = method === 'email' 
      ? '/administration/security/2fa/email/disable/' 
      : '/administration/security/2fa/authenticator/disable/';

    try {
      const response = await api.post(endpoint, { code });

      const data = response.data;
      if (data.success) {
        toast.success(`${method === 'email' ? 'Email' : 'Authenticator'} 2FA disabled successfully`);
        setShowDisableEmail(false);
        setShowDisableAuth(false);
        window.location.reload();
      } else {
        toast.error(data.message || 'Invalid confirmation code');
      }
    } catch (error) {
      toast.error('Failed to disable 2FA');
    } finally {
      setVerifyingDisable(false);
    }
  };

  // Code Input Handler
  const handleCodeInput = (codeArray, setCodeArray, index, value, idPrefix = 'code') => {
    if (value.length > 1) {
      const pastedCode = value.slice(0, 6).split('');
      const newCode = [...codeArray];
      pastedCode.forEach((char, i) => {
        if (i < 6) newCode[i] = char;
      });
      setCodeArray(newCode);
      return;
    }

    if (!/^\d*$/.test(value)) return;

    const newCode = [...codeArray];
    newCode[index] = value;
    setCodeArray(newCode);

    if (value && index < 5) {
      const nextInput = document.getElementById(`${idPrefix}-${index + 1}`);
      nextInput?.focus();
    }
  };

  const handleCodeKeyDown = (codeArray, setCodeArray, index, e, idPrefix = 'code') => {
    if (e.key === 'Backspace' && !codeArray[index] && index > 0) {
      const prevInput = document.getElementById(`${idPrefix}-${index - 1}`);
      prevInput?.focus();
    }
  };

  // Code Input Component
  const CodeInput = ({ code, setCode, idPrefix = 'code' }) => (
    <div className="flex gap-2 justify-center">
      {code.map((digit, index) => (
        <input
          key={index}
          id={`${idPrefix}-${index}`}
          type="text"
          inputMode="numeric"
          maxLength={6}
          value={digit}
          onChange={(e) => handleCodeInput(code, setCode, index, e.target.value, idPrefix)}
          onKeyDown={(e) => handleCodeKeyDown(code, setCode, index, e, idPrefix)}
          className="w-12 h-14 text-center text-2xl font-semibold border-2 border-gray-300 rounded-lg focus:border-[#0B3D26] focus:ring-2 focus:ring-[#0B3D26]/20 outline-none transition-all"
        />
      ))}
    </div>
  );

  return (
    <>
      <SettingsPage
        title="Security"
        icon={Shield}
        description="Protect sign-ins with a second step. Even if a password leaks, nobody gets in without the code."
      >
        {/* Overall status */}
        {(() => {
          const on = [auth?.user?.email_2fa_enabled, auth?.user?.authenticator_2fa_enabled].filter(Boolean).length
          return (
            <div className={`flex flex-col sm:flex-row sm:items-center gap-4 rounded-xl border px-5 sm:px-6 py-4 ${on ? 'border-emerald-200 bg-emerald-50/60' : 'border-amber-200 bg-amber-50/60'}`}>
              <span className={`w-10 h-10 rounded-xl flex items-center justify-center flex-shrink-0 ${on ? 'bg-emerald-100 text-emerald-700' : 'bg-amber-100 text-amber-700'}`}>
                {on ? <ShieldCheck className="w-5 h-5" /> : <ShieldAlert className="w-5 h-5" />}
              </span>
              <div className="min-w-0">
                <div className={`text-sm font-semibold ${on ? 'text-emerald-900' : 'text-amber-900'}`}>
                  {on ? `Two-factor authentication is on (${on} method${on > 1 ? 's' : ''})` : 'Two-factor authentication is off'}
                </div>
                <p className={`text-sm mt-0.5 ${on ? 'text-emerald-800/80' : 'text-amber-800/80'}`}>
                  {on
                    ? 'Your account asks for a second step when signing in.'
                    : 'Set up a method below. We recommend an authenticator app — it works offline and is harder to intercept than email.'}
                </p>
              </div>
            </div>
          )
        })()}

        <SettingsSection title="Two-factor methods" description="Use one or both. You'll be asked for a code after your password." flush>
          <div className="grid grid-cols-1 md:grid-cols-2 md:divide-x divide-y md:divide-y-0 divide-gray-100">
            {[
              {
                key: 'auth',
                icon: Smartphone,
                title: 'Authenticator app',
                recommended: true,
                text: 'Codes from Google Authenticator, 1Password, Authy or similar.',
                enabled: auth?.user?.authenticator_2fa_enabled,
                allowed: settings.enable_authenticator_2fa,
                onSetup: openAuthenticatorSetup,
                onDisable: openDisableAuth,
              },
              {
                key: 'email',
                icon: Mail,
                title: 'Email codes',
                text: <>A 6-digit code sent to <span className="font-medium text-gray-700">{auth?.user?.email}</span>.</>,
                enabled: auth?.user?.email_2fa_enabled,
                allowed: settings.enable_email_2fa,
                onSetup: openEmailSetup,
                onDisable: openDisableEmail,
              },
            ].map((m) => (
              <div key={m.key} className="p-5 sm:p-6 flex flex-col">
                <div className="flex items-start gap-3">
                  <span className="w-10 h-10 rounded-xl bg-[#0B3D26]/[0.07] text-[#0B3D26] flex items-center justify-center flex-shrink-0">
                    <m.icon className="w-5 h-5" strokeWidth={1.75} />
                  </span>
                  <div className="min-w-0 flex-1">
                    <div className="flex flex-wrap items-center gap-2">
                      <h3 className="text-sm font-semibold text-gray-900">{m.title}</h3>
                      {m.recommended && <Badge tone="brand">Recommended</Badge>}
                    </div>
                    <p className="mt-1 text-sm text-gray-500">{m.text}</p>
                  </div>
                  {m.enabled ? <Badge tone="green" dot>On</Badge> : <Badge tone="gray">Off</Badge>}
                </div>
                <div className="mt-5 pt-4 border-t border-gray-100 flex flex-wrap items-center gap-3">
                  {m.enabled ? (
                    <button onClick={m.onDisable} className={btn.dangerOutline}>Turn off</button>
                  ) : (
                    <button onClick={m.onSetup} disabled={!m.allowed} className={btn.primary}>Set up</button>
                  )}
                  {!m.enabled && !m.allowed && (
                    <span className="text-xs text-amber-700">Disabled for this workspace</span>
                  )}
                </div>
              </div>
            ))}
          </div>
        </SettingsSection>

      {/* Email 2FA Setup Modal */}
      <Modal isOpen={showEmailSetup} onClose={() => setShowEmailSetup(false)} title="Set Up Email Authentication" size="sm">
        <div className="p-6">
          {emailStep === 1 ? (
            <div className="text-center">
              <div className="mx-auto w-16 h-16 rounded-full bg-blue-50 flex items-center justify-center mb-4">
                <Mail className="w-8 h-8 text-blue-600" />
              </div>
              <h3 className="text-lg font-semibold text-gray-900 mb-2">Verify Your Email</h3>
              <p className="text-sm text-gray-600 mb-6">
                We'll send a 6-digit verification code to<br />
                <span className="font-medium text-gray-900">{auth?.user?.email}</span>
              </p>
              <button
                onClick={sendEmailCode}
                disabled={sendingEmail}
                className="bg-[#0B3D26] hover:bg-[#14502F] text-white w-full py-3 rounded-lg font-medium transition-all flex items-center justify-center gap-2 disabled:opacity-50"
              >
                {sendingEmail && <Loader2 className="w-4 h-4 animate-spin" />}
                {sendingEmail ? 'Sending...' : 'Send Verification Code'}
              </button>
            </div>
          ) : (
            <div className="text-center">
              <div className="mx-auto w-16 h-16 rounded-full bg-blue-50 flex items-center justify-center mb-4">
                <Mail className="w-8 h-8 text-blue-600" />
              </div>
              <h3 className="text-lg font-semibold text-gray-900 mb-2">Enter Verification Code</h3>
              <p className="text-sm text-gray-600 mb-6">
                Enter the 6-digit code sent to your email
              </p>
              <div className="mb-6">
                <CodeInput code={emailCode} setCode={setEmailCode} idPrefix="email-code" />
              </div>
              <button
                onClick={verifyEmailCode}
                disabled={verifyingEmail || emailCode.join('').length !== 6}
                className="bg-[#0B3D26] hover:bg-[#14502F] text-white w-full py-3 rounded-lg font-medium transition-all flex items-center justify-center gap-2 disabled:opacity-50"
              >
                {verifyingEmail && <Loader2 className="w-4 h-4 animate-spin" />}
                {verifyingEmail ? 'Verifying...' : 'Verify & Enable'}
              </button>
              <button
                onClick={() => setEmailStep(1)}
                className="mt-3 text-sm text-[#0B3D26] hover:underline"
              >
                Didn't receive code? Send again
              </button>
            </div>
          )}
        </div>
      </Modal>

      {/* Authenticator Setup Modal */}
      <Modal isOpen={showAuthenticatorSetup} onClose={() => setShowAuthenticatorSetup(false)} title="Set Up Authenticator App" size="md">
        <div className="p-6">
          {authenticatorStep === 0 ? (
            <div>
              <div className="mx-auto w-16 h-16 rounded-full bg-purple-50 flex items-center justify-center mb-4">
                <Smartphone className="w-8 h-8 text-[#0B3D26]" />
              </div>
              <h3 className="text-lg font-semibold text-gray-900 mb-2 text-center">Protect sign-in with an authenticator app</h3>
              <p className="text-sm text-gray-600 mb-5 text-center">
                An authenticator app generates a fresh 6-digit code on your phone every 30 seconds. You enter it after your password, so a leaked password alone can't get anyone into your account. It works offline.
              </p>

              <div className="rounded-xl border border-gray-200 bg-gray-50 p-4 mb-4">
                <p className="text-xs font-semibold uppercase tracking-wide text-gray-500 mb-3">How setup works</p>
                <ol className="space-y-3 text-sm text-gray-700">
                  {[
                    'Install an authenticator app on your phone (see below).',
                    'Scan the QR code we show you, or type in the setup key.',
                    'Enter the 6-digit code from the app to confirm and turn it on.',
                  ].map((s, i) => (
                    <li key={i} className="flex items-start gap-3">
                      <span className="w-6 h-6 rounded-full bg-[#0B3D26] text-white text-xs font-semibold inline-flex items-center justify-center flex-shrink-0">{i + 1}</span>
                      <span className="pt-0.5">{s}</span>
                    </li>
                  ))}
                </ol>
              </div>

              <div className="mb-6">
                <p className="text-xs font-semibold uppercase tracking-wide text-gray-500 mb-2">Apps you can use</p>
                <div className="flex flex-wrap gap-2">
                  {['Google Authenticator', 'Microsoft Authenticator', 'Authy', '1Password', 'Bitwarden'].map((a) => (
                    <span key={a} className="px-2.5 py-1 rounded-full border border-gray-200 bg-white text-xs font-medium text-gray-700">{a}</span>
                  ))}
                </div>
              </div>

              <button
                onClick={continueAuthenticatorSetup}
                className="bg-[#0B3D26] hover:bg-[#14502F] text-white w-full py-3 rounded-lg font-medium transition-all"
              >
                Continue
              </button>
            </div>
          ) : loadingQR ? (
            <div className="text-center animate-pulse" role="status" aria-label="Generating QR code">
              <div className="mx-auto w-16 h-16 rounded-full bg-gray-200 mb-4" />
              <div className="h-5 w-40 bg-gray-200 rounded mx-auto mb-2" />
              <div className="h-4 w-64 max-w-full bg-gray-200 rounded mx-auto mb-4" />
              <div className="bg-white p-4 rounded-xl border-2 border-gray-200 inline-block mb-4">
                <div className="w-48 h-48 bg-gray-200 rounded" />
              </div>
              <div className="mb-6">
                <div className="h-3 w-44 bg-gray-200 rounded mx-auto mb-2" />
                <div className="h-9 w-56 bg-gray-200 rounded-lg mx-auto" />
              </div>
              <div className="h-12 w-full bg-gray-200 rounded-lg" />
            </div>
          ) : authenticatorStep === 1 ? (
            <div className="text-center">
              <div className="mx-auto w-16 h-16 rounded-full bg-purple-50 flex items-center justify-center mb-4">
                <Smartphone className="w-8 h-8 text-[#0B3D26]" />
              </div>
              <h3 className="text-lg font-semibold text-gray-900 mb-2">Scan QR Code</h3>
              <p className="text-sm text-gray-600 mb-4">
                Scan this QR code with your authenticator app
              </p>
              
              {/* QR Code */}
              <div className="bg-white p-4 rounded-xl border-2 border-gray-200 inline-block mb-4">
                {qrCode ? (
                  <img src={qrCode} alt="QR Code" className="w-48 h-48" />
                ) : (
                  <div className="w-48 h-48 bg-gray-100 rounded flex items-center justify-center">
                    <p className="text-sm text-gray-500">QR Code</p>
                  </div>
                )}
              </div>

              {/* Secret Key */}
              <div className="mb-6">
                <p className="text-xs text-gray-500 mb-2">Or enter this key manually:</p>
                <div className="flex items-center justify-center gap-2">
                  <code className="px-3 py-2 bg-gray-100 rounded-lg text-sm font-mono tracking-wider">
                    {secretKey || 'XXXX XXXX XXXX XXXX'}
                  </code>
                  <button
                    onClick={copySecretKey}
                    className="p-2 text-gray-500 hover:text-[#0B3D26] transition-colors"
                    title="Copy secret key"
                  >
                    {copiedSecret ? <Check className="w-4 h-4 text-green-600" /> : <Copy className="w-4 h-4" />}
                  </button>
                </div>
              </div>

              <button
                onClick={() => setAuthenticatorStep(2)}
                className="bg-[#0B3D26] hover:bg-[#14502F] text-white w-full py-3 rounded-lg font-medium transition-all"
              >
                I've Scanned the Code
              </button>
            </div>
          ) : (
            <div className="text-center">
              <div className="mx-auto w-16 h-16 rounded-full bg-purple-50 flex items-center justify-center mb-4">
                <Smartphone className="w-8 h-8 text-[#0B3D26]" />
              </div>
              <h3 className="text-lg font-semibold text-gray-900 mb-2">Verify Setup</h3>
              <p className="text-sm text-gray-600 mb-6">
                Enter the 6-digit code from your authenticator app
              </p>
              <div className="mb-6">
                <CodeInput code={authenticatorCode} setCode={setAuthenticatorCode} idPrefix="auth-code" />
              </div>
              <button
                onClick={verifyAuthenticatorCode}
                disabled={verifyingAuth || authenticatorCode.join('').length !== 6}
                className="bg-[#0B3D26] hover:bg-[#14502F] text-white w-full py-3 rounded-lg font-medium transition-all flex items-center justify-center gap-2 disabled:opacity-50"
              >
                {verifyingAuth && <Loader2 className="w-4 h-4 animate-spin" />}
                {verifyingAuth ? 'Verifying...' : 'Verify & Enable'}
              </button>
              <button
                onClick={() => setAuthenticatorStep(1)}
                className="mt-3 text-sm text-[#0B3D26] hover:underline"
              >
                Back to QR code
              </button>
            </div>
          )}
        </div>
      </Modal>

      {/* Disable Email 2FA Modal */}
      <Modal 
        isOpen={showDisableEmail} 
        onClose={() => {
          setShowDisableEmail(false);
          setDisableStep(1);
          setDisableCode(['', '', '', '', '', '']);
        }}
        maxWidth="max-w-md"
      >
        <div className="p-6">
          {disableStep === 1 ? (
            <div className="text-center">
              <div className="mx-auto w-16 h-16 rounded-full bg-red-50 flex items-center justify-center mb-4">
                <ShieldX className="w-8 h-8 text-red-600" />
              </div>
              <h3 className="text-lg font-semibold text-gray-900 mb-2">Disable Email 2FA</h3>
              <p className="text-sm text-gray-600 mb-6">
                This will remove email two-factor authentication from your account. 
                We'll send a confirmation code to your email.
              </p>
              <div className="bg-amber-50 border border-amber-200 rounded-lg p-3 mb-6">
                <p className="text-sm text-amber-800">
                  <strong>Warning:</strong> Disabling 2FA will make your account less secure.
                </p>
              </div>
              <button
                onClick={() => sendDisableCode('email')}
                disabled={sendingDisableCode}
                className={`bg-red-600 hover:bg-red-700 text-white w-full py-3 rounded-lg font-medium transition-all flex items-center justify-center gap-2 disabled:opacity-50`}
              >
                {sendingDisableCode && <Loader2 className="w-4 h-4 animate-spin" />}
                {sendingDisableCode ? 'Sending...' : 'Send Confirmation Code'}
              </button>
              <button
                onClick={() => setShowDisableEmail(false)}
                className="mt-3 text-sm text-gray-500 hover:text-gray-700"
              >
                Cancel
              </button>
            </div>
          ) : (
            <div className="text-center">
              <div className="mx-auto w-16 h-16 rounded-full bg-red-50 flex items-center justify-center mb-4">
                <Mail className="w-8 h-8 text-red-600" />
              </div>
              <h3 className="text-lg font-semibold text-gray-900 mb-2">Enter Confirmation Code</h3>
              <p className="text-sm text-gray-600 mb-6">
                Enter the 6-digit code we sent to your email
              </p>
              <div className="mb-6">
                <CodeInput code={disableCode} setCode={setDisableCode} idPrefix="disable-email-code" />
              </div>
              <button
                onClick={() => verifyDisableCode('email')}
                disabled={verifyingDisable || disableCode.join('').length !== 6}
                className={`bg-red-600 hover:bg-red-700 text-white w-full py-3 rounded-lg font-medium transition-all flex items-center justify-center gap-2 disabled:opacity-50`}
              >
                {verifyingDisable && <Loader2 className="w-4 h-4 animate-spin" />}
                {verifyingDisable ? 'Disabling...' : 'Disable Email 2FA'}
              </button>
              <button
                onClick={() => setDisableStep(1)}
                className="mt-3 text-sm text-gray-500 hover:text-gray-700"
              >
                Back
              </button>
            </div>
          )}
        </div>
      </Modal>

      {/* Disable Authenticator 2FA Modal */}
      <Modal 
        isOpen={showDisableAuth} 
        onClose={() => {
          setShowDisableAuth(false);
          setDisableStep(1);
          setDisableCode(['', '', '', '', '', '']);
        }}
        maxWidth="max-w-md"
      >
        <div className="p-6">
          {disableStep === 1 ? (
            <div className="text-center">
              <div className="mx-auto w-16 h-16 rounded-full bg-red-50 flex items-center justify-center mb-4">
                <ShieldX className="w-8 h-8 text-red-600" />
              </div>
              <h3 className="text-lg font-semibold text-gray-900 mb-2">Disable Authenticator 2FA</h3>
              <p className="text-sm text-gray-600 mb-6">
                This will remove authenticator app two-factor authentication from your account.
                We'll send a confirmation code to your email.
              </p>
              <div className="bg-amber-50 border border-amber-200 rounded-lg p-3 mb-6">
                <p className="text-sm text-amber-800">
                  <strong>Warning:</strong> Disabling 2FA will make your account less secure.
                </p>
              </div>
              <button
                onClick={() => sendDisableCode('authenticator')}
                disabled={sendingDisableCode}
                className={`bg-red-600 hover:bg-red-700 text-white w-full py-3 rounded-lg font-medium transition-all flex items-center justify-center gap-2 disabled:opacity-50`}
              >
                {sendingDisableCode && <Loader2 className="w-4 h-4 animate-spin" />}
                {sendingDisableCode ? 'Sending...' : 'Send Confirmation Code'}
              </button>
              <button
                onClick={() => setShowDisableAuth(false)}
                className="mt-3 text-sm text-gray-500 hover:text-gray-700"
              >
                Cancel
              </button>
            </div>
          ) : (
            <div className="text-center">
              <div className="mx-auto w-16 h-16 rounded-full bg-red-50 flex items-center justify-center mb-4">
                <Mail className="w-8 h-8 text-red-600" />
              </div>
              <h3 className="text-lg font-semibold text-gray-900 mb-2">Enter Confirmation Code</h3>
              <p className="text-sm text-gray-600 mb-6">
                Enter the 6-digit code we sent to your email
              </p>
              <div className="mb-6">
                <CodeInput code={disableCode} setCode={setDisableCode} idPrefix="disable-auth-code" />
              </div>
              <button
                onClick={() => verifyDisableCode('authenticator')}
                disabled={verifyingDisable || disableCode.join('').length !== 6}
                className={`bg-red-600 hover:bg-red-700 text-white w-full py-3 rounded-lg font-medium transition-all flex items-center justify-center gap-2 disabled:opacity-50`}
              >
                {verifyingDisable && <Loader2 className="w-4 h-4 animate-spin" />}
                {verifyingDisable ? 'Disabling...' : 'Disable Authenticator 2FA'}
              </button>
              <button
                onClick={() => setDisableStep(1)}
                className="mt-3 text-sm text-gray-500 hover:text-gray-700"
              >
                Back
              </button>
            </div>
          )}
        </div>
      </Modal>
      </SettingsPage>
    </>
  );
}
