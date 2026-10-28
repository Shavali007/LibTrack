package com.libtrack.auth;

import java.util.Map;

public record RegistrationValidationError(String code, String message, Map<String, String> fieldErrors) {}