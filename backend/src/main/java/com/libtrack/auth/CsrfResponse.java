package com.libtrack.auth;

public record CsrfResponse(String headerName, String token) {}
