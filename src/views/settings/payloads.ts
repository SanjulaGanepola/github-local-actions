import { ThemeIcon, TreeItem, TreeItemCollapsibleState, WorkspaceFolder } from "vscode";
import { act } from "../../extension";
import { SettingFile } from "../../settingsManager";
import { StorageKey } from "../../storageManager";
import { GithubLocalActionsTreeItem } from "../githubLocalActionsTreeItem";
import SettingFileTreeItem from "./settingFile";

export default class PayloadsTreeItem extends TreeItem implements GithubLocalActionsTreeItem {
    static contextValue = 'githubLocalActions.payloads';
    storageKey = StorageKey.PayloadFiles;

    constructor(public workspaceFolder: WorkspaceFolder, payloadFiles: SettingFile[]) {
        super('Payloads', TreeItemCollapsibleState.Collapsed);
        const selectedPayloadFiles = payloadFiles.filter(payloadFile => payloadFile.selected);
        this.description = selectedPayloadFiles.length > 0 ? `${selectedPayloadFiles[0].name}` : ``;
        this.contextValue = PayloadsTreeItem.contextValue;
        this.iconPath = new ThemeIcon('json');
    }

    async getChildren(): Promise<GithubLocalActionsTreeItem[]> {
        const items: GithubLocalActionsTreeItem[] = [];

        const settings = await act.settingsManager.getSettings(this.workspaceFolder, false);

        const payloadFileTreeItems: GithubLocalActionsTreeItem[] = [];
        for (const payloadFile of settings.payloadFiles) {
            payloadFileTreeItems.push(SettingFileTreeItem.getPayloadTreeItem(this.workspaceFolder, payloadFile));
        }
        items.push(...payloadFileTreeItems.sort((a, b) => a.label!.toString().localeCompare(b.label!.toString())));

        return items;
    }
}