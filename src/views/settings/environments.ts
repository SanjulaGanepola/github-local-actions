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
        const workflows = await act.workflowsManager.getWorkflows(this.workspaceFolder);
        const environments = [...new Set(workflows.map(workflow => act.settingsManager.getEnvironments(workflow)).flat())];
        return environments.map(environment => new EnvironmentTreeItem(this.workspaceFolder, environment));
    }
}