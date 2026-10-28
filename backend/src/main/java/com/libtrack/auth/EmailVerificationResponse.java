package com.libtrack.auth;
public record EmailVerificationResponse(String status,String message){
 static EmailVerificationResponse verified(){return new EmailVerificationResponse("VERIFIED","Your email is verified. You can now sign in.");}
 static EmailVerificationResponse invalid(){return new EmailVerificationResponse("INVALID_OR_EXPIRED","This verification link is invalid, expired, or already used. Contact library staff for help.");}
}
