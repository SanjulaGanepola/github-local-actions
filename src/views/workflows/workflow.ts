import { ThemeIcon, TreeItem, TreeItemCollapsibleState, Uri, WorkspaceFolder } from "vscode";
import { Workflow } from "../../workflowsManager";
import { GithubLocalActionsTreeItem } from "../githubLocalActionsTreeItem";
import JobTreeItem from "./job";

export default class WorkflowTreeItem extends TreeItem implements GithubLocalActionsTreeItem {
    static contextValue = 'githubLocalActions.workflow';
    workflow: Workflow;

    constructor(public workspaceFolder: WorkspaceFolder, workflow: Workflow) {
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
        const items: GithubLocalActionsTreeItem[] = [];

        const jobs = this.workflow.yaml.jobs;
        if (jobs) {
            for (const [key, value] of Object.entries<any>(jobs)) {
                items.push(new JobTreeItem(this.workspaceFolder, this.workflow, { name: value.name ? value.name : key, id: key }));
            }
        }

        return items;
    }
}