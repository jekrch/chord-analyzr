/**
 * Google OAuth via the Google Identity Services (GIS) token client. The app
 * is fully client-side, so this is the browser token flow: no client secret,
 * no redirect URI — just a popup that yields a short-lived (~1h) access
 * token for the non-sensitive drive.file scope.
 *
 * The token lives at module level only and is never persisted; after a page
 * reload the next Drive action re-acquires one (silently when the user still
 * has a Google session).
 */

import { getEnvString } from './env';

const SCOPE = 'https://www.googleapis.com/auth/drive.file';
const GIS_SRC = 'https://accounts.google.com/gsi/client';

// Treat tokens as expired a minute early so we never hand out one that dies
// mid-request.
const EXPIRY_MARGIN_MS = 60_000;

let cachedToken: { token: string; expiresAt: number } | null = null;
let gisLoadPromise: Promise<void> | null = null;
let tokenClient: GoogleTokenClient | null = null;
// requestAccessToken reports back through the client-level callbacks, so the
// pending promise's handlers are stashed here for them to call.
let pendingRequest: { resolve: (token: string) => void; reject: (err: Error) => void } | null = null;

export function getGoogleClientId(): string {
    return getEnvString('VITE_GOOGLE_CLIENT_ID');
}

export function isDriveConfigured(): boolean {
    return getGoogleClientId() !== '';
}

function loadGis(): Promise<void> {
    if (!gisLoadPromise) {
        gisLoadPromise = new Promise((resolve, reject) => {
            const script = document.createElement('script');
            script.src = GIS_SRC;
            script.async = true;
            script.onload = () => resolve();
            script.onerror = () => {
                gisLoadPromise = null; // allow a retry later
                reject(new Error('Could not load Google sign-in. Check your connection and try again.'));
            };
            document.head.appendChild(script);
        });
    }
    return gisLoadPromise;
}

function errorMessage(error: GoogleTokenClientError): string {
    switch (error.type) {
        case 'popup_failed_to_open':
            return 'Popup blocked — allow popups for this site and try again.';
        case 'popup_closed':
            return 'Google sign-in was cancelled.';
        default:
            return error.message || 'Google sign-in failed.';
    }
}

function getTokenClient(): GoogleTokenClient {
    if (!tokenClient) {
        tokenClient = google.accounts.oauth2.initTokenClient({
            client_id: getGoogleClientId(),
            scope: SCOPE,
            callback: response => {
                const pending = pendingRequest;
                pendingRequest = null;
                if (!pending) return;
                if (response.error) {
                    pending.reject(new Error(response.error_description || 'Google sign-in failed.'));
                } else if (!google.accounts.oauth2.hasGrantedAllScopes(response, SCOPE)) {
                    pending.reject(new Error("Drive access wasn't granted."));
                } else {
                    cachedToken = {
                        token: response.access_token,
                        expiresAt: Date.now() + response.expires_in * 1000,
                    };
                    pending.resolve(response.access_token);
                }
            },
            error_callback: error => {
                const pending = pendingRequest;
                pendingRequest = null;
                pending?.reject(new Error(errorMessage(error)));
            },
        });
    }
    return tokenClient;
}

/**
 * Get a Drive access token, reusing the cached one while it's fresh.
 * Pass 'consent' to force the full consent screen (first-time connect);
 * the default '' lets Google decide, which is silent for returning users
 * with an active session.
 */
export async function getAccessToken(prompt: '' | 'consent' = ''): Promise<string> {
    if (cachedToken && cachedToken.expiresAt - EXPIRY_MARGIN_MS > Date.now()) {
        return cachedToken.token;
    }
    await loadGis();
    const client = getTokenClient();
    return new Promise<string>((resolve, reject) => {
        pendingRequest?.reject(new Error('Superseded by a newer sign-in request.'));
        pendingRequest = { resolve, reject };
        client.requestAccessToken({ prompt });
    });
}

/** Drop the cached token (e.g. after a 401) so the next call gets a fresh one. */
export function clearCachedToken(): void {
    cachedToken = null;
}

/** Revoke the app's grant with Google and forget the cached token. */
export function revokeAccess(): void {
    if (cachedToken) {
        try {
            google.accounts.oauth2.revoke(cachedToken.token);
        } catch {
            // GIS not loaded or revoke failed — the token expires on its own
        }
    }
    cachedToken = null;
}
