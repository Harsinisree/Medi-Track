/**
 * MediTrack - Caregiver Support & Alerts Controller
 * Manages remote caregiver dashboard, live metrics, alert escalation lifecycle,
 * alert acknowledgement, and care circle management.
 */

(function (window) {
  'use strict';

  const CaregiverController = {
    init() {
      this.bindEvents();
      this.render();

      window.addEventListener('meditrack:datachange', () => {
        this.render();
      });
    },

    render() {
      if (document.getElementById('caregiver-dashboard-page')) {
        this.renderCaregiverDashboard();
      }
      if (document.getElementById('caregiver-alerts-page')) {
        this.renderAlertsSection();
      }
      if (document.getElementById('care-circle-page')) {
        this.renderCareCircle();
      }
    },

    // ==========================================================================
    // 1. Caregiver Dashboard (caregiver.html)
    // ==========================================================================

    renderCaregiverDashboard() {
      this.renderMetrics();
      this.renderSupportStatusBanner();
      this.renderTodayMedicationStatus();
      this.renderAlertsSection();
      this.renderCareCircle();
    },

    renderMetrics() {
      const metricsContainer = document.getElementById('caregiver-metrics-container');
      if (!metricsContainer) return;

      const medications = window.MediStorage.getMedications();
      const adherence = window.MediStorage.getAdherenceStats();

      const totalToday = medications.length;
      let takenToday = 0;
      let delayedToday = 0;
      let missedToday = 0;

      medications.forEach(m => {
        if (m.status === 'Taken') takenToday++;
        else if (m.status === 'Delayed') delayedToday++;
        else if (m.status === 'Missed') missedToday++;
      });

      metricsContainer.innerHTML = `
        <div class="metric-card">
          <span class="metric-label">Today's Medicines</span>
          <span class="metric-value">${totalToday}</span>
          <span style="font-size:0.85rem; color:var(--text-muted); margin-top:0.35rem;">Prescribed scheduled doses</span>
        </div>
        <div class="metric-card">
          <span class="metric-label">Taken</span>
          <span class="metric-value color-taken">${takenToday}</span>
          <span style="font-size:0.85rem; color:var(--text-muted); margin-top:0.35rem;">Confirmed by Lakshmi</span>
        </div>
        <div class="metric-card">
          <span class="metric-label">Delayed</span>
          <span class="metric-value color-delayed">${delayedToday}</span>
          <span style="font-size:0.85rem; color:var(--text-muted); margin-top:0.35rem;">Postponed reminder</span>
        </div>
        <div class="metric-card">
          <span class="metric-label">Missed</span>
          <span class="metric-value color-missed">${missedToday}</span>
          <span style="font-size:0.85rem; color:var(--text-muted); margin-top:0.35rem;">Overdue cutoff</span>
        </div>
        <div class="metric-card">
          <span class="metric-label">Adherence</span>
          <span class="metric-value color-adherence">${adherence.percentage}%</span>
          <span style="font-size:0.85rem; color:var(--text-muted); margin-top:0.35rem;">Routine tracking activity</span>
        </div>
      `;
    },

    renderSupportStatusBanner() {
      const banner = document.getElementById('support-status-banner-container');
      if (!banner) return;

      const status = window.MediStorage.getSupportStatus();
      let bannerClass = 'state-normal';
      let icon = '🟢';

      if (status.state === 'Attention Needed') {
        bannerClass = 'state-attention';
        icon = '🟡';
      } else if (status.state === 'Support Required') {
        bannerClass = 'state-critical';
        icon = '🔴';
      }

      banner.innerHTML = `
        <div class="support-status-banner ${bannerClass}">
          <div style="display:flex; align-items:center; gap:1rem;">
            <span style="font-size:2rem;">${icon}</span>
            <div>
              <h3 style="font-size:1.25rem; font-weight:800; margin-bottom:2px;">
                SUPPORT STATUS: ${status.state.toUpperCase()}
              </h3>
              <p style="font-size:1.05rem; opacity:0.95;">
                ${status.reason || 'All routines currently on schedule.'}
              </p>
            </div>
          </div>
          <div style="font-size:0.9rem; opacity:0.85; font-weight:600;">
            Escalation Rule: Routine Activity Only
          </div>
        </div>
      `;
    },

    renderTodayMedicationStatus() {
      const container = document.getElementById('caregiver-today-meds-list');
      if (!container) return;

      const medications = window.MediStorage.getMedications();

      container.innerHTML = medications.map(med => {
        let statusBadgeClass = 'status-upcoming';
        let statusIcon = '🔵';
        let detailText = `Upcoming at ${med.displayTime}`;

        if (med.status === 'Taken') {
          statusBadgeClass = 'status-taken';
          statusIcon = '✓';
          detailText = `Taken at ${med.actualConfirmationTime || '8:07 AM'}`;
        } else if (med.status === 'Delayed') {
          statusBadgeClass = 'status-delayed';
          statusIcon = '⚠️';
          detailText = `Delayed (Reminder requested)`;
        } else if (med.status === 'Missed') {
          statusBadgeClass = 'status-missed';
          statusIcon = '🚨';
          detailText = `Unconfirmed (Cutoff reached)`;
        } else if (med.status === 'Due Now') {
          statusBadgeClass = 'status-due-now';
          statusIcon = '⏰';
          detailText = `Due now (Awaiting Lakshmi)`;
        }

        return `
          <div class="med-card" data-med-id="${med.id}" style="margin-bottom:1rem; cursor:pointer;" tabindex="0" role="button">
            <div style="display:flex; justify-content:space-between; align-items:center;">
              <div>
                <h4 style="font-size:1.25rem; font-weight:800; color:var(--text-main);">
                  💊 ${med.name}
                </h4>
                <p style="font-size:1rem; color:var(--text-muted); margin-top:2px;">
                  ${med.dosage} • Scheduled: <strong>${med.displayTime}</strong>
                </p>
                <p style="font-size:0.95rem; color:var(--primary-800); font-weight:600; margin-top:4px;">
                  ${detailText}
                </p>
              </div>
              <span class="status-badge ${statusBadgeClass}">
                ${statusIcon} ${med.status}
              </span>
            </div>
          </div>
        `;
      }).join('');

      // Open details modal
      container.querySelectorAll('.med-card').forEach(card => {
        card.addEventListener('click', () => {
          if (window.MedicationController) {
            window.MedicationController.openMedicationDetailModal(card.dataset.medId);
          }
        });
      });
    },

    // ==========================================================================
    // 2. Caregiver Alerts Section & Acknowledgement (Section 12)
    // ==========================================================================

    renderAlertsSection() {
      const container = document.getElementById('caregiver-alerts-list');
      if (!container) return;

      const alerts = window.MediStorage.getAlerts();

      if (alerts.length === 0) {
        container.innerHTML = `
          <div class="card" style="text-align:center; padding:2.5rem 1rem;">
            <p style="font-size:1.2rem; color:var(--text-muted);">No active caregiver alerts. All routines normal.</p>
          </div>
        `;
        return;
      }

      container.innerHTML = alerts.map(alert => {
        const isAck = alert.acknowledged;
        const isCritical = alert.level === 'Support Required';
        const cardClass = isAck ? 'alert-acknowledged' : (isCritical ? 'alert-support-required' : 'alert-attention');

        return `
          <div class="alert-item-card ${cardClass}">
            <div style="flex-grow:1;">
              <div style="display:flex; align-items:center; gap:0.6rem; margin-bottom:0.4rem;">
                <span class="status-badge ${isCritical ? 'status-missed' : 'status-delayed'}">
                  ${isCritical ? '🔴' : '🟡'} ${alert.level}
                </span>
                <span style="font-size:0.85rem; color:var(--text-muted);">${alert.timestamp}</span>
              </div>
              <h4 style="font-size:1.25rem; font-weight:800; color:var(--text-main); margin-bottom:0.25rem;">
                ${alert.title}
              </h4>
              <p style="font-size:1.05rem; color:var(--text-muted); line-height:1.45;">
                ${alert.message}
              </p>
              ${isAck ? `
                <div style="margin-top:0.5rem; font-size:0.9rem; color:var(--success-700); font-weight:700;">
                  ✓ Acknowledged by Priya at ${alert.acknowledgedAt || 'recently'}
                </div>
              ` : ''}
            </div>

            <div style="display:flex; flex-direction:column; gap:0.5rem; min-width:140px;">
              ${!isAck ? `
                <button class="btn btn-warning btn-acknowledge-alert" data-id="${alert.id}" style="padding:0.6rem 1rem; font-size:0.95rem;">
                  ✓ Acknowledge
                </button>
              ` : `
                <button class="btn btn-outline" disabled style="padding:0.6rem 1rem; font-size:0.95rem; opacity:0.6;">
                  Acknowledged
                </button>
              `}
              <button class="btn btn-outline btn-view-alert-details" data-id="${alert.id}" style="padding:0.55rem 1rem; font-size:0.9rem;">
                🔍 View Details
              </button>
            </div>
          </div>
        `;
      }).join('');

      // Acknowledge button handlers
      container.querySelectorAll('.btn-acknowledge-alert').forEach(btn => {
        btn.addEventListener('click', () => {
          const id = btn.dataset.id;
          window.MediStorage.acknowledgeAlert(id);
          window.MediApp.showToast('✓ Alert acknowledged.', 'success');
          this.render();
        });
      });

      // View details button handlers
      container.querySelectorAll('.btn-view-alert-details').forEach(btn => {
        btn.addEventListener('click', () => {
          const alert = window.MediStorage.getAlerts().find(a => a.id === btn.dataset.id);
          if (alert) {
            alertModal(alert);
          }
        });
      });

      function alertModal(alert) {
        alert(`MediTrack Alert Details:\n\nLevel: ${alert.level}\nTitle: ${alert.title}\nDetails: ${alert.message}\nTime: ${alert.timestamp}\nStatus: ${alert.acknowledged ? 'Acknowledged' : 'Active Attention Required'}`);
      }
    },

    // ==========================================================================
    // 3. Care Circle Management (Section 13)
    // ==========================================================================

    renderCareCircle() {
      const container = document.getElementById('care-circle-members-grid');
      if (!container) return;

      const caregivers = window.MediStorage.getCaregivers();

      container.innerHTML = `
        <div class="care-circle-grid">
          ${caregivers.map(cg => `
            <div class="caregiver-card">
              <div class="user-avatar-circle" style="width:54px; height:54px; font-size:1.75rem;">
                ${cg.avatar || '👩‍⚕️'}
              </div>
              <div style="flex-grow:1;">
                <div style="display:flex; align-items:center; justify-content:space-between;">
                  <h4 style="font-size:1.25rem; font-weight:800; color:var(--text-main);">${cg.name}</h4>
                  ${cg.isPrimary ? '<span class="demo-badge">Primary</span>' : ''}
                </div>
                <p style="font-size:1rem; color:var(--text-muted); font-weight:600;">Relationship: ${cg.relationship}</p>
                <p style="font-size:0.85rem; color:var(--text-subtle);">${cg.phone}</p>
              </div>
            </div>
          `).join('')}

          <div class="caregiver-card" id="btn-open-add-caregiver" style="border: 2px dashed var(--primary-300); background:var(--primary-50); cursor:pointer; justify-content:center; text-align:center; padding:1.5rem;" role="button" tabindex="0">
            <div>
              <span style="font-size:2rem; display:block; margin-bottom:0.4rem;">➕</span>
              <strong style="font-size:1.15rem; color:var(--primary-800);">Add Family / Caregiver</strong>
              <p style="font-size:0.85rem; color:var(--text-muted);">Expand Lakshmi's care circle</p>
            </div>
          </div>
        </div>
      `;

      document.getElementById('btn-open-add-caregiver')?.addEventListener('click', () => {
        this.openAddCaregiverModal();
      });
    },

    openAddCaregiverModal() {
      let modal = document.getElementById('add-caregiver-modal-backdrop');
      if (!modal) {
        modal = document.createElement('div');
        modal.id = 'add-caregiver-modal-backdrop';
        modal.className = 'modal-backdrop';
        modal.innerHTML = `
          <div class="modal-dialog" role="dialog" aria-modal="true" aria-labelledby="add-cg-title">
            <button class="modal-close-btn" id="add-cg-close">&times;</button>
            <h2 id="add-cg-title" style="font-size:1.75rem; font-weight:800; color:var(--primary-900); margin-bottom:1.25rem;">
              👥 Add to Care Circle
            </h2>

            <form id="add-caregiver-form">
              <div class="form-group">
                <label class="form-label" for="add-cg-name">Caregiver Name *</label>
                <input type="text" id="add-cg-name" class="form-control" placeholder="e.g. Rahul, Dr. Ananya" required>
              </div>

              <div class="form-group">
                <label class="form-label" for="add-cg-rel">Relationship *</label>
                <input type="text" id="add-cg-rel" class="form-control" placeholder="e.g. Son, Home Nurse, Neighbor" required>
              </div>

              <div class="form-row-2">
                <div class="form-group">
                  <label class="form-label" for="add-cg-phone">Contact Number</label>
                  <input type="tel" id="add-cg-phone" class="form-control" placeholder="+1 (555) 019-2834">
                </div>
                <div class="form-group">
                  <label class="form-label" for="add-cg-email">Email</label>
                  <input type="email" id="add-cg-email" class="form-control" placeholder="care@family.org">
                </div>
              </div>

              <div style="font-size:0.85rem; color:var(--text-muted); margin-bottom:1.25rem;">
                ℹ️ <em>In this hackathon prototype, notifications are simulated in-app. Real external SMS/telephony is not charged.</em>
              </div>

              <div style="display:flex; justify-content:flex-end; gap:0.75rem;">
                <button type="button" class="btn btn-outline" id="add-cg-cancel">Cancel</button>
                <button type="submit" class="btn btn-primary">Add Caregiver</button>
              </div>
            </form>
          </div>
        `;
        document.body.appendChild(modal);

        document.getElementById('add-cg-close')?.addEventListener('click', () => modal.classList.remove('open'));
        document.getElementById('add-cg-cancel')?.addEventListener('click', () => modal.classList.remove('open'));

        document.getElementById('add-caregiver-form')?.addEventListener('submit', (e) => {
          e.preventDefault();
          const name = document.getElementById('add-cg-name').value;
          const relationship = document.getElementById('add-cg-rel').value;
          const phone = document.getElementById('add-cg-phone').value;
          const email = document.getElementById('add-cg-email').value;

          if (!name.trim() || !relationship.trim()) {
            alert('Please specify name and relationship.');
            return;
          }

          window.MediStorage.addCaregiver({
            name,
            relationship,
            phone,
            email,
            avatar: '👨‍👩‍👧'
          });

          window.MediApp.showToast(`✓ ${name} added to care circle.`, 'success');
          modal.classList.remove('open');
          document.getElementById('add-caregiver-form').reset();
          this.render();
        });
      }

      modal.classList.add('open');
    },

    bindEvents() {
      // Any additional page events
    }
  };

  window.CaregiverController = CaregiverController;

  document.addEventListener('DOMContentLoaded', () => {
    CaregiverController.init();
  });

})(window);
