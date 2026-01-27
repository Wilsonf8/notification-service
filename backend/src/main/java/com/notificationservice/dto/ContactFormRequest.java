package com.notificationservice.dto;

import jakarta.validation.constraints.Email;
import jakarta.validation.constraints.NotBlank;
import jakarta.validation.constraints.Size;

/**
 * Request DTO for submitting a contact form when reps are offline.
 *
 * @param name the visitor's name
 * @param email the visitor's email address
 * @param phone the visitor's phone number (optional)
 * @param message the visitor's message
 */
public record ContactFormRequest(
        @NotBlank(message = "Name is required")
        @Size(max = 100, message = "Name cannot exceed 100 characters")
        String name,

        @NotBlank(message = "Email is required")
        @Email(message = "Invalid email format")
        @Size(max = 255, message = "Email cannot exceed 255 characters")
        String email,

        @Size(max = 20, message = "Phone cannot exceed 20 characters")
        String phone,

        @NotBlank(message = "Message is required")
        @Size(max = 2000, message = "Message cannot exceed 2000 characters")
        String message
) {}
