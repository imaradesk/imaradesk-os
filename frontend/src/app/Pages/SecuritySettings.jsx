import React, { useState } from 'react';
import { Head } from '@inertiajs/react';
import AppShell from '../components/AppShell';
import SettingsSidenav from '../components/SettingsSidenav';
import Modal from '../components/Modal';
import toast from 'react-hot-toast';
import { Mail, Smartphone, Shield, ShieldCheck, ShieldAlert, ShieldX, Copy, Check, Loader2 } from 'lucide-react';

export default function SecuritySettings({ auth, security_settings: initialSettings }) {
  const [settings, setSettings] = useState(initialSettings);
  const [isSaving, setIsSaving] = useState(false);
  
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

  const handleToggle = (field) => {
    setSettings(prev => ({
      ...prev,
      [field]: !prev[field]
    }));
  };

  const handleSave = async () => {
    setIsSaving(true);
    try {
      const response = await fetch('/settings/security/update/', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'X-CSRFToken': window.csrfToken || '',
        },
        body: JSON.stringify(settings)
      });

      const data = await response.json();

      if (data.success) {
        toast.success('Security settings saved successfully');
      } else {
        toast.error(data.message || 'Failed to save settings');
      }
    } catch (error) {
      toast.error('An error occurred while saving settings');
    } finally {
      setIsSaving(false);
    }
  };

  // Email 2FA Functions
  const openEmailSetup = () => {
    setShowEmailSetup(true);
    setEmailStep(1);
    setEmailCode(['', '', '', '', '', '']);
  };

  const sendEmailCode = async () => {
    setSendingEmail(true);
    try {
      const response = await fetch('/settings/security/2fa/email/send/', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'X-CSRFToken': window.csrfToken || '',
        },
      });

      const data = await response.json();
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
      const response = await fetch('/settings/security/2fa/email/verify/', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'X-CSRFToken': window.csrfToken || '',
        },
        body: JSON.stringify({ code })
      });

      const data = await response.json();
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
  const openAuthenticatorSetup = async () => {
    setShowAuthenticatorSetup(true);
    setAuthenticatorStep(1);
    setAuthenticatorCode(['', '', '', '', '', '']);
    setLoadingQR(true);

    try {
      const response = await fetch('/settings/security/2fa/authenticator/setup/', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'X-CSRFToken': window.csrfToken || '',
        },
      });

      const data = await response.json();
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
      const response = await fetch('/settings/security/2fa/authenticator/verify/', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'X-CSRFToken': window.csrfToken || '',
        },
        body: JSON.stringify({ code })
      });

      const data = await response.json();
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
      const response = await fetch('/settings/security/2fa/disable/send/', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'X-CSRFToken': window.csrfToken || '',
        },
        body: JSON.stringify({ method })
      });

      const data = await response.json();
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
      ? '/settings/security/2fa/email/disable/' 
      : '/settings/security/2fa/authenticator/disable/';

    try {
      const response = await fetch(endpoint, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'X-CSRFToken': window.csrfToken || '',
        },
        body: JSON.stringify({ code })
      });

      const data = await response.json();
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

  // Toggle Component
  const Toggle = ({ label, name, description }) => (
    <div className="flex items-start justify-between py-3">
      <div className="flex-1">
        <label className="text-sm font-medium text-gray-700 block">{label}</label>
        {description && <p className="text-xs text-gray-500 mt-1">{description}</p>}
      </div>
      <button
        type="button"
        onClick={() => handleToggle(name)}
        className={`relative inline-flex h-6 w-11 items-center rounded-full transition-colors focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-[#4a154b] ${
          settings[name] ? 'bg-[#4a154b]' : 'bg-gray-200'
        }`}
      >
        <span
          className={`inline-block h-4 w-4 transform rounded-full bg-white transition-transform ${
            settings[name] ? 'translate-x-6' : 'translate-x-1'
          }`}
        />
      </button>
    </div>
  );

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
          className="w-12 h-14 text-center text-2xl font-semibold border-2 border-gray-300 rounded-lg focus:border-[#4a154b] focus:ring-2 focus:ring-[#4a154b]/20 outline-none transition-all"
        />
      ))}
    </div>
  );

  return (
    <>
      <Head title="Security Settings" />
      <AppShell auth={auth}>
        <div className="flex flex-1 min-h-[calc(100vh-3rem)]">
          <SettingsSidenav activeSection="security" />
          
          <main className="flex-1 bg-gray-50">
            {/* Header */}
            <div className="bg-white border-b border-gray-200 px-6 py-4 flex items-center justify-between">
              <div className="flex items-center gap-3">
                <Shield className="w-5 h-5 text-[#4a154b]" />
                <h1 className="text-xl font-semibold text-gray-800">Two-Factor Authentication</h1>
              </div>
              <button
                onClick={handleSave}
                disabled={isSaving}
                className="bg-[#4a154b] hover:bg-[#5a235c] text-white px-4 py-2 rounded-lg text-sm font-medium transition-all flex items-center gap-2 disabled:opacity-50 disabled:cursor-not-allowed"
              >
                {isSaving && <Loader2 className="w-4 h-4 animate-spin" />}
                {isSaving ? 'Saving...' : 'Save Changes'}
              </button>
            </div>

            <div className="p-6">
              {/* Info Box */}
              <div className="mb-6 bg-blue-50 border-l-4 border-blue-500 p-4 rounded-r-lg">
                <div className="flex items-start">
                  <svg xmlns="http://www.w3.org/2000/svg" className="h-6 w-6 text-blue-500 mr-3 flex-shrink-0" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13 16h-1v-4h-1m1-4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
                  </svg>
                  <div>
                    <h3 className="text-sm font-semibold text-blue-900 mb-1">Why Enable Two-Factor Authentication?</h3>
                    <p className="text-sm text-blue-800 leading-relaxed">
                      <strong>Two-Factor Authentication (2FA)</strong> adds an essential layer of security to your account by requiring a second verification step beyond your password. This helps you:
                    </p>
                    <ul className="mt-2 ml-4 text-sm text-blue-800 space-y-1 list-disc">
                      <li><strong>Prevent unauthorized access</strong> — Even if your password is compromised, attackers cannot access your account without the second factor</li>
                      <li><strong>Protect sensitive data</strong> — Keep your tickets, customer information, and settings secure from breaches</li>
                      <li><strong>Meet compliance requirements</strong> — Many security standards require multi-factor authentication for sensitive systems</li>
                      <li><strong>Peace of mind</strong> — Know that your account has industry-standard protection</li>
                    </ul>
                    <p className="text-sm text-blue-800 mt-2">
                      <strong>Tip:</strong> For the best security, we recommend enabling the <em>Authenticator App</em> method as it's more secure than email-based codes.
                    </p>
                  </div>
                </div>
              </div>

              {/* 2FA Methods Grid */}
              <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
                {/* Email 2FA */}
                <div className="bg-white rounded-xl shadow-sm border border-gray-200 overflow-hidden">
                  <div className="p-6">
                    <div className="flex items-start gap-4">
                      <div className="p-3 rounded-xl bg-blue-50">
                        <Mail className="w-6 h-6 text-blue-600" />
                      </div>
                      <div className="flex-1">
                        <div className="flex items-center justify-between">
                          <h3 className="text-lg font-semibold text-gray-900">Email Authentication</h3>
                          {auth?.user?.email_2fa_enabled ? (
                            <span className="flex items-center gap-1.5 px-3 py-1 bg-green-50 text-green-700 text-sm font-medium rounded-full">
                              <ShieldCheck className="w-4 h-4" />
                              Enabled
                            </span>
                          ) : (
                            <span className="flex items-center gap-1.5 px-3 py-1 bg-gray-100 text-gray-600 text-sm font-medium rounded-full">
                              <ShieldAlert className="w-4 h-4" />
                              Not Set Up
                            </span>
                          )}
                        </div>
                        <p className="text-sm text-gray-600 mt-2">
                          Receive a verification code via email when signing in
                        </p>
                        
                        <div className="mt-4 pt-4 border-t border-gray-100">
                          {auth?.user?.email_2fa_enabled ? (
                            <button
                              onClick={openDisableEmail}
                              className="border-2 border-red-500 text-red-500 hover:bg-red-500 hover:text-white px-4 py-2 rounded-lg text-sm font-medium transition-all"
                            >
                              Disable Email 2FA
                            </button>
                          ) : (
                            <button
                              onClick={openEmailSetup}
                              disabled={!settings.enable_email_2fa}
                              className="bg-[#4a154b] hover:bg-[#5a235c] text-white px-4 py-2 rounded-lg text-sm font-medium transition-all disabled:opacity-50 disabled:cursor-not-allowed"
                            >
                              Set Up Email 2FA
                            </button>
                          )}
                          {!settings.enable_email_2fa && (
                            <p className="text-xs text-amber-600 mt-2">Email 2FA is currently disabled in settings</p>
                          )}
                        </div>
                      </div>
                    </div>
                  </div>
                </div>

                {/* Authenticator App 2FA */}
                <div className="bg-white rounded-xl shadow-sm border border-gray-200 overflow-hidden">
                  <div className="p-6">
                    <div className="flex items-start gap-4">
                      <div className="p-3 rounded-xl bg-purple-50">
                        <Smartphone className="w-6 h-6 text-[#4a154b]" />
                      </div>
                      <div className="flex-1">
                        <div className="flex items-center justify-between">
                          <h3 className="text-lg font-semibold text-gray-900">Authenticator App</h3>
                          {auth?.user?.authenticator_2fa_enabled ? (
                            <span className="flex items-center gap-1.5 px-3 py-1 bg-green-50 text-green-700 text-sm font-medium rounded-full">
                              <ShieldCheck className="w-4 h-4" />
                              Enabled
                            </span>
                          ) : (
                            <span className="flex items-center gap-1.5 px-3 py-1 bg-gray-100 text-gray-600 text-sm font-medium rounded-full">
                              <ShieldAlert className="w-4 h-4" />
                              Not Set Up
                            </span>
                          )}
                        </div>
                        <p className="text-sm text-gray-600 mt-2">
                          Use an authenticator app like Google Authenticator or Authy
                        </p>
                        
                        <div className="mt-4 pt-4 border-t border-gray-100">
                          {auth?.user?.authenticator_2fa_enabled ? (
                            <button
                              onClick={openDisableAuth}
                              className="border-2 border-red-500 text-red-500 hover:bg-red-500 hover:text-white px-4 py-2 rounded-lg text-sm font-medium transition-all"
                            >
                              Disable Authenticator
                            </button>
                          ) : (
                            <button
                              onClick={openAuthenticatorSetup}
                              disabled={!settings.enable_authenticator_2fa}
                              className="bg-[#4a154b] hover:bg-[#5a235c] text-white px-4 py-2 rounded-lg text-sm font-medium transition-all disabled:opacity-50 disabled:cursor-not-allowed"
                            >
                              Set Up Authenticator
                            </button>
                          )}
                          {!settings.enable_authenticator_2fa && (
                            <p className="text-xs text-amber-600 mt-2">Authenticator 2FA is currently disabled in settings</p>
                          )}
                        </div>
                      </div>
                    </div>
                  </div>
                </div>
              </div>
            </div>
          </main>
        </div>
      </AppShell>

      {/* Email 2FA Setup Modal */}
      <Modal isOpen={showEmailSetup} onClose={() => setShowEmailSetup(false)} title="Set Up Email Authentication">
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
                className="bg-[#4a154b] hover:bg-[#5a235c] text-white w-full py-3 rounded-lg font-medium transition-all flex items-center justify-center gap-2 disabled:opacity-50"
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
                className="bg-[#4a154b] hover:bg-[#5a235c] text-white w-full py-3 rounded-lg font-medium transition-all flex items-center justify-center gap-2 disabled:opacity-50"
              >
                {verifyingEmail && <Loader2 className="w-4 h-4 animate-spin" />}
                {verifyingEmail ? 'Verifying...' : 'Verify & Enable'}
              </button>
              <button
                onClick={() => setEmailStep(1)}
                className="mt-3 text-sm text-[#4a154b] hover:underline"
              >
                Didn't receive code? Send again
              </button>
            </div>
          )}
        </div>
      </Modal>

      {/* Authenticator Setup Modal */}
      <Modal isOpen={showAuthenticatorSetup} onClose={() => setShowAuthenticatorSetup(false)} title="Set Up Authenticator App">
        <div className="p-6">
          {loadingQR ? (
            <div className="text-center py-8">
              <Loader2 className="w-8 h-8 animate-spin mx-auto text-[#4a154b]" />
              <p className="text-sm text-gray-600 mt-3">Generating QR code...</p>
            </div>
          ) : authenticatorStep === 1 ? (
            <div className="text-center">
              <div className="mx-auto w-16 h-16 rounded-full bg-purple-50 flex items-center justify-center mb-4">
                <Smartphone className="w-8 h-8 text-[#4a154b]" />
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
                    className="p-2 text-gray-500 hover:text-[#4a154b] transition-colors"
                    title="Copy secret key"
                  >
                    {copiedSecret ? <Check className="w-4 h-4 text-green-600" /> : <Copy className="w-4 h-4" />}
                  </button>
                </div>
              </div>

              <button
                onClick={() => setAuthenticatorStep(2)}
                className="bg-[#4a154b] hover:bg-[#5a235c] text-white w-full py-3 rounded-lg font-medium transition-all"
              >
                I've Scanned the Code
              </button>
            </div>
          ) : (
            <div className="text-center">
              <div className="mx-auto w-16 h-16 rounded-full bg-purple-50 flex items-center justify-center mb-4">
                <Smartphone className="w-8 h-8 text-[#4a154b]" />
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
                className="bg-[#4a154b] hover:bg-[#5a235c] text-white w-full py-3 rounded-lg font-medium transition-all flex items-center justify-center gap-2 disabled:opacity-50"
              >
                {verifyingAuth && <Loader2 className="w-4 h-4 animate-spin" />}
                {verifyingAuth ? 'Verifying...' : 'Verify & Enable'}
              </button>
              <button
                onClick={() => setAuthenticatorStep(1)}
                className="mt-3 text-sm text-[#4a154b] hover:underline"
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
    </>
  );
}
