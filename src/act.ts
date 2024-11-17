import * as path from "path";
import { commands, ExtensionContext, ShellExecution, TaskGroup, TaskPanelKind, TaskRevealKind, tasks, TaskScope, Uri, window, workspace, WorkspaceFolder } from "vscode";
import { ComponentsManager } from "./componentsManager";
import { historyTreeDataProvider } from './extension';
import { HistoryManager, HistoryStatus } from './historyManager';
import { SettingsManager } from './settingsManager';
import { StorageKey, StorageManager } from './storageManager';
import { Job, Workflow, WorkflowsManager } from "./workflowsManager";

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
    Input = '--input',
    Job = '-j',
    Platform = '-P',
    Secret = '--secret',
    Var = '--var',
    Workflows = '-W'
}

export interface CommandArgs {
    fsPath: string,
    options: string,
    name: string,
    extraHeader: { key: string, value: string }[]
}

export class Act {
    private static base: string = 'act';
    storageManager: StorageManager;
    componentsManager: ComponentsManager;
    workflowsManager: WorkflowsManager;
    historyManager: HistoryManager;
    settingsManager: SettingsManager;
    installationCommands: { [packageManager: string]: string };
    prebuiltExecutables: { [architecture: string]: string };

    constructor(context: ExtensionContext) {
        this.storageManager = new StorageManager(context);
        this.componentsManager = new ComponentsManager();
        this.workflowsManager = new WorkflowsManager();
        this.historyManager = new HistoryManager(this.storageManager);
        this.settingsManager = new SettingsManager(this.storageManager);

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

        let refreshInterval: NodeJS.Timeout | undefined;
        tasks.onDidStartTask(e => {
            const taskDefinition = e.execution.task.definition;
            if (taskDefinition.type === 'GitHub Local Actions' && !refreshInterval) {
                refreshInterval = setInterval(() => {
                    historyTreeDataProvider.refresh();
                }, 1000);
            }
        });
        tasks.onDidEndTask(e => {
            const taskDefinition = e.execution.task.definition;
            if (taskDefinition.type === 'GitHub Local Actions') {
                if (refreshInterval) {
                    clearInterval(refreshInterval);
                    refreshInterval = undefined;
                }
            }
        });

        tasks.onDidStartTaskProcess(e => {
            const taskDefinition = e.execution.task.definition;
            if (taskDefinition.type === 'GitHub Local Actions') {
                const commandArgs: CommandArgs = taskDefinition.commandArgs;
                const historyIndex = taskDefinition.historyIndex;

                // Initialize history for workspace
                if (!this.historyManager.workspaceHistory[commandArgs.fsPath]) {
                    this.historyManager.workspaceHistory[commandArgs.fsPath] = [];
                    this.storageManager.update(StorageKey.WorkspaceHistory, this.historyManager.workspaceHistory);
                }

                // Add new entry to workspace history
                this.historyManager.workspaceHistory[commandArgs.fsPath].push({
                    index: historyIndex,
                    count: taskDefinition.count,
                    name: `${commandArgs.name}`,
                    status: HistoryStatus.Running,
                    date: {
                        start: new Date().toString()
                    },
                    taskExecution: e.execution,
                    commandArgs: commandArgs
                });
                historyTreeDataProvider.refresh();
                this.storageManager.update(StorageKey.WorkspaceHistory, this.historyManager.workspaceHistory);
            }
        });
        tasks.onDidEndTaskProcess(e => {
            const taskDefinition = e.execution.task.definition;
            if (taskDefinition.type === 'GitHub Local Actions') {
                const commandArgs: CommandArgs = taskDefinition.commandArgs;
                const historyIndex = taskDefinition.historyIndex;

                // Set end status
                if (this.historyManager.workspaceHistory[commandArgs.fsPath][historyIndex].status === HistoryStatus.Running) {
                    if (e.exitCode === 0) {
                        this.historyManager.workspaceHistory[commandArgs.fsPath][historyIndex].status = HistoryStatus.Success;
                    } else if (!e.exitCode) {
                        this.historyManager.workspaceHistory[commandArgs.fsPath][historyIndex].status = HistoryStatus.Cancelled;
                    } else {
                        this.historyManager.workspaceHistory[commandArgs.fsPath][historyIndex].status = HistoryStatus.Failed;
                    }
                }

                // Set end time
                this.historyManager.workspaceHistory[commandArgs.fsPath][historyIndex].date.end = new Date().toString();

                historyTreeDataProvider.refresh();
                this.storageManager.update(StorageKey.WorkspaceHistory, this.historyManager.workspaceHistory);
            }
        });
    }

