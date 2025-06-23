const express = require('express');
const router = express.Router();
const Appointment = require('../models/Appointment');
const nodemailer = require('nodemailer');
const { google } = require('googleapis');

// Email configuration
const createEmailTransporter = () => {
    return nodemailer.createTransporter({
        service: 'gmail',
        auth: {
            user: process.env.EMAIL_USER,
            pass: process.env.EMAIL_PASS
        }
    });
};

// Google Calendar configuration
const createCalendarAuth = () => {
    const oauth2Client = new google.auth.OAuth2(
        process.env.GOOGLE_CLIENT_ID,
        process.env.GOOGLE_CLIENT_SECRET,
        process.env.GOOGLE_REDIRECT_URI
    );

    oauth2Client.setCredentials({
        refresh_token: process.env.GOOGLE_REFRESH_TOKEN
    });

    return oauth2Client;
};

// Create a new appointment
router.post('/', async (req, res) => {
    try {
        const {
            type,
            firstName,
            lastName,
            email,
            phone,
            preferredDate,
            preferredTime,
            carInterest,
            notes
        } = req.body;

        // Validate required fields
        if (!type || !firstName || !lastName || !email || !phone || !preferredDate || !preferredTime) {
            return res.status(400).json({
                success: false,
                message: 'All required fields must be provided'
            });
        }

        // Check if appointment slot is already taken
        const existingAppointment = await Appointment.findOne({
            preferredDate: new Date(preferredDate),
            preferredTime: preferredTime,
            status: { $in: ['pending', 'confirmed'] }
        });

        if (existingAppointment) {
            return res.status(409).json({
                success: false,
                message: 'This time slot is already booked. Please choose a different time.'
            });
        }

        // Create new appointment
        const appointment = new Appointment({
            type,
            firstName,
            lastName,
            email,
            phone,
            preferredDate: new Date(preferredDate),
            preferredTime,
            carInterest,
            notes
        });

        await appointment.save();

        // Send confirmation emails
        await sendAppointmentEmails(appointment);

        // Try to create Google Calendar event
        try {
            const calendarEventId = await createGoogleCalendarEvent(appointment);
            appointment.googleCalendarEventId = calendarEventId;
            await appointment.save();
        } catch (calendarError) {
            console.error('Google Calendar event creation failed:', calendarError);
            // Don't fail the whole request if calendar creation fails
        }

        res.status(201).json({
            success: true,
            message: 'Appointment booked successfully',
            appointment: {
                id: appointment._id,
                type: appointment.type,
                firstName: appointment.firstName,
                lastName: appointment.lastName,
                preferredDate: appointment.preferredDate,
                preferredTime: appointment.preferredTime,
                status: appointment.status
            }
        });

    } catch (error) {
        console.error('Error creating appointment:', error);
        res.status(500).json({
            success: false,
            message: 'Internal server error'
        });
    }
});

// Get all appointments (admin only - you might want to add authentication)
router.get('/', async (req, res) => {
    try {
        const { page = 1, limit = 10, status, startDate, endDate } = req.query;

        // Build query
        const query = {};
        if (status) query.status = status;
        if (startDate || endDate) {
            query.preferredDate = {};
            if (startDate) query.preferredDate.$gte = new Date(startDate);
            if (endDate) query.preferredDate.$lte = new Date(endDate);
        }

        const appointments = await Appointment.find(query)
            .sort({ preferredDate: 1, preferredTime: 1 })
            .limit(limit * 1)
            .skip((page - 1) * limit);

        const total = await Appointment.countDocuments(query);

        res.json({
            success: true,
            appointments,
            totalPages: Math.ceil(total / limit),
            currentPage: page,
            total
        });

    } catch (error) {
        console.error('Error fetching appointments:', error);
        res.status(500).json({
            success: false,
            message: 'Internal server error'
        });
    }
});

// Get a specific appointment
router.get('/:id', async (req, res) => {
    try {
        const appointment = await Appointment.findById(req.params.id);
        
        if (!appointment) {
            return res.status(404).json({
                success: false,
                message: 'Appointment not found'
            });
        }

        res.json({
            success: true,
            appointment
        });

    } catch (error) {
        console.error('Error fetching appointment:', error);
        res.status(500).json({
            success: false,
            message: 'Internal server error'
        });
    }
});

// Update appointment status
router.patch('/:id/status', async (req, res) => {
    try {
        const { status } = req.body;
        
        if (!['pending', 'confirmed', 'completed', 'cancelled'].includes(status)) {
            return res.status(400).json({
                success: false,
                message: 'Invalid status'
            });
        }

        const appointment = await Appointment.findByIdAndUpdate(
            req.params.id,
            { status, updatedAt: new Date() },
            { new: true }
        );

        if (!appointment) {
            return res.status(404).json({
                success: false,
                message: 'Appointment not found'
            });
        }

        // Send status update email
        await sendStatusUpdateEmail(appointment);

        res.json({
            success: true,
            appointment
        });

    } catch (error) {
        console.error('Error updating appointment:', error);
        res.status(500).json({
            success: false,
            message: 'Internal server error'
        });
    }
});

