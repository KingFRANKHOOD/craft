/**
 * Unit tests for GitHubService
 *
 * Mocks:
 *   - @/lib/supabase/server  → createClient (profiles table)
 *   - @/lib/github/token     → decryptToken (isolates crypto from business logic)
 *   - globalThis.fetch       → GitHub REST API responses
 *
 * Coverage:
 *   createRepository
 *     – happy path: success on first attempt
 *     – forwards description, isPrivate, autoInit options
 *     – name collision on first attempt resolves with suffix on second
 *     – name collision across all maxRetries throws GitHubNameCollisionError
 *     – custom maxRetries option is respected
 *     – non-collision 422 throws GitHubApiError
 *     – non-422 API error throws GitHubApiError
 *     – missing github token throws GitHubTokenMissingError
 *     – Supabase query error throws GitHubTokenMissingError
 *
 *   sanitizeRepoName
 *     – lowercases input
 *     – replaces spaces and special characters with hyphens
 *     – collapses consecutive hyphens
 *     – strips leading/trailing dots and hyphens
 *     – truncates to 100 characters
 *     – returns "repository" for a name that collapses to empty
 */

import { describe, it, expect, vi, beforeEach } from 'vitest';

// ── Supabase mock ─────────────────────────────────────────────────────────────

const mockFrom = vi.fn();

vi.mock('@/lib/supabase/server', () => ({
    createClient: () => ({
        from: mockFrom,
    }),
}));

// ── Token mock ────────────────────────────────────────────────────────────────

const mockDecryptToken = vi.fn();

vi.mock('@/lib/github/token', () => ({
    encryptToken: vi.fn(),
    decryptToken: (enc: string) => mockDecryptToken(enc),
}));

// ── Helpers ───────────────────────────────────────────────────────────────────

/** Build a chainable Supabase query stub that resolves `single()` with `result`. */
function makeProfileQuery(result: { data: unknown; error?: unknown }) {
    const query: Record<string, unknown> = {};
    query.select = vi.fn().mockReturnValue(query);
    query.eq = vi.fn().mockReturnValue(query);
    query.single = vi.fn().mockResolvedValue(result);
    return query;
}

/** Build a minimal GitHub API success payload. */
function makeGitHubPayload(overrides: Record<string, unknown> = {}) {
    return {
        id: 123456,
        node_id: 'R_kgDO123',
        name: 'my-dex',
        full_name: 'acme/my-dex',
        html_url: 'https://github.com/acme/my-dex',
        clone_url: 'https://github.com/acme/my-dex.git',
        ssh_url: 'git@github.com:acme/my-dex.git',
        default_branch: 'main',
        private: true,
        ...overrides,
    };
}

/** Build a Response-like object. */
function mockResponse(status: number, body: unknown): Response {
    return {
        ok: status >= 200 && status < 300,
        status,
        json: vi.fn().mockResolvedValue(body),
        statusText: String(status),
    } as unknown as Response;
}

const ENCRYPTED_TOKEN = 'iv:tag:ciphertext';
const PLAIN_TOKEN = 'ghp_testtoken123';
const USER_ID = 'user-abc';

// ── Service fixture ───────────────────────────────────────────────────────────

let service: InstanceType<typeof import('./github.service').GitHubService>;

beforeEach(async () => {
    if (!service) {
        const { GitHubService } = await import('./github.service');
        service = new GitHubService();
    }
    vi.clearAllMocks();
    // Default: token is present and decrypts successfully
    mockFrom.mockReturnValue(
        makeProfileQuery({ data: { github_token_encrypted: ENCRYPTED_TOKEN } })
    );
    mockDecryptToken.mockReturnValue(PLAIN_TOKEN);
});

// ── createRepository ──────────────────────────────────────────────────────────

