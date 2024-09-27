import { ThemeIcon, TreeItem, TreeItemCollapsibleState } from "vscode";
import { GithubLocalActionsTreeItem } from "../githubLocalActionsTreeItem";

export default class EnvironmentsTreeItem extends TreeItem implements GithubLocalActionsTreeItem {
    static contextValue = 'environments';

    constructor() {
        super('Environments', TreeItemCollapsibleState.Collapsed);
        this.contextValue = EnvironmentsTreeItem.contextValue;
        this.iconPath = new ThemeIcon('server-environment');
    }

    async getChildren(): Promise<GithubLocalActionsTreeItem[]> {
        return [];
    }
}