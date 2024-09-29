import { ThemeIcon, TreeItem, TreeItemCollapsibleState } from "vscode";
import { Secret } from "../../settingsManager";
import { GithubLocalActionsTreeItem } from "../githubLocalActionsTreeItem";

export default class SecretTreeItem extends TreeItem implements GithubLocalActionsTreeItem {
    static contextValue = 'githubLocalActions.secret';

    constructor(secret: Secret) {
        super(secret.key, TreeItemCollapsibleState.None);
        this.description = secret.value;
        this.contextValue = SecretTreeItem.contextValue;
        this.iconPath = new ThemeIcon('key');
    }

    async getChildren(): Promise<GithubLocalActionsTreeItem[]> {
        return [];
    }
}