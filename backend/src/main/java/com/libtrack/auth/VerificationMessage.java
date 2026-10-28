package com.libtrack.auth;
public record VerificationMessage(String recipient,String subject,String text,String verificationUrl){
 @Override public String toString(){return "VerificationMessage[recipient="+recipient+", subject="+subject+", text=[REDACTED], verificationUrl=[REDACTED]]";}
}
