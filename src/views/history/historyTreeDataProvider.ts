import { CancellationToken, commands, EventEmitter, ExtensionContext, extensions, TreeDataProvider, TreeItem, workspace } from "vscode";
import { act } from "../../extension";
import { HistoryStatus } from "../../historyManager";
import { Utils } from "../../utils";
import { GithubLocalActionsTreeItem } from "../githubLocalActionsTreeItem";
import HistoryTreeItem from "./history";
import WorkspaceFolderHistoryTreeItem from "./workspaceFolderHistory";

export default class HistoryTreeDataProvider implements TreeDataProvider<GithubLocalActionsTreeItem> {
    private _onDidChangeTreeData = new EventEmitter<GithubLocalActionsTreeItem | undefined | null | void>();
    readonly onDidChangeTreeData = this._onDidChangeTreeData.event;
    static VIEW_ID = 'history';

    constructor(context: ExtensionContext) {
        extensions.onDidChange(e => {
            this.refresh();
        });

        context.subscriptions.push(
            commands.registerCommand('githubLocalActions.clearAll', async (workspaceFolderHistoryTreeItem?: WorkspaceFolderHistoryTreeItem) => {
                const workspaceFolder = await Utils.getWorkspaceFolder(workspaceFolderHistoryTreeItem?.workspaceFolder);
                if (workspaceFolder) {
                    await act.historyManager.clearAll(workspaceFolder);
                }
            }),
            commands.registerCommand('githubLocalActions.refreshHistory', async () => {
                this.refresh();
            }),
            commands.registerCommand('githubLocalActions.viewOutput', async (historyTreeItem: HistoryTreeItem) => {
                await act.historyManager.viewOutput(historyTreeItem.history);
            }),
            commands.registerCommand('githubLocalActions.restart', async (historyTreeItem: HistoryTreeItem) => {
                await act.historyManager.restart(historyTreeItem.history);
            }),
            commands.registerCommand('githubLocalActions.stop', async (historyTreeItem: HistoryTreeItem) => {
                await act.historyManager.stop(historyTreeItem.history);
                this.refresh();
            }),
            commands.registerCommand('githubLocalActions.remove', async (historyTreeItem: HistoryTreeItem) => {
                await act.historyManager.remove(historyTreeItem.history);
                this.refresh();
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
            let isRunning: boolean = false;
            let noHistory: boolean = true;

            const workspaceFolders = workspace.workspaceFolders;
            if (workspaceFolders) {
                if (workspaceFolders.length === 1) {
                    return await new WorkspaceFolderHistoryTreeItem(workspaceFolders[0]).getChildren();
                } else if (workspaceFolders.length > 1) {
                    for (const workspaceFolder of workspaceFolders) {
                        items.push(new WorkspaceFolderHistoryTreeItem(workspaceFolder));

                        const workspaceHistory = act.historyManager.workspaceHistory[workspaceFolders[0].uri.fsPath];
                        if (workspaceHistory.length > 0) {
                            isRunning = act.historyManager.workspaceHistory[workspaceFolders[0].uri.fsPath].find(workspaceHistory => workspaceHistory.status === HistoryStatus.Running) !== undefined;
                            noHistory = false;
                        }
                    }
                }
            }

            await commands.executeCommand('setContext', 'githubLocalActions:isRunning', isRunning);
            await commands.executeCommand('setContext', 'githubLocalActions:noHistory', noHistory);
            return items;
        }
    }
}