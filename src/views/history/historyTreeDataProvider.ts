import { CancellationToken, commands, EventEmitter, ExtensionContext, extensions, TreeDataProvider, TreeItem, workspace } from "vscode";
import { HistoryStatus } from "../../act";
import { act } from "../../extension";
import { GithubLocalActionsTreeItem } from "../githubLocalActionsTreeItem";
import HistoryTreeItem from "./history";

export default class HistoryTreeDataProvider implements TreeDataProvider<GithubLocalActionsTreeItem> {
    private _onDidChangeTreeData = new EventEmitter<GithubLocalActionsTreeItem | undefined | null | void>();
    readonly onDidChangeTreeData = this._onDidChangeTreeData.event;
    static VIEW_ID = 'history';

    constructor(context: ExtensionContext) {
        extensions.onDidChange(e => {
            this.refresh();
        });

        context.subscriptions.push(
            commands.registerCommand('githubLocalActions.clearAll', async () => {
                await act.clearAll();
            }),
            commands.registerCommand('githubLocalActions.refreshHistory', async () => {
                this.refresh();
            }),
            commands.registerCommand('githubLocalActions.restart', async (historyTreeItem: HistoryTreeItem) => {
                await act.runCommand(historyTreeItem.history.commandArgs);
            }),
            commands.registerCommand('githubLocalActions.stop', async (historyTreeItem: HistoryTreeItem) => {
                await act.stop(historyTreeItem.history);
            }),
            commands.registerCommand('githubLocalActions.remove', async (historyTreeItem: HistoryTreeItem) => {
                await act.remove(historyTreeItem.history);
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

            const workspaceFolders = workspace.workspaceFolders;
            let isRunning: boolean = false;
            if (workspaceFolders && workspaceFolders.length > 0) {
                //TODO: Fix for multi workspace support
                const workspaceHistory = act.workspaceHistory[workspaceFolders[0].uri.fsPath];
                if (workspaceHistory) {
                    for (const history of workspaceHistory) {
                        items.push(new HistoryTreeItem(history));

                        if (history.status === HistoryStatus.Running) {
                            isRunning = true;
                        }
                    }
                }
            }

            await commands.executeCommand('setContext', 'githubLocalActions:isRunning', isRunning);
            await commands.executeCommand('setContext', 'githubLocalActions:noHistory', items.length == 0);
            return items;
        }
    }
}