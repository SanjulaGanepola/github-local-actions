import { ThemeColor, ThemeIcon, TreeItem, TreeItemCollapsibleState } from "vscode";
import { History, HistoryStatus } from "../../act";
import { DateUtils } from "../../dateUtils";
import { GithubLocalActionsTreeItem } from "../githubLocalActionsTreeItem";

export default class HistoryTreeItem extends TreeItem implements GithubLocalActionsTreeItem {
    static contextValue = 'githubLocalActions.history';
    history: History;

    constructor(history: History) {
        super(history.name, TreeItemCollapsibleState.None);
        this.history = history;

        let totalDuration: string | undefined;
        if (history.date) {
            totalDuration = DateUtils.getTimeDuration(history.date.start, history.date.end);
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
        this.tooltip = `Name: ${history.name}\n` +
            `Status: ${history.status}\n` +
            `Started: ${history.date ? DateUtils.getDateString(history.date.start) : 'N/A'}\n` +
            `Ended: ${history.date ? DateUtils.getDateString(history.date.end) : 'N/A'}\n` +
            (totalDuration ? `Total Duration: ${totalDuration}\n` : ``);
    }

    async getChildren(): Promise<GithubLocalActionsTreeItem[]> {
        return [];
    }
}