import { Uri, window, workspace, WorkspaceFolder } from "vscode";
import { act } from "./extension";
import { GitHubManager } from "./githubManager";
import { SecretManager } from "./secretManager";
import { StorageKey, StorageManager } from "./storageManager";

export interface Settings {
    secrets: Setting[];
    secretFiles: SettingFile[];
    variables: Setting[];
    variableFiles: SettingFile[];
    inputs: Setting[];
    inputFiles: SettingFile[];
    runners: Setting[];
    environments: Setting[];
}

export interface Setting {
    key: string,
    value: string,
    password: boolean,
    selected: boolean,
    visible: Visibility
}

export interface SettingFile {
    name: string,
    path: string,
    selected: boolean
}

export enum Visibility {
    show = 'show',
    hide = 'hide'
}

export class SettingsManager {
    storageManager: StorageManager;
    secretManager: SecretManager;
    githubManager: GitHubManager;
    static secretsRegExp: RegExp = /\${{\s*secrets\.(.*?)\s*}}/g;
    static variablesRegExp: RegExp = /\${{\s*vars\.(.*?)(?:\s*==\s*(.*?))?\s*}}/g;
    static inputsRegExp: RegExp = /\${{\s*(?:inputs|github\.event\.inputs)\.(.*?)(?:\s*==\s*(.*?))?\s*}}/g;
    static runnersRegExp: RegExp = /runs-on:\s*(.+)/g;

    constructor(storageManager: StorageManager, secretManager: SecretManager) {
        this.storageManager = storageManager;
        this.secretManager = secretManager;
        this.githubManager = new GitHubManager();
    }

    async getSettings(workspaceFolder: WorkspaceFolder, isUserSelected: boolean): Promise<Settings> {
        const secrets = (await this.getSetting(workspaceFolder, SettingsManager.secretsRegExp, StorageKey.Secrets, true, Visibility.hide)).filter(secret => !isUserSelected || secret.selected);
        const secretFiles = await this.getSettingFiles(workspaceFolder, StorageKey.SecretFiles);
        const variables = (await this.getSetting(workspaceFolder, SettingsManager.variablesRegExp, StorageKey.Variables, false, Visibility.show)).filter(variable => !isUserSelected || variable.selected);
        const variableFiles = await this.getSettingFiles(workspaceFolder, StorageKey.VariableFiles);
        const inputs = (await this.getSetting(workspaceFolder, SettingsManager.inputsRegExp, StorageKey.Inputs, false, Visibility.show)).filter(input => !isUserSelected || (input.selected && input.value));
        const inputFiles = await this.getSettingFiles(workspaceFolder, StorageKey.InputFiles);
        const runners = (await this.getSetting(workspaceFolder, SettingsManager.runnersRegExp, StorageKey.Runners, false, Visibility.show)).filter(runner => !isUserSelected || (runner.selected && runner.value));
        const environments = await this.getEnvironments(workspaceFolder);

        return {
            secrets: secrets,
            secretFiles: secretFiles,
            variables: variables,
            variableFiles: variableFiles,
            inputs: inputs,
            inputFiles: inputFiles,
            runners: runners,
            environments: environments
        };
    }

    async getSetting(workspaceFolder: WorkspaceFolder, regExp: RegExp, storageKey: StorageKey, password: boolean, visible: Visibility): Promise<Setting[]> {
        const settings: Setting[] = [];

        const workflows = await act.workflowsManager.getWorkflows(workspaceFolder);
        for (const workflow of workflows) {
            if (!workflow.fileContent) {
                continue;
            }

            const workflowSettings = this.findInWorkflow(workflow.fileContent, regExp, password, visible);
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
                        selected: existingSetting.selected,
                        visible: existingSetting.visible
                    };
                }
            }
        }
        existingSettings[workspaceFolder.uri.fsPath] = settings;
        this.storageManager.update(storageKey, existingSettings);

        return settings;
    }

    async getSettingFiles(workspaceFolder: WorkspaceFolder, storageKey: StorageKey): Promise<SettingFile[]> {
        const existingSettingFiles = this.storageManager.get<{ [path: string]: SettingFile[] }>(storageKey) || {};
        return existingSettingFiles[workspaceFolder.uri.fsPath] || [];
    }

    async getEnvironments(workspaceFolder: WorkspaceFolder): Promise<Setting[]> {
        const environments: Setting[] = [];

        const workflows = await act.workflowsManager.getWorkflows(workspaceFolder);
        for (const workflow of workflows) {
            if (!workflow.yaml) {
                continue;
            }

            const jobs = workflow.yaml?.jobs;
            if (jobs) {
                for (const details of Object.values<any>(jobs)) {
                    if (details.environment) {
                        const existingEnvironment = environments.find(environment => environment.key === details.environment);
                        if (!existingEnvironment) {
                            environments.push({
                                key: details.environment,
                                value: '',
                                password: false,
                                selected: false,
                                visible: Visibility.show
                            });
                        }
                    }
                }
            }
        }

        return environments;
    }

    async editSettingFile(workspaceFolder: WorkspaceFolder, newSettingFile: SettingFile, storageKey: StorageKey) {
        const existingSettingFiles = this.storageManager.get<{ [path: string]: SettingFile[] }>(storageKey) || {};
        if (existingSettingFiles[workspaceFolder.uri.fsPath]) {
            const index = existingSettingFiles[workspaceFolder.uri.fsPath].findIndex(settingFile => settingFile.path === newSettingFile.path);
            if (index > -1) {
                existingSettingFiles[workspaceFolder.uri.fsPath][index] = newSettingFile;
            } else {
                existingSettingFiles[workspaceFolder.uri.fsPath].push(newSettingFile);
            }
        } else {
            existingSettingFiles[workspaceFolder.uri.fsPath] = [newSettingFile];
        }

        await this.storageManager.update(storageKey, existingSettingFiles);
    }

    async removeSettingFile(workspaceFolder: WorkspaceFolder, settingFile: SettingFile, storageKey: StorageKey) {
        const existingSettingFiles = this.storageManager.get<{ [path: string]: SettingFile[] }>(storageKey) || {};
        if (existingSettingFiles[workspaceFolder.uri.fsPath]) {
            const settingFileIndex = existingSettingFiles[workspaceFolder.uri.fsPath].findIndex(settingFile => settingFile.path === settingFile.path);
            if (settingFileIndex > -1) {
                existingSettingFiles[workspaceFolder.uri.fsPath].splice(settingFileIndex, 1);
            }
        }

        await this.storageManager.update(storageKey, existingSettingFiles);
    }

    async deleteSettingFile(workspaceFolder: WorkspaceFolder, settingFile: SettingFile, storageKey: StorageKey) {
        try {
            await workspace.fs.delete(Uri.file(settingFile.path));
            await this.removeSettingFile(workspaceFolder, settingFile, storageKey);
        } catch (error: any) {
            window.showErrorMessage(`Failed to delete file. Error ${error}`)
        }
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
            if (value === '') {
                await this.secretManager.delete(workspaceFolder, storageKey, newSetting.key);
            } else {
                await this.secretManager.store(workspaceFolder, storageKey, newSetting.key, value);
            }
        }
    }

    private findInWorkflow(content: string, regExp: RegExp, password: boolean, visible: Visibility) {
        const results: Setting[] = [];

        const matches = content.matchAll(regExp);
        for (const match of matches) {
            results.push({ key: match[1], value: '', password: password, selected: false, visible: visible });
        }

        return results;
    }
}