import { window, workspace, WorkspaceFolder } from "vscode";

export namespace Utils {
    /**
     * Get date time string.
     * 
     * Example: Oct 17, 2024, 11:26:47 PM EDT
     */
    export function getDateString(value?: string) {
        const date = value ? new Date(value) : new Date();

        return date.toLocaleString(undefined, {
            year: 'numeric',
            month: 'short',
            day: 'numeric',
            hour: 'numeric',
            minute: 'numeric',
            second: "numeric",
            hour12: true,
            timeZoneName: 'short'
        });
    }

    /**
     * Get time duration in minutes and seconds.
     * 
     * Examples: 31s or 2m 52s
     */
    export function getTimeDuration(startValue: string, endValue: string) {
        const start = new Date(startValue).getTime();
        const end = new Date(endValue).getTime();

        const totalSeconds = Math.floor((end - start) / 1000);
        if (totalSeconds < 60) {
            return `${totalSeconds}s`;
        }

        const minutes = Math.floor(totalSeconds / 60);
        const seconds = totalSeconds % 60;
        return `${minutes}m ${seconds}s`;
    }

    /**
     * Get the provided workspace folder or the first one if there are multiple.
     */
    export async function getWorkspaceFolder(workspaceFolder?: WorkspaceFolder) {
        if (workspaceFolder) {
            return workspaceFolder;
        } else {
            const workspaceFolders = workspace.workspaceFolders;
            if (workspaceFolders && workspaceFolders.length > 0) {
                return workspaceFolders[0];
            } else {
                await window.showErrorMessage('Failed to find a workspace folder');
                return;
            }
        }
    }

    /**
     * Escape all backslashes and double quotes. 
     */
    export function escapeSpecialCharacters(input: string): string {
        return input.replace(/\\/g, '\\\\').replace(/"/g, '\\"');
    }
}