// Delete appointment
router.delete('/:id', async (req, res) => {
    try {
        const appointment = await Appointment.findByIdAndDelete(req.params.id);
        
        if (!appointment) {
            return res.status(404).json({
                success: false,
                message: 'Appointment not found'
            });
        }

        // Delete Google Calendar event if exists
        if (appointment.googleCalendarEventId) {
            try {
                await deleteGoogleCalendarEvent(appointment.googleCalendarEventId);
            } catch (calendarError) {
                console.error('Failed to delete Google Calendar event:', calendarError);
            }
        }

        res.json({
            success: true,
            message: 'Appointment deleted successfully'
        });

    } catch (error) {
        console.error('Error deleting appointment:', error);
        res.status(500).json({
            success: false,
            message: 'Internal server error'
        });
    }
});

// Send appointment notification email (fallback endpoint)
router.post('/send-email', async (req, res) => {
    try {
        const appointmentData = req.body;
        
        // Send emails without saving to database
        await sendAppointmentNotificationEmails(appointmentData);
        
        res.json({
            success: true,
            message: 'Appointment notification sent successfully'
        });

    } catch (error) {
        console.error('Error sending appointment email:', error);
        res.status(500).json({
            success: false,
            message: 'Failed to send appointment notification'
        });
    }
});

// Helper functions
async function sendAppointmentEmails(appointment) {
    const transporter = createEmailTransporter();
    
    // Format date and time
    const appointmentDate = new Date(appointment.preferredDate);
    const formattedDate = appointmentDate.toLocaleDateString('en-US', {
        weekday: 'long',
        year: 'numeric',
        month: 'long',
        day: 'numeric'
    });

    // Email to customer
    const customerEmailOptions = {
        from: process.env.EMAIL_USER,
        to: appointment.email,
        subject: 'Appointment Confirmation - Auto Universe Inc.',
        html: `
            <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto;">
                <div style="background-color: #dc2626; color: white; padding: 20px; text-align: center;">
                    <h1>Appointment Confirmation</h1>
                </div>
                
                <div style="padding: 20px; background-color: #f9f9f9;">
                    <h2>Hello ${appointment.firstName} ${appointment.lastName},</h2>
                    
                    <p>Thank you for scheduling an appointment with Auto Universe Inc. We have received your request and will contact you shortly to confirm the details.</p>
                    
                    <div style="background-color: white; padding: 15px; border-left: 4px solid #dc2626; margin: 20px 0;">
                        <h3>Appointment Details:</h3>
                        <p><strong>Type:</strong> ${appointment.type.replace('-', ' ').replace(/\b\w/g, l => l.toUpperCase())}</p>
                        <p><strong>Preferred Date:</strong> ${formattedDate}</p>
                        <p><strong>Preferred Time:</strong> ${formatTime(appointment.preferredTime)}</p>
                        ${appointment.carInterest ? `<p><strong>Car of Interest:</strong> ${appointment.carInterest}</p>` : ''}
                        ${appointment.notes ? `<p><strong>Notes:</strong> ${appointment.notes}</p>` : ''}
                    </div>
                    
                    <div style="background-color: #fee2e2; padding: 15px; border-radius: 5px; margin: 20px 0;">
                        <h3 style="color: #dc2626;">Important Information:</h3>
                        <ul>
                            <li>Please bring a valid driver's license for test drives</li>
                            <li>Bring proof of insurance if you plan to test drive</li>
                            <li>Our address: 828 Main St, Paterson, NJ 07503</li>
                            <li>Phone: (732) 907-8380</li>
                        </ul>
                    </div>
                    
                    <p>If you need to reschedule or cancel your appointment, please call us at (732) 907-8380.</p>
                    
                    <p>We look forward to seeing you!</p>
                    
                    <p>Best regards,<br>
                    The Auto Universe Inc. Team</p>
                </div>
                
                <div style="background-color: #374151; color: white; padding: 15px; text-align: center; font-size: 12px;">
                    <p>Auto Universe Inc. | 828 Main St, Paterson, NJ 07503 | (732) 907-8380</p>
                </div>
            </div>
        `
    };

    // Email to dealership
    const dealershipEmailOptions = {
        from: process.env.EMAIL_USER,
        to: process.env.DEALERSHIP_EMAIL || process.env.EMAIL_USER,
        subject: `New Appointment Request - ${appointment.firstName} ${appointment.lastName}`,
        html: `
            <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto;">
                <h2>New Appointment Request</h2>
                
                <div style="background-color: #f3f4f6; padding: 15px; border-radius: 5px;">
                    <h3>Customer Information:</h3>
                    <p><strong>Name:</strong> ${appointment.firstName} ${appointment.lastName}</p>
                    <p><strong>Email:</strong> ${appointment.email}</p>
                    <p><strong>Phone:</strong> ${appointment.phone}</p>
                </div>
                
                <div style="background-color: #fef3c7; padding: 15px; border-radius: 5px; margin-top: 15px;">
                    <h3>Appointment Details:</h3>
                    <p><strong>Type:</strong> ${appointment.type.replace('-', ' ').replace(/\b\w/g, l => l.toUpperCase())}</p>
                    <p><strong>Preferred Date:</strong> ${formattedDate}</p>
                    <p><strong>Preferred Time:</strong> ${formatTime(appointment.preferredTime)}</p>
                    ${appointment.carInterest ? `<p><strong>Car of Interest:</strong> ${appointment.carInterest}</p>` : ''}
                    ${appointment.notes ? `<p><strong>Notes:</strong> ${appointment.notes}</p>` : ''}
                </div>
                
                <p style="margin-top: 20px;">Please contact the customer to confirm the appointment details.</p>
            </div>
        `
    };

    await transporter.sendMail(customerEmailOptions);
    await transporter.sendMail(dealershipEmailOptions);
}

