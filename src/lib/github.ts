// Everything the editor does on GitHub, using the signed-in person's own
// GitHub App token. Commits therefore show under their name, and they can
// only touch repositories the GitHub App is installed on.

const API = 'https://api.github.com';

export class GitHubError extends Error {
  status: number;
  detail?: unknown;
  constructor(status: number, message: string, detail?: unknown) {
    super(message);
    this.status = status;
    this.detail = detail;
  }
}

// UTF-8 safe base64, for file contents.
export const toBase64 = (text: string) => bytesToBase64(new TextEncoder().encode(text));
export const bytesToBase64 = (bytes: Uint8Array) => {
  let s = '';
  for (let i = 0; i < bytes.length; i += 0x8000) s += String.fromCharCode(...bytes.subarray(i, i + 0x8000));
  return btoa(s);
};
export const fromBase64 = (b64: string) => new TextDecoder().decode(Uint8Array.from(atob(b64.replace(/\s/g, '')), (c) => c.charCodeAt(0)));

export interface RepoRef {
  owner: string;
  repo: string;
}

export interface FileResult<T> {
  data: T;
  sha: string;
}

export interface PendingChange {
  message: string;
  author: string;
  date: string;
  sha: string;
}

export type CheckState = 'passed' | 'failed' | 'running' | 'none';

export class GitHub {
  private token: string;
  private ref: RepoRef;
  private fetcher: typeof fetch;
  constructor(token: string, ref: RepoRef, fetcher: typeof fetch = (input, init) => fetch(input, init)) {
    this.token = token;
    this.ref = ref;
    this.fetcher = fetcher;
  }

  private async call<T>(method: string, path: string, body?: unknown): Promise<{ status: number; data: T }> {
    const res = await this.fetcher(`${API}${path}`, {
      method,
      headers: {
        Authorization: `Bearer ${this.token}`,
        Accept: 'application/vnd.github+json',
        'X-GitHub-Api-Version': '2022-11-28',
        'User-Agent': 'pack-station-editor',
        ...(body ? { 'Content-Type': 'application/json' } : {}),
      },
      body: body ? JSON.stringify(body) : undefined,
    });
    const text = await res.text();
    const data = text ? JSON.parse(text) : null;
    if (!res.ok) throw new GitHubError(res.status, (data && data.message) || `GitHub returned ${res.status}`, data);
    return { status: res.status, data: data as T };
  }

  private get repoPath() {
    return `/repos/${this.ref.owner}/${this.ref.repo}`;
  }

  async user() {
    const { data } = await this.call<{ login: string; name: string | null; avatar_url: string }>('GET', '/user');
    return { login: data.login, name: data.name || data.login, avatar: data.avatar_url };
  }

  // True when this person can write to the website repository.
  async canWrite() {
    try {
      const { data } = await this.call<{ permissions?: { push?: boolean } }>('GET', this.repoPath);
      return Boolean(data.permissions?.push);
    } catch (e) {
      if (e instanceof GitHubError && (e.status === 404 || e.status === 403)) return false;
      throw e;
    }
  }

  async readJson<T>(path: string, branch: string): Promise<FileResult<T>> {
    const { data } = await this.call<{ content: string; sha: string }>('GET', `${this.repoPath}/contents/${encodePath(path)}?ref=${encodeURIComponent(branch)}`);
    return { data: JSON.parse(fromBase64(data.content)) as T, sha: data.sha };
  }

  async writeJson(path: string, value: unknown, opts: { branch: string; sha: string; message: string }) {
    return this.writeFile(path, toBase64(JSON.stringify(value, null, 2) + '\n'), opts);
  }

  // Creates or replaces a file. Leave sha empty for a new file.
  async writeFile(path: string, base64: string, opts: { branch: string; sha?: string; message: string }) {
    try {
      const { data } = await this.call<{ content: { sha: string }; commit: { sha: string; html_url: string } }>('PUT', `${this.repoPath}/contents/${encodePath(path)}`, {
        message: opts.message,
        content: base64,
        branch: opts.branch,
        ...(opts.sha ? { sha: opts.sha } : {}),
      });
      return { sha: data.content.sha, commit: data.commit.sha, url: data.commit.html_url };
    } catch (e) {
      if (e instanceof GitHubError && (e.status === 409 || (e.status === 422 && /sha/i.test(e.message)))) {
        throw new GitHubError(409, 'Someone else saved this section since you opened it. Reload the page to see their change, then make yours again.');
      }
      throw e;
    }
  }

