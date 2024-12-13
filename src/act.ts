import * as childProcess from "child_process";
import * as fs from "fs/promises";
import * as path from "path";
import sanitize from "sanitize-filename";
import { commands, CustomExecution, env, EventEmitter, ExtensionContext, Pseudoterminal, ShellExecution, TaskDefinition, TaskGroup, TaskPanelKind, TaskRevealKind, tasks, TaskScope, TerminalDimensions, Uri, window, workspace, WorkspaceFolder } from "vscode";
import { ComponentsManager } from "./componentsManager";
import { ConfigurationManager, Platform, Section } from "./configurationManager";
import { componentsTreeDataProvider, historyTreeDataProvider } from './extension';
import { HistoryManager, HistoryStatus } from './historyManager';
import { SecretManager } from "./secretManager";
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
    ActionCachePath = "--action-cache-path",
    ActionOfflineMode = "--action-offline-mode",
    Actor = "--actor",
    ArtifactServerAddr = "--artifact-server-addr",
    ArtifactServerPath = "--artifact-server-path",
    ArtifactServerPort = "--artifact-server-port",
    Bind = "--bind",
    BugReport = "--bug-report",
    CacheServerAddr = "--cache-server-addr",
    CacheServerPath = "--cache-server-path",
    CacheServerPort = "--cache-server-port",
    ContainerArchitecture = "--container-architecture",
    ContainerCapAdd = "--container-cap-add",
    ContainerCapDrop = "--container-cap-drop",
    ContainerDaemonSocket = "--container-daemon-socket",
    ContainerOptions = "--container-options",
    DefaultBranch = "--defaultbranch",
    DetectEvent = "--detect-event",
    Directory = "--directory",
    DryRun = "--dryrun",
    Env = "--env",
    EnvFile = "--env-file",
    EventPath = "--eventpath",
    GithubInstance = "--github-instance",
    Graph = "--graph",
    Help = "--help",
    Input = "--input",
    InputFile = "--input-file",
    InsecureSecrets = "--insecure-secrets",
    Job = "--job",
    Json = "--json",
    List = "--list",
    LocalRepository = "--local-repository",
    LogPrefixJobId = "--log-prefix-job-id",
    ManPage = "--man-page",
    Matrix = "--matrix",
    Network = "--network",
    NoCacheServer = "--no-cache-server",
    NoRecurse = "--no-recurse",
    NoSkipCheckout = "--no-skip-checkout",
    Platform = "--platform",
    Privileged = "--privileged",
    Pull = "--pull",
    Quiet = "--quiet",
    Rebuild = "--rebuild",
    RemoteName = "--remote-name",
    ReplaceGheActionTokenWithGithubCom = "--replace-ghe-action-token-with-github-com",
    ReplaceGheActionWithGithubCom = "--replace-ghe-action-with-github-com",
    Reuse = "--reuse",
    Rm = "--rm",
    Secret = "--secret",
    SecretFile = "--secret-file",
    UseGitignore = "--use-gitignore",
    UseNewActionCache = "--use-new-action-cache",
    Userns = "--userns",
    Var = "--var",
    VarFile = "--var-file",
    Verbose = "--verbose",
    Version = "--version",
    Watch = "--watch",
    Workflows = "--workflows",
}

export interface CommandArgs {
    path: string,
    workflow: Workflow,
    options: string[],
    name: string,
    extraHeader: { key: string, value: string }[]
}

export interface ActOption {
    default: string;
    name: string,
    description: string
    type: string
}

export class Act {
    static defaultActCommand: string = 'act';
    static githubCliActCommand: string = 'gh act';
    context: ExtensionContext;
    storageManager: StorageManager;
    secretManager: SecretManager;
    componentsManager: ComponentsManager;
    workflowsManager: WorkflowsManager;
    historyManager: HistoryManager;
    settingsManager: SettingsManager;
    installationCommands: { [packageManager: string]: string };
    prebuiltExecutables: { [architecture: string]: string };
    refreshInterval: NodeJS.Timeout | undefined;
    runningTaskCount: number;

