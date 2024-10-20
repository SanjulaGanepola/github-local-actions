import { ThemeIcon, TreeItem, TreeItemCollapsibleState, WorkspaceFolder } from "vscode";
import { act } from "../../extension";
import { GithubLocalActionsTreeItem } from "../githubLocalActionsTreeItem";
import InputTreeItem from "./input";

export default class InputsTreeItem extends TreeItem implements GithubLocalActionsTreeItem {
    static contextValue = 'githubLocalActions.inputs';

    constructor(public workspaceFolder: WorkspaceFolder) {
        super('Inputs', TreeItemCollapsibleState.Collapsed);
        this.contextValue = InputsTreeItem.contextValue;
        this.iconPath = new ThemeIcon('record-keys');
    }

    async getChildren(): Promise<GithubLocalActionsTreeItem[]> {
        const workflows = await act.workflowsManager.getWorkflows(this.workspaceFolder);
        const inputs = [...new Set(workflows.map(workflow => act.settingsManager.getInputs(workflow)).flat())];
        return inputs.map(input => new InputTreeItem(this.workspaceFolder, input));
    }
}