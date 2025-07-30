# Legal AI - Lexi

This is a Python web application that serves as a wrapper for the Gemini 1.5 Pro model, acting as an AI-powered legal navigator named Lexi.

The application provides a sleek, modern UI for users to interact with the AI via text, speech, or by uploading audio/video files for analysis.

## Features

-   **Text Chat:** Real-time, streaming chat with the Gemini model.
-   **File Analysis:** Upload audio and video files to be analyzed by the AI.
-   **Speech-to-Text:** Use your microphone to ask questions.
-   **Configurable:** Easily set your Google Cloud Project, Location, and GCS Bucket via an `.env` file.
-   **Custom Persona:** The AI operates under a specific "Lexi" persona designed to be a helpful legal navigator.

## How to Run and Test

### 1. Set Up Your Environment

First, you'll need to configure your local environment to connect to your Google Cloud account.

*   **Create a Virtual Environment (Recommended):**
    ```bash
    python -m venv venv
    source venv/bin/activate  # On Windows, use `venv\Scripts\activate`
    ```

*   **Install Dependencies:**
    Open your terminal in the project directory and run the following command to install the necessary Python libraries:
    ```bash
    pip install -r requirements.txt
    ```

*   **Create `.env` file:**
    Create a new file named `.env` in the root of the project. Copy the contents of `.env.example` into it and fill in the values with your actual Google Cloud project information:
    ```
    GCP_PROJECT_ID="your-actual-project-id"
    GCP_LOCATION="us-central1"  # Or your preferred location
    GCS_BUCKET_NAME="your-unique-bucket-name"
    ```

*   **Google Cloud Authentication:**
    Make sure your local environment is authenticated with Google Cloud. The simplest way is to install the gCloud CLI and run:
    ```bash
    gcloud auth application-default login
    ```

### 2. Run the Application

Once your environment is set up, run the application with this command:

```bash
python app.py
```

You should see output indicating that the server is running on port 8080. You can access the web application by opening `http://127.0.0.1:8080` in your web browser.

### 3. What to Test

Please test the following features:

1.  **Text Chat:** Type a legal or general question and check if you receive a streamed response from Lexi.
2.  **File Upload:** Click the paperclip icon, upload a sample audio or video file, and then ask a question about it (e.g., "Summarize this video").
3.  **Speech-to-Text:** Click the microphone icon (you may need to grant browser permissions) and speak a question. Click it again to stop, and verify if your speech was correctly transcribed into the text box.
4.  **UI and Formatting:** Ensure the UI looks correct and that the AI's responses are properly formatted with Markdown (e.g., bold text, bullet points).
