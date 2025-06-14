// Form Handler for Auto Universe Loan Application
class LoanApplicationForm {
    constructor() {
        this.form = document.getElementById('loanApplicationForm');
        this.isSubmitting = false;
        this.validationErrors = new Map();
        
        if (!this.form) {
            console.error('Loan application form not found');
            return;
        }
        
        this.init();
    }

    init() {
        this.setupEventListeners();
        this.setupValidation();
        this.loadFormState();
    }

    setupEventListeners() {
        // Form submission
        this.form.addEventListener('submit', (e) => this.handleSubmit(e));
        
        // Real-time validation
        this.form.addEventListener('input', (e) => this.validateField(e.target));
        this.form.addEventListener('change', (e) => this.validateField(e.target));
        
        // Auto-formatting
        this.setupAutoFormatting();
        
        // Trade-in toggle
        const tradeInCheckbox = document.getElementById('hasTradeIn');
        if (tradeInCheckbox) {
            tradeInCheckbox.addEventListener('change', () => this.toggleTradeInFields());
        }
        
        // Co-applicant toggle
        const coApplicantCheckbox = document.getElementById('hasCoApplicant');
        if (coApplicantCheckbox) {
            coApplicantCheckbox.addEventListener('change', () => this.toggleCoApplicantFields());
        }
        
        // Form persistence
        this.form.addEventListener('input', () => this.saveFormState());
        this.form.addEventListener('change', () => this.saveFormState());
    }

    setupAutoFormatting() {
        // SSN formatting
        const ssnInput = document.getElementById('ssn');
        if (ssnInput) {
            ssnInput.addEventListener('input', (e) => {
                let value = e.target.value.replace(/\D/g, '');
                if (value.length >= 6) {
                    value = value.replace(/^(\d{3})(\d{2})(\d{4}).*/, '$1-$2-$3');
                } else if (value.length >= 4) {
                    value = value.replace(/^(\d{3})(\d{2}).*/, '$1-$2');
                } else if (value.length >= 1) {
                    value = value.replace(/^(\d{3}).*/, '$1');
                }
                e.target.value = value;
            });
        }

        // Phone number formatting
        const phoneInputs = ['phone', 'homePhone', 'businessPhone', 'workPhone'];
        phoneInputs.forEach(id => {
            const input = document.getElementById(id);
            if (input) {
                input.addEventListener('input', (e) => {
                    let value = e.target.value.replace(/\D/g, '');
                    if (value.length >= 7) {
                        value = value.replace(/^(\d{3})(\d{3})(\d{4}).*/, '($1) $2-$3');
                    } else if (value.length >= 4) {
                        value = value.replace(/^(\d{3})(\d{3}).*/, '($1) $2');
                    } else if (value.length >= 1) {
                        value = value.replace(/^(\d{3}).*/, '($1');
                    }
                    e.target.value = value;
                });
            }
        });

        // ZIP code formatting
        const zipInputs = ['zip', 'employerZip'];
        zipInputs.forEach(id => {
            const input = document.getElementById(id);
            if (input) {
                input.addEventListener('input', (e) => {
                    let value = e.target.value.replace(/\D/g, '');
                    if (value.length > 5) {
                        value = value.replace(/^(\d{5})(\d{4}).*/, '$1-$2');
                    }
                    e.target.value = value;
                });
            }
        });
    }

    setupValidation() {
        this.validators = {
            required: (value) => value && value.trim() !== '',
            email: (value) => /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(value),
            ssn: (value) => /^\d{3}-\d{2}-\d{4}$/.test(value),
            phone: (value) => /^\(\d{3}\) \d{3}-\d{4}$/.test(value),
            zip: (value) => /^\d{5}(-\d{4})?$/.test(value),
            date: (value) => {
                const date = new Date(value);
                return date instanceof Date && !isNaN(date);
            },
            birthdate: (value) => {
                const date = new Date(value);
                const today = new Date();
                const age = today.getFullYear() - date.getFullYear();
                return age >= 18 && age <= 100;
            },
            futureDate: (value) => {
                const date = new Date(value);
                const today = new Date();
                return date > today;
            },
            number: (value) => !isNaN(value) && parseFloat(value) >= 0,
            minAmount: (value, min = 1000) => !isNaN(value) && parseFloat(value) >= min
        };
    }

