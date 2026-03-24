/**
 * GitHub service types
 *
 * Used by GitHubService to create repositories and return identifiers needed
 * for the subsequent code-push and Vercel deployment stages in the pipeline.
 */

/** Options for repository creation. */
export interface GitHubRepoCreateOptions {
    /** Human-readable description shown on the repository page. */
    description?: string;
    /** Whether the repository should be private. Defaults to true. */
    isPrivate?: boolean;
    /**
     * Initialise the repository with an empty README so it has at least one
     * commit and a default branch.  Required when you want to push immediately
     * via the Git Data API without a prior `git init` step.  Defaults to false.
     */
    autoInit?: boolean;
    /**
     * Maximum number of name candidates to try before giving up on collision
     * resolution.  Attempts are: `name`, `name-2`, …, `name-{maxRetries}`.
     * Defaults to 5.
     */
    maxRetries?: number;
}

/**
 * Identifiers returned after successful repository creation.
 * Every field that a downstream push or deployment step might need is included
 * so callers do not have to make extra API calls.
 */
export interface GitHubRepoResult {
    /** GitHub's internal numeric repository ID. */
    id: number;
    /** GitHub's global Node ID (used by the GraphQL API). */
    nodeId: string;
    /** The repository's short name (without the owner prefix). */
    name: string;
    /** Owner-qualified name, e.g. `"acme/my-dex"`. */
    fullName: string;
    /** HTTPS URL to the repository page, e.g. `"https://github.com/acme/my-dex"`. */
    htmlUrl: string;
    /** HTTPS clone URL — use this for the code-push stage. */
    cloneUrl: string;
    /** SSH clone URL — alternative for the code-push stage. */
    sshUrl: string;
    /** The default branch name (typically `"main"`). */
    defaultBranch: string;
    /** Whether the repository is private. */
    private: boolean;
}
