import { ThemeIcon, TreeItem, TreeItemCollapsibleState } from "vscode";
import { Job, Workflow } from "../../workflowsManager";
import { GithubLocalActionsTreeItem } from "../githubLocalActionsTreeItem";

export default class JobTreeItem extends TreeItem implements GithubLocalActionsTreeItem {
    static contextValue = 'githubLocalActions.job';
    job: Job;
    workflow: Workflow;

    constructor(workflow: Workflow, job: Job) {
        super(job.name, TreeItemCollapsibleState.None);
        this.workflow = workflow;
        this.job = job;
        this.contextValue = JobTreeItem.contextValue;
        this.iconPath = new ThemeIcon('rocket');
        this.tooltip = `Name: ${job.name}` +
            `ID: ${job.id}`;
    }

    async getChildren(): Promise<GithubLocalActionsTreeItem[]> {
        return [];
    }
}