/**
 * GitHubService
 *
 * Creates GitHub repositories on behalf of an authenticated user as part of
 * the deployment pipeline (`creating_repo` stage).
 *
 * Design goals (issue-074):
 *   - Private repository creation with configurable metadata
 *   - Deterministic name-collision resolution via numeric suffix retry loop
 *   - Return all identifiers the downstream push/deploy stages need
 *   - No hard dependency on Octokit — uses the platform-provided `fetch` so
 *     the service is usable in both Node.js (Next.js API routes) and Edge runtimes
 *
 * GitHub API docs: https://docs.github.com/en/rest/repos/repos#create-a-repository-for-the-authenticated-user
 */

import { createClient } from '@/lib/supabase/server';
import { decryptToken } from '@/lib/github/token';
import type { GitHubRepoCreateOptions, GitHubRepoResult } from '@craft/types';

const GITHUB_API_BASE = 'https://api.github.com';
const DEFAULT_MAX_RETRIES = 5;

// ── Custom error types ────────────────────────────────────────────────────────

/**
 * Thrown when the user has not connected their GitHub account (no token stored)
 * or when the stored token is missing/null.
 */
export class GitHubTokenMissingError extends Error {
    constructor() {
        super(
            'GitHub account is not connected. ' +
            'Please connect your GitHub account before creating a repository.'
        );
        this.name = 'GitHubTokenMissingError';
    }
}

/**
 * Thrown when all `maxRetries` name candidates are already taken on the
 * authenticated user's account.
 */
export class GitHubNameCollisionError extends Error {
    constructor(baseName: string, attempts: number) {
        super(
            `Could not create repository: '${baseName}' and ${attempts - 1} ` +
            `alternate name(s) already exist on this account.`
        );
        this.name = 'GitHubNameCollisionError';
    }
}

/**
 * Thrown when the GitHub API returns a non-success status that is not a
 * recoverable name collision.
 */
export class GitHubApiError extends Error {
    constructor(
        readonly status: number,
        message: string
    ) {
        super(`GitHub API error ${status}: ${message}`);
        this.name = 'GitHubApiError';
    }
}

// ── Service ───────────────────────────────────────────────────────────────────

export class GitHubService {
    /**
     * Create a GitHub repository for the given user.
     *
     * The repository is private by default.  If the requested name is already
     * taken the service automatically retries with a numeric suffix
     * (`name`, `name-2`, `name-3`, …) up to `maxRetries` attempts.
     *
     * @param userId  Supabase user ID — used to look up the stored GitHub PAT.
     * @param name    Desired repository name (will be sanitized).
     * @param options Optional creation settings.
     * @returns       Identifiers needed by the push and deployment stages.
     *
     * @throws {GitHubTokenMissingError}    User has not connected GitHub.
     * @throws {GitHubNameCollisionError}   All name candidates are taken.
     * @throws {GitHubApiError}             Any other non-success API response.
     */
    async createRepository(
        userId: string,
        name: string,
        options: GitHubRepoCreateOptions = {}
    ): Promise<GitHubRepoResult> {
        const {
            isPrivate = true,
            description,
            autoInit = false,
            maxRetries = DEFAULT_MAX_RETRIES,
        } = options;

        const token = await this.getToken(userId);
        const baseName = this.sanitizeRepoName(name);

        for (let attempt = 1; attempt <= maxRetries; attempt++) {
            const repoName = attempt === 1 ? baseName : `${baseName}-${attempt}`;

            const response = await fetch(`${GITHUB_API_BASE}/user/repos`, {
                method: 'POST',
                headers: {
                    Authorization: `Bearer ${token}`,
                    Accept: 'application/vnd.github+json',
                    'X-GitHub-Api-Version': '2022-11-28',
                    'Content-Type': 'application/json',
                },
                body: JSON.stringify({
                    name: repoName,
                    description,
                    private: isPrivate,
                    auto_init: autoInit,
                }),
            });

            if (response.ok) {
                // eslint-disable-next-line @typescript-eslint/no-explicit-any
                const payload: any = await response.json();
                return {
                    id: payload.id,
                    nodeId: payload.node_id,
                    name: payload.name,
                    fullName: payload.full_name,
                    htmlUrl: payload.html_url,
                    cloneUrl: payload.clone_url,
                    sshUrl: payload.ssh_url,
                    defaultBranch: payload.default_branch,
                    private: payload.private,
                };
            }

            // 422 Unprocessable Entity can mean a name collision — check the errors array
            if (response.status === 422) {
                const body = await response.json().catch(() => ({ errors: [] }));
                const errors: Array<{ message?: string }> = body?.errors ?? [];
                const isNameTaken = errors.some((e) =>
                    e.message?.toLowerCase().includes('already exists')
                );

                if (isNameTaken && attempt < maxRetries) {
                    continue; // try next suffix
                }
                if (isNameTaken) {
                    throw new GitHubNameCollisionError(baseName, maxRetries);
                }

                // 422 for a different reason — treat as hard failure
                const message: string = body?.message ?? response.statusText;
                throw new GitHubApiError(422, message);
            }

            // Any other non-success status is a hard failure
            const errBody = await response.json().catch(() => ({ message: response.statusText }));
            throw new GitHubApiError(response.status, errBody.message ?? response.statusText);
        }

        // Unreachable in practice, but required for TypeScript exhaustiveness
        throw new GitHubNameCollisionError(baseName, maxRetries);
    }

    // ── Private helpers ───────────────────────────────────────────────────────

    /** Retrieve and decrypt the user's GitHub personal access token. */
    private async getToken(userId: string): Promise<string> {
        const supabase = createClient();

        const { data: profile, error } = await supabase
            .from('profiles')
            .select('github_token_encrypted')
            .eq('id', userId)
            .single();

        if (error || !profile?.github_token_encrypted) {
            throw new GitHubTokenMissingError();
        }

        return decryptToken(profile.github_token_encrypted);
    }

    /**
     * Sanitize an arbitrary string into a valid GitHub repository name.
     *
     * GitHub rules: alphanumerics, hyphens, underscores, and dots; max 100
     * characters; cannot start or end with a dot or hyphen.
     *
     * This method is `public` so callers can preview the sanitized name before
     * attempting creation.
     */
    sanitizeRepoName(name: string): string {
        return name
            .toLowerCase()
            .replace(/[^a-z0-9._-]/g, '-')   // replace invalid chars with hyphen
            .replace(/-{2,}/g, '-')            // collapse consecutive hyphens
            .replace(/^[.-]+|[.-]+$/g, '')     // strip leading/trailing dots & hyphens
            .slice(0, 100)                     // enforce GitHub's 100-char limit
            || 'repository';                   // fallback if name collapses to empty
    }
}
