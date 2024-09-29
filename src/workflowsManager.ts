import * as fs from "fs/promises";
import * as path from "path";
import { Uri, workspace } from "vscode";
import * as yaml from "yaml";

export interface Workflow {
  name: string,
  uri: Uri,
  content?: any,
  error?: string
}

export interface WorkflowLog {
  workflow: Workflow,
  status: WorkflowStatus
}

export enum WorkflowStatus {
  Queued = 'queued',
  InProgress = 'inProgress',
  success = 'success',
  failed = 'failed',
  Cancelled = 'cancelled'
}

export enum JobStatus {
  Queued = 'queued',
  InProgress = 'inProgress',
  Skipped = 'skipped',
  success = 'success',
  failed = 'failed',
  Cancelled = 'cancelled'
}

export enum StepStatus {
  Queued = 'queued',
  InProgress = 'inProgress',
  Skipped = 'skipped',
  success = 'success',
  failed = 'failed',
  Cancelled = 'cancelled'
}

export class WorkflowsManager {
  private workflowLogs: WorkflowLog[] = [];

  constructor() {

  }

  async getWorkflows(): Promise<Workflow[]> {
    const workflows: Workflow[] = [];

    const workspaceFolders = workspace.workspaceFolders;
    if (workspaceFolders && workspaceFolders.length > 0) {
      const workflowFileUris = await workspace.findFiles(`.github/workflows/*.{yml,yaml}`);

      for await (const workflowFileUri of workflowFileUris) {
        let yamlContent: any | undefined;

        try {
          const fileContent = await fs.readFile(workflowFileUri.fsPath, 'utf8');
          yamlContent = yaml.parse(fileContent);

          workflows.push({
            name: yamlContent.name || path.parse(workflowFileUri.fsPath).name,
            uri: workflowFileUri,
            content: yaml.parse(fileContent)
          });
        } catch (error) {
          workflows.push({
            name: (yamlContent ? yamlContent.name : undefined) || path.parse(workflowFileUri.fsPath).name,
            uri: workflowFileUri,
            error: 'Failed to parse workflow file'
          });
        }
      }
    }

    return workflows;
  }
}