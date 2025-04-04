import { ExtensionContext, Uri, workspace } from "vscode";

export enum StorageKey {
    WorkspaceHistory = 'workspaceHistory',
    Secrets = 'secrets',
    SecretFiles = 'secretFiles',
    Variables = 'variables',
    VariableFiles = 'variableFiles',
    Inputs = 'inputs',
    InputFiles = 'inputFiles',
    Runners = 'runners',
    PayloadFiles = 'payloadFiles',
    Options = 'options'
}

export class StorageManager {
    private context: ExtensionContext;
    private extensionKey: string = 'githubLocalActions';

    constructor(context: ExtensionContext) {
        this.context = context;
    }

    private async getStorageDirectory(): Promise<Uri> {
        const storageDirectory = Uri.joinPath(this.context.storageUri ?? this.context.globalStorageUri, "storageManager");
        await workspace.fs.createDirectory(storageDirectory).then(undefined, () => void 0);
        return storageDirectory;
    }

    private async getStorageFile(storageKey: StorageKey): Promise<Uri> {
        const storageDirectory = await this.getStorageDirectory();
        return Uri.joinPath(storageDirectory, `${storageKey}.json`);
    }

    async get<T>(storageKey: StorageKey): Promise<T | undefined> {
        if ([StorageKey.Secrets, StorageKey.SecretFiles].includes(storageKey)) {
            return this.context.globalState.get<T>(`${this.extensionKey}.${storageKey}`);
        }

        const storageFile = await this.getStorageFile(storageKey);
        return workspace.fs.readFile(storageFile).then(data => {
            if (data) {
                return JSON.parse(data.toString()) as T;
            }
            return undefined;
        }, (error) => {
            if (error.code === 'FileNotFound') {
                return undefined;
            }
        });
    }

    async update(storageKey: StorageKey, value: any): Promise<void> {
        if ([StorageKey.Secrets, StorageKey.SecretFiles].includes(storageKey)) {
            await this.context.globalState.update(`${this.extensionKey}.${storageKey}`, value);
            return;
        }

        const data = JSON.stringify(value, null, 2);
        const storageFile = await this.getStorageFile(storageKey);
        await workspace.fs.writeFile(storageFile, Buffer.from(data));
    }
}