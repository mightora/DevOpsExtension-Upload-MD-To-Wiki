[![Visual Studio Marketplace](https://img.shields.io/badge/Marketplace-View%20Extension-blue?logo=visual-studio)](https://marketplace.visualstudio.com/items?itemName=mightoraio.upload-md-to-wiki) 
[![Release Extension](https://github.com/mightora/DevOpsExtension-Upload-MD-To-Wiki/actions/workflows/release-extension.yml/badge.svg)](https://github.com/mightora/DevOpsExtension-Upload-MD-To-Wiki/actions/workflows/release-extension.yml) 
[![vsmarketplace](https://vsmarketplacebadges.dev/version/mightoraio.upload-md-to-wiki.svg)](https://marketplace.visualstudio.com/items?itemName=mightoraio.upload-md-to-wiki)
[![Average time to resolve an issue](http://isitmaintained.com/badge/resolution/mightora/DevOpsExtension-Upload-MD-To-Wiki.svg)](https://github.com/mightora/DevOpsExtension-Upload-MD-To-Wiki/issues "Average time to resolve an issue")
[![Percentage of issues still open](http://isitmaintained.com/badge/open/mightora/DevOpsExtension-Upload-MD-To-Wiki.svg)](https://github.com/mightora/DevOpsExtension-Upload-MD-To-Wiki/issues "Percentage of issues still open")

# DevOps Extension: Upload Markdown to Wiki

This DevOps extension allows you to move markdown (`.md`) files held in an Azure DevOps repository and publish them to an Azure DevOps Wiki. This can be useful for automating the documentation process and ensuring that your wiki is always up-to-date with the latest markdown files from your repository.

## Features

- Automatically upload markdown files from a specified source directory in your repository to a specified destination in your Azure DevOps Wiki.
- Supports creating and updating wiki pages.
- Handles nested directories and maintains the directory structure in the wiki.
- **Image Upload Support**: Automatically uploads images referenced in markdown files as wiki attachments.
- **Header Message**: Add a customizable header message to all uploaded pages (e.g., "DO NOT EDIT DIRECTLY - EDIT IN REPO").
- **Page Links**: Optionally include direct links to wiki pages at the bottom of each page.
- **Orphaned Page Cleanup**: Automatically delete wiki pages when their corresponding markdown files are removed from the repository (optional, disabled by default for safety).

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
    HeaderMessage: '<mark>DO NOT EDIT DIRECTLY - EDIT IN REPO</mark>'
    IncludePageLink: false
    DeleteOrphanedPages: false
```

### Parameters
- **ADOBaseUrl**: The base URL of your Azure DevOps organization.
- **wikiSource**: The source directory in your repository containing the markdown files.
- **MDRepositoryName**: The name of your repository.
- **MDVersion**: The version number or build number.
- **MDTitle**: The title for the markdown files.
- **WikiDestination**: The destination path in the wiki where the markdown files will be uploaded.
- **HeaderMessage** *(optional)*: A header message to be added to the top of every wiki page. Useful for adding disclaimers like "DO NOT EDIT DIRECTLY - EDIT IN REPO".
- **IncludePageLink** *(optional)*: When enabled, adds a "Link to this page" at the bottom of each wiki page for easy navigation.
- **DeleteOrphanedPages** *(optional)*: When enabled, automatically deletes wiki pages that no longer have corresponding markdown files in the source repository. **Use with caution** - defaults to `false` for safety.

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
    HeaderMessage: '<mark>DO NOT EDIT DIRECTLY - EDIT IN REPO</mark>'
    IncludePageLink: true
    DeleteOrphanedPages: false
  displayName: 'Upload Markdown to Wiki'
```

### Advanced Configuration Examples

**Basic Setup** (minimal configuration):
```yaml
- task: mightora-UploadMDToWiki@1
  inputs:
    ADOBaseUrl: '$(System.CollectionUri)'
    wikiSource: '$(Build.SourcesDirectory)/docs'
    MDRepositoryName: '$(Build.Repository.Name)'
    WikiDestination: 'Documentation'
```

**Full Feature Setup** (with all options enabled):
```yaml
- task: mightora-UploadMDToWiki@1
  inputs:
    ADOBaseUrl: '$(System.CollectionUri)'
    wikiSource: '$(Build.SourcesDirectory)/docs'
    MDRepositoryName: '$(Build.Repository.Name)'
    MDVersion: '$(Build.BuildNumber)'
    MDTitle: 'Project Documentation'
    WikiDestination: 'Documentation'
    HeaderMessage: |
      <mark>⚠️ DO NOT EDIT DIRECTLY - EDIT IN REPOSITORY</mark>
      
      This page is automatically generated from the repository. Please make changes in the source files.
    IncludePageLink: true
    DeleteOrphanedPages: true
  displayName: 'Sync Documentation to Wiki'
```

## Safety & Best Practices

### Orphaned Page Deletion
The `DeleteOrphanedPages` feature is powerful but should be used with caution:
- **Default**: Disabled (`false`) for safety
- **When to enable**: Only when you're confident about your markdown file organization
- **What it does**: Deletes wiki pages that no longer have corresponding `.md` files in your repository
- **Scope**: Only affects pages under your specified `WikiDestination/RepositoryName` path

### Recommended Workflow
1. **Start with `DeleteOrphanedPages: false`** to test the upload functionality
2. **Use `HeaderMessage`** to clearly indicate that pages are auto-generated
3. **Enable `IncludePageLink`** for easy navigation between wiki and source
4. **Only enable `DeleteOrphanedPages`** after confirming the extension works as expected

### Image Handling
- Images referenced in markdown files are automatically uploaded as wiki attachments
- Relative image paths in markdown files are supported
- Images are given unique names to prevent conflicts

## License
This project is licensed under the MIT License - see the LICENSE file for details.

## Contributing
Contributions are welcome! Please open an issue or submit a pull request on GitHub.

## Support
For support, please visit mightora.io or open an issue on the GitHub repository.


