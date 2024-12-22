import * as os from "os";
import * as path from "path";
import { CancellationToken, commands, EventEmitter, ExtensionContext, QuickPickItem, QuickPickItemKind, ThemeIcon, TreeCheckboxChangeEvent, TreeDataProvider, TreeItem, TreeItemCheckboxState, Uri, window, workspace } from "vscode";
import { Option } from "../../act";
import { act } from "../../extension";
import { SettingFileName, Visibility } from "../../settingsManager";
import { StorageKey } from "../../storageManager";
import { GithubLocalActionsTreeItem } from "../githubLocalActionsTreeItem";
import InputsTreeItem from "./inputs";
import OptionTreeItem from "./option";
import OptionsTreeItem from "./options";
import PayloadsTreeItem from "./payloads";
import SecretsTreeItem from "./secrets";
import SettingTreeItem from "./setting";
import SettingFileTreeItem from "./settingFile";
import VariablesTreeItem from "./variables";
import WorkspaceFolderSettingsTreeItem from "./workspaceFolderSettings";

export default class SettingsTreeDataProvider implements TreeDataProvider<GithubLocalActionsTreeItem> {
    private _onDidChangeTreeData = new EventEmitter<GithubLocalActionsTreeItem | undefined | null | void>();
    readonly onDidChangeTreeData = this._onDidChangeTreeData.event;
    static VIEW_ID = 'settings';

