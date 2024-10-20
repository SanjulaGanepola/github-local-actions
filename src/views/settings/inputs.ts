import { ThemeIcon, TreeItem, TreeItemCollapsibleState, WorkspaceFolder } from "vscode";
import { act } from "../../extension";
import { StorageKey } from "../../storageManager";
import { GithubLocalActionsTreeItem } from "../githubLocalActionsTreeItem";
import InputTreeItem from "./input";

export default class InputsTreeItem extends TreeItem implements GithubLocalActionsTreeItem {
    static contextValue = 'githubLocalActions.inputs';

    constructor(public workspaceFolder: WorkspaceFolder) {
        super('Inputs', TreeItemCollapsibleState.Collapsed);
        this.contextValue = InputsTreeItem.contextValue;
        this.iconPath = new ThemeIcon('record-keys');
    }

    async getChildren(): Promise<GithubLocalActionsTreeItem[]> {
        const items: GithubLocalActionsTreeItem[] = [];

        const inputs = await act.settingsManager.getSetting(this.workspaceFolder, /\${{\s*(?:inputs|github\.event\.inputs)\.(.*?)(?:\s*==\s*(.*?))?\s*}}/g, StorageKey.Inputs);
        for (const input of inputs) {
            items.push(new InputTreeItem(this.workspaceFolder, input));
        }

        return items;
    }
}