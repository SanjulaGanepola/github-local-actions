import { ExtensionContext, WorkspaceFolder } from "vscode";
import { StorageKey } from "./storageManager";

export class SecretManager {
    private context: ExtensionContext;
    private extensionKey: string = 'githubLocalActions';

    constructor(context: ExtensionContext) {
        this.context = context;
    }

    async get(workspaceFolder: WorkspaceFolder, storageKey: StorageKey, key: string): Promise<string | undefined> {
        return await this.context.secrets.get(`${this.extensionKey}.${workspaceFolder.uri.fsPath}.${storageKey}.${key}`);
    }

    async store(workspaceFolder: WorkspaceFolder, storageKey: StorageKey, key: string, value: string): Promise<void> {
        await this.context.secrets.store(`${this.extensionKey}.${workspaceFolder.uri.fsPath}.${storageKey}.${key}`, value);
    }

    async delete(workspaceFolder: WorkspaceFolder, storageKey: StorageKey, key: string): Promise<void> {
        return await this.context.secrets.delete(`${this.extensionKey}.${workspaceFolder.uri.fsPath}.${storageKey}.${key}`);
    }
}