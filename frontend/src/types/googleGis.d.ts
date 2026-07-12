/**
 * Minimal ambient types for the Google Identity Services (GIS) OAuth token
 * client, loaded at runtime from https://accounts.google.com/gsi/client.
 * Only the surface used by util/googleAuth.ts is declared.
 */

interface GoogleTokenResponse {
    access_token: string;
    expires_in: number;
    scope: string;
    error?: string;
    error_description?: string;
}

interface GoogleTokenClientError {
    type: string; // e.g. 'popup_failed_to_open', 'popup_closed'
    message?: string;
}

interface GoogleTokenClient {
    requestAccessToken(overrides?: { prompt?: '' | 'consent' }): void;
}

declare namespace google.accounts.oauth2 {
    function initTokenClient(config: {
        client_id: string;
        scope: string;
        callback: (response: GoogleTokenResponse) => void;
        error_callback?: (error: GoogleTokenClientError) => void;
    }): GoogleTokenClient;

    function revoke(accessToken: string, done?: () => void): void;

    function hasGrantedAllScopes(
        response: GoogleTokenResponse,
        ...scopes: string[]
    ): boolean;
}
