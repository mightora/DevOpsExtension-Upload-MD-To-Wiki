# DevOps Extension: Upload Markdown to Wiki

This DevOps extension allows you to move markdown (`.md`) files held in an Azure DevOps repository and publish them to an Azure DevOps Wiki. This can be useful for automating the documentation process and ensuring that your wiki is always up-to-date with the latest markdown files from your repository.

## Features

- Automatically upload markdown files from a specified source directory in your repository to a specified destination in your Azure DevOps Wiki.
- Supports creating and updating wiki pages.
- Handles nested directories and maintains the directory structure in the wiki.

## Prerequisites

- Azure DevOps account
- Personal Access Token (PAT) with sufficient permissions to access the repository and wiki
- Azure DevOps pipeline

## Installation

1. Install the extension from the Visual Studio Marketplace.
2. Add the task to your Azure DevOps pipeline.

## Usage

### Pipeline Configuration

Add the following task to your Azure DevOps pipeline YAML file:

```yaml
- task: mightora-UploadMDToWiki@1
  inputs:
    ADOBaseUrl: '$(System.CollectionUri)'
    wikiSource: '$(Build.SourcesDirectory)'
    MDRepositoryName: '$(Build.Repository.Name)'
    MDVersion: '$(Build.BuildNumber)'
    MDTitle: 'Markdown title'
    WikiDestination: 'UploadedFromPipeline'
```

### Parameters
- ADOBaseUrl: The base URL of your Azure DevOps organization.
- wikiSource: The source directory in your repository containing the markdown files.
- MDRepositoryName: The name of your repository.
- MDVersion: The version number or build number.
- MDTitle: The title for the markdown files.
- WikiDestination: The destination path in the wiki where the markdown files will be uploaded.

### Example

Here is an example of a complete pipeline configuration:

```yaml
trigger:
- main

pool:
  vmImage: 'ubuntu-latest'

steps:
- task: mightora-UploadMDToWiki@1
  inputs:
    ADOBaseUrl: '$(System.CollectionUri)'
    wikiSource: '$(Build.SourcesDirectory)'
    MDRepositoryName: '$(Build.Repository.Name)'
    MDVersion: '$(Build.BuildNumber)'
    MDTitle: 'Markdown title'
    WikiDestination: 'UploadedFromPipeline'
  displayName: 'Upload Markdown to Wiki'
```

## License
This project is licensed under the MIT License - see the LICENSE file for details.

## Contributing
Contributions are welcome! Please open an issue or submit a pull request on GitHub.

## Support
For support, please visit mightora.io or open an issue on the GitHub repository.


