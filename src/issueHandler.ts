import * as childProcess from "child_process";
import * as fs from "fs/promises";
import * as path from "path";
import { env, ExtensionContext, ProgressLocation, QuickPickItem, ThemeIcon, Uri, window, workspace } from "vscode";
import { Act, Option } from "./act";
import { act } from "./extension";

interface BugReport {
    githubLocalActionsVersion?: string
    actVersion?: string,
    githubRepositoryLink?: string,
    workflowContent?: string,
    actCommandUsed?: string,
    actCommandOutput?: string,
    actBugReport?: string
    bugDescription?: string,
}

// Used to map bug report keys to ids and titles in the issue template
const bugReportToTemplateMap: Record<keyof BugReport, { id: string, title: string }> = {
    githubLocalActionsVersion: { id: 'github-local-actions-version', title: 'Github Local Actions Version' },
    actVersion: { id: 'act-version', title: 'Act Version' },
    githubRepositoryLink: { id: 'github-repository-link', title: 'GitHub Repository Link' },
    workflowContent: { id: 'workflow-content', title: 'Workflow Content' },
    actCommandUsed: { id: 'act-command-used', title: 'Act Command Used' },
    actCommandOutput: { id: 'act-command-output', title: 'Act Command Output' },
    actBugReport: { id: 'act-bug-report', title: 'Act Bug Report' },
    bugDescription: { id: 'bug-description', title: 'Bug Description' }
};

export namespace IssueHandler {
    export async function openBugReport(context: ExtensionContext) {
        try {
            const bugReport = await generateBugReport(context);
            if (bugReport) {
                const params = Object.entries(bugReport)
                    .filter(([key, value]) => value !== undefined && value !== '')
                    .map(([key, value]) => `${encodeURIComponent(bugReportToTemplateMap[key as keyof BugReport].id)}=${encodeURIComponent(value)}`)
                    .join('&');

                const bugReportUrl: string = 'https://github.com/SanjulaGanepola/github-local-actions/issues/new?assignees=&labels=bug&projects=&template=1-bug_report.yml';
                const urlWithParams = params ? `${bugReportUrl}&${params}` : bugReportUrl;
                await env.openExternal(Uri.parse(urlWithParams));
            }
        } catch (error) {
            await env.openExternal(Uri.parse('https://github.com/SanjulaGanepola/github-local-actions/issues'));
        }
    }

