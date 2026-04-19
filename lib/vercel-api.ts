import axios from "axios";

export type ExternalProject = {
  provider: "vercel";
  providerProjectId: string;
  name: string;
  framework: string | null;
  primaryUrl: string;
  deploymentUrl: string;
};

type VercelTokenResponse = {
  access_token: string;
  scope?: string;
  user_id?: string;
};

type VercelProjectResponse = {
  projects: Array<{
    id: string;
    name: string;
    framework?: string | null;
  }>;
};

type VercelDeploymentResponse = {
  deployments: Array<{
    url?: string;
    state?: string;
  }>;
};

const VERCEL_AUTH_BASE = "https://vercel.com/oauth/authorize";
const VERCEL_API_BASE = "https://api.vercel.com";

export function buildVercelOAuthUrl(state: string, redirectUri: string): string {
  const clientId = process.env.VERCEL_CLIENT_ID;
  if (!clientId) {
    throw new Error("VERCEL_CLIENT_ID is required.");
  }

  const url = new URL(VERCEL_AUTH_BASE);
  url.searchParams.set("client_id", clientId);
  url.searchParams.set("redirect_uri", redirectUri);
  url.searchParams.set("response_type", "code");
  url.searchParams.set("scope", "projects.read deployments.read");
  url.searchParams.set("state", state);
  return url.toString();
}

export async function exchangeVercelCode(
  code: string,
  redirectUri: string
): Promise<{ accessToken: string; scope: string }> {
  const clientId = process.env.VERCEL_CLIENT_ID;
  const clientSecret = process.env.VERCEL_CLIENT_SECRET;
  if (!clientId || !clientSecret) {
    throw new Error("VERCEL_CLIENT_ID and VERCEL_CLIENT_SECRET are required.");
  }

  const response = await axios.post<VercelTokenResponse>(
    `${VERCEL_API_BASE}/v2/oauth/access_token`,
    {
      code,
      redirect_uri: redirectUri,
      client_id: clientId,
      client_secret: clientSecret
    },
    {
      headers: {
        "Content-Type": "application/json"
      }
    }
  );

  return {
    accessToken: response.data.access_token,
    scope: response.data.scope ?? "projects.read deployments.read"
  };
}

async function getLatestDeploymentUrl(token: string, projectId: string): Promise<string | null> {
  const response = await axios.get<VercelDeploymentResponse>(`${VERCEL_API_BASE}/v6/deployments`, {
    params: {
      projectId,
      target: "production",
      limit: 1
    },
    headers: {
      Authorization: `Bearer ${token}`
    }
  });

  const latest = response.data.deployments[0];
  if (!latest?.url) {
    return null;
  }

  return latest.url.startsWith("http") ? latest.url : `https://${latest.url}`;
}

export async function fetchVercelProjects(token: string): Promise<ExternalProject[]> {
  const projectsResponse = await axios.get<VercelProjectResponse>(`${VERCEL_API_BASE}/v9/projects`, {
    params: {
      limit: 100
    },
    headers: {
      Authorization: `Bearer ${token}`
    }
  });

  const projects = projectsResponse.data.projects;
  const hydrated = await Promise.all(
    projects.map(async (project) => {
      const deploymentUrl = await getLatestDeploymentUrl(token, project.id);
      if (!deploymentUrl) {
        return null;
      }

      return {
        provider: "vercel" as const,
        providerProjectId: project.id,
        name: project.name,
        framework: project.framework ?? null,
        primaryUrl: deploymentUrl,
        deploymentUrl
      };
    })
  );

  return hydrated.filter((project): project is ExternalProject => project !== null);
}
