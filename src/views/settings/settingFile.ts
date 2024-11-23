import { ThemeIcon, TreeItem, TreeItemCheckboxState, TreeItemCollapsibleState, WorkspaceFolder } from "vscode";
import { SettingFile } from "../../settingsManager";
import { StorageKey } from "../../storageManager";
import { GithubLocalActionsTreeItem } from "../githubLocalActionsTreeItem";

export default class SettingFileTreeItem extends TreeItem implements GithubLocalActionsTreeItem {
    settingFile: SettingFile;
    storageKey: StorageKey;

    constructor(public workspaceFolder: WorkspaceFolder, settingFile: SettingFile, storageKey: StorageKey, treeItem: { contextValue: string, iconPath: ThemeIcon }) {
        super(settingFile.name, TreeItemCollapsibleState.None);
        this.settingFile = settingFile;
        this.storageKey = storageKey;
        this.description = settingFile.path;
        this.contextValue = treeItem.contextValue;
        this.iconPath = treeItem.iconPath;
        this.checkboxState = settingFile.selected ? TreeItemCheckboxState.Checked : TreeItemCheckboxState.Unchecked;
        this.tooltip = `Name: ${settingFile.name}\n` +
            `Path: ${settingFile.path}\n`;
    }

    static getSecretTreeItem(workspaceFolder: WorkspaceFolder, secretFile: SettingFile): SettingFileTreeItem {
        return new SettingFileTreeItem(
            workspaceFolder,
            secretFile,
            StorageKey.SecretFiles,
            {
                contextValue: 'githubLocalActions.secretFile',
                iconPath: new ThemeIcon('gist-secret')
            }
        );
    }

    static getVariableTreeItem(workspaceFolder: WorkspaceFolder, variableFile: SettingFile): SettingFileTreeItem {
        return new SettingFileTreeItem(
            workspaceFolder,
            variableFile,
            StorageKey.VariableFiles,
            {
                contextValue: 'githubLocalActions.variableFile',
                iconPath: new ThemeIcon('file')
            }
        );
    }

    static getInputTreeItem(workspaceFolder: WorkspaceFolder, inputFile: SettingFile): SettingFileTreeItem {
        return new SettingFileTreeItem(
            workspaceFolder,
            inputFile,
            StorageKey.InputFiles,
            {
                contextValue: 'githubLocalActions.inputFile',
                iconPath: new ThemeIcon('file')
            }
        );
    }

    static getPayloadTreeItem(workspaceFolder: WorkspaceFolder, payloadFile: SettingFile): SettingFileTreeItem {
        return new SettingFileTreeItem(
            workspaceFolder,
            payloadFile,
            StorageKey.PayloadFiles,
            {
                contextValue: 'githubLocalActions.payloadFile',
                iconPath: new ThemeIcon('file')
            }
        );
    }

    async getChildren(): Promise<GithubLocalActionsTreeItem[]> {
        return [];
    }
}