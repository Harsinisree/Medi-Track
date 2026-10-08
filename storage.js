/**
 * MediTrack - Core Data Storage & State Engine
 * Manages localStorage persistence, demo seed data, medication lifecycle,
 * alert escalation, and adherence calculations.
 */

(function (window) {
  'use strict';

  const STORAGE_KEYS = {
    MEDICATIONS: 'meditrack_medications',
    HISTORY: 'meditrack_history',
    ALERTS: 'meditrack_alerts',
    CAREGIVERS: 'meditrack_caregivers',
    SETTINGS: 'meditrack_settings',
    ROLE: 'meditrack_current_role',
    SUPPORT_STATUS: 'meditrack_support_status',
    LAST_UPDATED: 'meditrack_last_sync'
  };

  // Default seed data matching prompt requirements
  const DEFAULT_SETTINGS = {
    largeText: false,
    highContrast: false,
    simpleMode: false,
    language: 'en', // 'en' or 'ta'
    speechEnabled: true
  };

  const DEFAULT_CAREGIVERS = [
    {
      id: 'cg-1',
      name: 'Priya',
      relationship: 'Daughter',
      isPrimary: true,
      phone: '+1 (555) 014-2983',
      email: 'priya.care@meditrack.org',
      avatar: '👩‍⚕️',
      notifications: true,
      addedDate: '2026-09-01'
    }
  ];

  function getTodayDateStr() {
    const d = new Date();
    return d.toISOString().split('T')[0];
  }

  function formatCurrentTime() {
    const d = new Date();
    let hours = d.getHours();
    const minutes = d.getMinutes().toString().padStart(2, '0');
    const ampm = hours >= 12 ? 'PM' : 'AM';
    hours = hours % 12;
    hours = hours ? hours : 12; // 12 instead of 0
    return `${hours}:${minutes} ${ampm}`;
  }

  function getDefaultMedications() {
    const today = getTodayDateStr();
    return [
      {
        id: 'med-1',
        name: 'Morning Medicine',
        genericName: 'Amlodipine (Blood Pressure)',
        dosage: '1 tablet (5mg)',
        time: '08:00',
        displayTime: '8:00 AM',
        frequency: 'Once a day',
        startDate: '2026-10-01',
        endDate: '',
        instructions: 'Take with breakfast and a full glass of water',
        reminderEnabled: true,
        status: 'Taken', // Upcoming, Due Now, Taken, Delayed, Missed, Skipped
        actualConfirmationTime: '8:07 AM',
        takenToday: true,
        date: today,
        category: 'Morning',
        icon: '💊',
        badgeColor: 'green'
      },
      {
        id: 'med-2',
        name: 'Vitamin D',
        genericName: 'Cholecalciferol 1000 IU',
        dosage: '1 tablet',
        time: '13:00',
        displayTime: '1:00 PM',
        frequency: 'Once a day',
        startDate: '2026-10-01',
        endDate: '',
        instructions: 'Take right after lunch with milk or meal',
        reminderEnabled: true,
        status: 'Taken',
        actualConfirmationTime: '1:05 PM',
        takenToday: true,
        date: today,
        category: 'Afternoon',
        icon: '☀️',
        badgeColor: 'green'
      },
      {
        id: 'med-3',
        name: 'Blood Pressure Medicine',
        genericName: 'Telmisartan 40mg',
        dosage: '1 tablet',
        time: '20:00',
        displayTime: '8:00 PM',
        frequency: 'Once a day',
        startDate: '2026-10-01',
        endDate: '',
        instructions: 'Take 30 minutes before evening dinner. Do not skip.',
        reminderEnabled: true,
        status: 'Upcoming', // Can be flipped to Due Now, Taken, Delayed, Missed
        actualConfirmationTime: null,
        takenToday: false,
        date: today,
        category: 'Evening',
        icon: '❤️',
        badgeColor: 'blue'
      }
    ];
  }

  function getDefaultHistory() {
    const today = getTodayDateStr();
    return [
      {
        id: 'hist-1',
        medId: 'med-1',
        medName: 'Morning Medicine',
        dosage: '1 tablet (5mg)',
        scheduledTime: '8:00 AM',
        actualConfirmationTime: '8:07 AM',
        status: 'Taken',
        date: today,
        notes: 'Confirmed by Lakshmi on dashboard'
      },
      {
        id: 'hist-2',
        medId: 'med-2',
        medName: 'Vitamin D',
        dosage: '1 tablet',
        scheduledTime: '1:00 PM',
        actualConfirmationTime: '1:05 PM',
        status: 'Taken',
        date: today,
        notes: 'Confirmed by Lakshmi via voice'
      },
      // Previous logs for authentic 85% demo stats:
      // Taken: 15 past + 2 today = 17
      // Delayed: 2 past = 2
      // Missed: 1 past = 1
      // Total: 20. Adherence: 17/20 = 85%
      { id: 'hist-3', medName: 'Evening Medicine', dosage: '1 tablet', scheduledTime: '8:00 PM', actualConfirmationTime: '8:12 PM', status: 'Taken', date: '2026-10-08', notes: 'Taken on schedule' },
      { id: 'hist-4', medName: 'Vitamin D', dosage: '1 tablet', scheduledTime: '1:00 PM', actualConfirmationTime: '1:10 PM', status: 'Taken', date: '2026-10-08', notes: 'Taken with lunch' },
      { id: 'hist-5', medName: 'Morning Medicine', dosage: '1 tablet', scheduledTime: '8:00 AM', actualConfirmationTime: '8:05 AM', status: 'Taken', date: '2026-10-08', notes: 'Taken on schedule' },
      { id: 'hist-6', medName: 'Evening Medicine', dosage: '1 tablet', scheduledTime: '8:00 PM', actualConfirmationTime: '9:25 PM', status: 'Delayed', date: '2026-10-07', notes: 'Confirmed after reminder' },
      { id: 'hist-7', medName: 'Vitamin D', dosage: '1 tablet', scheduledTime: '1:00 PM', actualConfirmationTime: '1:02 PM', status: 'Taken', date: '2026-10-07', notes: 'Taken on schedule' },
      { id: 'hist-8', medName: 'Morning Medicine', dosage: '1 tablet', scheduledTime: '8:00 AM', actualConfirmationTime: '8:15 AM', status: 'Taken', date: '2026-10-07', notes: 'Taken on schedule' },
      { id: 'hist-9', medName: 'Evening Medicine', dosage: '1 tablet', scheduledTime: '8:00 PM', actualConfirmationTime: '-', status: 'Missed', date: '2026-10-06', notes: 'No confirmation received' },
      { id: 'hist-10', medName: 'Vitamin D', dosage: '1 tablet', scheduledTime: '1:00 PM', actualConfirmationTime: '1:00 PM', status: 'Taken', date: '2026-10-06', notes: 'Taken on schedule' },
      { id: 'hist-11', medName: 'Morning Medicine', dosage: '1 tablet', scheduledTime: '8:00 AM', actualConfirmationTime: '8:04 AM', status: 'Taken', date: '2026-10-06', notes: 'Taken on schedule' },
      { id: 'hist-12', medName: 'Evening Medicine', dosage: '1 tablet', scheduledTime: '8:00 PM', actualConfirmationTime: '8:08 PM', status: 'Taken', date: '2026-10-05', notes: 'Taken on schedule' },
      { id: 'hist-13', medName: 'Vitamin D', dosage: '1 tablet', scheduledTime: '1:00 PM', actualConfirmationTime: '2:15 PM', status: 'Delayed', date: '2026-10-05', notes: 'Delayed confirmation' },
      { id: 'hist-14', medName: 'Morning Medicine', dosage: '1 tablet', scheduledTime: '8:00 AM', actualConfirmationTime: '8:02 AM', status: 'Taken', date: '2026-10-05', notes: 'Taken on schedule' },
      { id: 'hist-15', medName: 'Evening Medicine', dosage: '1 tablet', scheduledTime: '8:00 PM', actualConfirmationTime: '8:11 PM', status: 'Taken', date: '2026-10-04', notes: 'Taken on schedule' },
      { id: 'hist-16', medName: 'Vitamin D', dosage: '1 tablet', scheduledTime: '1:00 PM', actualConfirmationTime: '1:05 PM', status: 'Taken', date: '2026-10-04', notes: 'Taken on schedule' },
      { id: 'hist-17', medName: 'Morning Medicine', dosage: '1 tablet', scheduledTime: '8:00 AM', actualConfirmationTime: '8:00 AM', status: 'Taken', date: '2026-10-04', notes: 'Taken on schedule' },
      { id: 'hist-18', medName: 'Evening Medicine', dosage: '1 tablet', scheduledTime: '8:00 PM', actualConfirmationTime: '8:20 PM', status: 'Taken', date: '2026-10-03', notes: 'Taken on schedule' },
      { id: 'hist-19', medName: 'Vitamin D', dosage: '1 tablet', scheduledTime: '1:00 PM', actualConfirmationTime: '1:03 PM', status: 'Taken', date: '2026-10-03', notes: 'Taken on schedule' },
      { id: 'hist-20', medName: 'Morning Medicine', dosage: '1 tablet', scheduledTime: '8:00 AM', actualConfirmationTime: '8:08 AM', status: 'Taken', date: '2026-10-03', notes: 'Taken on schedule' }
    ];
  }

  function getDefaultAlerts() {
    return [
      {
        id: 'alt-demo-1',
        level: 'Attention Needed', // 'Attention Needed' (🟡) or 'Support Required' (🔴)
        severity: 'warning',
        title: 'Medication Routine Monitoring',
        message: 'Evening Blood Pressure Medicine scheduled for 8:00 PM is coming up.',
        timestamp: 'Just now',
        medId: 'med-3',
        medName: 'Blood Pressure Medicine',
        acknowledged: false,
        createdDate: getTodayDateStr()
      }
    ];
  }

  // --- Core MediTrack Storage Class ---
  const MediStorage = {
    // Initialization: Ensure localStorage is hydrated
    init() {
      if (!localStorage.getItem(STORAGE_KEYS.MEDICATIONS)) {
        this.resetToDefaults();
      }
      this.ensureSchemaIntegrity();
    },

    ensureSchemaIntegrity() {
      if (!localStorage.getItem(STORAGE_KEYS.SETTINGS)) {
        localStorage.setItem(STORAGE_KEYS.SETTINGS, JSON.stringify(DEFAULT_SETTINGS));
      }
      if (!localStorage.getItem(STORAGE_KEYS.CAREGIVERS)) {
        localStorage.setItem(STORAGE_KEYS.CAREGIVERS, JSON.stringify(DEFAULT_CAREGIVERS));
      }
      if (!localStorage.getItem(STORAGE_KEYS.SUPPORT_STATUS)) {
        this.setSupportStatus('Normal', 'No overdue medication confirmations.');
      }
      if (!localStorage.getItem(STORAGE_KEYS.ROLE)) {
        localStorage.setItem(STORAGE_KEYS.ROLE, 'older-adult');
      }
    },

    resetToDefaults() {
      localStorage.setItem(STORAGE_KEYS.MEDICATIONS, JSON.stringify(getDefaultMedications()));
      localStorage.setItem(STORAGE_KEYS.HISTORY, JSON.stringify(getDefaultHistory()));
      localStorage.setItem(STORAGE_KEYS.ALERTS, JSON.stringify(getDefaultAlerts()));
      localStorage.setItem(STORAGE_KEYS.CAREGIVERS, JSON.stringify(DEFAULT_CAREGIVERS));
      localStorage.setItem(STORAGE_KEYS.SETTINGS, JSON.stringify(DEFAULT_SETTINGS));
      localStorage.setItem(STORAGE_KEYS.ROLE, 'older-adult');
      this.setSupportStatus('Normal', 'No overdue medication confirmations.');
      this.broadcastChange();
    },

    // --- Role Management ---
    getCurrentRole() {
      return localStorage.getItem(STORAGE_KEYS.ROLE) || 'older-adult';
    },

    setCurrentRole(role) {
      localStorage.setItem(STORAGE_KEYS.ROLE, role);
      this.broadcastChange();
    },

    // --- Medications CRUD ---
    getMedications() {
      try {
        const raw = localStorage.getItem(STORAGE_KEYS.MEDICATIONS);
        return raw ? JSON.parse(raw) : getDefaultMedications();
      } catch (e) {
        console.error('Failed to parse medications:', e);
        return getDefaultMedications();
      }
    },

    saveMedications(medications) {
      localStorage.setItem(STORAGE_KEYS.MEDICATIONS, JSON.stringify(medications));
      this.recalculateSupportStatus();
      this.broadcastChange();
    },

    getMedicationById(id) {
      const list = this.getMedications();
      return list.find(m => m.id === id) || null;
    },

    getNextMedication() {
      const list = this.getMedications();
      // Look for first upcoming or due or delayed medication
      const pending = list.find(m => m.status === 'Due Now') ||
                      list.find(m => m.status === 'Delayed') ||
                      list.find(m => m.status === 'Upcoming');
      if (pending) return pending;
      // If all taken, return the last taken or first
      return list[list.length - 1] || null;
    },

    addMedication(medData) {
      const list = this.getMedications();
      const newMed = {
        id: 'med-' + Date.now(),
        name: medData.name.trim(),
        genericName: medData.genericName ? medData.genericName.trim() : '',
        dosage: medData.dosage.trim(),
        time: medData.time,
        displayTime: this.formatTimeString(medData.time),
        frequency: medData.frequency || 'Once a day',
        startDate: medData.startDate || getTodayDateStr(),
        endDate: medData.endDate || '',
        instructions: medData.instructions ? medData.instructions.trim() : 'Take as directed',
        reminderEnabled: medData.reminderEnabled !== false,
        status: 'Upcoming',
        actualConfirmationTime: null,
        takenToday: false,
        date: getTodayDateStr(),
        category: this.getCategoryFromTime(medData.time),
        icon: '💊',
        badgeColor: 'blue'
      };

      list.push(newMed);
      this.saveMedications(list);
      return newMed;
    },

    updateMedication(id, updatedFields) {
      const list = this.getMedications();
      const idx = list.findIndex(m => m.id === id);
      if (idx === -1) return null;

      if (updatedFields.time) {
        updatedFields.displayTime = this.formatTimeString(updatedFields.time);
        updatedFields.category = this.getCategoryFromTime(updatedFields.time);
      }

      list[idx] = { ...list[idx], ...updatedFields };
      this.saveMedications(list);
      return list[idx];
    },

    deleteMedication(id) {
      const list = this.getMedications();
      const filtered = list.filter(m => m.id !== id);
      this.saveMedications(filtered);
    },

    // --- Medication Actions ---
    /**
     * Mark a medication as Taken.
     * Duplicate Dose Awareness check:
     * If already recorded as Taken, rejects and returns duplicate warning!
     */
    markAsTaken(id, source = 'dashboard') {
      const list = this.getMedications();
      const med = list.find(m => m.id === id);
      if (!med) {
        return { success: false, error: 'Medication not found.' };
      }

      // DUPLICATE DOSE CHECK
      if (med.status === 'Taken' || med.takenToday) {
        return {
          success: false,
          isDuplicate: true,
          message: `✓ This medication was already recorded as taken at ${med.actualConfirmationTime || 'earlier today'}.`,
          warning: 'If you are unsure about your medication, please contact your healthcare professional or caregiver.'
        };
      }

      const recordedTime = formatCurrentTime();
      med.status = 'Taken';
      med.actualConfirmationTime = recordedTime;
      med.takenToday = true;
      med.badgeColor = 'green';

      this.saveMedications(list);

      // Append to History log
      this.addHistoryEntry({
        medId: med.id,
        medName: med.name,
        dosage: med.dosage,
        scheduledTime: med.displayTime,
        actualConfirmationTime: recordedTime,
        status: 'Taken',
        date: getTodayDateStr(),
        notes: `Confirmed via ${source}`
      });

      // Clear any pending alerts for this medication
      this.resolveAlertForMedication(med.id);

      // Recalculate support status
      this.recalculateSupportStatus();

      return {
        success: true,
        recordedTime,
        message: `✓ Medication recorded at ${recordedTime}.`
      };
    },

    markAsDelayed(id, minutes = 15) {
      const list = this.getMedications();
      const med = list.find(m => m.id === id);
      if (!med) return { success: false };

      med.status = 'Delayed';
      med.badgeColor = 'yellow';
      this.saveMedications(list);

      this.addHistoryEntry({
        medId: med.id,
        medName: med.name,
        dosage: med.dosage,
        scheduledTime: med.displayTime,
        actualConfirmationTime: '-',
        status: 'Delayed',
        date: getTodayDateStr(),
        notes: `Remind me later requested (+${minutes} mins)`
      });

      this.recalculateSupportStatus();

      return {
        success: true,
        message: `🔔 Reminder postponed. We will check with you again in ${minutes} minutes.`
      };
    },

    markAsMissed(id) {
      const list = this.getMedications();
      const med = list.find(m => m.id === id);
      if (!med) return { success: false };

      med.status = 'Missed';
      med.badgeColor = 'red';
      this.saveMedications(list);

      this.addHistoryEntry({
        medId: med.id,
        medName: med.name,
        dosage: med.dosage,
        scheduledTime: med.displayTime,
        actualConfirmationTime: '-',
        status: 'Missed',
        date: getTodayDateStr(),
        notes: 'Unconfirmed medication past cutoff window'
      });

      // Generate urgent Caregiver Alert
      this.createAlert({
        level: 'Support Required',
        severity: 'critical',
        title: 'Medication Confirmation Overdue',
        message: `${med.name} (${med.displayTime}) has not been confirmed. Support required.`,
        medId: med.id,
        medName: med.name
      });

      this.setSupportStatus('Support Required', `${med.name} remains unconfirmed after the escalation window.`);
      return { success: true };
    },

    markAsSkipped(id, reason = 'User skipped') {
      const list = this.getMedications();
      const med = list.find(m => m.id === id);
      if (!med) return { success: false };

      med.status = 'Skipped';
      med.badgeColor = 'gray';
      this.saveMedications(list);

      this.addHistoryEntry({
        medId: med.id,
        medName: med.name,
        dosage: med.dosage,
        scheduledTime: med.displayTime,
        actualConfirmationTime: '-',
        status: 'Skipped',
        date: getTodayDateStr(),
        notes: reason
      });

      this.recalculateSupportStatus();
      return { success: true };
    },

    // --- History Management ---
    getHistory() {
      try {
        const raw = localStorage.getItem(STORAGE_KEYS.HISTORY);
        return raw ? JSON.parse(raw) : getDefaultHistory();
      } catch (e) {
        return getDefaultHistory();
      }
    },

    addHistoryEntry(entry) {
      const history = this.getHistory();
      const newEntry = {
        id: 'hist-' + Date.now(),
        ...entry
      };
      history.unshift(newEntry); // newest first
      localStorage.setItem(STORAGE_KEYS.HISTORY, JSON.stringify(history));
      this.broadcastChange();
    },

    // --- Adherence Calculation ---
    // Strictly an activity statistic, not a medical score
    getAdherenceStats() {
      const history = this.getHistory();
      const total = history.length;
      if (total === 0) {
        return { total: 0, taken: 0, delayed: 0, missed: 0, skipped: 0, percentage: 100 };
      }

      let taken = 0;
      let delayed = 0;
      let missed = 0;
      let skipped = 0;

      history.forEach(item => {
        if (item.status === 'Taken') taken++;
        else if (item.status === 'Delayed') delayed++;
        else if (item.status === 'Missed') missed++;
        else if (item.status === 'Skipped') skipped++;
      });

      const percentage = Math.round((taken / total) * 100);

      return {
        total,
        taken,
        delayed,
        missed,
        skipped,
        percentage
      };
    },

    // --- Caregivers & Care Circle ---
    getCaregivers() {
      try {
        const raw = localStorage.getItem(STORAGE_KEYS.CAREGIVERS);
        return raw ? JSON.parse(raw) : DEFAULT_CAREGIVERS;
      } catch (e) {
        return DEFAULT_CAREGIVERS;
      }
    },

    addCaregiver(cg) {
      const list = this.getCaregivers();
      const newCg = {
        id: 'cg-' + Date.now(),
        name: cg.name.trim(),
        relationship: cg.relationship.trim(),
        isPrimary: false,
        phone: cg.phone ? cg.phone.trim() : '+1 (555) 000-0000',
        email: cg.email ? cg.email.trim() : 'family@meditrack.org',
        avatar: cg.avatar || '👨‍👩‍👧',
        notifications: true,
        addedDate: getTodayDateStr()
      };
      list.push(newCg);
      localStorage.setItem(STORAGE_KEYS.CAREGIVERS, JSON.stringify(list));
      this.broadcastChange();
      return newCg;
    },

    // --- Alerts System & Escalation ---
    getAlerts() {
      try {
        const raw = localStorage.getItem(STORAGE_KEYS.ALERTS);
        return raw ? JSON.parse(raw) : getDefaultAlerts();
      } catch (e) {
        return getDefaultAlerts();
      }
    },

    createAlert(alertData) {
      const list = this.getAlerts();
      const newAlert = {
        id: 'alt-' + Date.now(),
        level: alertData.level || 'Attention Needed', // 'Attention Needed' or 'Support Required'
        severity: alertData.severity || 'warning',
        title: alertData.title,
        message: alertData.message,
        timestamp: formatCurrentTime(),
        medId: alertData.medId || null,
        medName: alertData.medName || '',
        acknowledged: false,
        createdDate: getTodayDateStr()
      };
      list.unshift(newAlert);
      localStorage.setItem(STORAGE_KEYS.ALERTS, JSON.stringify(list));
      this.broadcastChange();
      return newAlert;
    },

    acknowledgeAlert(alertId) {
      const list = this.getAlerts();
      const item = list.find(a => a.id === alertId);
      if (item) {
        item.acknowledged = true;
        item.acknowledgedAt = formatCurrentTime();
        localStorage.setItem(STORAGE_KEYS.ALERTS, JSON.stringify(list));
        this.recalculateSupportStatus();
        this.broadcastChange();
        return true;
      }
      return false;
    },

    resolveAlertForMedication(medId) {
      const list = this.getAlerts();
      let changed = false;
      list.forEach(a => {
        if (a.medId === medId && !a.acknowledged) {
          a.acknowledged = true;
          a.acknowledgedAt = formatCurrentTime();
          changed = true;
        }
      });
      if (changed) {
        localStorage.setItem(STORAGE_KEYS.ALERTS, JSON.stringify(list));
      }
    },

    // --- Support Status Escalation (Normal 🟢, Attention Needed 🟡, Support Required 🔴) ---
    getSupportStatus() {
      try {
        const raw = localStorage.getItem(STORAGE_KEYS.SUPPORT_STATUS);
        return raw ? JSON.parse(raw) : { state: 'Normal', reason: 'No overdue medication confirmations.' };
      } catch (e) {
        return { state: 'Normal', reason: 'No overdue medication confirmations.' };
      }
    },

    setSupportStatus(state, reason) {
      const statusObj = { state, reason, updatedAt: formatCurrentTime() };
      localStorage.setItem(STORAGE_KEYS.SUPPORT_STATUS, JSON.stringify(statusObj));
      this.broadcastChange();
    },

    recalculateSupportStatus() {
      const meds = this.getMedications();
      const alerts = this.getAlerts().filter(a => !a.acknowledged);

      // Check if any medication is marked missed or critical alerts active
      const hasMissed = meds.some(m => m.status === 'Missed');
      const hasCriticalAlert = alerts.some(a => a.level === 'Support Required');

      if (hasMissed || hasCriticalAlert) {
        this.setSupportStatus('Support Required', 'Medication confirmation is overdue. Caregiver alert active.');
        return;
      }

      // Check if any medication is delayed or due now unconfirmed
      const hasDelayed = meds.some(m => m.status === 'Delayed');
      const hasDueNow = meds.some(m => m.status === 'Due Now');
      const hasAttentionAlert = alerts.some(a => a.level === 'Attention Needed');

      if (hasDelayed || hasDueNow || hasAttentionAlert) {
        this.setSupportStatus('Attention Needed', 'Evening medication has not been confirmed yet.');
        return;
      }

      // Otherwise normal
      this.setSupportStatus('Normal', 'All scheduled medications up to date.');
    },

    // --- Settings & Accessibility ---
    getSettings() {
      try {
        const raw = localStorage.getItem(STORAGE_KEYS.SETTINGS);
        return raw ? { ...DEFAULT_SETTINGS, ...JSON.parse(raw) } : DEFAULT_SETTINGS;
      } catch (e) {
        return DEFAULT_SETTINGS;
      }
    },

    updateSettings(partial) {
      const current = this.getSettings();
      const merged = { ...current, ...partial };
      localStorage.setItem(STORAGE_KEYS.SETTINGS, JSON.stringify(merged));
      this.broadcastChange();
      return merged;
    },

    // --- Hackathon Demo Simulation Helpers ---
    simulateMedicationDue(medId = 'med-3') {
      const list = this.getMedications();
      const med = list.find(m => m.id === medId);
      if (med) {
        med.status = 'Due Now';
        med.badgeColor = 'amber';
        this.saveMedications(list);
        this.setSupportStatus('Attention Needed', 'Medication is due now and waiting for confirmation.');
      }
    },

    simulateEscalationToAttention(medId = 'med-3') {
      const list = this.getMedications();
      const med = list.find(m => m.id === medId);
      if (med) {
        med.status = 'Delayed';
        med.badgeColor = 'yellow';
        this.saveMedications(list);
      }
      this.createAlert({
        level: 'Attention Needed',
        severity: 'warning',
        title: 'Medication Confirmation Pending',
        message: 'Evening medication has not been confirmed.',
        medId: medId,
        medName: med ? med.name : 'Evening Medicine'
      });
      this.setSupportStatus('Attention Needed', 'Evening medication has not been confirmed.');
    },

    simulateEscalationToSupportRequired(medId = 'med-3') {
      const list = this.getMedications();
      const med = list.find(m => m.id === medId);
      if (med) {
        med.status = 'Missed';
        med.badgeColor = 'red';
        this.saveMedications(list);
      }
      this.createAlert({
        level: 'Support Required',
        severity: 'critical',
        title: 'Support Required: Escalated',
        message: 'Medication confirmation is overdue. Caregiver support alert triggered.',
        medId: medId,
        medName: med ? med.name : 'Evening Medicine'
      });
      this.setSupportStatus('Support Required', 'Medication confirmation is overdue.');
    },

    // --- Helpers ---
    formatTimeString(hhmm) {
      if (!hhmm) return '';
      const [hStr, mStr] = hhmm.split(':');
      let hours = parseInt(hStr, 10);
      const minutes = mStr || '00';
      const ampm = hours >= 12 ? 'PM' : 'AM';
      hours = hours % 12;
      hours = hours ? hours : 12;
      return `${hours}:${minutes} ${ampm}`;
    },

    getCategoryFromTime(hhmm) {
      if (!hhmm) return 'Daily';
      const hours = parseInt(hhmm.split(':')[0], 10);
      if (hours < 12) return 'Morning';
      if (hours < 17) return 'Afternoon';
      if (hours < 21) return 'Evening';
      return 'Night';
    },

    broadcastChange() {
      localStorage.setItem(STORAGE_KEYS.LAST_UPDATED, Date.now().toString());
      window.dispatchEvent(new CustomEvent('meditrack:datachange'));
    }
  };

  // Auto-init on load
  MediStorage.init();
  window.MediStorage = MediStorage;

})(window);
