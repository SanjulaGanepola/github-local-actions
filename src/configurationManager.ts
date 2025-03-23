import { ConfigurationTarget, workspace } from 'vscode';
import { Act } from './act';
import { WorkflowsManager } from './workflowsManager';

export enum Platform {
    windows = 'win32',
    mac = 'darwin',
    linux = 'linux'
}

export enum Section {
    actCommand = 'actCommand',
    workflowsDirectory = 'workflowsDirectory',
    dockerDesktopPath = 'dockerDesktopPath'
}

export namespace ConfigurationManager {
    export const group: string = 'githubLocalActions';
    export const searchPrefix: string = '@ext:sanjulaganepola.github-local-actions';

    export async function initialize(): Promise<void> {
        let actCommand = ConfigurationManager.get<string>(Section.actCommand);
        if (!actCommand) {
            await ConfigurationManager.set(Section.actCommand, Act.defaultActCommand);
        }

        let workflowsDirectory = ConfigurationManager.get<string>(Section.workflowsDirectory);
        if (!workflowsDirectory) {
            await ConfigurationManager.set(Section.workflowsDirectory, WorkflowsManager.defaultWorkflowsDirectory);
        }

        let dockerDesktopPath = ConfigurationManager.get<string>(Section.dockerDesktopPath);
        if (!dockerDesktopPath) {
            switch (process.platform) {
                case Platform.windows:
                    dockerDesktopPath = 'C:/Program Files/Docker/Docker/Docker Desktop.exe';
                    break;
                case Platform.mac:
                    dockerDesktopPath = '/Applications/Docker.app';
                    break;
                default:
                    return;
            }

            await ConfigurationManager.set(Section.dockerDesktopPath, dockerDesktopPath);
        }
    }

    export function getSearchTerm(section: Section): string {
        return `${ConfigurationManager.searchPrefix} ${ConfigurationManager.group}.${section}`;
    }

    export function get<T>(section: Section): T | undefined {
        return workspace.getConfiguration(ConfigurationManager.group).get(section) as T;
    }

    export async function set(section: Section, value: any): Promise<void> {
        return await workspace.getConfiguration(ConfigurationManager.group).update(section, value, ConfigurationTarget.Global);
    }
}