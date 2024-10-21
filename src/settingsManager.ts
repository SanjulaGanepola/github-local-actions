import { WorkspaceFolder } from "vscode";
import { act } from "./extension";
import { StorageKey, StorageManager } from "./storageManager";

export interface Setting {
    key: string,
    value: string,
    selected: boolean
}

export class SettingsManager {
    storageManager: StorageManager;
    static secretsRegExp: RegExp = /\${{\s*secrets\.(.*?)\s*}}/g;
    static variablesRegExp: RegExp = /\${{\s*vars\.(.*?)(?:\s*==\s*(.*?))?\s*}}/g;
    static inputsRegExp: RegExp = /\${{\s*(?:inputs|github\.event\.inputs)\.(.*?)(?:\s*==\s*(.*?))?\s*}}/g;
    static runnersRegExp: RegExp = /runs-on:\s*(.+)/g;

    constructor(storageManager: StorageManager) {
        this.storageManager = storageManager;
    }

    async getSetting(workspaceFolder: WorkspaceFolder, regExp: RegExp, storageKey: StorageKey): Promise<Setting[]> {
        const settings: Setting[] = [];

        const workflows = await act.workflowsManager.getWorkflows(workspaceFolder);
        for (const workflow of workflows) {
            if (!workflow.fileContent) {
                continue;
            }

            const workflowSettings = this.findInWorkflow(workflow.fileContent, regExp);
            for (const workflowSetting of workflowSettings) {
                const existingSetting = settings.find(setting => setting.key === workflowSetting.key);
                if (!existingSetting) {
                    settings.push(workflowSetting);
                }
            }
        }

        const existingSettings = this.storageManager.get<{ [path: string]: Setting[] }>(storageKey) || {};
        if (existingSettings[workspaceFolder.uri.fsPath]) {
            for (const [index, setting] of settings.entries()) {
                const existingSetting = existingSettings[workspaceFolder.uri.fsPath].find(existingSetting => existingSetting.key === setting.key);
                if (existingSetting) {
                    settings[index] = {
                        key: setting.key,
                        value: existingSetting.value,
                        selected: existingSetting.selected
                    };
                }
            }
        }
        existingSettings[workspaceFolder.uri.fsPath] = settings;
        this.storageManager.update(storageKey, existingSettings);

        return settings;
    }

    async editSetting(workspaceFolder: WorkspaceFolder, newSetting: Setting, storageKey: StorageKey) {
        const existingSettings = this.storageManager.get<{ [path: string]: Setting[] }>(storageKey) || {};

        if (existingSettings[workspaceFolder.uri.fsPath]) {
            const index = existingSettings[workspaceFolder.uri.fsPath].findIndex(setting => setting.key === newSetting.key);
            if (index > -1) {
                existingSettings[workspaceFolder.uri.fsPath][index] = newSetting;
            } else {
                existingSettings[workspaceFolder.uri.fsPath].push(newSetting);
            }
        } else {
            existingSettings[workspaceFolder.uri.fsPath] = [newSetting];
        }

        await this.storageManager.update(storageKey, existingSettings);
    }

    private findInWorkflow(content: string, regExp: RegExp) {
        const results: Setting[] = [];

        const matches = content.matchAll(regExp);
        for (const match of matches) {
            results.push({ key: match[1], value: '', selected: false });
        }

        return results;
    }
}