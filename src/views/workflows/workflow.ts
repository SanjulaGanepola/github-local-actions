import { ThemeIcon, TreeItem, TreeItemCollapsibleState, Uri } from "vscode";
import { act } from "../../extension";
import { Workflow } from "../../workflowsManager";
import { GithubLocalActionsTreeItem } from "../githubLocalActionsTreeItem";
import WorkflowLogTreeItem from "./workflowLog";

export default class WorkflowTreeItem extends TreeItem implements GithubLocalActionsTreeItem {
    static contextValue = 'githubLocalActions.workflow';
    workflow: Workflow;

    constructor(workflow: Workflow) {
        super(workflow.name, workflow.error ? TreeItemCollapsibleState.None : TreeItemCollapsibleState.Collapsed);
        this.workflow = workflow;
        this.contextValue = WorkflowTreeItem.contextValue;
        this.iconPath = new ThemeIcon('layers');
        this.tooltip = `Name: ${workflow.name}\n` +
            `Path: ${workflow.uri.fsPath}\n` +
            (workflow.error ? `Error: ${workflow.error}` : ``);

        if (workflow.error) {
            this.resourceUri = Uri.parse(`${WorkflowTreeItem.contextValue}:${workflow.name}?error=${workflow.error}`, true);
        }
    }

    async getChildren(): Promise<GithubLocalActionsTreeItem[]> {
        const workflowLogs = act.workflowLogs[this.workflow.uri.fsPath];
        if (workflowLogs) {
            return workflowLogs.map(workflowLog => new WorkflowLogTreeItem(workflowLog));
        } else {
            return [];
        }
    }
}