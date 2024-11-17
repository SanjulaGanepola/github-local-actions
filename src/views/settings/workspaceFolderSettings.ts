import { ThemeIcon, TreeItem, TreeItemCollapsibleState, WorkspaceFolder } from "vscode";
import { act } from "../../extension";
import { SettingsManager } from "../../settingsManager";
import { StorageKey } from "../../storageManager";
import { GithubLocalActionsTreeItem } from "../githubLocalActionsTreeItem";
import InputsTreeItem from "./inputs";
import RunnersTreeItem from "./runners";
import SecretsTreeItem from "./secrets";
import VariablesTreeItem from "./variables";

export default class WorkspaceFolderSettingsTreeItem extends TreeItem implements GithubLocalActionsTreeItem {
    static contextValue = 'githubLocalActions.workspaceFolderSettings';

    constructor(public workspaceFolder: WorkspaceFolder) {
        super(workspaceFolder.name, TreeItemCollapsibleState.Collapsed);
        this.contextValue = WorkspaceFolderSettingsTreeItem.contextValue;
        this.iconPath = new ThemeIcon('folder');
    }

    async getChildren(): Promise<GithubLocalActionsTreeItem[]> {
        const items: GithubLocalActionsTreeItem[] = [];

        const secrets = await act.settingsManager.getSetting(this.workspaceFolder, SettingsManager.secretsRegExp, StorageKey.Secrets, true);
        const variables = await act.settingsManager.getSetting(this.workspaceFolder, SettingsManager.variablesRegExp, StorageKey.Variables, false);
        const inputs = await act.settingsManager.getSetting(this.workspaceFolder, SettingsManager.inputsRegExp, StorageKey.Inputs, false);
        const runners = await act.settingsManager.getSetting(this.workspaceFolder, SettingsManager.runnersRegExp, StorageKey.Runners, false);
        items.push(...[
            new SecretsTreeItem(this.workspaceFolder, secrets),
            new VariablesTreeItem(this.workspaceFolder, variables),
            new InputsTreeItem(this.workspaceFolder, inputs),
            new RunnersTreeItem(this.workspaceFolder, runners)
        ]);

        return items;
    }
}