import { ThemeIcon, TreeItem, TreeItemCollapsibleState } from "vscode";
import { WorkflowLog } from "../../act";
import { GithubLocalActionsTreeItem } from "../githubLocalActionsTreeItem";
import JobLogTreeItem from "./jobLog";

export default class WorkflowLogTreeItem extends TreeItem implements GithubLocalActionsTreeItem {
    static contextValue = 'githubLocalActions.workflowLog';
    workflowLog: WorkflowLog;

    constructor(workflowLog: WorkflowLog) {
        super(workflowLog.name, TreeItemCollapsibleState.Collapsed);
        this.workflowLog = workflowLog;
        this.contextValue = WorkflowLogTreeItem.contextValue;
        this.iconPath = new ThemeIcon('pass-filled');
        // this.tooltip = `Name: ${workflow.name}\n` +
        //     `Path: ${workflow.uri.fsPath}\n` +
        //     (workflow.error ? `Error: ${workflow.error}` : ``);

        // TODO: Add tooltip and resourceUri
    }

    async getChildren(): Promise<GithubLocalActionsTreeItem[]> {
        return this.workflowLog.jobLogs.map(jobLog => new JobLogTreeItem(jobLog));
    }
}