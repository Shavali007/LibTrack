package com.libtrack.auth;
import java.util.List; import java.util.concurrent.ConcurrentHashMap;
import org.springframework.context.annotation.Profile; import org.springframework.stereotype.Component;
@Component @Profile("development")
public class DevelopmentMailCapture implements VerificationMessageSender{
 // A reissued token replaces the previous token in MySQL. Keep only its matching message here too.
 private final ConcurrentHashMap<String,VerificationMessage> messages=new ConcurrentHashMap<>();
 public void send(VerificationMessage message){messages.put(message.recipient(),message);}
 public List<VerificationMessage> messages(){return List.copyOf(messages.values());}
 public void clear(){messages.clear();}
}
