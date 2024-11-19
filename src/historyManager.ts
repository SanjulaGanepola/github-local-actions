import { TaskExecution, Uri, window, workspace, WorkspaceFolder } from "vscode";
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
    taskExecution?: TaskExecution,
    commandArgs: CommandArgs,
    logPath: string
}

export enum HistoryStatus {
    Running = 'Running',
    Success = 'Success',
    Failed = 'Failed',
    Cancelled = 'Cancelled'
}

export class HistoryManager {
    storageManager: StorageManager;
    workspaceHistory: { [path: string]: History[] };

    constructor(storageManager: StorageManager) {
        this.storageManager = storageManager;
        const workspaceHistory = this.storageManager.get<{ [path: string]: History[] }>(StorageKey.WorkspaceHistory) || {};
        for (const [path, historyLogs] of Object.entries(workspaceHistory)) {
            workspaceHistory[path] = historyLogs.map(history => {
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
            } catch (error) { }
        }

        this.workspaceHistory[workspaceFolder.uri.fsPath] = [];
        historyTreeDataProvider.refresh();
        this.storageManager.update(StorageKey.WorkspaceHistory, this.workspaceHistory);
    }

    async viewOutput(history: History) {
        try {
            const document = await workspace.openTextDocument(history.logPath)
            await window.showTextDocument(document);
        } catch (error) {
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
        const historyIndex = this.workspaceHistory[history.commandArgs.fsPath].findIndex(workspaceHistory => workspaceHistory.index === history.index);
        this.workspaceHistory[history.commandArgs.fsPath].splice(historyIndex, 1);
        this.storageManager.update(StorageKey.WorkspaceHistory, this.workspaceHistory);

        try {
            await workspace.fs.delete(Uri.file(history.logPath));
        } catch (error) { }
    }
}