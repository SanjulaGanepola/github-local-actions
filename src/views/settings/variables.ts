import { ThemeIcon, TreeItem, TreeItemCollapsibleState, WorkspaceFolder } from "vscode";
import { act } from "../../extension";
import { GithubLocalActionsTreeItem } from "../githubLocalActionsTreeItem";
import VariableTreeItem from "./variable";

export default class VariablesTreeItem extends TreeItem implements GithubLocalActionsTreeItem {
    static contextValue = 'githubLocalActions.variables';

    constructor(public workspaceFolder: WorkspaceFolder) {
        super('Variables', TreeItemCollapsibleState.Collapsed);
        this.contextValue = VariablesTreeItem.contextValue;
        this.iconPath = new ThemeIcon('symbol-key');
    }

    async getChildren(): Promise<GithubLocalActionsTreeItem[]> {
        const workflows = await act.workflowsManager.getWorkflows(this.workspaceFolder);
        const variables = [...new Set(workflows.map(workflow => act.settingsManager.getVariables(workflow)).flat())];
        return variables.map(variable => new VariableTreeItem(this.workspaceFolder, variable));
    }
}