import { ThemeIcon, TreeItem, TreeItemCollapsibleState, WorkspaceFolder } from "vscode";
import { act } from "../../extension";
import { GithubLocalActionsTreeItem } from "../githubLocalActionsTreeItem";
import EnvironmentTreeItem from "./environment";

export default class EnvironmentsTreeItem extends TreeItem implements GithubLocalActionsTreeItem {
    static contextValue = 'githubLocalActions.environments';

    constructor(public workspaceFolder: WorkspaceFolder) {
        super('Environments', TreeItemCollapsibleState.Collapsed);
        this.contextValue = EnvironmentsTreeItem.contextValue;
        this.iconPath = new ThemeIcon('server-environment');
    }

    async getChildren(): Promise<GithubLocalActionsTreeItem[]> {
        const items: GithubLocalActionsTreeItem[] = [];

        const environments = await act.settingsManager.getEnvironments(this.workspaceFolder);
        for (const environment of environments) {
            items.push(new EnvironmentTreeItem(this.workspaceFolder, environment));
        }

        return items;
    }
}