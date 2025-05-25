// WebAuthn type declarations
interface AuthenticatorAttestationResponse extends AuthenticatorResponse {
  readonly attestationObject: ArrayBuffer;
}

interface AuthenticatorAssertionResponse extends AuthenticatorResponse {
  readonly authenticatorData: ArrayBuffer;
  readonly signature: ArrayBuffer;
  readonly userHandle: ArrayBuffer | null;
}

interface AuthenticatorResponse {
  readonly clientDataJSON: ArrayBuffer;
}

interface PublicKeyCredential extends Credential {
  readonly rawId: ArrayBuffer;
  readonly response: AuthenticatorAttestationResponse | AuthenticatorAssertionResponse;
  getClientExtensionResults(): AuthenticationExtensionsClientOutputs;
}

interface AuthenticationExtensionsClientOutputs {
  [key: string]: any;
}

declare global {
  interface Window {
    PublicKeyCredential: {
      new(): PublicKeyCredential;
      isUserVerifyingPlatformAuthenticatorAvailable(): Promise<boolean>;
    };
  }
} 