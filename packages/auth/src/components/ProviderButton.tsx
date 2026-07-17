'use client';

import { authClient } from '../client';

interface ProviderButtonProps {
  providerId: 'google' | 'apple' | 'microsoft' | 'passkey';
  label: string;
  isPasskey?: boolean;
  redirectTo?: string;
}

export default function ProviderButton({
  providerId,
  label,
  isPasskey = false,
  redirectTo = '/profile',
}: ProviderButtonProps) {
  const handleSignIn = async () => {
    if (isPasskey || providerId === 'passkey') {
      await authClient.signIn.passkey({
        fetchOptions: {
          onSuccess: () => {
            if (typeof window !== 'undefined') window.location.href = redirectTo;
          },
        },
      });
      return;
    }
    await authClient.signIn.social({
      provider: providerId,
      callbackURL: redirectTo,
    });
  };

  return (
    <button
      type="button"
      onClick={handleSignIn}
      style={{
        display: 'block',
        width: '100%',
        padding: '10px',
        marginBottom: '10px',
        border: '1px solid #ccc',
        borderRadius: '5px',
        cursor: 'pointer',
      }}
    >
      {isPasskey ? label : `Sign in with ${label}`}
    </button>
  );
}
