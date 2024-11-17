import { ThemeIcon, TreeItem, TreeItemCollapsibleState, WorkspaceFolder } from "vscode";
import { act } from "../../extension";
import { Setting, SettingsManager } from "../../settingsManager";
import { StorageKey } from "../../storageManager";
import { GithubLocalActionsTreeItem } from "../githubLocalActionsTreeItem";
import SettingTreeItem from "./setting";

export default class VariablesTreeItem extends TreeItem implements GithubLocalActionsTreeItem {
    static contextValue = 'githubLocalActions.variables';

    constructor(public workspaceFolder: WorkspaceFolder, variables: Setting[]) {
        super('Variables', TreeItemCollapsibleState.Collapsed);
        this.description = `${variables.filter(variable => variable.selected).length}/${variables.length}`;
        this.contextValue = VariablesTreeItem.contextValue;
        this.iconPath = new ThemeIcon('symbol-key');
    }

    async getChildren(): Promise<GithubLocalActionsTreeItem[]> {
        const items: GithubLocalActionsTreeItem[] = [];

        const variables = await act.settingsManager.getSetting(this.workspaceFolder, SettingsManager.variablesRegExp, StorageKey.Variables, false);
        for (const variable of variables) {
            items.push(SettingTreeItem.getVariableTreeItem(this.workspaceFolder, variable));
        }

        return items.sort((a, b) => a.label!.toString().localeCompare(b.label!.toString()));
    }
}