    validateField(field) {
        const fieldName = field.name || field.id;
        const value = field.value;
        const rules = this.getValidationRules(fieldName);
        
        let isValid = true;
        let errorMessage = '';

        for (const rule of rules) {
            if (!this.validators[rule.type](value, rule.param)) {
                isValid = false;
                errorMessage = rule.message;
                break;
            }
        }

        this.updateFieldUI(field, isValid, errorMessage);
        
        if (isValid) {
            this.validationErrors.delete(fieldName);
        } else {
            this.validationErrors.set(fieldName, errorMessage);
        }

        return isValid;
    }

    getValidationRules(fieldName) {
        const rules = {
            // Personal Information
            firstName: [{ type: 'required', message: 'First name is required' }],
            lastName: [{ type: 'required', message: 'Last name is required' }],
            ssn: [
                { type: 'required', message: 'SSN is required' },
                { type: 'ssn', message: 'SSN must be in format XXX-XX-XXXX' }
            ],
            birthdate: [
                { type: 'required', message: 'Birth date is required' },
                { type: 'date', message: 'Please enter a valid date' },
                { type: 'birthdate', message: 'You must be between 18 and 100 years old' }
            ],
            driversLicenseNumber: [{ type: 'required', message: 'Driver\'s license number is required' }],
            driversLicenseExpDate: [
                { type: 'required', message: 'License expiration date is required' },
                { type: 'date', message: 'Please enter a valid date' },
                { type: 'futureDate', message: 'License expiration date must be in the future' }
            ],
            
            // Contact Information
            phone: [
                { type: 'required', message: 'Phone number is required' },
                { type: 'phone', message: 'Phone number must be in format (XXX) XXX-XXXX' }
            ],
            email: [
                { type: 'required', message: 'Email is required' },
                { type: 'email', message: 'Please enter a valid email address' }
            ],
            
            // Address Information
            address: [{ type: 'required', message: 'Address is required' }],
            city: [{ type: 'required', message: 'City is required' }],
            state: [{ type: 'required', message: 'State is required' }],
            zip: [
                { type: 'required', message: 'ZIP code is required' },
                { type: 'zip', message: 'ZIP code must be in format XXXXX or XXXXX-XXXX' }
            ],
            timeAtResidence: [{ type: 'required', message: 'Time at residence is required' }],
            residenceType: [{ type: 'required', message: 'Residence type is required' }],
            mortgageRentPayment: [
                { type: 'required', message: 'Monthly payment amount is required' },
                { type: 'number', message: 'Please enter a valid amount' }
            ],
            
            // Employment Information
            employmentStatus: [{ type: 'required', message: 'Employment status is required' }],
            currentEmployer: [{ type: 'required', message: 'Current employer is required' }],
            jobTitle: [{ type: 'required', message: 'Job title is required' }],
            employmentLength: [{ type: 'required', message: 'Employment length is required' }],
            workPhone: [{ type: 'phone', message: 'Work phone must be in format (XXX) XXX-XXXX' }],
            monthlyIncome: [
                { type: 'required', message: 'Monthly income is required' },
                { type: 'number', message: 'Please enter a valid amount' }
            ],
            
            // Loan Information
            desiredLoanAmount: [
                { type: 'required', message: 'Desired loan amount is required' },
                { type: 'minAmount', param: 1000, message: 'Loan amount must be at least $1,000' }
            ],
            
            // Bank Information
            bankName: [{ type: 'required', message: 'Bank name is required' }],
            accountType: [{ type: 'required', message: 'Account type is required' }],
            accountLength: [{ type: 'required', message: 'Account length is required' }]
        };

        return rules[fieldName] || [];
    }

    updateFieldUI(field, isValid, errorMessage) {
        const errorContainer = field.parentNode.querySelector('.error-message');
        
        if (isValid) {
            field.classList.remove('border-red-500', 'border-red-300');
            field.classList.add('border-green-300');
            if (errorContainer) {
                errorContainer.textContent = '';
                errorContainer.classList.add('hidden');
            }
        } else {
            field.classList.remove('border-green-300');
            field.classList.add('border-red-500');
            
            if (errorContainer) {
                errorContainer.textContent = errorMessage;
                errorContainer.classList.remove('hidden');
            } else {
                // Create error message element if it doesn't exist
                const errorDiv = document.createElement('div');
                errorDiv.className = 'error-message text-red-500 text-sm mt-1';
                errorDiv.textContent = errorMessage;
                field.parentNode.appendChild(errorDiv);
            }
        }
    }