    constructor(context: ExtensionContext) {
        context.subscriptions.push(
            commands.registerCommand('githubLocalActions.refreshSettings', async () => {
                this.refresh();
            }),
            commands.registerCommand('githubLocalActions.createSecretFile', async (secretsTreeItem: SecretsTreeItem) => {
                const secretFileName = await window.showInputBox({
                    prompt: `Enter the name for the secret file`,
                    placeHolder: `Secret File Name`,
                    value: SettingFileName.secretFile
                });

                if (secretFileName) {
                    await act.settingsManager.createSettingFile(secretsTreeItem.workspaceFolder, secretsTreeItem.storageKey, secretFileName, '');
                    this.refresh();
                }
            }),
            commands.registerCommand('githubLocalActions.locateSecretFiles', async (secretsTreeItem: SecretsTreeItem) => {
                const secretFilesUris = await window.showOpenDialog({
                    title: 'Locate Secret Files',
                    canSelectFiles: true,
                    canSelectFolders: false,
                    canSelectMany: true,
                    defaultUri: secretsTreeItem.workspaceFolder.uri
                });

                if (secretFilesUris) {
                    await act.settingsManager.locateSettingFile(secretsTreeItem.workspaceFolder, secretsTreeItem.storageKey, secretFilesUris);
                    this.refresh();
                }
            }),
            commands.registerCommand('githubLocalActions.createVariableFile', async (variablesTreeItem: VariablesTreeItem) => {
                const variableFileName = await window.showInputBox({
                    prompt: `Enter the name for the variable file`,
                    placeHolder: `Variable File Name`,
                    value: SettingFileName.variableFile
                });

                if (variableFileName) {
                    await act.settingsManager.createSettingFile(variablesTreeItem.workspaceFolder, variablesTreeItem.storageKey, variableFileName, '');
                    this.refresh();
                }
            }),
            commands.registerCommand('githubLocalActions.locateVariableFiles', async (variablesTreeItem: VariablesTreeItem) => {
                const variableFilesUris = await window.showOpenDialog({
                    title: 'Locate Variable Files',
                    canSelectFiles: true,
                    canSelectFolders: false,
                    canSelectMany: true,
                    defaultUri: variablesTreeItem.workspaceFolder.uri
                });

                if (variableFilesUris) {
                    await act.settingsManager.locateSettingFile(variablesTreeItem.workspaceFolder, variablesTreeItem.storageKey, variableFilesUris);
                    this.refresh();
                }
            }),
            commands.registerCommand('githubLocalActions.createInputFile', async (inputsTreeItem: InputsTreeItem) => {
                const inputFileName = await window.showInputBox({
                    prompt: `Enter the name for the input file`,
                    placeHolder: `Input File Name`,
                    value: SettingFileName.inputFile
                });

                if (inputFileName) {
                    await act.settingsManager.createSettingFile(inputsTreeItem.workspaceFolder, inputsTreeItem.storageKey, inputFileName, '');
                    this.refresh();
                }
            }),
            commands.registerCommand('githubLocalActions.locateInputFiles', async (inputsTreeItem: InputsTreeItem) => {
                const inputFilesUris = await window.showOpenDialog({
                    title: 'Locate Variable Files',
                    canSelectFiles: true,
                    canSelectFolders: false,
                    canSelectMany: true,
                    defaultUri: inputsTreeItem.workspaceFolder.uri
                });

                if (inputFilesUris) {
                    await act.settingsManager.locateSettingFile(inputsTreeItem.workspaceFolder, inputsTreeItem.storageKey, inputFilesUris);
                    this.refresh();
                }
            }),
            commands.registerCommand('githubLocalActions.createPayloadFile', async (payloadsTreeItem: PayloadsTreeItem) => {
                const payloadFileName = await window.showInputBox({
                    prompt: `Enter the name for the payload file`,
                    placeHolder: `Payload File Name`,
                    value: SettingFileName.payloadFile
                });

                if (payloadFileName) {
                    await act.settingsManager.createSettingFile(payloadsTreeItem.workspaceFolder, payloadsTreeItem.storageKey, payloadFileName, '{}');
                    this.refresh();
                }
            }),
            commands.registerCommand('githubLocalActions.addOption', async (optionsTreeItem: OptionsTreeItem) => {
                let options: any[];

                try {
                    const allOptions = await act.getAllOptions();
                    const specialOptions: string[] = [
                        Option.Input,
                        Option.InputFile,
                        Option.Var,
                        Option.VarFile,
                        Option.Secret,
                        Option.SecretFile,
                        Option.EventPath,
                        Option.Platform,
                        // The following options would break this integration
                        Option.Help,
                        Option.BugReport,
                        Option.Watch,
                        Option.List,
                        Option.Version
                    ];
                    options = allOptions.map(opt => ({
                        label: "--" + opt.name,
                        description: opt.type !== 'bool' ? opt.default : undefined,
                        detail: opt.description.charAt(0).toUpperCase() + opt.description.slice(1)
                    })).filter(opt => !specialOptions.includes(opt.label));
                } catch (error: any) {
                    options = [
                        {
                            label: Option.ActionCachePath,
                            description: this.getCacheDirectory(['act']),
                            detail: 'Defines the path where the actions get cached and host workspaces are created.'
                        },
                        {
                            label: Option.ActionOfflineMode,
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
                            detail: 'Use first event type from workflow as event that triggered the workflow.'
                        },
                        {
                            label: Option.Directory,
                            description: '.',
                            detail: 'The working directory used when running a nektos/act command.'
                        },
                        {
                            label: Option.DryRun,
                            detail: 'Disable container creation and validate only workflow correctness.'
                        },
                        {
                            label: Option.GithubInstance,
                            description: 'github.com',
                            detail: 'The GitHub instance to use. Only use this when using GitHub Enterprise Server.'
                        },
                        {
                            label: Option.InsecureSecrets,
                            detail: 'Show secrets while printing logs (NOT RECOMMENDED!).'
                        },
                        {
                            label: Option.Json,
                            detail: 'Output logs in json format.'
                        },
                        {
                            label: Option.LocalRepository,
                            description: '',
                            detail: 'Replaces the specified repository and ref with a local folder (e.g. https://github.com/test/test@v0=/home/act/test or test/test@v0=/home/act/test, the latter matches any hosts or protocols).'
                        },
                        {
                            label: Option.LogPrefixJobId,
                            detail: 'Output the job id within non-json logs instead of the entire name.'
                        },
                        {
                            label: Option.Network,
                            description: 'host',
                            detail: 'Sets a docker network name.'
                        },
                        {
                            label: Option.NoCacheServer,
                            detail: 'Disable cache server.'
                        },
                        {
                            label: Option.NoRecurse,
                            detail: 'Flag to disable running workflows from subdirectories of specified path in --workflows/-W flag.'
                        },
                        {
                            label: Option.NoSkipCheckout,
                            detail: 'Do not skip actions/checkout.'
                        },
                        {
                            label: Option.Privileged,
                            detail: 'Use privileged mode.'
                        },
                        {
                            label: Option.Pull,
                            detail: 'Pull docker image(s) even if already present.'
                        },
                        {
                            label: Option.Quiet,
                            detail: 'Disable logging of output from steps.'
                        },
                        {
                            label: Option.Rebuild,
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
                            detail: 'Don\'t remove container(s) on successfully completed workflow(s) to maintain state between runs.'
                        },
                        {
                            label: Option.Rm,
                            detail: 'Automatically remove container(s)/volume(s) after a workflow(s) failure.'
                        },
                        {
                            label: Option.UseGitignore,
                            detail: 'Controls whether paths specified in a .gitignore file should be copied into the container.'
                        },
                        {
                            label: Option.UseNewActionCache,
                            detail: 'Enable using the new Action Cache for storing Actions locally.'
                        },
                        {
                            label: Option.Userns,
                            description: '',
                            detail: 'User namespace to use.'
                        },
                        {
                            label: Option.Verbose,
                            detail: 'Enable verbose output.'
                        }
                    ];
                }

                options.forEach((option, index) => {
                    options[index].label = options[index].label.slice(2);
                    options[index].iconPath = new ThemeIcon('symbol-property');
                });

                const settings = await act.settingsManager.getSettings(optionsTreeItem.workspaceFolder, false);
                const optionNames = settings.options.map(option => option.name);
                options = options.filter(option => !optionNames.includes(option.label));

                const selectedOption = await window.showQuickPick(options, {
                    title: 'Select the option to add',
                    placeHolder: 'Option',
                    matchOnDetail: true
                });

                if (selectedOption) {
                    const requiresInputFromUser: boolean = selectedOption.description !== undefined;
                    let value: string | undefined;

                    if (requiresInputFromUser) {
                        value = await window.showInputBox({
                            prompt: `Enter a value for the option`,
                            placeHolder: `Option value`,
                            value: selectedOption.description
                        });

                        if (value === undefined) {
                            return;
                        }
                    }

                    await act.settingsManager.editCustomSetting(
                        optionsTreeItem.workspaceFolder,
                        {
                            name: selectedOption.label,
                            path: value || '',
                            selected: false,
                            notEditable: !requiresInputFromUser,
                            default: selectedOption.description,
                            description: selectedOption.detail
                        },
                        optionsTreeItem.storageKey
                    );
                    this.refresh();
                }
            }),
            commands.registerCommand('githubLocalActions.locatePayloadFiles', async (payloadsTreeItem: PayloadsTreeItem) => {
                const payloadFilesUris = await window.showOpenDialog({
                    title: 'Locate Payload Files',
                    canSelectFiles: true,
                    canSelectFolders: false,
                    canSelectMany: true,
                    defaultUri: payloadsTreeItem.workspaceFolder.uri
                });

                if (payloadFilesUris) {
                    await act.settingsManager.locateSettingFile(payloadsTreeItem.workspaceFolder, payloadsTreeItem.storageKey, payloadFilesUris);
                    this.refresh();
                }
            }),
            commands.registerCommand('githubLocalActions.editOption', async (optionTreeItem: OptionTreeItem) => {
                const value = await window.showInputBox({
                    prompt: `Enter a value for the option (${optionTreeItem.option.name})`,
                    placeHolder: `Option value`,
                    value: optionTreeItem.option.path
                });

                if (value !== undefined) {
                    const newOption = optionTreeItem.option;
                    newOption.path = value;
                    await act.settingsManager.editCustomSetting(optionTreeItem.workspaceFolder, newOption, optionTreeItem.storageKey);
                    this.refresh();
                }
            }),
            commands.registerCommand('githubLocalActions.openSettingFile', async (settingFileTreeItem: SettingFileTreeItem) => {
                try {
                    const document = await workspace.openTextDocument(settingFileTreeItem.settingFile.path);
                    await window.showTextDocument(document);
                } catch (error: any) {
                    try {
                        await workspace.fs.stat(Uri.file(settingFileTreeItem.settingFile.path));
                        window.showErrorMessage(`Failed to open file. Error: ${error}`);
                    } catch (error: any) {
                        window.showErrorMessage(`File ${settingFileTreeItem.settingFile.name} not found.`);
                    }
                }
            }),
            commands.registerCommand('githubLocalActions.removeCustomSetting', async (customTreeItem: SettingFileTreeItem | OptionTreeItem) => {
                const existingCustomSetting = customTreeItem instanceof SettingFileTreeItem ?
                    customTreeItem.settingFile :
                    customTreeItem.option;
                await act.settingsManager.removeCustomSetting(customTreeItem.workspaceFolder, existingCustomSetting, customTreeItem.storageKey);
                this.refresh();
            }),
            commands.registerCommand('githubLocalActions.deleteSettingFile', async (settingFileTreeItem: SettingFileTreeItem) => {
                await act.settingsManager.deleteSettingFile(settingFileTreeItem.workspaceFolder, settingFileTreeItem.settingFile, settingFileTreeItem.storageKey);
                this.refresh();
            }),
            commands.registerCommand('githubLocalActions.show', async (settingTreeItem: SettingTreeItem) => {
                const newSetting = settingTreeItem.setting;
                newSetting.visible = Visibility.show;
                await act.settingsManager.editSetting(settingTreeItem.workspaceFolder, newSetting, settingTreeItem.storageKey);
                this.refresh();
            }),
            commands.registerCommand('githubLocalActions.hide', async (settingTreeItem: SettingTreeItem) => {
                const newSetting = settingTreeItem.setting;
                newSetting.visible = Visibility.hide;
                await act.settingsManager.editSetting(settingTreeItem.workspaceFolder, newSetting, settingTreeItem.storageKey);
                this.refresh();
            }),
            commands.registerCommand('githubLocalActions.importFromGithub', async (settingTreeItem: SettingTreeItem) => {
                const settings = await act.settingsManager.getSettings(settingTreeItem.workspaceFolder, false);
                const variableNames = settings.variables.map(variable => variable.key);
                if (variableNames.length > 0) {
                    const repository = await act.settingsManager.githubManager.getRepository(settingTreeItem.workspaceFolder, 'githubLocalActions.importFromGithub', [settingTreeItem]);
                    if (repository) {
                        const variableOptions: QuickPickItem[] = [];
                        const errors: string[] = [];

                        await window.withProgress({ location: { viewId: SettingsTreeDataProvider.VIEW_ID } }, async () => {
                            // Get repository variables
                            const repositoryVariables = await act.settingsManager.githubManager.getVariables(repository.owner, repository.repo);
                            if (repositoryVariables.error) {
                                errors.push(repositoryVariables.error);
                            } else {
                                const matchingVariables = repositoryVariables.data.filter(variable => variableNames.includes(variable.name));
                                if (matchingVariables.length > 0) {
                                    variableOptions.push({
                                        label: 'Repository Variables',
                                        kind: QuickPickItemKind.Separator
                                    });

                                    variableOptions.push(
                                        ...matchingVariables.map(variable => {
                                            return {
                                                label: variable.name,
                                                description: variable.value,
                                                iconPath: new ThemeIcon('symbol-variable')
                                            };
                                        })
                                    );
                                }
                            }

                            // Get environment variables
                            const environments = await act.settingsManager.githubManager.getEnvironments(repository.owner, repository.repo);
                            if (environments.error) {
                                errors.push(environments.error);
                            } else {
                                for (const environment of environments.data) {
                                    const environmentVariables = await act.settingsManager.githubManager.getVariables(repository.owner, repository.repo, environment.name);
                                    if (environmentVariables.error) {
                                        errors.push(environmentVariables.error);
                                    } else {
                                        const matchingVariables = environmentVariables.data.filter(variable => variableNames.includes(variable.name));
                                        if (matchingVariables.length > 0) {
                                            variableOptions.push({
                                                label: environment.name,
                                                kind: QuickPickItemKind.Separator
                                            });

                                            variableOptions.push(
                                                ...matchingVariables.map(variable => {
                                                    return {
                                                        label: variable.name,
                                                        description: variable.value,
                                                        iconPath: new ThemeIcon('symbol-variable')
                                                    };
                                                })
                                            );
                                        }
                                    }
                                }
                            }
                        });

                        if (errors.length > 0) {
                            window.showErrorMessage(`Error(s) encountered retrieving variables from GitHub. Errors: ${[...new Set(errors)].join(' ')}`);
                        }

                        if (variableOptions.length > 0) {
                            const selectedVariables = await window.showQuickPick(variableOptions, {
                                title: 'Select the variables to import from GitHub',
                                placeHolder: 'Variables',
                                matchOnDescription: true,
                                canPickMany: true
                            });

                            if (selectedVariables) {
                                const seen = new Set();
                                const hasDuplicates = selectedVariables.some(variable => {
                                    return seen.size === seen.add(variable.label).size;
                                });

                                if (hasDuplicates) {
                                    window.showErrorMessage('Duplicate variables selected');
                                } else {
                                    for await (const variable of selectedVariables) {
                                        const newSetting = settings.variables.find(existingVariable => existingVariable.key === variable.label);
                                        if (newSetting && variable.description) {
                                            newSetting.value = variable.description;
                                            await act.settingsManager.editSetting(settingTreeItem.workspaceFolder, newSetting, StorageKey.Variables);
                                        }
                                    }

                                    this.refresh();
                                }
                            }
                        } else if (errors.length === 0) {
                            window.showErrorMessage('No matching variables defined in Github');
                        }
                    }
                } else {
                    window.showErrorMessage('No variables found in workflow(s)');
                }
            }),
            commands.registerCommand('githubLocalActions.editSetting', async (settingTreeItem: SettingTreeItem) => {
                const newValue = await window.showInputBox({
                    prompt: `Enter the value for ${settingTreeItem.setting.value}`,
                    placeHolder: `Setting value`,
                    value: settingTreeItem.setting.value
                });

                if (newValue !== undefined) {
                    const newSetting = settingTreeItem.setting;
                    newSetting.value = newValue;
                    await act.settingsManager.editSetting(settingTreeItem.workspaceFolder, newSetting, settingTreeItem.storageKey);
                    this.refresh();
                }
            })
        );
    }

