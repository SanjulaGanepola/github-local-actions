import { ThemeIcon, TreeItem, TreeItemCollapsibleState, Uri, WorkspaceFolder } from "vscode";
import { act } from "../../extension";
import { CustomSetting, Setting } from "../../settingsManager";
import { StorageKey } from "../../storageManager";
import { GithubLocalActionsTreeItem } from "../githubLocalActionsTreeItem";
import SettingTreeItem from "./setting";
import SettingFileTreeItem from "./settingFile";

export default class InputsTreeItem extends TreeItem implements GithubLocalActionsTreeItem {
    static contextValue = 'githubLocalActions.inputs';
    storageKey = StorageKey.InputFiles;

    constructor(public workspaceFolder: WorkspaceFolder, inputs: Setting[], inputFiles: CustomSetting[]) {
        super('Inputs', TreeItemCollapsibleState.Collapsed);
        const selectedInputFiles = inputFiles.filter(inputFile => inputFile.selected);
        this.description = `${inputs.filter(input => input.selected).length}/${inputs.length}` +
            (selectedInputFiles.length > 0 ? ` + ${selectedInputFiles[0].name}` : ``);
        this.contextValue = InputsTreeItem.contextValue;
        this.iconPath = new ThemeIcon('record-keys');
        const hasAllValues = inputs.filter(input => input.selected && input.value === '').length === 0;
        this.resourceUri = Uri.parse(`${InputsTreeItem.contextValue}:Inputs?hasAllValues=${hasAllValues}`, true);
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