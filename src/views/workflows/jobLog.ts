import { ThemeIcon, TreeItem, TreeItemCollapsibleState } from "vscode";
import { JobLog } from "../../act";
import { GithubLocalActionsTreeItem } from "../githubLocalActionsTreeItem";
import StepTreeItem from "./stepLog";

export default class JobLogTreeItem extends TreeItem implements GithubLocalActionsTreeItem {
    static contextValue = 'githubLocalActions.jobLog';
    jobLog: JobLog;

    constructor(jobLog: JobLog) {
        super(jobLog.name, TreeItemCollapsibleState.Collapsed);
        this.jobLog = jobLog;
        this.contextValue = JobLogTreeItem.contextValue;
        this.iconPath = new ThemeIcon('pass-filled');
        // this.tooltip = `Name: ${workflow.name}\n` +
        //     `Path: ${workflow.uri.fsPath}\n` +
        //     (workflow.error ? `Error: ${workflow.error}` : ``);

        // TODO: Add tooltip and resourceUri
    }

    async getChildren(): Promise<GithubLocalActionsTreeItem[]> {
        const stepLogs = this.jobLog.stepLogs;
        if (stepLogs) {
            return this.jobLog.stepLogs.map(step => new StepTreeItem(step));
        } else {
            return [];
        }
    }
}