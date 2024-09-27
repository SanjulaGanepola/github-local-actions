import * as fs from "fs/promises";
import * as path from "path";
import { workspace } from "vscode";
import * as yaml from "yaml";
import { Workflow } from "../types";

export class WorkflowManager {
  async getWorkflows(): Promise<Workflow[]> {
    const workflows: Workflow[] = [];

    const workspaceFolders = workspace.workspaceFolders;
    if (workspaceFolders && workspaceFolders.length > 0) {
      const workflowFileUris = await workspace.findFiles(`.github/workflows/*.{yml,yaml}`);

      for await (const workflowFileUri of workflowFileUris) {
        try {
          const fileContent = await fs.readFile(workflowFileUri.fsPath, 'utf8');

          workflows.push({
            name: path.parse(workflowFileUri.fsPath).name,
            uri: workflowFileUri,
            content: yaml.parse(fileContent)
          });
        } catch (error) {
          workflows.push({
            name: path.parse(workflowFileUri.fsPath).name,
            uri: workflowFileUri,
            error: 'Failed to parse workflow file'
          });
        }
      }
    }

    return workflows;
  }
}