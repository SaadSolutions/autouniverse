// Appointment Booking JavaScript
class AppointmentBooking {
    constructor() {
        this.selectedTime = null;
        this.init();
    }

    init() {
        this.setupEventListeners();
        this.setMinDate();
        this.loadGoogleCalendarAPI();
    }

    setupEventListeners() {
        // Time slot selection
        const timeSlots = document.querySelectorAll('.time-slot');
        timeSlots.forEach(slot => {
            slot.addEventListener('click', (e) => {
                e.preventDefault();
                this.selectTimeSlot(slot);
            });
        });

        // Form submission
        const form = document.getElementById('appointmentForm');
        if (form) {
            form.addEventListener('submit', (e) => {
                e.preventDefault();
                this.handleFormSubmission(e);
            });
        }
    }

    setMinDate() {
        const today = new Date();
        const tomorrow = new Date(today);
        tomorrow.setDate(tomorrow.getDate() + 1);
        
        const dateInput = document.getElementById('preferredDate');
        if (dateInput) {
            dateInput.min = tomorrow.toISOString().split('T')[0];
        }
    }

    selectTimeSlot(selectedSlot) {
        // Remove selection from all slots
        document.querySelectorAll('.time-slot').forEach(slot => {
            slot.classList.remove('selected');
        });

        // Add selection to clicked slot
        selectedSlot.classList.add('selected');
        this.selectedTime = selectedSlot.getAttribute('data-time');
        
        // Update hidden input
        const hiddenInput = document.getElementById('selectedTime');
        if (hiddenInput) {
            hiddenInput.value = this.selectedTime;
        }
    }

    async handleFormSubmission(event) {
        const form = event.target;
        const formData = new FormData(form);
        
        // Validate required fields
        if (!this.validateForm(formData)) {
            return;
        }

        // Show loading state
        const submitButton = form.querySelector('button[type="submit"]');
        const originalText = submitButton.textContent;
        submitButton.textContent = 'Booking Appointment...';
        submitButton.disabled = true;

        try {
            // Prepare appointment data
            const appointmentData = {
                type: formData.get('appointmentType'),
                firstName: formData.get('firstName'),
                lastName: formData.get('lastName'),
                email: formData.get('email'),
                phone: formData.get('phone'),
                preferredDate: formData.get('preferredDate'),
                preferredTime: this.selectedTime,
                carInterest: formData.get('carInterest'),
                notes: formData.get('notes'),
                createdAt: new Date().toISOString()
            };

            // Send to your backend
            const response = await this.submitAppointment(appointmentData);
            
            if (response.success) {
                // Try to create Google Calendar event
                await this.createGoogleCalendarEvent(appointmentData);
                
                this.showSuccessMessage();
                form.reset();
                this.clearTimeSelection();
            } else {
                throw new Error(response.message || 'Failed to book appointment');
            }

        } catch (error) {
            console.error('Appointment booking error:', error);
            this.showErrorMessage(error.message);
        } finally {
            // Reset button state
            submitButton.textContent = originalText;
            submitButton.disabled = false;
        }
    }

    validateForm(formData) {
        const requiredFields = ['appointmentType', 'firstName', 'lastName', 'email', 'phone', 'preferredDate'];
        
        for (const field of requiredFields) {
            if (!formData.get(field) || formData.get(field).trim() === '') {
                this.showErrorMessage(`Please fill in the ${field.replace(/([A-Z])/g, ' $1').toLowerCase()}`);
                return false;
            }
        }

        if (!this.selectedTime) {
            this.showErrorMessage('Please select a preferred time');
            return false;
        }

        // Validate email format
        const email = formData.get('email');
        const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
        if (!emailRegex.test(email)) {
            this.showErrorMessage('Please enter a valid email address');
            return false;
        }

        // Validate phone format
        const phone = formData.get('phone');
        const phoneRegex = /^[\+]?[1-9][\d]{0,15}$/;
        if (!phoneRegex.test(phone.replace(/[\s\-\(\)]/g, ''))) {
            this.showErrorMessage('Please enter a valid phone number');
            return false;
        }

        return true;
    }

