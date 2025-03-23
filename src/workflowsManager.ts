import * as fs from "fs/promises";
import * as path from "path";
import { RelativePattern, Uri, workspace, WorkspaceFolder } from "vscode";
import * as yaml from "yaml";
import { ConfigurationManager, Section } from "./configurationManager";

export interface Workflow {
  name: string,
  uri: Uri,
  fileContent?: string,
  yaml?: any,
  error?: string
}

export interface Job {
  name: string
  id: string
}

export class WorkflowsManager {
  static defaultWorkflowsDirectory: string = '.github/workflows';
  static yamlExtension: string = 'yaml';
  static ymlExtension: string = 'yml';

  static getWorkflowsDirectory(): string {
    return ConfigurationManager.get<string>(Section.workflowsDirectory) || WorkflowsManager.defaultWorkflowsDirectory;
  }

  async getWorkflows(workspaceFolder: WorkspaceFolder): Promise<Workflow[]> {
    const workflows: Workflow[] = [];

    const workflowsDirectory = WorkflowsManager.getWorkflowsDirectory();
    const workflowFileUris = await workspace.findFiles(new RelativePattern(workspaceFolder, `${workflowsDirectory}/*.{${WorkflowsManager.yamlExtension},${WorkflowsManager.ymlExtension}}`));
    for await (const workflowFileUri of workflowFileUris) {
      let yamlContent: any | undefined;

      try {
        const fileContent = await fs.readFile(workflowFileUri.fsPath, 'utf8');
        yamlContent = yaml.parse(fileContent);

        workflows.push({
          name: yamlContent.name || path.parse(workflowFileUri.fsPath).name,
          uri: workflowFileUri,
          fileContent: fileContent,
          yaml: yaml.parse(fileContent)
        });
      } catch (error: any) {
        workflows.push({
          name: (yamlContent ? yamlContent.name : undefined) || path.parse(workflowFileUri.fsPath).name,
          uri: workflowFileUri,
          error: 'Failed to parse workflow'
        });
      }
    }

    return workflows;
  }
}