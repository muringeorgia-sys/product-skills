---
name: tailored-resume-generator
description: Analyze a specific job description and candidate resume or background to create a truthful, ATS-friendly tailored resume, plus gap notes and application recommendations. Use when the user asks to customize, optimize, rewrite, or generate a resume or CV for a job posting, career transition, specific industry, or role-specific application.
---

# Tailored Resume Generator

## Core Rule

Use only information provided by the user in the job description, current resume, or background notes. Do not invent employers, dates, credentials, metrics, links, responsibilities, tools, certifications, awards, or business impact. If relevant information is missing, ask for it or label the gap explicitly.

## Required Inputs

Collect these inputs before producing a final tailored resume:

- Full job description or role requirements.
- Candidate background or current resume.
- Optional company name, job title, target format, page limit, tone, and constraints.

If the user provides only partial information, state the limitation and draft only from the provided material.

## Workflow

1. Extract job priorities:
   - Must-have qualifications: required skills, experience, education, certifications, or domain knowledge.
   - Important qualifications: strongly desired tools, methods, responsibilities, and soft skills.
   - Nice-to-have qualifications: bonus skills, industry preferences, and differentiators.
   - ATS keywords: repeated or prominent terms from the job description.

2. Map the candidate to the role:
   - Match each priority to evidence in the candidate's resume or background.
   - Identify transferable experience when direct experience is absent.
   - Mark gaps that should be addressed carefully or de-emphasized.
   - Select the strongest truthful proof points for the target role.

3. Draft the tailored resume:
   - Use Markdown by default unless the user requests another format.
   - Use standard headings such as Professional Summary, Skills, Professional Experience, Education, Certifications, and Projects.
   - Keep formatting clean and ATS-friendly: no tables, graphics, headers, footers, or complex layout unless specifically requested.
   - Use reverse chronological order when dates and roles are available.

4. Optimize each section:
   - Professional Summary: write 3-4 concise lines focused on the target role, truthful years of experience, strongest relevant skills, and differentiating experience.
   - Skills: group skills by category, list required tools and methods first, and include only skills supported by the user's materials.
   - Experience: reorder bullets within each role to prioritize the most relevant work. Use the pattern: action verb + what was done + how or why + result or impact.
   - Metrics: include numbers, percentages, timeframes, scale, or outcomes only when the user provided them.
   - Education and credentials: include degrees, certifications, coursework, or awards only when provided and relevant.

5. Add strategic notes after the resume when useful:
   - Strengths that make the candidate competitive.
   - Gaps or requirements not clearly supported by the materials.
   - Specific recommendations for improving the resume, cover letter, or interview preparation.
   - Optional cover letter hooks or interview talking points, clearly separated from the resume.

## Special Cases

- Career changers: emphasize transferable skills and use a hybrid structure when it makes the fit clearer.
- Recent graduates: lead with education, coursework, internships, projects, and student leadership when those details are provided.
- Senior candidates: emphasize leadership scope, strategic impact, team scale, revenue, cost, operational, or organizational outcomes only when provided.
- Technical roles: include tools, languages, frameworks, platforms, methodologies, GitHub, portfolio links, and projects only when supported by the materials.
- Creative roles: mention portfolio links, campaigns, tools, and creative outcomes only when provided.

## Final Check

Before delivering the result, verify:

- No unsupported facts, metrics, dates, titles, or claims were added.
- Job-description keywords are used naturally and truthfully.
- Gaps are not hidden or overstated.
- The resume is concise, scannable, and aligned to the target role.
