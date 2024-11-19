import { ThemeIcon, TreeItem, TreeItemCheckboxState, TreeItemCollapsibleState, WorkspaceFolder } from "vscode";
import { Setting, Visibility } from "../../settingsManager";
import { StorageKey } from "../../storageManager";
import { GithubLocalActionsTreeItem } from "../githubLocalActionsTreeItem";

export default class SettingTreeItem extends TreeItem implements GithubLocalActionsTreeItem {
    setting: Setting;
    storageKey: StorageKey;

    constructor(public workspaceFolder: WorkspaceFolder, setting: Setting, storageKey: StorageKey, treeItem: { contextValue: string, iconPath: ThemeIcon }) {
        super(setting.key, TreeItemCollapsibleState.None);
        this.setting = setting;
        this.storageKey = storageKey;
        if (setting.password) {
            this.description = (setting.visible === Visibility.hide && setting.value) ? '••••••••' : setting.value;
        } else {
            this.description = setting.value;
        }
        this.contextValue = `${treeItem.contextValue}_${setting.password ? setting.visible : ''}`;
        this.iconPath = treeItem.iconPath;
        this.checkboxState = setting.selected ? TreeItemCheckboxState.Checked : TreeItemCheckboxState.Unchecked;
    }

    static getSecretTreeItem(workspaceFolder: WorkspaceFolder, secret: Setting): SettingTreeItem {
        return new SettingTreeItem(
            workspaceFolder,
            secret,
            StorageKey.Secrets,
            {
                contextValue: 'githubLocalActions.secret',
                iconPath: new ThemeIcon('key')
            }
        );
    }

    static getVariableTreeItem(workspaceFolder: WorkspaceFolder, variable: Setting): SettingTreeItem {
        return new SettingTreeItem(
            workspaceFolder,
            variable, StorageKey.Variables,
            {
                contextValue: 'githubLocalActions.variable',
                iconPath: new ThemeIcon('symbol-variable')
            }
        );
    }

    static getInputTreeItem(workspaceFolder: WorkspaceFolder, input: Setting): SettingTreeItem {
        return new SettingTreeItem(
            workspaceFolder,
            input, StorageKey.Inputs,
            {
                contextValue: 'githubLocalActions.input',
                iconPath: new ThemeIcon('symbol-parameter')
            }
        );
    }

    static getRunnerTreeItem(workspaceFolder: WorkspaceFolder, runner: Setting): SettingTreeItem {
        return new SettingTreeItem(
            workspaceFolder,
            runner, StorageKey.Runners,
            {
                contextValue: 'githubLocalActions.runner',
                iconPath: new ThemeIcon('vm-connect')
            }
        );
    }

    async getChildren(): Promise<GithubLocalActionsTreeItem[]> {
        return [];
    }
}