import * as path from "path";
import { Uri, window, workspace, WorkspaceFolder } from "vscode";
import { act } from "./extension";
import { GitHubManager } from "./githubManager";
import { SecretManager } from "./secretManager";
import { StorageKey, StorageManager } from "./storageManager";

export interface Settings {
    secrets: Setting[];
    secretFiles: CustomSetting[];
    variables: Setting[];
    variableFiles: CustomSetting[];
    inputs: Setting[];
    inputFiles: CustomSetting[];
    runners: Setting[];
    payloadFiles: CustomSetting[];
    options: CustomSetting[];
    // environments: Setting[];
}

export interface Setting {
    key: string,
    value: string,
    password: boolean,
    selected: boolean,
    visible: Visibility
}

// This is either a secret/variable/input/payload file or an option
export interface CustomSetting {
    name: string,
    path: string,
    selected: boolean,
    notEditable?: boolean,
    default?: string,
    description?: string,
}

export enum Visibility {
    show = 'show',
    hide = 'hide'
}

export enum SettingFileName {
    secretFile = '.secrets',
    envFile = '.env',
    variableFile = '.vars',
    inputFile = '.input',
    payloadFile = 'payload.json'
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
        const secrets = (await this.getSetting(workspaceFolder, SettingsManager.secretsRegExp, StorageKey.Secrets, true, Visibility.hide)).filter(secret => !isUserSelected || (secret.selected && secret.value));
        const secretFiles = (await this.getCustomSettings(workspaceFolder, StorageKey.SecretFiles)).filter(secretFile => !isUserSelected || secretFile.selected);
        const variables = (await this.getSetting(workspaceFolder, SettingsManager.variablesRegExp, StorageKey.Variables, false, Visibility.show)).filter(variable => !isUserSelected || (variable.selected && variable.value));
        const variableFiles = (await this.getCustomSettings(workspaceFolder, StorageKey.VariableFiles)).filter(variableFile => !isUserSelected || variableFile.selected);
        const inputs = (await this.getSetting(workspaceFolder, SettingsManager.inputsRegExp, StorageKey.Inputs, false, Visibility.show)).filter(input => !isUserSelected || (input.selected && input.value));
        const inputFiles = (await this.getCustomSettings(workspaceFolder, StorageKey.InputFiles)).filter(inputFile => !isUserSelected || inputFile.selected);
        const runners = (await this.getSetting(workspaceFolder, SettingsManager.runnersRegExp, StorageKey.Runners, false, Visibility.show)).filter(runner => !isUserSelected || (runner.selected && runner.value));
        const payloadFiles = (await this.getCustomSettings(workspaceFolder, StorageKey.PayloadFiles)).filter(payloadFile => !isUserSelected || payloadFile.selected);
        const options = (await this.getCustomSettings(workspaceFolder, StorageKey.Options)).filter(option => !isUserSelected || (option.selected && (option.path || option.notEditable)));
        // const environments = await this.getEnvironments(workspaceFolder);

        return {
            secrets: secrets,
            secretFiles: secretFiles,
            variables: variables,
            variableFiles: variableFiles,
            inputs: inputs,
            inputFiles: inputFiles,
            runners: runners,
            payloadFiles: payloadFiles,
            options: options,
            // environments: environments
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
        await this.storageManager.update(storageKey, existingSettings);

        return settings;
    }

