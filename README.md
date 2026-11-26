```markdown
# Auto E-Mail Loker
### AI-Powered Job Application Assistant for Legal Professionals

A Google Apps Script-based web application designed to parse job postings, generate tailored application emails and PDF cover letters using AI, and automate email delivery workflows.

## Overview & Target Audience

This project is specifically tailored for **law graduates** who have completed the **Advocate Profession Special Education (PKPA)** and/or passed the **Advocate Profession Examination (UPA)**. 

Because the system automates outbound professional communications to recruiters and law firms, users are expected to maintain high standards of quality, accuracy, and professional responsibility when reviewing AI-generated drafts before dispatch.

## Key Features

- **Multimodal Job Parsing:** Extracts key details (company name, HR email, CC, position, category, and requirements) from pasted job descriptions or uploaded/pasted screenshots (`Ctrl + V`).
- **Automated Email & Cover Letter Drafting:** Generates tailored application email bodies and structured 5-paragraph cover letters (available in Indonesian and English) aligned with legal and operational experience.
- **Custom HTML Email Templating:** Formats outbound emails using a dedicated, clean HTML email layout (`EmailTemplate.html`) for consistent rendering across desktop and mobile mail clients.
- **Dynamic PDF Cover Letter Generator:** Populates a Google Docs template and exports it directly into a ready-to-attach PDF file stored in Google Drive.
- **Google Forms Detection & Helper:** Automatically identifies job postings requiring Google Forms submissions, flags missing custom document requirements, and generates ready-to-copy form responses.
- **Multi-Key API Rotation & Fallback:** Built-in Gemini API key rotation and model fallback mechanism to handle rate limits (`HTTP 429`) and transient server errors gracefully.
- **Google Sheets Queue & Scheduled Dispatch:** Logs parsed job entries into an `Email Queue` spreadsheet with customizable attachment toggles (CV, Cover Letter PDF, Diploma, Transcript, PKPA/UPA Certificate, and custom extra files) for scheduled or manual Gmail dispatch.

## Tech Stack

- **Backend:** Google Apps Script (JavaScript)
- **Frontend:** HTML5, CSS3, Vanilla JavaScript, HTML5 Canvas, Web Audio API
- **AI Engine:** Google Gemini API (`generateContent` with Structured JSON Output)
- **Workspace Integrations:** Google Sheets, Google Docs, Google Drive, Gmail

## Project Structure

```text
Auto-E-Mail-Loker/
├── Code.gs             # Backend logic, Gemini API integration, PDF generator, and Gmail dispatcher
├── Index.html          # Interactive Web App UI with clipboard image paste and real-time feedback
├── EmailTemplate.html  # Responsive HTML email layout template for outbound applications
└── README.md           # Project documentation

```

## Configuration

Store all API keys, Google Drive file/folder IDs, and sensitive parameters inside **Google Apps Script Properties** (`Project Settings > Script Properties`) rather than hardcoding them in `Code.gs`.

### Required Script Properties

| Property Key | Description |
| --- | --- |
| `GEMINI_KEYS` | Comma-separated list of Google Gemini API keys for automatic rotation. |
| `GEMINI_MODEL` | Primary Gemini model identifier (e.g., `gemini-2.0-flash`). |
| `FOLDER_TAMBAHAN_ID` | Google Drive folder ID for storing generated cover letters and extra attachments. |
| `ID_TEMPLATE_DOCS` | Google Docs template file ID containing `{{PLACEHOLDER}}` tags for cover letters. |
| `ID_CV` | Google Drive file ID of your Curriculum Vitae (PDF). |
| `ID_IJAZAH` | Google Drive file ID of your Bachelor of Laws (S.H.) diploma. |
| `ID_TRANSKRIP` | Google Drive file ID of your academic transcript. |
| `ID_PKPA_UPA` | Google Drive file ID of your PKPA & UPA certificates. |

## Setup & Deployment

1. **Create Apps Script Project:** Open [Google Apps Script](https://script.google.com/) (or open **Extensions > Apps Script** from your target Google Sheet) and create a new project.
2. **Add Source Files:** Copy the contents of `Code.gs`, `Index.html`, and `EmailTemplate.html` into their respective files in the Apps Script editor.
3. **Prepare Drive Assets:** Upload your application documents (CV, Diploma, Transcript, PKPA/UPA certificates) and create a Google Docs cover letter template in Google Drive.
4. **Configure Script Properties:** Navigate to **Project Settings > Script Properties** and add all required keys listed in the Configuration table above.
5. **Customize Candidate Profile:** Update the `PROFIL_PELAMAR` and `SYSTEM_INSTRUCTION` constants in `Code.gs` to reflect your personal credentials and contact details.
6. **Authorize Permissions:** Run a test function in the editor to grant the required OAuth permissions for Gmail, Google Drive, Google Docs, Google Sheets, and external URL fetch requests.
7. **Deploy as Web App:** Click **Deploy > New deployment**, select **Web app**, set access permissions appropriately (e.g., *Only myself*), and open the generated Web App URL.
8. **Optional Automation Trigger:** Set up a time-driven trigger in Apps Script for `kirimEmailOtomatis` (e.g., daily between 10:00 AM – 11:00 AM) to automate queued email delivery.

## Security Notes

* **Never commit API keys or File IDs:** Always sanitize sensitive credentials before pushing code to a public repository.
* **Protect Personal Information:** Keep personal phone numbers, email addresses, and private documents out of public source files.
* **Restrict Web App Access:** Ensure the deployed Web App is restricted to your own Google account so unauthorized users cannot trigger emails or consume your API quota.

## Disclaimer

This tool is built to streamline and assist with job application workflows. AI-generated outputs may occasionally contain inaccuracies or formatting anomalies and **must be reviewed before sending**. Users bear full professional responsibility for verifying job postings, ensuring the accuracy of their legal credentials, and confirming recipient details prior to dispatching any application.

## Status

Active personal project under continuous development.

## Author

**Alfin Fadhli, S.H.**

```

```
