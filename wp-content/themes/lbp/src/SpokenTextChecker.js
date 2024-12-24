require('./voice_recognition/GoogleStrategy');
require('./voice_recognition/WhisperStrategy');
import { diffChars } from 'diff';

class SpokenTextChecker {
  #text;
  #lang;
  #strategy;
  #progressCallback;
  constructor(text, lang, strategy, progressCallback) {
    this.#text = text;
    this.#lang = lang;
    this.#strategy = strategy === 'google' ? new GoogleStrategy(lang) : new WhisperStrategy(lang);
    this.#progressCallback = progressCallback;
  }

  async checkRun() {
    return await new Promise((resolve) => {
      this.#strategy.start((recognizedText) => {
        this.#progressCallback(recognizedText);

        let isCompleted = this.compareWithThreshold(recognizedText, this.#text);

        if(isCompleted) {
          this.#strategy.stop();
          resolve(true);
        }

        if (recognizedText.length > this.#text.length * 2) {
          this.#strategy.stop();
          resolve(false);
        }
      });
    });


  }

  compareWithThreshold(recognizedText, referenceText, threshold = 0.8) {
    const diffs = diffChars(referenceText, recognizedText);
    let totalLength = referenceText.length;
    let changes = 0;

    // Подсчет изменений (вставки, удаления, замены)
    diffs.forEach(part => {
      if (part.added || part.removed) {
        changes += part.value.length; // Количество измененных символов
      }
    });

    // Вычисляем процент изменений
    const similarity = 1 - (changes / totalLength);

    // Проверка, превышает ли процент схожести порог
    return similarity >= threshold;
  }
}