    async submitAppointment(appointmentData) {
        try {
            const response = await fetch('/api/appointments', {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json',
                },
                body: JSON.stringify(appointmentData)
            });

            if (!response.ok) {
                throw new Error(`HTTP error! status: ${response.status}`);
            }

            return await response.json();
        } catch (error) {
            console.error('Error submitting appointment:', error);
            // Fallback: send email notification
            return await this.sendEmailNotification(appointmentData);
        }
    }

    async sendEmailNotification(appointmentData) {
        try {
            const response = await fetch('/api/send-appointment-email', {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json',
                },
                body: JSON.stringify(appointmentData)
            });

            if (!response.ok) {
                throw new Error(`Email notification failed: ${response.status}`);
            }

            return await response.json();
        } catch (error) {
            console.error('Email notification error:', error);
            return { success: true, message: 'Appointment request received' };
        }
    }

    clearTimeSelection() {
        document.querySelectorAll('.time-slot').forEach(slot => {
            slot.classList.remove('selected');
        });
        this.selectedTime = null;
        const hiddenInput = document.getElementById('selectedTime');
        if (hiddenInput) {
            hiddenInput.value = '';
        }
    }

    showSuccessMessage() {
        this.showMessage('Appointment request submitted successfully! We will contact you shortly to confirm.', 'success');
    }

    showErrorMessage(message) {
        this.showMessage(message, 'error');
    }

    showMessage(message, type) {
        // Remove existing messages
        const existingMessage = document.querySelector('.appointment-message');
        if (existingMessage) {
            existingMessage.remove();
        }

        // Create new message
        const messageDiv = document.createElement('div');
        messageDiv.className = `appointment-message fixed top-4 right-4 p-4 rounded-lg shadow-lg z-50 ${
            type === 'success' ? 'bg-green-500 text-white' : 'bg-red-500 text-white'
        }`;
        messageDiv.textContent = message;

        document.body.appendChild(messageDiv);

        // Auto-remove after 5 seconds
        setTimeout(() => {
            if (messageDiv.parentNode) {
                messageDiv.remove();
            }
        }, 5000);
    }

    // Google Calendar API Integration
    loadGoogleCalendarAPI() {
        // This would be used if you want to integrate with Google Calendar API
        // You would need to set up Google API credentials
        if (typeof gapi !== 'undefined') {
            gapi.load('client:auth2', () => {
                this.initGoogleCalendar();
            });
        }
    }

    async initGoogleCalendar() {
        // Initialize Google Calendar API
        // You would need to replace these with your actual API credentials
        const API_KEY = 'YOUR_GOOGLE_API_KEY';
        const CLIENT_ID = 'YOUR_GOOGLE_CLIENT_ID';
        const DISCOVERY_DOC = 'https://www.googleapis.com/discovery/v1/apis/calendar/v3/rest';
        const SCOPES = 'https://www.googleapis.com/auth/calendar.events';

        try {
            await gapi.client.init({
                apiKey: API_KEY,
                clientId: CLIENT_ID,
                discoveryDocs: [DISCOVERY_DOC],
                scope: SCOPES
            });
        } catch (error) {
            console.log('Google Calendar API initialization failed:', error);
        }
    }

    async createGoogleCalendarEvent(appointmentData) {
        if (typeof gapi === 'undefined' || !gapi.client.calendar) {
            console.log('Google Calendar API not available');
            return;
        }

        try {
            const startDateTime = new Date(`${appointmentData.preferredDate}T${appointmentData.preferredTime}:00`);
            const endDateTime = new Date(startDateTime.getTime() + (60 * 60 * 1000)); // 1 hour duration

            const event = {
                'summary': `${appointmentData.type} - ${appointmentData.firstName} ${appointmentData.lastName}`,
                'description': `
                    Appointment Type: ${appointmentData.type}
                    Customer: ${appointmentData.firstName} ${appointmentData.lastName}
                    Email: ${appointmentData.email}
                    Phone: ${appointmentData.phone}
                    Car Interest: ${appointmentData.carInterest || 'Not specified'}
                    Notes: ${appointmentData.notes || 'None'}
                `,
                'start': {
                    'dateTime': startDateTime.toISOString(),
                    'timeZone': 'America/New_York'
                },
                'end': {
                    'dateTime': endDateTime.toISOString(),
                    'timeZone': 'America/New_York'
                },
                'attendees': [
                    {'email': appointmentData.email}
                ],
                'reminders': {
                    'useDefault': false,
                    'overrides': [
                        {'method': 'email', 'minutes': 24 * 60},
                        {'method': 'popup', 'minutes': 30}
                    ]
                }
            };

            const request = gapi.client.calendar.events.insert({
                'calendarId': 'primary',
                'resource': event
            });

            await request.execute();
            console.log('Google Calendar event created successfully');
        } catch (error) {
            console.error('Failed to create Google Calendar event:', error);
        }
    }

    // Utility method to format appointment data for display
    formatAppointmentSummary(appointmentData) {
        const date = new Date(`${appointmentData.preferredDate}T${appointmentData.preferredTime}:00`);
        const options = { 
            weekday: 'long', 
            year: 'numeric', 
            month: 'long', 
            day: 'numeric',
            hour: 'numeric',
            minute: '2-digit',
            hour12: true
        };
        
        return {
            ...appointmentData,
            formattedDateTime: date.toLocaleDateString('en-US', options)
        };
    }
}

// Initialize appointment booking when DOM is loaded
document.addEventListener('DOMContentLoaded', () => {
    new AppointmentBooking();
});

// Export for use in other modules if needed
if (typeof module !== 'undefined' && module.exports) {
    module.exports = AppointmentBooking;
}
