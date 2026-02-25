package com.notificationservice.dto;

/**
 * Request DTO for patching visitor contact fields.
 * Null fields are ignored (not updated). Empty string clears the field.
 *
 * @param name the visitor's display name
 * @param email the visitor's email address
 * @param phone the visitor's phone number
 */
public record UpdateVisitorContactRequest(String name, String email, String phone) {}
