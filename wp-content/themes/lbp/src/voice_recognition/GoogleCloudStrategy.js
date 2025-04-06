class GoogleCloudStrategy {
  #lang;
  #endpointUrl; // URL WebSocket‑сервера (Node.js‑прокси), который обрабатывает аудио через Google Cloud
  #socket = null;
  #mediaRecorder = null;
  #waitLastResult = false;
  isListening = false;

  /**
   * @param {string} lang - язык распознавания (например, 'en-US', 'lv-LV', 'ru-RU')
   * @param {string} endpointUrl - URL WebSocket‑сервера, например: "wss://yourdomain.com/recognize"
   */
  constructor(lang, endpointUrl) {
    this.#lang = lang;
    this.#endpointUrl = endpointUrl;
  }

  /**
   * Запускает потоковое распознавание:
   * - Запрашивает доступ к микрофону,
   * - Создаёт MediaRecorder, который каждые 250 мс отправляет аудиочанки на сервер,
   * - Результаты распознавания, полученные по WebSocket, передаются через callback.
   * @param {Function} callback - Функция, вызываемая с распознанным текстом.
   */
  start(callback) {
    if (this.isListening) {
      console.warn("Распознавание уже запущено.");
      return;
    }
    this.isListening = true;

    navigator.mediaDevices.getUserMedia({ audio: true })
      .then(stream => {
        // Создаем MediaRecorder для записи аудио в формате 'audio/webm'
        this.#mediaRecorder = new MediaRecorder(stream, { mimeType: 'audio/webm' });

        // Открываем WebSocket-соединение с сервером
        this.#socket = new WebSocket(this.#endpointUrl);

        this.#socket.onopen = () => {
          console.log("WebSocket соединение открыто.");
          // Запускаем запись: каждые 250 мс отправляем аудиочанки
          this.#mediaRecorder.start(250);
        };

        this.#socket.onmessage = (event) => {
          //console.log('onmessage', event);
          // Результаты распознавания приходят от сервера (как итоговые или interim)
          const { finalTranscript, interimTranscript } = JSON.parse(event.data);
          if (callback && typeof callback === "function") {
            callback(finalTranscript + interimTranscript);
          }

          if(this.#waitLastResult && ( ! interimTranscript )) {
            if (this.#socket && this.#socket.readyState === WebSocket.OPEN) {
              this.#socket.close();
            }
            this.#waitLastResult = false;
            this.isListening = false;
            stream.getTracks().forEach(track => track.stop());
          }
        };

        this.#socket.onerror = (error) => {
          console.error("WebSocket ошибка:", error);
        };

        this.#socket.onclose = () => {
          console.log("WebSocket соединение закрыто.");
          this.#waitLastResult = false;
          this.isListening = false;
        };

        this.#mediaRecorder.ondataavailable = (event) => {
          console.log('ondataavailable');
          if (event.data.size > 0 && this.#socket.readyState === WebSocket.OPEN) {
            this.#socket.send(event.data);
          }
        };

        this.#mediaRecorder.onstop = () => {
          console.log("MediaRecorder остановлен.");
          if (this.#waitLastResult === false) {
            this.#waitLastResult = true;
            //console.log('send STOP');
            this.#socket.send("STOP", { binary: false });
          }
        };
      })
      .catch(error => {
        console.error("Ошибка доступа к микрофону:", error);
        this.#waitLastResult = false;
        this.isListening = false;
      });
  }

  /**
   * Останавливает распознавание: останавливает MediaRecorder и закрывает WebSocket.
   */
  stop() {
    if (this.#mediaRecorder && this.isListening) {
      this.#mediaRecorder.stop();
    }
    if (this.#socket && this.#socket.readyState === WebSocket.OPEN) {
      this.#socket.close();
    }
    this.#waitLastResult = false;
    this.isListening = false;
  }

  stopAndWaitingFinal() {
    if (this.#mediaRecorder && this.isListening) {
      this.#mediaRecorder.stop();
    }
  }
}

export { GoogleCloudStrategy };
