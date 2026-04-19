import axios from "axios";

export type ExternalProject = {
  provider: "netlify";
  providerProjectId: string;
  name: string;
  framework: string | null;
  primaryUrl: string;
  deploymentUrl: string;
};

type NetlifyTokenResponse = {
  access_token: string;
  scope?: string;
};

type NetlifySite = {
  id: string;
  name: string;
  ssl_url?: string;
  url?: string;
  account_name?: string;
  build_settings?: {
    framework?: string;
  };
  published_deploy?: {
    ssl_url?: string;
    url?: string;
  };
};

const NETLIFY_AUTH_BASE = "https://app.netlify.com/authorize";
const NETLIFY_API_BASE = "https://api.netlify.com";

export function buildNetlifyOAuthUrl(state: string, redirectUri: string): string {
  const clientId = process.env.NETLIFY_CLIENT_ID;
  if (!clientId) {
    throw new Error("NETLIFY_CLIENT_ID is required.");
  }

  const url = new URL(NETLIFY_AUTH_BASE);
  url.searchParams.set("client_id", clientId);
  url.searchParams.set("redirect_uri", redirectUri);
  url.searchParams.set("response_type", "code");
  url.searchParams.set("state", state);
  url.searchParams.set("scope", "sites:read");
  return url.toString();
}

export async function exchangeNetlifyCode(
  code: string,
  redirectUri: string
): Promise<{ accessToken: string; scope: string }> {
  const clientId = process.env.NETLIFY_CLIENT_ID;
  const clientSecret = process.env.NETLIFY_CLIENT_SECRET;
  if (!clientId || !clientSecret) {
    throw new Error("NETLIFY_CLIENT_ID and NETLIFY_CLIENT_SECRET are required.");
  }

  const body = new URLSearchParams({
    grant_type: "authorization_code",
    code,
    redirect_uri: redirectUri,
    client_id: clientId,
    client_secret: clientSecret
  });

  const response = await axios.post<NetlifyTokenResponse>(`${NETLIFY_API_BASE}/oauth/token`, body, {
    headers: {
      "Content-Type": "application/x-www-form-urlencoded"
    }
  });

  return {
    accessToken: response.data.access_token,
    scope: response.data.scope ?? "sites:read"
  };
}

export async function fetchNetlifyProjects(token: string): Promise<ExternalProject[]> {
  const response = await axios.get<NetlifySite[]>(`${NETLIFY_API_BASE}/api/v1/sites`, {
    headers: {
      Authorization: `Bearer ${token}`
    }
  });

  return response.data
    .map((site) => {
      const deploymentUrl = site.published_deploy?.ssl_url ?? site.published_deploy?.url;
      const primaryUrl = site.ssl_url ?? site.url;
      const url = deploymentUrl ?? primaryUrl;

      if (!url) {
        return null;
      }

      return {
        provider: "netlify" as const,
        providerProjectId: site.id,
        name: site.name,
        framework: site.build_settings?.framework ?? null,
        primaryUrl,
        deploymentUrl: url
      };
    })
    .filter((site): site is ExternalProject => site !== null);
}
