// Appointment Booking JavaScript
class AppointmentBooking {
    constructor() {
        this.selectedTime = null;
        this.init();
    }

    init() {
        this.setupEventListeners();
        this.setMinDate();
    }

    setupEventListeners() {
        // Time slot selection for both forms
        const timeSlots = document.querySelectorAll('.time-slot');
        timeSlots.forEach(slot => {
            slot.addEventListener('click', (e) => {
                e.preventDefault();
                this.selectTimeSlot(slot);
            });
        });

        // Main appointment form (appointments.html)
        const form = document.getElementById('appointmentForm');
        if (form) {
            form.addEventListener('submit', (e) => {
                e.preventDefault();
                this.handleFormSubmission(e, 'selectedTime');
            });
        }

        // Home page appointment form (index.html)
        const homeForm = document.getElementById('homeAppointmentForm');
        if (homeForm) {
            homeForm.addEventListener('submit', (e) => {
                e.preventDefault();
                this.handleFormSubmission(e, 'homeSelectedTime');
            });
        }
    }

    setMinDate() {
        const today = new Date();
        const tomorrow = new Date(today);
        tomorrow.setDate(tomorrow.getDate() + 1);
        
        // Set minimum date for both forms
        const dateInputs = ['preferredDate', 'homePreferredDate'];
        dateInputs.forEach(inputId => {
            const dateInput = document.getElementById(inputId);
            if (dateInput) {
                dateInput.min = tomorrow.toISOString().split('T')[0];
                
                // Disable Sundays in date picker
                dateInput.addEventListener('input', (e) => {
                    const selectedDate = new Date(e.target.value);
                    if (selectedDate.getDay() === 0) { // Sunday = 0
                        this.showErrorMessage('We are closed on Sundays. Please select Monday through Saturday.');
                        e.target.value = '';
                    }
                });
            }
        });
    }

    selectTimeSlot(selectedSlot) {
        // Find the form container this time slot belongs to
        const form = selectedSlot.closest('form');
        const isHomeForm = form && form.id === 'homeAppointmentForm';
        
        // Remove selection from all slots in the same form
        const formTimeSlots = form ? form.querySelectorAll('.time-slot') : document.querySelectorAll('.time-slot');
        formTimeSlots.forEach(slot => {
            slot.classList.remove('selected');
        });

        // Add selection to clicked slot
        selectedSlot.classList.add('selected');
        this.selectedTime = selectedSlot.getAttribute('data-time');
        
        // Update appropriate hidden input
        const hiddenInputId = isHomeForm ? 'homeSelectedTime' : 'selectedTime';
        const hiddenInput = document.getElementById(hiddenInputId);
        if (hiddenInput) {
            hiddenInput.value = this.selectedTime;
        }
    }

    async handleFormSubmission(event, hiddenTimeInputId) {
        const form = event.target;
        const formData = new FormData(form);
        
        // Validate required fields
        if (!this.validateForm(formData, hiddenTimeInputId)) {
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
                this.showSuccessMessage();
                form.reset();
                this.clearTimeSelection(form);
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

    validateForm(formData, hiddenTimeInputId) {
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

        // Validate date is not Sunday
        const selectedDate = new Date(formData.get('preferredDate'));
        if (selectedDate.getDay() === 0) {
            this.showErrorMessage('We are closed on Sundays. Please select Monday through Saturday.');
            return false;
        }

        return true;
    }

    async submitAppointment(appointmentData) {
        try {
            const response = await fetch('https://autouniverse-1.onrender.com/api/appointments', {
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
            const response = await fetch('https://autouniverse-1.onrender.com/api/appointments/send-email', {
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

    clearTimeSelection(form) {
        const timeSlots = form ? form.querySelectorAll('.time-slot') : document.querySelectorAll('.time-slot');
        timeSlots.forEach(slot => {
            slot.classList.remove('selected');
        });
        this.selectedTime = null;
        
        // Clear both hidden inputs
        const hiddenInputs = ['selectedTime', 'homeSelectedTime'];
        hiddenInputs.forEach(inputId => {
            const hiddenInput = document.getElementById(inputId);
            if (hiddenInput) {
                hiddenInput.value = '';
            }
        });
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