    async function generateBugReport(context: ExtensionContext): Promise<BugReport | undefined> {
        return await window.withProgress({ location: ProgressLocation.Notification, title: 'Generating bug report...' }, async () => {
            const fullBugReport: BugReport = {};
            const infoItems: (QuickPickItem & { key: keyof BugReport })[] = [];

            // Get extension version
            const githubLocalActionsVersion = context.extension.packageJSON.version;
            if (githubLocalActionsVersion) {
                fullBugReport.githubLocalActionsVersion = `v${githubLocalActionsVersion}`;
                infoItems.push({
                    label: bugReportToTemplateMap['githubLocalActionsVersion'].title,
                    description: fullBugReport.githubLocalActionsVersion,
                    iconPath: new ThemeIcon('robot'),
                    picked: true,
                    key: 'githubLocalActionsVersion'
                });
            }

            // Get act version
            const actVersion = (await act.componentsManager.getComponents()).find(component => component.name === 'nektos/act')?.version;
            if (actVersion) {
                fullBugReport.actVersion = `v${actVersion}`;
                infoItems.push({
                    label: bugReportToTemplateMap['actVersion'].title,
                    description: fullBugReport.actVersion,
                    iconPath: new ThemeIcon('terminal'),
                    picked: true,
                    key: 'actVersion'
                });
            }


            let isWorkflowFound: boolean = false;
            const activeEditor = window.activeTextEditor;
            const workspaceFolder = activeEditor ?
                workspace.getWorkspaceFolder(activeEditor.document.uri) :
                (workspace.workspaceFolders && workspace.workspaceFolders.length > 0 ? workspace.workspaceFolders[0] : undefined);
            if (workspaceFolder) {
                // Get repository link
                const repository = await act.settingsManager.githubManager.getRepository(workspaceFolder, true);
                const githubRepositoryLink = repository?.remoteOriginUrl;
                if (githubRepositoryLink) {
                    fullBugReport.githubRepositoryLink = githubRepositoryLink;
                    infoItems.push({
                        label: bugReportToTemplateMap['githubRepositoryLink'].title,
                        description: fullBugReport.githubRepositoryLink,
                        iconPath: new ThemeIcon('link'),
                        picked: true,
                        key: 'githubRepositoryLink'
                    });
                }

                if (activeEditor) {
                    const workflows = await act.workflowsManager.getWorkflows(workspaceFolder);
                    const workflow = workflows.find(workflow => workflow.uri.fsPath === activeEditor.document.uri.fsPath);
                    if (workflow) {
                        isWorkflowFound = true;

                        // Get workflow content
                        const workflowContent = workflow?.fileContent;
                        if (workflowContent) {
                            fullBugReport.workflowContent = workflowContent;
                            infoItems.push({
                                label: bugReportToTemplateMap['workflowContent'].title,
                                description: path.parse(workflow.uri.fsPath).base,
                                iconPath: new ThemeIcon('file'),
                                picked: true,
                                key: 'workflowContent'
                            });
                        }

                        const workflowHistory = act.historyManager.workspaceHistory[workspaceFolder.uri.fsPath]?.filter(history => history.commandArgs.workflow?.uri.fsPath === workflow.uri.fsPath);
                        if (workflowHistory && workflowHistory.length > 0) {
                            // Get last act command
                            const settings = await act.settingsManager.getSettings(workspaceFolder, true);
                            const history = workflowHistory[workflowHistory.length - 1];
                            const actCommandUsed = (await act.buildActCommand(settings, history.commandArgs.options)).displayCommand;
                            if (actCommandUsed) {
                                fullBugReport.actCommandUsed = actCommandUsed;
                                infoItems.push({
                                    label: bugReportToTemplateMap['actCommandUsed'].title,
                                    description: `${history.name} #${history.count}`,
                                    iconPath: new ThemeIcon('code'),
                                    picked: true,
                                    key: 'actCommandUsed'
                                });
                            }

                            try {
                                // Get last act command output
                                const actCommandOutput = await fs.readFile(history.logPath, 'utf8');
                                if (actCommandOutput) {
                                    fullBugReport.actCommandOutput = actCommandOutput;
                                    infoItems.push({
                                        label: bugReportToTemplateMap['actCommandOutput'].title,
                                        description: path.parse(history.logPath).base,
                                        iconPath: new ThemeIcon('note'),
                                        picked: true,
                                        key: 'actCommandOutput'
                                    });
                                }
                            } catch (error: any) { }
                        }
                    }
                }
            }

            // Get act bug report
            const actBugReport = await new Promise<string | undefined>((resolve, reject) => {
                childProcess.exec(`${Act.getActCommand()} ${Option.BugReport}`, (error, stdout, stderr) => {
                    if (!error) {
                        resolve(stdout);
                    }
                });
            });
            if (actBugReport) {
                fullBugReport.actBugReport = actBugReport;
                infoItems.push({
                    label: bugReportToTemplateMap['actBugReport'].title,
                    iconPath: new ThemeIcon('report'),
                    picked: true,
                    key: 'actBugReport'
                });
            }

            const defaultTitle = 'Select the information to include in the bug report';
            const extendedTitle = 'More information can be included in the bug report by having the relevant workflow opened in the editor before invoking this command.';
            const selectedInfo = await window.showQuickPick(infoItems, {
                title: isWorkflowFound ? defaultTitle : `${defaultTitle}. ${extendedTitle}`,
                placeHolder: 'Bug Report Information',
                canPickMany: true
            });

            if (selectedInfo) {
                const bugReport: BugReport = {};

                const selectedInfoKeys = selectedInfo.map(info => info.key);
                for (const key of selectedInfoKeys) {
                    bugReport[key] = fullBugReport[key];
                }

                return bugReport;
            }
        });
    }
}