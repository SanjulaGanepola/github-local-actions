import * as path from "path";
import { ThemeColor, ThemeIcon, TreeItem, TreeItemCollapsibleState, WorkspaceFolder } from "vscode";
import { History, HistoryStatus } from "../../historyManager";
import { Utils } from "../../utils";
import { GithubLocalActionsTreeItem } from "../githubLocalActionsTreeItem";

export default class HistoryTreeItem extends TreeItem implements GithubLocalActionsTreeItem {
    static contextValue = 'githubLocalActions.history';
    history: History;

    constructor(public workspaceFolder: WorkspaceFolder, history: History) {
        super(`${history.name} #${history.count}`, TreeItemCollapsibleState.None);
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
        switch (history.status) {
            case HistoryStatus.Running:
                this.iconPath = new ThemeIcon('loading~spin');
                break;
            case HistoryStatus.Success:
                this.iconPath = new ThemeIcon('pass', new ThemeColor('GitHubLocalActions.green'));
                break;
            case HistoryStatus.Failed:
                this.iconPath = new ThemeIcon('error', new ThemeColor('GitHubLocalActions.red'));
                break;
            case HistoryStatus.Cancelled:
                this.iconPath = new ThemeIcon('circle-slash', new ThemeColor('GitHubLocalActions.yellow'));
                break;
        }
        this.tooltip = `Name: ${history.name} #${history.count}\n` +
            `${history.commandArgs.extraHeader.map(header => `${header.key}: ${header.value}`).join('\n')}\n` +
            `Path: ${history.commandArgs.path}\n` +
            `Log File: ${path.parse(history.logPath).base}\n` +
            `Status: ${history.status}\n` +
            `Started: ${Utils.getDateString(history.date.start)}\n` +
            `Ended: ${endTime ? Utils.getDateString(endTime) : 'N/A'}\n` +
            `Total Duration: ${totalDuration ? totalDuration : 'N/A'}`;
        this.command = {
            title: 'Focus Task',
            command: 'githubLocalActions.focusTask',
            arguments: [this]
        };
    }

    async getChildren(): Promise<GithubLocalActionsTreeItem[]> {
        return [];
    }
}