describe('GitHubService.createRepository', () => {
    it('returns a GitHubRepoResult on first-attempt success', async () => {
        const payload = makeGitHubPayload();
        vi.stubGlobal('fetch', vi.fn().mockResolvedValue(mockResponse(201, payload)));

        const result = await service.createRepository(USER_ID, 'my-dex');

        expect(result).toEqual({
            id: 123456,
            nodeId: 'R_kgDO123',
            name: 'my-dex',
            fullName: 'acme/my-dex',
            htmlUrl: 'https://github.com/acme/my-dex',
            cloneUrl: 'https://github.com/acme/my-dex.git',
            sshUrl: 'git@github.com:acme/my-dex.git',
            defaultBranch: 'main',
            private: true,
        });
    });

    it('sends the correct Authorization header with the decrypted token', async () => {
        const mockFetch = vi.fn().mockResolvedValue(mockResponse(201, makeGitHubPayload()));
        vi.stubGlobal('fetch', mockFetch);

        await service.createRepository(USER_ID, 'my-dex');

        expect(mockFetch).toHaveBeenCalledWith(
            'https://api.github.com/user/repos',
            expect.objectContaining({
                headers: expect.objectContaining({
                    Authorization: `Bearer ${PLAIN_TOKEN}`,
                }),
            })
        );
    });

    it('creates a private repository by default', async () => {
        const mockFetch = vi.fn().mockResolvedValue(mockResponse(201, makeGitHubPayload()));
        vi.stubGlobal('fetch', mockFetch);

        await service.createRepository(USER_ID, 'my-dex');

        const body = JSON.parse(mockFetch.mock.calls[0][1].body);
        expect(body.private).toBe(true);
    });

    it('forwards description, isPrivate=false, and autoInit=true to the API', async () => {
        const mockFetch = vi.fn().mockResolvedValue(
            mockResponse(201, makeGitHubPayload({ private: false, auto_init: true }))
        );
        vi.stubGlobal('fetch', mockFetch);

        await service.createRepository(USER_ID, 'my-dex', {
            description: 'A test DEX',
            isPrivate: false,
            autoInit: true,
        });

        const body = JSON.parse(mockFetch.mock.calls[0][1].body);
        expect(body.description).toBe('A test DEX');
        expect(body.private).toBe(false);
        expect(body.auto_init).toBe(true);
    });

    it('retries with a numeric suffix after a name-collision 422', async () => {
        const collisionBody = {
            message: 'Repository creation failed.',
            errors: [{ message: 'name already exists on this account' }],
        };
        const successPayload = makeGitHubPayload({ name: 'my-dex-2', full_name: 'acme/my-dex-2' });

        const mockFetch = vi.fn()
            .mockResolvedValueOnce(mockResponse(422, collisionBody))
            .mockResolvedValueOnce(mockResponse(201, successPayload));
        vi.stubGlobal('fetch', mockFetch);

        const result = await service.createRepository(USER_ID, 'my-dex');

        expect(mockFetch).toHaveBeenCalledTimes(2);
        // First attempt used the base name
        expect(JSON.parse(mockFetch.mock.calls[0][1].body).name).toBe('my-dex');
        // Second attempt used the suffixed name
        expect(JSON.parse(mockFetch.mock.calls[1][1].body).name).toBe('my-dex-2');
        expect(result.name).toBe('my-dex-2');
    });

    it('throws GitHubNameCollisionError when all maxRetries candidates are taken', async () => {
        const collisionBody = {
            errors: [{ message: 'name already exists on this account' }],
        };
        const mockFetch = vi.fn().mockResolvedValue(mockResponse(422, collisionBody));
        vi.stubGlobal('fetch', mockFetch);

        const { GitHubNameCollisionError } = await import('./github.service');
        await expect(
            service.createRepository(USER_ID, 'my-dex', { maxRetries: 3 })
        ).rejects.toThrow(GitHubNameCollisionError);

        expect(mockFetch).toHaveBeenCalledTimes(3);
    });

    it('respects a custom maxRetries option', async () => {
        const collisionBody = { errors: [{ message: 'name already exists on this account' }] };
        const successPayload = makeGitHubPayload({ name: 'my-dex-2' });

        const mockFetch = vi.fn()
            .mockResolvedValueOnce(mockResponse(422, collisionBody))
            .mockResolvedValueOnce(mockResponse(201, successPayload));
        vi.stubGlobal('fetch', mockFetch);

        const result = await service.createRepository(USER_ID, 'my-dex', { maxRetries: 2 });

        expect(mockFetch).toHaveBeenCalledTimes(2);
        expect(result.name).toBe('my-dex-2');
    });

    it('throws GitHubApiError for a 422 that is NOT a name collision', async () => {
        const errorBody = { message: 'Validation Failed', errors: [{ message: 'invalid repo name' }] };
        vi.stubGlobal('fetch', vi.fn().mockResolvedValue(mockResponse(422, errorBody)));

        const { GitHubApiError } = await import('./github.service');
        await expect(service.createRepository(USER_ID, 'my-dex')).rejects.toThrow(GitHubApiError);
    });

    it('throws GitHubApiError for a 401 Unauthorized response', async () => {
        const errorBody = { message: 'Bad credentials' };
        vi.stubGlobal('fetch', vi.fn().mockResolvedValue(mockResponse(401, errorBody)));

        const { GitHubApiError } = await import('./github.service');
        await expect(service.createRepository(USER_ID, 'my-dex')).rejects.toThrow(GitHubApiError);
    });

    it('includes the HTTP status code in GitHubApiError', async () => {
        const errorBody = { message: 'Forbidden' };
        vi.stubGlobal('fetch', vi.fn().mockResolvedValue(mockResponse(403, errorBody)));

        const { GitHubApiError } = await import('./github.service');
        try {
            await service.createRepository(USER_ID, 'my-dex');
            expect.fail('Expected GitHubApiError to be thrown');
        } catch (err) {
            expect(err).toBeInstanceOf(GitHubApiError);
            expect((err as InstanceType<typeof GitHubApiError>).status).toBe(403);
        }
    });

    it('throws GitHubTokenMissingError when profile has no github_token_encrypted', async () => {
        mockFrom.mockReturnValue(
            makeProfileQuery({ data: { github_token_encrypted: null } })
        );

        const { GitHubTokenMissingError } = await import('./github.service');
        await expect(service.createRepository(USER_ID, 'my-dex')).rejects.toThrow(
            GitHubTokenMissingError
        );
    });

    it('throws GitHubTokenMissingError when Supabase returns an error', async () => {
        mockFrom.mockReturnValue(
            makeProfileQuery({ data: null, error: { message: 'Row not found' } })
        );

        const { GitHubTokenMissingError } = await import('./github.service');
        await expect(service.createRepository(USER_ID, 'my-dex')).rejects.toThrow(
            GitHubTokenMissingError
        );
    });

    it('queries the profiles table for the correct userId', async () => {
        const profileQuery = makeProfileQuery({
            data: { github_token_encrypted: ENCRYPTED_TOKEN },
        });
        mockFrom.mockReturnValue(profileQuery);
        vi.stubGlobal('fetch', vi.fn().mockResolvedValue(mockResponse(201, makeGitHubPayload())));

        await service.createRepository(USER_ID, 'my-dex');

        expect(mockFrom).toHaveBeenCalledWith('profiles');
        expect(profileQuery.eq).toHaveBeenCalledWith('id', USER_ID);
    });
});

