const {GoogleStrategy} = require('./voice_recognition/GoogleStrategy');
const {WhisperStrategy} = require('./voice_recognition/WhisperStrategy');
const {GoogleCloudStrategy} = require('./voice_recognition/GoogleCloudStrategy');
import { diffChars } from 'diff';

const maxLenRecognitionQuantity = 3;

class SpokenTextChecker {
  #text;
  #lang;
  #strategy;
  #progressCallback;
  constructor(text, lang, strategy, openaiApiKey, progressCallback) {
    const socketUrl = 'ws://localhost:3000';

    this.#text = text;
    this.#lang = lang;
    this.#strategy = strategy === 'google' ? new GoogleStrategy(lang) : strategy === 'google-cloud' ? new GoogleCloudStrategy(lang, socketUrl) : new WhisperStrategy(lang, openaiApiKey);
    this.#progressCallback = progressCallback;
  }

  async checkRun() {
    return await new Promise((resolve) => {
      this.#strategy.start((recognizedText) => {
        this.#progressCallback(recognizedText);

        let isCompleted = this.compareWithThreshold(recognizedText, this.#text, 0.8, true);

        if(isCompleted) {
          this.#strategy.stop();
          resolve(true);
        }

        if (recognizedText.length > this.#text.length * maxLenRecognitionQuantity) {
          this.#strategy.stopAndWaitingFinal();
          resolve(false);
        }
      });
    });


  }

  longestCommonSubsequence(a, b) {
    // Удаляем пробелы из строк
    const cleanA = a.replace(/\s/g, '');
    const cleanB = b.replace(/\s/g, '');

    const m = cleanA.length;
    const n = cleanB.length;
    const dp = Array.from({ length: m + 1 }, () => Array(n + 1).fill(0));

    for (let i = 1; i <= m; i++) {
      for (let j = 1; j <= n; j++) {
        if (cleanA[i - 1] === cleanB[j - 1]) {
          dp[i][j] = dp[i - 1][j - 1] + 1;
        } else {
          dp[i][j] = Math.max(dp[i - 1][j], dp[i][j - 1]);
        }
      }
    }
    return dp[m][n];
  }

  compareWithThreshold(recognizedText, referenceText, threshold = 0.8, softMode = false) {
    const ref = referenceText.toLowerCase();
    const rec = recognizedText.toLowerCase();

    if (softMode) {
      const lcsLength = this.longestCommonSubsequence(ref, rec);
      const similarity = lcsLength / ref.replace(/\s/g, '').length;

      console.log(`[SOFT] LCS: ${lcsLength} / ${ref.replace(/\s/g, '').length} = ${similarity.toFixed(2)}`);
      return similarity >= threshold;
    } else {
      const diffs = diffChars(ref, rec);
      let changes = 0;

      diffs.forEach(part => {
        if (part.added || part.removed) {
          changes += part.value.length;
        }
      });

      const similarity = 1 - changes / ref.length;
      return similarity >= threshold;
    }
  }

  stop() {
    this.#strategy.stop();
  }
}

export {SpokenTextChecker}