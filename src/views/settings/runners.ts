import { ThemeIcon, TreeItem, TreeItemCollapsibleState } from "vscode";
import { GithubLocalActionsTreeItem } from "../githubLocalActionsTreeItem";

export default class RunnersTreeItem extends TreeItem implements GithubLocalActionsTreeItem {
    static contextValue = 'githubLocalActions.runners';

    constructor() {
        super('Runners', TreeItemCollapsibleState.Collapsed);
        this.contextValue = RunnersTreeItem.contextValue;
        this.iconPath = new ThemeIcon('database');
    }

    async getChildren(): Promise<GithubLocalActionsTreeItem[]> {
        return [];
    }
}