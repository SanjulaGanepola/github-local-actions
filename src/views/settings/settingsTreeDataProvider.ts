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
                    const excludeOptions: string[] = [
                        // The following options can be added directly from the Settings view
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
                        Option.Version,
                        Option.ListOptions
                    ];
                    options = allOptions.map(opt => ({
                        label: "--" + opt.name,
                        description: opt.type === 'stringArray' ? '' : opt.default,
                        detail: opt.description ? (opt.description.charAt(0).toUpperCase() + opt.description.slice(1)) : undefined
                    })).filter(opt => !excludeOptions.includes(opt.label));
                } catch (error: any) {
                    options = act.getDefaultOptions();
                }

                options.forEach((option, index) => {
                    options[index].label = options[index].label.slice(2);
                    options[index].iconPath = new ThemeIcon('symbol-property');
                });

                const selectedOption = await window.showQuickPick(options, {
                    title: 'Select the option to add',
                    placeHolder: 'Option',
                    matchOnDetail: true
                });

                if (selectedOption) {
                    const requiresInputFromUser: boolean = selectedOption.description !== undefined;
                    let value: string | undefined;

                    if (requiresInputFromUser) {
                        if (['true', 'false'].includes(selectedOption.description)) {
                            value = (await window.showQuickPick([{ label: 'true' }, { label: 'false' }], {
                                title: `Select a value for the option ${selectedOption.label}`,
                                placeHolder: selectedOption.label,
                            }))?.label;
                        } else {
                            value = await window.showInputBox({
                                prompt: `Enter a value for the option ${selectedOption.label}`,
                                placeHolder: selectedOption.label,
                                value: selectedOption.description
                            });
                        }

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
                        optionsTreeItem.storageKey,
                        true
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
                let value: string | undefined;
                if (optionTreeItem.option.default && ['true', 'false'].includes(optionTreeItem.option.default)) {
                    value = (await window.showQuickPick([{ label: 'true' }, { label: 'false' }], {
                        title: `Select a value for the option ${optionTreeItem.option.name}`,
                        placeHolder: optionTreeItem.option.name,
                    }))?.label;
                } else {
                    value = await window.showInputBox({
                        prompt: `Enter a value for the option ${optionTreeItem.option.name}`,
                        placeHolder: optionTreeItem.option.name,
                        value: optionTreeItem.option.path
                    });
                }

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
                    const repository = await act.settingsManager.githubManager.getRepository(settingTreeItem.workspaceFolder, false, { command: 'githubLocalActions.importFromGithub', args: [settingTreeItem] });
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
}