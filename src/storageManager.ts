import { ExtensionContext } from "vscode";

export enum StorageKey {
    WorkspaceHistory = 'workspaceHistory'
}

export class StorageManager {
    private context: ExtensionContext;
    private storageKey: string = 'githubLocalActions';

    constructor(context: ExtensionContext) {
        this.context = context;
    }

    keys(): readonly string[] {
        return this.context.globalState.keys();
    }

    get<T>(key: StorageKey): T | undefined {
        return this.context.globalState.get<T>(`${this.storageKey}.${key}`);
    }

    async update(key: StorageKey, value: any): Promise<void> {
        await this.context.globalState.update(`${this.storageKey}.${key}`, value);
    }
}