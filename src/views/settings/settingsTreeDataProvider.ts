import * as path from "path";
import { CancellationToken, commands, EventEmitter, ExtensionContext, QuickPickItem, QuickPickItemKind, ThemeIcon, TreeCheckboxChangeEvent, TreeDataProvider, TreeItem, TreeItemCheckboxState, window, workspace } from "vscode";
import { act } from "../../extension";
import { SettingFile, Visibility } from "../../settingsManager";
import { StorageKey } from "../../storageManager";
import { GithubLocalActionsTreeItem } from "../githubLocalActionsTreeItem";
import InputsTreeItem from "./inputs";
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
            commands.registerCommand('githubLocalActions.addSettingFiles', async (treeItem: SecretsTreeItem | VariablesTreeItem | InputsTreeItem, title: string) => {
                const settingFilesUris = await window.showOpenDialog({
                    title: title,
                    canSelectFiles: true,
                    canSelectFolders: false,
                    canSelectMany: true,
                    defaultUri: treeItem.workspaceFolder.uri
                });

                if (settingFilesUris) {
                    const settingFilesPaths = (await act.settingsManager.getSettingFiles(treeItem.workspaceFolder, treeItem.storageKey)).map(settingFile => settingFile.path);
                    const existingSettingFileNames: string[] = [];

                    for await (const uri of settingFilesUris) {
                        const settingFileName = path.parse(uri.fsPath).name;

                        if (settingFilesPaths.includes(uri.fsPath)) {
                            existingSettingFileNames.push(settingFileName);
                        } else {
                            const newSettingFile: SettingFile = {
                                name: path.parse(uri.fsPath).base,
                                path: uri.fsPath,
                                selected: false
                            };
                            await act.settingsManager.editSettingFile(treeItem.workspaceFolder, newSettingFile, treeItem.storageKey);
                        }
                    }

                    if (existingSettingFileNames.length > 0) {
                        window.showErrorMessage(`The following file(s) have already been added: ${existingSettingFileNames.join(', ')}`);
                    }
                    this.refresh();
                }
            }),
            commands.registerCommand('githubLocalActions.addSecretFiles', async (secretsTreeItem: SecretsTreeItem) => {
                await commands.executeCommand('githubLocalActions.addSettingFiles', secretsTreeItem, 'Add Secret File');
            }),
            commands.registerCommand('githubLocalActions.addVariableFiles', async (variablesTreeItem: VariablesTreeItem) => {
                await commands.executeCommand('githubLocalActions.addSettingFiles', variablesTreeItem, 'Add Variable File');
            }),
            commands.registerCommand('githubLocalActions.addInputFiles', async (inputsTreeItem: InputsTreeItem) => {
                await commands.executeCommand('githubLocalActions.addSettingFiles', inputsTreeItem, 'Add Input File');
            }),
            commands.registerCommand('githubLocalActions.openSettingFile', async (settingFileTreeItem: SettingFileTreeItem) => {
                const document = await workspace.openTextDocument(settingFileTreeItem.settingFile.path);
                await window.showTextDocument(document);
            }),
            commands.registerCommand('githubLocalActions.removeSettingFile', async (settingFileTreeItem: SettingFileTreeItem) => {
                await act.settingsManager.removeSettingFile(settingFileTreeItem.workspaceFolder, settingFileTreeItem.settingFile, settingFileTreeItem.storageKey);
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

    async onDidChangeCheckboxState(event: TreeCheckboxChangeEvent<SettingTreeItem | SettingFileTreeItem>) {
        for await (const [treeItem, state] of event.items) {
            if (treeItem instanceof SettingTreeItem) {
                const newSetting = treeItem.setting;
                newSetting.selected = (state === TreeItemCheckboxState.Checked);
                await act.settingsManager.editSetting(treeItem.workspaceFolder, newSetting, treeItem.storageKey);
            } else {
                const newSettingFile = treeItem.settingFile;
                newSettingFile.selected = (state === TreeItemCheckboxState.Checked);
                await act.settingsManager.editSettingFile(treeItem.workspaceFolder, newSettingFile, treeItem.storageKey);
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