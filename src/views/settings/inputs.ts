import { ThemeIcon, TreeItem, TreeItemCheckboxState, TreeItemCollapsibleState } from "vscode";
import { act } from "../../extension";
import { GithubLocalActionsTreeItem } from "../githubLocalActionsTreeItem";
import InputTreeItem from "./input";

export default class InputsTreeItem extends TreeItem implements GithubLocalActionsTreeItem {
    static contextValue = 'githubLocalActions.inputs';

    constructor() {
        super('Inputs', TreeItemCollapsibleState.Collapsed);
        this.contextValue = InputsTreeItem.contextValue;
        this.iconPath = new ThemeIcon('record-keys');
        this.checkboxState = TreeItemCheckboxState.Unchecked;
    }

    async getChildren(): Promise<GithubLocalActionsTreeItem[]> {
        const workflows = await act.workflowsManager.getWorkflows();
        const inputs = [...new Set(workflows.map(workflow => act.settingsManager.getInputs(workflow)).flat())];
        return inputs.map(input => new InputTreeItem(input));
    }
}