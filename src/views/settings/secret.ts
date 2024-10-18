import { ThemeIcon, TreeItem, TreeItemCheckboxState, TreeItemCollapsibleState } from "vscode";
import { Secret } from "../../settingsManager";
import { GithubLocalActionsTreeItem } from "../githubLocalActionsTreeItem";

export default class SecretTreeItem extends TreeItem implements GithubLocalActionsTreeItem {
    static contextValue = 'githubLocalActions.secret';

    constructor(secret: Secret) {
        super(secret.key, TreeItemCollapsibleState.None);
        if (secret.value) {
            this.description = '••••••••'
        }
        this.contextValue = SecretTreeItem.contextValue;
        this.iconPath = new ThemeIcon('key');
        this.checkboxState = TreeItemCheckboxState.Unchecked;
    }

    async getChildren(): Promise<GithubLocalActionsTreeItem[]> {
        return [];
    }
}