    toggleTradeInFields() {
        const checkbox = document.getElementById('hasTradeIn');
        const fields = document.getElementById('tradeInFields');
        
        if (checkbox && fields) {
            if (checkbox.checked) {
                fields.classList.remove('hidden');
                this.setRequiredFields(['tradeInMake', 'tradeInModel', 'tradeInYear', 'tradeInMileage', 'tradeInCondition'], true);
            } else {
                fields.classList.add('hidden');
                this.setRequiredFields(['tradeInMake', 'tradeInModel', 'tradeInYear', 'tradeInMileage', 'tradeInCondition'], false);
            }
        }
    }

    toggleCoApplicantFields() {
        const checkbox = document.getElementById('hasCoApplicant');
        const fields = document.getElementById('coApplicantFields');
        
        if (checkbox && fields) {
            if (checkbox.checked) {
                fields.classList.remove('hidden');
                this.setRequiredFields(['coApplicantFirstName', 'coApplicantLastName', 'coApplicantSSN', 'coApplicantPhone', 'coApplicantRelationship'], true);
            } else {
                fields.classList.add('hidden');
                this.setRequiredFields(['coApplicantFirstName', 'coApplicantLastName', 'coApplicantSSN', 'coApplicantPhone', 'coApplicantRelationship'], false);
            }
        }
    }

    setRequiredFields(fieldIds, required) {
        fieldIds.forEach(id => {
            const field = document.getElementById(id);
            if (field) {
                field.required = required;
            }
        });
    }

    async handleSubmit(e) {
        e.preventDefault();
        
        console.log('Form submission started');
        
        if (this.isSubmitting) {
            console.log('Form already submitting, ignoring duplicate submission');
            return;
        }
        
        // Validate entire form
        const isFormValid = this.validateForm();
        
        if (!isFormValid) {
            this.showNotification('Please correct the errors in the form before submitting.', 'error');
            return;
        }
        
        this.isSubmitting = true;
        
        try {
            this.showLoadingState(true);
            console.log('Submitting form data...');
            
            const result = await this.submitForm();
            console.log('Form submitted successfully:', result);
            
            this.showNotification('Application submitted successfully! We will contact you soon.', 'success');
            this.clearFormState();
            this.form.reset();
            this.toggleTradeInFields();
            this.toggleCoApplicantFields();
        } catch (error) {
            console.error('Form submission error:', error);
            this.showNotification(error.message || 'Failed to submit application. Please try again.', 'error');
        } finally {
            this.isSubmitting = false;
            this.showLoadingState(false);
        }
    }

    validateForm() {
        const inputs = this.form.querySelectorAll('input, select, textarea');
        let isValid = true;
        
        inputs.forEach(input => {
            if (!this.validateField(input)) {
                isValid = false;
            }
        });
        
        // Check terms acceptance
        const termsCheckbox = document.getElementById('termsAccepted');
        if (termsCheckbox && !termsCheckbox.checked) {
            isValid = false;
            this.showNotification('You must accept the terms and conditions.', 'error');
        }
        
        return isValid;
    }

