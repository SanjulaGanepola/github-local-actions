import { CancellationToken, Event, FileDecoration, FileDecorationProvider, ProviderResult, ThemeColor, Uri } from "vscode";
import { CliStatus, ExtensionStatus } from "../componentsManager";
import ComponentTreeItem from "./components/component";
import WorkflowTreeItem from "./workflows/workflow";

export class DecorationProvider implements FileDecorationProvider {
    onDidChangeFileDecorations?: Event<Uri | Uri[] | undefined> | undefined;
    provideFileDecoration(uri: Uri, token: CancellationToken): ProviderResult<FileDecoration> {
        const params = new URLSearchParams(uri.query);

        if (uri.scheme === ComponentTreeItem.contextValue) {
            const status = params.get('status');
            const required = params.get('required') === 'true';

            if (status === CliStatus.Installed || status === CliStatus.Running || status === ExtensionStatus.Activated) {
                return {
                    badge: '✅',
                    color: new ThemeColor('GitHubLocalActions.green')
                };
            } else if (!required && (status === CliStatus.NotInstalled || status === CliStatus.NotRunning || status === CliStatus.InvalidPermissions || status === ExtensionStatus.NotActivated)) {
                return {
                    badge: '⚠️',
                    color: new ThemeColor('GitHubLocalActions.yellow')
                };
            } else if (required && (status === CliStatus.NotInstalled || status === CliStatus.NotRunning || status === CliStatus.InvalidPermissions || status === ExtensionStatus.NotActivated)) {
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

        // else if (uri.scheme === SecretsTreeItem.contextValue || uri.scheme === VariablesTreeItem.contextValue || uri.scheme === InputsTreeItem.contextValue || uri.scheme === RunnersTreeItem.contextValue) {
        //     const selected = params.get('selected');

        //     return {
        //         badge: `${selected}`
        //     };
        // }
    }
}