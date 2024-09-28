import { CancellationToken, Event, FileDecoration, FileDecorationProvider, ProviderResult, ThemeColor, Uri } from "vscode";
import { CliStatus, ExtensionStatus } from "../componentManager";
import ComponentTreeItem from "./components/component";
import WorkflowTreeItem from "./workflows/workflow";

export class DecorationProvider implements FileDecorationProvider {
    onDidChangeFileDecorations?: Event<Uri | Uri[] | undefined> | undefined;
    provideFileDecoration(uri: Uri, token: CancellationToken): ProviderResult<FileDecoration> {
        const params = new URLSearchParams(uri.query);

        if (uri.scheme === ComponentTreeItem.contextValue) {
            const status = params.get('status');
            const required = params.get('required');

            if (status === CliStatus.Installed || status === ExtensionStatus.Activated) {
                return {
                    badge: '✅',
                    color: new ThemeColor('GitHubLocalActions.green')
                };
            } else if (!required && (status === CliStatus.NotInstalled || status === ExtensionStatus.NotActivated)) {
                return {
                    badge: '⚠️',
                    color: new ThemeColor('GitHubLocalActions.yellow')
                };
            } else if (required && (status === CliStatus.NotInstalled || status === ExtensionStatus.NotActivated)) {
                return {
                    badge: '❌',
                    color: new ThemeColor('GitHubLocalActions.red')
                };
            }
        } else if (uri.scheme === WorkflowTreeItem.contextValue) {
            const error = params.get('error');

            if (error) {
                return {
                    badge: '❌',
                    color: new ThemeColor('GitHubLocalActions.red')
                };
            }
        }
    }
}