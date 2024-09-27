import { ThemeIcon, TreeItem, TreeItemCollapsibleState } from "vscode";
import { GithubLocalActionsTreeItem } from "../githubLocalActionsTreeItem";

export default class SecretsTreeItem extends TreeItem implements GithubLocalActionsTreeItem {
    static contextValue = 'githubLocalActions.secrets';

    constructor() {
        super('Secrets', TreeItemCollapsibleState.Collapsed);
        this.contextValue = SecretsTreeItem.contextValue;
        this.iconPath = new ThemeIcon('lock');
    }

    async getChildren(): Promise<GithubLocalActionsTreeItem[]> {
        return [];
    }
}