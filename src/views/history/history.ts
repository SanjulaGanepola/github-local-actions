import * as path from "path";
import { TreeItem, TreeItemCollapsibleState, WorkspaceFolder } from "vscode";
import { History, HistoryManager, HistoryStatus } from "../../historyManager";
import { Utils } from "../../utils";
import { GithubLocalActionsTreeItem } from "../githubLocalActionsTreeItem";
import JobTreeItem from "./job";

export default class HistoryTreeItem extends TreeItem implements GithubLocalActionsTreeItem {
    static contextValue = 'githubLocalActions.history';
    history: History;

    constructor(public workspaceFolder: WorkspaceFolder, history: History) {
        super(`${history.name} #${history.count}`, TreeItemCollapsibleState.Collapsed);
        this.history = history;

        let endTime: string | undefined;
        let totalDuration: string | undefined;
        if (history.date.end) {
            endTime = history.date.end;
            totalDuration = Utils.getTimeDuration(history.date.start, endTime);
        } else if (history.status === HistoryStatus.Running) {
            endTime = new Date().toString();
            totalDuration = Utils.getTimeDuration(history.date.start, endTime);
        }

        this.description = totalDuration;
        this.contextValue = `${HistoryTreeItem.contextValue}_${history.status}`;
        this.iconPath = HistoryManager.statusToIcon(history.status);
        this.tooltip = `Name: ${history.name} #${history.count}\n` +
            `${history.commandArgs.extraHeader.map(header => `${header.key}: ${header.value}`).join('\n')}\n` +
            `Path: ${history.commandArgs.path}\n` +
            `Log File: ${path.parse(history.logPath).base}\n` +
            `Status: ${history.status}\n` +
            `Started: ${Utils.getDateString(history.date.start)}\n` +
            `Ended: ${endTime ? Utils.getDateString(endTime) : 'N/A'}\n` +
            `Total Duration: ${totalDuration ? totalDuration : 'N/A'}`;
    }

    async getChildren(): Promise<GithubLocalActionsTreeItem[]> {
        return this.history.jobs?.map(job => new JobTreeItem(this.workspaceFolder, job)) || [];
    }
}