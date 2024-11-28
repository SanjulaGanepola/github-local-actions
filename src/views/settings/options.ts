import { ThemeIcon, TreeItem, TreeItemCollapsibleState, Uri, WorkspaceFolder } from "vscode";
import { act } from "../../extension";
import { CustomSetting } from "../../settingsManager";
import { StorageKey } from "../../storageManager";
import { GithubLocalActionsTreeItem } from "../githubLocalActionsTreeItem";
import OptionTreeItem from "./option";

export default class OptionsTreeItem extends TreeItem implements GithubLocalActionsTreeItem {
    static contextValue = 'githubLocalActions.options';
    storageKey: StorageKey;

    constructor(public workspaceFolder: WorkspaceFolder, options: CustomSetting[]) {
        super('Options', TreeItemCollapsibleState.Collapsed);
        this.storageKey = StorageKey.Options;
        this.description = `${options.filter(option => option.selected).length}/${options.length}`;
        this.contextValue = OptionsTreeItem.contextValue;
        this.iconPath = new ThemeIcon('gear');
        const hasAllValues = options.filter(option => option.selected && option.path === '' && !option.notEditable).length === 0;
        this.resourceUri = Uri.parse(`${OptionsTreeItem.contextValue}:Options?hasAllValues=${hasAllValues}`, true);
    }

    async getChildren(): Promise<GithubLocalActionsTreeItem[]> {
        const items: GithubLocalActionsTreeItem[] = [];

        const settings = await act.settingsManager.getSettings(this.workspaceFolder, false);
        for (const option of settings.options) {
            items.push(new OptionTreeItem(this.workspaceFolder, option));
        }

        return items.sort((a, b) => a.label!.toString().localeCompare(b.label!.toString()));
    }
}