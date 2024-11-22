import { CancellationToken, commands, EventEmitter, ExtensionContext, QuickPickItem, QuickPickItemKind, ThemeIcon, TreeCheckboxChangeEvent, TreeDataProvider, TreeItem, TreeItemCheckboxState, window, workspace } from "vscode";
import { act } from "../../extension";
import { Visibility } from "../../settingsManager";
import { StorageKey } from "../../storageManager";
import { GithubLocalActionsTreeItem } from "../githubLocalActionsTreeItem";
import SettingTreeItem from "./setting";
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

    async onDidChangeCheckboxState(event: TreeCheckboxChangeEvent<SettingTreeItem>) {
        for await (const [treeItem, state] of event.items) {
            const newSetting = treeItem.setting;
            newSetting.selected = (state === TreeItemCheckboxState.Checked);
            await act.settingsManager.editSetting(treeItem.workspaceFolder, newSetting, treeItem.storageKey);
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