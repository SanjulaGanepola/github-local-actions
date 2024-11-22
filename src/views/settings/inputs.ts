import { ThemeIcon, TreeItem, TreeItemCollapsibleState, WorkspaceFolder } from "vscode";
import { act } from "../../extension";
import { Setting } from "../../settingsManager";
import { StorageKey } from "../../storageManager";
import { GithubLocalActionsTreeItem } from "../githubLocalActionsTreeItem";
import SettingTreeItem from "./setting";
import SettingFileTreeItem from "./settingFile";

export default class InputsTreeItem extends TreeItem implements GithubLocalActionsTreeItem {
    static contextValue = 'githubLocalActions.inputs';
    storageKey = StorageKey.InputFiles;

    constructor(public workspaceFolder: WorkspaceFolder, inputs: Setting[]) {
        super('Inputs', TreeItemCollapsibleState.Collapsed);
        this.description = `${inputs.filter(input => input.selected).length}/${inputs.length}`;
        this.contextValue = InputsTreeItem.contextValue;
        this.iconPath = new ThemeIcon('record-keys');
    }

    async getChildren(): Promise<GithubLocalActionsTreeItem[]> {
        const items: GithubLocalActionsTreeItem[] = [];

        const settings = await act.settingsManager.getSettings(this.workspaceFolder, false);

        const inputTreeItems: GithubLocalActionsTreeItem[] = [];
        for (const input of settings.inputs) {
            inputTreeItems.push(SettingTreeItem.getInputTreeItem(this.workspaceFolder, input));
        }
        items.push(...inputTreeItems.sort((a, b) => a.label!.toString().localeCompare(b.label!.toString())));

        const inputFileTreeItems: GithubLocalActionsTreeItem[] = [];
        for (const inputFile of settings.inputFiles) {
            inputFileTreeItems.push(SettingFileTreeItem.getInputTreeItem(this.workspaceFolder, inputFile));
        }
        items.push(...inputFileTreeItems.sort((a, b) => a.label!.toString().localeCompare(b.label!.toString())));

        return items;
    }
}