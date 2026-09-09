import { createSign } from "node:crypto";
import { isConfiguredEnvValue } from "@/lib/config";

const GITHUB_API_BASE = "https://api.github.com";

type GithubInstallationResponse = {
  id: number;
  account?: {
    login?: string;
    type?: string;
  };
};

function toBase64Url(value: Buffer | string): string {
  const buffer = Buffer.isBuffer(value) ? value : Buffer.from(value);
  return buffer
    .toString("base64")
    .replace(/=/g, "")
    .replace(/\+/g, "-")
    .replace(/\//g, "_");
}

function getGithubAppPrivateKey(): string {
  const raw = process.env.GITHUB_APP_PRIVATE_KEY;
  if (!raw) {
    throw new Error("Missing GITHUB_APP_PRIVATE_KEY");
  }

  return raw.replace(/\\n/g, "\n");
}

function getGithubAppId(): string {
  const appId = process.env.GITHUB_APP_ID;
  if (!appId) {
    throw new Error("Missing GITHUB_APP_ID");
  }

  return appId;
}

function buildGithubAppJwt(): string {
  const now = Math.floor(Date.now() / 1000);
  const header = { alg: "RS256", typ: "JWT" };
  const payload = {
    iat: now - 60,
    exp: now + 9 * 60,
    iss: getGithubAppId(),
  };

  const encodedHeader = toBase64Url(JSON.stringify(header));
  const encodedPayload = toBase64Url(JSON.stringify(payload));
  const unsignedToken = `${encodedHeader}.${encodedPayload}`;

  const signer = createSign("RSA-SHA256");
  signer.update(unsignedToken);
  signer.end();
  const signature = signer.sign(getGithubAppPrivateKey());

  return `${unsignedToken}.${toBase64Url(signature)}`;
}

async function githubAppRequest(path: string, init?: RequestInit): Promise<Response> {
  const jwt = buildGithubAppJwt();

  return fetch(`${GITHUB_API_BASE}${path}`, {
    ...init,
    headers: {
      Accept: "application/vnd.github+json",
      Authorization: `Bearer ${jwt}`,
      "User-Agent": "RepoLens",
      "X-GitHub-Api-Version": "2022-11-28",
      ...(init?.headers || {}),
    },
  });
}

export function isGithubAppConfigured(): boolean {
  return (
    isConfiguredEnvValue(process.env.GITHUB_APP_ID) &&
    isConfiguredEnvValue(process.env.GITHUB_APP_PRIVATE_KEY) &&
    isConfiguredEnvValue(process.env.NEXT_PUBLIC_GITHUB_APP_SLUG)
  );
}

export function getGithubAppInstallUrl(): string | null {
  const slug = process.env.NEXT_PUBLIC_GITHUB_APP_SLUG;
  if (!isConfiguredEnvValue(slug)) return null;
  return `https://github.com/apps/${slug}/installations/new`;
}

export async function getInstallationAccessToken(installationId: number): Promise<string> {
  const response = await githubAppRequest(`/app/installations/${installationId}/access_tokens`, {
    method: "POST",
  });

  if (!response.ok) {
    throw new Error("Failed to create GitHub App installation access token.");
  }

  const data = (await response.json()) as { token?: string };
  if (!data.token) {
    throw new Error("GitHub App token missing in access token response.");
  }

  return data.token;
}

export async function getRepoInstallation(
  owner: string,
  repo: string,
): Promise<{ installationId: number; accountLogin: string; accountType: string } | null> {
  const response = await githubAppRequest(`/repos/${owner}/${repo}/installation`);

  if (response.status === 404 || response.status === 403) {
    return null;
  }

  if (!response.ok) {
    throw new Error("Failed to fetch GitHub App installation for repository.");
  }

  const data = (await response.json()) as GithubInstallationResponse;
  if (!data.id) return null;

  return {
    installationId: data.id,
    accountLogin: data.account?.login || "unknown",
    accountType: data.account?.type || "User",
  };
}

export async function getInstallationById(
  installationId: number,
): Promise<{ installationId: number; accountLogin: string; accountType: string } | null> {
  const response = await githubAppRequest(`/app/installations/${installationId}`);

  if (response.status === 404) {
    return null;
  }

  if (!response.ok) {
    throw new Error("Failed to fetch GitHub App installation details.");
  }

  const data = (await response.json()) as GithubInstallationResponse;
  if (!data.id) return null;

  return {
    installationId: data.id,
    accountLogin: data.account?.login || "unknown",
    accountType: data.account?.type || "User",
  };
}

export type GithubRepositoryItem = {
  id: number;
  name: string;
  full_name: string;
  private: boolean;
  html_url: string;
  description: string | null;
  default_branch: string;
  stargazers_count: number;
  language: string | null;
  updated_at: string;
  pushed_at?: string;
  owner: {
    login: string;
    avatar_url?: string;
    type?: string;
  };
  installation_id?: number;
};

export async function getInstallationRepositories(
  installationId: number,
  page = 1,
  perPage = 100,
): Promise<{ total_count: number; repositories: GithubRepositoryItem[] }> {
  const token = await getInstallationAccessToken(installationId);
  const response = await fetch(
    `${GITHUB_API_BASE}/installation/repositories?page=${page}&per_page=${perPage}`,
    {
      headers: {
        Accept: "application/vnd.github+json",
        Authorization: `Bearer ${token}`,
        "User-Agent": "RepoLens",
        "X-GitHub-Api-Version": "2022-11-28",
      },
    },
  );

  if (!response.ok) {
    const errorText = await response.text().catch(() => "");
    throw new Error(
      `Failed to fetch repositories for installation ${installationId}: ${response.status} ${errorText}`,
    );
  }

  const data = (await response.json()) as {
    total_count: number;
    repositories: Array<{
      id: number;
      name: string;
      full_name: string;
      private: boolean;
      html_url: string;
      description: string | null;
      default_branch: string;
      stargazers_count: number;
      language: string | null;
      updated_at: string;
      pushed_at?: string;
      owner?: {
        login?: string;
        avatar_url?: string;
        type?: string;
      };
    }>;
  };

  const repositories: GithubRepositoryItem[] = (data.repositories || []).map((repo) => ({
    id: repo.id,
    name: repo.name,
    full_name: repo.full_name,
    private: Boolean(repo.private),
    html_url: repo.html_url,
    description: repo.description ?? null,
    default_branch: repo.default_branch || "main",
    stargazers_count: repo.stargazers_count || 0,
    language: repo.language ?? null,
    updated_at: repo.updated_at,
    pushed_at: repo.pushed_at,
    owner: {
      login: repo.owner?.login || "unknown",
      avatar_url: repo.owner?.avatar_url,
      type: repo.owner?.type || "User",
    },
    installation_id: installationId,
  }));

  return {
    total_count: data.total_count ?? repositories.length,
    repositories,
  };
}
