import { ThemeIcon, TreeItem, TreeItemCollapsibleState, WorkspaceFolder } from "vscode";
import { act } from "../../extension";
import { GithubLocalActionsTreeItem } from "../githubLocalActionsTreeItem";
import HistoryTreeItem from "./history";

export default class WorkspaceFolderHistoryTreeItem extends TreeItem implements GithubLocalActionsTreeItem {
    static contextValue = 'githubLocalActions.workspaceFolderHistory';

    constructor(public workspaceFolder: WorkspaceFolder) {
        super(workspaceFolder.name, TreeItemCollapsibleState.Collapsed);
        this.contextValue = WorkspaceFolderHistoryTreeItem.contextValue;
        this.iconPath = new ThemeIcon('folder');
    }

    async getChildren(): Promise<GithubLocalActionsTreeItem[]> {
        const items: GithubLocalActionsTreeItem[] = [];

        const workspaceHistory = act.historyManager.workspaceHistory[this.workspaceFolder.uri.fsPath];
        if (workspaceHistory) {
            for (const history of workspaceHistory.slice().reverse()) {
                items.push(new HistoryTreeItem(this.workspaceFolder, history));
            }
        }
        return items;
    }
}