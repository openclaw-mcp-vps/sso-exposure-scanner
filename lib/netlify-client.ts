import axios from "axios";

export type NetlifyDeployment = {
  provider: "netlify";
  projectName: string;
  deploymentUrl: string;
};

type NetlifyTokenResponse = {
  access_token: string;
  token_type: string;
  scope: string;
};

type NetlifySite = {
  name: string;
  ssl_url: string;
  url: string;
  admin_url: string;
};

export async function exchangeNetlifyCodeForToken(code: string): Promise<string> {
  const clientId = process.env.NETLIFY_CLIENT_ID;
  const clientSecret = process.env.NETLIFY_CLIENT_SECRET;
  const redirectUri = process.env.NETLIFY_REDIRECT_URI;

  if (!clientId || !clientSecret || !redirectUri) {
    throw new Error("Netlify OAuth environment variables are not configured.");
  }

  const response = await axios.post<NetlifyTokenResponse>(
    "https://api.netlify.com/oauth/token",
    {
      grant_type: "authorization_code",
      code,
      client_id: clientId,
      client_secret: clientSecret,
      redirect_uri: redirectUri
    },
    {
      headers: {
        "Content-Type": "application/json"
      },
      timeout: 15_000
    }
  );

  if (!response.data.access_token) {
    throw new Error("Netlify token exchange succeeded but no access_token was returned.");
  }

  return response.data.access_token;
}

export function getNetlifyAuthUrl(state: string): string {
  const clientId = process.env.NETLIFY_CLIENT_ID;
  const redirectUri = process.env.NETLIFY_REDIRECT_URI;

  if (!clientId || !redirectUri) {
    throw new Error("Netlify OAuth client ID or redirect URI is missing.");
  }

  const params = new URLSearchParams({
    response_type: "code",
    client_id: clientId,
    redirect_uri: redirectUri,
    state
  });

  return `https://app.netlify.com/authorize?${params.toString()}`;
}

export async function fetchNetlifyDeployments(
  accessToken: string
): Promise<NetlifyDeployment[]> {
  const response = await axios.get<NetlifySite[]>(
    "https://api.netlify.com/api/v1/sites",
    {
      headers: {
        Authorization: `Bearer ${accessToken}`
      },
      timeout: 20_000
    }
  );

  const sites = response.data ?? [];

  return sites
    .filter((site) => Boolean(site.ssl_url || site.url))
    .map<NetlifyDeployment>((site) => ({
      provider: "netlify",
      projectName: site.name,
      deploymentUrl: site.ssl_url || site.url
    }));
}
