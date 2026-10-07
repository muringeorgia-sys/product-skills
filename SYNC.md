# Scheduled skills and agents upload

User skills from global Claude, Codex and .agents directories and the Mashina.kg project are uploaded every Wednesday at 12:05 Asia/Almaty. Supporting files and agents inside skill folders are included. Standalone agents directories are included when present.

Global skills keep the existing root layout. Project skills are in `projects/mashina-kg/skills`. Different versions are in `variants`. Identical bundles and junction aliases are deduplicated. `SKILLS_MANIFEST.json` maps each uploaded bundle to its source.

The upload adds and updates files; it does not delete repository files or modify installed skills. Dependencies, Git metadata, bundled system/plugin skills and credential files are excluded. The local BB server and computer must be running for the scheduled task.
