package com.notificationservice.dto;

import java.util.UUID;

public record UserDto(
        UUID id,
        String username,
        String firstName,
        String lastName,
        String email,
        String avatarUrl
) {}
