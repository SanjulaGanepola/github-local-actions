import { ThemeIcon, TreeItem, TreeItemCollapsibleState, WorkspaceFolder } from "vscode";
import { act } from "../../extension";
import { Setting, SettingsManager } from "../../settingsManager";
import { StorageKey } from "../../storageManager";
import { GithubLocalActionsTreeItem } from "../githubLocalActionsTreeItem";
import SettingTreeItem from "./setting";

export default class SecretsTreeItem extends TreeItem implements GithubLocalActionsTreeItem {
    static contextValue = 'githubLocalActions.secrets';

    constructor(public workspaceFolder: WorkspaceFolder, secrets: Setting[]) {
        super('Secrets', TreeItemCollapsibleState.Collapsed);
        this.description = `${secrets.filter(secret => secret.selected).length}/${secrets.length}`;
        this.contextValue = SecretsTreeItem.contextValue;
        this.iconPath = new ThemeIcon('lock');
    }

    async getChildren(): Promise<GithubLocalActionsTreeItem[]> {
        const items: GithubLocalActionsTreeItem[] = [];

        const secrets = await act.settingsManager.getSetting(this.workspaceFolder, SettingsManager.secretsRegExp, StorageKey.Secrets, true);
        for (const secret of secrets) {
            items.push(SettingTreeItem.getSecretTreeItem(this.workspaceFolder, secret));
        }

        return items.sort((a, b) => a.label!.toString().localeCompare(b.label!.toString()));
    }
}