    async runAllWorkflows(workspaceFolder: WorkspaceFolder) {
        return await this.runCommand({
            fsPath: workspaceFolder.uri.fsPath,
            options: ``,
            name: workspaceFolder.name,
            extraHeader: []
        });
    }

    async runWorkflow(workspaceFolder: WorkspaceFolder, workflow: Workflow) {
        return await this.runCommand({
            fsPath: workspaceFolder.uri.fsPath,
            options: `${Option.Workflows} ".github/workflows/${path.parse(workflow.uri.fsPath).base}"`,
            name: workflow.name,
            extraHeader: [
                { key: 'Workflow', value: workflow.name }
            ]
        });
    }

    async runJob(workspaceFolder: WorkspaceFolder, workflow: Workflow, job: Job) {
        return await this.runCommand({
            fsPath: workspaceFolder.uri.fsPath,
            options: `${Option.Workflows} ".github/workflows/${path.parse(workflow.uri.fsPath).base}" ${Option.Job} "${job.id}"`,
            name: `${workflow.name}/${job.name}`,
            extraHeader: [
                { key: 'Workflow', value: workflow.name },
                { key: 'Job', value: job.name }
            ]
        });
    }

    async runEvent(workspaceFolder: WorkspaceFolder, event: Event) {
        return await this.runCommand({
            fsPath: workspaceFolder.uri.fsPath,
            options: event,
            name: event,
            extraHeader: [
                { key: 'Event', value: event }
            ]
        });
    }

    async runCommand(commandArgs: CommandArgs) {
        const unreadyComponents = await this.componentsManager.getUnreadyComponents();
        if (unreadyComponents.length > 0) {
            window.showErrorMessage(`The following required components are not ready: ${unreadyComponents.map(component => component.name).join(', ')}`, 'Fix...').then(async value => {
                if (value === 'Fix...') {
                    await commands.executeCommand('components.focus');
                }
            });
            return;
        }

        const workspaceFolder = workspace.getWorkspaceFolder(Uri.file(commandArgs.fsPath));
        if (!workspaceFolder) {
            window.showErrorMessage(`Failed to locate workspace folder for ${commandArgs.fsPath}`);
            return;
        }

        const secrets = (await this.settingsManager.getSetting(workspaceFolder, SettingsManager.secretsRegExp, StorageKey.Secrets)).filter(secret => secret.selected && secret.value);
        const variables = (await this.settingsManager.getSetting(workspaceFolder, SettingsManager.variablesRegExp, StorageKey.Variables)).filter(variable => variable.selected && variable.value);
        const inputs = (await this.settingsManager.getSetting(workspaceFolder, SettingsManager.inputsRegExp, StorageKey.Inputs)).filter(input => input.selected && input.value);
        const runners = (await this.settingsManager.getSetting(workspaceFolder, SettingsManager.runnersRegExp, StorageKey.Runners)).filter(runner => runner.selected && runner.value);
        const command = `${Act.base} ` +
            (variables.length > 0 ? ` ${Option.Var} ${variables.map(variable => `${variable.key}=${variable.value}`).join(` ${Option.Var} `)}` : ``) +
            (inputs.length > 0 ? ` ${Option.Input} ${inputs.map(input => `${input.key}=${input.value}`).join(` ${Option.Input} `)}` : ``) +
            (runners.length > 0 ? ` ${Option.Platform} ${runners.map(runner => `${runner.key}=${runner.value}`).join(` ${Option.Platform} `)}` : ``) +
            ` ${commandArgs.options}`;

        const historyIndex = this.historyManager.workspaceHistory[commandArgs.fsPath].length;
        const matchingTasks = this.historyManager.workspaceHistory[commandArgs.fsPath]
            .filter(history => history.name === commandArgs.name)
            .sort((a, b) => b.count - a.count);
        const count = matchingTasks && matchingTasks.length > 0 ? matchingTasks[0].count + 1 : 1;

        const taskExecution = await tasks.executeTask({
            name: `${commandArgs.name} #${count}`,
            detail: `${commandArgs.name} #${count}`,
            definition: { type: 'GitHub Local Actions', commandArgs: commandArgs, historyIndex: historyIndex, count: count },
            source: 'GitHub Local Actions',
            scope: workspaceFolder || TaskScope.Workspace,
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
            execution: new ShellExecution(command, { cwd: commandArgs.fsPath })
        });
        this.storageManager.update(StorageKey.WorkspaceHistory, this.historyManager.workspaceHistory);
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
}