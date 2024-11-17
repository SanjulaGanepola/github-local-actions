import { ThemeIcon, TreeItem, TreeItemCollapsibleState, WorkspaceFolder } from "vscode";
import { act } from "../../extension";
import { SettingsManager } from "../../settingsManager";
import { StorageKey } from "../../storageManager";
import { GithubLocalActionsTreeItem } from "../githubLocalActionsTreeItem";
import SettingTreeItem from "./setting";

export default class InputsTreeItem extends TreeItem implements GithubLocalActionsTreeItem {
    static contextValue = 'githubLocalActions.inputs';

    constructor(public workspaceFolder: WorkspaceFolder) {
        super('Inputs', TreeItemCollapsibleState.Collapsed);
        this.contextValue = InputsTreeItem.contextValue;
        this.iconPath = new ThemeIcon('record-keys');
    }

    async getChildren(): Promise<GithubLocalActionsTreeItem[]> {
        const items: GithubLocalActionsTreeItem[] = [];

        const inputs = await act.settingsManager.getSetting(this.workspaceFolder, SettingsManager.inputsRegExp, StorageKey.Inputs, false);
        for (const input of inputs) {
            items.push(SettingTreeItem.getInputTreeItem(this.workspaceFolder, input));
        }

        return items.sort((a, b) => a.label!.toString().localeCompare(b.label!.toString()));
    }
}