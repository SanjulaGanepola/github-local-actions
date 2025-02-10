import * as childProcess from "child_process";
import { Octokit } from "octokit";
import * as path from "path";
import { authentication, AuthenticationSession, commands, extensions, ShellExecution, TaskGroup, TaskPanelKind, TaskRevealKind, tasks, TaskScope, window, WorkspaceFolder } from "vscode";
import { GitExtension } from "./import/git";

export interface Response<T> {
    data: T,
    error?: string
}

export interface GithubRepository {
    owner: string,
    repo: string
}

export interface GithubEnvironment {
    name: string
}

export interface GithubVariable {
    name: string,
    value: string
}

export class GitHubManager {
    async getRepository(workspaceFolder: WorkspaceFolder, command: string, args: any[]): Promise<GithubRepository | undefined> {
        const gitApi = extensions.getExtension<GitExtension>('vscode.git')?.exports.getAPI(1);
        if (gitApi) {
            if (gitApi.state === 'initialized') {
                const repository = gitApi.getRepository(workspaceFolder.uri);

                if (repository) {
                    const remoteOriginUrl = await repository.getConfig('remote.origin.url');

                    if (remoteOriginUrl) {
                        const parsedPath = path.parse(remoteOriginUrl);
                        const parsedParentPath = path.parse(parsedPath.dir);

                        return {
                            owner: parsedParentPath.name,
                            repo: parsedPath.name
                        };
                    } else {
                        window.showErrorMessage('Remote GitHub URL not found.');
                    }
                } else {
                    window.showErrorMessage(`${workspaceFolder.name} does not have a Git repository`);
                }
            } else {
                window.showErrorMessage('Git extension is still being initialized. Please try again later.', 'Try Again').then(async value => {
                    if (value && value === 'Try Again') {
                        await commands.executeCommand(command, ...args);
                    }
                });
            }
        } else {
            window.showErrorMessage('Failed to load VS Code Git API.');
        }
    }

    async getEnvironments(owner: string, repo: string): Promise<Response<GithubEnvironment[]>> {
        const environments: Response<GithubEnvironment[]> = {
            data: []
        };

        try {
            const response = await this.get(
                owner,
                repo,
                '/repos/{owner}/{repo}/environments'
            );

            if (response) {
                for (const environment of response.environments) {
                    environments.data.push({
                        name: environment.name
                    });
                }
            }
        } catch (error: any) {
            environments.error = error.message ? error.message : error;
        }

        return environments;
    }

    async getVariables(owner: string, repo: string, environment?: string): Promise<Response<GithubVariable[]>> {
        const variables: Response<GithubVariable[]> = {
            data: []
        };

        try {
            const response = environment ?
                await this.get(
                    owner,
                    repo,
                    '/repos/{owner}/{repo}/environments/{environment_name}/variables',
                    {
                        environment_name: environment
                    }
                ) :
                await this.get(
                    owner,
                    repo,
                    '/repos/{owner}/{repo}/actions/variables'
                );

            if (response) {
                for (const variable of response.variables) {
                    variables.data.push({
                        name: variable.name,
                        value: variable.value
                    });
                }
            }
        } catch (error: any) {
            variables.error = error.message ? error.message : error;
        }

        return variables;
    }

    private async get(owner: string, repo: string, endpoint: string, additionalParams?: Record<string, any>) {
        const session = await this.getSession();
        if (!session) {
            return;
        }

        const octokit = new Octokit({
            auth: session.accessToken
        });

        const response = await octokit.request(`GET ${endpoint}`, {
            owner: owner,
            repo: repo,
            ...additionalParams,
            headers: {
                'X-GitHub-Api-Version': '2022-11-28'
            }
        });

        if (response.status === 200) {
            return response.data;
        }
    }

    private async getSession(): Promise<AuthenticationSession | undefined> {
        try {
            return await authentication.getSession('github', ['repo'], { createIfNone: true });
        } catch (error: any) {
            window.showErrorMessage(`Failed to authenticate to GitHub. Error ${error}`);
            return;
        }
    }

    public async getGithubCLIToken(): Promise<string | undefined> {
        return new Promise<string | undefined>((resolve, reject) => {
            childProcess.exec('gh auth token', (error, stdout, stderr) => {
                if (error) {
                    const errorMessage = (String(stderr).charAt(0).toUpperCase() + String(stderr).slice(1)).trim();
                    window.showErrorMessage(`${errorMessage}. Login and try again to enable your GitHub CLI token.`, 'Login').then(async value => {
                        if (value === 'Login') {
                            await tasks.executeTask({
                                name: 'GitHub CLI',
                                detail: 'Authenticate with a GitHub host',
                                definition: {
                                    type: 'Authenticate with a GitHub host'
                                },
                                source: 'GitHub Local Actions',
                                scope: TaskScope.Workspace,
                                isBackground: true,
                                presentationOptions: {
                                    reveal: TaskRevealKind.Always,
                                    focus: false,
                                    clear: true,
                                    close: false,
                                    echo: true,
                                    panel: TaskPanelKind.Shared,
                                    showReuseMessage: false
                                },
                                problemMatchers: [],
                                runOptions: {},
                                group: TaskGroup.Build,
                                execution: new ShellExecution('gh auth login')
                            });
                        }
                    });
                    resolve(undefined);
                } else {
                    resolve(stdout);
                }
            });
        });
    }
}