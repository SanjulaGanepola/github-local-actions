import { ThemeIcon, TreeItem, TreeItemCheckboxState, TreeItemCollapsibleState, Uri, WorkspaceFolder } from "vscode";
import { CustomSetting } from "../../settingsManager";
import { StorageKey } from "../../storageManager";
import { GithubLocalActionsTreeItem } from "../githubLocalActionsTreeItem";

export default class OptionTreeItem extends TreeItem implements GithubLocalActionsTreeItem {
    static contextValue = 'githubLocalActions.option';
    option: CustomSetting;
    storageKey: StorageKey;

    constructor(public workspaceFolder: WorkspaceFolder, option: CustomSetting) {
        super(option.name, TreeItemCollapsibleState.None);
        this.option = option;
        this.storageKey = StorageKey.Options;
        this.description = option.path;
        this.contextValue = `${OptionTreeItem.contextValue}_${option.notEditable ? `` : `editable`}`;
        this.iconPath = new ThemeIcon('symbol-property');
        this.checkboxState = option.selected ? TreeItemCheckboxState.Checked : TreeItemCheckboxState.Unchecked;
        this.tooltip = `Option: ${option.name}\n` +
            (option.path ? `Value: ${option.path}\n` : ``) +
            (option.default ? `Default: ${option.default}\n` : ``) +
            `Description: ${option.description}`;
        this.resourceUri = Uri.parse(`${OptionTreeItem.contextValue}:${option.name}?isSelected=${option.selected}&hasValue=${option.path !== ''}&editable=${!option.notEditable}`, true);
    }

    async getChildren(): Promise<GithubLocalActionsTreeItem[]> {
        return [];
    }
}