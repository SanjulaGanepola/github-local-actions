import { ThemeIcon, TreeItem, TreeItemCollapsibleState, WorkspaceFolder } from "vscode";
import { act } from "../../extension";
import { SettingsManager } from "../../settingsManager";
import { StorageKey } from "../../storageManager";
import { GithubLocalActionsTreeItem } from "../githubLocalActionsTreeItem";
import SecretTreeItem from "./secret";

export default class SecretsTreeItem extends TreeItem implements GithubLocalActionsTreeItem {
    static contextValue = 'githubLocalActions.secrets';

    constructor(public workspaceFolder: WorkspaceFolder) {
        super('Secrets', TreeItemCollapsibleState.Collapsed);
        this.contextValue = SecretsTreeItem.contextValue;
        this.iconPath = new ThemeIcon('lock');
    }

    async getChildren(): Promise<GithubLocalActionsTreeItem[]> {
        const items: GithubLocalActionsTreeItem[] = [];

        const secrets = await act.settingsManager.getSetting(this.workspaceFolder, SettingsManager.secretsRegExp, StorageKey.Secrets);
        for (const secret of secrets) {
            items.push(new SecretTreeItem(this.workspaceFolder, secret));
        }

        return items.sort((a, b) => a.label!.toString().localeCompare(b.label!.toString()));
    }
}