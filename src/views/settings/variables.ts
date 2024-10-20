import { ThemeIcon, TreeItem, TreeItemCollapsibleState, WorkspaceFolder } from "vscode";
import { act } from "../../extension";
import { StorageKey } from "../../storageManager";
import { GithubLocalActionsTreeItem } from "../githubLocalActionsTreeItem";
import VariableTreeItem from "./variable";

export default class VariablesTreeItem extends TreeItem implements GithubLocalActionsTreeItem {
    static contextValue = 'githubLocalActions.variables';

    constructor(public workspaceFolder: WorkspaceFolder) {
        super('Variables', TreeItemCollapsibleState.Collapsed);
        this.contextValue = VariablesTreeItem.contextValue;
        this.iconPath = new ThemeIcon('symbol-key');
    }

    async getChildren(): Promise<GithubLocalActionsTreeItem[]> {
        const items: GithubLocalActionsTreeItem[] = [];

        const variables = await act.settingsManager.getSetting(this.workspaceFolder, /\${{\s*vars\.(.*?)(?:\s*==\s*(.*?))?\s*}}/g, StorageKey.Variables);
        for (const variable of variables) {
            items.push(new VariableTreeItem(this.workspaceFolder, variable));
        }

        return items.sort((a, b) => a.label!.toString().localeCompare(b.label!.toString()));
    }
}