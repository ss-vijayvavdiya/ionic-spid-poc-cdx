// OIDC helpers: discovery and client creation.
// We keep a cached client so discovery is not repeated on every request.

import { Issuer, Client } from 'openid-client';
import { config } from './config';

let cachedClient: Client | null = null;
let discoveryPromise: Promise<Client> | null = null;

export async function getOidcClient(): Promise<Client> {
  // If we already have a client, return it immediately.
  if (cachedClient) {
    return cachedClient;
  }

  // If discovery is already running, wait for it instead of starting again.
  if (discoveryPromise) {
    return discoveryPromise;
  }

  // Start discovery and cache the promise so parallel requests share it.
  discoveryPromise = (async () => {
    // Discovery finds the OIDC endpoints from the issuer URL.
    const issuer = await Issuer.discover(config.signicatIssuer);

    // Create an OIDC client with our credentials and redirect URI.
    const client = new issuer.Client({
      client_id: config.signicatClientId,
      client_secret: config.signicatClientSecret,
      redirect_uris: [config.redirectUri],
      response_types: ['code']
    });

    cachedClient = client;
    return client;
  })();

  return discoveryPromise;
}
