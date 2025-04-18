import * as childProcess from "child_process";
import * as fs from "fs/promises";
import * as os from "os";
import * as path from "path";
import sanitize from "sanitize-filename";
import { commands, CustomExecution, env, EventEmitter, ExtensionContext, Pseudoterminal, ShellExecution, TaskDefinition, TaskGroup, TaskPanelKind, TaskRevealKind, tasks, TaskScope, TerminalDimensions, Uri, window, workspace, WorkspaceFolder } from "vscode";
import { ComponentsManager } from "./componentsManager";
import { ConfigurationManager, Platform, Section } from "./configurationManager";
import { componentsTreeDataProvider, historyTreeDataProvider } from './extension';
import { HistoryManager, HistoryStatus } from './historyManager';
import { SecretManager } from "./secretManager";
import { Mode, Settings, SettingsManager } from './settingsManager';
import { StorageKey, StorageManager } from './storageManager';
import { Utils } from "./utils";
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
    ListOptions = "--list-options",
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
    name: string,
    description: string
    type: string,
    default: string
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
        const workflowsDirectory = WorkflowsManager.getWorkflowsDirectory();
        return await this.runCommand({
            path: workspaceFolder.uri.fsPath,
            workflow: workflow,
            options: [
                `${Option.Workflows} "${workflowsDirectory}/${path.parse(workflow.uri.fsPath).base}"`
            ],
            name: workflow.name,
            extraHeader: [
                { key: 'Workflow', value: workflow.name }
            ]
        });
    }

    async runJob(workspaceFolder: WorkspaceFolder, workflow: Workflow, job: Job) {
        const workflowsDirectory = WorkflowsManager.getWorkflowsDirectory();
        return await this.runCommand({
            path: workspaceFolder.uri.fsPath,
            workflow: workflow,
            options: [
                `${Option.Workflows} "${workflowsDirectory}/${path.parse(workflow.uri.fsPath).base}"`,
                `${Option.Job} "${job.id}"`
            ],
            name: `${workflow.name}/${job.name}`,
            extraHeader: [
                { key: 'Workflow', value: workflow.name },
                { key: 'Job', value: job.name }
            ]
        });
    }

    async runEvent(workspaceFolder: WorkspaceFolder, event: Event, options?: { workflow: Workflow, job?: Job }) {
        let eventExists: boolean = false;
        const workflowsDirectory = WorkflowsManager.getWorkflowsDirectory();

        // If a specific workflow is provided, run the event on that workflow
        if (options) {
            if (event in options.workflow.yaml.on) {
                // If a job is also provided, run the event on that specific job
                if (options.job) {
                    return await this.runCommand({
                        path: workspaceFolder.uri.fsPath,
                        workflow: options.workflow,
                        options: [
                            `${event} ${Option.Workflows} "${workflowsDirectory}/${path.parse(options.workflow.uri.fsPath).base}"`,
                            `${Option.Job} "${options.job.id}"`
                        ],
                        name: `${options.workflow.name}/${options.job.name} (${event})`,
                        extraHeader: [
                            { key: 'Workflow', value: options.workflow.name },
                            { key: 'Job', value: options.job.name },
                            { key: 'Event', value: event }
                        ]
                    });
                } else {
                    // Run the event on the entire workflow
                    return await this.runCommand({
                        path: workspaceFolder.uri.fsPath,
                        workflow: options.workflow,
                        options: [
                            `${event} ${Option.Workflows} "${workflowsDirectory}/${path.parse(options.workflow.uri.fsPath).base}"`
                        ],
                        name: `${options.workflow.name} (${event})`,
                        extraHeader: [
                            { key: 'Workflow', value: options.workflow.name },
                            { key: 'Event', value: event }
                        ]
                    });
                }
            } else {
                window.showErrorMessage(`Event "${event}" is not registered on the workflow "${options.workflow.name}"`);
                return;
            }
        }

        // Otherwise, run the event on all matching workflows
        const workflows = await this.workflowsManager.getWorkflows(workspaceFolder);
        if (workflows.length > 0) {
            for (const workflow of workflows) {
                if (event in workflow.yaml.on) {
                    eventExists = true;
                    await this.runCommand({
                        path: workspaceFolder.uri.fsPath,
                        workflow: workflow,
                        options: [
                            `${event} ${Option.Workflows} "${workflowsDirectory}/${path.parse(workflow.uri.fsPath).base}"`
                        ],
                        name: `${workflow.name} (${event})`,
                        extraHeader: [
                            { key: 'Workflow', value: workflow.name },
                            { key: 'Event', value: event }
                        ]
                    });
                }
            }

            if (!eventExists) {
                window.showErrorMessage(`No workflows triggered by the "${event}" event.`);
            }
        } else {
            window.showErrorMessage('No workflows found.');
        }
    }

    getAllOptions(): Promise<ActOption[]> {
        return new Promise<ActOption[]>((resolve, reject) => {
            const exec = childProcess.spawn(
                `${Act.getActCommand()} ${Option.ListOptions}`,
                {
                    shell: true,
                }
            );

            let options: string = "";
            exec.stdout.on('data', data => {
                options += data.toString();
            });
            exec.on('exit', async (code, signal) => {
                if (code === 0) {
                    resolve(JSON.parse(options));
                } else {
                    reject(new Error(`The ${Option.ListOptions} option is not supported by this binary`));
                }
            });
        });
    }

    /**
     * This is to be used until act adopts "--list-options"
     * https://github.com/nektos/act/pull/2557
     */
    getDefaultOptions() {
        return [
            {
                label: Option.ActionCachePath,
                description: this.getCacheDirectory(['act']),
                detail: 'Defines the path where the actions get cached and host workspaces are created.'
            },
            {
                label: Option.ActionOfflineMode,
                description: 'false',
                detail: 'If action contents exists, it will not be fetched and pulled again. If this is turned on, it will turn off force pull.'
            },
            {
                label: Option.Actor,
                description: 'nektos/act',
                detail: 'User that triggered the event.'
            },
            {
                label: Option.ArtifactServerAddr,
                description: '',
                detail: 'Defines the address to which the artifact server binds. If not set, nektos/act will use the outbound IP address of this machine. This means that it will try to access the internet and return the local IP address of the connection. If the machine cannot access the internet, it returns a preferred IP address from network interfaces. If no IP address is found, this will not be set.'
            },
            {
                label: Option.ArtifactServerPath,
                description: '',
                detail: 'Defines the path where the artifact server stores uploads and retrieves downloads from. If not specified, the artifact server will not start.'
            },
            {
                label: Option.ArtifactServerPort,
                description: '34567',
                detail: 'Defines the port where the artifact server listens.'
            },
            {
                label: Option.Bind,
                description: 'false',
                detail: 'Bind working directory to container, rather than copy.'
            },
            {
                label: Option.CacheServerAddr,
                description: '',
                detail: 'Defines the address to which the cache server binds. If not set, nektos/act will use the outbound IP address of this machine. This means that it will try to access the internet and return the local IP address of the connection. If the machine cannot access the internet, it returns a preferred IP address from network interfaces. If no IP address is found, this will not be set.'
            },
            {
                label: Option.CacheServerPath,
                description: this.getCacheDirectory(['actcache']),
                detail: 'Defines the path where the cache server stores caches.'
            },
            {
                label: Option.CacheServerPort,
                description: '0',
                detail: 'Defines the port where the artifact server listens. 0 means a randomly available port.'
            },
            {
                label: Option.ContainerArchitecture,
                description: '',
                detail: 'The architecture which should be used to run containers (e.g.: linux/amd64). If not specified, the host default architecture will be used. This requires Docker server API Version 1.41+ (ignored on earlier Docker server platforms).'
            },
            {
                label: Option.ContainerCapAdd,
                description: '',
                detail: 'Kernel capabilities to add to the workflow containers (e.g. SYS_PTRACE).'
            },
            {
                label: Option.ContainerCapDrop,
                description: '',
                detail: 'Kernel capabilities to remove from the workflow containers (e.g. SYS_PTRACE).'
            },
            {
                label: Option.ContainerDaemonSocket,
                description: '',
                detail: 'URI to Docker Engine socket (e.g.: unix://~/.docker/run/docker.sock or - to disable bind mounting the socket).'
            },
            {
                label: Option.ContainerOptions,
                description: '',
                detail: 'Custom docker container options for the job container without an options property in the job definition.'
            },
            {
                label: Option.DefaultBranch,
                description: '',
                detail: 'The name of the main branch.'
            },
            {
                label: Option.DetectEvent,
                description: 'false',
                detail: 'Use first event type from workflow as event that triggered the workflow.'
            },
            {
                label: Option.Directory,
                description: '.',
                detail: 'The working directory used when running a nektos/act command.'
            },
            {
                label: Option.DryRun,
                description: 'false',
                detail: 'Disable container creation and validate only workflow correctness.'
            },
            {
                label: Option.GithubInstance,
                description: 'github.com',
                detail: 'The GitHub instance to use. Only use this when using GitHub Enterprise Server.'
            },
            {
                label: Option.InsecureSecrets,
                description: 'false',
                detail: 'Show secrets while printing logs (NOT RECOMMENDED!).'
            },
            {
                label: Option.Json,
                description: 'false',
                detail: 'Output logs in json format.'
            },
            {
                label: Option.LocalRepository,
                description: '',
                detail: 'Replaces the specified repository and ref with a local folder (e.g. https://github.com/test/test@v0=/home/act/test or test/test@v0=/home/act/test, the latter matches any hosts or protocols).'
            },
            {
                label: Option.LogPrefixJobId,
                description: 'false',
                detail: 'Output the job id within non-json logs instead of the entire name.'
            },
            {
                label: Option.Network,
                description: 'host',
                detail: 'Sets a docker network name.'
            },
            {
                label: Option.NoCacheServer,
                description: 'false',
                detail: 'Disable cache server.'
            },
            {
                label: Option.NoRecurse,
                description: 'false',
                detail: 'Flag to disable running workflows from subdirectories of specified path in --workflows/-W flag.'
            },
            {
                label: Option.NoSkipCheckout,
                description: 'false',
                detail: 'Do not skip actions/checkout.'
            },
            {
                label: Option.Privileged,
                description: 'false',
                detail: 'Use privileged mode.'
            },
            {
                label: Option.Pull,
                description: 'true',
                detail: 'Pull docker image(s) even if already present.'
            },
            {
                label: Option.Quiet,
                description: 'false',
                detail: 'Disable logging of output from steps.'
            },
            {
                label: Option.Rebuild,
                description: 'true',
                detail: 'Rebuild local action docker image(s) even if already present.'
            },
            {
                label: Option.RemoteName,
                description: 'origin',
                detail: 'Git remote name that will be used to retrieve the URL of Git repo.'
            },
            {
                label: Option.ReplaceGheActionTokenWithGithubCom,
                description: '',
                detail: 'If you are using replace-ghe-action-with-github-com and you want to use private actions on GitHub, you have to set a personal access token.'
            },
            {
                label: Option.ReplaceGheActionWithGithubCom,
                description: '',
                detail: 'If you are using GitHub Enterprise Server and allow specified actions from GitHub (github.com), you can set actions on this.'
            },
            {
                label: Option.Reuse,
                description: 'false',
                detail: 'Don\'t remove container(s) on successfully completed workflow(s) to maintain state between runs.'
            },
            {
                label: Option.Rm,
                description: 'false',
                detail: 'Automatically remove container(s)/volume(s) after a workflow(s) failure.'
            },
            {
                label: Option.UseGitignore,
                description: 'true',
                detail: 'Controls whether paths specified in a .gitignore file should be copied into the container.'
            },
            {
                label: Option.UseNewActionCache,
                description: 'false',
                detail: 'Enable using the new Action Cache for storing Actions locally.'
            },
            {
                label: Option.Userns,
                description: '',
                detail: 'User namespace to use.'
            },
            {
                label: Option.Verbose,
                description: 'false',
                detail: 'Enable verbose output.'
            }
        ];
    }

    getCacheDirectory(paths: string[]) {
        const userHomeDir = os.homedir();
        const cacheHomeDir = process.env.XDG_CACHE_HOME || path.join(userHomeDir, '.cache');
        return path.join(cacheHomeDir, ...paths);
    }

    async buildActCommand(settings: Settings, options: string[]) {
        const userOptions: string[] = [
            ...settings.secrets.map(secret => `${Option.Secret} ${secret.key}`),
            (settings.secretFiles.length > 0 ? `${Option.SecretFile} "${settings.secretFiles[0].path}"` : `${Option.SecretFile} ""`),
            ...settings.variables.map(variable => `${Option.Var} ${variable.key}="${Utils.escapeSpecialCharacters(variable.value)}"`),
            (settings.variableFiles.length > 0 ? `${Option.VarFile} "${settings.variableFiles[0].path}"` : `${Option.VarFile} ""`),
            ...settings.inputs.map(input => `${Option.Input} ${input.key}="${Utils.escapeSpecialCharacters(input.value)}"`),
            (settings.inputFiles.length > 0 ? `${Option.InputFile} "${settings.inputFiles[0].path}"` : `${Option.InputFile} ""`),
            ...settings.runners.map(runner => `${Option.Platform} ${runner.key}="${Utils.escapeSpecialCharacters(runner.value)}"`),
            (settings.payloadFiles.length > 0 ? `${Option.EventPath} "${settings.payloadFiles[0].path}"` : `${Option.EventPath} ""`),
            ...settings.options.map(option => option.path ? `--${option.name}${option.default && ['true', 'false'].includes(option.default) ? "=" : " "}"${Utils.escapeSpecialCharacters(option.path)}"` : `--${option.name}`)
        ];

        const actCommand = Act.getActCommand();
        const executionCommand = `${actCommand} ${Option.Json} ${Option.Verbose} ${options.join(' ')} ${userOptions.join(' ')}`;
        const displayCommand = `${actCommand} ${options.join(' ')} ${userOptions.join(' ')}`;

        return {
            userOptions,
            executionCommand,
            displayCommand
        };
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
        const workspaceHistory = await this.historyManager.getWorkspaceHistory();
        if (workspaceHistory[commandArgs.path] === undefined) {
            workspaceHistory[commandArgs.path] = [];
            await this.storageManager.update(StorageKey.WorkspaceHistory, workspaceHistory);
        }

        // Process task count suffix
        const historyIndex = (workspaceHistory[commandArgs.path] ?? []).length;
        const matchingTasks = (workspaceHistory[commandArgs.path] ?? [])
            .filter(history => history.name === commandArgs.name)
            .sort((a, b) => b.count - a.count);
        const count = matchingTasks.length > 0 ? matchingTasks[0].count + 1 : 1;

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
        const settings = await this.settingsManager.getSettings(workspaceFolder, true);
        const { userOptions, executionCommand, displayCommand } = await this.buildActCommand(settings, commandArgs.options);

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

                        const workspaceHistory = (await this.historyManager.getWorkspaceHistory());
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
                                    if (userOptions.includes(`${Option.Verbose}="true"`)) {
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

                                        const jobHistory = workspaceHistory[commandArgs.path][historyIndex];
                                        const jobs = jobHistory.jobs ?? [];
                                        let jobIndex = jobs
                                            .findIndex(job => job.name === jobName);
                                        if (jobIndex < 0) {
                                            // Add new job with setup step
                                            jobs.push({
                                                name: jobName,
                                                status: HistoryStatus.Running,
                                                date: {
                                                    start: dateString
                                                },
                                                steps: []
                                            });
                                            jobIndex = jobs.length - 1;
                                        }

                                        // Update step status in workspace history
                                        const job = jobs[jobIndex];
                                        if (parsedMessage.stepID) {
                                            let stepName: string;
                                            const stepId: string = parsedMessage.stepID[0];

                                            const steps = job.steps ?? [];

                                            if (parsedMessage.stage !== 'Main') {
                                                stepName = `${parsedMessage.stage} ${parsedMessage.step}`;
                                            } else {
                                                stepName = parsedMessage.step;

                                                // TODO: This forcefully sets any pre step to success. To be fixed with https://github.com/nektos/act/issues/2551
                                                const preStepName = `Pre ${parsedMessage.step}`;
                                                let preStepIndex = steps
                                                    .findIndex(step => step.id === stepId && step.name === preStepName);
                                                const prestep = (job.steps! ?? [])[preStepIndex];
                                                if (preStepIndex > -1 && prestep?.status === HistoryStatus.Running) {
                                                    prestep.status = HistoryStatus.Success;
                                                    prestep.date.end = dateString;
                                                }
                                            }

                                            let stepIndex = steps
                                                .findIndex(step => step.id === stepId && step.name === stepName);
                                            if (stepIndex < 0) {
                                                // Add new step
                                                steps.push({
                                                    id: stepId,
                                                    name: stepName,
                                                    status: HistoryStatus.Running,
                                                    date: {
                                                        start: dateString
                                                    }
                                                });
                                                stepIndex = steps.length - 1;
                                            }

                                            if (parsedMessage.stepResult) {
                                                const step = steps[stepIndex];
                                                if (step) {
                                                    step.status = HistoryManager.stepResultToHistoryStatus(parsedMessage.stepResult);
                                                    step.date.end = dateString;
                                                }

                                            }
                                        }

                                        if (parsedMessage.jobResult) {
                                            if (job) {
                                                job.status = HistoryManager.stepResultToHistoryStatus(parsedMessage.jobResult);
                                                job.date.end = dateString;
                                            }
                                        }
                                    }
                                }
                            } catch (error: any) {
                                message = line;
                            }

                            if (userOptions.includes(`${Option.Json}="true"`)) {
                                message = line;
                            }

                            writeEmitter.fire(`${message.trimEnd()}\r\n`);
                            historyTreeDataProvider.refresh();
                        }
                        await this.storageManager.update(StorageKey.WorkspaceHistory, workspaceHistory);
                    };
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

                // Process environment variables for child process
                const processedSecrets: Record<string, string> = {};
                for (const secret of settings.secrets) {
                    if (secret.key === 'GITHUB_TOKEN' && secret.mode === Mode.generate) {
                        const token = await this.settingsManager.githubManager.getGithubCLIToken();
                        if (token) {
                            processedSecrets[secret.key] = token;
                        }
                    } else {
                        processedSecrets[secret.key] = secret.value!;
                    }
                }
                const envVars = {
                    ...process.env,
                    ...processedSecrets
                };

                const exec = childProcess.spawn(
                    executionCommand,
                    {
                        cwd: commandArgs.path,
                        shell: shell,
                        env: envVars
                    }
                );
                exec.stdout.on('data', handleIO());
                exec.stderr.on('data', handleIO());
                exec.on('exit', async (code, signal) => {
                    const dateString = new Date().toString();

                    // Set execution status and end time in workspace history
                    const workspaceHistory = (await this.historyManager.getWorkspaceHistory());
                    if (workspaceHistory[commandArgs.path][historyIndex].status === HistoryStatus.Running) {
                        const jobAndStepStatus = (!code && code !== 0) ? HistoryStatus.Cancelled : HistoryStatus.Unknown;
                        workspaceHistory[commandArgs.path][historyIndex].jobs?.forEach((job, jobIndex) => {
                            workspaceHistory[commandArgs.path][historyIndex].jobs![jobIndex].steps?.forEach((step, stepIndex) => {
                                if (step.status === HistoryStatus.Running) {
                                    // Update status of all running steps
                                    const step = workspaceHistory[commandArgs.path][historyIndex].jobs![jobIndex].steps![stepIndex];
                                    if (step) {
                                        step.status = jobAndStepStatus;
                                        step.date.end = dateString;
                                    }
                                }
                            });

                            if (job.status === HistoryStatus.Running) {
                                // Update status of all running jobs
                                const step = workspaceHistory[commandArgs.path][historyIndex].jobs![jobIndex];
                                if (step) {
                                    step.status = jobAndStepStatus;
                                    step.date.end = dateString;
                                }
                            }
                        });

                        // Update history status
                        if (code === 0) {
                            workspaceHistory[commandArgs.path][historyIndex].status = HistoryStatus.Success;
                        } else if (!code) {
                            workspaceHistory[commandArgs.path][historyIndex].status = HistoryStatus.Cancelled;
                        } else {
                            workspaceHistory[commandArgs.path][historyIndex].status = HistoryStatus.Failed;
                        }
                    }
                    const step = workspaceHistory[commandArgs.path][historyIndex];

                    if (step) {
                        step.date.end = dateString;
                    }
                    historyTreeDataProvider.refresh();
                    await this.storageManager.update(StorageKey.WorkspaceHistory, workspaceHistory);

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
        workspaceHistory[commandArgs.path].push({
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
        await this.storageManager.update(StorageKey.WorkspaceHistory, workspaceHistory);
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