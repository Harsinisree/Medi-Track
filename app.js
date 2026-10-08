/**
 * MediTrack - Global Application Controller
 * Handles layout, role switching, accessible navigation, toasts,
 * reminder modals, emergency SOS modal, and Hackathon Demo controls.
 */

(function (window) {
  'use strict';

  const App = {
    init() {
      this.applyThemeAndAccessibility();
      this.renderDemoBar();
      this.setupHeaderActions();
      this.setupGlobalModalListeners();
      this.setupSOSModal();
      this.checkAndTriggerDueReminder();
      this.listenToStorageUpdates();
    },

    // Apply settings such as Large Text, High Contrast, Simple Mode
    applyThemeAndAccessibility() {
      const settings = window.MediStorage.getSettings();
      const body = document.body;

      if (settings.largeText) {
        body.classList.add('mode-large-text');
      } else {
        body.classList.remove('mode-large-text');
      }

      if (settings.highContrast) {
        body.classList.add('mode-high-contrast');
      } else {
        body.classList.remove('mode-high-contrast');
      }

      if (settings.simpleMode) {
        body.classList.add('mode-simple');
      } else {
        body.classList.remove('mode-simple');
      }
    },

    // Toast Notification System
    showToast(message, type = 'success', duration = 3800) {
      let container = document.getElementById('toast-container');
      if (!container) {
        container = document.createElement('div');
        container.id = 'toast-container';
        container.className = 'toast-container';
        document.body.appendChild(container);
      }

      const toast = document.createElement('div');
      toast.className = `toast toast-${type}`;
      
      let icon = '✓';
      if (type === 'warning') icon = '⚠️';
      if (type === 'danger') icon = '🚨';
      if (type === 'info') icon = 'ℹ️';

      toast.innerHTML = `<span style="font-size:1.25rem;">${icon}</span> <span>${message}</span>`;
      container.appendChild(toast);

      // Trigger animation
      setTimeout(() => toast.classList.add('show'), 20);

      setTimeout(() => {
        toast.classList.remove('show');
        setTimeout(() => toast.remove(), 350);
      }, duration);
    },

    // Render Hackathon Demo Bar at the top of the window
    renderDemoBar() {
      if (document.getElementById('demo-control-bar')) return;

      const currentRole = window.MediStorage.getCurrentRole();
      const support = window.MediStorage.getSupportStatus();

      const bar = document.createElement('aside');
      bar.id = 'demo-control-bar';
      bar.className = 'demo-control-bar';
      bar.setAttribute('aria-label', 'Hackathon Demo Flow Controls');

      bar.innerHTML = `
        <div class="demo-title-tag">
          <span class="demo-badge">HACKATHON DEMO CONTROLS</span>
          <span>Role: <strong>${currentRole === 'older-adult' ? 'Older Adult (Lakshmi)' : 'Caregiver (Priya)'}</strong></span>
          <span style="opacity:0.8;">| Status: <strong>${support.state}</strong></span>
        </div>
        <div class="demo-actions">
          <button class="demo-btn" id="demo-toggle-role" title="Switch User Role">
            🔄 Switch to ${currentRole === 'older-adult' ? 'Caregiver' : 'Older Adult'}
          </button>
          <button class="demo-btn" id="demo-trigger-reminder" title="Simulate Medication Reminder">
            🔔 Show Reminder Modal
          </button>
          <button class="demo-btn" id="demo-escalate-attention" title="Simulate Overdue Attention Needed">
            🟡 Simulate Overdue (Attention Needed)
          </button>
          <button class="demo-btn" id="demo-escalate-critical" title="Simulate Escalation to Support Required">
            🔴 Escalate (Support Required)
          </button>
          <button class="demo-btn" id="demo-reset-data" title="Reset Demo Data">
            ↺ Reset Data
          </button>
        </div>
      `;

      document.body.prepend(bar);

      // Event Listeners for Demo Bar
      document.getElementById('demo-toggle-role')?.addEventListener('click', () => {
        const nextRole = currentRole === 'older-adult' ? 'caregiver' : 'older-adult';
        window.MediStorage.setCurrentRole(nextRole);
        if (nextRole === 'caregiver') {
          window.location.href = 'caregiver.html';
        } else {
          window.location.href = 'dashboard.html';
        }
      });

      document.getElementById('demo-trigger-reminder')?.addEventListener('click', () => {
        window.MediStorage.simulateMedicationDue('med-3');
        this.openMedicationReminderModal('med-3');
      });

      document.getElementById('demo-escalate-attention')?.addEventListener('click', () => {
        window.MediStorage.simulateEscalationToAttention('med-3');
        this.showToast('Demo simulated: Evening medication overdue (Attention Needed 🟡)', 'warning');
      });

      document.getElementById('demo-escalate-critical')?.addEventListener('click', () => {
        window.MediStorage.simulateEscalationToSupportRequired('med-3');
        this.showToast('Demo simulated: Support Required (🔴 Caregiver Alert Active)', 'danger');
      });

      document.getElementById('demo-reset-data')?.addEventListener('click', () => {
        if (confirm('Reset MediTrack to original demo state?')) {
          window.MediStorage.resetToDefaults();
          this.showToast('Data reset to default demo scenario.', 'info');
          setTimeout(() => window.location.reload(), 400);
        }
      });
    },

    setupHeaderActions() {
      // SOS / Emergency button
      const sosBtn = document.getElementById('header-sos-btn');
      if (sosBtn) {
        sosBtn.addEventListener('click', () => this.openSOSModal());
      }
    },

    // --- Medication Reminder Modal System (Section 9) ---
    openMedicationReminderModal(medId = null) {
      const med = medId ? window.MediStorage.getMedicationById(medId) : window.MediStorage.getNextMedication();
      if (!med) return;

      let modal = document.getElementById('reminder-modal-backdrop');
      if (!modal) {
        modal = document.createElement('div');
        modal.id = 'reminder-modal-backdrop';
        modal.className = 'modal-backdrop';
        modal.innerHTML = `
          <div class="modal-dialog" role="dialog" aria-modal="true" aria-labelledby="reminder-title">
            <button class="modal-close-btn" id="reminder-modal-close" aria-label="Close dialog">&times;</button>
            <div style="text-align: center; margin-bottom: 1.5rem;">
              <span style="font-size: 3.5rem; display: block; margin-bottom: 0.5rem;">🔔</span>
              <h2 id="reminder-title" style="font-size: 1.8rem; font-weight: 800; color: var(--primary-900);">Medication Reminder</h2>
              <p style="font-size: 1.15rem; color: var(--text-muted);">It's time to check your scheduled medication.</p>
            </div>

            <div style="background-color: var(--primary-50); border: 2px solid var(--primary-200); border-radius: var(--radius-lg); padding: 1.5rem; margin-bottom: 1.75rem;">
              <div style="display:flex; justify-content:space-between; align-items:center; margin-bottom:0.5rem;">
                <h3 id="reminder-med-name" style="font-size: 1.6rem; font-weight:800; color:var(--text-main);"></h3>
                <span id="reminder-med-time" class="med-time-tag"></span>
              </div>
              <p id="reminder-med-dosage" style="font-size: 1.15rem; color: var(--text-muted); font-weight:600; margin-bottom: 0.75rem;"></p>
              <div style="background:white; padding:0.75rem 1rem; border-radius:var(--radius-sm); border:1px solid var(--primary-100); font-size:1.05rem;">
                <strong>Instructions:</strong> <span id="reminder-med-instructions"></span>
              </div>
            </div>

            <div style="display:flex; flex-direction:column; gap:0.9rem;">
              <button id="reminder-action-taken" class="btn btn-giant btn-giant-success" style="width:100%;">
                ✓ I TOOK IT
              </button>
              <button id="reminder-action-later" class="btn btn-giant btn-giant-warning" style="width:100%;">
                🔔 Remind Me Later
              </button>
              <button id="reminder-action-close-btn" class="btn btn-outline" style="width:100%;">
                Close
              </button>
            </div>
          </div>
        `;
        document.body.appendChild(modal);

        document.getElementById('reminder-modal-close')?.addEventListener('click', () => this.closeReminderModal());
        document.getElementById('reminder-action-close-btn')?.addEventListener('click', () => this.closeReminderModal());
      }

      // Populate med details
      document.getElementById('reminder-med-name').textContent = med.name;
      document.getElementById('reminder-med-time').textContent = `⏰ ${med.displayTime}`;
      document.getElementById('reminder-med-dosage').textContent = med.dosage;
      document.getElementById('reminder-med-instructions').textContent = med.instructions || 'Take as instructed';

      // Set action handlers
      const takenBtn = document.getElementById('reminder-action-taken');
      const laterBtn = document.getElementById('reminder-action-later');

      takenBtn.onclick = () => {
        const result = window.MediStorage.markAsTaken(med.id, 'reminder modal');
        if (result.success) {
          this.showToast(result.message, 'success');
        } else if (result.isDuplicate) {
          this.showToast(result.message, 'warning');
        }
        this.closeReminderModal();
      };

      laterBtn.onclick = () => {
        const result = window.MediStorage.markAsDelayed(med.id, 15);
        this.showToast(result.message, 'warning');
        this.closeReminderModal();
      };

      modal.classList.add('open');
    },

    closeReminderModal() {
      const modal = document.getElementById('reminder-modal-backdrop');
      if (modal) modal.classList.remove('open');
    },

    // --- Emergency / Caregiver Help Modal (Section 26) ---
    setupSOSModal() {
      let modal = document.getElementById('sos-modal-backdrop');
      if (!modal) {
        modal = document.createElement('div');
        modal.id = 'sos-modal-backdrop';
        modal.className = 'modal-backdrop';
        modal.innerHTML = `
          <div class="modal-dialog" role="dialog" aria-modal="true" aria-labelledby="sos-title">
            <button class="modal-close-btn" id="sos-modal-close" aria-label="Close dialog">&times;</button>
            <div style="text-align: center; margin-bottom: 1.5rem;">
              <span style="font-size: 3.5rem; display: block; margin-bottom: 0.5rem;">🆘</span>
              <h2 id="sos-title" style="font-size: 1.8rem; font-weight: 800; color: var(--danger-600);">Caregiver Support</h2>
              <p style="font-size: 1.15rem; color: var(--text-muted);">Your caregiver support option is ready.</p>
            </div>

            <div style="background-color: var(--danger-50); border: 2px solid var(--danger-100); border-radius: var(--radius-lg); padding: 1.5rem; margin-bottom: 1.5rem;">
              <p style="font-size: 0.95rem; color: var(--danger-700); font-weight: 700; text-transform: uppercase; margin-bottom: 0.4rem;">PRIMARY CAREGIVER</p>
              <h3 style="font-size: 1.6rem; font-weight: 800; color: var(--text-main); margin-bottom: 0.2rem;">Priya</h3>
              <p style="font-size: 1.1rem; color: var(--text-muted); margin-bottom: 0.75rem;">Relationship: <strong>Daughter</strong></p>
              <div style="font-size: 0.95rem; color: #64748b; background: white; padding: 0.75rem; border-radius: var(--radius-sm); border: 1px solid var(--border-subtle);">
                ℹ️ <em>Safety Note: MediTrack is not an emergency 911 dispatch. For life-threatening emergencies, always dial local emergency services.</em>
              </div>
            </div>

            <div style="display:flex; flex-direction:column; gap:0.9rem;">
              <button id="sos-notify-btn" class="btn btn-giant btn-danger" style="width:100%;">
                🚨 Notify Caregiver Priya
              </button>
              <button id="sos-cancel-btn" class="btn btn-outline" style="width:100%;">
                Cancel
              </button>
            </div>
          </div>
        `;
        document.body.appendChild(modal);

        document.getElementById('sos-modal-close')?.addEventListener('click', () => this.closeSOSModal());
        document.getElementById('sos-cancel-btn')?.addEventListener('click', () => this.closeSOSModal());
        document.getElementById('sos-notify-btn')?.addEventListener('click', () => {
          // Create high priority alert
          window.MediStorage.createAlert({
            level: 'Support Required',
            severity: 'critical',
            title: 'Help Requested by Lakshmi',
            message: 'Lakshmi tapped "I Need Help" on the MediTrack dashboard.',
            medId: null,
            medName: 'Support Assistance'
          });
          window.MediStorage.setSupportStatus('Support Required', 'Lakshmi requested caregiver assistance.');
          this.showToast('✓ Support notification sent to Priya (Caregiver Dashboard updated).', 'success');
          this.closeSOSModal();
        });
      }
    },

    openSOSModal() {
      const modal = document.getElementById('sos-modal-backdrop');
      if (modal) modal.classList.add('open');
    },

    closeSOSModal() {
      const modal = document.getElementById('sos-modal-backdrop');
      if (modal) modal.classList.remove('open');
    },

    setupGlobalModalListeners() {
      window.addEventListener('keydown', (e) => {
        if (e.key === 'Escape') {
          this.closeReminderModal();
          this.closeSOSModal();
          const genericModals = document.querySelectorAll('.modal-backdrop.open');
          genericModals.forEach(m => m.classList.remove('open'));
        }
      });
    },

    checkAndTriggerDueReminder() {
      // Check if any medication is flagged as 'Due Now' and hasn't been confirmed
      const meds = window.MediStorage.getMedications();
      const due = meds.find(m => m.status === 'Due Now');
      if (due && !sessionStorage.getItem('meditrack_reminder_dismissed_' + due.id)) {
        setTimeout(() => {
          this.openMedicationReminderModal(due.id);
        }, 1200);
      }
    },

    listenToStorageUpdates() {
      window.addEventListener('meditrack:datachange', () => {
        this.applyThemeAndAccessibility();
        // Update demo bar title
        const bar = document.getElementById('demo-control-bar');
        if (bar) {
          const support = window.MediStorage.getSupportStatus();
          const statusTag = bar.querySelector('.demo-title-tag strong:last-child');
          if (statusTag) statusTag.textContent = support.state;
        }
      });
    }
  };

  window.MediApp = App;

  document.addEventListener('DOMContentLoaded', () => {
    App.init();
  });

})(window);
