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
    workspaceHistory: { [path: string]: History[] };

    constructor(storageManager: StorageManager) {
        this.storageManager = storageManager;
        const workspaceHistory = this.storageManager.get<{ [path: string]: History[] }>(StorageKey.WorkspaceHistory) || {};
        for (const [path, historyLogs] of Object.entries(workspaceHistory)) {
            workspaceHistory[path] = historyLogs.map(history => {
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
        this.workspaceHistory = workspaceHistory;
    }

    async clearAll(workspaceFolder: WorkspaceFolder) {
        const existingHistory = this.workspaceHistory[workspaceFolder.uri.fsPath];
        for (const history of existingHistory) {
            try {
                await workspace.fs.delete(Uri.file(history.logPath));
            } catch (error: any) { }
        }

        this.workspaceHistory[workspaceFolder.uri.fsPath] = [];
        historyTreeDataProvider.refresh();
        await this.storageManager.update(StorageKey.WorkspaceHistory, this.workspaceHistory);
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
        const historyIndex = this.workspaceHistory[history.commandArgs.path].findIndex(workspaceHistory => workspaceHistory.index === history.index);
        if (historyIndex > -1) {
            this.workspaceHistory[history.commandArgs.path].splice(historyIndex, 1);
            await this.storageManager.update(StorageKey.WorkspaceHistory, this.workspaceHistory);

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