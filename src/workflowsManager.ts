import * as fs from "fs/promises";
import * as path from "path";
import { RelativePattern, Uri, workspace, WorkspaceFolder } from "vscode";
import * as yaml from "yaml";

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
  static WORKFLOWS_DIRECTORY: string = '.github/workflows';
  static YAML_EXTENSION: string = 'yaml';
  static YML_EXTENSION: string = 'yml';

  async getWorkflows(workspaceFolder: WorkspaceFolder): Promise<Workflow[]> {
    const workflows: Workflow[] = [];

    const workflowFileUris = await workspace.findFiles(new RelativePattern(workspaceFolder, `${WorkflowsManager.WORKFLOWS_DIRECTORY}/*.{${WorkflowsManager.YAML_EXTENSION},${WorkflowsManager.YML_EXTENSION}}`));
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