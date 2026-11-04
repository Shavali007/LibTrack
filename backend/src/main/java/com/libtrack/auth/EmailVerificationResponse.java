package com.libtrack.auth;
public record EmailVerificationResponse(String status,String message){
 static EmailVerificationResponse verified(){return new EmailVerificationResponse("VERIFIED","Your email is verified. Your account remains pending librarian approval; you can sign in after it is approved.");}
 static EmailVerificationResponse invalid(){return new EmailVerificationResponse("INVALID_OR_EXPIRED","This verification link is invalid, expired, or already used. Contact library staff for help.");}
}
