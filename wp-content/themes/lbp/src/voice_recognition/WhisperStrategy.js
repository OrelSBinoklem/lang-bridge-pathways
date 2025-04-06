import { MicVAD } from '@ricky0123/vad-web';

class WhisperStrategy {
  #lang;
  #openaiApiKey;
  #mediaRecorder = null;
  #vadInstance = null;

  #audioChunks = [];
  #silenceDuration = 2000;
  #silenceStartTime = null;
  #silenceCount = 0;
  #maxAttempts = 3;

  isListening = false;
  #isSending = false;

  constructor(lang = 'en', openaiApiKey) {
    this.#lang = lang;
    this.#openaiApiKey = openaiApiKey;
  }

  init() {
    console.log('WhisperStrategy initialized.');
  }

  async start(callback) {
    if (this.isListening) {
      console.warn('Уже запущено');
      return;
    }
    this.isListening = true;
    this.#silenceCount = 0;

    let stream;
    try {
      stream = await navigator.mediaDevices.getUserMedia({ audio: true });
    } catch (error) {
      console.error('Не удалось получить доступ к микрофону:', error);
      this.isListening = false;
      return;
    }

    this.#audioChunks = [];
    this.#mediaRecorder = new MediaRecorder(stream);

    this.#mediaRecorder.ondataavailable = (e) => {
      if (e.data.size > 0) {
        this.#audioChunks.push(e.data);
      }
    };

    this.#mediaRecorder.start(100);

    this.#vadInstance = await MicVAD.new({
      onSpeechStart: () => {
        this.#silenceStartTime = null;
        console.log('VAD: Voice start');
      },
      onSpeechEnd: () => {
        console.log('VAD: Voice stop');

        this.#isSending = true;
        this.#silenceCount += 1;
        console.log(`Тишина #${this.#silenceCount}`);

        // Отправляем все накопленные данные
        this.sendAllAudio(callback).then(() => {
          this.#isSending = false;

          // Проверяем количество попыток
          if (this.#silenceCount >= this.#maxAttempts) {
            console.log('Достигнуто максимальное количество попыток. Останавливаем.');
            this.stop();
          }
        });

        if (!this.#silenceStartTime) {
          this.#silenceStartTime = Date.now();
        }
      },
      onFrameProcessed: (probabilities) => {
        const isVoice = probabilities.isSpeech > 0.5;

        if (!isVoice) {
          //console.log(this.#silenceStartTime, Date.now() - this.#silenceStartTime, this.#silenceDuration);
          if (
            this.#silenceStartTime &&
            Date.now() - this.#silenceStartTime > this.#silenceDuration
          ) {
            if (this.#isSending) {
              this.stop();
            } else {
              this.#isSending = true;
              this.sendAllAudio(callback).then(() => {
                this.#isSending = false;

                // Проверяем количество попыток
                if (this.#silenceCount >= this.#maxAttempts) {
                  console.log('Достигнуто максимальное количество попыток. Останавливаем.');
                  this.stop();
                }
              });
            }
          }
        }
      },
    });

    this.#vadInstance.start();
    console.log('WhisperStrategy started recording + VAD');
  }

  stop() {
    if (!this.isListening) return;

    if (this.#vadInstance) {
      this.#vadInstance.pause();
      this.#vadInstance = null;
    }
    if (this.#mediaRecorder && this.#mediaRecorder.state === 'recording') {
      this.#mediaRecorder.stop();
    }

    // Останавливаем все треки в потоке
    if (this.#mediaRecorder && this.#mediaRecorder.stream) {
      const tracks = this.#mediaRecorder.stream.getTracks();
      tracks.forEach(track => track.stop());
    }

    console.log('WhisperStrategy: manual stop called.');
    this.isListening = false;
  }

  stopAndWaitingFinal() {
    this.stop();
  }

  /**
   * Отправляет накопленные аудиоданные в Whisper API OpenAI.
   */
  async sendAllAudio(callback) {
    console.log('sendAllAudio');
    if (this.#audioChunks.length === 0) return;

    const blob = new Blob(this.#audioChunks, { type: 'audio/wav' });

    try {
      const recognizedText = await this.sendToWhisper(blob);
      if (callback && typeof callback === 'function') {
        callback(recognizedText);
      }
    } catch (err) {
      console.error('Ошибка отправки в OpenAI Whisper:', err);
      if (callback && typeof callback === 'function') {
        callback('');
      }
    }
  }

  /**
   * Отправляет аудиофайл напрямую в OpenAI Whisper API.
   */
  async sendToWhisper(audioBlob) {
    const formData = new FormData();
    formData.append('file', audioBlob, 'audio.wav');
    formData.append('model', 'whisper-1');
    formData.append('language', this.#lang);

    const response = await fetch('https://api.openai.com/v1/audio/transcriptions', {
      method: 'POST',
      headers: {
        Authorization: `Bearer ${this.#openaiApiKey}`,
      },
      body: formData,
    });

    console.log('OpenAI Whisper response:', response);

    if (!response.ok) {
      throw new Error(`OpenAI error: ${response.statusText}`);
    }

    const data = await response.json();
    return data.text || '';
  }
}

export { WhisperStrategy };
