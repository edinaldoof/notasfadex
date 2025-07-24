# Notas Fadex

**Notas Fadex** is a web application designed to streamline the management of fiscal notes for the Fadex organization. It provides a secure and centralized platform for employees to upload, track, and manage fiscal notes throughout their lifecycle.

## Core Features

-   **Secure Authentication**: Users log in with their Google account, restricted to the `@fadex.org.br` domain, ensuring that only authorized personnel can access the system.

-   **Centralized Dashboard**: A clean and interactive dashboard displays all fiscal notes in a sortable and filterable table. Users can quickly find notes by description, requester, issue date, validity, or status.

-   **Add New Notes**: An intuitive modal form allows users to easily add new fiscal notes. This includes fields for a description, requester, issue/validity dates, and the note's file (PDF, XML, or JPG).

-   **Automated Status Management**: The system is built to automate the status of each note:
    -   **Pendente (Pending)**: A newly submitted note that is awaiting processing.
    -   **Ativa (Active)**: A note that has been processed and is currently valid.
    -   **Expirada (Expired)**: A note whose validity period has passed.

-   **File Integration**: The application handles file uploads to Firebase Storage, with future plans for integration with Google Drive for permanent storage and easy access.

## Tech Stack

-   **Framework**: Next.js (with App Router)
-   **Language**: TypeScript
-   **UI**: React, ShadCN UI, Tailwind CSS
-   **Backend & Database**: Firebase (Authentication, Firestore, Storage)
-   **AI Features**: Genkit

This project was bootstrapped with [Firebase Studio](https://firebase.google.com/studio).