/**
 * authPolicies.ts
 * 
 * Configuration for Microsoft Entra ID (Azure AD B2C) policies and tenant settings
 * Defines user flows, scopes, and authentication request creation
 */

import { PopupRequest } from '@azure/msal-browser';

/**
 * Tenant configuration
 */
export const tenantConfig = {
  name: 'quodsidevb2c',
  domain: 'quodsidevb2c.onmicrosoft.com',
  authorityDomain: 'quodsidevb2c.b2clogin.com',
  clientId: '71597220-4889-4c06-8c08-152dfae2082b'
};

/**
 * B2C policy names (user flows)
 */
export const b2cPolicies = {
  signUpSignIn: "B2C_1_SignUpSignIn_EmailOnly_Dev",
  forgotPassword: "B2C_1_PasswordReset_EmailOnly_Dev",
  editProfile: "B2C_1_ProfileEdit_Dev"
};

/**
 * API scopes required for authentication
 */
export const apiScopes = [
  "https://quodsidevb2c.onmicrosoft.com/api/Data.Read",
  "https://quodsidevb2c.onmicrosoft.com/api/Data.Write",
  "https://quodsidevb2c.onmicrosoft.com/api/Simulation.Run"
];

/**
 * Build the authority URL for a specific policy
 */
export const buildAuthority = (policy: string): string => {
  return `https://${tenantConfig.authorityDomain}/${tenantConfig.domain}/${policy}/v2.0`;
};

/**
 * Create login request configuration for a specific policy
 */
export const createLoginRequest = (
  policy = b2cPolicies.signUpSignIn, 
  additionalScopes: string[] = []
): PopupRequest => {
  return {
    scopes: [...apiScopes, ...additionalScopes],
    authority: buildAuthority(policy),
    prompt: "login" // Force login prompt to avoid cached sessions
  };
};

/**
 * Default login request with sign-up/sign-in policy
 */
export const loginRequest = createLoginRequest();

/**
 * Password reset request with password reset policy
 */
export const passwordResetRequest = createLoginRequest(b2cPolicies.forgotPassword);

/**
 * Profile edit request with profile edit policy
 */
export const profileEditRequest = createLoginRequest(b2cPolicies.editProfile);
