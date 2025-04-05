import { TaskExecution, ThemeColor, ThemeIcon, Uri, window, workspace, WorkspaceFolder } from "vscode";
import { CommandArgs } from "./act";
import { act, historyTreeDataProvider } from "./extension";
import { StorageKey, StorageManager } from "./storageManager";

export interface History {
    index: number,
    name: string,
    count: number,
    status: HistoryStatus,
    date: {
        start: string,
        end?: string,
    },
    commandArgs: CommandArgs,
    logPath: string,
    taskExecution?: TaskExecution,
    jobs?: Job[],
}

export interface Job {
    name: string,
    status: HistoryStatus,
    date: {
        start: string,
        end?: string,
    },
    steps?: Step[]
}

export interface Step {
    id: string,
    name: string,
    status: HistoryStatus,
    date: {
        start: string,
        end?: string,
    }
}

export enum HistoryStatus {
    Running = 'Running',
    Success = 'Success',
    Failed = 'Failed',
    Skipped = 'Skipped',
    Cancelled = 'Cancelled',
    Unknown = 'Unknown'
}

export class HistoryManager {
    storageManager: StorageManager;
    private allHistory: { [path: string]: History[] };
    private isAllHistorySynced: boolean;


    constructor(storageManager: StorageManager) {
        this.storageManager = storageManager;
        this.allHistory = {};
        this.isAllHistorySynced = false;
        this.syncAllHistory();
    }


    async getAllHistory() {
        if (!this.isAllHistorySynced) {
            await this.syncAllHistory();
        }

        return this.allHistory;
    }

    private async syncAllHistory() {
        const allHistory = await this.storageManager.get<{ [path: string]: History[] }>(StorageKey.WorkspaceHistory) || {};
        for (const [path, historyLogs] of Object.entries(allHistory)) {
            allHistory[path] = historyLogs.map(history => {
                history.jobs?.forEach((job, jobIndex) => {
                    history.jobs![jobIndex].steps?.forEach((step, stepIndex) => {
                        // Update status of all running steps
                        if (step.status === HistoryStatus.Running) {
                            history.jobs![jobIndex].steps![stepIndex].status = HistoryStatus.Cancelled;
                        }
                    });

                    // Update status of all running jobs
                    if (job.status === HistoryStatus.Running) {
                        history.jobs![jobIndex].status = HistoryStatus.Cancelled;
                    }
                });

                // Update history status
                if (history.status === HistoryStatus.Running) {
                    history.status = HistoryStatus.Cancelled;
                }

                return history;
            });
        }
        this.allHistory = allHistory;
        this.isAllHistorySynced = true;
    };

    async clearAll(workspaceFolder: WorkspaceFolder) {
        const allHistory = await this.getAllHistory();
        const workspaceHistory = allHistory[workspaceFolder.uri.fsPath] ?? [];
        for (const history of workspaceHistory) {
            try {
                await workspace.fs.delete(Uri.file(history.logPath));
            } catch (error: any) { }
        }

        allHistory[workspaceFolder.uri.fsPath] = [];
        historyTreeDataProvider.refresh();
        await this.storageManager.update(StorageKey.WorkspaceHistory, allHistory);
    }

    async viewOutput(history: History) {
        try {
            const document = await workspace.openTextDocument(history.logPath);
            await window.showTextDocument(document);
        } catch (error: any) {
            window.showErrorMessage(`${history.name} #${history.count} log file not found`);
        }
    }

    async restart(history: History) {
        await act.runCommand(history.commandArgs);
    }

    async stop(history: History) {
        history.taskExecution?.terminate();
    }

    async remove(history: History) {
        const allHistory = await this.getAllHistory();
        const workspaceHistory = allHistory[history.commandArgs.path] ?? [];
        const historyIndex = workspaceHistory.findIndex(workspaceHistory => workspaceHistory.index === history.index);
        if (historyIndex > -1) {
            workspaceHistory.splice(historyIndex, 1);
            await this.storageManager.update(StorageKey.WorkspaceHistory, allHistory);

            try {
                await workspace.fs.delete(Uri.file(history.logPath));
            } catch (error: any) { }
        }
    }

    static statusToIcon(status: HistoryStatus) {
        switch (status) {
            case HistoryStatus.Running:
                return new ThemeIcon('loading~spin');
            case HistoryStatus.Success:
                return new ThemeIcon('pass', new ThemeColor('GitHubLocalActions.green'));
            case HistoryStatus.Failed:
                return new ThemeIcon('error', new ThemeColor('GitHubLocalActions.red'));
            case HistoryStatus.Cancelled:
                return new ThemeIcon('circle-slash', new ThemeColor('GitHubLocalActions.yellow'));
            case HistoryStatus.Skipped:
                return new ThemeIcon('issues', new ThemeColor('GitHubLocalActions.grey'));
            case HistoryStatus.Unknown:
                return new ThemeIcon('question', new ThemeColor('GitHubLocalActions.purple'));
        }
    }

    static stepResultToHistoryStatus(stepResult: string) {
        switch (stepResult) {
            case 'success':
                return HistoryStatus.Success;
            case 'skipped':
                return HistoryStatus.Skipped;
            default:
                return HistoryStatus.Failed;
        }
    }
}