    refresh(element?: GithubLocalActionsTreeItem) {
        this._onDidChangeTreeData.fire(element);
    }

    getTreeItem(element: GithubLocalActionsTreeItem): GithubLocalActionsTreeItem | Thenable<GithubLocalActionsTreeItem> {
        return element;
    }

    async resolveTreeItem(item: TreeItem, element: GithubLocalActionsTreeItem, token: CancellationToken): Promise<GithubLocalActionsTreeItem> {
        if (element.getToolTip) {
            element.tooltip = await element.getToolTip();
        }

        return element;
    }

    async onDidChangeCheckboxState(event: TreeCheckboxChangeEvent<SettingTreeItem | SettingFileTreeItem | OptionTreeItem>) {
        for await (const [treeItem, state] of event.items) {
            if (treeItem instanceof SettingTreeItem) {
                const newSetting = treeItem.setting;
                newSetting.selected = (state === TreeItemCheckboxState.Checked);
                await act.settingsManager.editSetting(treeItem.workspaceFolder, newSetting, treeItem.storageKey);
            } else if (treeItem instanceof OptionTreeItem) {
                const newOption = treeItem.option;
                newOption.selected = (state === TreeItemCheckboxState.Checked);
                await act.settingsManager.editCustomSetting(treeItem.workspaceFolder, newOption, treeItem.storageKey);
            } else {
                const isSelected = (state === TreeItemCheckboxState.Checked);

                // Update check box state for current setting file tree item
                const newSettingFile = treeItem.settingFile;
                newSettingFile.selected = isSelected;
                await act.settingsManager.editCustomSetting(treeItem.workspaceFolder, newSettingFile, treeItem.storageKey);

                // Update check box state for other setting file tree items
                if (isSelected) {
                    const settingFiles = await act.settingsManager.getCustomSettings(treeItem.workspaceFolder, treeItem.storageKey);
                    for (const settingFile of settingFiles) {
                        if (settingFile.selected && settingFile.path !== treeItem.settingFile.path) {
                            const newSettingFile = settingFile;
                            newSettingFile.selected = false;
                            await act.settingsManager.editCustomSetting(treeItem.workspaceFolder, newSettingFile, treeItem.storageKey);
                        }
                    }
                }
            }
        }
        this.refresh();
    }