    async getCustomSettings(workspaceFolder: WorkspaceFolder, storageKey: StorageKey): Promise<CustomSetting[]> {
        const existingCustomSettings = this.storageManager.get<{ [path: string]: CustomSetting[] }>(storageKey) || {};
        return existingCustomSettings[workspaceFolder.uri.fsPath] || [];
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

    async createSettingFile(workspaceFolder: WorkspaceFolder, storageKey: StorageKey, settingFileName: string, content: string) {
        const settingFileUri = Uri.file(path.join(workspaceFolder.uri.fsPath, settingFileName));

        try {
            await workspace.fs.stat(settingFileUri);
            window.showErrorMessage(`A file or folder named ${settingFileName} already exists at ${workspaceFolder.uri.fsPath}. Please choose another name.`);
        } catch (error: any) {
            try {
                await workspace.fs.writeFile(settingFileUri, new TextEncoder().encode(content));
                await this.locateSettingFile(workspaceFolder, storageKey, [settingFileUri]);
                const document = await workspace.openTextDocument(settingFileUri);
                await window.showTextDocument(document);
            } catch (error: any) {
                window.showErrorMessage(`Failed to create ${settingFileName}. Error: ${error}`);
            }
        }
    }

    async locateSettingFile(workspaceFolder: WorkspaceFolder, storageKey: StorageKey, settingFilesUris: Uri[]) {
        const settingFilesPaths = (await act.settingsManager.getCustomSettings(workspaceFolder, storageKey)).map(settingFile => settingFile.path);
        const existingSettingFileNames: string[] = [];

        for await (const uri of settingFilesUris) {
            const settingFileName = path.parse(uri.fsPath).name;

            if (settingFilesPaths.includes(uri.fsPath)) {
                existingSettingFileNames.push(settingFileName);
            } else {
                const newSettingFile: CustomSetting = {
                    name: path.parse(uri.fsPath).base,
                    path: uri.fsPath,
                    selected: false
                };
                await act.settingsManager.editCustomSetting(workspaceFolder, newSettingFile, storageKey);
            }
        }

        if (existingSettingFileNames.length > 0) {
            window.showErrorMessage(`The following file(s) have already been added: ${existingSettingFileNames.join(', ')}`);
        }
    }

    async editCustomSetting(workspaceFolder: WorkspaceFolder, newCustomSetting: CustomSetting, storageKey: StorageKey) {
        const existingCustomSettings = this.storageManager.get<{ [path: string]: CustomSetting[] }>(storageKey) || {};
        if (existingCustomSettings[workspaceFolder.uri.fsPath]) {
            const index = existingCustomSettings[workspaceFolder.uri.fsPath]
                .findIndex(customSetting =>
                    storageKey === StorageKey.Options ?
                        customSetting.name === newCustomSetting.name :
                        customSetting.path === newCustomSetting.path
                );
            if (index > -1) {
                existingCustomSettings[workspaceFolder.uri.fsPath][index] = newCustomSetting;
            } else {
                existingCustomSettings[workspaceFolder.uri.fsPath].push(newCustomSetting);
            }
        } else {
            existingCustomSettings[workspaceFolder.uri.fsPath] = [newCustomSetting];
        }

        await this.storageManager.update(storageKey, existingCustomSettings);
    }

    async removeCustomSetting(workspaceFolder: WorkspaceFolder, existingCustomSetting: CustomSetting, storageKey: StorageKey) {
        const existingCustomSettings = this.storageManager.get<{ [path: string]: CustomSetting[] }>(storageKey) || {};
        if (existingCustomSettings[workspaceFolder.uri.fsPath]) {
            const index = existingCustomSettings[workspaceFolder.uri.fsPath].findIndex(customSetting =>
                storageKey === StorageKey.Options ?
                    customSetting.name === existingCustomSetting.name :
                    customSetting.path === existingCustomSetting.path
            );
            if (index > -1) {
                existingCustomSettings[workspaceFolder.uri.fsPath].splice(index, 1);
            }
        }

        await this.storageManager.update(storageKey, existingCustomSettings);
    }

    async deleteSettingFile(workspaceFolder: WorkspaceFolder, settingFile: CustomSetting, storageKey: StorageKey) {
        try {
            await workspace.fs.delete(Uri.file(settingFile.path));
        } catch (error: any) {
            try {
                await workspace.fs.stat(Uri.file(settingFile.path));
                window.showErrorMessage(`Failed to delete file. Error ${error}`);
                return;
            } catch (error: any) { }
        }

        await this.removeCustomSetting(workspaceFolder, settingFile, storageKey);
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