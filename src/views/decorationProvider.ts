import { CancellationToken, Event, FileDecoration, FileDecorationProvider, ProviderResult, ThemeColor, Uri } from "vscode";
import { Status } from "../types";
import ComponentTreeItem from "./components/component";

export class DecorationProvider implements FileDecorationProvider {
    onDidChangeFileDecorations?: Event<Uri | Uri[] | undefined> | undefined;
    provideFileDecoration(uri: Uri, token: CancellationToken): ProviderResult<FileDecoration> {
        if (uri.scheme === ComponentTreeItem.contextValue) {
            const params = new URLSearchParams(uri.query);
            if (params.get('status') === Status.Enabled) {
                return {
                    badge: '✅',
                    color: new ThemeColor('GitHubLocalActions.enabled')
                };
            } else if (params.get('status') === Status.Warning) {
                return {
                    badge: '⚠️',
                    color: new ThemeColor('GitHubLocalActions.warning')
                };
            } else if (params.get('status') === Status.Disabled) {
                return {
                    badge: '❌',
                    color: new ThemeColor('GitHubLocalActions.disabled')
                };
            }
        }
    }
}