// ── sanitizeRepoName ──────────────────────────────────────────────────────────

describe('GitHubService.sanitizeRepoName', () => {
    it('lowercases the input', () => {
        expect(service.sanitizeRepoName('MyDex')).toBe('mydex');
    });

    it('replaces spaces with hyphens', () => {
        expect(service.sanitizeRepoName('my dex project')).toBe('my-dex-project');
    });

    it('replaces special characters with hyphens', () => {
        expect(service.sanitizeRepoName('my@dex!project')).toBe('my-dex-project');
    });

    it('collapses consecutive hyphens into one', () => {
        expect(service.sanitizeRepoName('my---dex')).toBe('my-dex');
    });

    it('strips leading hyphens', () => {
        expect(service.sanitizeRepoName('--my-dex')).toBe('my-dex');
    });

    it('strips trailing hyphens', () => {
        expect(service.sanitizeRepoName('my-dex--')).toBe('my-dex');
    });

    it('strips leading dots', () => {
        expect(service.sanitizeRepoName('...my-dex')).toBe('my-dex');
    });

    it('allows underscores and dots within the name', () => {
        expect(service.sanitizeRepoName('my_dex.v2')).toBe('my_dex.v2');
    });

    it('truncates names longer than 100 characters', () => {
        const longName = 'a'.repeat(150);
        expect(service.sanitizeRepoName(longName)).toHaveLength(100);
    });

    it('returns "repository" for an input that collapses to empty', () => {
        expect(service.sanitizeRepoName('---')).toBe('repository');
        expect(service.sanitizeRepoName('!!!')).toBe('repository');
    });
});