  // Changes saved to the preview branch that aren't live yet.
  async pending(live: string, preview: string): Promise<PendingChange[]> {
    const { data } = await this.call<{ commits: { sha: string; commit: { message: string; author: { name: string; date: string } }; author?: { login: string } | null }[] }>(
      'GET',
      `${this.repoPath}/compare/${encodeURIComponent(live)}...${encodeURIComponent(preview)}`,
    );
    return data.commits
      .map((c) => ({ sha: c.sha, message: c.commit.message.split('\n')[0], author: c.author?.login || c.commit.author.name, date: c.commit.author.date }))
      .reverse();
  }

  // Result of the website's build check on the latest preview commit.
  async checkState(branch: string): Promise<CheckState> {
    const { data } = await this.call<{ check_runs: { status: string; conclusion: string | null }[] }>('GET', `${this.repoPath}/commits/${encodeURIComponent(branch)}/check-runs?per_page=50`);
    const runs = data.check_runs;
    if (!runs.length) return 'none';
    if (runs.some((r) => r.status !== 'completed')) return 'running';
    if (runs.some((r) => r.conclusion && !['success', 'neutral', 'skipped'].includes(r.conclusion))) return 'failed';
    return 'passed';
  }

  // Publishes: opens (or reuses) a pull request from preview to live and merges it.
  async publish(live: string, preview: string, by: string): Promise<{ merged: boolean; nothingToDo?: boolean; url?: string }> {
    const ahead = await this.pending(live, preview);
    if (!ahead.length) return { merged: false, nothingToDo: true };

    const head = `${this.ref.owner}:${preview}`;
    const open = await this.call<{ number: number; html_url: string }[]>('GET', `${this.repoPath}/pulls?state=open&head=${encodeURIComponent(head)}&base=${encodeURIComponent(live)}`);
    let pr = open.data[0];
    if (!pr) {
      const created = await this.call<{ number: number; html_url: string }>('POST', `${this.repoPath}/pulls`, {
        title: `Publish website changes (${ahead.length})`,
        head: preview,
        base: live,
        body: `Published from the Pack Station editor by @${by}.\n\n${ahead.map((c) => `- ${c.message}`).join('\n')}`,
      });
      pr = created.data;
    }
    try {
      await this.call('PUT', `${this.repoPath}/pulls/${pr.number}/merge`, {
        merge_method: 'merge',
        commit_title: `Publish website changes (${ahead.length})`,
      });
      return { merged: true, url: pr.html_url };
    } catch (e) {
      if (e instanceof GitHubError && (e.status === 405 || e.status === 409)) {
        throw new GitHubError(409, "The website's build check hasn't passed yet, so it can't go live. Wait a minute and try again. If it keeps failing, the last change may need fixing.", e.detail);
      }
      throw e;
    }
  }
}

const encodePath = (path: string) => path.split('/').map(encodeURIComponent).join('/');

/* ── Signing in with the GitHub App ─────────────────────────── */

export const authorizeUrl = (clientId: string, redirectUri: string, state: string) =>
  `https://github.com/login/oauth/authorize?${new URLSearchParams({ client_id: clientId, redirect_uri: redirectUri, state, allow_signup: 'false' })}`;

export async function exchangeCode(code: string, clientId: string, clientSecret: string, redirectUri: string, fetcher: typeof fetch = fetch): Promise<string> {
  const res = await fetcher('https://github.com/login/oauth/access_token', {
    method: 'POST',
    headers: { Accept: 'application/json', 'Content-Type': 'application/json', 'User-Agent': 'pack-station-editor' },
    body: JSON.stringify({ client_id: clientId, client_secret: clientSecret, code, redirect_uri: redirectUri }),
  });
  const data = (await res.json()) as { access_token?: string; error?: string; error_description?: string };
  if (!res.ok || !data.access_token) throw new GitHubError(401, data.error_description || data.error || 'GitHub sign-in failed.');
  return data.access_token;
}
