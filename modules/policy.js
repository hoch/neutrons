export class Policy {
    static newAudioContext() {
        const context = new AudioContext();
        if (context.state === "suspended") {
            const div = document.createElement("div");
            const ondown = ignore => {
                context.resume().then(_ => {
                    div.remove();
                    window.removeEventListener("mousedown", ondown);
                });
            };
            const onload = ignore => {
                div.className = "policy";
                div.textContent =
                    "Playback has been disabled by your browser. " +
                    "Please click anywhere to resume.";
                document.body.appendChild(div);
                window.removeEventListener("load", onload);
                window.addEventListener("mousedown", ondown);
            };
            window.addEventListener("load", onload);
        }
        return context;
    }

    static waitForUserInteraction(message) {
        return new Promise((resolve, ignore) => {
            const div = document.createElement("div");
            const ondown = ignore => {
                resolve();
                div.remove();
                window.removeEventListener("mousedown", ondown);
            };
            const onload = ignore => {
                div.className = "policy";
                div.textContent = message;
                document.body.appendChild(div);
                window.removeEventListener("load", onload);
                window.addEventListener("mousedown", ondown);
            };
            window.addEventListener("load", onload);
        });
    }
}