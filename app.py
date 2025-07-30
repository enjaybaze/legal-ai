import os
import uuid
import vertexai
from vertexai.generative_models import GenerativeModel, Part
from flask import Flask, render_template, request, Response, jsonify
from google.cloud import storage
from werkzeug.utils import secure_filename

# --- Configuration ---
GCP_PROJECT_ID = os.getenv("GCP_PROJECT_ID")
GCP_LOCATION = os.getenv("GCP_LOCATION")
GCS_BUCKET_NAME = os.getenv("GCS_BUCKET_NAME")
MODEL_NAME = "gemini-1.5-pro-preview-0409"
ALLOWED_EXTENSIONS = {'mp4', 'mov', 'avi', 'mp3', 'wav', 'flac', 'aac'}

# --- Client Initialization ---
storage_client = None
model = None

try:
    if GCS_BUCKET_NAME:
        storage_client = storage.Client(project=GCP_PROJECT_ID)
    else:
        print("GCS_BUCKET_NAME environment variable not set. File uploads will be disabled.")
except Exception as e:
    print(f"Error initializing Google Cloud Storage client: {e}")

try:
    if GCP_PROJECT_ID and GCP_LOCATION:
        vertexai.init(project=GCP_PROJECT_ID, location=GCP_LOCATION)
        model = GenerativeModel(MODEL_NAME)
        model.system_instruction = SYSTEM_PROMPT # Set system prompt once
    else:
        print("GCP_PROJECT_ID and/or GCP_LOCATION environment variables not set. AI chat will be disabled.")
except Exception as e:
    print(f"Error initializing Vertex AI: {e}")


# --- System Persona (truncated for brevity in code block) ---
SYSTEM_PROMPT = """
[START OF PERSONA AND DIRECTIVES PROMPT]
## 1. IDENTITY & CORE PURPOSE
You are Lexi, an advanced AI-powered Legal Navigator...
...
[END OF PERSONA AND DIRECTIVES PROMPT]
""" # The full prompt is loaded into the model during initialization

app = Flask(__name__)
app.config['UPLOAD_FOLDER'] = '/tmp/uploads' # A temporary folder for uploads

# Ensure the upload folder exists
os.makedirs(app.config['UPLOAD_FOLDER'], exist_ok=True)

def allowed_file(filename):
    return '.' in filename and \
           filename.rsplit('.', 1)[1].lower() in ALLOWED_EXTENSIONS

@app.route("/")
def index():
    return render_template("index.html")

@app.route("/upload", methods=["POST"])
def upload_file():
    if not storage_client or not GCS_BUCKET_NAME:
        return jsonify({"error": "File upload is not configured on the server."}), 500

    if 'file' not in request.files:
        return jsonify({"error": "No file part in the request"}), 400

    file = request.files['file']
    if file.filename == '':
        return jsonify({"error": "No selected file"}), 400

    if file and allowed_file(file.filename):
        filename = secure_filename(file.filename)
        # Create a unique filename to avoid collisions in GCS
        unique_filename = f"{uuid.uuid4()}-{filename}"

        try:
            bucket = storage_client.bucket(GCS_BUCKET_NAME)
            blob = bucket.blob(unique_filename)

            # Upload the file directly from the request stream
            blob.upload_from_file(file.stream, content_type=file.content_type)

            gcs_uri = f"gs://{GCS_BUCKET_NAME}/{unique_filename}"
            return jsonify({"gcs_uri": gcs_uri, "filename": filename})
        except Exception as e:
            print(f"Error uploading to GCS: {e}")
            return jsonify({"error": "Failed to upload file."}), 500

    return jsonify({"error": "File type not allowed"}), 400


@app.route("/chat", methods=["POST"])
def chat():
    if not model:
        return Response("Error: Vertex AI not initialized.", status=500, mimetype='text/plain')

    data = request.get_json()
    user_message_text = data.get("message")
    history_json = data.get("history", [])
    file_uri = data.get("file_uri")

    chat_session = model.start_chat(history=history_json)

    # Prepare the content for the model
    content = [user_message_text]
    if file_uri:
        # The SDK can determine the mime type from the GCS URI
        file_part = Part.from_uri(file_uri, mime_type=None)
        content.append(file_part)

    def generate():
        try:
            response = chat_session.send_message(content, stream=True)
            for chunk in response:
                if chunk.text:
                    yield chunk.text
        except Exception as e:
            print(f"Error during content generation: {e}")
            yield "Sorry, I encountered an error while generating a response."

    return Response(generate(), mimetype='text/plain')


if __name__ == "__main__":
    app.run(debug=True, port=8080, host='0.0.0.0')