async function sendAppointmentNotificationEmails(appointmentData) {
    const transporter = createEmailTransporter();
    
    const formattedDate = new Date(appointmentData.preferredDate).toLocaleDateString('en-US', {
        weekday: 'long',
        year: 'numeric',
        month: 'long',
        day: 'numeric'
    });

    // Email to dealership (since we're not saving to DB)
    const emailOptions = {
        from: process.env.EMAIL_USER,
        to: process.env.DEALERSHIP_EMAIL || process.env.EMAIL_USER,
        subject: `Appointment Request - ${appointmentData.firstName} ${appointmentData.lastName}`,
        html: `
            <h2>New Appointment Request</h2>
            <p><strong>Name:</strong> ${appointmentData.firstName} ${appointmentData.lastName}</p>
            <p><strong>Email:</strong> ${appointmentData.email}</p>
            <p><strong>Phone:</strong> ${appointmentData.phone}</p>
            <p><strong>Type:</strong> ${appointmentData.type}</p>
            <p><strong>Preferred Date:</strong> ${formattedDate}</p>
            <p><strong>Preferred Time:</strong> ${formatTime(appointmentData.preferredTime)}</p>
            ${appointmentData.carInterest ? `<p><strong>Car Interest:</strong> ${appointmentData.carInterest}</p>` : ''}
            ${appointmentData.notes ? `<p><strong>Notes:</strong> ${appointmentData.notes}</p>` : ''}
        `
    };

    await transporter.sendMail(emailOptions);
}

async function sendStatusUpdateEmail(appointment) {
    const transporter = createEmailTransporter();
    
    const statusMessages = {
        confirmed: 'Your appointment has been confirmed!',
        completed: 'Thank you for visiting Auto Universe Inc.!',
        cancelled: 'Your appointment has been cancelled.'
    };

    if (appointment.status === 'pending') return; // No email for pending status

    const emailOptions = {
        from: process.env.EMAIL_USER,
        to: appointment.email,
        subject: `Appointment ${appointment.status.charAt(0).toUpperCase() + appointment.status.slice(1)} - Auto Universe Inc.`,
        html: `
            <h2>${statusMessages[appointment.status]}</h2>
            <p>Dear ${appointment.firstName} ${appointment.lastName},</p>
            <p>Your appointment status has been updated to: <strong>${appointment.status.toUpperCase()}</strong></p>
            <p>If you have any questions, please call us at (732) 907-8380.</p>
            <p>Best regards,<br>Auto Universe Inc.</p>
        `
    };

    await transporter.sendMail(emailOptions);
}

async function createGoogleCalendarEvent(appointment) {
    const auth = createCalendarAuth();
    const calendar = google.calendar({ version: 'v3', auth });

    const startDateTime = new Date(`${appointment.preferredDate.toISOString().split('T')[0]}T${appointment.preferredTime}:00`);
    const endDateTime = new Date(startDateTime.getTime() + (60 * 60 * 1000)); // 1 hour duration

    const event = {
        summary: `${appointment.type.replace('-', ' ').replace(/\b\w/g, l => l.toUpperCase())} - ${appointment.firstName} ${appointment.lastName}`,
        description: `
            Customer: ${appointment.firstName} ${appointment.lastName}
            Email: ${appointment.email}
            Phone: ${appointment.phone}
            ${appointment.carInterest ? `Car Interest: ${appointment.carInterest}` : ''}
            ${appointment.notes ? `Notes: ${appointment.notes}` : ''}
        `,
        start: {
            dateTime: startDateTime.toISOString(),
            timeZone: 'America/New_York'
        },
        end: {
            dateTime: endDateTime.toISOString(),
            timeZone: 'America/New_York'
        },
        attendees: [
            { email: appointment.email }
        ]
    };

    const response = await calendar.events.insert({
        calendarId: 'primary',
        resource: event
    });

    return response.data.id;
}

async function deleteGoogleCalendarEvent(eventId) {
    const auth = createCalendarAuth();
    const calendar = google.calendar({ version: 'v3', auth });

    await calendar.events.delete({
        calendarId: 'primary',
        eventId: eventId
    });
}

function formatTime(time24) {
    const [hours, minutes] = time24.split(':');
    const hour = parseInt(hours);
    const ampm = hour >= 12 ? 'PM' : 'AM';
    const hour12 = hour % 12 || 12;
    return `${hour12}:${minutes} ${ampm}`;
}

module.exports = router;
