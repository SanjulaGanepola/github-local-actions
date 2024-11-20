import * as childProcess from "child_process";
import { env, extensions, QuickPickItemKind, ShellExecution, TaskGroup, TaskPanelKind, TaskRevealKind, tasks, TaskScope, ThemeIcon, Uri, window } from "vscode";
import { act, componentsTreeDataProvider } from "./extension";

export interface Component<T extends CliStatus | ExtensionStatus> {
    name: string,
    icon: string,
    version?: string,
    status: T,
    required: boolean,
    information: string,
    installation: () => Promise<void>,
    start?: () => Promise<void>,
    message?: string
}

export enum CliStatus {
    Installed = 'Installed',
    NotInstalled = 'Not Installed',
    Running = 'Running',
    NotRunning = 'Not Running'
}

export enum ExtensionStatus {
    Activated = 'Activated',
    NotActivated = 'Not Activated'
}

export class ComponentsManager {
    async getComponents(): Promise<Component<CliStatus | ExtensionStatus>[]> {
        const components: Component<CliStatus | ExtensionStatus>[] = [];

        const actCliInfo = await this.getCliInfo('act --version', /act version (.+)/, false, false);
        components.push({
            name: 'nektos/act',
            icon: 'terminal',
            version: actCliInfo.version,
            status: actCliInfo.status,
            required: true,
            information: 'https://github.com/nektos/act',
            installation: async () => {
                const installationMethods: any[] = [
                    {
                        label: 'Software Package Managers',
                        kind: QuickPickItemKind.Separator
                    }
                ];

                Object.entries(act.installationCommands).map(([packageManager, command]) => {
                    installationMethods.push({
                        label: packageManager,
                        description: command,
                        iconPath: new ThemeIcon('terminal'),
                    });
                });

                installationMethods.push(
                    {
                        label: 'Pre-built Artifacts',
                        kind: QuickPickItemKind.Separator
                    },
                    {
                        label: 'Install Pre-built Executable',
                        description: 'Install pre-built executable',
                        iconPath: new ThemeIcon('package')
                    },
                    {
                        label: 'Bash Script Installation',
                        description: 'Install pre-built act executable using bash script',
                        iconPath: new ThemeIcon('code'),
                        link: 'https://nektosact.com/installation/index.html#bash-script'
                    },
                    {
                        label: 'Build From Source',
                        description: 'Build nektos/act yourself',
                        iconPath: new ThemeIcon('tools'),
                        link: 'https://nektosact.com/installation/index.html#build-from-source'
                    }
                );

                const selectedInstallationMethod = await window.showQuickPick(installationMethods, {
                    title: 'Select the method of installation',
                    placeHolder: 'Installation Method'
                });

                if (selectedInstallationMethod) {
                    if (selectedInstallationMethod.label === 'Install Pre-built Executable') {
                        const prebuiltExecutables = Object.entries(act.prebuiltExecutables).map(([architecture, link]) => {
                            return {
                                label: architecture,
                                iconPath: new ThemeIcon('package'),
                                link: link
                            };
                        });

                        const selectedPrebuiltExecutable = await window.showQuickPick(prebuiltExecutables, {
                            title: 'Select the prebuilt executable to download',
                            placeHolder: 'Prebuilt executable'
                        });

                        if (selectedPrebuiltExecutable) {
                            await env.openExternal(Uri.parse(selectedPrebuiltExecutable.link));
                            window.showInformationMessage('Unpack and run the executable in the terminal specifying the full path or add it to one of the paths in your PATH environment variable. Once nektos/act is successfully installed, refresh the components view.', 'Refresh').then(async value => {
                                if (value === 'Refresh') {
                                    componentsTreeDataProvider.refresh();
                                }
                            });
                        }
                    } else if (selectedInstallationMethod.link) {
                        await env.openExternal(Uri.parse(selectedInstallationMethod.link));
                        window.showInformationMessage('Once nektos/act is successfully installed, refresh the components view.', 'Refresh').then(async value => {
                            if (value === 'Refresh') {
                                componentsTreeDataProvider.refresh();
                            }
                        });
                    } else {
                        await act.install(selectedInstallationMethod.label);
                    }
                }
            }
        });

        const dockerCliInfo = await this.getCliInfo('docker version', /Client:\n.+\n\sVersion:\s+(.+)/, true, true);
        components.push({
            name: 'Docker Engine',
            icon: 'dashboard',
            version: dockerCliInfo.version,
            status: dockerCliInfo.status,
            required: true,
            information: 'https://docs.docker.com/engine',
            installation: async () => {
                await env.openExternal(Uri.parse('https://docs.docker.com/engine/install'));
            },
            start: async () => {
                //TODO: Make the below win32 and darwin paths customizable
                switch (process.platform) {
                    case 'win32':
                        await env.openExternal(Uri.parse('C:/Program Files/Docker/Docker/Docker Desktop.exe'));
                        break;
                    case 'darwin':
                        await env.openExternal(Uri.parse('/Applications/Docker.app'));
                        break;
                    case 'linux':
                        await tasks.executeTask({
                            name: 'Docker Engine',
                            detail: 'Start Docker Engine',
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
                            execution: new ShellExecution('sudo dockerd')
                        });
                        break;
                    default:
                        window.showErrorMessage(`Invalid environment: ${process.platform}`);
                        return;
                }

                window.showInformationMessage('Once Docker Engine is successfully started (this could take a few seconds), refresh the components view.', 'Refresh').then(async value => {
                    if (value === 'Refresh') {
                        componentsTreeDataProvider.refresh();
                    }
                });
            }
        });

        // const githubActionsInfo = await this.getExtensionInfo('github.vscode-github-actions');
        // components.push({
        //     name: 'GitHub Actions Extension',
        //     icon: 'extensions',
        //     version: githubActionsInfo.version,
        //     status: githubActionsInfo.status,
        //     required: false,
        //     information: 'https://marketplace.visualstudio.com/items?itemName=GitHub.vscode-github-actions',
        //     installation: async () => {
        //         await env.openExternal(Uri.parse('https://marketplace.visualstudio.com/items?itemName=GitHub.vscode-github-actions'));
        //     },
        //     message: 'GitHub Actions extension is not required, but is recommended to take advantage of workflow editor features.'
        // });

        // const githubCliInfo = await this.getCliInfo('gh', /gh version (.+)/, false, false);
        // components.push({
        //     name: 'GitHub CLI',
        //     icon: 'terminal',
        //     version: githubCliInfo.version,
        //     status: githubCliInfo.status,
        //     required: false,
        //     information: 'https://cli.github.com',
        //     installation: async () => {
        //         await env.openExternal(Uri.parse('https://cli.github.com'));
        //     },
        //     message: 'GitHub CLI is not required, but is recommended if you plan to use it to retrieve GitHub tokens.'
        // });

        return components;
    }

