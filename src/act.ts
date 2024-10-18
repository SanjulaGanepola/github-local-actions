import * as child_process from 'child_process';
import * as path from "path";
import { commands, CustomExecution, env, EventEmitter, ExtensionContext, Pseudoterminal, ShellExecution, TaskDefinition, TaskExecution, TaskGroup, TaskPanelKind, TaskRevealKind, tasks, TaskScope, TerminalDimensions, window, workspace, WorkspaceFolder } from "vscode";
import { ComponentsManager } from "./componentsManager";
import { historyTreeDataProvider } from './extension';
import { SettingsManager } from './settingsManager';
import { StorageKey, StorageManager } from './storageManager';
import { Workflow, WorkflowsManager } from "./workflowsManager";

export enum Event {
    BranchProtectionRule = 'branch_protection_rule',
    CheckRun = 'check_run',
    CheckSuite = 'check_suite',
    Create = 'create',
    Delete = 'delete',
    Deployment = 'deployment',
    DeploymentStatus = 'deployment_status',
    Discussion = 'discussion',
    DiscussionComment = 'discussion_comment',
    Fork = 'fork',
    Gollum = 'gollum',
    IssueComment = 'issue_comment',
    Issues = 'issues',
    Label = 'label',
    MergeGroup = 'merge_group',
    Milestone = 'milestone',
    PageBuild = 'page_build',
    Public = 'public',
    PullRequest = 'pull_request',
    PullRequestComment = 'pull_request_comment',
    PullRequestReview = 'pull_request_review',
    PullRequestReviewComment = 'pull_request_review_comment',
    PullRequestTarget = 'pull_request_target',
    Push = 'push',
    RegistryPackage = 'registry_package',
    Release = 'release',
    RepositoryDispatch = 'repository_dispatch',
    Schedule = 'schedule',
    Status = 'status',
    Watch = 'watch',
    WorkflowCall = 'workflow_call',
    WorkflowDispatch = 'workflow_dispatch',
    WorkflowRun = 'workflow_run'
}

export enum Option {
    Workflows = '--workflows',
    Job = '--job',
    Variable = '--var',
    Json = "--json"
}

export interface History {
    index: number,
    name: string,
    status: HistoryStatus,
    date?: {
        start: string,
        end: string,
    }
    output?: string,
    taskExecution?: TaskExecution,
    commandArgs: CommandArgs
}

export enum HistoryStatus {
    Running = 'Running',
    Success = 'Success',
    Failed = 'Failed',
    Cancelled = 'Cancelled'
}

export interface CommandArgs {
    workspaceFolder: WorkspaceFolder,
    options: string,
    name: string,
    typeText: string[]
}

export class Act {
    private static base: string = 'act';
    componentsManager: ComponentsManager;
    workflowsManager: WorkflowsManager;
    settingsManager: SettingsManager;
    storageManager: StorageManager;
    workspaceHistory: { [path: string]: History[] };
    installationCommands: { [packageManager: string]: string };
    prebuiltExecutables: { [architecture: string]: string };

