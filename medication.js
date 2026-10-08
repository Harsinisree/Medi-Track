/**
 * MediTrack - Medication Domain Logic & UI Controller
 * Manages dashboard hero card, duplicate dose awareness, daily timeline,
 * full CRUD (Add/Edit/Delete), status updates, and history view.
 */

(function (window) {
  'use strict';

  const MedicationController = {
    init() {
      this.bindDashboardEvents();
      this.bindManagementEvents();
      this.bindHistoryEvents();
      this.render();

      // Re-render whenever localStorage updates
      window.addEventListener('meditrack:datachange', () => {
        this.render();
      });
    },

    render() {
      if (document.getElementById('older-adult-dashboard')) {
        this.renderDashboard();
      }
      if (document.getElementById('medications-manage-page')) {
        this.renderMedicationsManagement();
      }
      if (document.getElementById('history-page')) {
        this.renderHistoryPage();
      }
    },

    // ==========================================================================
    // 1. Older Adult Dashboard Rendering (dashboard.html)
    // ==========================================================================

    renderDashboard() {
      this.renderGreeting();
      this.renderNextMedicationHero();
      this.renderTodayMedicationList();
      this.renderTimeline();
    },

    renderGreeting() {
      const greetingEl = document.getElementById('user-greeting-title');
      const dateEl = document.getElementById('today-date-display');
      if (!greetingEl) return;

      const hour = new Date().getHours();
      let timeOfDay = 'Morning';
      if (hour >= 12 && hour < 17) timeOfDay = 'Afternoon';
      else if (hour >= 17) timeOfDay = 'Evening';

      greetingEl.innerHTML = `Good ${timeOfDay}, Lakshmi 👋`;

      if (dateEl) {
        const options = { weekday: 'long', month: 'long', day: 'numeric', year: 'numeric' };
        dateEl.textContent = new Date().toLocaleDateString('en-US', options);
      }
    },

    renderNextMedicationHero() {
      const heroContainer = document.getElementById('next-med-hero-container');
      if (!heroContainer) return;

      const nextMed = window.MediStorage.getNextMedication();

      if (!nextMed) {
        heroContainer.innerHTML = `
          <div class="card" style="text-align:center; padding: 3rem 1.5rem;">
            <span style="font-size:3rem; display:block; margin-bottom:1rem;">🎉</span>
            <h3 style="font-size:1.8rem; font-weight:800; color:var(--success-700);">All Done For Today!</h3>
            <p style="font-size:1.15rem; color:var(--text-muted); margin-top:0.5rem;">All your scheduled medications have been recorded.</p>
          </div>
        `;
        return;
      }

      const isAlreadyTaken = nextMed.status === 'Taken';

      heroContainer.innerHTML = `
        <article class="hero-next-med" aria-labelledby="hero-title">
          <div class="next-med-badge-row">
            <span class="next-med-label">
              <span style="font-size:1.2rem;">⏱️</span> NEXT MEDICATION
            </span>
            <span class="med-time-tag">
              ⏰ ${nextMed.displayTime}
            </span>
          </div>

          <h2 id="hero-title" class="hero-med-title">${nextMed.name}</h2>
          <p class="hero-med-dosage">${nextMed.dosage} ${nextMed.genericName ? `(${nextMed.genericName})` : ''}</p>

          <div class="hero-med-instructions">
            <span style="font-size:1.4rem;">💡</span>
            <span><strong>Instructions:</strong> ${nextMed.instructions || 'Take as directed with water.'}</span>
          </div>

          ${isAlreadyTaken ? `
            <!-- DUPLICATE DOSE AWARENESS (SECTION 8) -->
            <div class="duplicate-dose-alert" role="alert">
              <div class="duplicate-alert-icon">✓</div>
              <div class="duplicate-alert-content">
                <h4>This medication was already recorded as taken at ${nextMed.actualConfirmationTime || '8:07 PM'}</h4>
                <p>You have already completed this dose. Please do not take an additional tablet.</p>
                <p class="duplicate-disclaimer">⚠️ If you are unsure about your medication, please contact your healthcare professional or caregiver Priya.</p>
              </div>
            </div>
          ` : `
            <div class="hero-action-buttons">
              <button id="hero-btn-took-it" class="btn btn-giant btn-giant-success" aria-label="Mark ${nextMed.name} as taken">
                ✓ I TOOK IT
              </button>
              <button id="hero-btn-remind-later" class="btn btn-giant btn-giant-warning" aria-label="Remind me later for ${nextMed.name}">
                🔔 REMIND ME LATER
              </button>
            </div>
          `}
        </article>
      `;

      // Event bindings for hero buttons
      const tookBtn = document.getElementById('hero-btn-took-it');
      const remindBtn = document.getElementById('hero-btn-remind-later');

      if (tookBtn) {
        tookBtn.addEventListener('click', () => {
          const res = window.MediStorage.markAsTaken(nextMed.id, 'Dashboard Hero Button');
          if (res.success) {
            window.MediApp.showToast(res.message, 'success');
          } else if (res.isDuplicate) {
            window.MediApp.showToast(res.message, 'warning');
          }
          this.render();
        });
      }

      if (remindBtn) {
        remindBtn.addEventListener('click', () => {
          const res = window.MediStorage.markAsDelayed(nextMed.id, 15);
          window.MediApp.showToast(res.message, 'warning');
          this.render();
        });
      }
    },

    renderTodayMedicationList() {
      const listContainer = document.getElementById('today-medications-grid');
      if (!listContainer) return;

      const medications = window.MediStorage.getMedications();

      if (medications.length === 0) {
        listContainer.innerHTML = '<p style="color:var(--text-muted); font-size:1.1rem;">No medications registered yet.</p>';
        return;
      }

      listContainer.innerHTML = medications.map(med => {
        let statusBadgeClass = 'status-upcoming';
        let statusIcon = '🔵';
        if (med.status === 'Taken') {
          statusBadgeClass = 'status-taken';
          statusIcon = '🟢';
        } else if (med.status === 'Delayed') {
          statusBadgeClass = 'status-delayed';
          statusIcon = '🟡';
        } else if (med.status === 'Missed') {
          statusBadgeClass = 'status-missed';
          statusIcon = '🔴';
        } else if (med.status === 'Due Now') {
          statusBadgeClass = 'status-due-now';
          statusIcon = '⏰';
        }

        return `
          <div class="med-card" data-med-id="${med.id}" tabindex="0" role="button" aria-label="View details for ${med.name}">
            <div class="med-card-top">
              <span class="med-scheduled-time">
                <span>⏰</span> ${med.displayTime}
              </span>
              <span class="status-badge ${statusBadgeClass}">
                ${statusIcon} ${med.status}
              </span>
            </div>

            <h3 class="med-card-title">${med.name}</h3>
            <p class="med-card-dosage">${med.dosage}</p>

            ${med.status === 'Taken' ? `
              <div class="med-confirmation-note">
                <span>✓</span> Taken at ${med.actualConfirmationTime || '8:07 AM'}
              </div>
            ` : med.status === 'Delayed' ? `
              <div style="font-size:0.95rem; color:var(--warning-700); margin-top:auto; font-weight:600;">
                ⚠️ Delayed (Reminder pending)
              </div>
            ` : `
              <div style="font-size:0.95rem; color:var(--primary-700); margin-top:auto; font-weight:600;">
                ⏳ Scheduled for ${med.displayTime}
              </div>
            `}
          </div>
        `;
      }).join('');

      // Add click handlers on cards to open details
      listContainer.querySelectorAll('.med-card').forEach(card => {
        card.addEventListener('click', () => {
          const id = card.dataset.medId;
          this.openMedicationDetailModal(id);
        });
        card.addEventListener('keydown', (e) => {
          if (e.key === 'Enter' || e.key === ' ') {
            e.preventDefault();
            this.openMedicationDetailModal(card.dataset.medId);
          }
        });
      });
    },

    renderTimeline() {
      const timelineContainer = document.getElementById('daily-timeline-list');
      if (!timelineContainer) return;

      const medications = window.MediStorage.getMedications();

      timelineContainer.innerHTML = medications.map(med => {
        const isDone = med.status === 'Taken';
        let statusText = `⏳ ${med.status}`;
        if (isDone) statusText = `✓ Taken at ${med.actualConfirmationTime || '8:07 AM'}`;
        else if (med.status === 'Delayed') statusText = `🟡 Delayed`;
        else if (med.status === 'Missed') statusText = `🔴 Missed`;

        return `
          <div class="timeline-entry ${isDone ? 'done' : ''}">
            <div class="timeline-dot">${isDone ? '✓' : '•'}</div>
            <div style="display:flex; justify-content:space-between; align-items:flex-start;">
              <div>
                <strong style="font-size:1.15rem; color:var(--primary-900);">${med.displayTime}</strong>
                <h4 style="font-size:1.2rem; font-weight:700; margin-top:2px;">💊 ${med.name}</h4>
                <p style="font-size:1rem; color:var(--text-muted);">${med.dosage}</p>
              </div>
              <span class="status-badge ${isDone ? 'status-taken' : med.status === 'Delayed' ? 'status-delayed' : med.status === 'Missed' ? 'status-missed' : 'status-upcoming'}">
                ${statusText}
              </span>
            </div>
          </div>
        `;
      }).join('');
    },

    // Modal for viewing details of an individual medication
    openMedicationDetailModal(medId) {
      const med = window.MediStorage.getMedicationById(medId);
      if (!med) return;

      let modal = document.getElementById('med-detail-modal-backdrop');
      if (!modal) {
        modal = document.createElement('div');
        modal.id = 'med-detail-modal-backdrop';
        modal.className = 'modal-backdrop';
        modal.innerHTML = `
          <div class="modal-dialog" role="dialog" aria-modal="true" aria-labelledby="modal-detail-title">
            <button class="modal-close-btn" id="med-detail-close">&times;</button>
            <div style="display:flex; align-items:center; gap:0.75rem; margin-bottom:1rem;">
              <span style="font-size:2.2rem;">💊</span>
              <div>
                <h2 id="modal-detail-title" style="font-size:1.7rem; font-weight:800; color:var(--text-main);"></h2>
                <p id="modal-detail-generic" style="font-size:1rem; color:var(--text-muted);"></p>
              </div>
            </div>

            <div style="background-color:var(--bg-surface-soft); border-radius:var(--radius-lg); padding:1.25rem; margin-bottom:1.5rem; display:flex; flex-direction:column; gap:0.75rem;">
              <div style="display:flex; justify-content:space-between;">
                <span style="color:var(--text-muted); font-weight:600;">Scheduled Time:</span>
                <strong id="modal-detail-time" style="color:var(--primary-900);"></strong>
              </div>
              <div style="display:flex; justify-content:space-between;">
                <span style="color:var(--text-muted); font-weight:600;">Dosage:</span>
                <strong id="modal-detail-dosage"></strong>
              </div>
              <div style="display:flex; justify-content:space-between;">
                <span style="color:var(--text-muted); font-weight:600;">Frequency:</span>
                <strong id="modal-detail-freq"></strong>
              </div>
              <div style="display:flex; justify-content:space-between; align-items:center;">
                <span style="color:var(--text-muted); font-weight:600;">Current Status:</span>
                <span id="modal-detail-status-badge"></span>
              </div>
              <div style="border-top:1px solid var(--border-subtle); padding-top:0.75rem;">
                <span style="color:var(--text-muted); font-weight:600; display:block; margin-bottom:0.25rem;">Instructions:</span>
                <p id="modal-detail-instructions" style="font-size:1.05rem;"></p>
              </div>
            </div>

            <!-- Action Area Inside Detail Modal -->
            <div id="modal-detail-action-container" style="display:flex; flex-direction:column; gap:0.75rem;">
            </div>
          </div>
        `;
        document.body.appendChild(modal);
        document.getElementById('med-detail-close')?.addEventListener('click', () => modal.classList.remove('open'));
      }

      document.getElementById('modal-detail-title').textContent = med.name;
      document.getElementById('modal-detail-generic').textContent = med.genericName || 'Prescribed Routine';
      document.getElementById('modal-detail-time').textContent = `⏰ ${med.displayTime}`;
      document.getElementById('modal-detail-dosage').textContent = med.dosage;
      document.getElementById('modal-detail-freq').textContent = med.frequency;
      document.getElementById('modal-detail-instructions').textContent = med.instructions || 'Take as instructed.';

      const badgeContainer = document.getElementById('modal-detail-status-badge');
      badgeContainer.innerHTML = `<span class="status-badge status-${med.status.toLowerCase().replace(' ', '-')}">${med.status}</span>`;

      const actionArea = document.getElementById('modal-detail-action-container');
      if (med.status === 'Taken') {
        actionArea.innerHTML = `
          <div class="duplicate-dose-alert" style="margin-top:0;">
            <div class="duplicate-alert-icon">✓</div>
            <div class="duplicate-alert-content">
              <h4>Medication already recorded</h4>
              <p>Confirmed at ${med.actualConfirmationTime || '8:07 AM'}. Do not take an additional tablet.</p>
              <p class="duplicate-disclaimer">If unsure, consult Priya or your doctor.</p>
            </div>
          </div>
          <button class="btn btn-outline" onclick="document.getElementById('med-detail-modal-backdrop').classList.remove('open')">Close</button>
        `;
      } else {
        actionArea.innerHTML = `
          <button id="detail-action-took-it" class="btn btn-giant btn-giant-success" style="width:100%;">
            ✓ Mark as Taken Now
          </button>
          <button id="detail-action-remind-later" class="btn btn-giant btn-giant-warning" style="width:100%;">
            🔔 Remind Me Later
          </button>
          <button class="btn btn-outline" onclick="document.getElementById('med-detail-modal-backdrop').classList.remove('open')">Cancel</button>
        `;

        document.getElementById('detail-action-took-it').onclick = () => {
          const res = window.MediStorage.markAsTaken(med.id, 'Detail Dialog');
          if (res.success) window.MediApp.showToast(res.message, 'success');
          modal.classList.remove('open');
          this.render();
        };

        document.getElementById('detail-action-remind-later').onclick = () => {
          const res = window.MediStorage.markAsDelayed(med.id, 15);
          window.MediApp.showToast(res.message, 'warning');
          modal.classList.remove('open');
          this.render();
        };
      }

      modal.classList.add('open');
    },

    bindDashboardEvents() {
      // Nothing special here, handled dynamically
    },

    // ==========================================================================
    // 2. Medications Management Page (medications.html)
    // ==========================================================================

    renderMedicationsManagement() {
      const container = document.getElementById('all-medications-table-container');
      if (!container) return;

      const medications = window.MediStorage.getMedications();

      if (medications.length === 0) {
        container.innerHTML = `
          <div class="card" style="text-align:center; padding:3rem 1rem;">
            <p style="font-size:1.2rem; color:var(--text-muted);">No medications found in schedule.</p>
          </div>
        `;
        return;
      }

      container.innerHTML = `
        <div class="med-list-grid">
          ${medications.map(med => `
            <div class="card" style="display:flex; flex-direction:column; justify-content:space-between; border: 2px solid var(--border-subtle);">
              <div>
                <div style="display:flex; justify-content:space-between; align-items:center; margin-bottom:0.75rem;">
                  <span class="med-scheduled-time">⏰ ${med.displayTime}</span>
                  <span class="status-badge status-${med.status.toLowerCase().replace(' ', '-')}">${med.status}</span>
                </div>
                <h3 style="font-size:1.4rem; font-weight:800; color:var(--text-main); margin-bottom:0.3rem;">${med.name}</h3>
                <p style="font-size:1.05rem; color:var(--text-muted); font-weight:600; margin-bottom:0.6rem;">${med.dosage}</p>
                <p style="font-size:0.95rem; color:var(--text-muted); margin-bottom:0.5rem;">
                  <strong>Frequency:</strong> ${med.frequency}
                </p>
                <div style="background:var(--bg-surface-soft); padding:0.6rem 0.85rem; border-radius:var(--radius-sm); font-size:0.95rem; margin-bottom:1.25rem;">
                  <strong>Instructions:</strong> ${med.instructions || 'None'}
                </div>
              </div>

              <div style="display:flex; gap:0.5rem; border-top:1px solid var(--border-subtle); padding-top:1rem; flex-wrap:wrap;">
                <button class="btn btn-outline btn-edit-med" data-id="${med.id}" style="flex:1; padding:0.6rem 1rem; font-size:0.95rem;">
                  ✏️ Edit
                </button>
                <button class="btn btn-outline btn-delete-med" data-id="${med.id}" style="flex:1; padding:0.6rem 1rem; font-size:0.95rem; color:var(--danger-600); border-color:#fecaca;">
                  🗑️ Delete
                </button>
                <a href="history.html?med=${encodeURIComponent(med.name)}" class="btn btn-ghost" style="padding:0.6rem 0.8rem; font-size:0.95rem;">
                  📜 History
                </a>
              </div>
            </div>
          `).join('')}
        </div>
      `;

      // Event handlers for Edit and Delete
      container.querySelectorAll('.btn-edit-med').forEach(btn => {
        btn.addEventListener('click', () => {
          this.openEditMedicationModal(btn.dataset.id);
        });
      });

      container.querySelectorAll('.btn-delete-med').forEach(btn => {
        btn.addEventListener('click', () => {
          if (confirm('Are you sure you want to delete this medication from schedule?')) {
            window.MediStorage.deleteMedication(btn.dataset.id);
            window.MediApp.showToast('Medication removed.', 'info');
            this.render();
          }
        });
      });
    },

    bindManagementEvents() {
      const openAddBtn = document.getElementById('open-add-medication-modal');
      if (openAddBtn) {
        openAddBtn.addEventListener('click', () => {
          this.openAddMedicationModal();
        });
      }
    },

    openAddMedicationModal() {
      let modal = document.getElementById('add-med-modal-backdrop');
      if (!modal) {
        modal = document.createElement('div');
        modal.id = 'add-med-modal-backdrop';
        modal.className = 'modal-backdrop';
        modal.innerHTML = `
          <div class="modal-dialog" role="dialog" aria-modal="true" aria-labelledby="add-med-title">
            <button class="modal-close-btn" id="add-med-close">&times;</button>
            <h2 id="add-med-title" style="font-size:1.75rem; font-weight:800; color:var(--primary-900); margin-bottom:1.25rem;">
              ➕ Add New Medication
            </h2>

            <form id="add-med-form" novalidate>
              <div class="form-group">
                <label class="form-label" for="add-med-name">Medicine Name *</label>
                <input type="text" id="add-med-name" class="form-control" placeholder="e.g. Blood Pressure Medicine, Metformin" required>
              </div>

              <div class="form-row-2">
                <div class="form-group">
                  <label class="form-label" for="add-med-dosage">Dosage *</label>
                  <input type="text" id="add-med-dosage" class="form-control" placeholder="e.g. 1 tablet (5mg)" required>
                </div>
                <div class="form-group">
                  <label class="form-label" for="add-med-time">Scheduled Time *</label>
                  <input type="time" id="add-med-time" class="form-control" value="08:00" required>
                </div>
              </div>

              <div class="form-row-2">
                <div class="form-group">
                  <label class="form-label" for="add-med-freq">Frequency</label>
                  <select id="add-med-freq" class="form-control">
                    <option value="Once a day">Once a day</option>
                    <option value="Twice a day">Twice a day</option>
                    <option value="Three times a day">Three times a day</option>
                    <option value="Custom">Custom</option>
                  </select>
                </div>
                <div class="form-group">
                  <label class="form-label" for="add-med-start">Start Date</label>
                  <input type="date" id="add-med-start" class="form-control">
                </div>
              </div>

              <div class="form-group">
                <label class="form-label" for="add-med-instructions">Instructions</label>
                <textarea id="add-med-instructions" class="form-control" rows="2" placeholder="e.g. Take with breakfast and plenty of water"></textarea>
              </div>

              <div class="form-group" style="display:flex; align-items:center; gap:0.75rem;">
                <input type="checkbox" id="add-med-reminder" style="width:20px; height:20px;" checked>
                <label for="add-med-reminder" style="font-weight:600; cursor:pointer;">Enable automated alerts & reminders</label>
              </div>

              <div style="display:flex; justify-content:flex-end; gap:0.75rem; margin-top:1.5rem;">
                <button type="button" class="btn btn-outline" id="add-med-cancel">Cancel</button>
                <button type="submit" class="btn btn-primary">Save Medication</button>
              </div>
            </form>
          </div>
        `;
        document.body.appendChild(modal);

        document.getElementById('add-med-close')?.addEventListener('click', () => modal.classList.remove('open'));
        document.getElementById('add-med-cancel')?.addEventListener('click', () => modal.classList.remove('open'));

        // Form submission
        document.getElementById('add-med-form')?.addEventListener('submit', (e) => {
          e.preventDefault();
          const name = document.getElementById('add-med-name').value;
          const dosage = document.getElementById('add-med-dosage').value;
          const time = document.getElementById('add-med-time').value;
          const frequency = document.getElementById('add-med-freq').value;
          const startDate = document.getElementById('add-med-start').value;
          const instructions = document.getElementById('add-med-instructions').value;
          const reminderEnabled = document.getElementById('add-med-reminder').checked;

          if (!name.trim() || !dosage.trim() || !time.trim()) {
            alert('Please fill out the medicine name, dosage, and scheduled time.');
            return;
          }

          window.MediStorage.addMedication({
            name,
            dosage,
            time,
            frequency,
            startDate,
            instructions,
            reminderEnabled
          });

          window.MediApp.showToast('✓ Medication added to your schedule.', 'success');
          modal.classList.remove('open');
          document.getElementById('add-med-form').reset();
          this.render();
        });
      }

      // Default start date to today
      const dateInput = document.getElementById('add-med-start');
      if (dateInput) dateInput.value = new Date().toISOString().split('T')[0];

      modal.classList.add('open');
    },

    openEditMedicationModal(id) {
      const med = window.MediStorage.getMedicationById(id);
      if (!med) return;

      let modal = document.getElementById('edit-med-modal-backdrop');
      if (!modal) {
        modal = document.createElement('div');
        modal.id = 'edit-med-modal-backdrop';
        modal.className = 'modal-backdrop';
        modal.innerHTML = `
          <div class="modal-dialog" role="dialog" aria-modal="true" aria-labelledby="edit-med-title">
            <button class="modal-close-btn" id="edit-med-close">&times;</button>
            <h2 id="edit-med-title" style="font-size:1.75rem; font-weight:800; color:var(--primary-900); margin-bottom:1.25rem;">
              ✏️ Edit Medication
            </h2>

            <form id="edit-med-form">
              <input type="hidden" id="edit-med-id">
              <div class="form-group">
                <label class="form-label" for="edit-med-name">Medicine Name *</label>
                <input type="text" id="edit-med-name" class="form-control" required>
              </div>

              <div class="form-row-2">
                <div class="form-group">
                  <label class="form-label" for="edit-med-dosage">Dosage *</label>
                  <input type="text" id="edit-med-dosage" class="form-control" required>
                </div>
                <div class="form-group">
                  <label class="form-label" for="edit-med-time">Scheduled Time *</label>
                  <input type="time" id="edit-med-time" class="form-control" required>
                </div>
              </div>

              <div class="form-group">
                <label class="form-label" for="edit-med-freq">Frequency</label>
                <select id="edit-med-freq" class="form-control">
                  <option value="Once a day">Once a day</option>
                  <option value="Twice a day">Twice a day</option>
                  <option value="Three times a day">Three times a day</option>
                  <option value="Custom">Custom</option>
                </select>
              </div>

              <div class="form-group">
                <label class="form-label" for="edit-med-instructions">Instructions</label>
                <textarea id="edit-med-instructions" class="form-control" rows="2"></textarea>
              </div>

              <div style="display:flex; justify-content:flex-end; gap:0.75rem; margin-top:1.5rem;">
                <button type="button" class="btn btn-outline" id="edit-med-cancel">Cancel</button>
                <button type="submit" class="btn btn-primary">Save Changes</button>
              </div>
            </form>
          </div>
        `;
        document.body.appendChild(modal);

        document.getElementById('edit-med-close')?.addEventListener('click', () => modal.classList.remove('open'));
        document.getElementById('edit-med-cancel')?.addEventListener('click', () => modal.classList.remove('open'));

        document.getElementById('edit-med-form')?.addEventListener('submit', (e) => {
          e.preventDefault();
          const targetId = document.getElementById('edit-med-id').value;
          const name = document.getElementById('edit-med-name').value;
          const dosage = document.getElementById('edit-med-dosage').value;
          const time = document.getElementById('edit-med-time').value;
          const frequency = document.getElementById('edit-med-freq').value;
          const instructions = document.getElementById('edit-med-instructions').value;

          window.MediStorage.updateMedication(targetId, {
            name,
            dosage,
            time,
            frequency,
            instructions
          });

          window.MediApp.showToast('✓ Medication updated successfully.', 'success');
          modal.classList.remove('open');
          this.render();
        });
      }

      document.getElementById('edit-med-id').value = med.id;
      document.getElementById('edit-med-name').value = med.name;
      document.getElementById('edit-med-dosage').value = med.dosage;
      document.getElementById('edit-med-time').value = med.time || '08:00';
      document.getElementById('edit-med-freq').value = med.frequency;
      document.getElementById('edit-med-instructions').value = med.instructions || '';

      modal.classList.add('open');
    },

    // ==========================================================================
    // 3. Medication History Page (history.html)
    // ==========================================================================

    renderHistoryPage() {
      const statsContainer = document.getElementById('history-adherence-stats-container');
      const tableContainer = document.getElementById('history-records-container');
      if (!tableContainer) return;

      const stats = window.MediStorage.getAdherenceStats();
      const history = window.MediStorage.getHistory();

      if (statsContainer) {
        statsContainer.innerHTML = `
          <div class="metrics-row" style="margin-bottom:1.5rem;">
            <div class="metric-card">
              <span class="metric-label">Adherence Activity</span>
              <span class="metric-value color-adherence">${stats.percentage}%</span>
              <span style="font-size:0.85rem; color:var(--text-muted); margin-top:0.35rem;">Recorded scheduled activity</span>
            </div>
            <div class="metric-card">
              <span class="metric-label">Taken</span>
              <span class="metric-value color-taken">${stats.taken}</span>
              <span style="font-size:0.85rem; color:var(--text-muted); margin-top:0.35rem;">Confirmed on schedule</span>
            </div>
            <div class="metric-card">
              <span class="metric-label">Delayed</span>
              <span class="metric-value color-delayed">${stats.delayed}</span>
              <span style="font-size:0.85rem; color:var(--text-muted); margin-top:0.35rem;">Postponed / Reminded</span>
            </div>
            <div class="metric-card">
              <span class="metric-label">Missed</span>
              <span class="metric-value color-missed">${stats.missed}</span>
              <span style="font-size:0.85rem; color:var(--text-muted); margin-top:0.35rem;">Unconfirmed cutoff</span>
            </div>
          </div>
          <div style="font-size:0.85rem; color:var(--text-subtle); margin-bottom:1.5rem;">
            ℹ️ <em>Note: Adherence percentage reflects routine tracking adherence only and is not a medical health score.</em>
          </div>
        `;
      }

      const activeFilter = window.currentHistoryFilter || 'all';

      const filtered = history.filter(item => {
        if (activeFilter === 'all') return true;
        return item.status.toLowerCase() === activeFilter.toLowerCase();
      });

      if (filtered.length === 0) {
        tableContainer.innerHTML = '<div class="card"><p style="text-align:center; color:var(--text-muted); font-size:1.15rem;">No history records found for this filter.</p></div>';
        return;
      }

      tableContainer.innerHTML = `
        <div style="overflow-x:auto;">
          <table style="width:100%; border-collapse:collapse; background:white; border-radius:var(--radius-lg); overflow:hidden; box-shadow:var(--shadow-sm);">
            <thead>
              <tr style="background:var(--primary-50); border-bottom:2px solid var(--primary-100); text-align:left;">
                <th style="padding:1rem 1.25rem; font-weight:800; color:var(--primary-900);">Medicine</th>
                <th style="padding:1rem; font-weight:800; color:var(--primary-900);">Scheduled Time</th>
                <th style="padding:1rem; font-weight:800; color:var(--primary-900);">Actual Confirmation</th>
                <th style="padding:1rem; font-weight:800; color:var(--primary-900);">Status</th>
                <th style="padding:1rem; font-weight:800; color:var(--primary-900);">Date</th>
                <th style="padding:1rem 1.25rem; font-weight:800; color:var(--primary-900);">Notes</th>
              </tr>
            </thead>
            <tbody>
              ${filtered.map(row => `
                <tr style="border-bottom:1px solid var(--border-subtle); font-size:1.05rem;">
                  <td style="padding:1rem 1.25rem; font-weight:700; color:var(--text-main);">
                    💊 ${row.medName}
                  </td>
                  <td style="padding:1rem; color:var(--text-muted);">
                    ${row.scheduledTime}
                  </td>
                  <td style="padding:1rem; font-weight:600; color: ${row.status === 'Taken' ? 'var(--success-700)' : 'var(--text-muted)'};">
                    ${row.actualConfirmationTime || '-'}
                  </td>
                  <td style="padding:1rem;">
                    <span class="status-badge status-${row.status.toLowerCase()}">${row.status}</span>
                  </td>
                  <td style="padding:1rem; color:var(--text-muted); font-size:0.95rem;">
                    ${row.date}
                  </td>
                  <td style="padding:1rem 1.25rem; color:var(--text-subtle); font-size:0.95rem;">
                    ${row.notes || '-'}
                  </td>
                </tr>
              `).join('')}
            </tbody>
          </table>
        </div>
      `;
    },

    bindHistoryEvents() {
      const filterBtns = document.querySelectorAll('.history-filter-btn');
      filterBtns.forEach(btn => {
        btn.addEventListener('click', () => {
          filterBtns.forEach(b => b.classList.remove('active'));
          btn.classList.add('active');
          window.currentHistoryFilter = btn.dataset.filter;
          this.renderHistoryPage();
        });
      });
    }
  };

  window.MedicationController = MedicationController;

  document.addEventListener('DOMContentLoaded', () => {
    MedicationController.init();
  });

})(window);
