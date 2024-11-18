import { ThemeIcon, TreeItem, TreeItemCollapsibleState, WorkspaceFolder } from "vscode";
import { act } from "../../extension";
import { Setting } from "../../settingsManager";
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

        const settings = await act.settingsManager.getSettings(this.workspaceFolder, false);
        for (const runner of settings.runners) {
            items.push(SettingTreeItem.getRunnerTreeItem(this.workspaceFolder, runner));
        }

        return items.sort((a, b) => a.label!.toString().localeCompare(b.label!.toString()));
    }
}