    async submitForm() {
        const formData = new FormData(this.form);
        const data = Object.fromEntries(formData.entries());
        
        // Process checkboxes
        data.hasTradeIn = document.getElementById('hasTradeIn')?.checked || false;
        data.hasCoApplicant = document.getElementById('hasCoApplicant')?.checked || false;
        data.termsAccepted = document.getElementById('termsAccepted')?.checked || false;
        
        console.log('Submitting data:', data);
        
        try {
            const response = await fetch('http://localhost:5000/api/forms/loan-application', {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json'
                },
                body: JSON.stringify(data)
            });
            
            console.log('Response status:', response.status);
            console.log('Response headers:', response.headers);
            
            const result = await response.json();
            console.log('Response data:', result);
            
            if (!response.ok) {
                throw new Error(result.message || `Server error: ${response.status}`);
            }
            
            return result;
        } catch (error) {
            console.error('Network or server error:', error);
            
            // Check if it's a network error
            if (error.name === 'TypeError' && error.message.includes('fetch')) {
                throw new Error('Unable to connect to server. Please check your internet connection and try again.');
            }
            
            throw error;
        }
    }

    showLoadingState(loading) {
        const submitBtn = this.form.querySelector('button[type="submit"]');
        
        if (!submitBtn) {
            console.error('Submit button not found');
            return;
        }
        
        const spinner = submitBtn.querySelector('.spinner');
        const btnText = submitBtn.querySelector('.btn-text');
        
        if (loading) {
            submitBtn.disabled = true;
            if (spinner) {
                spinner.classList.remove('hidden');
            }
            if (btnText) {
                btnText.textContent = 'Submitting...';
            } else {
                // Fallback if btn-text span doesn't exist
                submitBtn.innerHTML = '<span class="spinner mr-2">⟳</span>Submitting...';
            }
        } else {
            submitBtn.disabled = false;
            if (spinner) {
                spinner.classList.add('hidden');
            }
            if (btnText) {
                btnText.textContent = 'Submit Application';
            } else {
                // Fallback if btn-text span doesn't exist
                submitBtn.innerHTML = 'Submit Application';
            }
        }
    }

    showNotification(message, type = 'info') {
        // Remove existing notifications
        const existingNotification = document.querySelector('.form-notification');
        if (existingNotification) {
            existingNotification.remove();
        }
        
        const notification = document.createElement('div');
        notification.className = `form-notification fixed top-4 right-4 p-4 rounded-lg shadow-lg z-50 ${
            type === 'success' ? 'bg-green-500 text-white' :
            type === 'error' ? 'bg-red-500 text-white' :
            'bg-blue-500 text-white'
        }`;
        notification.textContent = message;
        
        document.body.appendChild(notification);
        
        // Auto-remove after 5 seconds
        setTimeout(() => {
            notification.remove();
        }, 5000);
    }

    saveFormState() {
        const formData = new FormData(this.form);
        const data = Object.fromEntries(formData.entries());
        localStorage.setItem('loanApplicationFormData', JSON.stringify(data));
    }

    loadFormState() {
        const savedData = localStorage.getItem('loanApplicationFormData');
        if (savedData) {
            try {
                const data = JSON.parse(savedData);
                Object.entries(data).forEach(([key, value]) => {
                    const field = document.getElementById(key) || document.querySelector(`[name="${key}"]`);
                    if (field) {
                        field.value = value;
                    }
                });
            } catch (error) {
                console.error('Error loading saved form data:', error);
            }
        }
    }

    clearFormState() {
        localStorage.removeItem('loanApplicationFormData');
    }

    // Test function to prefill form with sample data
    prefillSampleData() {
        const sampleData = {
            // Loan Information
            desiredLoanAmount: '25000',
            desiredMonthlyPayment: '450',
            
            // Personal Information
            firstName: 'John',
            middleInitial: 'M',
            lastName: 'Doe',
            ssn: '123-45-6789',
            birthdate: '1985-03-15',
            driversLicenseNumber: 'D123456789',
            driversLicenseExpDate: '2027-03-15',
            
            // Contact Information
            phone: '(555) 123-4567',
            homePhone: '(555) 987-6543',
            email: 'john.doe@email.com',
            
            // Residence Information
            address: '123 Main Street',
            city: 'Paterson',
            state: 'NJ',
            zip: '07503',
            timeAtResidence: '3 years',
            residenceType: 'Rent',
            mortgageRentPayment: '1200',
            
            // Employment Information
            employmentStatus: 'Employed',
            currentEmployer: 'ABC Corporation',
            jobTitle: 'Software Engineer',
            employmentLength: '2 years 6 months',
            workPhone: '(555) 555-5555',
            monthlyIncome: '5500',
            additionalIncome: '500',
            
            // Bank Information
            bankName: 'First National Bank',
            accountType: 'Checking',
            accountLength: '5 years',
            
            // Vehicle Information
            vehicleMake: 'Honda',
            vehicleModel: 'Accord',
            vehicleYear: '2022',
            
            // References
            reference1Name: 'Jane Smith',
            reference1Relationship: 'Friend',
            reference1Phone: '(555) 111-2222',
            reference2Name: 'Bob Johnson',
            reference2Relationship: 'Coworker',
            reference2Phone: '(555) 333-4444'
        };

        Object.entries(sampleData).forEach(([key, value]) => {
            const field = document.getElementById(key) || document.querySelector(`[name="${key}"]`);
            if (field) {
                field.value = value;
                // Trigger validation for the field
                this.validateField(field);
            }
        });

        this.showNotification('Form prefilled with sample data for testing', 'info');
    }
}

// Initialize form when DOM is loaded
document.addEventListener('DOMContentLoaded', () => {
    window.loanForm = new LoanApplicationForm();
    
    // Add test button for prefilling (remove in production)
    const testButton = document.createElement('button');
    testButton.textContent = 'Fill Test Data';
    testButton.className = 'fixed top-4 left-4 bg-blue-500 text-white px-4 py-2 rounded shadow-lg z-50';
    testButton.onclick = () => window.loanForm.prefillSampleData();
    document.body.appendChild(testButton);
});
