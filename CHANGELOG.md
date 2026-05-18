# Changelog

All notable changes to the "Prism - PR Safety Mentor" extension will be documented in this file.

The format is based on [Keep a Changelog](https://keepachangelog.com/en/1.0.0/),
and this project adheres to [Semantic Versioning](https://semver.org/spec/v2.0.0.html).

## [0.1.0] - 2024-12-20

### Added
- Initial release of Prism PR Safety Mentor
- Smart PR analysis with git diff comparison
- File categorization (Frontend, Tests, CI/CD, Config, Documentation)
- Risk detection system:
  - Secrets detection (API keys, tokens, credentials)
  - Missing test coverage warnings
  - CI/CD pipeline change alerts
  - Large PR detection (15+ files)
  - Environment file protection
- Protected branch rescue feature
- Dynamic pre-push checklist generation
- Pre-flight CI/CD command detection and execution
  - GitHub Actions support
  - CircleCI support
  - GitLab CI support
- Optional AI-powered explanations via Ollama
- Sidebar panel with interactive UI
- Copy summary to clipboard feature
- Configurable settings:
  - Default target branch
  - Protected branches list
  - Ollama model selection

### Features
- 100% local processing (no data sent to external servers)
- No telemetry or data collection
- Works with any git repository
- Supports multiple CI/CD providers
- Theme-aware UI using VS Code color variables

## [Unreleased]

### Planned
- Support for more CI/CD providers (Jenkins, Travis CI)
- Configurable risk thresholds
- Custom rule definitions
- PR template suggestions
- Historical PR metrics
- Team-wide shared configurations
