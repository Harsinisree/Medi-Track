/**
 * MediTrack - Interactive Voice Assistant & Natural Language Engine
 * Supports Web Speech Recognition & SpeechSynthesis, bilingual (English + Tamil),
 * flexible intent parsing, and graceful keyboard fallback.
 */

(function (window) {
  'use strict';

  const VoiceAssistant = {
    recognition: null,
    isListening: false,
    isSpeaking: false,
    currentLanguage: 'en', // 'en' or 'ta'
    supported: false,
    synth: window.speechSynthesis || null,
    currentUtterance: null,

    init() {
      // Load language preference from settings
      const settings = window.MediStorage.getSettings();
      this.currentLanguage = settings.language || 'en';

      this.checkSpeechSupport();
      this.bindUI();
      this.renderLanguageSelection();
    },

    checkSpeechSupport() {
      const SpeechRecognition = window.SpeechRecognition || window.webkitSpeechRecognition;
      if (SpeechRecognition) {
        this.recognition = new SpeechRecognition();
        this.recognition.continuous = false;
        this.recognition.interimResults = false;
        this.recognition.maxAlternatives = 1;
        this.supported = true;
        this.setupRecognitionHandlers();
      } else {
        this.supported = false;
        console.warn('Web Speech Recognition is not supported in this browser.');
      }
    },

    setupRecognitionHandlers() {
      if (!this.recognition) return;

      this.recognition.onstart = () => {
        this.isListening = true;
        this.updateMicUI(true);
        this.setStatusText(this.currentLanguage === 'ta' ? '🔴 கேட்கிறது... பேசுங்கள்' : '🔴 Listening... Speak clearly');
      };

      this.recognition.onresult = (event) => {
        const transcript = event.results[0][0].transcript;
        this.handleUserInput(transcript);
      };

      this.recognition.onerror = (event) => {
        console.error('Speech recognition error:', event.error);
        this.isListening = false;
        this.updateMicUI(false);
        let errorMsg = 'Could not catch that. Please tap and try again.';
        if (event.error === 'not-allowed') {
          errorMsg = 'Microphone access was denied. Please allow microphone permissions or type your question below.';
        }
        this.setStatusText(errorMsg);
      };

      this.recognition.onend = () => {
        this.isListening = false;
        this.updateMicUI(false);
      };
    },

    // Toggle listening
    toggleListening() {
      if (!this.supported) {
        this.showFallbackMessage();
        return;
      }

      if (this.isListening) {
        this.stopListening();
      } else {
        this.startListening();
      }
    },

    startListening() {
      if (!this.recognition) {
        this.showFallbackMessage();
        return;
      }

      // Stop any speech synthesis if currently talking
      this.stopSpeaking();

      try {
        this.recognition.lang = this.currentLanguage === 'ta' ? 'ta-IN' : 'en-US';
        this.recognition.start();
      } catch (e) {
        console.error('Failed to start recognition:', e);
        this.recognition.stop();
        setTimeout(() => {
          try {
            this.recognition.lang = this.currentLanguage === 'ta' ? 'ta-IN' : 'en-US';
            this.recognition.start();
          } catch (err) {
            this.showFallbackMessage();
          }
        }, 200);
      }
    },

    stopListening() {
      if (this.recognition && this.isListening) {
        this.recognition.stop();
        this.isListening = false;
        this.updateMicUI(false);
      }
    },

    stopSpeaking() {
      if (this.synth) {
        this.synth.cancel();
      }
      this.isSpeaking = false;
      this.updateSpeakingWave(false);
    },

    // Process spoken or typed user input
    handleUserInput(text) {
      if (!text || !text.trim()) return;
      const cleanText = text.trim();

      // Append user bubble
      this.appendChatBubble('user', cleanText);
      this.setStatusText(this.currentLanguage === 'ta' ? 'பதிலளிக்கிறது...' : 'Processing...');

      // Interpret intent and generate answer
      const response = this.interpretCommand(cleanText);

      // Append bot bubble and speak aloud
      setTimeout(() => {
        this.appendChatBubble('bot', response.text);
        this.speakText(response.text);
        if (response.action) {
          response.action();
        }
        this.setStatusText(this.currentLanguage === 'ta' ? 'தயாராக உள்ளது' : 'Ready');
      }, 350);
    },

    // ==========================================================================
    // NLP Command Interpretation Engine (English + Tamil)
    // ==========================================================================

    interpretCommand(rawInput) {
      const input = rawInput.toLowerCase();
      const isTamil = this.currentLanguage === 'ta' || /[\u0B80-\u0BFF]/.test(rawInput);
      const meds = window.MediStorage.getMedications();
      const nextMed = window.MediStorage.getNextMedication();

      // SAFETY RULE: Not a diagnosis system!
      if (input.includes('pain') || input.includes('fever') || input.includes('headache') || input.includes('increase dose') || input.includes('extra tablet') || input.includes('side effect') || input.includes('நோய்')) {
        return {
          text: isTamil
            ? 'மெடிட்ராக் மருத்துவ ஆலோசனை வழங்கும் அமைப்பு அல்ல. தயவுசெய்து உங்கள் மருத்துவர் அல்லது பராமரிப்பாளர் பிரியாவை தொடர்பு கொள்ளவும்.'
            : 'MediTrack is not a medical diagnosis or treatment system. Please consult your physician or pharmacist regarding dosage changes or symptoms.'
        };
      }

      // 1. "What medicine do I have now?" / "What is my next medicine?"
      if (
        input.includes('next medicine') || input.includes('medicine do i have') ||
        input.includes('what medicine') || input.includes('medicine now') ||
        input.includes('schedule') || input.includes('அடுத்த மருந்து') ||
        input.includes('இப்போ நான் என்ன மருந்து')
      ) {
        if (!nextMed) {
          return {
            text: isTamil
              ? 'இன்றைய அனைத்து மருந்துகளும் எடுக்கப்பட்டுவிட்டன!'
              : 'You have completed all scheduled medications for today.'
          };
        }
        return {
          text: isTamil
            ? `உங்களுடைய அடுத்த scheduled medicine ${nextMed.name}. நேரம்: ${nextMed.displayTime}. ${nextMed.dosage}.`
            : `Your next scheduled medication is ${nextMed.name} at ${nextMed.displayTime}. Dosage: ${nextMed.dosage}.`
        };
      }

      // 2. "Did I take my morning medicine?"
      if (
        input.includes('did i take') || input.includes('morning medicine') ||
        input.includes('காலை மருந்து') || input.includes('சாப்பிட்டேனா')
      ) {
        const morningMed = meds.find(m => m.name.toLowerCase().includes('morning') || m.time < '12:00');
        if (morningMed) {
          if (morningMed.status === 'Taken') {
            return {
              text: isTamil
                ? `உங்கள் காலை மருந்து ${morningMed.actualConfirmationTime || '8:07 AM'} மணிக்கு எடுக்கப்பட்டதாக பதிவு செய்யப்பட்டுள்ளது.`
                : `Your morning medicine was recorded as taken at ${morningMed.actualConfirmationTime || '8:07 AM'}.`
            };
          } else {
            return {
              text: isTamil
                ? `உங்கள் காலை மருந்து இன்னும் எடுக்கப்படவில்லை. இதன் நேரம் ${morningMed.displayTime}.`
                : `Your morning medicine is scheduled for ${morningMed.displayTime} and has not been confirmed yet.`
            };
          }
        }
      }

      // 3. "I took my medicine" / "Mark as taken"
      if (
        input.includes('i took my medicine') || input.includes('i took it') ||
        input.includes('took the medicine') || input.includes('taken') ||
        input.includes('சாப்பிட்டுவிட்டேன்') || input.includes('எடுத்தாச்சு')
      ) {
        if (nextMed && nextMed.status !== 'Taken') {
          const res = window.MediStorage.markAsTaken(nextMed.id, 'Voice Assistant');
          return {
            text: isTamil
              ? `சரி. ${nextMed.name} மருந்தை நீங்கள் எடுத்ததாக பதிவு செய்துவிட்டேன்.`
              : `Okay. I have recorded the medication confirmation for ${nextMed.name}.`,
            action: () => {
              if (window.MedicationController) window.MedicationController.render();
            }
          };
        } else {
          return {
            text: isTamil
              ? 'உங்கள் அனைத்து தற்போதைய மருந்துகளும் ஏற்கனவே பதிவு செய்யப்பட்டுள்ளன.'
              : 'Your scheduled medications for this routine are already recorded as taken.'
          };
        }
      }

      // 4. "Remind me later"
      if (
        input.includes('remind me later') || input.includes('later') ||
        input.includes('delay') || input.includes('பிறகு நினைவூட்டு') ||
        input.includes('அப்புறம்')
      ) {
        if (nextMed) {
          window.MediStorage.markAsDelayed(nextMed.id, 15);
          return {
            text: isTamil
              ? 'சரி. 15 நிமிடங்களில் மீண்டும் நினைவூட்டுகிறேன்.'
              : 'Okay. I will remind you again in 15 minutes.',
            action: () => {
              if (window.MedicationController) window.MedicationController.render();
            }
          };
        }
      }

      // 5. "What medicines have I taken?"
      if (
        input.includes('what medicines have i taken') || input.includes('taken today') ||
        input.includes('what did i take') || input.includes('எடுத்த மருந்துகள்')
      ) {
        const takenMeds = meds.filter(m => m.status === 'Taken');
        if (takenMeds.length === 0) {
          return {
            text: isTamil ? 'இன்று நீங்கள் இன்னும் எந்த மருந்தும் எடுக்கவில்லை.' : 'You have not confirmed any medications today yet.'
          };
        }
        const names = takenMeds.map(m => `${m.name} at ${m.actualConfirmationTime || m.displayTime}`).join(', ');
        return {
          text: isTamil
            ? `இன்று நீங்கள் எடுத்த மருந்துகள்: ${takenMeds.map(m => m.name).join(', ')}.`
            : `Today you have recorded: ${names}.`
        };
      }

      // 6. "What did I miss today?" / "What medicines did I miss?"
      if (
        input.includes('miss') || input.includes('missed') || input.includes('தவறவிட்ட')
      ) {
        const missed = meds.filter(m => m.status === 'Missed');
        if (missed.length === 0) {
          return {
            text: isTamil
              ? 'இன்று நீங்கள் எந்த மருந்தையும் தவறவிடவில்லை.'
              : 'You currently have no missed medications today.'
          };
        }
        return {
          text: isTamil
            ? `தவறவிட்ட மருந்து: ${missed.map(m => m.name).join(', ')}.`
            : `You have ${missed.length} unconfirmed medication: ${missed.map(m => m.name).join(', ')}.`
        };
      }

      // 7. "Show today's medicines" / "What are my medicines today?"
      if (
        input.includes('today') || input.includes('all medicine') ||
        input.includes('இன்றைய மருந்து')
      ) {
        const summary = meds.map(m => `${m.name} at ${m.displayTime}`).join(', ');
        return {
          text: isTamil
            ? `இன்றைய அட்டவணை: ${summary}.`
            : `Today's schedule includes: ${summary}.`
        };
      }

      // 8. "I need help" / "Emergency"
      if (
        input.includes('help') || input.includes('emergency') ||
        input.includes('உதவி') || input.includes('காப்பாத்து')
      ) {
        return {
          text: isTamil
            ? 'பராமரிப்பாளர் பிரியாவை தொடர்பு கொள்ள ஏற்பாடு செய்கிறேன்.'
            : 'I can show your caregiver support option. Contacting Priya.',
          action: () => {
            if (window.MediApp) window.MediApp.openSOSModal();
          }
        };
      }

      // 9. "Who is my caregiver?"
      if (
        input.includes('who is my caregiver') || input.includes('caregiver') ||
        input.includes('பராமரிப்பாளர் யார்')
      ) {
        return {
          text: isTamil
            ? 'உங்கள் முதன்மை பராமரிப்பாளர் பிரியா, உங்கள் மகள்.'
            : 'Your primary caregiver is Priya, your daughter.'
        };
      }

      // Default fallback
      return {
        text: isTamil
          ? 'மன்னிக்கவும், புரியவில்லை. "அடுத்த மருந்து என்ன?" அல்லது "நான் மருந்து எடுத்தாச்சு" என்று கேட்டுப்பாருங்கள்.'
          : 'I heard you. You can ask "What is my next medicine?", "Did I take morning medicine?", or say "I took my medicine".'
      };
    },

    // Speech Synthesis output
    speakText(text) {
      if (!this.synth) return;

      this.stopSpeaking();

      const utterance = new SpeechSynthesisUtterance(text);
      this.currentUtterance = utterance;

      utterance.lang = this.currentLanguage === 'ta' ? 'ta-IN' : 'en-US';
      utterance.rate = 0.95; // Slightly slower pace for elderly clarity
      utterance.pitch = 1.0;

      utterance.onstart = () => {
        this.isSpeaking = true;
        this.updateSpeakingWave(true);
      };

      utterance.onend = () => {
        this.isSpeaking = false;
        this.updateSpeakingWave(false);
      };

      utterance.onerror = (e) => {
        console.warn('SpeechSynthesis error:', e);
        this.isSpeaking = false;
        this.updateSpeakingWave(false);
      };

      this.synth.speak(utterance);
    },

    // ==========================================================================
    // UI Updates & Interactions
    // ==========================================================================

    updateMicUI(listening) {
      const micBtn = document.getElementById('voice-mic-main-btn');
      const micLabel = document.getElementById('voice-mic-prompt-text');

      if (micBtn) {
        if (listening) {
          micBtn.classList.add('listening');
          micBtn.setAttribute('aria-pressed', 'true');
        } else {
          micBtn.classList.remove('listening');
          micBtn.setAttribute('aria-pressed', 'false');
        }
      }

      if (micLabel) {
        if (listening) {
          micLabel.textContent = this.currentLanguage === 'ta' ? '🔴 கேட்கிறது...' : '🔴 LISTENING...';
        } else {
          micLabel.textContent = this.currentLanguage === 'ta' ? '🎤 பேச தொடங்குங்கள்' : '🎤 TAP TO SPEAK';
        }
      }
    },

    updateSpeakingWave(speaking) {
      const waveEl = document.getElementById('speaking-waves-container');
      if (waveEl) {
        waveEl.style.display = speaking ? 'inline-flex' : 'none';
      }
    },

    setStatusText(text) {
      const statusEl = document.getElementById('voice-status-indicator-text');
      if (statusEl) statusEl.textContent = text;
    },

    appendChatBubble(sender, text) {
      const log = document.getElementById('voice-chat-log');
      if (!log) return;

      const bubble = document.createElement('div');
      bubble.className = `chat-bubble bubble-${sender}`;

      const speakerName = sender === 'user' ? 'USER 🎤' : 'MEDITrack 🤖';

      bubble.innerHTML = `
        <div class="chat-speaker-label">${speakerName}</div>
        <div>${text}</div>
      `;

      log.appendChild(bubble);
      log.scrollTop = log.scrollHeight;
    },

    showFallbackMessage() {
      const fallbackBox = document.getElementById('voice-fallback-alert');
      if (fallbackBox) {
        fallbackBox.style.display = 'block';
      }
      this.setStatusText('Voice input is not supported or blocked in this browser. You can type below!');
    },

    setLanguage(lang) {
      this.currentLanguage = lang;
      window.MediStorage.updateSettings({ language: lang });
      this.renderLanguageSelection();
      this.stopSpeaking();

      const welcomeMsg = lang === 'ta'
        ? 'வணக்கம் லட்சுமி! நீங்கள் இப்போது தமிழில் பேசலாம் அல்லது கேட்கலாம்.'
        : 'Language switched to English. You can speak or type your question.';

      this.appendChatBubble('bot', welcomeMsg);
      this.speakText(welcomeMsg);
    },

    renderLanguageSelection() {
      const enBtn = document.getElementById('lang-select-en');
      const taBtn = document.getElementById('lang-select-ta');

      if (enBtn && taBtn) {
        if (this.currentLanguage === 'ta') {
          enBtn.classList.remove('active');
          taBtn.classList.add('active');
        } else {
          enBtn.classList.add('active');
          taBtn.classList.remove('active');
        }
      }
    },

    clearChat() {
      const log = document.getElementById('voice-chat-log');
      if (log) {
        log.innerHTML = `
          <div class="chat-bubble bubble-bot">
            <div class="chat-speaker-label">MEDITrack 🤖</div>
            <div>Hello Lakshmi! Tap the microphone and ask: "What is my next medicine?" or "Did I take my morning medicine?"</div>
          </div>
        `;
      }
      this.stopSpeaking();
    },

    bindUI() {
      // Big Mic Button
      const micBtn = document.getElementById('voice-mic-main-btn');
      if (micBtn) {
        micBtn.addEventListener('click', () => {
          this.toggleListening();
        });
      }

      // Stop Speaking Button
      const stopBtn = document.getElementById('voice-btn-stop-speaking');
      if (stopBtn) {
        stopBtn.addEventListener('click', () => {
          this.stopSpeaking();
        });
      }

      // Clear Conversation Button
      const clearBtn = document.getElementById('voice-btn-clear-chat');
      if (clearBtn) {
        clearBtn.addEventListener('click', () => {
          this.clearChat();
        });
      }

      // Language Switchers
      document.getElementById('lang-select-en')?.addEventListener('click', () => {
        this.setLanguage('en');
      });
      document.getElementById('lang-select-ta')?.addEventListener('click', () => {
        this.setLanguage('ta');
      });

      // Quick Command Chips
      document.querySelectorAll('.command-chip').forEach(chip => {
        chip.addEventListener('click', () => {
          const text = chip.dataset.query || chip.textContent.trim();
          this.handleUserInput(text);
        });
      });

      // Type Instead Form (Fallback & Alternate)
      const typeForm = document.getElementById('voice-type-form');
      const typeInput = document.getElementById('voice-type-text-input');
      if (typeForm && typeInput) {
        typeForm.addEventListener('submit', (e) => {
          e.preventDefault();
          const val = typeInput.value.trim();
          if (val) {
            this.handleUserInput(val);
            typeInput.value = '';
          }
        });
      }
    }
  };

  window.VoiceAssistant = VoiceAssistant;

  document.addEventListener('DOMContentLoaded', () => {
    VoiceAssistant.init();
  });

})(window);
