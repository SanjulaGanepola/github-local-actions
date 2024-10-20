import { CancellationToken, commands, EventEmitter, ExtensionContext, TreeDataProvider, TreeItem, window, workspace } from "vscode";
import { act } from "../../extension";
import { StorageKey } from "../../storageManager";
import { GithubLocalActionsTreeItem } from "../githubLocalActionsTreeItem";
import InputTreeItem from "./input";
import RunnersTreeItem from "./runners";
import SecretTreeItem from "./secret";
import VariableTreeItem from "./variable";
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
            commands.registerCommand('githubLocalActions.editSecret', async (secretTreeItem: SecretTreeItem) => {
                const newValue = await window.showInputBox({
                    prompt: `Enter the value for ${secretTreeItem.secret.value}`,
                    placeHolder: `Secret value`,
                    value: secretTreeItem.secret.value,
                    password: true
                });

                if (newValue) {
                    act.settingsManager.editSetting(secretTreeItem.workspaceFolder, { key: secretTreeItem.secret.key, value: newValue, selected: secretTreeItem.secret.selected }, StorageKey.Secrets);
                    this.refresh();
                }
            }),
            commands.registerCommand('githubLocalActions.editVariable', async (variableTreeItem: VariableTreeItem) => {
                const newValue = await window.showInputBox({
                    prompt: `Enter the value for ${variableTreeItem.variable.value}`,
                    placeHolder: `Variable value`,
                    value: variableTreeItem.variable.value
                });

                if (newValue) {
                    act.settingsManager.editSetting(variableTreeItem.workspaceFolder, { key: variableTreeItem.variable.key, value: newValue, selected: variableTreeItem.variable.selected }, StorageKey.Variables);
                    this.refresh();
                }
            }),
            commands.registerCommand('githubLocalActions.editInput', async (inputTreeItem: InputTreeItem) => {
                const newValue = await window.showInputBox({
                    prompt: `Enter the value for ${inputTreeItem.input.value}`,
                    placeHolder: `Input value`,
                    value: inputTreeItem.input.value
                });

                if (newValue) {
                    act.settingsManager.editSetting(inputTreeItem.workspaceFolder, { key: inputTreeItem.input.key, value: newValue, selected: inputTreeItem.input.selected }, StorageKey.Inputs);
                    this.refresh();
                }
            }),
            commands.registerCommand('githubLocalActions.addRunner', async (runnersTreeItem: RunnersTreeItem) => {
                //TODO: Implement
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
                } else if (workspaceFolders.length > 1) {
                    for (const workspaceFolder of workspaceFolders) {
                        items.push(new WorkspaceFolderSettingsTreeItem(workspaceFolder));

                        const workflows = await act.workflowsManager.getWorkflows(workspaceFolder);
                        if (workflows.length > 0) {
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