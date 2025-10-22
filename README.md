# DevOps Extension: Upload Markdown to Wiki

[![Visual Studio Marketplace](https://img.shields.io/badge/Marketplace-View%20Extension-blue?logo=visual-studio)](https://marketplace.visualstudio.com/items?itemName=mightoraio.upload-md-to-wiki) [![Release Extension](https://github.com/mightora/DevOpsExtension-Upload-MD-To-Wiki/actions/workflows/release-extension.yml/badge.svg)](https://github.com/mightora/DevOpsExtension-Upload-MD-To-Wiki/actions/workflows/release-extension.yml) [![vsmarketplace](https://vsmarketplacebadges.dev/version/mightoraio.upload-md-to-wiki.svg)](https://marketplace.visualstudio.com/items?itemName=mightoraio.upload-md-to-wiki) [![Average time to resolve an issue](http://isitmaintained.com/badge/resolution/mightora/DevOpsExtension-Upload-MD-To-Wiki.svg)](https://github.com/mightora/DevOpsExtension-Upload-MD-To-Wiki/issues "Average time to resolve an issue") [![Percentage of issues still open](http://isitmaintained.com/badge/open/mightora/DevOpsExtension-Upload-MD-To-Wiki.svg)](https://github.com/mightora/DevOpsExtension-Upload-MD-To-Wiki/issues "Percentage of issues still open") [![View on Mightora](https://img.shields.io/badge/View_on-Mightora.io-blue)](https://mightora.io/tools/cicd/upload-md-to-wiki/ "View on Mightora") 

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

## Architecture & Technical Details

### Solution Overview

This extension provides a comprehensive solution for synchronizing markdown documentation from Azure DevOps repositories to Azure DevOps wikis. The solution consists of several interconnected components working together to ensure reliable, maintainable documentation workflows.

### Core Functions Integration

#### 1. Main Orchestration (`runTask()`)
- **Purpose**: Entry point that coordinates the entire synchronization process
- **Flow**: Authentication → Wiki Discovery → Path Creation → Content Processing → Cleanup
- **Dependencies**: Integrates all helper services and handles dependency injection for testability

#### 2. WikiHelperFunctions Class - Core Business Logic

The business logic is organized into several specialized function groups:

##### Content Processing Functions:
- **`processMdFiles()`**: Recursively processes directories and markdown files
- **`processMarkdownFile()`**: Handles individual file processing with content transformation
- **`processImagesInContent()`**: Extracts images from markdown and uploads as attachments
- **`createOrUpdateWikiPage()`**: Manages wiki page creation/updates with error handling

##### Path Management Functions:
- **`ensurePathExists()`**: Creates missing wiki page hierarchies for deep structures
- **`collectExpectedWikiPages()`**: Scans directories to build comprehensive expected page inventory

##### Cleanup Functions:
- **`deleteOrphanedWikiPages()`**: Identifies and removes pages without corresponding markdown files
- **`analyzeWikiPages()`**: Categorizes existing pages as managed, orphaned, or ignored
- **`deletePages()`**: Performs safe deletion with comprehensive error handling

##### Utility Functions:
- **`generateWikiPageLink()`**: Creates properly encoded wiki page URLs
- **`uploadImageAsAttachment()`**: Handles image uploads with unique naming
- **`fetchDeveloperMessage()`**: Retrieves external configuration messages

#### 3. WikiPageApi Service - API Abstraction Layer
- Provides clean, testable interface to Azure DevOps Wiki REST APIs
- Handles authentication, headers, error responses, and HTTP specifics
- Methods: `getPages()`, `getPage()`, `CreatePage()`, `UpdatePage()`, `DeletePage()`

### Data Flow Architecture

```
Repository Markdown Files
           ↓
    collectExpectedWikiPages() ← Scans & catalogs files
           ↓
    processMdFiles() ← Processes each file
           ↓
    processImagesInContent() ← Handles embedded images  
           ↓
    ensurePathExists() ← Creates path hierarchy
           ↓
    createOrUpdateWikiPage() ← Updates wiki content
           ↓
    deleteOrphanedWikiPages() ← Cleanup orphaned pages
           ↓
    Azure DevOps Wiki
```

### Recent Updates & Improvements

#### October 2025 - Major Code Quality Enhancement Initiative
**Developer**: Wayne Campbell  
**Dates**: October 21-22, 2025  
**Focus**: Cyclomatic complexity reduction and maintainability improvements

##### Cyclomatic Complexity Reduction Project

###### `processMdFiles()` Refactoring:
- **Before**: Cyclomatic complexity of 10 (high complexity, difficult to test and maintain)
- **After**: Cyclomatic complexity of 4 (excellent, highly maintainable)
- **Improvements Made**:
  - Extracted `processMarkdownFile()` helper for single file processing logic
  - Extracted `processImagesInContent()` helper for image handling workflows
  - Extracted `createOrUpdateWikiPage()` helper for wiki page operations
  - Extracted `handleWikiPageCreationError()` helper for comprehensive error scenarios
  - Implemented early returns and continue statements to flatten conditional nesting
  - Improved separation of concerns and single responsibility principle adherence

###### `deleteOrphanedWikiPages()` Refactoring:
- **Before**: Cyclomatic complexity of 9 (moderately high, testing challenges)
- **After**: Cyclomatic complexity of 3 (excellent, easily testable)
- **Improvements Made**:
  - Extracted `analyzeWikiPages()` helper for page categorization logic
  - Extracted `logPageAnalysisSummary()` helper for comprehensive logging
  - Extracted `deletePages()` helper for safe deletion operations
  - Enhanced error handling and progress reporting
  - Improved testability through modular design

#### Data Structure Enhancement Initiative
**Developer**: GitHub Copilot AI Assistant  
**Date**: October 21, 2025  
**Focus**: Type safety and data structure improvements

##### ExpectedWikiPage Interface Implementation:
- **Added**: Strongly-typed `ExpectedWikiPage` interface with `WikiPagePath` and `IsDirectory` properties
- **Enhanced**: `collectExpectedWikiPages()` to distinguish between files and directories
- **Improved**: `deleteOrphanedWikiPages()` to handle directory vs. file logic appropriately  
- **Upgraded**: Logging system to clearly indicate page types (Directory/File)
- **Converted**: Data structure from generic `Set<string>` to type-safe `ExpectedWikiPage[]`

#### Documentation & Developer Experience Enhancement
**Developer**: GitHub Copilot AI Assistant  
**Date**: October 22, 2025  
**Focus**: Code documentation and maintainability

##### Comprehensive JSDoc Documentation Project:
- **Coverage**: Added parameter documentation for all 14 methods (100% coverage)
- **Format**: Complete JSDoc annotations with `@param`, `@returns`, and descriptions
- **Scope**: Both public API methods and private helper methods fully documented
- **Benefits**: Enhanced IDE intellisense, improved onboarding, better maintainability
- **Quality**: Consistent formatting and detailed parameter explanations

#### Error Handling & Reliability Improvements
**Developer**: GitHub Copilot AI Assistant  
**Date**: October 21, 2025  
**Focus**: Error visibility and debugging capabilities

##### Main Function Error Handling Enhancement:
- **Added**: Comprehensive try-catch wrapper around `main()` function
- **Enhanced**: Console error logging with detailed error messages for debugging
- **Improved**: Error visibility during pipeline execution and local development
- **Addressed**: ECONNRESET and other network-related error scenarios

### Technical Debt Reduction Summary

#### Problems Addressed:
- **High Cyclomatic Complexity**: Monolithic functions were difficult to test and maintain
- **Mixed Responsibilities**: Functions handled multiple concerns in single methods
- **Limited Error Context**: Insufficient error information for troubleshooting
- **Inconsistent Data Structures**: Mixed use of Set vs Array types
- **Documentation Gap**: Missing parameter documentation hindered development

#### Solutions Implemented:
- **Maintainability**: Smaller, focused functions with clear single responsibilities
- **Testability**: Modular components enabling comprehensive unit testing
- **Readability**: Clear separation of concerns with well-documented interfaces
- **Reliability**: Enhanced error handling with detailed logging and recovery
- **Performance**: Optimized data structures with early returns and efficient algorithms
- **Developer Experience**: Complete documentation and improved debugging capabilities

### Performance Characteristics

#### Current Optimizations:
- **Early Returns**: Reduced unnecessary processing through guard clauses
- **Efficient Iterations**: Optimized loops and data structure access patterns
- **Memory Management**: Proper cleanup and resource management
- **Error Recovery**: Graceful handling without complete process failure

#### Scalability Considerations:
- **Large Repositories**: Tested with hundreds of markdown files and images
- **Deep Hierarchies**: Handles nested directory structures efficiently
- **Concurrent Operations**: Safe for parallel pipeline executions
- **Resource Usage**: Optimized memory footprint for Azure DevOps agents

### Error Handling Strategy

#### Network Resilience:
- **ECONNRESET Handling**: Graceful recovery from connection resets
- **Timeout Management**: Appropriate timeouts for API operations
- **Retry Logic**: Planned enhancement for transient failures

#### API Error Management:
- **404 Handling**: Automatic page creation for missing resources
- **Authentication Errors**: Clear messaging for token and permission issues
- **Rate Limiting**: Respectful API usage patterns

#### File System Robustness:
- **Missing Files**: Validation and clear error messages
- **Permission Issues**: Detailed troubleshooting information
- **Path Validation**: Safe handling of cross-platform path differences

## Support
For support, please visit mightora.io or open an issue on the GitHub repository.


