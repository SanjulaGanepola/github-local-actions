import { WorkspaceFolder } from "vscode";
import { act } from "./extension";
import { StorageKey, StorageManager } from "./storageManager";

export interface Environment {
    name: string
}

export interface Secret {
    key: string,
    value: string,
    selected: boolean
}

export interface Variable {
    key: string,
    value: string,
    selected: boolean
}

export interface Input {
    key: string,
    value: string,
    selected: boolean
}

export interface Runner {
    key: string,
    value: string,
    selected: boolean
}

export class SettingsManager {
    storageManager: StorageManager;

    constructor(storageManager: StorageManager) {
        this.storageManager = storageManager;
    }

    async getEnvironments(workspaceFolder: WorkspaceFolder): Promise<Environment[]> {
        const environments: Environment[] = [];

        const workflows = await act.workflowsManager.getWorkflows(workspaceFolder);
        for (const workflow of workflows) {
            if (!workflow.yaml) {
                continue;
            }

            const jobs = workflow.yaml?.jobs;
            if (jobs) {
                for (const details of Object.values<any>(jobs)) {
                    if (details.environment) {
                        const existingEnvironment = environments.find(environment => environment.name === details.environment);
                        if (!existingEnvironment) {
                            environments.push({
                                name: details.environment
                            });
                        }
                    }
                }
            }
        }

        return environments;
    }
    

    async getSetting<T extends Secret | Variable | Input>(workspaceFolder: WorkspaceFolder, regExp: RegExp, storageKey: StorageKey): Promise<T[]> {
        const existingSettings = this.storageManager.get<{ [path: string]: T[] }>(storageKey) || {};

        const settings: T[] = [];

        const workflows = await act.workflowsManager.getWorkflows(workspaceFolder);
        for (const workflow of workflows) {
            if (!workflow.fileContent) {
                continue;
            }

            settings.push(...this.findInWorkflow<T>(workflow.fileContent, regExp));
        }

        if (existingSettings[workspaceFolder.uri.fsPath]) {
            for (const [index, setting] of settings.entries()) {
                const existingSetting = existingSettings[workspaceFolder.uri.fsPath].find(existingSetting => existingSetting.key === setting.key);
                if (existingSetting) {
                    settings[index] = {
                        key: setting.key,
                        value: existingSetting.value,
                        selected: existingSetting.selected
                    } as T;
                }
            }
        }
        existingSettings[workspaceFolder.uri.fsPath] = settings;
        this.storageManager.update(storageKey, existingSettings);

        return settings;
    }

    editSetting<T extends Secret | Variable | Input>(workspaceFolder: WorkspaceFolder, newSetting: T, storageKey: StorageKey) {
        const existingSettings = this.storageManager.get<{ [path: string]: T[] }>(storageKey) || {};
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

        this.storageManager.update(storageKey, existingSettings);
    }

    private findInWorkflow<T extends Secret | Variable | Input>(content: string, regExp: RegExp) {
        const results: (T)[] = [];

        const matches = content.matchAll(regExp);
        for (const match of matches) {
            results.push({ key: match[1], value: '', selected: false } as T);
        }

        return results;
    }

    getRunners(workspaceFolder: WorkspaceFolder): Runner[] {
        return [];
    }

    addRunner(workspaceFolder: WorkspaceFolder, runner: Runner) {

    }
}