// lib/webauthnConfig.ts
export const rpName = process.env.COMPANY_NAME;
export const rpID = process.env.WEBAUTHN_RP_ID || 'default-rp-id'; // The domain of your application
export const rpOrigin = process.env.WEBAUTHN_RP_ORIGIN || `https://${rpID}`;
