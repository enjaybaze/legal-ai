document.addEventListener('DOMContentLoaded', () => {
    const chatBox = document.getElementById('chat-box');
    const userInput = document.getElementById('user-input');
    const sendBtn = document.getElementById('send-btn');
    const micBtn = document.getElementById('mic-btn');
    const uploadBtn = document.getElementById('upload-btn');
    const fileInput = document.getElementById('file-input');

    let chatHistory = [];
    let currentFileUri = null;

    // --- Speech Recognition Setup ---
    const SpeechRecognition = window.SpeechRecognition || window.webkitSpeechRecognition;
    let recognition;
    let isRecording = false;

    if (SpeechRecognition) {
        recognition = new SpeechRecognition();
        recognition.continuous = true; // Keep listening even after a pause
        recognition.interimResults = true; // Get results as they are recognized

        recognition.onresult = (event) => {
            let interimTranscript = '';
            let finalTranscript = '';
            for (let i = event.resultIndex; i < event.results.length; ++i) {
                if (event.results[i].isFinal) {
                    finalTranscript += event.results[i][0].transcript;
                } else {
                    interimTranscript += event.results[i][0].transcript;
                }
            }
            // Append the final part to the input, and show the interim part greyed out
            userInput.value = userInput.value.replace(/#999/g, '') + finalTranscript;
        };

        recognition.onend = () => {
            isRecording = false;
            micBtn.classList.remove('recording');
        };

        recognition.onerror = (event) => {
            console.error('Speech recognition error:', event.error);
            alert(`Speech recognition error: ${event.error}`);
            isRecording = false;
            micBtn.classList.remove('recording');
        };

    } else {
        micBtn.disabled = true;
        alert('Speech recognition is not supported in this browser.');
    }


    // --- Event Listeners ---
    sendBtn.addEventListener('click', sendMessage);
    userInput.addEventListener('keydown', (e) => {
        if (e.key === 'Enter' && !e.shiftKey) {
            e.preventDefault();
            sendMessage();
        }
    });

    micBtn.addEventListener('click', () => {
        if (!SpeechRecognition) return;

        if (isRecording) {
            recognition.stop();
        } else {
            recognition.start();
            isRecording = true;
            micBtn.classList.add('recording');
        }
    });

    uploadBtn.addEventListener('click', () => fileInput.click());
    fileInput.addEventListener('change', (e) => {
        const file = e.target.files[0];
        if (file) {
            uploadFile(file);
        }
    });

    // --- Core Functions ---
    async function uploadFile(file) {
        const formData = new FormData();
        formData.append('file', file);
        const uploadMessage = appendMessage(`Uploading "${file.name}"...`, 'system');
        try {
            const response = await fetch('/upload', { method: 'POST', body: formData });
            const data = await response.json();
            if (!response.ok) throw new Error(data.error || 'File upload failed.');
            uploadMessage.querySelector('p').innerText = `File "${data.filename}" uploaded. You can now ask questions about it.`;
            currentFileUri = data.gcs_uri;
        } catch (error) {
            console.error('Error uploading file:', error);
            uploadMessage.querySelector('p').innerText = `Error: ${error.message}`;
            uploadMessage.classList.add('error-message');
        }
    }

    async function sendMessage() {
        const messageText = userInput.value.trim();
        if (messageText === '') return;

        appendMessage(messageText, 'user');
        chatHistory.push({ role: 'user', parts: [{ text: messageText }] });

        userInput.value = '';
        userInput.style.height = '26px';

        const botMessageElement = appendMessage('', 'bot');
        const botParagraph = botMessageElement.querySelector('p');

        const requestBody = {
            message: messageText,
            history: chatHistory.slice(0, -1),
            file_uri: currentFileUri
        };
        currentFileUri = null;

        try {
            const response = await fetch('/chat', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify(requestBody),
            });
            if (!response.ok) throw new Error(`HTTP error! status: ${response.status}`);

            const reader = response.body.getReader();
            const decoder = new TextDecoder();
            let botResponseText = '';
            while (true) {
                const { value, done } = await reader.read();
                if (done) break;
                botResponseText += decoder.decode(value, { stream: true });
                // Use marked.parse to render markdown in real-time
                botParagraph.innerHTML = marked.parse(botResponseText);
                chatBox.scrollTop = chatBox.scrollHeight;
            }
            chatHistory.push({ role: 'model', parts: [{ text: botResponseText }] });
        } catch (error) {
            console.error('Error sending message:', error);
            botParagraph.innerText = 'Sorry, I encountered an error. Please try again.';
        }
    }

    function appendMessage(text, sender) {
        const messageElement = document.createElement('div');
        messageElement.classList.add('chat-message', `${sender}-message`);
        const p = document.createElement('p');
        p.innerText = text;
        messageElement.appendChild(p);
        chatBox.appendChild(messageElement);
        chatBox.scrollTop = chatBox.scrollHeight;
        return messageElement;
    }

    userInput.addEventListener('input', () => {
        userInput.style.height = 'auto';
        const scrollHeight = userInput.scrollHeight;
        const maxHeight = 120;
        if (scrollHeight > maxHeight) {
            userInput.style.height = `${maxHeight}px`;
            userInput.style.overflowY = 'auto';
        } else {
            userInput.style.height = `${scrollHeight}px`;
            userInput.style.overflowY = 'hidden';
        }
    });
});
