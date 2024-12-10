import { TreeItem, TreeItemCollapsibleState, WorkspaceFolder } from "vscode";
import { HistoryManager, HistoryStatus, Job } from "../../historyManager";
import { Utils } from "../../utils";
import { GithubLocalActionsTreeItem } from "../githubLocalActionsTreeItem";
import StepTreeItem from "./step";

export default class JobTreeItem extends TreeItem implements GithubLocalActionsTreeItem {
    static contextValue = 'githubLocalActions.job';
    job: Job;

    constructor(public workspaceFolder: WorkspaceFolder, job: Job) {
        super(job.name, job.status === HistoryStatus.Skipped ? TreeItemCollapsibleState.None : TreeItemCollapsibleState.Expanded);
        this.job = job;

        let endTime: string | undefined;
        let totalDuration: string | undefined;
        if (job.date.end) {
            endTime = job.date.end;
            totalDuration = Utils.getTimeDuration(job.date.start, endTime);
        } else if (job.status === HistoryStatus.Running) {
            endTime = new Date().toString();
            totalDuration = Utils.getTimeDuration(job.date.start, endTime);
        }

        this.description = totalDuration;
        this.contextValue = `${JobTreeItem.contextValue}_${job.status}`;
        this.iconPath = HistoryManager.statusToIcon(job.status);
        this.tooltip = `Name: ${job.name}\n` +
            `Status: ${job.status}\n` +
            `Started: ${Utils.getDateString(job.date.start)}\n` +
            `Ended: ${endTime ? Utils.getDateString(endTime) : 'N/A'}\n` +
            `Total Duration: ${totalDuration ? totalDuration : 'N/A'}`;
    }

    async getChildren(): Promise<GithubLocalActionsTreeItem[]> {
        return this.job.steps?.map(step => new StepTreeItem(this.workspaceFolder, step)) || [];
    }
}