    constructor(context: ExtensionContext) {
        this.context = context;
        this.storageManager = new StorageManager(context);
        this.secretManager = new SecretManager(context);
        this.componentsManager = new ComponentsManager();
        this.workflowsManager = new WorkflowsManager();
        this.historyManager = new HistoryManager(this.storageManager);
        this.settingsManager = new SettingsManager(this.storageManager, this.secretManager);
        this.runningTaskCount = 0;

        switch (process.platform) {
            case 'win32':
                this.installationCommands = {
                    'Chocolatey': 'choco install act-cli',
                    'Winget': 'winget install nektos.act',
                    'Scoop': 'scoop install act',
                    'GitHub CLI': '(gh auth status || gh auth login) && gh extension install https://github.com/nektos/gh-act'
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
                    'GitHub CLI': '(gh auth status || gh auth login) && gh extension install https://github.com/nektos/gh-act'
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
                    'Arch': 'pacman -Syu act',
                    'AUR': 'yay -Syu act',
                    'COPR': 'dnf copr enable goncalossilva/act && dnf install act-cli',
                    'GitHub CLI': '(gh auth status || gh auth login) && gh extension install https://github.com/nektos/gh-act'
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

        // Setup automatic history view refreshing
        tasks.onDidStartTask(e => {
            const taskDefinition = e.execution.task.definition;
            if (taskDefinition.type === 'GitHub Local Actions') {
                this.runningTaskCount++;

                if (!this.refreshInterval && this.runningTaskCount >= 0) {
                    this.refreshInterval = setInterval(() => {
                        historyTreeDataProvider.refresh();
                    }, 1000);
                }
            }
        });
        tasks.onDidEndTask(e => {
            const taskDefinition = e.execution.task.definition;
            if (taskDefinition.type === 'GitHub Local Actions') {
                this.runningTaskCount--;

                if (this.refreshInterval && this.runningTaskCount === 0) {
                    clearInterval(this.refreshInterval);
                    this.refreshInterval = undefined;
                }
            }
        });

        // Refresh components view after installation
        tasks.onDidEndTaskProcess(async e => {
            const taskDefinition = e.execution.task.definition;
            if (taskDefinition.type === 'nektos/act installation' && e.exitCode === 0) {
                this.updateActCommand(taskDefinition.ghCliInstall ? Act.githubCliActCommand : Act.defaultActCommand);
                componentsTreeDataProvider.refresh();
            }
        });
    }

    static getActCommand() {
        return ConfigurationManager.get<string>(Section.actCommand) || Act.defaultActCommand;
    }

    updateActCommand(newActCommand: string) {
        const actCommand = ConfigurationManager.get(Section.actCommand);

        if (newActCommand !== actCommand) {
            window.showInformationMessage(`The act command is currently set to "${actCommand}". Once the installation is complete, it is recommended to update this to "${newActCommand}" for this selected installation method.`, 'Proceed', 'Manually Edit').then(async value => {
                if (value === 'Proceed') {
                    await ConfigurationManager.set(Section.actCommand, newActCommand);
                    componentsTreeDataProvider.refresh();
                } else if (value === 'Manually Edit') {
                    await commands.executeCommand('workbench.action.openSettings', ConfigurationManager.getSearchTerm(Section.actCommand));
                }
            });
        }
    }

    async runAllWorkflows(workspaceFolder: WorkspaceFolder) {
        const workflows = await this.workflowsManager.getWorkflows(workspaceFolder);
        if (workflows.length > 0) {
            for (const workflow of workflows) {
                await this.runWorkflow(workspaceFolder, workflow);
            }
        } else {
            window.showErrorMessage('No workflows found.');
        }
    }

    async runWorkflow(workspaceFolder: WorkspaceFolder, workflow: Workflow) {
        return await this.runCommand({
            path: workspaceFolder.uri.fsPath,
            workflow: workflow,
            options: [
                `${Option.Workflows} ".github/workflows/${path.parse(workflow.uri.fsPath).base}"`
            ],
            name: workflow.name,
            extraHeader: [
                { key: 'Workflow', value: workflow.name }
            ]
        });
    }

    async runJob(workspaceFolder: WorkspaceFolder, workflow: Workflow, job: Job) {
        return await this.runCommand({
            path: workspaceFolder.uri.fsPath,
            workflow: workflow,
            options: [
                `${Option.Workflows} ".github/workflows/${path.parse(workflow.uri.fsPath).base}"`,
                `${Option.Job} "${job.id}"`
            ],
            name: `${workflow.name}/${job.name}`,
            extraHeader: [
                { key: 'Workflow', value: workflow.name },
                { key: 'Job', value: job.name }
            ]
        });
    }

    async runEvent(workspaceFolder: WorkspaceFolder, event: Event) {
        let eventExists: boolean = false;

        const workflows = await this.workflowsManager.getWorkflows(workspaceFolder);
        if (workflows.length > 0) {
            for (const workflow of workflows) {
                if (event in workflow.yaml.on) {
                    eventExists = true;
                    await this.runWorkflow(workspaceFolder, workflow);
                }
            }

            if (!eventExists) {
                window.showErrorMessage(`No workflows triggered by the ${event} event.`)
            }
        } else {
            window.showErrorMessage('No workflows found.');
        }
    }

    getOptions(): Promise<ActOption[]> {
        return new Promise<ActOption[]>((resolve, reject) => {
            const exec = childProcess.spawn(
                `${Act.getActCommand()} --list-options`,
                {
                    shell: true,
                }
            );
            let options: string = ""
            exec.stdout.on('data', b => options += b.toString());
            exec.on('exit', async (code, signal) => {
                if (code === 0) {
                    resolve(JSON.parse(options));
                } else {
                    reject(new Error("not supported by this binary"));
                }
            });
        })
    }

    async runCommand(commandArgs: CommandArgs) {
        // Check if required components are ready
        // const unreadyComponents = await this.componentsManager.getUnreadyComponents();
        // if (unreadyComponents.length > 0) {
        //     window.showErrorMessage(`The following required components are not ready: ${unreadyComponents.map(component => component.name).join(', ')}`, 'Fix...').then(async value => {
        //         if (value === 'Fix...') {
        //             await commands.executeCommand('components.focus');
        //         }
        //     });
        //     return;
        // }

        // Map to workspace folder
        const workspaceFolder = workspace.getWorkspaceFolder(Uri.file(commandArgs.path));
        if (!workspaceFolder) {
            window.showErrorMessage(`Failed to locate workspace folder for ${commandArgs.path}`);
            return;
        }

        // Initialize history for workspace
        if (!this.historyManager.workspaceHistory[commandArgs.path]) {
            this.historyManager.workspaceHistory[commandArgs.path] = [];
            await this.storageManager.update(StorageKey.WorkspaceHistory, this.historyManager.workspaceHistory);
        }

        // Process task count suffix
        const historyIndex = this.historyManager.workspaceHistory[commandArgs.path].length;
        const matchingTasks = this.historyManager.workspaceHistory[commandArgs.path]
            .filter(history => history.name === commandArgs.name)
            .sort((a, b) => b.count - a.count);
        const count = matchingTasks && matchingTasks.length > 0 ? matchingTasks[0].count + 1 : 1;

        // Process log file and path
        const start = new Date();
        const year = start.getFullYear();
        const month = (start.getMonth() + 1).toString().padStart(2, '0');
        const day = start.getDate().toString().padStart(2, '0');
        const hours = start.getHours().toString().padStart(2, '0');
        const minutes = start.getMinutes().toString().padStart(2, '0');
        const seconds = start.getSeconds().toString().padStart(2, '0');
        const logFileName = sanitize(`${commandArgs.name} #${count} - ${year}${month}${day}_${hours}${minutes}${seconds}.log`, { replacement: '_' });
        const logPath = path.join(this.context.globalStorageUri.fsPath, logFileName);

        try {
            await workspace.fs.createDirectory(this.context.globalStorageUri);
        } catch (error: any) { }

        // Build command with settings
        const actCommand = Act.getActCommand();
        const settings = await this.settingsManager.getSettings(workspaceFolder, true);

        const userOptions: string[] = [
            ...settings.secrets.map(secret => `${Option.Secret} ${secret.key}`),
            (settings.secretFiles.length > 0 ? `${Option.SecretFile} "${settings.secretFiles[0].path}"` : `${Option.SecretFile} ""`),
            ...settings.variables.map(variable => `${Option.Var} ${variable.key}=${variable.value}`),
            (settings.variableFiles.length > 0 ? `${Option.VarFile} "${settings.variableFiles[0].path}"` : `${Option.VarFile} ""`),
            ...settings.inputs.map(input => `${Option.Input} ${input.key}=${input.value}`),
            (settings.inputFiles.length > 0 ? `${Option.InputFile} "${settings.inputFiles[0].path}"` : `${Option.InputFile} ""`),
            ...settings.runners.map(runner => `${Option.Platform} ${runner.key}=${runner.value}`),
            (settings.payloadFiles.length > 0 ? `${Option.EventPath} "${settings.payloadFiles[0].path}"` : `${Option.EventPath} ""`),
            ...settings.options.map(option => option.path ? `--${option.name} ${option.path}` : `--${option.name}`)
        ];

        const command = `${actCommand} ${Option.Json} ${Option.Verbose} ${commandArgs.options.join(' ')} ${userOptions.join(' ')}`;
        const displayCommand = `${actCommand} ${commandArgs.options.join(' ')} ${userOptions.join(' ')}`;

        // Execute task
        const taskExecution = await tasks.executeTask({
            name: `${commandArgs.name} #${count}`,
            detail: `${commandArgs.name} #${count}`,
            definition: {
                type: 'GitHub Local Actions',
                commandArgs: commandArgs,
                historyIndex: historyIndex,
                count: count,
                start: start,
                logPath: logPath
            },
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
            execution: new CustomExecution(async (resolvedDefinition: TaskDefinition): Promise<Pseudoterminal> => {
                const writeEmitter = new EventEmitter<string>();
                const closeEmitter = new EventEmitter<number>();

                writeEmitter.event(async data => {
                    try {
                        // Create log file if it does not exist
                        try {
                            await fs.access(logPath);
                        } catch (error: any) {
                            await fs.writeFile(logPath, '');
                        }

                        // Append data to log file
                        await fs.appendFile(logPath, data);
                    } catch (error: any) { }
                });

                const handleIO = () => {
                    let lastline: string = "";
                    return async (data: any) => {
                        let xdata: string = data.toString();
                        let lines: string[] = xdata.split('\n').filter((line: string) => line !== '');
                        if (lastline?.length > 0) {
                            lines[0] = lastline + lines[0];
                            lastline = "";
                        }
                        if (!xdata.endsWith("\n")) {
                            lastline = lines.pop() || "";
                        }

                        for await (const line of lines) {
                            const dateString = new Date().toString();

                            let message: string;
                            try {
                                const parsedMessage = JSON.parse(line);

                                let updateHistory: boolean = true;
                                // 1. Filter all debug and trace messages except for skipped jobs and steps
                                // 2. Filter all skipped pre and post stage steps
                                if ((parsedMessage.level && ['debug', 'trace'].includes(parsedMessage.level) && parsedMessage.jobResult !== 'skipped' && parsedMessage.stepResult !== 'skipped') ||
                                    (parsedMessage.stepResult === 'skipped' && parsedMessage.stage !== 'Main')) {
                                    if (userOptions.includes(Option.Verbose)) {
                                        updateHistory = false;
                                    } else {
                                        continue;
                                    }
                                }

                                // Prepend job name to message
                                if (typeof parsedMessage.msg === 'string') {
                                    message = `${parsedMessage.job ? `[${parsedMessage.job}] ` : ``}${parsedMessage.msg}`;
                                } else {
                                    message = line;
                                }

                                if (updateHistory) {
                                    // Update job status in workspace history
                                    if (parsedMessage.jobID) {
                                        let jobName: string = parsedMessage.jobID;
                                        try {
                                            if (parsedMessage.jobID in commandArgs.workflow.yaml.jobs && commandArgs.workflow.yaml.jobs[parsedMessage.jobID].name) {
                                                // Use the name set for the job by the user
                                                jobName = commandArgs.workflow.yaml.jobs[parsedMessage.jobID].name;
                                            }
                                        } catch (error: any) { }

                                        // Update name if it is a matrix
                                        if (parsedMessage.matrix && Object.keys(parsedMessage.matrix).length > 0) {
                                            const matrixValues = Object.values(parsedMessage.matrix).join(", ");
                                            jobName = `${jobName} (${matrixValues})`;
                                        }

                                        let jobIndex = this.historyManager.workspaceHistory[commandArgs.path][historyIndex].jobs!
                                            .findIndex(job => job.name === jobName);
                                        if (jobIndex < 0) {
                                            // Add new job with setup step
                                            this.historyManager.workspaceHistory[commandArgs.path][historyIndex].jobs!.push({
                                                name: jobName,
                                                status: HistoryStatus.Running,
                                                date: {
                                                    start: dateString
                                                },
                                                steps: []
                                            });
                                            jobIndex = this.historyManager.workspaceHistory[commandArgs.path][historyIndex].jobs!.length - 1;
                                        }

                                        // Update step status in workspace history
                                        if (parsedMessage.stepID) {
                                            let stepName: string;
                                            const stepId: string = parsedMessage.stepID[0];
                                            if (parsedMessage.stage !== 'Main') {
                                                stepName = `${parsedMessage.stage} ${parsedMessage.step}`;
                                            } else {
                                                stepName = parsedMessage.step;

                                                // TODO: This forcefully sets any pre step to success. To be fixed with https://github.com/nektos/act/issues/2551
                                                const preStepName = `Pre ${parsedMessage.step}`;
                                                let preStepIndex = this.historyManager.workspaceHistory[commandArgs.path][historyIndex].jobs![jobIndex].steps!
                                                    .findIndex(step => step.id === stepId && step.name === preStepName);
                                                if (preStepIndex > -1 && this.historyManager.workspaceHistory[commandArgs.path][historyIndex].jobs![jobIndex].steps![preStepIndex].status === HistoryStatus.Running) {

                                                    this.historyManager.workspaceHistory[commandArgs.path][historyIndex].jobs![jobIndex].steps![preStepIndex].status = HistoryStatus.Success;
                                                    this.historyManager.workspaceHistory[commandArgs.path][historyIndex].jobs![jobIndex].steps![preStepIndex].date.end = dateString;
                                                }
                                            }

                                            let stepIndex = this.historyManager.workspaceHistory[commandArgs.path][historyIndex].jobs![jobIndex].steps!
                                                .findIndex(step => step.id === stepId && step.name === stepName);
                                            if (stepIndex < 0) {
                                                // Add new step
                                                this.historyManager.workspaceHistory[commandArgs.path][historyIndex].jobs![jobIndex].steps!.push({
                                                    id: stepId,
                                                    name: stepName,
                                                    status: HistoryStatus.Running,
                                                    date: {
                                                        start: dateString
                                                    }
                                                });
                                                stepIndex = this.historyManager.workspaceHistory[commandArgs.path][historyIndex].jobs![jobIndex].steps!.length - 1;
                                            }

                                            if (parsedMessage.stepResult) {
                                                this.historyManager.workspaceHistory[commandArgs.path][historyIndex].jobs![jobIndex].steps![stepIndex].status =
                                                    HistoryManager.stepResultToHistoryStatus(parsedMessage.stepResult);
                                                this.historyManager.workspaceHistory[commandArgs.path][historyIndex].jobs![jobIndex].steps![stepIndex].date.end = dateString;
                                            }
                                        }

                                        if (parsedMessage.jobResult) {
                                            this.historyManager.workspaceHistory[commandArgs.path][historyIndex].jobs![jobIndex].status =
                                                HistoryManager.stepResultToHistoryStatus(parsedMessage.jobResult);
                                            this.historyManager.workspaceHistory[commandArgs.path][historyIndex].jobs![jobIndex].date.end =
                                                dateString;
                                        }
                                    }
                                }
                            } catch (error: any) {
                                message = line;
                            }

                            if (userOptions.includes(Option.Json)) {
                                message = line;
                            }

                            writeEmitter.fire(`${message.trimEnd()}\r\n`);
                            historyTreeDataProvider.refresh();
                        }
                        await this.storageManager.update(StorageKey.WorkspaceHistory, this.historyManager.workspaceHistory);
                    }
                };

                let shell = env.shell;
                switch (process.platform) {
                    case Platform.windows:
                        shell = 'cmd';
                        break;
                    case Platform.mac:
                        shell = 'zsh';
                        break;
                    case Platform.linux:
                        shell = 'bash';
                        break;
                }

                const exec = childProcess.spawn(
                    command,
                    {
                        cwd: commandArgs.path,
                        shell: shell,
                        env: {
                            ...process.env,
                            ...settings.secrets
                                .filter(secret => secret.value)
                                .reduce((previousValue, currentValue) => {
                                    previousValue[currentValue.key] = currentValue.value;
                                    return previousValue;
                                }, {} as Record<string, string>)
                        }
                    }
                );
                exec.stdout.on('data', handleIO());
                exec.stderr.on('data', handleIO());
                exec.on('exit', async (code, signal) => {
                    const dateString = new Date().toString();

                    // Set execution status and end time in workspace history
                    if (this.historyManager.workspaceHistory[commandArgs.path][historyIndex].status === HistoryStatus.Running) {
                        const jobAndStepStatus = (!code && code !== 0) ? HistoryStatus.Cancelled : HistoryStatus.Unknown;
                        this.historyManager.workspaceHistory[commandArgs.path][historyIndex].jobs?.forEach((job, jobIndex) => {
                            this.historyManager.workspaceHistory[commandArgs.path][historyIndex].jobs![jobIndex].steps?.forEach((step, stepIndex) => {
                                if (step.status === HistoryStatus.Running) {
                                    // Update status of all running steps
                                    this.historyManager.workspaceHistory[commandArgs.path][historyIndex].jobs![jobIndex].steps![stepIndex].status = jobAndStepStatus;
                                    this.historyManager.workspaceHistory[commandArgs.path][historyIndex].jobs![jobIndex].steps![stepIndex].date.end = dateString;
                                }
                            });

                            if (job.status === HistoryStatus.Running) {
                                // Update status of all running jobs
                                this.historyManager.workspaceHistory[commandArgs.path][historyIndex].jobs![jobIndex].status = jobAndStepStatus;
                                this.historyManager.workspaceHistory[commandArgs.path][historyIndex].jobs![jobIndex].date.end = dateString;
                            }
                        });

                        // Update history status
                        if (code === 0) {
                            this.historyManager.workspaceHistory[commandArgs.path][historyIndex].status = HistoryStatus.Success;
                        } else if (!code) {
                            this.historyManager.workspaceHistory[commandArgs.path][historyIndex].status = HistoryStatus.Cancelled;
                        } else {
                            this.historyManager.workspaceHistory[commandArgs.path][historyIndex].status = HistoryStatus.Failed;
                        }
                    }
                    this.historyManager.workspaceHistory[commandArgs.path][historyIndex].date.end = dateString;
                    historyTreeDataProvider.refresh();
                    await this.storageManager.update(StorageKey.WorkspaceHistory, this.historyManager.workspaceHistory);

                    if (signal === 'SIGINT') {
                        writeEmitter.fire(`\r\n${commandArgs.name} #${count} was interrupted.\r\n`);
                        closeEmitter.fire(code || 1);
                    } else {
                        writeEmitter.fire(`\r\n${commandArgs.name} #${count} exited with exit code ${code}.\r\n`);
                        closeEmitter.fire(code || 0);
                    }
                });

                return {
                    onDidWrite: writeEmitter.event,
                    onDidClose: closeEmitter.event,
                    open: async (initialDimensions: TerminalDimensions | undefined): Promise<void> => {
                        writeEmitter.fire(`${displayCommand}\r\n\r\n`);
                    },
                    handleInput: (data: string) => {
                        if (data === '\x03') {
                            exec.kill('SIGINT');
                            exec.stdout.destroy();
                            exec.stdin.destroy();
                            exec.stderr.destroy();
                        } else {
                            exec.stdin.write(data === '\r' ? '\r\n' : data);
                        }
                    },
                    close: () => {
                        exec.kill('SIGINT');
                        exec.stdout.destroy();
                        exec.stdin.destroy();
                        exec.stderr.destroy();
                    },
                };
            })
        });

        // Add new entry to workspace history
        this.historyManager.workspaceHistory[commandArgs.path].push({
            index: historyIndex,
            count: count,
            name: `${commandArgs.name}`,
            status: HistoryStatus.Running,
            date: {
                start: start.toString()
            },
            taskExecution: taskExecution,
            commandArgs: commandArgs,
            logPath: logPath,
            jobs: []
        });
        historyTreeDataProvider.refresh();
        await this.storageManager.update(StorageKey.WorkspaceHistory, this.historyManager.workspaceHistory);
    }

    async install(packageManager: string) {
        const command = this.installationCommands[packageManager];
        if (command) {
            await tasks.executeTask({
                name: 'nektos/act',
                detail: 'Install nektos/act',
                definition: {
                    type: 'nektos/act installation',
                    ghCliInstall: command.includes('gh-act')
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
                execution: new ShellExecution(command)
            });
        }
    }
}