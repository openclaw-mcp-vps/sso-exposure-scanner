import axios from "axios";

export type VercelDeployment = {
  provider: "vercel";
  projectName: string;
  deploymentUrl: string;
};

type VercelTokenResponse = {
  access_token: string;
  token_type: string;
  scope: string;
};

type VercelProject = {
  id: string;
  name: string;
};

type VercelDeploymentRecord = {
  url: string;
  state: string;
};

export async function exchangeVercelCodeForToken(code: string): Promise<string> {
  const clientId = process.env.VERCEL_CLIENT_ID;
  const clientSecret = process.env.VERCEL_CLIENT_SECRET;
  const redirectUri = process.env.VERCEL_REDIRECT_URI;

  if (!clientId || !clientSecret || !redirectUri) {
    throw new Error("Vercel OAuth environment variables are not configured.");
  }

  const response = await axios.post<VercelTokenResponse>(
    "https://api.vercel.com/v2/oauth/access_token",
    {
      client_id: clientId,
      client_secret: clientSecret,
      code,
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
    throw new Error("Vercel token exchange succeeded but no access_token was returned.");
  }

  return response.data.access_token;
}

export function getVercelAuthUrl(state: string): string {
  const clientId = process.env.VERCEL_CLIENT_ID;
  const redirectUri = process.env.VERCEL_REDIRECT_URI;

  if (!clientId || !redirectUri) {
    throw new Error("Vercel OAuth client ID or redirect URI is missing.");
  }

  const params = new URLSearchParams({
    client_id: clientId,
    redirect_uri: redirectUri,
    response_type: "code",
    scope: "projects.read deployments.read",
    state
  });

  return `https://vercel.com/oauth/authorize?${params.toString()}`;
}

export async function fetchVercelDeployments(
  accessToken: string
): Promise<VercelDeployment[]> {
  const projectsResponse = await axios.get<{ projects: VercelProject[] }>(
    "https://api.vercel.com/v9/projects",
    {
      headers: {
        Authorization: `Bearer ${accessToken}`
      },
      params: {
        limit: 100
      },
      timeout: 20_000
    }
  );

  const projects = projectsResponse.data.projects ?? [];

  const deploymentQueries = projects.map(async (project) => {
    const deploymentResponse = await axios.get<{ deployments: VercelDeploymentRecord[] }>(
      "https://api.vercel.com/v6/deployments",
      {
        headers: {
          Authorization: `Bearer ${accessToken}`
        },
        params: {
          projectId: project.id,
          limit: 5,
          state: "READY"
        },
        timeout: 20_000
      }
    );

    const deployments = deploymentResponse.data.deployments ?? [];
    return deployments
      .filter((item) => Boolean(item.url))
      .map<VercelDeployment>((item) => ({
        provider: "vercel",
        projectName: project.name,
        deploymentUrl: item.url.startsWith("http") ? item.url : `https://${item.url}`
      }));
  });

  const deploymentsByProject = await Promise.all(deploymentQueries);
  return deploymentsByProject.flat();
}
