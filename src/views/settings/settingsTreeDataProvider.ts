import { CancellationToken, commands, EventEmitter, ExtensionContext, TreeDataProvider, TreeItem, workspace } from "vscode";
import { act } from "../../extension";
import { GithubLocalActionsTreeItem } from "../githubLocalActionsTreeItem";
import ContainerEngineTreeItem from "./containerEngine";
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
                //TODO: Implement
            }),
            commands.registerCommand('githubLocalActions.editVariable', async (variableTreeItem: VariableTreeItem) => {
                //TODO: Implement
            }),
            commands.registerCommand('githubLocalActions.editInput', async (inputTreeItem: InputTreeItem) => {
                //TODO: Implement
            }),
            commands.registerCommand('githubLocalActions.addRunner', async (runnersTreeItem: RunnersTreeItem) => {
                //TODO: Implement
            }),
            commands.registerCommand('githubLocalActions.editContainerEngine', async (containerEngineTreeItem: ContainerEngineTreeItem) => {
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
                    return await new WorkspaceFolderSettingsTreeItem(workspaceFolders[0]).getChildren();
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