    async getChildren(element?: GithubLocalActionsTreeItem): Promise<GithubLocalActionsTreeItem[]> {
        if (element) {
            return element.getChildren();
        } else {
            const items: GithubLocalActionsTreeItem[] = [];
            let noSettings: boolean = true;

            const workspaceFolders = workspace.workspaceFolders;
            if (workspaceFolders) {
                if (workspaceFolders.length === 1) {
                    items.push(...await new WorkspaceFolderSettingsTreeItem(workspaceFolders[0]).getChildren());

                    const workflows = await act.workflowsManager.getWorkflows(workspaceFolders[0]);
                    if (workflows && workflows.length > 0) {
                        noSettings = false;
                    }
                } else if (workspaceFolders.length > 1) {
                    for (const workspaceFolder of workspaceFolders) {
                        items.push(new WorkspaceFolderSettingsTreeItem(workspaceFolder));

                        const workflows = await act.workflowsManager.getWorkflows(workspaceFolder);
                        if (workflows && workflows.length > 0) {
                            noSettings = false;
                        }
                    }
                }
            }

            await commands.executeCommand('setContext', 'githubLocalActions:noSettings', noSettings);
            return items;
        }
    }

    getCacheDirectory(paths: string[]) {
        const userHomeDir = os.homedir();
        const cacheHomeDir = process.env.XDG_CACHE_HOME || path.join(userHomeDir, '.cache');
        return path.join(cacheHomeDir, ...paths);
    }
}