import { ThemeIcon, TreeItem, TreeItemCollapsibleState, WorkspaceFolder } from "vscode";
import { act } from "../../extension";
import { Setting, SettingsManager } from "../../settingsManager";
import { StorageKey } from "../../storageManager";
import { GithubLocalActionsTreeItem } from "../githubLocalActionsTreeItem";
import SettingTreeItem from "./setting";

export default class RunnersTreeItem extends TreeItem implements GithubLocalActionsTreeItem {
    static contextValue = 'githubLocalActions.runners';

    constructor(public workspaceFolder: WorkspaceFolder, runners: Setting[]) {
        super('Runners', TreeItemCollapsibleState.Collapsed);
        this.description = `${runners.filter(runner => runner.selected).length}/${runners.length}`;
        this.contextValue = RunnersTreeItem.contextValue;
        this.iconPath = new ThemeIcon('server-environment');
    }

    async getChildren(): Promise<GithubLocalActionsTreeItem[]> {
        const items: GithubLocalActionsTreeItem[] = [];

        const runners = await act.settingsManager.getSetting(this.workspaceFolder, SettingsManager.runnersRegExp, StorageKey.Runners, false);
        for (const runner of runners) {
            items.push(SettingTreeItem.getRunnerTreeItem(this.workspaceFolder, runner));
        }

        return items.sort((a, b) => a.label!.toString().localeCompare(b.label!.toString()));
    }
}