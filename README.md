# GitHub Local Actions

<img src="./icon.png" align="right" width="128" height="128">

[![Version](https://img.shields.io/visual-studio-marketplace/v/SanjulaGanepola.github-local-actions)](https://marketplace.visualstudio.com/items?itemName=SanjulaGanepola.github-local-actions)
[![Installs](https://img.shields.io/visual-studio-marketplace/i/SanjulaGanepola.github-local-actions)](https://marketplace.visualstudio.com/items?itemName=SanjulaGanepola.github-local-actions)

Run your GitHub Actions locally with the power of the [GitHub Local Actions](https://marketplace.visualstudio.com/items?itemName=SanjulaGanepola.github-local-actions) VS Code extension! Say goodbye to the hassle of committing and pushing changes every time you need to test a workflow. This extension lets you quickly and efficiently run your workflows locally, leveraging the [nektos/act](https://github.com/nektos/act) CLI tool. Enjoy a seamless experience with an interface designed to feel as familiar as the official [GitHub Actions](https://marketplace.visualstudio.com/items?itemName=GitHub.vscode-github-actions) extension.

* 🚀 **Run Workflows/Jobs**: Run entire workflows or specific jobs locally without leaving your editor.
* ⚡ **Trigger Events**: Trigger standard [GitHub events](https://docs.github.com/en/actions/writing-workflows/choosing-when-your-workflow-runs/events-that-trigger-workflows) to run multiple workflows.
* 📖 **View Workflow Run History**: Track and investigate past workflow logs.
* ⚙️ **Manage Workflow Settings**: Define secrets, variables, inputs, and runners to be used when executing workflows.

![GitHub Local Actions](https://raw.githubusercontent.com/SanjulaGanepola/github-local-actions/main/images/github-local-actions.gif)

## Components

The `Components` view is where you can manage the following components which must be installed and started up before running any GitHub Actions:

1. [nektos/act](https://github.com/nektos/act): Act is a CLI tool responsible for executing your workflows locally. It can be installed via several software package managers or using a pre-built artifact.

    ![nektos/act Installation](https://raw.githubusercontent.com/SanjulaGanepola/github-local-actions/main/images/components-view.png)

2. [Docker Engine](https://docs.docker.com/engine): Docker Engine is required for act to function as it uses Docker to handle workflow execution. The process includes:
    
    * Pulling or building the images specified in your workflow files
    * Determining the execution path based on your workflow's dependencies
    * Running containers for each action using the prepared images
    
    The containers are configured to mirror GitHub's environment, including matching [environment variables](https://docs.github.com/en/actions/writing-workflows/choosing-what-your-workflow-does/store-information-in-variables#default-environment-variables) and [filesystems](https://docs.github.com/en/actions/using-github-hosted-runners/using-github-hosted-runners#file-systems), ensuring a consistent and reliable local execution.

## Workflows

The `Workflows` view is where you can manage and run workflows locally. You have several options to execute a workflow:

1. **Run All Workflows**: Run all workflows in the workspace.
2. **Run Workflow**: Run an entire workflow.
3. **Run Job**: Run a specific job in a workflow.
4. **Run Event**: Run multiple workflows by triggering a [GitHub event](https://docs.github.com/en/actions/writing-workflows/choosing-when-your-workflow-runs/events-that-trigger-workflows).

![Workflows View](https://raw.githubusercontent.com/SanjulaGanepola/github-local-actions/main/images/workflows-view.png)

## History

The `History` view is where you can manage workflows currently being executed as well as review logs from previous workflow runs.

![History View](https://raw.githubusercontent.com/SanjulaGanepola/github-local-actions/main/images/history-view.png)

## Settings

The `Settings` view is where you can set [secrets](https://nektosact.com/usage/index.html#secrets), [variables](https://nektosact.com/usage/index.html#vars), [inputs](https://nektosact.com/usage/index.html#pass-inputs-to-manually-triggered-workflows), and [runners](https://nektosact.com/usage/runners.html) to be used when executing workflows.

> 🚨 Checkout the [nektos/act](https://nektosact.com) documentation for more details on how these various settings are handled. In particular, refer to how secrets can be provided to workflows interactively, as environment variables, or from a file.

![Settings View](https://raw.githubusercontent.com/SanjulaGanepola/github-local-actions/main/images/settings-view.png)

## Bugs and Feature Requests

Feel free to share any bugs or feature requests in the project's [GitHub Issues](https://github.com/SanjulaGanepola/github-local-actions/issues) page.

> 🚨 For any bugs or feature requests related to nektos/act specifically, refer to its dedicated [GitHub Issues](https://github.com/nektos/act/issues) page.

## Contribution

Contributions are always welcome! Please see our [contributing guide](https://github.com/SanjulaGanepola/github-local-actions/blob/main/CONTRIBUTING.md) for more details.

## Maintainers

* [@SanjulaGanepola](https://github.com/SanjulaGanepola)