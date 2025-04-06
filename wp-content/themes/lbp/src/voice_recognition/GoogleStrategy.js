class GoogleStrategy {
  #lang;
  constructor(lang) {
    this.#lang = lang;
    this.recognition = null;
    this.isListening = false;
    this.init();
  }

  init() {
    const SpeechRecognition = window.SpeechRecognition || window.webkitSpeechRecognition;

    if (!SpeechRecognition) {
      console.warn('Web Speech API не поддерживается в этом браузере.');
      return;
    }

    this.recognition = new SpeechRecognition();
    this.recognition.lang = this.#lang;
    this.recognition.interimResults = true; // Отображать промежуточные результаты
    this.recognition.continuous = true; // Останавливать после завершения одной фразы

    this.recognition.onstart = () => {
      console.log('Speech recognition started.');
      this.isListening = true;
    };

    this.recognition.onend = () => {
      console.log('Speech recognition stopped.');
      this.isListening = false;
    };

    this.recognition.onerror = (event) => {
      console.error('Speech recognition error:', event.error);
      this.isListening = false;
    };
  }

  start(callback) {
    if (!this.recognition) {
      console.error('Speech recognition is not supported or not initialized.');
      return;
    }

    let finalTranscript = '';
    let interimTranscript = '';

    this.recognition.onresult = (event) => {
      for (let i = event.resultIndex; i < event.results.length; ++i) {
        const transcript = event.results[i][0].transcript;
        if (event.results[i].isFinal) {
          finalTranscript += transcript;
          interimTranscript = '';
        } else {
          interimTranscript = transcript;
        }
      }

      if (callback && typeof callback === 'function') {
        callback(finalTranscript + interimTranscript);
      }
    };

    if (!this.isListening) {
      this.recognition.start();
    }
  }

  stop() {
    if (this.recognition && this.isListening) {
      this.recognition.stop();
    }
  }

  stopAndWaitingFinal() {
    this.stop();
  }
}

export {GoogleStrategy};