    constructor(context: ExtensionContext) {
        this.componentsManager = new ComponentsManager();
        this.workflowsManager = new WorkflowsManager();
        this.settingsManager = new SettingsManager();
        this.storageManager = new StorageManager(context);

        const workspaceHistory = this.storageManager.get<{ [path: string]: History[] }>(StorageKey.WorkspaceHistory) || {};
        for (const [path, historyLogs] of Object.entries(workspaceHistory)) {
            workspaceHistory[path] = historyLogs.map(history => {
                if (history.status === HistoryStatus.Running) {
                    history.status = HistoryStatus.Cancelled;
                }

                return history;
            });
        }
        this.workspaceHistory = workspaceHistory;

        switch (process.platform) {
            case 'win32':
                this.installationCommands = {
                    'Chocolatey': 'choco install act-cli',
                    'Winget': 'winget install nektos.act',
                    'Scoop': 'scoop install act',
                    'GitHub CLI': 'gh extension install https://github.com/nektos/gh-act'
                };

                this.prebuiltExecutables = {
                    'Windows 64-bit (arm64/aarch64)': 'https://github.com/nektos/act/releases/latest/download/act_Windows_arm64.zip',
                    'Windows 64-bit (amd64/x86_64)': 'https://github.com/nektos/act/releases/latest/download/act_Windows_x86_64.zip',
                    'Windows 32-bit (armv7)': 'https://github.com/nektos/act/releases/latest/download/act_Windows_armv7.zip',
                    'Windows 32-bit (i386/x86)': 'https://github.com/nektos/act/releases/latest/download/act_Windows_i386.zip'
                };
                break;
            case 'darwin':
                this.installationCommands = {
                    'Homebrew': 'brew install act',
                    'Nix': 'nix run nixpkgs#act',
                    'MacPorts': 'sudo port install act',
                    'GitHub CLI': 'gh extension install https://github.com/nektos/gh-act'
                };

                this.prebuiltExecutables = {
                    'macOS 64-bit (Apple Silicon)': 'https://github.com/nektos/act/releases/latest/download/act_Darwin_arm64.tar.gz',
                    'macOS 64-bit (Intel)': 'https://github.com/nektos/act/releases/latest/download/act_Darwin_x86_64.tar.gz'
                };
                break;
            case 'linux':
                this.installationCommands = {
                    'Homebrew': 'brew install act',
                    'Nix': 'nix run nixpkgs#act',
                    'AUR': 'yay -Syu act',
                    'COPR': 'dnf copr enable goncalossilva/act && dnf install act-cli',
                    'GitHub CLI': 'gh extension install https://github.com/nektos/gh-act'
                };

                this.prebuiltExecutables = {
                    'Linux 64-bit (arm64/aarch64)': 'https://github.com/nektos/act/releases/latest/download/act_Linux_arm64.tar.gz',
                    'Linux 64-bit (amd64/x86_64)': 'https://github.com/nektos/act/releases/latest/download/act_Linux_x86_64.tar.gz',
                    'Linux 32-bit (armv7)': 'https://github.com/nektos/act/releases/latest/download/act_Linux_armv7.tar.gz',
                    'Linux 32-bit (armv6)': 'https://github.com/nektos/act/releases/latest/download/act_Linux_armv6.tar.gz',
                    'Linux 32-bit (i386/x86)': 'https://github.com/nektos/act/releases/latest/download/act_Linux_i386.tar.gz',
                };
                break;
            default:
                this.installationCommands = {};
                this.prebuiltExecutables = {};
        }
    }

    async runAllWorkflows() {
        // TODO: Implement
    }

    async runWorkflow(workflow: Workflow) {
        const workspaceFolder = workspace.getWorkspaceFolder(workflow.uri);
        if (workspaceFolder) {
            return await this.runCommand({
                workspaceFolder: workspaceFolder,
                options: `${Option.Workflows} ".github/workflows/${path.parse(workflow.uri.fsPath).base}"`,
                name: workflow.name,
                typeText: [
                    `Workflow:     ${workflow.name}`
                ]
            });
        } else {
            window.showErrorMessage(`Failed to locate workspace folder for ${workflow.uri.fsPath}`);
        }
    }

    // TODO: Implement
    // async runJob(workspaceFolder: WorkspaceFolder, workflow: Workflow, job: Job) {
    //     return await this.runCommand(workspaceFolder, `${Option.Workflows} ".github/workflows/${path.parse(workflow.uri.fsPath).base}" ${Option.Job} "${job.id}"`, `${workflow.name}/${job.name}`, [`Workflow:     ${workflow.name}`, `Job:          ${job.name}`]);
    // }

    // TODO: Implement
    // async runEvent(workspaceFolder: WorkspaceFolder, event: Event) {
    //     return await this.runCommand(workspaceFolder, `${Option.Workflows} ${event}`, event, [`Event:        ${event}`]);
    // }

