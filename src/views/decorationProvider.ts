import { CancellationToken, Event, FileDecoration, FileDecorationProvider, ProviderResult, ThemeColor, Uri } from "vscode";
import { CliStatus, ExtensionStatus } from "../componentsManager";
import ComponentTreeItem from "./components/component";
import InputsTreeItem from "./settings/inputs";
import RunnersTreeItem from "./settings/runners";
import SecretsTreeItem from "./settings/secrets";
import { SettingContextValue } from "./settings/setting";
import VariablesTreeItem from "./settings/variables";
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
        } else if ([SecretsTreeItem.contextValue, VariablesTreeItem.contextValue, InputsTreeItem.contextValue, RunnersTreeItem.contextValue].includes(uri.scheme)) {
            const hasAllValues = params.get('hasAllValues') === 'true';

            if (!hasAllValues) {
                return {
                    color: new ThemeColor('GitHubLocalActions.red')
                };
            }
        } else if (Object.values(SettingContextValue).includes(uri.scheme as any)) {
            const isSelected = params.get('isSelected') === 'true';
            const hasValue = params.get('hasValue') === 'true';

            if (isSelected && !hasValue) {
                return {
                    badge: '?',
                    color: new ThemeColor('GitHubLocalActions.red')
                };
            }
        }
    }
}