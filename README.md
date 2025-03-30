# GitHub Local Actions

<img src="./icon.png" align="right" width="128" height="128">

[![Version](https://img.shields.io/visual-studio-marketplace/v/SanjulaGanepola.github-local-actions)](https://marketplace.visualstudio.com/items?itemName=SanjulaGanepola.github-local-actions)
[![Installs](https://img.shields.io/visual-studio-marketplace/i/SanjulaGanepola.github-local-actions)](https://marketplace.visualstudio.com/items?itemName=SanjulaGanepola.github-local-actions)

Run your GitHub Actions locally with the power of the [GitHub Local Actions](https://marketplace.visualstudio.com/items?itemName=SanjulaGanepola.github-local-actions) Visual Studio Code extension! Say goodbye to the hassle of committing and pushing changes every time you need to test a workflow. This extension lets you quickly and efficiently run your workflows locally, leveraging the [nektos/act](https://github.com/nektos/act) CLI tool. Enjoy a seamless experience with an interface designed to feel as familiar as the official [GitHub Actions](https://marketplace.visualstudio.com/items?itemName=GitHub.vscode-github-actions) extension.

* 🚀 **Run Workflows/Jobs**: Run entire workflows or specific jobs locally without leaving your editor.
* ⚡ **Trigger Events**: Trigger standard [GitHub events](https://docs.github.com/en/actions/writing-workflows/choosing-when-your-workflow-runs/events-that-trigger-workflows) to run multiple workflows.
* 📖 **View Workflow Run History**: Track and investigate past workflow logs.
* ⚙️ **Manage Workflow Settings**: Define secrets, variables, inputs, runners, payloads, and options for execution.

✨ Documentation site is now live [here](https://sanjulaganepola.github.io/github-local-actions-docs/)!

![GitHub Local Actions](https://raw.githubusercontent.com/SanjulaGanepola/github-local-actions/main/images/github-local-actions.gif)

## Components

The `Components` view is where you can manage the components for using the extension.

* [nektos/act](https://github.com/nektos/act) provides the core functionality for running GitHub Actions locally. Whenever a workflow, job, or event is triggered, the extension is essentially building up an act command and executing it as a [VS Code task](https://code.visualstudio.com/docs/editor/tasks). 
* [Docker Engine](https://docs.docker.com/engine/) is required for nektos/act if you plan to run workflows in containers. The containers are configured to mirror GitHub's environment, including matching [environment variables](https://docs.github.com/en/actions/writing-workflows/choosing-what-your-workflow-does/store-information-in-variables#default-environment-variables) and [filesystems](https://docs.github.com/en/actions/using-github-hosted-runners/using-github-hosted-runners#file-systems), ensuring a consistent and reliable local execution. 

    > If you do not require container isolation, you can run selected (e.g. Windows or MacOS) workflow jobs directly on your system. In this case, you do not need to have docker installed or running. Click [here](https://sanjulaganepola.github.io/github-local-actions-docs/usage/settings/#runners) to learn how to use your host system as your runner.


![nektos/act Installation](https://raw.githubusercontent.com/SanjulaGanepola/github-local-actions/main/images/components-view.png)

## Workflows

The `Workflows` view is where you can manage and run workflows locally. You have several options to execute a workflow:

1. **Run All Workflows**: Run all workflows in the workspace.
2. **Run Single Workflow**: Run a single workflow in the workspace.
3. **Run Job**: Run a specific job in a workflow.
4. **Run Event**: Run multiple workflows using a [GitHub event](https://docs.github.com/en/actions/writing-workflows/choosing-when-your-workflow-runs/events-that-trigger-workflows).
5. **Run Workflow Event**: Run a specific event on a workflow.
6. **Run Job Event**: Run a specific event on a job.

You can access these commands via:

* Use the buttons in the Workflows view header for workspace-wide commands (like "Run All Workflows")
* Inline buttons that appear when hovering over workflows and jobs
* Right-click context menu for workflows and jobs

![Workflows View](https://raw.githubusercontent.com/SanjulaGanepola/github-local-actions/main/images/workflows-view.png)

## History

The `History` view is where you can browse and manage workflows currently being executed as well as review logs from previous workflow runs.

![History View](https://raw.githubusercontent.com/SanjulaGanepola/github-local-actions/main/images/history-view.png)

## Settings

The `Settings` view is where you can configure various settings to be used when executing workflows.

* [Secrets](https://sanjulaganepola.github.io/github-local-actions-docs/usage/settings/#secrets): Configure sensitive information used in workflows.
* [Variables](https://sanjulaganepola.github.io/github-local-actions-docs/usage/settings/#variables): Define workflow variables and import from GitHub.
* [Inputs](https://sanjulaganepola.github.io/github-local-actions-docs/usage/settings/#inputs): Assign input values for workflow runs.
* [Runners](https://sanjulaganepola.github.io/github-local-actions-docs/usage/settings/#runners): Customize runners for executing workflows.
* [Paylods](https://sanjulaganepola.github.io/github-local-actions-docs/usage/settings/#payloads): Configure payloads that define event properties.
* [Options](https://sanjulaganepola.github.io/github-local-actions-docs/usage/settings/#options): Define additional act options related to cache, artifacts, containers, etc.

![Settings View](https://raw.githubusercontent.com/SanjulaGanepola/github-local-actions/main/images/settings-view.png)

## Bugs and Feature Requests

If you encounter any issues or have feature requests specific to GitHub Local Actions, please feel free to [open an issue](https://github.com/SanjulaGanepola/github-local-actions/issues) or post on the [discussion board](https://github.com/SanjulaGanepola/github-local-actions/discussions).

> 🚨 For any bugs or feature requests related to nektos/act specifically, please open an issue on the [nektos/act](https://github.com/nektos/act/issues) repository.

## Contribution

Contributions are always welcome! Please see our [contributing guide](https://github.com/SanjulaGanepola/github-local-actions/blob/main/CONTRIBUTING.md) for more details.

## Maintainers

* [@SanjulaGanepola](https://github.com/SanjulaGanepola)