    async runCommand(commandArgs: CommandArgs) {
        const command = `${Act.base} ${Option.Json} ${commandArgs.options}`;

        const unreadyComponents = await this.componentsManager.getUnreadyComponents();
        if (unreadyComponents.length > 0) {
            window.showErrorMessage(`The following required components are not ready: ${unreadyComponents.map(component => component.name).join(', ')}`, 'Fix...').then(async value => {
                if (value === 'Fix...') {
                    await commands.executeCommand('components.focus');
                }
            });
            return;
        }

        if (!this.workspaceHistory[commandArgs.workspaceFolder.uri.fsPath]) {
            this.workspaceHistory[commandArgs.workspaceFolder.uri.fsPath] = [];
            this.storageManager.update(StorageKey.WorkspaceHistory, this.workspaceHistory);
        }

        const historyIndex = this.workspaceHistory[commandArgs.workspaceFolder.uri.fsPath].length;
        this.workspaceHistory[commandArgs.workspaceFolder.uri.fsPath].unshift({
            index: historyIndex,
            name: `${commandArgs.name} #${this.workspaceHistory[commandArgs.workspaceFolder.uri.fsPath].length + 1}`,
            status: HistoryStatus.Running,
            commandArgs: commandArgs
        });
        historyTreeDataProvider.refresh();
        this.storageManager.update(StorageKey.WorkspaceHistory, this.workspaceHistory);

        this.workspaceHistory[commandArgs.workspaceFolder.uri.fsPath][historyIndex].taskExecution = await tasks.executeTask({
            name: commandArgs.name,
            detail: 'Run workflow',
            definition: { type: 'GitHub Local Actions' },
            source: 'GitHub Local Actions',
            scope: commandArgs.workspaceFolder || TaskScope.Workspace,
            isBackground: true,
            presentationOptions: {
                reveal: TaskRevealKind.Always,
                focus: false,
                clear: true,
                close: false,
                echo: true,
                panel: TaskPanelKind.Dedicated,
                showReuseMessage: false
            },
            problemMatchers: [],
            runOptions: {},
            group: TaskGroup.Build,
            execution: new CustomExecution(async (resolvedDefinition: TaskDefinition): Promise<Pseudoterminal> => {
                const writeEmitter = new EventEmitter<string>();
                const closeEmitter = new EventEmitter<number>();

                writeEmitter.event(data => {
                    if (!this.workspaceHistory[commandArgs.workspaceFolder.uri.fsPath][historyIndex].output) {
                        this.workspaceHistory[commandArgs.workspaceFolder.uri.fsPath][historyIndex].output = data;
                    } else {
                        this.workspaceHistory[commandArgs.workspaceFolder.uri.fsPath][historyIndex].output += data;
                    }
                    this.storageManager.update(StorageKey.WorkspaceHistory, this.workspaceHistory);
                });

                const exec = child_process.spawn(command, { cwd: commandArgs.workspaceFolder.uri.fsPath, shell: env.shell });
                const setDate = (actDate?: string) => {
                    const date = actDate ? new Date(actDate).toString() : new Date().toString();

                    if (!this.workspaceHistory[commandArgs.workspaceFolder.uri.fsPath][historyIndex].date) {
                        this.workspaceHistory[commandArgs.workspaceFolder.uri.fsPath][historyIndex].date = {
                            start: date,
                            end: date,
                        }
                    } else {
                        this.workspaceHistory[commandArgs.workspaceFolder.uri.fsPath][historyIndex].date!.end = date;
                    }
                }
                const handleIO = (data: any) => {
                    const lines: string[] = data.toString().split('\n').filter((line: string) => line != '');
                    for (const line of lines) {
                        const jsonLine = JSON.parse(line);
                        setDate(jsonLine.time);

                        if (jsonLine.jobResult) {
                            switch (jsonLine.jobResult) {
                                case 'success':
                                    this.workspaceHistory[commandArgs.workspaceFolder.uri.fsPath][historyIndex].status = HistoryStatus.Success;
                                    break;
                                case 'failure':
                                    this.workspaceHistory[commandArgs.workspaceFolder.uri.fsPath][historyIndex].status = HistoryStatus.Failed;
                                    break;
                            }
                        }

                        historyTreeDataProvider.refresh();
                        this.storageManager.update(StorageKey.WorkspaceHistory, this.workspaceHistory);
                        writeEmitter.fire(`${jsonLine.msg.trimEnd()}\r\n`);
                    }
                }
                exec.stdout.on('data', handleIO);
                exec.stderr.on('data', handleIO);
                exec.on('close', (code) => {
                    setDate();

                    if (this.workspaceHistory[commandArgs.workspaceFolder.uri.fsPath][historyIndex].status === HistoryStatus.Running) {
                        this.workspaceHistory[commandArgs.workspaceFolder.uri.fsPath][historyIndex].status = HistoryStatus.Failed;
                    }

                    historyTreeDataProvider.refresh();
                    this.storageManager.update(StorageKey.WorkspaceHistory, this.workspaceHistory);
                    closeEmitter.fire(code || 0);
                });

                return {
                    onDidWrite: writeEmitter.event,
                    onDidClose: closeEmitter.event,
                    open: async (initialDimensions: TerminalDimensions | undefined): Promise<void> => {
                        writeEmitter.fire(`Name:         ${commandArgs.name}\r\n`);
                        writeEmitter.fire(`Path:         ${commandArgs.workspaceFolder.uri.fsPath}\r\n`);
                        for (const text of commandArgs.typeText) {
                            writeEmitter.fire(`${text}\r\n`);
                        }
                        writeEmitter.fire(`Environments: OSSBUILD\r\n`);
                        writeEmitter.fire(`Variables:    VARIABLE1=ABC, VARIABLE2=DEF\r\n`);
                        writeEmitter.fire(`Secrets:      SECRET1=ABC, SECRET2=DEF\r\n`);
                        writeEmitter.fire(`Command:      ${command}\r\n`);
                        writeEmitter.fire(`\r\n`);
                    },

                    close: () => {
                        if (this.workspaceHistory[commandArgs.workspaceFolder.uri.fsPath][historyIndex].status === HistoryStatus.Running) {
                            this.workspaceHistory[commandArgs.workspaceFolder.uri.fsPath][historyIndex].status = HistoryStatus.Cancelled;
                        }

                        historyTreeDataProvider.refresh();
                        this.storageManager.update(StorageKey.WorkspaceHistory, this.workspaceHistory);

                        exec.stdout.destroy();
                        exec.stdin.destroy();
                        exec.stderr.destroy();
                        exec.kill();
                    }
                };
            })
        });
        this.storageManager.update(StorageKey.WorkspaceHistory, this.workspaceHistory);
    }

