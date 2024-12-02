import { TreeItem, TreeItemCollapsibleState, WorkspaceFolder } from "vscode";
import { HistoryManager, HistoryStatus, Step } from "../../historyManager";
import { Utils } from "../../utils";
import { GithubLocalActionsTreeItem } from "../githubLocalActionsTreeItem";

export default class StepTreeItem extends TreeItem implements GithubLocalActionsTreeItem {
    static contextValue = 'githubLocalActions.step';
    step: Step;

    constructor(public workspaceFolder: WorkspaceFolder, step: Step) {
        super(step.name, TreeItemCollapsibleState.None);
        this.step = step;

        let endTime: string | undefined;
        let totalDuration: string | undefined;
        if (step.date.end) {
            endTime = step.date.end;
            totalDuration = Utils.getTimeDuration(step.date.start, endTime);
        } else if (step.status === HistoryStatus.Running) {
            endTime = new Date().toString();
            totalDuration = Utils.getTimeDuration(step.date.start, endTime);
        }

        this.description = totalDuration;
        this.contextValue = `${StepTreeItem.contextValue}_${step.status}`;
        this.iconPath = HistoryManager.statusToIcon(step.status);
        this.tooltip = `Name: ${step.name}\n` +
            `Status: ${step.status}\n` +
            `Started: ${Utils.getDateString(step.date.start)}\n` +
            `Ended: ${endTime ? Utils.getDateString(endTime) : 'N/A'}\n` +
            `Total Duration: ${totalDuration ? totalDuration : 'N/A'}`;
    }

    async getChildren(): Promise<GithubLocalActionsTreeItem[]> {
        return [];
    }
}