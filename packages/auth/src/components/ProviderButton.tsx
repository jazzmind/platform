'use client'; // This directive makes it a Client Component

import { signIn as nextAuthSignIn } from "next-auth/react"; // Renamed to avoid conflict 
import { signIn as webAuthnSignIn } from "next-auth/webauthn";

interface ProviderButtonProps {
  providerId: string;
  label: string;
  isPasskey?: boolean;
  redirectTo?: string;
}

export default function ProviderButton({ 
  providerId, 
  label, 
  isPasskey = false, 
  redirectTo = "/profile" 
}: ProviderButtonProps) {
  const handleSignIn = async () => {
    if (isPasskey) {
      await webAuthnSignIn("passkey", { redirectTo });
    } else {
      // For other providers, nextAuthSignIn from next-auth/react is usually for client-side initiation
      // However, our previous server action approach is also valid. 
      // For simplicity in a client component, using nextAuthSignIn from 'next-auth/react' directly is cleaner.
      await nextAuthSignIn(providerId, { callbackUrl: redirectTo });
    }
  };

  // If using server actions for non-Passkey buttons, the form structure from previous version was fine.
  // This version uses client-side signIn for all, which is common for a sign-in UI component.
  if (!isPasskey) {
    // Standard OAuth/Email button using next-auth/react's signIn
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
          cursor: 'pointer'
        }}
      >
        Sign in with {label}
      </button>
    );
  } else {
    // Passkey button
    return (
      <button 
        type="button" 
        onClick={handleSignIn} // Already correctly calls webAuthnSignIn via handleSignIn
        style={{ 
          display: 'block', 
          width: '100%', 
          padding: '10px', 
          marginBottom: '10px', 
          border: '1px solid #ccc',
          borderRadius: '5px',
          cursor: 'pointer'
        }}
      >
        {label}
      </button>
    );
  }
} 