    async getUnreadyComponents(): Promise<Component<CliStatus | ExtensionStatus>[]> {
        const components = await this.getComponents();
        return components.filter(component => component.required && [CliStatus.NotInstalled, CliStatus.NotRunning, ExtensionStatus.NotActivated].includes(component.status));
    }

    async getCliInfo(command: string, versionRegex: RegExp, ignoreError: boolean, checksIfRunning: boolean): Promise<{ version?: string, status: CliStatus }> {
        return new Promise<{ version?: string, status: CliStatus }>((resolve, reject) => {
            childProcess.exec(command, (error, stdout, stderr) => {
                const version = stdout?.match(versionRegex);

                if (error) {
                    if (ignoreError && version) {
                        resolve({
                            version: version[1],
                            status: CliStatus.NotRunning
                        });
                    } else {
                        resolve({
                            status: CliStatus.NotInstalled
                        });
                    }
                } else {
                    if (checksIfRunning) {
                        resolve({
                            version: version ? version[1] : undefined,
                            status: CliStatus.Running
                        });
                    } else {
                        resolve({
                            version: version ? version[1] : undefined,
                            status: CliStatus.Installed
                        });
                    }
                }
            });
        });
    }

    async getExtensionInfo(extensionId: string): Promise<{ version?: string, status: ExtensionStatus }> {
        const allExtensions = extensions.all;
        const extension = allExtensions.find(extension => extension.id === extensionId);

        if (extension) {
            if (!extension.isActive) {
                await extension.activate();
            }

            return {
                status: ExtensionStatus.Activated,
                version: extension.packageJSON.version
            };
        } else {
            return {
                status: ExtensionStatus.NotActivated
            };
        }
    }
}