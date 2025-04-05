import { CancellationToken, commands, EventEmitter, ExtensionContext, extensions, TreeDataProvider, TreeItem, window, workspace } from "vscode";
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
            commands.registerCommand('githubLocalActions.focusTask', async (historyTreeItem: HistoryTreeItem) => {
                const terminals = window.terminals;
                for (const terminal of terminals) {
                    if (terminal.creationOptions.name === `${historyTreeItem.history.name} #${historyTreeItem.history.count}`) {
                        terminal.show();
                        return;
                    }
                }

                window.showErrorMessage(`${historyTreeItem.history.name} #${historyTreeItem.history.count} task is no longer open.`, 'View Output').then(async value => {
                    if (value === 'View Output') {
                        await commands.executeCommand('githubLocalActions.viewOutput', historyTreeItem);
                    }
                });
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
                const allHistory = await act.historyManager.getAllHistory();

                if (workspaceFolders.length === 1) {
                    items.push(...await new WorkspaceFolderHistoryTreeItem(workspaceFolders[0]).getChildren());

                    const workspaceHistory = allHistory[workspaceFolders[0].uri.fsPath] ?? [];
                    if (workspaceHistory.length > 0) {
                        isRunning = workspaceHistory.find(workspaceHistory => workspaceHistory.status === HistoryStatus.Running) !== undefined;
                        noHistory = false;
                    }
                } else if (workspaceFolders.length > 1) {
                    for (const workspaceFolder of workspaceFolders) {
                        items.push(new WorkspaceFolderHistoryTreeItem(workspaceFolder));

                        const workspaceHistory = allHistory[workspaceFolder.uri.fsPath] ?? [];
                        if (workspaceHistory.length > 0) {
                            isRunning = workspaceHistory.find(workspaceHistory => workspaceHistory.status === HistoryStatus.Running) !== undefined;
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