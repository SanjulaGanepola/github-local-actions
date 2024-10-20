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
  async getWorkflows(workspaceFolder: WorkspaceFolder): Promise<Workflow[]> {
    const workflows: Workflow[] = [];

    const workflowFileUris = await workspace.findFiles(new RelativePattern(workspaceFolder, `.github/workflows/*.{yml,yaml}`));
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
      } catch (error) {
        workflows.push({
          name: (yamlContent ? yamlContent.name : undefined) || path.parse(workflowFileUri.fsPath).name,
          uri: workflowFileUri,
          error: 'Failed to parse workflow file.'
        });
      }
    }

    return workflows;
  }
}