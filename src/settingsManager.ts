import { WorkspaceFolder } from "vscode";
import { act } from "./extension";
import { SecretManager } from "./secretManager";
import { StorageKey, StorageManager } from "./storageManager";

export interface Setting {
    key: string,
    value: string,
    password: boolean,
    selected: boolean
}

export class SettingsManager {
    storageManager: StorageManager;
    secretManager: SecretManager;
    static secretsRegExp: RegExp = /\${{\s*secrets\.(.*?)\s*}}/g;
    static variablesRegExp: RegExp = /\${{\s*vars\.(.*?)(?:\s*==\s*(.*?))?\s*}}/g;
    static inputsRegExp: RegExp = /\${{\s*(?:inputs|github\.event\.inputs)\.(.*?)(?:\s*==\s*(.*?))?\s*}}/g;
    static runnersRegExp: RegExp = /runs-on:\s*(.+)/g;

    constructor(storageManager: StorageManager, secretManager: SecretManager) {
        this.storageManager = storageManager;
        this.secretManager = secretManager;
    }

    async getSettings(workspaceFolder: WorkspaceFolder, isUserSelected: boolean) {
        const secrets = (await this.getSetting(workspaceFolder, SettingsManager.secretsRegExp, StorageKey.Secrets, true)).filter(secret => !isUserSelected || secret.selected);
        const variables = (await this.getSetting(workspaceFolder, SettingsManager.variablesRegExp, StorageKey.Variables, false)).filter(variable => !isUserSelected || variable.selected);
        const inputs = (await this.getSetting(workspaceFolder, SettingsManager.inputsRegExp, StorageKey.Inputs, false)).filter(input => !isUserSelected || (input.selected && input.value));
        const runners = (await this.getSetting(workspaceFolder, SettingsManager.runnersRegExp, StorageKey.Runners, false)).filter(runner => !isUserSelected || (runner.selected && runner.value));

        return {
            secrets: secrets,
            variables: variables,
            inputs: inputs,
            runners: runners
        }
    }

    async getSetting(workspaceFolder: WorkspaceFolder, regExp: RegExp, storageKey: StorageKey, password: boolean): Promise<Setting[]> {
        const settings: Setting[] = [];

        const workflows = await act.workflowsManager.getWorkflows(workspaceFolder);
        for (const workflow of workflows) {
            if (!workflow.fileContent) {
                continue;
            }

            const workflowSettings = this.findInWorkflow(workflow.fileContent, regExp, password);
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
                    let value: string;
                    if (storageKey === StorageKey.Secrets) {
                        value = await this.secretManager.get(workspaceFolder, storageKey, setting.key) || "";
                    } else {
                        value = existingSetting.value;
                    }

                    settings[index] = {
                        key: setting.key,
                        value: value,
                        password: existingSetting.password,
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
        const value = newSetting.value;
        if (storageKey === StorageKey.Secrets) {
            newSetting.value = '';
        }

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
        if (storageKey === StorageKey.Secrets) {
            await this.secretManager.store(workspaceFolder, storageKey, newSetting.key, value);
        }
    }

    private findInWorkflow(content: string, regExp: RegExp, password: boolean) {
        const results: Setting[] = [];

        const matches = content.matchAll(regExp);
        for (const match of matches) {
            results.push({ key: match[1], value: '', password: password, selected: false });
        }

        return results;
    }
}