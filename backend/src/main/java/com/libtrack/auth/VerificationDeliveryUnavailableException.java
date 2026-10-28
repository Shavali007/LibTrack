package com.libtrack.auth;
public final class VerificationDeliveryUnavailableException extends RuntimeException{
 public VerificationDeliveryUnavailableException(){super("Email verification delivery is not configured.");}
}
