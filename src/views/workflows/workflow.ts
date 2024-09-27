import { ThemeIcon, TreeItem, TreeItemCollapsibleState, Uri } from "vscode";
import { Workflow } from "../../types";
import { GithubLocalActionsTreeItem } from "../githubLocalActionsTreeItem";

export default class WorkflowTreeItem extends TreeItem implements GithubLocalActionsTreeItem {
    static contextValue = 'workflow';
    workflow: Workflow;

    constructor(workflow: Workflow) {
        super(workflow.content.name || workflow.name, workflow.error ? TreeItemCollapsibleState.None : TreeItemCollapsibleState.Collapsed);
        this.workflow = workflow;
        this.contextValue = WorkflowTreeItem.contextValue;
        this.iconPath = new ThemeIcon('layers');
        this.tooltip = `Name: ${workflow.name}\n` +
            `Path: ${workflow.uri.fsPath}`;

        if(workflow.error) {
            this.resourceUri = Uri.parse(`${WorkflowTreeItem.contextValue}:${workflow.name}?error=${workflow.error}`, true);
        }
    }

    async getChildren(): Promise<GithubLocalActionsTreeItem[]> {
        return [];
    }
}