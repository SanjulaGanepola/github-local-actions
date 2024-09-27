import { ThemeIcon, TreeItem, TreeItemCollapsibleState } from "vscode";
import { GithubLocalActionsTreeItem } from "../githubLocalActionsTreeItem";

export default class VariablesTreeItem extends TreeItem implements GithubLocalActionsTreeItem {
    static contextValue = 'variables';

    constructor() {
        super('Variables', TreeItemCollapsibleState.Collapsed);
        this.contextValue = VariablesTreeItem.contextValue;
        this.iconPath = new ThemeIcon('symbol-key');
    }

    async getChildren(): Promise<GithubLocalActionsTreeItem[]> {
        return [];
    }
}