    async install(packageManager: string) {
        const command = this.installationCommands[packageManager];
        if (command) {
            await tasks.executeTask({
                name: 'nektos/act',
                detail: 'Install nektos/act',
                definition: { type: 'GitHub Local Actions' },
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
                execution: new ShellExecution(command)
            });
        }
    }

    async clearAll() {
        //TODO: Fix for multi workspace support
        const workspaceFolders = workspace.workspaceFolders;
        if (workspaceFolders && workspaceFolders.length > 0) {
            for (const workspaceFolder of workspaceFolders) {
                this.workspaceHistory[workspaceFolder.uri.fsPath] = [];
                historyTreeDataProvider.refresh();
                this.storageManager.update(StorageKey.WorkspaceHistory, this.workspaceHistory);
            }
        }
    }

    async viewOutput(history: History) {
        await workspace.openTextDocument({ content: history.output }).then(async document => {
            await window.showTextDocument(document);
        })
    }

    async stop(history: History) {
        history.taskExecution?.terminate();
        historyTreeDataProvider.refresh();
    }

    async remove(history: History) {
        const historyIndex = this.workspaceHistory[history.commandArgs.workspaceFolder.uri.fsPath].findIndex(workspaceHistory => workspaceHistory.index === history.index)
        this.workspaceHistory[history.commandArgs.workspaceFolder.uri.fsPath].splice(historyIndex, 1);
        historyTreeDataProvider.refresh();
        this.storageManager.update(StorageKey.WorkspaceHistory, this.workspaceHistory);
    }
}