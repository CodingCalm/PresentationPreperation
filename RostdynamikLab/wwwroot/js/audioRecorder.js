// Ljudinspelning via MediaRecorder, anropas från Blazor via JS interop.
window.audioRecorder = (function () {
    let mediaRecorder = null;
    let audioChunks = [];
    let dotNetRef = null;
    // Uppspelnings-URL:en pekar på ljudet i webbläsarens minne (blob:), så att
    // uppspelning fungerar utan att ljudet behöver skickas tillbaka från servern.
    let playbackUrl = null;

    function revokePlaybackUrl() {
        if (playbackUrl) {
            URL.revokeObjectURL(playbackUrl);
            playbackUrl = null;
        }
    }

    async function start(dotNetReference) {
        dotNetRef = dotNetReference;

        if (!navigator.mediaDevices || !navigator.mediaDevices.getUserMedia) {
            return { ok: false, error: "Ljudinspelning stöds inte av din webbläsare." };
        }

        try {
            const stream = await navigator.mediaDevices.getUserMedia({ audio: true });
            mediaRecorder = new MediaRecorder(stream);
            audioChunks = [];

            mediaRecorder.ondataavailable = (event) => {
                audioChunks.push(event.data);
            };

            mediaRecorder.onstop = async () => {
                const audioBlob = new Blob(audioChunks, { type: "audio/webm" });
                stream.getTracks().forEach((track) => track.stop());

                revokePlaybackUrl();
                playbackUrl = URL.createObjectURL(audioBlob);

                const base64 = await blobToBase64(audioBlob);
                const mimeType = audioBlob.type.split(";")[0];

                if (dotNetRef) {
                    await dotNetRef.invokeMethodAsync("OnRecordingComplete", base64, mimeType, playbackUrl);
                }
            };

            mediaRecorder.start();
            return { ok: true, error: null };
        } catch (err) {
            console.error("Fel vid åtkomst till mikrofon:", err);
            return { ok: false, error: "Mikrofonåtkomst nekad eller ej tillgänglig. Kontrollera behörigheter." };
        }
    }

    function stop() {
        if (mediaRecorder && mediaRecorder.state !== "inactive") {
            mediaRecorder.stop();
        }
    }

    function reset() {
        if (mediaRecorder) {
            if (mediaRecorder.stream) {
                mediaRecorder.stream.getTracks().forEach((track) => track.stop());
            }
            if (mediaRecorder.state !== "inactive") {
                // Koppla bort callbacken så att onstop inte skickar ljudet till .NET
                dotNetRef = null;
                mediaRecorder.stop();
            }
        }
        mediaRecorder = null;
        audioChunks = [];
        revokePlaybackUrl();
    }

    function blobToBase64(blob) {
        return new Promise((resolve, reject) => {
            const reader = new FileReader();
            reader.onloadend = () => {
                if (typeof reader.result === "string") {
                    const parts = reader.result.split(",");
                    resolve(parts.length > 1 ? parts[1] : "");
                } else {
                    reject(new Error("Misslyckades med att läsa blob som base64-sträng."));
                }
            };
            reader.onerror = (error) => {
                console.error("FileReader error:", error);
                reject(new Error("FileReader stötte på ett fel."));
            };
            reader.readAsDataURL(blob);
        });
    }

    function scrollToBottom(element) {
        if (element) {
            element.scrollTop = element.scrollHeight;
        }
    }

    return { start, stop, reset, scrollToBottom };
})();
