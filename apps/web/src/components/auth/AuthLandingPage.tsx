import React, { useEffect, useState } from 'react';
import { AlertTriangle, Check, Key, Shield, Sparkles, Zap } from 'lucide-react';
import {
  formatAccountId,
  generateAccountUuid,
  hashCredentials,
  hashPhrase,
  saveVaultSession,
  VaultSession,
} from '../../auth/crypto';
import { loginAccountOnEdge, registerAccountOnEdge } from '../../auth/syncService';
import { CreateAccountView } from './CreateAccountView';
import { RestoreAccountView } from './RestoreAccountView';

interface AuthLandingPageProps {
  onLoginSuccess: (session: VaultSession) => void;
  prefilledUuid?: string;
}

export const AuthLandingPage: React.FC<AuthLandingPageProps> = ({
  onLoginSuccess,
  prefilledUuid,
}) => {
  const [activeTab, setActiveTab] = useState<'create' | 'restore'>('create');
  const [accountUuid, setAccountUuid] = useState('');
  const [errorMessage, setErrorMessage] = useState('');
  const [successMessage, setSuccessMessage] = useState('');
  const [isProcessing, setIsProcessing] = useState(false);

  useEffect(() => {
    if (prefilledUuid) {
      setActiveTab('restore');
    }
  }, [prefilledUuid]);

  useEffect(() => {
    if (!accountUuid) {
      setAccountUuid(generateAccountUuid());
    }
  }, [accountUuid]);

  const handleRegenerate = () => {
    setAccountUuid(generateAccountUuid());
    setErrorMessage('');
    setSuccessMessage('');
  };

  // 1. Create Account Flow
  const handleConfirmCreate = async (password: string, backedUpChecked: boolean) => {
    if (!backedUpChecked) {
      setErrorMessage('Please confirm you have saved your Account UUID and Password.');
      return;
    }

    setIsProcessing(true);
    setErrorMessage('');
    try {
      const passwordHash = await hashCredentials(accountUuid, password);
      await registerAccountOnEdge(accountUuid, passwordHash);
      const now = Date.now();
      saveVaultSession(accountUuid, undefined, now);

      const session: VaultSession = {
        userId: accountUuid,
        accountTag: formatAccountId(accountUuid),
        createdAt: now,
        lastAccessedAt: now,
      };

      onLoginSuccess(session);
    } catch {
      setErrorMessage('Failed to initialize account vault. Please try again.');
    } finally {
      setIsProcessing(false);
    }
  };

  // 2. Restore / Log In Flow
  const handleRestoreSubmit = async (identifier: string, password?: string) => {
    setErrorMessage('');
    setSuccessMessage('');
    setIsProcessing(true);

    try {
      if (password) {
        const cleanUuid = identifier.trim().toLowerCase();
        const passwordHash = await hashCredentials(cleanUuid, password);
        const ok = await loginAccountOnEdge(cleanUuid, passwordHash);
        if (!ok) {
          setErrorMessage('Invalid Account UUID or incorrect password.');
          setIsProcessing(false);
          return;
        }

        const now = Date.now();
        saveVaultSession(cleanUuid, undefined, now);

        const session: VaultSession = {
          userId: cleanUuid,
          accountTag: formatAccountId(cleanUuid),
          createdAt: now,
          lastAccessedAt: now,
        };

        onLoginSuccess(session);
      } else {
        // Legacy 12-word mnemonic
        const clean = identifier.trim().toLowerCase().replace(/\s+/g, ' ');
        const userId = await hashPhrase(clean);
        await loginAccountOnEdge(clean);
        const now = Date.now();
        saveVaultSession(userId, clean, now);

        const words = clean.split(' ');
        const session: VaultSession = {
          userId,
          accountTag: formatAccountId(userId),
          phraseSnippet: `${words[0]} ... ${words[11]}`,
          createdAt: now,
          lastAccessedAt: now,
        };

        onLoginSuccess(session);
      }
    } catch {
      setErrorMessage('Authentication verification failed.');
    } finally {
      setIsProcessing(false);
    }
  };

  // 3. Quick Demo Vault (1-click testing)
  const handleQuickDemo = async () => {
    setIsProcessing(true);
    setErrorMessage('');
    try {
      const demoUuid = generateAccountUuid();
      const demoPass = 'mojolog2026';
      const passwordHash = await hashCredentials(demoUuid, demoPass);
      await registerAccountOnEdge(demoUuid, passwordHash);
      const now = Date.now();
      saveVaultSession(demoUuid, undefined, now);

      const session: VaultSession = {
        userId: demoUuid,
        accountTag: formatAccountId(demoUuid),
        createdAt: now,
        lastAccessedAt: now,
      };

      onLoginSuccess(session);
    } catch {
      setErrorMessage('Could not launch demo vault.');
    } finally {
      setIsProcessing(false);
    }
  };

  return (
    <div className="auth-landing-root">
      <div className="auth-landing-card">
        {/* Brand Header */}
        <div className="auth-landing-header">
          <div className="auth-landing-badge">
            <span className="auth-landing-logo">✈️</span>
            <span className="auth-landing-brand">roammate</span>
          </div>
          <h1 className="auth-landing-title">Private Travel Itineraries</h1>
          <p className="auth-landing-subtitle">
            Sign in with your secret <strong>Account UUID</strong> and <strong>Password</strong> to access your trips, or create a new vault.
          </p>
        </div>

        {/* Tab Switcher */}
        <div className="auth-tabs mb-4">
          <button
            type="button"
            className={`auth-tab-pill ${activeTab === 'create' ? 'active' : ''}`}
            onClick={() => {
              setActiveTab('create');
              setErrorMessage('');
              setSuccessMessage('');
            }}
          >
            <Sparkles size={14} />
            <span>Create Account</span>
          </button>
          <button
            type="button"
            className={`auth-tab-pill ${activeTab === 'restore' ? 'active' : ''}`}
            onClick={() => {
              setActiveTab('restore');
              setErrorMessage('');
              setSuccessMessage('');
            }}
          >
            <Key size={14} />
            <span>Log In / Restore</span>
          </button>
        </div>

        {errorMessage && (
          <div className="auth-error-banner mb-3">
            <AlertTriangle size={15} />
            <span>{errorMessage}</span>
          </div>
        )}

        {successMessage && (
          <div className="auth-success-banner mb-3">
            <Check size={15} />
            <span>{successMessage}</span>
          </div>
        )}

        {/* Tab Forms */}
        {activeTab === 'create' ? (
          <CreateAccountView
            accountUuid={accountUuid}
            isProcessing={isProcessing}
            onRegenerateUuid={handleRegenerate}
            onSubmit={handleConfirmCreate}
          />
        ) : (
          <RestoreAccountView
            isProcessing={isProcessing}
            prefilledUuid={prefilledUuid}
            onSubmit={handleRestoreSubmit}
          />
        )}

        {/* Quick Demo Option */}
        <div className="auth-landing-footer">
          <div className="auth-landing-divider">
            <span>or explore without setup</span>
          </div>
          <button
            type="button"
            className="auth-demo-btn"
            onClick={handleQuickDemo}
            disabled={isProcessing}
          >
            <Zap size={14} className="text-amber" />
            <span>Launch Quick Demo Vault (1-Click)</span>
          </button>
          <p className="auth-policy-note">
            <Shield size={12} className="text-slate" />
            <span>Zero personal data collected · 90-day inactivity pruning policy</span>
          </p>
        </div>
      </div>
    </div>
  );
};
